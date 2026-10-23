#!/usr/bin/env node
"use strict";
// SIMPLEEX_STABLE_ENTRY_V1 — copied into the user's command directory by install-cli-shim.
const fs=require("node:fs"),path=require("node:path"),os=require("node:os"),http=require("node:http");
const {spawn}=require("node:child_process");
function discovery(file){
 const stat=fs.statSync(file);if(!stat.isFile()||stat.size>65536)throw Error("Invalid SimpleExperiment discovery");
 const d=JSON.parse(fs.readFileSync(file,"utf8"));const u=new URL(d.baseUrl);
 if(d.name!=="SimpleExperiment"||!/^\d+\.\d+\.\d+$/.test(d.version)||!Number.isInteger(d.pid)||d.pid<1||typeof d.startedAt!=="string"||Number.isNaN(Date.parse(d.startedAt))
 ||d.status==="stopped"||typeof d.token!=="string"||!d.token||u.protocol!=="http:"||!["127.0.0.1","localhost","[::1]"].includes(u.hostname)||!u.port||u.username||u.password||u.pathname!=="/"||u.search||u.hash)throw Error("SimpleExperiment must be running with valid loopback discovery");
 return d;
}
function capabilities(d){
 return new Promise((resolve,reject)=>{
  const u=new URL(d.baseUrl);const req=http.get({hostname:u.hostname==="[::1]"?"::1":u.hostname==="localhost"?"127.0.0.1":u.hostname,port:u.port,path:"/api/v1/capabilities",headers:{Authorization:"Bearer "+d.token}},res=>{
   if(res.statusCode!==200){res.resume();reject(Error("CLI identity handshake failed: HTTP "+res.statusCode));return;}
   let size=0;const chunks=[];res.on("data",b=>{size+=b.length;if(size>1048576){req.destroy(Error("Capabilities size limit"));return;}chunks.push(b);});res.on("error",reject);res.on("end",()=>{try{resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));}catch{reject(Error("Invalid capabilities"));}});
  });req.setTimeout(10000,()=>req.destroy(Error("CLI handshake timed out")));req.on("error",reject);
 });
}
async function resolveCli(options={}){
 const file=options.discoveryFile||process.env.SIMPLE_EXPERIMENT_API_FILE||path.join(process.env.APPDATA||path.join(os.homedir(),"AppData","Roaming"),"SimpleExperiment","api.json");
 const d=discovery(file),cap=await capabilities(d);
 if(cap.schemaVersion!==1||cap.rpc!=="json-rpc-2.0"||cap.name!==d.name||cap.version!==d.version||cap.instanceId!==d.pid+":"+d.startedAt)throw Error("Running plugin identity/version mismatch; reload the installed extension");
 const root=options.extensionsRoot||process.env.SIMPLE_CLI_EXTENSIONS_ROOT||path.join(os.homedir(),".vscode","extensions");
 const prefix="simple-local.simple-experiment-"+d.version;
 const candidates=fs.readdirSync(root).filter(name=>name===prefix||name.startsWith(prefix+"-")).map(name=>path.join(root,name)).filter(dir=>{
  const st=fs.lstatSync(dir);if(!st.isDirectory()||st.isSymbolicLink())return false;
  try{const p=JSON.parse(fs.readFileSync(path.join(dir,"package.json"),"utf8"));return p.name==="simple-experiment"&&p.publisher==="simple-local"&&p.version===d.version;}catch{return false;}
 });
 if(candidates.length!==1)throw Error("Expected exactly one installed CLI matching the running plugin "+d.version+"; configure SIMPLE_CLI_EXTENSIONS_ROOT for the selected VS Code installation");
 const entry=path.join(candidates[0],"dist","cli.js");const actual=fs.realpathSync(entry),base=fs.realpathSync(candidates[0]);
 if(!actual.startsWith(base+path.sep)||!fs.statSync(actual).isFile())throw Error("Invalid installed CLI entry");
 const fresh=discovery(file);for(const key of ["baseUrl","token","pid","startedAt","version","name"])if(fresh[key]!==d[key])throw Error("Discovery changed during CLI resolution");
 return actual;
}
async function main(){
 const entry=await resolveCli();
 const child=spawn(process.execPath,[entry,...process.argv.slice(2)],{stdio:"inherit",windowsHide:true,env:process.env});
 child.on("error",()=>{process.stderr.write("Could not start the verified CLI\n");process.exitCode=2;});
 child.on("close",(code,signal)=>{process.exitCode=signal?4:code===null?4:code;});
}
if(require.main===module)main().catch(error=>{const json=process.argv.includes("--json")||process.argv.includes("--compact-json");if(json)process.stdout.write(JSON.stringify({success:false,error:{code:"ENV",message:error.message}})+"\n");else process.stderr.write(error.message+"\n");process.exitCode=2;});
module.exports={resolveCli,discovery};
