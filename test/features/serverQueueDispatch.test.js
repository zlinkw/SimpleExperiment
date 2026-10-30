const test=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module');
require('../_helpers/registerTsRequire');
const {serverQueueCards,quotaQueuePlacements,remainingQueueJobs}=require('../../src/features/ServerQueueDispatch.ts');
const Policy=require('../../src/features/DistributedSchedulingPolicy.ts'),Queue=require('../../src/features/DistributedPlanQueue.ts'),Quota=require('../../src/features/GpuQuotaScheduling.ts');
const vscode={workspace:{workspaceFolders:[{uri:{fsPath:'project'}}]}};
const load=Module._load;let ServerQueueHost,ManualDispatchHost;
try{Module._load=function(id,...args){return id==='vscode'?vscode:load.call(this,id,...args)};
 ({ServerQueueHost}=require('../../src/extension/ServerQueueHost.ts'));({ManualDispatchHost}=require('../../src/extension/ManualDispatchHost.ts'));
}finally{Module._load=load}
const gpu={w:[{index:0,memoryTotalMb:100*1024,memoryUsedMb:0},{index:1,memoryTotalMb:100*1024,memoryUsedMb:0}]};
const workers=[{id:'w',gpuQuotaConfigured:true,gpuJobsPerCard:1,gpuCardOverrides:{'1':{gpuJobsPerCard:6}}}];
function plan(count=21){return Queue.enqueuePlan(Queue.emptyDistributedQueue(),{projectId:'project',executionMode:'train_test',schedulingMode:'server_prequeue',planFile:'plans/p.yaml',revision:'r',codeFingerprint:'code',
 jobs:Array.from({length:count},(_,index)=>({index,case:'case',seed:index,outputDir:'work/'+index}))},'p')}
