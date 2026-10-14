const test=require('node:test'),assert=require('node:assert/strict');
const {dispatchManualJobs,dispatchReadyManualJobs}=require('../../dist/features/ManualJobDispatch');
function fixture(){let q={plans:[{id:'p',planFile:'experiments/plans/p.yaml',revision:'rev',codeFingerprint:'hash',executionMode:'train_test',resultPathPolicy:'declared',jobs:[0,1].map(index=>({index,attempt:0,status:'pending',case:'case'+index,seed:42,outputDir:'work/job'+index,collectionResultCsv:'tmp/result/'+index+'.csv'}))}]};
 let online=true,allow=true,supported=true,count=0,send=0,stop=0,prepare=0;
 const ports={load:async()=>structuredClone(q),save:async value=>{q=structuredClone(value)},assertCurrent(){},online:()=>online,supports:()=>supported,newCommandId:()=> 'command'+(++count),
  prepare:async()=>{prepare++},stop:async()=>{stop++},review:async()=>allow,send:async()=>{send++;throw Error('response lost')},tick:()=>dispatchReadyManualJobs(ports)};
 return {ports,get q(){return q},get sends(){return send},get stops(){return stop},get preparations(){return prepare},offline:()=>online=false,cancel:()=>allow=false,old:()=>supported=false};}
const request={workflowId:'p',indices:[0,1],workerId:'worker',gpuId:'0',stopRunning:true,expectedCommands:{0:'',1:''}};
test('manual batch places different jobs on the same GPU once; response loss/reload cannot resend',async()=>{
 const f=fixture();await dispatchManualJobs(f.ports,request);assert.equal(f.sends,2);
 assert.ok(f.q.plans[0].jobs.every(j=>j.gpuId==='0'&&j.manualDispatch.stage==='sent'));assert.notEqual(f.q.plans[0].jobs[0].commandId,f.q.plans[0].jobs[1].commandId);
 f.offline();await dispatchReadyManualJobs(f.ports);assert.equal(f.sends,2);assert.ok(f.q.plans[0].jobs.every(j=>j.workerId==='worker'));
 await assert.rejects(dispatchManualJobs(f.ports,request),/已变化|尚未核实/);assert.equal(f.sends,2);
});
test('offline before send returns to automatic queue without sending or preserving a manual reservation',async()=>{
 const f=fixture();f.offline();f.ports.review=async()=>assert.fail('offline unsent jobs must not be trapped by remote file inspection');const r=await dispatchManualJobs(f.ports,request);assert.equal(r.fallbackToAutomatic,true);assert.equal(f.sends,0);assert.equal(f.preparations,0);
 assert.ok(f.q.plans[0].jobs.every(j=>j.status==='pending'&&!j.workerId&&!j.manualDispatch));
});
test('cancelled review stops the batch before any new launch and releases only the local reservation',async()=>{
 const f=fixture();f.cancel();const r=await dispatchManualJobs(f.ports,request);assert.equal(r.status,'cancelled');assert.equal(f.sends,0);assert.ok(f.q.plans[0].jobs.every(j=>!j.manualDispatch));
});
test('old Worker and completed jobs are rejected before stopping or reviewing outputs',async()=>{
 const f=fixture();f.old();await assert.rejects(dispatchManualJobs(f.ports,request),/更新/);assert.equal(f.stops,0);assert.equal(f.preparations,0);
 const q=await f.ports.load();q.plans[0].jobs[0].status='completed';await f.ports.save(q);await assert.rejects(dispatchManualJobs(f.ports,request),/已完成/);
});
test('running job is stopped before output review, then uses original mode and a fresh execution command',async()=>{
 const f=fixture(),q=await f.ports.load();Object.assign(q.plans[0].jobs[0],{status:'running',workerId:'old',commandId:'old-command',executionState:'running'});await f.ports.save(q);
 await dispatchManualJobs(f.ports,{...request,indices:[0],expectedCommands:{0:'old-command'}});assert.equal(f.stops,1);assert.equal(f.sends,1);
 const j=f.q.plans[0].jobs[0];assert.equal(j.actualExecutionMode,'train_test');assert.notEqual(j.commandId,'old-command');assert.equal(j.outputDir,'work/job0');
});
test('real queue serialization retains sent placement and offline notices without replaying either launch',async()=>{
 const Queue=require('../../dist/features/DistributedPlanQueue'),f=fixture();await dispatchManualJobs(f.ports,request);
 await f.ports.save(Queue.restoreFormalJobQueue(JSON.parse(Queue.serializeDistributedQueue(f.q))));
 await dispatchReadyManualJobs(f.ports);assert.equal(f.sends,2);assert.ok(f.q.plans[0].jobs.every(j=>j.manualDispatch.stage==='sent'));
 const offline=fixture();offline.offline();await dispatchManualJobs(offline.ports,request);
 const restored=Queue.restoreFormalJobQueue(JSON.parse(Queue.serializeDistributedQueue(offline.q)));
 assert.match(restored.plans[0].jobs[0].manualDispatchNotice,/自动派发/);
});
test('train, test and train_test keep their declared execution mode and checkpoint source',async()=>{
 for(const mode of ['train','test','train_test']){
  const f=fixture(),q=await f.ports.load();q.plans[0].executionMode=mode;q.plans[0].jobs[0].checkpointSource={path:'checkpoint/frozen.pt',sha256:'a'.repeat(64)};await f.ports.save(q);
  await dispatchManualJobs(f.ports,{...request,indices:[0]});
  assert.equal(f.q.plans[0].jobs[0].actualExecutionMode,mode);assert.equal(f.q.plans[0].jobs[0].checkpointSource.path,'checkpoint/frozen.pt');
 }
});
