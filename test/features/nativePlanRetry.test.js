const test=require('node:test'),assert=require('node:assert/strict');
require('../_helpers/registerTsRequire');
const {preparePlanSafeRetry}=require('../../src/features/PlanSafeRetry.ts'),Q=require('../../src/features/DistributedPlanQueue.ts');
test('large execution inventories do not analyze historical logs, results or source payloads',()=>{
 const path=require('node:path'),{spawnSync}=require('node:child_process');
 const r=spawnSync('python',['-X','utf8',path.join(__dirname,'executionInventory.fixture.py'),path.join(__dirname,'../../src/runtime/TmuxTaskLifecycle.ts'),path.join(__dirname,'../../dist/runtime/cluster_agent.py')],
  {encoding:'utf8',timeout:10000,windowsHide:true});
 assert.equal(r.status,0,r.stderr||r.stdout);assert.deepEqual(JSON.parse(r.stdout),{ok:true,panes:179,tmuxCalls:1});
});
test('window-only requests pass through all client layers with a distinct read identity',async()=>{
 const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
 const extract=file=>{const text=fs.readFileSync(file,'utf8'),tree=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);let method;
  function visit(node){if(ts.isMethodDeclaration(node)&&node.name.getText(tree)==='getWorkerTasks')method=node;ts.forEachChild(node,visit);}visit(tree);
  return vm.runInNewContext(ts.transpileModule('class Host{'+method.getText(tree)+'};Host.prototype.getWorkerTasks;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{URLSearchParams});};
 const http=extract('src/tunnel/TunnelClient.legacy.ts'),realtime=extract('src/tunnel/RealtimeTunnelClient.legacy.ts'),multi=extract('src/tunnel/MultiEndpointRealtimeClient.legacy.ts');
 const requests=[],keys=[],raw={requestJson:(...args)=>{requests.push(args);return Promise.resolve({queryComplete:true});}};
 const client={coalescedRead:(key,options,work)=>{keys.push(key);return work();},http:{getWorkerTasks:options=>http.call(raw,options)}};
 const outer={clients:new Map([['w',{getWorkerTasks:options=>realtime.call(client,options)}]]),endpointById:new Map([['w',{role:'worker'}]])};
 await multi.call(outer,'w',{executionOnly:true,queries:[]});await multi.call(outer,'w',{queries:[]});
 assert.equal(requests[0][0],'/api/worker/tasks/query');assert.equal(requests[0][2].executionOnly,true);
 assert.equal(requests[1][0],'/api/worker/tasks');assert.notEqual(keys[0],keys[1]);
});
const file='plans/selected.yaml',root='D:/fixture',projectId=Q.canonicalProjectId(root);
function fixture(){
 let queue={schemaVersion:1,plans:[{id:'old',planFile:file,revision:'old',jobs:[{index:0,commandId:'old-c',workerId:'w',status:'unknown',outputDir:'work/old',lifecycleProtocol:2}]},
  {id:'other',planFile:'plans/other.yaml',jobs:[{index:0,commandId:'other-c',workerId:'w',status:'running'}]}]};
 const cancelled=new Set(),posts=[],reads=[];
 const host={taskLifecycleProtocol:2,distributedQueueGeneration:0,distributedPlanStopEpoch:0,client:{
  postWorkerAction:async(worker,action,request)=>{posts.push(request);cancelled.add(request.targetCommandId);return new Promise(()=>{});},
  getWorkerTasks:async(worker,options)=>{reads.push(options);if(host.queryError)throw Error('offline');return {queryComplete:true,capabilities:{taskLifecycle:2},tasks:options.queries.length
   ? options.queries.map(query=>({...query,observation:{...query,observedAt:'now',cancelled:cancelled.has(query.commandId)}})) : host.live||[]};}},
  captureProjectContext:()=>({root}),projectContextIsCurrent:()=>!host.changed,workerActionTargets:()=>[{id:'w'}],loadDistributedQueue:async()=>structuredClone(queue),
  saveDistributedQueue:async(_,value,options)=>queue=options.mutateLatest(queue),detachStaleDistributedTick(){},postState(){},
  reconcileStalePlanRunOperations(){assert.fail('old operation state gate ran');},longRunningPlanRunOperations(){assert.fail('old operation history consulted');}};
 return {host,posts,reads,queue:()=>queue};
}
test('native retry fences an absent original command and retires only selected local inputs without a receipt',async()=>{
 const f=fixture();let prompts=0;
 assert.equal(await preparePlanSafeRetry(f.host,file,async()=>{prompts++;return true;},()=>Error('cancelled')),true);
 assert.equal(prompts,0);assert.equal(f.posts.length,1);assert.equal(f.posts[0].projectId,projectId);assert.equal(f.posts[0].targetCommandId,'old-c');
 assert.deepEqual(f.queue().plans.map(row=>row.id),['other']);assert.equal(f.host.distributedPlanStopEpoch,0);
 assert.deepEqual(f.reads[0].queries,[]);assert.equal(f.reads[1].queries[0].commandId,'old-c');
 assert.equal(f.reads[0].executionOnly,true,'submission safety checks need live windows, not every historical result and log');
});
test('real live bindings take precedence over incompatible cached revision and are stopped only after confirmation',async()=>{
 const f=fixture();f.host.live=[{projectId,workerId:'w',commandId:'old-c',workflowId:'old',planFile:file,experimentIndex:0,outputDir:'work/live',planRevision:'new',
  observation:{lifecycleProtocol:2,projectId,workerId:'w',commandId:'old-c',tmux:{windowId:'@1',paneId:'%1',dead:false}}}];
 let confirmed=0;await preparePlanSafeRetry(f.host,file,async text=>{confirmed++;assert.match(text,/窗口：1/);return true;},()=>Error('cancelled'));
 assert.equal(confirmed,1);assert.equal(f.posts[0].outputDir,'work/live');assert.deepEqual(f.queue().plans.map(row=>row.id),['other']);
});
test('cancel, query failure and a foreign project leave inputs and server tasks untouched',async()=>{
 for(const kind of ['cancel','offline','foreign']){
  const f=fixture();if(kind==='offline')f.host.queryError=true;
  else f.host.live=[{projectId:kind==='foreign'?'other-project':projectId,workerId:'w',commandId:'foreign',workflowId:'foreign',planFile:file,experimentIndex:0,outputDir:'work/foreign',
   observation:{lifecycleProtocol:2,projectId:kind==='foreign'?'other-project':projectId,workerId:'w',commandId:'foreign',tmux:{windowId:'@2',dead:false}}}];
  if(kind==='foreign'){await preparePlanSafeRetry(f.host,file,async()=>true,()=>Error('cancelled'));assert.deepEqual(f.posts.map(row=>row.targetCommandId),['old-c']);}
  else {await assert.rejects(preparePlanSafeRetry(f.host,file,async()=>false,()=>Error('cancelled')),kind==='offline'?/offline/:/cancelled/);assert.equal(f.posts.length,0);assert.equal(f.queue().plans.length,2);}
 }
});
