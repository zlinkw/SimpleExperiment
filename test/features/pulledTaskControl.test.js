const test=require('node:test'),assert=require('node:assert/strict');
require('../_helpers/registerTsRequire');
const P=require('../../src/features/PulledTaskControl.ts'),Q=require('../../src/features/DistributedPlanQueue.ts');
const plan={id:'wf',projectId:'p',planFile:'plans/p.yaml',revision:'a',codeFingerprint:'b',jobs:[],enqueuedAt:new Date().toISOString()};
const job={index:0,workerId:'w',commandId:'c',status:'running',outputDir:'work/job',collectionResultCsv:'tmp/result/job.csv',lifecycleProtocol:2};
function snapshot(cancelled,live=false){return {queryComplete:true,capabilities:{taskLifecycle:2},tasks:[{observation:{lifecycleProtocol:2,commandId:'c',projectId:'p',workerId:'w',observedAt:new Date().toISOString(),cancelled,
  ...(live?{tmux:{dead:false,phase:'running'}}:{})}}]};}
test('lost stop response and no pushed events still settle from a fresh native query',async()=>{
  let reads=0,posts=0;
  const client={postWorkerAction(){posts++;return new Promise(()=>{});},async getWorkerTasks(worker,options){
    assert.equal(worker,'w');assert.equal(options.queries[0].commandId,'c');assert.equal(options.executionOnly,true);
    return snapshot(++reads>1,reads===1);}};
  const result=await P.stopPulledTask(client,plan,job,'stop-one');
  assert.equal(result.status,'completed');assert.equal(result.source,'pull');assert.equal(posts,1);assert.equal(reads,2);
});
test('result observations keep full verification while stop verification falls back only on an explicit old endpoint rejection',async()=>{
 let reads=0,posts=0;
 const client={postWorkerAction:async()=>{posts++;},getWorkerTasks:async(_,options)=>{
  reads++;if(options.executionOnly)throw Error('EXECUTION_INVENTORY_SELECTION_INVALID');return snapshot(true);
 }};
 await P.queryTask(client,plan,job);assert.equal(reads,1);
 await P.stopPulledTask(client,plan,job,'original-stop');assert.equal(reads,3);assert.equal(posts,1);
});
test('a failed query ends this round; old protocols and foreign identities never release a job',async()=>{
  await assert.rejects(P.queryTask({getWorkerTasks:()=>new Promise(()=>{})},plan,job,20),/查询超时/);
  await assert.rejects(P.queryTask({getWorkerTasks:async()=>{throw Error('offline');}},plan,job),/offline/);
  await assert.rejects(P.queryTask({getWorkerTasks:async()=>({capabilities:{}})},plan,job),/PROTOCOL_REQUIRED/);
  await assert.rejects(P.queryTask({getWorkerTasks:async()=>({...snapshot(true),queryComplete:false})},plan,job),/查询未完成/);
  const foreign=snapshot(true);foreign.tasks[0].observation.projectId='other';
  await assert.rejects(P.queryTask({getWorkerTasks:async()=>foreign},plan,job),/commandId/);
});
test('return to local scheduling does not download files or increment an attempt; disk stores intent only',()=>{
  const next=P.returnPulledJobToLocal({schemaVersion:1,plans:[{...plan,resultPathPolicy:'declared',jobs:[{...job,executionState:'running',resultState:'unverified'}]}]},'wf',0,'c');
  assert.equal(next.plans[0].jobs[0].workerId,undefined);assert.equal(next.plans[0].jobs[0].commandId,undefined);
  assert.equal(next.plans[0].jobs[0].status,'pending');assert.equal(next.plans[0].jobs[0].outputDir,'work/job');
  const disk=JSON.parse(Q.serializeDistributedQueue({schemaVersion:1,plans:[{...plan,resultPathPolicy:'declared',jobs:[{...job,executionState:'running',error:'old'}]}]}));
  assert.equal(disk.plans[0].jobs[0].status,'unknown');assert.equal(disk.plans[0].jobs[0].executionState,undefined);
  assert.equal(disk.plans[0].jobs[0].error,undefined);
});

test('explicit native rerun gets one new command even when allocated back to the same Worker and GPU',()=>{
  let queue=Q.enqueuePlan(Q.emptyDistributedQueue(),{projectId:'p',planFile:'plans/p.yaml',revision:'r',codeFingerprint:'code',executionMode:'train_test',
    jobs:[{index:0,case:'a',seed:42,outputDir:'work/a',collectionResultCsv:'tmp/a.csv'}]},'wf');
  const worker={workerId:'w',online:true,declaredJobPaths:true,codeFingerprint:'code',idleGpuIds:['0']};
  queue=Q.allocateAvailable(queue,[worker]).queue;
  const old=queue.plans[0].jobs[0].commandId;
  Object.assign(queue.plans[0].jobs[0],{status:'unknown',executionState:'missing',tmuxWindowId:'@old',tmuxPane:'%old',logPath:'old.log'});
  const retry=P.returnPulledJobToLocal(queue,'wf',0,old),input=retry.plans[0].jobs[0];
  assert.ok(input.nextCommandId);assert.notEqual(input.nextCommandId,old);
  assert.equal(input.startIntent,undefined);assert.equal(input.tmuxWindowId,undefined);assert.equal(input.logPath,undefined);
  const restored=Q.restoreFormalJobQueue(JSON.parse(Q.serializeDistributedQueue(retry)));
  const next=Q.allocateAvailable(restored,[worker]);
  assert.equal(next.dispatches.length,1);assert.equal(next.dispatches[0].commandId,input.nextCommandId);
  assert.notEqual(next.dispatches[0].commandId,old,'the old Scheduler cancellation fence must not reject the new explicit run');
  assert.equal(input.history.at(-1).commandId,old);assert.equal(input.outputDir,'work/a');
  assert.equal(Q.durableCommandId(restored.plans[0],restored.plans[0].jobs[0],'w','1'),input.nextCommandId,'allocation does not regenerate a saved request identity');
  assert.equal(input.history.at(-1).logPath,'old.log');
  assert.throws(()=>P.returnPulledJobToLocal(next.queue,'wf',0,old),/身份已变化/);
});
