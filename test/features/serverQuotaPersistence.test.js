const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
require('../_helpers/registerTsRequire');
const X=require('../../src/tunnel/XshellTunnelSetup.ts'),Q=require('../../src/features/GpuQuotaScheduling.ts'),M=require('../../src/features/GpuMemoryScheduling.ts');
const source=fs.readFileSync('src/extension/legacy.ts','utf8'),ast=ts.createSourceFile('host.ts',source,ts.ScriptTarget.Latest,true),cls=ast.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='RealtimeTunnelPanelProvider');
test('execution environment admission accepts system Python and preserves explicit path validation',()=>{
 const method=cls.members.find(n=>n.name?.getText(ast)==='assertExecutionCondaEnvReady').getText(ast);
 const helpers=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&['normalizeCondaEnvSetting','isCondaEnvAbsolutePathValid','effectiveWorkerCondaEnv'].includes(n.name?.text)).map(n=>n.getText(ast)).join('\n');
 const c=vm.createContext({});
 vm.runInContext(ts.transpileModule(helpers+'\nclass Host{'+method+'};this.h=new Host();',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,c);
 for(const env of ['',undefined,'-','--','/env/train','/env/train/bin/python'])
  assert.doesNotThrow(()=>c.h.assertExecutionCondaEnvReady([{id:'worker-a',condaEnv:env}]));
 assert.equal(c.effectiveWorkerCondaEnv({condaEnv:''},'/env/default'),'');
 assert.equal(c.effectiveWorkerCondaEnv({},'/env/default'),'/env/default');
 assert.throws(()=>c.h.assertExecutionCondaEnvReady([{id:'worker-a',condaEnv:'relative-env'}]),/worker-a.*完整环境路径/);
});
function fixture({events=true,interruptStorage=false}={}){
 const keys={setupConfig:'setup',tunnelConfig:'tunnel',setupConfigurationSignature:'signature'},state=new Map(),settings=new Map(),writes=[];
 let h,interrupted=false;
 const config={inspect:key=>({defaultValue:key==='tunnel.remoteTmuxSessionPrefix'?'simple':'',globalValue:settings.get(key)}),get:(key,fallback)=>settings.get(key)??fallback,
  update:async(key,value)=>{settings.set(key,value);if(events)await h.handleConfigurationChanged({affectsConfiguration:prefix=>prefix==='simpleExperiment'||prefix==='simpleExperiment.tunnel'});}};
 const patch=(input,key,fallback)=>Object.hasOwn(input,key)?input[key]:fallback;
 const names=['applySetupDraft','saveState','loadSetupConfig','sessionDefaultInspections','sessionDefaultConfigurationSignature','handleConfigurationChanged','saveWorkerConfigFromUi','saveWorkerConfigCore','schedulerSettings','scalarViewerQuery'];
 const methods=cls.members.filter(n=>names.includes(n.name?.getText(ast))).map(n=>n.getText(ast)).join('\n');
 const helpers=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&['condaEnvPatch','assertCondaEnvAbsolutePath'].includes(n.name?.text)).map(n=>n.getText(ast)).join('\n');
 const Host=vm.runInNewContext(ts.transpileModule(helpers+'\nclass Host{'+methods+'};Host',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{
  keys,XshellTunnelSetup_1:X,GpuQuotaScheduling:Q,GpuMemoryScheduling:M,ConfigurationSettings_1:require('../../src/tunnel/ConfigurationSettings.ts'),
  TunnelGateway_1:{normalizeTunnelGatewayConfig:value=>value,xshellTunnelConnectionMode:'xshell_realtime',isRealtimeConnectionMode:()=>true},
  persistedXshellSetupConfig:value=>structuredClone(value),persistedTunnelGatewayConfig:value=>structuredClone(value),nonEmptyWorkerTunnelConfig:value=>value,
  vscode:{ConfigurationTarget:{Global:1},workspace:{getConfiguration:()=>config},window:{showInformationMessage(){},showWarningMessage(){}}},
  recordField:(message,key)=>message[key],stringField:(message,key)=>message[key],
  workspaceRoot:()=> 'C:/quota-project',
  readProjectConnectionValue:(_context,_root,key)=>structuredClone(state.get(key)),
  saveProjectConnectionValues:async(_context,_root,values)=>{for(const [key,value] of Object.entries(values)){
   if(interruptStorage&&key==='tunnel'&&!interrupted){interrupted=true;await h.handleConfigurationChanged({affectsConfiguration:prefix=>prefix==='simpleExperiment'||prefix==='simpleExperiment.tunnel'});}
   state.set(key,structuredClone(value));writes.push(key);
  }},
  preservedOptionalStringPatch:patch,preservedStringPatch:patch,clearableOptionalStringPatch:patch,sessionScopedOptionalStringPatch:patch,
  numberPatch:patch,forwardIndexPatch:patch,autoOrNumberRangePatch:patch,boolishPatch:patch,optionalNumberRangePatch:patch,
  sessionPathChanged:(a,b)=>a!==b,assertActualWorkRoot(){},normalizeRemoteWorkRoot:String,effectiveWorkerCondaEnv:(worker,global)=>worker.condaEnv??global,
 });
 h=new Host();h.context={globalState:{get:key=>structuredClone(state.get(key)),update:async(key,value)=>{
  if(interruptStorage&&key==='tunnel'&&!interrupted){interrupted=true;await h.handleConfigurationChanged({affectsConfiguration:prefix=>prefix==='simpleExperiment'||prefix==='simpleExperiment.tunnel'});}
  state.set(key,structuredClone(value));writes.push(key);}}};
 h.tunnelConfig={localPort:24000,remotePort:25000};h.setupConfig=X.normalizeXshellSetupConfig({condaEnv:'env',workerTunnels:['a','b'].map(id=>({id,workerHost:id,agentProjectDir:'/project',gpuMaxConcurrentCards:1}))});
 state.set('setup',structuredClone(h.setupConfig));state.set('tunnel',structuredClone(h.tunnelConfig));
 Object.assign(h,{lastWorkerProbes:{},isRealtimeMode:()=>true,effectiveConnectionMode:()=> 'xshell_realtime',loadTunnelConfig:()=>state.get('tunnel'),resetClient(){},postState(){},ensureRealtimeConnected:async()=>{},
  withAssignmentsFromConfigFields:value=>value,withXshellDerivedFields:value=>value,withImportedXshellFields:value=>value,ensureXshellSessionLoaded:async()=>{},showServerConfigSavedNextStep:async()=>{}});
 return {h,state,writes,settings,reload:()=>h.loadSetupConfig()};
}
test('parameterized Worker saves return actual persisted values without opening continuation selectors', async () => {
 const f=fixture();f.h.showServerConfigSavedNextStep=async()=>assert.fail('API mode must not open a follow-up selector');
 const result=await f.h.saveWorkerConfigFromUi({endpointId:'a',patch:{condaEnvMode:'system',gpuMaxConcurrentCards:2},apiMode:true});
 assert.equal(result.ok,true);assert.equal(result.workerId,'a');assert.equal(result.worker.condaEnv,'');
 assert.equal(result.worker.gpuMaxConcurrentCards,2);assert.equal(f.reload().workerTunnels[0].gpuMaxConcurrentCards,2);
});
test('server cap, zero/pause and cleared/inherit survive real save, configuration callbacks and fresh reload',async()=>{
 for(const cap of [2,0,undefined]){const f=fixture(),workers=f.h.setupConfig.workerTunnels.map(w=>w.id==='a'?{...w,gpuMaxConcurrentCards:cap,gpuCardOverrides:{'0':{gpuJobsPerCard:6}}}:w);
  await f.h.applySetupDraft({workerTunnels:workers});
  for(const value of [f.h.setupConfig,f.state.get('setup'),f.reload()]){assert.equal(value.workerTunnels[0].gpuMaxConcurrentCards,cap);assert.equal(value.workerTunnels[0].gpuCardOverrides['0'].gpuJobsPerCard,6);assert.equal(value.workerTunnels[1].gpuMaxConcurrentCards,1);}
 }
});
test('storage captures one immutable settings snapshot even when an unrelated config callback interleaves the two writes',async()=>{
 const f=fixture({events:false,interruptStorage:true});f.h.setupConfig.workerTunnels[0].gpuMaxConcurrentCards=3;
 await f.h.saveState();assert.equal(f.state.get('setup').workerTunnels[0].gpuMaxConcurrentCards,3);
});
test('two Worker saves cannot overwrite one another after asynchronous session loading',async()=>{
 const f=fixture();let release,entered=0;const gate=new Promise(resolve=>release=resolve);
 f.h.ensureXshellSessionLoaded=async()=>{if(++entered===1)await gate;};
 const a=f.h.saveWorkerConfigFromUi({endpointId:'a',patch:{gpuMaxConcurrentCards:2}}),b=f.h.saveWorkerConfigFromUi({endpointId:'b',patch:{gpuMaxConcurrentCards:3}});
 try{await new Promise(setImmediate);assert.equal(entered,1,'save intents must serialize before reading the current Worker array');}
 finally{release();await Promise.all([a,b]);}
 assert.deepEqual(f.reload().workerTunnels.map(w=>w.gpuMaxConcurrentCards),[2,3]);
});
test('a failed Worker save does not block the next queued save or replace another server quota',async()=>{
 const f=fixture();let calls=0;f.h.ensureXshellSessionLoaded=async()=>{if(++calls===1)throw Error('session unreadable');};
 const a=f.h.saveWorkerConfigFromUi({endpointId:'a',patch:{gpuMaxConcurrentCards:2}}),b=f.h.saveWorkerConfigFromUi({endpointId:'b',patch:{gpuMaxConcurrentCards:0}});
 await assert.rejects(a,/session unreadable/);await b;
 assert.deepEqual(f.reload().workerTunnels.map(w=>w.gpuMaxConcurrentCards),[1,0]);assert.equal(f.h.workerConfigSavePromise,undefined);
});

