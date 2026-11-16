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
test('Worker tunnel configuration saves only on explicit completion',async()=>{
 async function run(actions,entry='configureWorkerTunnels'){
  const writes=[],notices=[],remaining=[...actions];
  const vscode={window:{showQuickPick:async items=>{const action=remaining.shift();return action===null?undefined:items.find(item=>item.action===action)},showInformationMessage:message=>notices.push(message)}};
  const h=host(['configureWorkerTunnels','configureXshellSavedSessions','configureXshellRealtimeTunnel'],{vscode,authMethodLabel:()=> 'auth',promptWorkerTunnel:async current=>current?{...current,displayName:'edited'}:{id:'new',enabled:true}});
  h.setupConfig={workerTunnels:[{id:'existing',enabled:true}]};h.applySetupDraft=async patch=>writes.push(patch);
  await h[entry]();assert.equal(remaining.length,0);return {writes,notices};
 }
 for(const [entry,actions] of [
  ['configureWorkerTunnels',[null]],
  ['configureWorkerTunnels',['add',null]],
  ['configureWorkerTunnels',['worker','edit',null]],
  ['configureWorkerTunnels',['worker','toggle',null]],
  ['configureWorkerTunnels',['worker',null,null]],
  ['configureXshellSavedSessions',[null]],
  ['configureXshellRealtimeTunnel',[null]],
 ]){const result=await run(actions,entry);assert.equal(result.writes.length,0,`${entry} ${actions}`);assert.equal(result.notices.length,0);}
 const result=await run(['add','done']);assert.equal(result.writes.length,1);assert.equal(result.notices.length,1);
 assert.equal(result.writes[0].workerRealtimeMode,'hub_plus_workers');assert.equal(result.writes[0].workerTelemetryMode,'hub_plus_worker_telemetry');
 assert.deepEqual(Array.from(result.writes[0].workerTunnels,w=>w.id),['existing','new']);
 for(const entry of ['configureXshellSavedSessions','configureXshellRealtimeTunnel']){
  const completed=await run(['done'],entry);assert.equal(completed.writes.length,1);assert.equal(completed.notices.length,1);
  assert.deepEqual(Array.from(completed.writes[0].workerTunnels,w=>w.id),['existing']);
 }
});
