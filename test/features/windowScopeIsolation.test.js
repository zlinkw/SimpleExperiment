const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
require('../_helpers/registerTsRequire');
const P=require('../../src/core/ProjectConnectionProfiles.ts');
const {currentWindowSftpDiscovery}=require('../../src/core/SimpleSftpWindow.ts');
const memo=(initial={})=>{const values=structuredClone(initial),writes=[];return {values,writes,get:key=>values[key],update:async(key,value)=>{writes.push(key);values[key]=structuredClone(value);}};};
test('server connections migrate from a configured project and are shared across windows and folder changes',async()=>{
 const setupKey='simpleExperiment.xshellRealtimeTunnelConfig',tunnelKey='simpleExperiment.tunnelGatewayConfig';
 const root='C:/project-A',owner=path.resolve(root).replaceAll('\\','/').toLowerCase();
 const oldKey='simpleExperiment.projectConnections.v1.'+require('node:crypto').createHash('sha256').update(owner).digest('hex');
 const setup={workerTunnels:[{id:'rjj8',workerHost:'worker.example',workerSshPort:22,agentProjectDir:'/research',enabled:true}],condaEnv:'/env/shared'};
 const local=memo({[oldKey]:{schemaVersion:1,root:owner,values:{[setupKey]:setup,[tunnelKey]:{localPort:1234}}}}),global=memo();
 const empty={globalState:global,workspaceState:memo()};
 assert.equal(P.readProjectConnectionValue(empty,'C:/empty',setupKey),undefined,'an empty project must not freeze an empty global migration');
 const a={globalState:global,workspaceState:local};
 assert.deepEqual(P.readProjectConnectionValue(a,root,setupKey),setup);
 await P.saveProjectConnectionValues(a,root,{[setupKey]:{...setup,condaEnv:'/env/updated'}});
 const b={globalState:global,workspaceState:memo()};
 assert.equal(P.readProjectConnectionValue(b,'C:/project-B',setupKey).condaEnv,'/env/updated');
 assert.equal(P.readProjectConnectionValue(empty,'C:/empty',setupKey).condaEnv,'/env/updated');
 assert.equal(P.readProjectConnectionValue(b,'',tunnelKey).localPort,1234);
 await P.saveProjectConnectionValues(b,'C:/project-B',{[setupKey]:{...setup,workerTunnels:[]}});
 assert.deepEqual(P.readProjectConnectionValue(a,root,setupKey).workerTunnels,[],'old project settings cannot resurrect a deliberately emptied shared list');
 assert.equal(local.writes.length,0,'legacy project configuration is retained without rewriting');
 await P.saveProjectConnectionValues(b,'',{[setupKey]:setup});
 assert.deepEqual(P.readProjectConnectionValue(a,root,setupKey),setup);
});
test('shared connection refresh updates a background project without changing its queue or grant, and project switches only remind',async()=>{
 const vm=require('node:vm'),ts=require('typescript'),method=require('../_helpers/legacyMethod');
 const source=fs.readFileSync(path.join(__dirname,'../../src/extension/legacy.ts'),'utf8');
 let root='C:/project-A',choice;const global=memo(),messages=[],opened=[],actions=[];
 const Host=vm.runInNewContext(ts.transpileModule('class Host {'+['refreshSharedConnectionSettings','remindSharedConnectionSettings'].map(n=>method(source,n+'(')).join('\n')+'}; Host',{
  compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{
  sharedConnectionProfile:P.sharedConnectionProfile,workspaceRoot:()=>root,path,
  canonicalComparablePath:require('../../src/project/BranchProjectStore.ts').canonicalComparablePath,
  vscode:{window:{state:{focused:true},showInformationMessage:async(message,...options)=>{messages.push(message);actions.push(options);return choice;},showErrorMessage:error=>{throw Error(error);}}},
 });
 const context={globalState:global,workspaceState:memo()},h=new Host();h.context=context;
 h.loadSetupConfig=()=>P.readProjectConnectionValue(context,root,'simpleExperiment.xshellRealtimeTunnelConfig')||{workerTunnels:[]};
 h.loadTunnelConfig=()=>P.readProjectConnectionValue(context,root,'simpleExperiment.tunnelGatewayConfig')||{};
 h.enabledWorkerConfigs=()=>h.setupConfig.workerTunnels.filter(w=>w.enabled!==false);h.resetClient=()=>{};h.postState=()=>{};h.openPanelAt=(...args)=>opened.push(args);
 const queue=h.queue={jobs:[{commandId:'running-original'}]},grant={workspace:'C:/project-A'};await context.workspaceState.update('simpleExperiment.mcp.authorization.v1',grant);
 await P.saveProjectConnectionValues(context,root,{'simpleExperiment.xshellRealtimeTunnelConfig':{workerTunnels:[{id:'worker-one',enabled:true}],condaEnv:'/first'}});
 h.refreshSharedConnectionSettings();assert.equal(h.setupConfig.condaEnv,'/first');
 const other={globalState:global,workspaceState:memo()};await P.saveProjectConnectionValues(other,'C:/project-B',{'simpleExperiment.xshellRealtimeTunnelConfig':{workerTunnels:[{id:'worker-one',enabled:true}],condaEnv:'/changed'}});
 h.refreshSharedConnectionSettings();assert.equal(h.setupConfig.condaEnv,'/changed');assert.equal(h.queue,queue);
 assert.deepEqual(context.workspaceState.get('simpleExperiment.mcp.authorization.v1'),grant);
 await h.remindSharedConnectionSettings();await h.remindSharedConnectionSettings();assert.equal(messages.length,1);assert.equal(opened.length,0);
 const second=new Host();second.context=other;second.enabledWorkerConfigs=()=>[{id:'worker-one',enabled:true}];second.openPanelAt=(...args)=>opened.push(args);
 root='C:/project-B';await second.remindSharedConnectionSettings();assert.equal(messages.length,2);assert.match(messages[1],/project-B.*全局服务器/);assert.match(messages[1],/Conda.*项目父目录.*隧道端口/);assert.equal(opened.length,0);
 root='C:/project-A';await h.remindSharedConnectionSettings();assert.equal(messages.length,2,'returning focus from another project cannot repeat its existing reminder');
 const reloaded=new Host();reloaded.context=context;reloaded.enabledWorkerConfigs=h.enabledWorkerConfigs;await reloaded.remindSharedConnectionSettings();
 assert.equal(messages.length,2,'reloading the same project retains the reminder decision');
 root='C:/project-C';await h.remindSharedConnectionSettings();assert.equal(messages.length,3,'a genuinely different project still receives its first reminder');
 assert.deepEqual(Array.from(actions[2]),['检查项目差异','已确认，此后不再通知']);
 choice='已确认，此后不再通知';root='C:/project-D';await h.remindSharedConnectionSettings();
 await new Promise(resolve=>setImmediate(resolve));
 const acknowledged=new Host();acknowledged.context={globalState:global,workspaceState:memo()};acknowledged.enabledWorkerConfigs=second.enabledWorkerConfigs;
 root='c:/PROJECT-d/';await acknowledged.remindSharedConnectionSettings();
 assert.equal(messages.length,4,'explicit acknowledgement survives a fresh workspace identity and Windows path spelling changes');
 choice=undefined;root='C:/project-E';await acknowledged.remindSharedConnectionSettings();assert.equal(messages.length,5,'acknowledgement only applies to the chosen project');
 const dismissed=new Host();dismissed.context={globalState:global,workspaceState:memo()};dismissed.enabledWorkerConfigs=second.enabledWorkerConfigs;
 await dismissed.remindSharedConnectionSettings();assert.equal(messages.length,6,'closing a notification does not persist explicit acknowledgement');
});
test('same-window SFTP exports ignore a foreign global default and reject wrong PID/project or missing project',async()=>{
 let legacy=0,activated=0;const root='C:/project-A',descriptor={pid:process.pid,workspace:root,baseUrl:'http://127.0.0.1:1234'};
 const registry={getExtension:()=>({isActive:false,activate:async()=>{activated++;return {getLocalApiDiscovery:async()=>descriptor};}})};
 const readLegacy=async()=>{legacy++;return {pid:process.pid+1,workspace:'C:/other'};};
 assert.equal(await currentWindowSftpDiscovery(registry,root,readLegacy),descriptor);assert.equal(activated,1);assert.equal(legacy,0);
 descriptor.workspace='C:/other';await assert.rejects(currentWindowSftpDiscovery(registry,root,readLegacy),/WORKSPACE_MISMATCH/);
 descriptor.workspace=root;descriptor.pid++;await assert.rejects(currentWindowSftpDiscovery(registry,root,readLegacy),/WINDOW_MISMATCH/);
 await assert.rejects(currentWindowSftpDiscovery(registry,'',readLegacy),/PROJECT_REQUIRED/);
});
test('real Experiment APIs refuse cross-window and changed-workspace RPCs before invoking handlers',async()=>{
 const {LocalApiServer}=require('../../dist/api/LocalApiServer');let workspace=path.join(os.tmpdir(),'scope-A'),calls=0;
 const api=new LocalApiServer({name:'SimpleExperiment',version:'fixture',preferredPort:23990,workspace,getWorkspace:()=>workspace,methods:{mark:()=>++calls}});
 await api.start();const d=api.discovery();
 const rpc=async(root,instance=d.instanceId)=>{
  const response=await fetch(d.baseUrl+'/api/v1/rpc',{method:'POST',headers:{Authorization:'Bearer '+d.token,'Content-Type':'application/json','X-Simple-Api-Instance':instance,'X-Simple-Api-Workspace':encodeURIComponent(root)},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'mark',params:{}})});
  return response.json();
 };
 try{
  assert.equal((await rpc(workspace)).result,1);
  assert.match((await rpc(workspace,'other-window')).error.message,/INSTANCE_MISMATCH/);
  const original=workspace;workspace=path.join(os.tmpdir(),'scope-B');
  assert.match((await rpc(original)).error.message,/WORKSPACE_MISMATCH/);assert.equal(calls,1);
  assert.equal(api.capabilities().workspace,workspace);
 }finally{await api.dispose();}
});
test('CLI default cannot mutate a foreign window, and explicit workspace routing ignores the overwritten alias',async()=>{
 const {LocalApiServer}=require('../../dist/api/LocalApiServer'),{callPluginRpc}=require('../../dist/cli/LocalApiClient');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'simple-window-scope-')),dir=path.join(root,'SimpleExperiment');fs.mkdirSync(dir);
 const names=['APPDATA','SIMPLE_EXPERIMENT_API_FILE','SIMPLE_CLI_INSTANCE_ID'],saved=Object.fromEntries(names.map(n=>[n,process.env[n]]));
 process.env.APPDATA=root;delete process.env.SIMPLE_EXPERIMENT_API_FILE;delete process.env.SIMPLE_CLI_INSTANCE_ID;
 let callsA=0,callsB=0;const a=new LocalApiServer({name:'SimpleExperiment',version:'fixture',preferredPort:23991,workspace:path.join(root,'A'),discoveryPath:path.join(dir,'api.json'),methods:{mark:()=>++callsA}});
 const b=new LocalApiServer({name:'SimpleExperiment',version:'fixture',preferredPort:23992,workspace:path.join(root,'B'),discoveryPath:path.join(dir,'api.json'),methods:{mark:()=>++callsB}});
 try{
  await a.start();await b.start();
  await assert.rejects(callPluginRpc('experiment','mark',{}),/WORKSPACE_MISMATCH/);assert.equal(callsA+callsB,0);
  assert.equal(await callPluginRpc('experiment','mark',{},undefined,{workspace:path.join(root,'A')}),1);
  assert.equal(callsA,1);assert.equal(callsB,0);
  await a.dispose();const alias=JSON.parse(fs.readFileSync(path.join(dir,'api.json'),'utf8'));assert.equal(alias.instanceId,b.discovery().instanceId);
 }finally{await a.dispose();await b.dispose();for(const name of names){if(saved[name]===undefined)delete process.env[name];else process.env[name]=saved[name];}}
});