test('old prequeue plans allocate all seven free quota slots locally and leave remaining work unbound',()=>{
 const initial=plan(),memory=Quota.quotaPlacement(gpu.w,new Map(),Quota.quotaSettings({},workers[0],gpu.w));
 const result=Queue.allocateAvailable(Policy.localSchedulingQueue(initial),[{workerId:'w',online:true,idleGpuAdmission:true,declaredJobPaths:true,codeFingerprint:'code',idleGpuIds:['0','1'],gpuSlots:memory.slots}],{requireIdleGpuAdmission:true,localIdleOnly:true});
 assert.equal(result.dispatches.length,7);assert.equal(result.dispatches.filter(job=>job.gpuId==='0').length,1);assert.equal(result.dispatches.filter(job=>job.gpuId==='1').length,6);
 assert.equal(result.queue.plans[0].jobs.filter(job=>job.status==='pending'&&!job.workerId&&!job.commandId).length,14);
 assert.equal(initial.plans[0].localDispatchOverride,undefined);assert.equal(result.queue.plans[0].localDispatchOverride,true);
});
test('manual server queue ratios follow configured card quotas on the same or different servers, independent of busy/free slots',()=>{
 const cards=serverQueueCards({},workers,{w:gpu.w.map(row=>({...row,memoryUsedMb:99*1024}))});
 for(const count of [7,14,70]){const out=quotaQueuePlacements(count,cards);assert.deepEqual(out.allocations.map(card=>card.count),[count/7,count*6/7]);assert.equal(out.placements.length,count)}
 const remote=serverQueueCards({},[{id:'a',gpuJobsPerCard:1,gpuQuotaConfigured:true},{id:'b',gpuJobsPerCard:6,gpuQuotaConfigured:true}],{a:[{index:0}],b:[{index:0}]});
 assert.deepEqual(quotaQueuePlacements(14,remote).allocations.map(card=>card.count),[2,12]);
 for(let count=1;count<30;count++){const out=quotaQueuePlacements(count,cards);assert.equal(out.allocations.reduce((sum,card)=>sum+card.count,0),count);for(const card of out.allocations)assert.ok(Math.abs(card.count-count*card.weight/7)<1)}
 assert.throws(()=>serverQueueCards({},workers,{w:[]}),/尚未查完/);
 assert.throws(()=>quotaQueuePlacements(1,serverQueueCards({},[{...workers[0],gpuMaxConcurrentCards:0}],gpu)),/配额/);
});
function fixture(count=14){
 let saved=plan(count);const context={root:'project'},sent=[],h={client:{getGpu:async()=>structuredClone(gpu)},manualDispatchInFlight:new Set(),distributedPlanStopEpoch:0,
  captureProjectContext:()=>context,projectContextIsCurrent:c=>c===context&&!h.changed,effectiveConnectionMode:()=> 'worker_pool',schedulerSettings:()=>({gpuJobsPerCard:1,gpuMinFreeMemoryGb:22}),
  workerActionTargets:()=>[{id:'w',host:'host',project_dir:'/project'}],enabledWorkerConfigs:()=>workers,lastWorkerProbes:{w:{status:'ok',capabilities:{endpoints:{manualDispatch:1,gpuQuotaScheduling:1,gpuCardQuotaScheduling:1,gpuCardLimitScheduling:1}}}},
  assertExecutionWorkersReady(){},assertExecutionAgentProjectsReady(){},postState(){},tickDistributedQueue:async()=>{},lastCodeSyncState:{fingerprint:'code'},
  ensureCodeReadyForRun:async()=>{},readWorkerTaskSnapshot:async()=>({queryComplete:true}),loadDistributedQueue:async()=>structuredClone(saved),
  saveDistributedQueue:async(_,value,options)=>{if(options?.mutateLatest){const latest=structuredClone(saved),next=options.mutateLatest(latest);if(next!==latest)saved=next;}else saved=structuredClone(value)},
  sendDistributedJob:async(plan,job,worker,gpu,command)=>{assert.equal(h.manualDispatchInFlight.size,1);sent.push({worker,gpu,command,index:job.index,origin:job.manualDispatch.origin})}};
 return {h,host:new ServerQueueHost(h,'project'),sent,get queue(){return saved},set queue(value){saved=value}};
}
test('the real manual queue host freezes only remaining jobs and sends the exact 1:6 split once; no persistent auto mode is enabled',async()=>{
 const f=fixture(17);Object.assign(f.queue.plans[0].jobs[0],{status:'running',workerId:'w',gpuId:'0',commandId:'running'});
 Object.assign(f.queue.plans[0].jobs[1],{status:'queued',workerId:'w',gpuId:'1',commandId:'already-queued'});f.queue.plans[0].jobs[2].status='completed';
 const old=ManualDispatchHost.prototype.review;ManualDispatchHost.prototype.review=async()=>true;
 try{await assert.rejects(f.host.dispatch({all:true}),/CONFIRM/);await assert.rejects(f.host.dispatch({confirm:true,workflowIds:[]}),/请选择/);
  const result=await f.host.dispatch({all:true},true);assert.equal(result.status,'submitted');assert.equal(f.sent.length,14);
  assert.deepEqual(result.allocations.map(card=>card.count),[2,12]);assert.equal(f.sent.filter(job=>job.gpu==='0').length,2);assert.equal(f.sent.filter(job=>job.gpu==='1').length,12);
  assert.equal(new Set(f.sent.map(job=>job.command)).size,14);assert.ok(f.sent.every(job=>job.origin==='server_queue'));
  assert.equal(f.queue.plans[0].jobs[0].commandId,'running');assert.equal(f.queue.plans[0].jobs[1].commandId,'already-queued');
  assert.equal((await f.host.dispatch({all:true},true)).status,'completed');assert.equal(f.sent.length,14);assert.equal(f.h.manualDispatchInFlight.size,0);
 }finally{ManualDispatchHost.prototype.review=old}
});
test('retaining existing outputs recomputes the actual queued subset back to 1:6',async()=>{
 const f=fixture(14),old=ManualDispatchHost.prototype.review;ManualDispatchHost.prototype.review=async(_,jobs)=>jobs.slice(0,7).map(job=>job.index);
 try{const result=await f.host.dispatch({planId:'p'},true);assert.deepEqual(result.allocations.map(card=>card.count),[1,6]);assert.equal(f.sent.length,7);assert.equal(f.queue.plans[0].jobs.filter(job=>job.retainExistingOutputs).length,7)}finally{ManualDispatchHost.prototype.review=old}
});

