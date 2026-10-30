const {assert,fs,http,os,path,test}=require("./simpleCli.support.cjs");
const {resolveCli}=require("../../bin/simpleex.cjs");
const {installCliShim}=require("../../scripts/install-cli-shim");
const root=fs.mkdtempSync(path.join(os.tmpdir(),"stable-cli-"));console.log("retained: "+root);

test('help resolves an installed CLI without any discovery or running window',async()=>{
 const extensions=path.join(root,'offline');const dir=path.join(extensions,'simple-local.simple-experiment-3.0.0');fs.mkdirSync(path.join(dir,'dist'),{recursive:true});
 fs.writeFileSync(path.join(dir,'package.json'),JSON.stringify({name:'simple-experiment',publisher:'simple-local',version:'3.0.0'}),'utf8');
 fs.writeFileSync(path.join(dir,'dist/cli.js'),'throw Error("not executed by resolution");','utf8');
 const old=path.join(extensions,'simple-local.simple-experiment-1.0.0');fs.mkdirSync(old,{recursive:true});
 fs.writeFileSync(path.join(old,'package.json'),JSON.stringify({name:'simple-experiment',publisher:'simple-local',version:'1.0.0'}),'utf8');
 for(const argv of [['--help'],['help'],[],['result','--help']])assert.equal(await resolveCli({extensionsRoot:extensions,discoveryFile:path.join(root,'missing.json'),argv}),path.join(dir,'dist/cli.js'));
 for(const argv of [['result','list','--history'],['metric','show','r','--history'],['compare','a','b','--history'],['experiment','results','r','--history']])assert.equal(await resolveCli({extensionsRoot:extensions,discoveryFile:path.join(root,'missing.json'),argv}),path.join(dir,'dist/cli.js'));
 await assert.rejects(resolveCli({extensionsRoot:extensions,discoveryFile:path.join(root,'missing.json'),argv:['task','dispatch','--history']}),/ENOENT/);
});

