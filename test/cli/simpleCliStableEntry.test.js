const {assert,fs,http,os,path,test}=require("./simpleCli.support.cjs");
const {resolveCli}=require("../../bin/simpleex.cjs");
const {installCliShim}=require("../../scripts/install-cli-shim");
const root=fs.mkdtempSync(path.join(os.tmpdir(),"stable-cli-"));console.log("retained: "+root);
test("stable shims replace recognized npm wrappers and reject unrelated commands before writes",()=>{
 const dest=path.join(root,"commands");fs.mkdirSync(dest);
 fs.writeFileSync(path.join(dest,"simpleex.cmd"),'node "%~dp0node_modules/simple-experiment/dist/cli.js" %*',"utf8");
 const a=installCliShim(dest);assert.equal(a.files.length,4);for(const f of a.files)assert.match(fs.readFileSync(path.join(dest,f),"utf8"),/SIMPLEEX_STABLE_ENTRY_V1/);
 assert.deepEqual(installCliShim(dest).files,a.files);
 const other=path.join(root,"other");fs.mkdirSync(other);fs.writeFileSync(path.join(other,"simpleex.cmd"),"user-owned command","utf8");
 assert.throws(()=>installCliShim(other),/unrelated command/);assert.equal(fs.existsSync(path.join(other,"simpleex-launcher.cjs")),false);assert.equal(fs.readFileSync(path.join(other,"simpleex.cmd"),"utf8"),"user-owned command");
});
test("entry follows the running version across an upgrade, never the highest installed version",async()=>{
 const extensions=path.join(root,"extensions");fs.mkdirSync(extensions);
 for(const v of ["1.0.0","2.0.0"]){const dir=path.join(extensions,"simple-local.simple-experiment-"+v);fs.mkdirSync(path.join(dir,"dist"),{recursive:true});fs.writeFileSync(path.join(dir,"package.json"),JSON.stringify({name:"simple-experiment",publisher:"simple-local",version:v}),"utf8");fs.writeFileSync(path.join(dir,"dist","cli.js"),"throw Error('fixture must never execute');","utf8");}
 let version="1.0.0",wrong=false;
 const server=http.createServer((req,res)=>res.end(JSON.stringify({schemaVersion:1,rpc:"json-rpc-2.0",name:"SimpleExperiment",version,instanceId:wrong?"other":"13:2026-01-01T00:00:00Z"})));
 await new Promise(r=>server.listen(0,"127.0.0.1",r));const file=path.join(root,"api.json");
 const write=(status)=>fs.writeFileSync(file,JSON.stringify({name:"SimpleExperiment",version,pid:13,startedAt:"2026-01-01T00:00:00Z",baseUrl:"http://127.0.0.1:"+server.address().port,token:"test-only",status}),"utf8");
 try{
  write();assert.equal(await resolveCli({extensionsRoot:extensions,discoveryFile:file}),path.join(extensions,"simple-local.simple-experiment-1.0.0","dist","cli.js"));
  version="2.0.0";write();assert.equal(await resolveCli({extensionsRoot:extensions,discoveryFile:file}),path.join(extensions,"simple-local.simple-experiment-2.0.0","dist","cli.js"));
  wrong=true;await assert.rejects(resolveCli({extensionsRoot:extensions,discoveryFile:file}),/mismatch/);wrong=false;
  write("stopped");await assert.rejects(resolveCli({extensionsRoot:extensions,discoveryFile:file}),/running/);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
