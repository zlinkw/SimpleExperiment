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