test('saving another Worker setting preserves Conda inheritance in memory, storage and fresh reload',async()=>{
 const f=fixture();f.h.setupConfig.condaEnv='/env/project';
 await f.h.saveWorkerConfigFromUi({endpointId:'a',patch:{gpuMaxConcurrentCards:2}});
 for(const config of [f.h.setupConfig,f.state.get('setup'),f.reload()]){
  assert.equal(config.workerTunnels[0].condaEnv,undefined);
  assert.equal(config.workerTunnels[1].condaEnv,undefined);
 }
});

test('Worker Conda mode distinguishes inheritance, system Python and explicit path without changing blank API semantics',async()=>{
 for(const [patch,expected] of [
  [{condaEnvMode:'inherit',condaEnv:'/env/stale'},undefined],
  [{condaEnvMode:'system',condaEnv:'/env/stale'},''],
  [{condaEnvMode:'path',condaEnv:'/env/chosen/bin/python'},'/env/chosen/bin/python'],
  [{condaEnv:''},''],[{},'/env/old'],
 ]){
  const f=fixture();f.h.setupConfig.workerTunnels[0].condaEnv='/env/old';
  await f.h.saveWorkerConfigFromUi({endpointId:'a',patch});
  for(const config of [f.h.setupConfig,f.state.get('setup'),f.reload()])assert.equal(config.workerTunnels[0].condaEnv,expected);
 }
 for(const patch of [{condaEnvMode:'path'},{condaEnvMode:'path',condaEnv:''},{condaEnvMode:'path',condaEnv:'torch2'},{condaEnvMode:'global'}]){
  const f=fixture();
  await assert.rejects(f.h.saveWorkerConfigFromUi({endpointId:'a',patch}),/路径|condaEnvMode|继承/);
  assert.equal(f.writes.length,0,'invalid mode or path cannot persist a partial save');
 }
});

