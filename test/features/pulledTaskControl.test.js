const test=require('node:test'),assert=require('node:assert/strict');
require('../_helpers/registerTsRequire');
const P=require('../../src/features/PulledTaskControl.ts'),Q=require('../../src/features/DistributedPlanQueue.ts');
const plan={id:'wf',projectId:'p',planFile:'plans/p.yaml',revision:'a',codeFingerprint:'b',jobs:[],enqueuedAt:new Date().toISOString()};
const job={index:0,workerId:'w',commandId:'c',status:'running',outputDir:'work/job',collectionResultCsv:'tmp/result/job.csv',lifecycleProtocol:2};
function snapshot(cancelled,live=false){return {capabilities:{taskLifecycle:2},tasks:[{observation:{lifecycleProtocol:2,commandId:'c',projectId:'p',workerId:'w',observedAt:new Date().toISOString(),cancelled,
  ...(live?{tmux:{dead:false,phase:'running'}}:{})}}]};}
test('lost stop response and no pushed events still settle from a fresh native query',async()=>{
  let reads=0,posts=0;
  const client={postWorkerAction(){posts++;return new Promise(()=>{});},async getWorkerTasks(worker,options){
    assert.equal(worker,'w');assert.equal(options.queries[0].commandId,'c');return snapshot(++reads>1,reads===1);}};
  const result=await P.stopPulledTask(client,plan,job,'stop-one');
  assert.equal(result.status,'completed');assert.equal(result.source,'pull');assert.equal(posts,1);assert.equal(reads,2);
});
test('a failed query ends this round; old protocols and foreign identities never release a job',async()=>{
  await assert.rejects(P.queryTask({getWorkerTasks:()=>new Promise(()=>{})},plan,job,20),/查询超时/);
  await assert.rejects(P.queryTask({getWorkerTasks:async()=>{throw Error('offline');}},plan,job),/offline/);
  await assert.rejects(P.queryTask({getWorkerTasks:async()=>({capabilities:{}})},plan,job),/PROTOCOL_REQUIRED/);
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
