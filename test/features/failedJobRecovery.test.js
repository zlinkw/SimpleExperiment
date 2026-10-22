const {test}=require('node:test');
const assert=require('node:assert/strict');
require('../_helpers/registerTsRequire');
const Q=require('../../src/features/DistributedPlanQueue.ts'),R=require('../../src/features/FailedJobRecovery.ts');
function fixture(declared=false) {
  const queue={schemaVersion:1,plans:[{id:'workflow',projectId:'project',executionMode:'train',planFile:'plans/p.yaml',revision:'rev',codeFingerprint:'code',
    ...(declared?{resultPathPolicy:'declared'}:{}),jobs:[{index:0,status:'failed',commandId:'original',workerId:'worker',attempt:declared?0:1,
      outputDir:declared?'work_dirs/job':'work_dirs/job/attempts/legacy',error:'original failure'}]}]};
  const context={root:'D:/project'},calls=[];let current=true;
  const forbid=()=>assert.fail('legacy recovery must not query, write, stop or move');
  const host={captureProjectContext:()=>context,projectContextIsCurrent:()=>current,loadDistributedQueue:async()=>structuredClone(queue),
    saveDistributedQueue:forbid,client:{getWorkerTasks:forbid,postWorkerAction:forbid},stopDistributedJob:forbid,
    retryDistributedJobFromUi:async message=>{calls.push(message);return {manualReview:true};}};
  return {queue,host,calls,switchProject:()=>current=false};
}
test('historical failed attempts cannot be recalled, stopped, moved or assigned a new version',async()=>{
  for(const mode of ['train','test','train_test']) {const f=fixture();f.queue.plans[0].executionMode=mode;const before=structuredClone(f.queue);
    await assert.rejects(R.recallFailedJobFromUi(f.host,{planId:'workflow',jobIndex:0},()=>assert.fail('legacy cannot be confirmed'),()=>assert.fail('no new identity')),/HISTORICAL_ATTEMPT_READ_ONLY/);
    assert.deepEqual(f.queue,before);assert.equal(f.calls.length,0);}
});
test('declared-job recall delegates the exact selection to the existing manual retry and cleanup flow',async()=>{
  const f=fixture(true),message={planId:'workflow',jobIndex:0,commandId:'original',outputDir:'work_dirs/job'};const before=structuredClone(f.queue);
  assert.deepEqual(await R.recallFailedJobFromUi(f.host,message,()=>assert.fail('confirmation belongs to existing retry flow'),()=>assert.fail('no speculative identity')),{manualReview:true});
  assert.equal(f.calls.length,1);assert.equal(f.calls[0],message);assert.deepEqual(f.queue,before);
});
test('a changed project cannot delegate or mutate a recall',async()=>{
  const f=fixture(true);f.switchProject();const before=structuredClone(f.queue);
  await assert.rejects(R.recallFailedJobFromUi(f.host,{planId:'workflow'},()=>true,()=>assert.fail()),/context changed/);assert.equal(f.calls.length,0);assert.deepEqual(f.queue,before);
});
test('an unknown workflow cannot target an unrelated failed job',async()=>{
  const f=fixture(true);await assert.rejects(R.recallFailedJobFromUi(f.host,{planId:'foreign'},()=>true,()=>assert.fail()),/context changed/);assert.equal(f.calls.length,0);
});
test('reloaded legacy remote obligations require manual review and never execute in the background',async()=>{
  const f=fixture();f.queue.failedAttemptRecoveries=[{id:'old-recovery',status:'pending',absolutePath:'/srv/project/work_dirs/job/attempts/legacy'}];
  const before=structuredClone(f.queue);for(const delay of [0,30000,600000])assert.deepEqual(await R.processFailedAttemptRecoveries(f.host,'D:/project',()=>assert.fail(),delay),{status:'manual_review_required',automaticExecution:false});
  assert.deepEqual(f.queue,before);assert.equal(f.calls.length,0);
});
test('late original receipts and changed server authorization cannot restart an old cleanup obligation',async()=>{
  for(const status of ['failed','running','completed','unknown']) {const f=fixture();f.queue.plans[0].jobs[0].status=status;
    f.queue.failedAttemptRecoveries=[{status:'pending',serverIdentity:'changed-server',job:{commandId:'original'}}];const before=structuredClone(f.queue);
    assert.equal((await R.processFailedAttemptRecoveries(f.host,'D:/project',()=>assert.fail())).automaticExecution,false);assert.deepEqual(f.queue,before);}
});