test('scheduler read defaults and bounds match registered settings while TensorBoard allows project overrides',()=>{
 const f=fixture(),defaults=f.h.schedulerSettings();
 assert.equal(defaults.jitterSeconds,30);assert.equal(defaults.operationEventMaxDelayMs,200);
 f.settings.set('scheduler.jitterSeconds',99999);f.settings.set('scheduler.operationEventMaxDelayMs',99999);
 assert.equal(f.h.schedulerSettings().jitterSeconds,1800);assert.equal(f.h.schedulerSettings().operationEventMaxDelayMs,10000);
 f.settings.set('scheduler.jitterSeconds',0);f.settings.set('scheduler.operationEventMaxDelayMs',50);
 assert.equal(f.h.schedulerSettings().jitterSeconds,0);assert.equal(f.h.schedulerSettings().operationEventMaxDelayMs,100);
 const config=JSON.parse(fs.readFileSync('package.json','utf8')).contributes.configuration.properties;
 assert.equal(config['simpleExperiment.tensorboard.port'].scope,'resource');
 assert.equal(config['simpleExperiment.tensorboard.port'].default,6006);
 assert.equal(config['simpleExperiment.tunnel.remoteTmuxSessionPrefix'].scope,'application');
});

test('scalar scope stays all enabled Workers while native service selection remains explicit and visible',async()=>{
 const f=fixture(),reads=[],native=[];
 f.h.scalarEndpoints=()=>[['a',{}],['b',{}]];f.h.budget={run:async(_key,work)=>work()};
 f.h.scalarJson=async(id)=>{reads.push(id);return {plans:[{server:id}]};};
 f.h.openTensorBoardFromUi=async(message,external)=>native.push({message,external});
 const catalog=await f.h.scalarViewerQuery({action:'catalog'},'a');
 assert.deepEqual(reads,['a','b']);assert.equal(catalog.plans.length,2);
 await f.h.scalarViewerQuery({action:'native.open'},'a');
 assert.equal(native.length,1);assert.equal(native[0].message.endpointId,'a');assert.equal(native[0].external,false);
 const html=require('../../dist/tensorboard/ScalarDashboardHtml').scalarDashboardHtml;
 assert.match(html,/标量范围：本项目全部启用 Worker/);assert.match(html,/原生目标/);
});
