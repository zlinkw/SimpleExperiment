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

test('server queue keeps original project and client across save and preparation waits',async()=>{
 const old=ManualDispatchHost.prototype.review;ManualDispatchHost.prototype.review=async()=>true;
 try{for(const stage of ['before-save','after-reserve','after-commit','gpu-client']){
  const f=fixture(2);let posts=0,ticks=0,saves=0;f.h.postState=()=>{posts++;};f.h.tickDistributedQueue=async()=>{ticks++;};
  const save=f.h.saveDistributedQueue;
  f.h.saveDistributedQueue=async(...args)=>{
   const options=args[2];saves++;
   if(stage==='before-save'&&saves===1)f.h.changed=true;
   options.recallAssertCurrent?.();
   await save(...args);
   if(stage==='after-reserve'&&saves===1||stage==='after-commit'&&saves===2)f.h.changed=true;
  };
  if(stage==='gpu-client'){
   const gpuRead=f.h.client.getGpu;let calls=0;
   f.h.client.getGpu=async(...args)=>{const value=await gpuRead(...args);if(++calls===2)f.h.client={getGpu:()=>assert.fail('new client used')};return value;};
  }
  const result=await f.host.dispatch({planId:'p'},true).catch(error=>error);
  if(stage==='after-commit'){assert.equal(result.status,'partial');assert.ok(f.queue.plans[0].jobs.every(j=>j.manualDispatch?.stage==='ready'));}
  else {assert.ok(result instanceof Error);assert.ok(f.queue.plans[0].jobs.every(j=>j.manualDispatch?.stage!=='preparing'));}
  assert.equal(f.sent.length,0);assert.equal(posts,0);assert.equal(ticks,0);
 }
 }finally{ManualDispatchHost.prototype.review=old;}
});

