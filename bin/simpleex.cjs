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
function capabilities(d,signal){
 return new Promise((resolve,reject)=>{
  const u=new URL(d.baseUrl);const req=http.get({hostname:u.hostname==="[::1]"?"::1":u.hostname==="localhost"?"127.0.0.1":u.hostname,port:u.port,path:"/api/v1/capabilities",headers:{Authorization:"Bearer "+d.token},signal},res=>{
   if(res.statusCode!==200){res.resume();reject(Error("CLI identity handshake failed: HTTP "+res.statusCode));return;}
   let size=0;const chunks=[];res.on("data",b=>{size+=b.length;if(size>1048576){req.destroy(Error("Capabilities size limit"));return;}chunks.push(b);});res.on("error",reject);res.on("end",()=>{try{resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));}catch{reject(Error("Invalid capabilities"));}});
  });req.setTimeout(10000,()=>req.destroy(Error("CLI handshake timed out")));req.on("error",reject);
 });
}
function installedEntries(root,version){
 const prefix="simple-local.simple-experiment-";
 return fs.readdirSync(root).filter(name=>name.startsWith(prefix)).map(name=>path.join(root,name)).filter(dir=>{
  const st=fs.lstatSync(dir);if(!st.isDirectory()||st.isSymbolicLink())return false;
  try{const p=JSON.parse(fs.readFileSync(path.join(dir,"package.json"),"utf8"));return p.name==="simple-experiment"&&p.publisher==="simple-local"&&/^\d+\.\d+\.\d+$/.test(p.version)&&(!version||p.version===version)
   &&(path.basename(dir)===prefix+p.version||path.basename(dir).startsWith(prefix+p.version+"-"));}catch{return false;}
 }).map(dir=>{
  return {dir,version:JSON.parse(fs.readFileSync(path.join(dir,"package.json"),"utf8")).version};
 }).sort((a,b)=>{const x=a.version.split('.').map(Number),y=b.version.split('.').map(Number);return y[0]-x[0]||y[1]-x[1]||y[2]-x[2];});
}
function installedCliEntry(row){
 const st=fs.lstatSync(row.dir),pkg=JSON.parse(fs.readFileSync(path.join(row.dir,'package.json'),'utf8'));
 if(!st.isDirectory()||st.isSymbolicLink()||pkg.name!=='simple-experiment'||pkg.publisher!=='simple-local'||pkg.version!==row.version)throw Error('Installed CLI identity changed');
 const entry=fs.realpathSync(path.join(row.dir,'dist','cli.js')),base=fs.realpathSync(row.dir);
 if(!entry.startsWith(base+path.sep)||!fs.statSync(entry).isFile())throw Error('Invalid installed CLI entry');
 return {...row,entry,base};
}
function routeFlag(argv,name){
 const values=[];
 for(let i=0;i<argv.length;i++){if(argv[i]===name){const value=argv[++i];if(!value||value.startsWith('--'))throw Error(name+' requires a value');values.push(value);}
  else if(argv[i].startsWith(name+'='))values.push(argv[i].slice(name.length+1));}
 if(values.length>1||values.some(value=>!value))throw Error('Invalid or repeated '+name);
 return values[0]||'';
}
async function resolveCli(options={}){
 const argv=options.argv||[],root=options.extensionsRoot||process.env.SIMPLE_CLI_EXTENSIONS_ROOT||path.join(os.homedir(),".vscode","extensions");
 const localHelp=Array.isArray(options.argv)&&(!argv.length||argv.includes('--help')||argv[0]==='help');
 const workspace=routeFlag(argv,'--workspace').trim(),pin=(routeFlag(argv,'--instance')||process.env.SIMPLE_CLI_INSTANCE_ID||'').trim();
 const newest=()=>{const rows=installedEntries(root);if(!rows.length||rows.filter(row=>row.version===rows[0].version).length!==1)throw Error('Expected exactly one newest installed CLI');return installedCliEntry(rows[0]);};
 const localHistory=argv.includes('--history')&&(argv[0]==='result'&&['list','show','export'].includes(argv[1])||argv[0]==='metric'&&['list','show'].includes(argv[1])||argv[0]==='compare'||argv[0]==='experiment'&&argv[1]==='results');
 if(localHelp||localHistory)return newest().entry;
 const signal=AbortSignal.any([options.signal,AbortSignal.timeout(30000)].filter(Boolean));
 signal.throwIfAborted();
 let file=options.discoveryFile||process.env.SIMPLE_EXPERIMENT_API_FILE||path.join(process.env.APPDATA||path.join(os.homedir(),"AppData","Roaming"),"SimpleExperiment","api.json");
 let d,cap;
 if(workspace||pin){
  if(workspace&&!path.isAbsolute(workspace))throw Error('--workspace requires an absolute path');
  const installed=newest(),helperPath=fs.realpathSync(path.join(path.dirname(installed.entry),'cli','LocalApiClient.js'));
  if(!helperPath.startsWith(installed.base+path.sep))throw Error('Invalid installed instance resolver');
  const helper=require(helperPath);
  if(!options.discoveryFile&&!process.env.SIMPLE_EXPERIMENT_API_FILE){
   if(workspace)file=(await helper.resolveInstanceByWorkspace('experiment',workspace,pin||undefined,{signal,onProgress:options.onProgress})).discoveryPath;
   else {const listing=helper.listPluginInstances('experiment');if(listing.truncated)throw Error('Instance listing truncated; use explicit discovery file');
    const rows=listing.rows.filter(row=>!row.error&&row.instanceId===pin);if(rows.length!==1)throw Error('Instance pin is missing or ambiguous');file=rows[0].discoveryPath;}
  }
  options.onProgress?.('核实所选实例的实际身份');
  const selected=await helper.preflightPluginAt('experiment',file,workspace||undefined,signal);
  helper.assertInstancePin(pin||undefined,selected);d=selected.discovery;cap=selected.capabilities;
 }else{d=discovery(file);cap=await capabilities(d,signal);}
 signal.throwIfAborted();
 if(cap.schemaVersion!==1||cap.rpc!=="json-rpc-2.0"||cap.name!==d.name||cap.version!==d.version||cap.instanceId!==d.pid+":"+d.startedAt)throw Error("Running plugin identity/version mismatch; reload the installed extension");
 const candidates=installedEntries(root,d.version);
 if(candidates.length!==1)throw Error("Expected exactly one installed CLI matching the running plugin "+d.version+"; configure SIMPLE_CLI_EXTENSIONS_ROOT for the selected VS Code installation");
 const fresh=discovery(file);for(const key of ["baseUrl","token","pid","startedAt","version","name"])if(fresh[key]!==d[key])throw Error("Discovery changed during CLI resolution");
 const requireCwd=!workspace&&!pin&&!options.discoveryFile&&!process.env.SIMPLE_EXPERIMENT_API_FILE;
 if(requireCwd){const live=String(cap.workspace||''),relative=live?path.relative(path.resolve(live),process.cwd()):'..';
  if(!live||relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))throw Error('API_WORKSPACE_MISMATCH：默认 API 属于其他项目窗口，请使用 --workspace 或 --instance 明确选择；未执行命令。');}
 options.onResolved?.(path.resolve(file),{schemaVersion:1,discoveryPath:path.resolve(file),instanceId:cap.instanceId,workspace:String(cap.workspace||''),requireCwd});
 return installedCliEntry(candidates[0]).entry;
}
async function main(){
 let selectedFile,selectedTarget;
 const controller=new AbortController(),cancel=()=>controller.abort(Error('CLI 实例核实已取消，未执行命令。'));
 process.once('SIGINT',cancel);process.once('SIGTERM',cancel);
 let entry;
 try{entry=await resolveCli({argv:process.argv.slice(2),signal:controller.signal,onProgress:message=>process.stderr.write('[simpleex] '+message+'\n'),onResolved:(file,target)=>{selectedFile=file;selectedTarget=target;}});}
 finally{process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);}
 const child=spawn(process.execPath,[entry,...process.argv.slice(2)],{stdio:"inherit",windowsHide:true,env:{...process.env,SIMPLE_CLI_RESOLVED_EXPERIMENT:selectedTarget?JSON.stringify(selectedTarget):'',...(selectedFile?{SIMPLE_EXPERIMENT_API_FILE:selectedFile}:{})}});
 child.on("error",()=>{process.stderr.write("Could not start the verified CLI\n");process.exitCode=2;});
 child.on("close",(code,signal)=>{process.exitCode=signal?4:code===null?4:code;});
}
if(require.main===module)main().catch(error=>{const json=process.argv.includes("--json")||process.argv.includes("--compact-json");if(json)process.stdout.write(JSON.stringify({success:false,error:{code:"ENV",message:error.message}})+"\n");else process.stderr.write(error.message+"\n");process.exitCode=2;});
module.exports={resolveCli,discovery};