test('structured review sends only accepted jobs, persists new isolation blocks and protects completed jobs',async()=>{
 const f=fixture(16),old=ManualDispatchHost.prototype.review;
 Object.assign(f.queue.plans[0].jobs[15],{status:'completed',commandId:'finished',completionState:'verified'});
 ManualDispatchHost.prototype.review=async()=>({accepted:[0,1,2,3,4,5,6,7],blocked:[{index:7,reason:'transfer active',stage:'execute',code:'ACTIVE_TRANSFER',codes:['ACTIVE_TRANSFER'],operationId:'op-1',busyOnly:true}]});
 try{
  const result=await f.host.dispatch({all:true},true);assert.equal(result.status,'submitted');assert.deepEqual(result.allocations.map(c=>c.count),[1,6]);
  assert.deepEqual(f.sent.map(j=>j.index),[0,1,2,3,4,5,6]);
  const reloaded=structuredClone(f.queue),blocked=reloaded.plans[0].jobs[7];
  assert.equal(blocked.status,'pending');assert.equal(blocked.manualDispatch,undefined);assert.equal(blocked.nextCommandId,undefined);
  assert.equal(blocked.retainExistingOutputs,undefined);assert.equal(blocked.outputIsolationBlocked.code,'ACTIVE_TRANSFER');
  assert.equal(blocked.outputIsolationBlocked.operationId,'op-1');assert.equal(blocked.outputIsolationBlocked.declarationKey,blocked.outputDir);
  assert.equal(blocked.outputIsolationBlocked.busyOnly,true);assert.ok(blocked.blockReason);
  assert.equal(reloaded.plans[0].jobs.filter(j=>j.retainExistingOutputs).length,7);
  assert.equal(reloaded.plans[0].jobs[15].commandId,'finished');assert.equal(reloaded.plans[0].jobs[15].completionState,'verified');
 }finally{ManualDispatchHost.prototype.review=old}
});

