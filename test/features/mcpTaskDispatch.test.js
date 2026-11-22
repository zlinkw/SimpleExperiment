const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
require('../_helpers/registerTsRequire');
const {ProjectGateway}=require('../../src/mcp/ProjectGateway.ts');
const {createProjectAuthorization}=require('../../src/mcp/ProjectAuthorization.ts');
const Queue=require('../../src/features/DistributedPlanQueue.ts');
const root=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'g004-dispatch-'));
const vscode={workspace:{workspaceFolders:[{uri:{fsPath:root}}]},window:{}};
const load=Module._load;let ManualDispatchHost,ServerQueueHost;
try{Module._load=function(id,...args){return id==='vscode'?vscode:load.call(this,id,...args)};
 ({ManualDispatchHost}=require('../../src/extension/ManualDispatchHost.ts'));({ServerQueueHost}=require('../../src/extension/ServerQueueHost.ts'));
}finally{Module._load=load}
const worker={id:'w',host:'host',port:22,user:'user',projectRoot:'/project',gpuQuotaConfigured:true,gpuJobsPerCard:1};
function fixture(){
 let queue=Queue.enqueuePlan(Queue.emptyDistributedQueue(),{projectId:root,executionMode:'train_test',schedulingMode:'server_prequeue',planFile:'plans/p.yaml',revision:'r',codeFingerprint:'code',jobs:[0,1].map(index=>({index,case:'case',seed:index,outputDir:'work/'+index}))},'p');
 const context={root},sent=[],h={client:{getGpu:async()=>({w:[{index:0,memoryTotalMb:100*1024,memoryUsedMb:0}]})},manualDispatchInFlight:new Set(),distributedPlanStopEpoch:0,
  captureProjectContext:()=>context,projectContextIsCurrent:c=>c===context,effectiveConnectionMode:()=> 'worker_pool',schedulerSettings:()=>({gpuJobsPerCard:1,gpuMinFreeMemoryGb:22}),
  workerActionTargets:()=>[{id:'w',host:'host',project_dir:'/project'}],enabledWorkerConfigs:()=>[worker],lastWorkerProbes:{w:{status:'ok',capabilities:{endpoints:{manualDispatch:1,gpuQuotaScheduling:1,gpuCardQuotaScheduling:1,gpuCardLimitScheduling:1}}}},
  assertExecutionWorkersReady(){},assertExecutionAgentProjectsReady(){},postState(){},tickDistributedQueue:async()=>{},lastCodeSyncState:{fingerprint:'code'},
  ensureCodeReadyForRun:async()=>{},readWorkerTaskSnapshot:async()=>({queryComplete:true}),loadDistributedQueue:async()=>structuredClone(queue),
  saveDistributedQueue:async(_,value,options)=>{if(options?.mutateLatest){const latest=structuredClone(queue),next=options.mutateLatest(latest);if(next!==latest)queue=next}else queue=structuredClone(value)},
  sendDistributedJob:async(plan,job,selected,gpu,command)=>sent.push({selected,gpu,command,index:job.index})};
 const src=fs.readFileSync(path.resolve('src/extension/legacy.ts'),'utf8');
 const start=src.indexOf('"tasks.dispatch": async (params) => {'),end=src.indexOf('\n            "tasks.analyze":',start);
 assert.ok(start>=0&&end>start);const expression=src.slice(start,end).replace(/^"tasks\.dispatch":\s*/, '').replace(/,\s*$/, '');
 const dispatch=new Function('ManualDispatchHost','ServerQueueHost','workspaceRoot','confirmationRequired','host',`return (function(){ return (${expression}); }).call(host)`)(ManualDispatchHost,ServerQueueHost,()=>root,()=>Error('confirmation required'),h);
 let grant=createProjectAuthorization(root);grant.workers=[{id:'w',host:'host',port:22,user:'user',projectRoot:'/project'}];
 const gateway=new ProjectGateway({root:()=>root,workers:()=>[grant.workers[0]],store:{get:()=>grant},methods:()=>({'tasks.dispatch':dispatch})});
 return {h,gateway,sent,get queue(){return queue},set queue(value){queue=value},revoke:()=>{grant.permissions=[]},changeTarget:()=>{grant.workers[0]={...grant.workers[0],host:'changed'}}};
}

test('gateway dispatches automatic and explicit GPUs through the actual manual host',async()=>{
 const old=ManualDispatchHost.prototype.review;ManualDispatchHost.prototype.review=async()=>true;
 try{
  const f=fixture();let result=await f.gateway.call('task_dispatch',{workflowId:'p',indices:[0],workerId:'w',gpuSelection:'automatic',expectedCommands:{0:''}});
  assert.equal(result.status,'submitted');assert.equal(f.queue.plans[0].jobs[0].automaticWorkerId,'w');assert.equal(f.sent.length,0);
  const g=fixture();result=await g.gateway.call('task_dispatch',{workflowId:'p',indices:[0],workerId:'w',gpuId:'0',stopRunning:false});
  assert.equal(result.status,'submitted');assert.equal(g.sent.length,1);assert.equal(g.sent[0].gpu,'0');
 }finally{ManualDispatchHost.prototype.review=old}
});

