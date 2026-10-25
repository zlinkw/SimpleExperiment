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
test('missing-only confirmation dispatches only its selected subset, including after reload',async()=>{
 const f=fixture();f.ports.review=async()=>[1];const result=await dispatchManualJobs(f.ports,request);
 assert.deepEqual(result.indices,[1]);assert.equal(f.sends,1);assert.equal(f.q.plans[0].jobs[0].retainExistingOutputs,true);
 const Queue=require('../../dist/features/DistributedPlanQueue');const restored=Queue.restoreFormalJobQueue(JSON.parse(Queue.serializeDistributedQueue(f.q)));
 assert.equal(restored.plans[0].jobs[0].status,'cancelled');
});

test('explicit stop-then-dispatch fences uncertain original requests before review or a new launch',async()=>{
 for(const status of ['dispatching','unknown']){
  const f=fixture(),q=await f.ports.load();Object.assign(q.plans[0].jobs[0],{status,workerId:'old',commandId:'old-command'});await f.ports.save(q);
  let release,entered,reviewed=false;
  const stopping=new Promise(resolve=>{entered=resolve;});
  f.ports.stop=async(plan,job)=>{assert.equal(job.commandId,'old-command');assert.equal(job.workerId,'old');entered();await new Promise(resolve=>{release=resolve;});};
  f.ports.review=async()=>{reviewed=true;return true;};
  const pending=dispatchManualJobs(f.ports,{...request,indices:[0],expectedCommands:{0:'old-command'}});
  await stopping;assert.equal(f.sends,0);assert.equal(reviewed,false);assert.equal(f.q.plans[0].jobs[0].commandId,'old-command');
  release();await pending;
  assert.equal(reviewed,true);assert.equal(f.sends,1);assert.notEqual(f.q.plans[0].jobs[0].commandId,'old-command');
 }
});

test('uncertain requests cannot be replaced without explicit stop or when the exact stop is unverified',async()=>{
 const f=fixture(),q=await f.ports.load();Object.assign(q.plans[0].jobs[0],{status:'unknown',workerId:'old',commandId:'old-command'});await f.ports.save(q);
 const selected={...request,indices:[0],expectedCommands:{0:'old-command'}};
 await assert.rejects(dispatchManualJobs(f.ports,{...selected,stopRunning:false}),/尚未核实/);assert.equal(f.sends,0);assert.equal(f.preparations,0);
 f.ports.stop=async()=>{throw Error('ORIGINAL_WORKER_QUERY_FAILED');};
 f.ports.review=async()=>assert.fail('unverified stop cannot proceed to output review');
 await assert.rejects(dispatchManualJobs(f.ports,selected),/ORIGINAL_WORKER_QUERY_FAILED/);
 assert.equal(f.sends,0);assert.equal(f.q.plans[0].jobs[0].commandId,'old-command');assert.equal(f.q.plans[0].jobs[0].manualDispatch,undefined);
});

test('missing original command or server identity cannot authorize a replacement launch',async()=>{
 for(const status of ['dispatching','running','queued','unknown'])for(const missing of ['workerId','commandId']){
  const f=fixture(),q=await f.ports.load();Object.assign(q.plans[0].jobs[0],{status,workerId:'old',commandId:'old-command'});delete q.plans[0].jobs[0][missing];await f.ports.save(q);
  await assert.rejects(dispatchManualJobs(f.ports,{...request,indices:[0],expectedCommands:{0:q.plans[0].jobs[0].commandId||''}}),/身份缺失/);
  assert.equal(f.sends,0);assert.equal(f.stops,0);assert.equal(f.preparations,0);
 }
});

test('block B: unified admission denial rewinds the ready job at save and consumes no POST',async()=>{
 const f=fixture(),q0=await f.ports.load();
 Object.assign(q0.plans[0].jobs[0],{localQueueOnly:true,nextCommandId:'ready-command',
  manualDispatch:{workerId:'worker',gpuId:'0',stage:'ready',origin:'server_queue',batchId:'b1'}});
 await f.ports.save(q0);
 const saveOptions=[];
 f.ports.save=async(value,options)=>{saveOptions.push(options||null);
  // 模拟保存端统一准入：先在调用方队列上原地剥回（与 syncDeniedIntentsInPlace 一致），再落盘并回传回执。
  const job=value.plans[0].jobs.find(j=>j.commandId==='ready-command');
  if(job&&options&&options.dispatchAdmission){Object.assign(job,{status:'pending',workerId:undefined,gpuId:undefined,commandId:undefined,
   runKey:undefined,startIntent:undefined,nextCommandId:'ready-command',manualDispatch:{...job.manualDispatch,stage:'ready'},
   blockReason:'统一派发等待配额：GPU 0 配额已满（1/1）'});
   q=structuredClone(value);
   return {dispatchAdmission:true,intents:1,approved:[],denied:[{planId:'p',jobIndex:0,attempt:0,commandId:'ready-command',
    workerId:'worker',gpuId:'0',manual:true,reason:'服务器 worker:22 GPU 0 的每卡配额已满（1/1）；留在本地队列等待。'}],blockers:[]};}
  q=structuredClone(value);
  return undefined;};
 await dispatchReadyManualJobs(f.ports);
 assert.equal(f.sends,0,'被统一准入拒绝的手动意图绝不 POST');
 assert.ok(saveOptions.some(o=>o&&o.dispatchAdmission===true),'ready→sent 的身份持久化必须经由统一准入保存');
 const job=f.q.plans[0].jobs[0];
 assert.equal(job.status,'pending');assert.equal(job.manualDispatch.stage,'ready');
 assert.equal(job.manualDispatch.gpuId,'0','保留用户所选服务器/GPU');
 assert.equal(job.nextCommandId,'ready-command','同命令重试不换新身份');
 assert.match(job.blockReason,/统一派发等待配额/);
 // 无回执（旧宿主 fake）时行为不变：正常发送。
 const g=fixture(),qg=await g.ports.load();
 Object.assign(qg.plans[0].jobs[0],{localQueueOnly:true,nextCommandId:'plain-command',manualDispatch:{workerId:'worker',gpuId:'0',stage:'ready'}});
 await g.ports.save(qg);
 await dispatchReadyManualJobs(g.ports);
 assert.equal(g.sends,1);
 assert.equal(g.q.plans[0].jobs[0].manualDispatch.stage,'sent');
});