test('structured all-retained or all-blocked review creates no dispatch identity and reports no submitted jobs',async()=>{
 const old=ManualDispatchHost.prototype.review;
 try{for(const blocked of [false,true]){
  const f=fixture(2);ManualDispatchHost.prototype.review=async()=>({accepted:[],blocked:blocked?[{index:0,stage:'verify',reason:'unknown'},{index:1,stage:'preview',reason:'busy'}]:[]});
  const result=await f.host.dispatch({all:true},true);assert.equal(result.status,blocked?'blocked':'completed');assert.equal(f.sent.length,0);
  assert.ok(f.queue.plans[0].jobs.every(j=>!j.manualDispatch&&!j.commandId&&!j.nextCommandId));
  assert.ok(f.queue.plans[0].jobs.every(j=>blocked?!!j.outputIsolationBlocked:j.retainExistingOutputs===true));
 }}finally{ManualDispatchHost.prototype.review=old}
});
test('unknown GPU data, cancelled review, changed quotas and changed jobs never turn into an enqueue or overwrite progress',async()=>{
 for(const kind of ['gpu','cancel','quota','job']){
  const f=fixture(7),old=ManualDispatchHost.prototype.review;
  if(kind==='gpu')f.h.client.getGpu=async()=>({});
  ManualDispatchHost.prototype.review=async()=>{if(kind==='cancel')return false;if(kind==='quota')f.h.schedulerSettings=()=>({gpuJobsPerCard:2});if(kind==='job')Object.assign(f.queue.plans[0].jobs[0],{status:'running',workerId:'w',commandId:'new-external'});return true};
  try{await assert.rejects(f.host.dispatch({all:true},true));assert.equal(f.sent.length,0);assert.equal(f.h.manualDispatchInFlight.size,0);assert.ok(f.queue.plans[0].jobs.every(job=>!job.manualDispatch));if(kind==='job')assert.equal(f.queue.plans[0].jobs[0].commandId,'new-external')}
  finally{ManualDispatchHost.prototype.review=old}
 }
});
test('a manual queue intent cannot absorb later jobs or unfinished/unknown tasks',()=>{
 const p=plan(8).plans[0];p.jobs[0].status='unknown';p.jobs[1].manualDispatch={workerId:'w',gpuId:'0',stage:'preparing'};
 p.jobs[2].workerId='w';p.jobs[3].stopIntent={commandId:'old',workerId:'w',requestedAt:'now',state:'pending'};
 assert.deepEqual(remainingQueueJobs(p).map(job=>job.index),[4,5,6,7]);
});
// r82（0.5.414）：隔离未完成 job 对服务器队列派发路径不可见、标记不被清除（现场 r81a：四 target 全 pending、
// pendingNodes:[]、物理未移走，却在 16 秒后"预演通过，开启调度"照常入队派发）。413 上红。
test('r82 red: a job with an unresolved isolation block is not a remaining queue job',()=>{
 const p=plan(5).plans[0];
 p.jobs[1].outputIsolationBlocked={reason:'nwpu3：ACTIVE_TRANSFER SimpleSFTP files.cleanup.execute：[ACTIVE_TRANSFER]',stage:'execute',code:'ACTIVE_TRANSFER',declarationKey:'work/1',observedAt:new Date().toISOString()};
 assert.deepEqual(remainingQueueJobs(p).map(job=>job.index),[0,2,3,4]);
});
test('r82 red: the real server-queue dispatch sends zero blocked jobs, resplits only the safe subset and never clears the marker',async()=>{
 const f=fixture(14);
 f.queue.plans[0].jobs[3].outputIsolationBlocked={reason:'nwpu3：ACTIVE_TRANSFER SimpleSFTP files.cleanup.execute：[ACTIVE_TRANSFER]',stage:'execute',code:'ACTIVE_TRANSFER',declarationKey:'work/3',observedAt:new Date().toISOString()};
 const old=ManualDispatchHost.prototype.review;ManualDispatchHost.prototype.review=async()=>true;
 try{const result=await f.host.dispatch({all:true},true);
  assert.equal(result.status,'submitted');assert.equal(f.sent.length,13,'14 个剩余 job 中隔离暂停 1 个：只有安全准入的 13 个可入服务器队列');
  assert.ok(!f.sent.some(row=>row.index===3),'隔离未完成绝不发送');
  assert.ok(f.queue.plans[0].jobs[3].outputIsolationBlocked,'队列派发不得清除阻断标记');
  assert.equal(f.queue.plans[0].jobs[3].manualDispatch,undefined,'被阻断 job 不得占用手动派发身份');
  assert.equal(f.queue.plans[0].jobs.filter(job=>job.manualDispatch).length,13);
  assert.equal(result.allocations.reduce((sum,card)=>sum+card.count,0),13,'配额只在准入子集上重算，不把暂停 job 计入');
 }finally{ManualDispatchHost.prototype.review=old}
});

test('rendered queue buttons distinguish one Plan from all remaining jobs without forwarding a GPU choice',()=>{
 const ts=require('typescript'),vm=require('node:vm'),html=require('../../src/ui/PanelHtml.ts').renderPanelHtml();
 const script=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');new vm.Script(script);
 const ast=ts.createSourceFile('panel.js',script,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);let fn;
 function visit(n){if(ts.isFunctionDeclaration(n)&&n.name?.text==='payloadFromButton')fn=n;ts.forEachChild(n,visit)}visit(ast);assert.ok(fn);
 const payload=vm.runInNewContext(fn.getText(ast)+';payloadFromButton',{RESTORABLE_PLAN_FILE_PAYLOAD_COMMANDS:new Set(),ARTIFACT_SCOPE_COMMANDS:new Set(),el:()=>undefined,document:{}});
 const one=payload({dataset:{command:'queueRemainingJobs',planId:'p'}}),all=payload({dataset:{command:'queueRemainingJobs',queueAll:'true'}});
 assert.equal(one.planId,'p');assert.equal(one.all,undefined);assert.equal(all.all,true);assert.equal(all.planId,undefined);
 assert.equal(all.workerId,undefined);assert.equal(one.gpuId,undefined);assert.match(script,/data-queue-all="true"/);
});