test('gateway quota scope reaches actual queue host and checks all Worker grants',async()=>{
 const old=ManualDispatchHost.prototype.review;ManualDispatchHost.prototype.review=async()=>true;
 try{
  for(const scope of [{workflowId:'p'},{workflowIds:['p']},{all:true}]){
   const f=fixture();const result=await f.gateway.call('task_dispatch',{distribution:'quota_remaining',...scope});
   assert.equal(result.status,'submitted');assert.deepEqual(f.sent.map(row=>row.index),[0,1]);
  }
  const f=fixture();f.revoke();await assert.rejects(f.gateway.call('task_dispatch',{distribution:'quota_remaining',all:true}),/AUTHORIZATION_REQUIRED/);assert.equal(f.sent.length,0);
  const second={id:'other',host:'other',port:22,user:'user',projectRoot:'/other'},grant=createProjectAuthorization(root);
  grant.workers=[{id:'w',host:'host',port:22,user:'user',projectRoot:'/project'}];let calls=0;
  const gateway=new ProjectGateway({root:()=>root,workers:()=>[worker,second],store:{get:()=>grant},methods:()=>({'tasks.dispatch':async()=>{calls++}})});
  await assert.rejects(gateway.call('task_dispatch',{distribution:'quota_remaining',all:true}),/WORKER_NOT_AUTHORIZED/);assert.equal(calls,0);
 }finally{ManualDispatchHost.prototype.review=old}
});

test('stop-then-dispatch requires the exact original command and explicit intent',async()=>{
 const oldReview=ManualDispatchHost.prototype.review,oldPorts=ManualDispatchHost.prototype.ports,events=[];
 ManualDispatchHost.prototype.review=async()=>{events.push('review');return true};
 ManualDispatchHost.prototype.ports=function(){const ports=oldPorts.call(this);ports.stop=async(_plan,job)=>{events.push('stop:'+job.commandId+':'+job.workerId)};return ports};
 try{
  const f=fixture(),q=f.queue;Object.assign(q.plans[0].jobs[0],{status:'running',commandId:'original',workerId:'w'});f.queue=q;
  const base={workflowId:'p',indices:[0],workerId:'w',gpuId:'0'};
  await assert.rejects(f.gateway.call('task_dispatch',{...base,expectedCommands:{0:'wrong'},stopRunning:true}),/任务已变化/);
  await assert.rejects(f.gateway.call('task_dispatch',{...base,expectedCommands:{0:'original'}}),/停止后派发/);
  assert.deepEqual(events,[]);assert.equal(f.sent.length,0);
  const result=await f.gateway.call('task_dispatch',{...base,expectedCommands:{0:'original'},stopRunning:true});
  assert.equal(result.status,'submitted');assert.deepEqual(events,['stop:original:w','review']);assert.equal(f.sent.length,1);
 }finally{ManualDispatchHost.prototype.review=oldReview;ManualDispatchHost.prototype.ports=oldPorts}
});

test('grant or target changes during review stop manual and quota submission',async()=>{
 const old=ManualDispatchHost.prototype.review;
 try{
  for(const args of [{workflowId:'p',indices:[0],workerId:'w',gpuId:'0'},{distribution:'quota_remaining',all:true}])for(const mode of ['revoke','target']){
   const f=fixture();ManualDispatchHost.prototype.review=async()=>{if(mode==='revoke')f.revoke();else f.changeTarget();return true};
   await assert.rejects(f.gateway.call('task_dispatch',args),/AUTHORIZATION_REQUIRED|WORKER_TARGET_CHANGED/);
   assert.equal(f.sent.length,0);assert.equal(f.h.manualDispatchInFlight.size,0);
   assert.ok(f.queue.plans[0].jobs.every(job=>!job.manualDispatch));
  }
 }finally{ManualDispatchHost.prototype.review=old}
});

test('gateway rejects ambiguous scope and malformed dispatch before host side effects',async()=>{
 const f=fixture(),bad=[
  {},{workflowId:'p',indices:[],workerId:'w',gpuId:'0'},{workflowId:'p',indices:[-1],workerId:'w',gpuId:'0'},
  {workflowId:'p',indices:[0],workerId:'w',gpuSelection:'automatic',gpuId:'0'},
  {workflowId:'p',indices:[0],workerId:'w',gpuSelection:'automatic',expectedCommands:{0:42}},
  {distribution:'quota_remaining'},{distribution:'quota_remaining',all:true,workflowId:'p'},
  {distribution:'quota_remaining',workflowIds:[]},{distribution:'quota_remaining',all:true,workerId:'w'},
 ];
 for(const args of bad)await assert.rejects(f.gateway.call('task_dispatch',args),/INVALID|required|integer/);
 assert.equal(f.sent.length,0);
});
