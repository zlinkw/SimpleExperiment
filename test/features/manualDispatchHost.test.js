const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
function fixture(){
 const picks={showQuickPick:async()=>undefined};
 const file=path.resolve('dist/extension/ManualDispatchHost.js'),loaded=new Module(file,module);loaded.filename=file;loaded.paths=Module._nodeModulePaths(path.dirname(file));
 const requireBase=loaded.require.bind(loaded);loaded.require=id=>id==='vscode'?{window:picks,workspace:{workspaceFolders:[{uri:{fsPath:'project'}}]}}:requireBase(id);loaded._compile(fs.readFileSync(file,'utf8'),file);
 let sync=0,queries=0;const h={client:{getGpu:async()=>({w:[{index:0,utilizationPercent:100,excluded:true}]}),getWorkerTasks:async()=>{queries++;return {capabilities:{taskLifecycle:2}}}},enabledWorkerConfigs:()=>[{id:'w'},{id:'b'}],
  assertExecutionWorkersReady(){},assertExecutionAgentProjectsReady(){},workerActionTargets:()=>[],ensureCodeReadyForRun:async()=>sync++,captureProjectContext:()=>({}),
  manualDispatchInFlight:new Set(),postState(){},tickDistributedQueue(){},loadDistributedQueue:async()=>({plans:[]}),
  lastCodeSyncState:{fingerprint:'hash'},lastWorkerTaskSnapshots:new Map()};
 return {host:new loaded.exports.ManualDispatchHost(h,'project'),h,picks,get sync(){return sync},get queries(){return queries}};
}
test('actual manual Host accepts a busy excluded visible GPU, preserves sync and queries every Worker',async()=>{
 const f=fixture();await f.host.ports().prepare({codeFingerprint:'hash',jobs:[{manualDispatch:{workerId:'w',gpuId:'0',stage:'preparing'}}]});
 assert.equal(f.sync,1);assert.equal(f.queries,2);
});
test('manual selection pauses automatic dispatch before opening pickers and resumes after cancellation',async()=>{
 const f=fixture();f.picks.showQuickPick=async()=>{assert.equal(f.h.manualDispatchInFlight.size,1);return undefined;};
 const result=await f.host.dispatch({workflowId:'p',indices:[0],expectedCommands:{0:''}},true);
 assert.equal(result.status,'cancelled');assert.equal(f.h.manualDispatchInFlight.size,0);
});
test('unknown Worker and invisible GPU fail before sync, stopping or deletion',async()=>{
 const f=fixture();await assert.rejects(f.host.dispatch({confirm:true,workflowId:'p',indices:[0],workerId:'missing',gpuId:'0'}),/未启用|不存在/);
 await assert.rejects(f.host.ports().prepare({jobs:[{manualDispatch:{workerId:'w',gpuId:'99',stage:'preparing'}}]}),/GPU 不可见/);assert.equal(f.sync,0);assert.equal(f.queries,0);
});

test('actual Host cancels an unacknowledged original command and actively verifies the fence before a new placement',async()=>{
 const f=fixture(),events=[];let cancelled=false,sends=0;
 let queue={plans:[{id:'p',projectId:'project-id',planFile:'plans/p.yaml',revision:'revision',codeFingerprint:'hash',executionMode:'train_test',resultPathPolicy:'declared',
  jobs:[{index:0,attempt:0,status:'unknown',workerId:'b',commandId:'original',case:'c',seed:42,outputDir:'work/job',collectionResultCsv:'tmp/job.csv'}]}]};
 f.h.loadDistributedQueue=async()=>structuredClone(queue);f.h.saveDistributedQueue=async(_,next)=>{queue=structuredClone(next);};
 f.h.lastWorkerProbes={w:{status:'ok',capabilities:{endpoints:{manualDispatch:1}}},b:{status:'ok'}};
 f.h.client.postWorkerAction=async(worker,action,payload)=>{
  assert.equal(worker,'b');assert.equal(action,'stop-worker-task');assert.equal(payload.targetCommandId,'original');
  assert.equal(payload.stopBoundary,'local_command');cancelled=true;events.push('cancel');throw Error('stop response lost');
 };
 f.h.client.getWorkerTasks=async(worker,options)=>{
  if(!options?.queries)return {capabilities:{taskLifecycle:2}};
  assert.equal(worker,'b');assert.equal(options.queries[0].commandId,'original');events.push(cancelled?'verified-cancelled':'missing');
  return {queryComplete:true,capabilities:{taskLifecycle:2},tasks:[{observation:{lifecycleProtocol:2,commandId:'original',workerId:'b',projectId:'project-id',cancelled,observedAt:new Date().toISOString()}}]};
 };
 f.host.review=async()=>{assert.equal(cancelled,true);assert.equal(events.at(-1),'verified-cancelled');events.push('review');return true;};
 f.h.sendDistributedJob=async(plan,job,worker,gpu,command)=>{assert.equal(worker,'w');assert.equal(gpu,'0');assert.notEqual(command,'original');assert.equal(events.at(-1),'review');sends++;events.push('send');};
 const result=await f.host.dispatch({confirm:true,workflowId:'p',indices:[0],workerId:'w',gpuId:'0',expectedCommands:{0:'original'},stopRunning:true});
 assert.equal(result.status,'submitted');assert.equal(sends,1);assert.ok(events.indexOf('verified-cancelled')<events.indexOf('review'));
 assert.equal(queue.plans[0].jobs[0].manualDispatch.stage,'sent');
});