test('manual dispatch ports stop after project or client changes during preparation or save',async()=>{
 for(const stage of ['prepare-client','save-project']){
  const f=fixture(1);let posts=0,prepares=0;f.h.postState=()=>{posts++;};
  f.h.ensureCodeReadyForRun=async()=>{prepares++;};
  if(stage==='prepare-client'){
   f.h.client.getGpu=async()=>{f.h.client={};return structuredClone(gpu);};
   const ports=new ManualDispatchHost(f.h,'project').ports();
   await assert.rejects(ports.prepare({...f.queue.plans[0],jobs:[{manualDispatch:{stage:'preparing',workerId:'w',gpuId:'0'}}]}),/项目、连接/);
   assert.equal(prepares,0);
  }else{
   f.h.saveDistributedQueue=async(_root,_queue,options)=>{options.recallAssertCurrent();f.h.changed=true;};
   const ports=new ManualDispatchHost(f.h,'project').ports();
   await assert.rejects(ports.save(f.queue),/原项目意图/);
   assert.throws(()=>ports.send(f.queue.plans[0],f.queue.plans[0].jobs[0]),/原项目意图/);
   assert.throws(()=>ports.tick(),/原项目意图/);
  }
  assert.equal(posts,0);assert.equal(f.sent.length,0);
 }
 const {PlanRunHost}=require('../../src/extension/PlanRunHost.ts'),old=PlanRunHost.prototype.replace;
 try{
  const f=fixture(1),key='project\0server-queue',oldFlight=f.h.manualDispatchInFlight;
  oldFlight.add(key);f.h.manualDispatchReviewKeys=new Set();f.h.assertPlanSubmissionWorkers=async()=>{};
  let newFlight,newReviews;
  PlanRunHost.prototype.replace=async(_plan,body)=>body.runConfirmationWaitLocal(async()=>{
   f.h.changed=true;newFlight=new Set([key]);newReviews=new Set([key]);f.h.manualDispatchInFlight=newFlight;f.h.manualDispatchReviewKeys=newReviews;return 'choice';
  });
  await assert.rejects(new ManualDispatchHost(f.h,'project').review(f.queue.plans[0],f.queue.plans[0].jobs),/原项目核查/);
  assert.equal(oldFlight.has(key),false);assert.equal(newFlight.has(key),true);assert.equal(newReviews.has(key),true);
 }finally{PlanRunHost.prototype.replace=old;}
 const {dispatchManualJobs}=require('../../src/features/ManualJobDispatch.ts');
 for(const replace of [false,true]){
  let queue=plan(1),current=true,releases=0;
  const ports={load:async()=>structuredClone(queue),assertCurrent:()=>{if(!current)throw Error('context changed');},online:()=>true,supports:()=>true,
   save:async value=>{queue=structuredClone(value);if(replace)queue.plans[0].jobs[0].manualDispatch.batchId='another-batch';current=false;throw Error('context changed');},
   commitReview:async(mutate,release)=>{assert.equal(release,true);releases++;queue=mutate(structuredClone(queue));},
   newCommandId:()=>assert.fail('must not allocate command'),prepare:()=>assert.fail('must not prepare'),
   stop:()=>assert.fail('must not stop'),review:()=>assert.fail('must not review'),send:()=>assert.fail('must not send'),tick:()=>assert.fail('must not tick')};
  await assert.rejects(dispatchManualJobs(ports,{workflowId:'p',indices:[0],workerId:'w',gpuId:'0'}),/context changed/);
  assert.equal(releases,1);assert.equal(queue.plans[0].jobs[0].manualDispatch?.batchId,replace?'another-batch':undefined);
 }
 {
  let queue=plan(1),loads=0,commits=0;
  const ports={load:async()=>{loads++;if(loads===2)queue.plans[0].jobs[0].manualDispatch.batchId='another-batch';return structuredClone(queue);},
   assertCurrent:()=>{},online:()=>true,supports:()=>true,save:async value=>{queue=structuredClone(value);},prepare:async()=>{},
   commitReview:async(mutate,release)=>{assert.equal(release,true);commits++;queue=mutate(structuredClone(queue));},
   newCommandId:()=>assert.fail('must not allocate command'),stop:()=>assert.fail('must not stop'),review:()=>assert.fail('must not review'),
   send:()=>assert.fail('must not send'),tick:()=>assert.fail('must not tick')};
  await assert.rejects(dispatchManualJobs(ports,{workflowId:'p',indices:[0],workerId:'w',gpuId:'0'}),/预约已变化/);
  assert.equal(commits,1);assert.equal(queue.plans[0].jobs[0].manualDispatch.batchId,'another-batch');
 }
 const fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
 const source=fs.readFileSync(require('node:path').resolve(__dirname,'../../src/extension/legacy.ts'),'utf8');
 const tree=ts.createSourceFile('host.ts',source,ts.ScriptTarget.Latest,true);let member;
 function visit(node){if(ts.isMethodDeclaration(node)&&node.name.getText(tree)==='sendDistributedJob')member=node;ts.forEachChild(node,visit);}visit(tree);
 const Host=vm.runInNewContext(ts.transpileModule('class Host{'+member.getText(tree)+'};Host',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{workspaceRoot:()=>'/fixture-a'});
 const host=new Host(),context={root:'/fixture-a'};let current=true,posts=0;
 Object.assign(host,{client:{postWorkerAction:()=>{posts++;}},captureProjectContext:()=>context,projectContextIsCurrent:()=>current,
  unifiedDomainState:()=>({active:true}),assertUnifiedDispatchConsentPersisted:async()=>{current=false;}});
 await assert.rejects(host.sendDistributedJob({},{},'w','0','cmd'),error=>error.dispatchNotSent===true&&/提交已取消或项目已切换/.test(error.message));
 assert.equal(posts,0);
 let prepareMember,versionMember,verifyMember,ensureVersionMember,codeReadyMember;
 function findMore(node){if(ts.isMethodDeclaration(node)&&node.name.getText(tree)==='prepareSftpTargets')prepareMember=node;
  if(ts.isMethodDeclaration(node)&&node.name.getText(tree)==='checkRemoteAgentVersionAndNotify')versionMember=node;
  if(ts.isMethodDeclaration(node)&&node.name.getText(tree)==='verifyDeployedAgentRuntime')verifyMember=node;
  if(ts.isMethodDeclaration(node)&&node.name.getText(tree)==='ensureRemoteAgentVersionConsistent')ensureVersionMember=node;
  if(ts.isMethodDeclaration(node)&&node.name.getText(tree)==='ensureCodeReadyForRun')codeReadyMember=node;ts.forEachChild(node,findMore);}findMore(tree);
 let requests=0;
 const SandboxHost=vm.runInNewContext(ts.transpileModule('class Host{'+prepareMember.getText(tree)+versionMember.getText(tree)+verifyMember.getText(tree)+ensureVersionMember.getText(tree)+codeReadyMember.getText(tree)+'};Host',
  {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{assertSingleProjectWorkspace:()=>{},UiCommandCancelled:Error,
  path:require('node:path'),__dirname:'.',AbortController,fs:{readFile:async()=>{current=false;return 'runtime';}},
  RuntimeManifest_1:{CURRENT_RUNTIME_VERSION:'1'},tunnelHttpOrigin:()=> 'http://fake',setTimeout:()=>({unref(){}}),clearTimeout(){},
  fetch:async()=>{requests++;current=false;return {ok:true,json:async()=>({ok:true,sha256:'hash'})};}});
 const prep=new SandboxHost();let later=0;current=true;
 Object.assign(prep,{client:{},captureProjectContext:()=>context,projectContextIsCurrent:()=>current,
  ensureSimpleSftpReadyForSetup:async()=>{current=false;return true;},ensureSftpManagerCommand:()=>{later++;},
  agentRuntimeUploadTargets:()=>{later++;return [];}});
 await assert.rejects(prep.prepareSftpTargets('run','upload',[],()=>{if(!current)throw Error('context changed');}),/context changed/);
 assert.equal(later,0);current=true;
 const oldPrepare=prep.prepareSftpTargets;prep.prepareSftpTargets=async()=>{prep.client={};};
 await assert.rejects(prep.ensureCodeReadyForRun(context,[]),/项目或连接已变化/);assert.equal(later,0);
 prep.prepareSftpTargets=oldPrepare;
 await assert.rejects(prep.checkRemoteAgentVersionAndNotify(false),/项目或连接已变化/);assert.equal(later,0);
 current=true;prep.agentRuntimeDirs=()=>({installDir:'/fake'});
 await assert.rejects(prep.verifyDeployedAgentRuntime([{label:'w',projectWorkDir:'/fake',localForwardPort:1}],
  {runtimeVersion:'1',files:{'cluster_agent.py':'hash','cluster_scheduler.py':'hash'}},()=>{if(!current)throw Error('context changed');}),/context changed/);
 assert.equal(requests,1);
 let activeContext={root:'/fixture-a'},release,checks=0;
 const pendingVersion=new Promise(resolve=>{release=resolve;});
 prep.captureProjectContext=()=>activeContext;prep.projectContextIsCurrent=value=>value===activeContext;
 prep.checkRemoteAgentVersionAndNotify=()=>++checks===1?pendingVersion:Promise.resolve({fatal:[],warnings:[]});
 const original=prep.ensureRemoteAgentVersionConsistent(),originalResult=original.catch(error=>error);
 activeContext={root:'/fixture-b'};prep.client={};
 await prep.ensureRemoteAgentVersionConsistent();assert.equal(checks,2);release({fatal:[],warnings:[]});
 assert.match((await originalResult).message,/项目或连接已变化/);
 let readMember,refreshMember;
 function findReads(node){if(ts.isMethodDeclaration(node)&&node.name.getText(tree)==='readWorkerTaskSnapshot')readMember=node;
  if(ts.isMethodDeclaration(node)&&node.name.getText(tree)==='refreshWorkerTaskSnapshot')refreshMember=node;ts.forEachChild(node,findReads);}findReads(tree);
 const ReadHost=vm.runInNewContext(ts.transpileModule('class Host{'+readMember.getText(tree)+refreshMember.getText(tree)+'};Host',
  {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{workspaceRoot:()=>'/fixture-a',cleanupDigest:()=>'',WorkerTaskQuery:{workerTaskQueries:()=>[]}});
 const reader=new ReadHost();let readPosts=0;const originalClient={getWorkerTasks:()=>{readPosts++;}};
 Object.assign(reader,{client:originalClient,cachedWorkerTaskSnapshot:()=>undefined,
  loadDistributedQueue:async()=>{reader.client={};return {plans:[]};},readWorkerTaskSnapshot:async()=>{readPosts++;}});
 const stale=await reader.refreshWorkerTaskSnapshot('w','/fixture-a','key',{});
 assert.match(stale.error,/Workspace changed/);assert.equal(readPosts,0);
 const sharedReader=new ReadHost();const aborted={signal:{aborted:true}};
 Object.assign(sharedReader,{client:originalClient,workerTaskRequests:new Map()});
 const shared={client:originalClient,controller:aborted,promise:Promise.resolve().then(()=>{sharedReader.client={};})};
 sharedReader.workerTaskRequests.set('/fixture-a\0w:tasks0',shared);
 await assert.rejects(sharedReader.readWorkerTaskSnapshot('w'),/项目或连接已变化/);
 let submissionMember;
 function findSubmission(node){if(ts.isMethodDeclaration(node)&&node.name.getText(tree)==='assertPlanSubmissionWorkers')submissionMember=node;ts.forEachChild(node,findSubmission);}findSubmission(tree);
 const SubmissionHost=vm.runInNewContext(ts.transpileModule('class Host{'+submissionMember.getText(tree)+'};Host',
  {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{workspaceRoot:()=>'/fixture-a'});
 const submission=new SubmissionHost();let valid=true;
 Object.assign(submission,{taskLifecycleProtocol:2,workerActionTargets:()=>[{id:'w'}],submissionWorkerProbes:async()=>{valid=false;return {};},
  readWorkerTaskSnapshot:()=>{readPosts++;},assertExecutionWorkersReady:()=>assert.fail('stale checks'),assertExecutionCondaEnvReady:()=>assert.fail('stale checks')});
 await assert.rejects(submission.assertPlanSubmissionWorkers({}, {},()=>{if(!valid)throw Error('context changed');}),/context changed/);
 assert.equal(readPosts,0);
});

test('real manual and batch review release the global gate only with job reservations and retain unrelated progress',async()=>{
 const {PlanRunHost}=require('../../src/extension/PlanRunHost.ts'),old=PlanRunHost.prototype.replace;
 try{for(const mode of ['manual','batch'])for(const outcome of ['accepted','cancelled','stopped']){
  const f=fixture(2);f.queue.plans.push({...plan(1).plans[0],id:'other',planFile:'plans/other.yaml'});
  f.h.assertPlanSubmissionWorkers=async()=>{};
  PlanRunHost.prototype.replace=async(_plan,body)=>{
   assert.equal(f.h.manualDispatchInFlight.size,1);
   await body.runConfirmationWaitLocal(async()=>{
    assert.equal(f.h.manualDispatchInFlight.size,0);assert.equal(f.h.manualDispatchReviewKeys.size,1);
    const selected=f.queue.plans[0].jobs.filter(j=>j.manualDispatch?.stage==='preparing');
    assert.equal(selected.length,mode==='manual'?1:2);
    const auto=Queue.allocateAvailable(Policy.localSchedulingQueue(structuredClone(f.queue)),[{workerId:'w',online:true,idleGpuAdmission:true,declaredJobPaths:true,codeFingerprint:'code',idleGpuIds:['0'],gpuSlots:Array(10).fill('0')}],{requireIdleGpuAdmission:true,localIdleOnly:true});
    assert.ok(auto.dispatches.some(j=>j.planId==='other'));
    assert.ok(auto.dispatches.every(j=>!selected.some(reserved=>j.planId==='p'&&j.jobIndex===reserved.index)));
    assert.equal(remainingQueueJobs(f.queue.plans[1]).length,1);
    await assert.rejects(new ServerQueueHost(f.h,'project').dispatch({all:true},true),/审核|正在处理/);
    const unrelated=f.queue.plans[1].jobs[0];Object.assign(unrelated,{status:'completed',commandId:'unrelated-complete',completionState:'verified'});
    if(outcome==='stopped')f.h.distributedPlanStopEpoch++;
    return 'choice';
   });
   assert.equal(f.h.manualDispatchInFlight.size,1);
   if(outcome==='cancelled')throw Object.assign(Error('cancel'),{apiData:{code:'REPLACEMENT_CANCELLED'}});
   body.assignedExperimentIndices=mode==='manual'?[0]:[0,1];
  };
  const work=mode==='manual'?new ManualDispatchHost(f.h,'project').dispatch({confirm:true,workflowId:'p',indices:[0],workerId:'w',gpuId:'0',expectedCommands:{0:''}}):f.host.dispatch({planId:'p'},true);
  if(outcome==='stopped'||outcome==='cancelled'&&mode==='batch')await assert.rejects(work,/停止|变化|取消/);
  else assert.equal((await work).status,outcome==='cancelled'?'cancelled':'submitted');
  assert.equal(f.h.manualDispatchInFlight.size,0);assert.equal(f.h.manualDispatchReviewKeys.size,0);
  assert.equal(f.queue.plans[1].jobs[0].commandId,'unrelated-complete');assert.equal(f.queue.plans[1].jobs[0].completionState,'verified');
  assert.ok(f.queue.plans[0].jobs.every(j=>j.manualDispatch?.stage!=='preparing'));
  assert.equal(f.sent.length,outcome==='accepted'?(mode==='manual'?1:2):0);
 }}finally{PlanRunHost.prototype.replace=old}
});

test('an interrupted batch review can be explicitly reviewed after reload without automatic launch or losing the old reservation on cancellation',async()=>{
 const old=ManualDispatchHost.prototype.review;
 try{for(const cancel of [true,false]){
  const f=fixture(2),prior={workerId:'w',gpuId:'0',stage:'preparing',origin:'server_queue',batchId:'old-window'};
  f.queue.plans[0].jobs[0].manualDispatch=structuredClone(prior);
  ManualDispatchHost.prototype.review=async()=>cancel?false:true;
  assert.equal(remainingQueueJobs(f.queue.plans[0]).length,2);
  if(cancel){await assert.rejects(f.host.dispatch({planId:'p'},true),/取消/);assert.deepEqual(f.queue.plans[0].jobs[0].manualDispatch,prior);assert.equal(f.sent.length,0);}
  else{const result=await f.host.dispatch({planId:'p'},true);assert.equal(result.status,'submitted');assert.equal(f.sent.length,2);assert.ok(f.sent.every(row=>row.command));}
 }}finally{ManualDispatchHost.prototype.review=old}
});
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

test('a later PLAN cancellation or failure cannot erase a previously observed isolation block',async()=>{
 const old=ManualDispatchHost.prototype.review;
 try{for(const outcome of ['cancel','error','quota-change']){
  const f=fixture(2);f.queue.plans.push({...plan(1).plans[0],id:'later',planFile:'plans/later.yaml'});let reviews=0,observedAt;
  ManualDispatchHost.prototype.review=async()=>{
   if(++reviews===1)return {accepted:[1],blocked:[{index:0,reason:'transfer busy',stage:'execute',code:'ACTIVE_TRANSFER',operationId:'first-plan-op',busyOnly:true}]};
   const blocked=f.queue.plans[0].jobs[0];assert.equal(blocked.outputIsolationBlocked.code,'ACTIVE_TRANSFER');observedAt=blocked.outputIsolationBlocked.observedAt;
   if(outcome==='error')throw Error('later review failed');
   if(outcome==='quota-change')f.h.schedulerSettings=()=>({gpuJobsPerCard:2});
   return false;
  };
  await assert.rejects(f.host.dispatch({all:true},true),/取消|failed|变化/);assert.equal(reviews,2);assert.equal(f.sent.length,0);
  const restored=Queue.restoreFormalJobQueue(JSON.parse(Queue.serializeDistributedQueue(f.queue))),blocked=restored.plans[0].jobs[0];
  assert.equal(blocked.outputIsolationBlocked.code,'ACTIVE_TRANSFER');assert.equal(blocked.outputIsolationBlocked.operationId,'first-plan-op');
  assert.equal(blocked.outputIsolationBlocked.observedAt,observedAt);assert.ok(blocked.blockReason);assert.equal(blocked.manualDispatch,undefined);assert.equal(blocked.nextCommandId,undefined);
  const auto=Queue.allocateAvailable(Policy.localSchedulingQueue(restored),[{workerId:'w',online:true,idleGpuAdmission:true,declaredJobPaths:true,codeFingerprint:'code',idleGpuIds:['0'],gpuSlots:['0','0','0']}],{requireIdleGpuAdmission:true,localIdleOnly:true});
  assert.ok(!auto.dispatches.some(row=>row.planId==='p'&&row.jobIndex===0));
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
