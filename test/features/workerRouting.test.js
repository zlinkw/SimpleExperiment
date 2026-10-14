const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const source=fs.readFileSync('src/extension/legacy.ts','utf8'),ast=ts.createSourceFile('host.ts',source,ts.ScriptTarget.Latest,true);
const cls=ast.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='RealtimeTunnelPanelProvider');
function host(names,globals={}){const code='class Host{'+cls.members.filter(n=>names.includes(n.name?.getText(ast))).map(n=>n.getText(ast)).join('\n')+'};Host;';
 return new(vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,globals))();}
test('actual preflight synchronizes every Worker and never consults the old Hub target',async()=>{
 const h=host(['ensureWorkerCodeReadyForPlanCheck']);let sync;
 Object.assign(h,{prepareSftpTargets:async()=>{},assertPlanTopologyReady:()=>({mode:'worker_pool'}),planSchedulerWorkerId:()=> 'b',
  workerCodeSyncTargets:()=>[{id:'a'},{id:'b'}],syncCodeTargets:async targets=>{sync=targets;return targets},stampWorkerPoolManualTarget(){throw Error('unexpected fallback')},hubCodeSyncTarget(){throw Error('Hub contacted')}});
 await h.ensureWorkerCodeReadyForPlanCheck({});assert.deepEqual(Array.from(sync,x=>x.id),['b','a']);
});
test('retired Hub API requests reject but saved Hub modes migrate to the Worker inventory',()=>{
 const h=host(['apiPrepareTopology','apiTopologyAssessmentForConfig'],{TopologyMode_1:require('../../dist/features/TopologyMode'),topologyModeLabel:()=> 'Worker 模式'});
 h.setupConfig={workerTunnels:[{id:'a',enabled:true}],savedSessionPath:'old',agentProjectDir:'/old'};
 assert.throws(()=>h.apiPrepareTopology('hub_worker',[]),/HUB_REMOVED/);assert.throws(()=>h.apiPrepareTopology('', ['hub']),/HUB_REMOVED/);
 assert.equal(h.apiPrepareTopology('',[]).mode,'worker_pool');assert.equal(h.apiTopologyAssessmentForConfig('single_worker').mode,'worker_pool');
});
test('shared Agent defaults save both selected values without changing Worker connections or validating Conda',async()=>{
 const h=host(['saveAgentDefaultsFromUi'],{recordField:(m,k)=>m[k],normalizeCondaEnvSetting:value=>String(value||'').trim()});let patch;
 h.setupConfig={remoteTmuxSessionPrefix:'old',condaEnv:'/old/env',workerTunnels:[{id:'a'}]};h.applySetupDraft=async p=>patch=p;
 await h.saveAgentDefaultsFromUi({patch:{remoteTmuxSessionPrefix:'chosen',condaEnv:'/user/chosen environment'}});
 assert.equal(patch.remoteTmuxSessionPrefix,'chosen');assert.equal(patch.condaEnv,'/user/chosen environment');assert.ok(!('workerTunnels' in patch));
});