test('default launcher checks the project and frozen instance routing reuses only that record with fresh handshakes',async()=>{
 const appdata=path.join(root,'bound-routing'),extensions=path.join(root,'bound-extensions'),dir=path.join(extensions,'simple-local.simple-experiment-5.0.0');
 fs.mkdirSync(path.join(dir,'dist'),{recursive:true});fs.writeFileSync(path.join(dir,'package.json'),JSON.stringify({name:'simple-experiment',publisher:'simple-local',version:'5.0.0'}),'utf8');fs.writeFileSync(path.join(dir,'dist/cli.js'),'// resolution fixture','utf8');
 const apiDir=path.join(appdata,'SimpleExperiment'),file=path.join(apiDir,'api.json'),workspace=process.cwd(),other=path.join(root,'other-project'),instanceId='55:2026-01-01T00:00:00Z';
 fs.mkdirSync(apiDir,{recursive:true});let liveWorkspace=other,liveId=instanceId,capabilities=0,rpcs=0;
 const server=http.createServer((req,res)=>{
  if(req.url==='/api/v1/capabilities'){capabilities++;res.end(JSON.stringify({schemaVersion:1,rpc:'json-rpc-2.0',methods:['status'],name:'SimpleExperiment',version:'5.0.0',instanceId:liveId,workspace:liveWorkspace}));return;}
  const chunks=[];req.on('data',bytes=>chunks.push(bytes));req.on('end',()=>{rpcs++;const rpc=JSON.parse(Buffer.concat(chunks).toString('utf8'));res.end(JSON.stringify({jsonrpc:'2.0',id:rpc.id,result:{ok:true}}));});
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 fs.writeFileSync(file,JSON.stringify({name:'SimpleExperiment',version:'5.0.0',pid:55,startedAt:'2026-01-01T00:00:00Z',baseUrl:'http://127.0.0.1:'+server.address().port,token:'test-only',workspace}),'utf8');
 const saved=Object.fromEntries(['APPDATA','SIMPLE_EXPERIMENT_API_FILE','SIMPLE_CLI_INSTANCE_ID','SIMPLE_CLI_RESOLVED_EXPERIMENT'].map(key=>[key,process.env[key]])),originalReaddir=fs.readdirSync;
 process.env.APPDATA=appdata;delete process.env.SIMPLE_EXPERIMENT_API_FILE;delete process.env.SIMPLE_CLI_INSTANCE_ID;delete process.env.SIMPLE_CLI_RESOLVED_EXPERIMENT;
 try{
  await assert.rejects(resolveCli({extensionsRoot:extensions,argv:['project','status']}),/API_WORKSPACE_MISMATCH/);assert.equal(rpcs,0);
  liveWorkspace=workspace;let selected,binding;
  await resolveCli({extensionsRoot:extensions,argv:['project','status'],onResolved:(value,target)=>{selected=value;binding=target;}});
  assert.equal(selected,file);assert.equal(binding.requireCwd,true);
  process.env.SIMPLE_EXPERIMENT_API_FILE=selected;process.env.SIMPLE_CLI_RESOLVED_EXPERIMENT=JSON.stringify(binding);
  const transport=require('../../dist/cli/LocalApiClient.js'),before=capabilities;
  fs.readdirSync=(directory,...args)=>{if(path.resolve(directory)===path.join(apiDir,'instances'))assert.fail('already selected instance must not trigger workspace enumeration');return originalReaddir(directory,...args);};
  for(let i=0;i<2;i++)assert.equal((await transport.callPluginRpc('experiment','status',{},undefined,{workspace})).ok,true);
  assert.equal(rpcs,2);assert.equal(capabilities-before,2,'every RPC retains its own live handshake');
  liveId='different';await assert.rejects(transport.callPluginRpc('experiment','status',{}),/identity mismatch/i);assert.equal(rpcs,2);liveId=instanceId;
  liveWorkspace=other;process.env.SIMPLE_CLI_RESOLVED_EXPERIMENT=JSON.stringify({...binding,workspace:other});
  await assert.rejects(transport.callPluginRpc('experiment','status',{}),/API_WORKSPACE_MISMATCH/);assert.equal(rpcs,2);
  process.env.SIMPLE_CLI_RESOLVED_EXPERIMENT=JSON.stringify({...binding,workspace:other,requireCwd:false});
  assert.equal((await transport.callPluginRpc('experiment','status',{},undefined,{workspace:other})).ok,true);
  await assert.rejects(transport.callPluginRpc('experiment','status',{},'different',{workspace:other}),/pin mismatch/i);assert.equal(rpcs,3);
  process.env.SIMPLE_CLI_RESOLVED_EXPERIMENT='{invalid';await assert.rejects(transport.callPluginRpc('experiment','status',{}),/CLI_INSTANCE_BINDING_INVALID/);assert.equal(rpcs,3);
 }finally{fs.readdirSync=originalReaddir;for(const[key,value]of Object.entries(saved)){if(value===undefined)delete process.env[key];else process.env[key]=value;}server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

test('workspace and instance selection bypass a dead default window with real identity checks',async()=>{
 const appdata=path.join(root,'routing'),extensions=path.join(root,'routing-extensions'),dir=path.join(extensions,'simple-local.simple-experiment-4.0.0');
 fs.mkdirSync(path.join(dir,'dist/cli'),{recursive:true});fs.writeFileSync(path.join(dir,'package.json'),JSON.stringify({name:'simple-experiment',publisher:'simple-local',version:'4.0.0'}),'utf8');
 fs.writeFileSync(path.join(dir,'dist/cli.js'),'throw Error("not executed");','utf8');
 fs.writeFileSync(path.join(dir,'dist/cli/LocalApiClient.js'),'module.exports=require('+JSON.stringify(require.resolve('../../dist/cli/LocalApiClient.js'))+');','utf8');
 const instances=path.join(appdata,'SimpleExperiment/instances');fs.mkdirSync(instances,{recursive:true});
 const workspace=path.join(root,'project'),instanceId='44:2026-01-01T00:00:00Z';let liveWorkspace=workspace;
 const server=http.createServer((req,res)=>res.end(JSON.stringify({schemaVersion:1,rpc:'json-rpc-2.0',methods:[],name:'SimpleExperiment',version:'4.0.0',instanceId,workspace:liveWorkspace})));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const record={name:'SimpleExperiment',version:'4.0.0',pid:44,startedAt:'2026-01-01T00:00:00Z',baseUrl:'http://127.0.0.1:'+server.address().port,token:'test-only',workspace};
 const file=path.join(instances,'44.json');fs.writeFileSync(file,JSON.stringify(record),'utf8');
 fs.writeFileSync(path.join(appdata,'SimpleExperiment/api.json'),'invalid dead default','utf8');
 const saved={APPDATA:process.env.APPDATA,SIMPLE_EXPERIMENT_API_FILE:process.env.SIMPLE_EXPERIMENT_API_FILE,SIMPLE_CLI_INSTANCE_ID:process.env.SIMPLE_CLI_INSTANCE_ID};
 process.env.APPDATA=appdata;delete process.env.SIMPLE_EXPERIMENT_API_FILE;delete process.env.SIMPLE_CLI_INSTANCE_ID;
 try{
  let selected;const progress=[];assert.equal(await resolveCli({extensionsRoot:extensions,argv:['--workspace',workspace],onProgress:message=>progress.push(message),onResolved:value=>selected=value}),path.join(dir,'dist/cli.js'));assert.equal(selected,file);
  assert.ok(progress.some(message=>message.includes('正在核实实例 1/1')));assert.ok(progress.some(message=>message.includes('已处理实例 1/1')));
  const abort=new AbortController();abort.abort();await assert.rejects(resolveCli({extensionsRoot:extensions,argv:['--workspace',workspace],signal:abort.signal}),/abort|取消/i);
  assert.equal(await resolveCli({extensionsRoot:extensions,argv:['--instance',instanceId]}),path.join(dir,'dist/cli.js'));
  await assert.rejects(resolveCli({extensionsRoot:extensions,argv:['--instance','other']}),/missing|ambiguous/);
  liveWorkspace=path.join(root,'different');await assert.rejects(resolveCli({extensionsRoot:extensions,argv:['--workspace',workspace]}),/存活|工作区|实例/);
 }finally{for(const [key,value]of Object.entries(saved)){if(value===undefined)delete process.env[key];else process.env[key]=value;}server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
test('a missing CLI in the selected running version refuses rather than falling back to a newer version',async()=>{
 const extensions=path.join(root,'broken-running'),file=path.join(root,'broken-api.json');
 for(const version of ['1.0.0','2.0.0']){
  const dir=path.join(extensions,'simple-local.simple-experiment-'+version);fs.mkdirSync(path.join(dir,'dist'),{recursive:true});
  fs.writeFileSync(path.join(dir,'package.json'),JSON.stringify({name:'simple-experiment',publisher:'simple-local',version}),'utf8');
  if(version==='2.0.0')fs.writeFileSync(path.join(dir,'dist/cli.js'),'throw Error("never executed");','utf8');
 }
 const server=http.createServer((req,res)=>res.end(JSON.stringify({schemaVersion:1,rpc:'json-rpc-2.0',name:'SimpleExperiment',version:'1.0.0',instanceId:'66:2026-01-01T00:00:00Z'})));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 fs.writeFileSync(file,JSON.stringify({name:'SimpleExperiment',version:'1.0.0',pid:66,startedAt:'2026-01-01T00:00:00Z',baseUrl:'http://127.0.0.1:'+server.address().port,token:'test-only'}),'utf8');
 try{await assert.rejects(resolveCli({extensionsRoot:extensions,discoveryFile:file}),/ENOENT/);}
 finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
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
