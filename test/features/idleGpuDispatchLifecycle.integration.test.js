const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const ts=require('typescript'),{spawnSync}=require('node:child_process');
require('../_helpers/registerTsRequire');
const root=path.resolve(__dirname,'../..');
const DistributedPlanQueue=require('../../src/features/DistributedPlanQueue.ts');
const DistributedSchedulingPolicy=require('../../src/features/DistributedSchedulingPolicy.ts');
const GpuQuotaScheduling=require('../../src/features/GpuQuotaScheduling.ts');
const GpuJobOwnership=require('../../src/features/GpuJobOwnership.ts');
const PlanExecutionMode=require('../../src/features/PlanExecutionMode.ts');
const PlanCodeScopeHost=require('../../src/extension/PlanCodeScopeHost.ts');
const AgentTmuxPolicy_1=require('../../src/tunnel/AgentTmuxPolicy.ts');
const source=fs.readFileSync(path.join(root,'src/extension/legacy.ts'),'utf8');
const helper=source.match(/^function durableCodeProofRequestFields\([\s\S]*?^\}/m)?.[0];assert.ok(helper);
const durableCodeProofRequestFields=new Function(`${helper}\nreturn durableCodeProofRequestFields;`)();
function provider(names,extra={}) {
  const ast=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true);
  const cls=ast.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='RealtimeTunnelPanelProvider');
  const members=cls.members.filter(n=>names.includes(n.name?.getText(ast)));
  assert.equal(members.length,names.length);
  const code='class Provider {'+members.map(n=>n.getText(ast)).join('\n')+'};Provider;';
  return vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,
    {DistributedPlanQueue,DistributedSchedulingPolicy,GpuQuotaScheduling,GpuJobOwnership,PlanExecutionMode,PlanCodeScopeHost,AgentTmuxPolicy_1,
      durableCodeProofRequestFields,workspaceRoot:()=>root,setInterval,clearInterval,setTimeout,clearTimeout,Map,Set,
      mapLimited:async(rows,_limit,fn)=>Promise.all(rows.map(fn)),errorMessage:e=>e.message,...extra});
}
const capabilities={taskLifecycle:2,durablePlanQueue:true,idleGpuAdmission:true,schemaVersion:1};
const endpoints={declaredJobPaths:true,formalJobIdentityEnv:1,taskShellEnvironment:1,projectManagedValidation:1,gpuQuotaScheduling:1};
function snapshot(workerId,tasks=[]) {const time=new Date().toISOString();return {workerId,capabilities,queryComplete:true,generatedAt:time,fetchedAt:time,tasks};}
function fixture() {
  const Provider=provider(['tickDistributedQueueCore']);const p=new Provider();
  Object.assign(p,{taskLifecycleProtocol:2,distributedQueueGeneration:0,distributedPlanStopEpoch:0,distributedNextFailureDetailAt:Infinity,
    distributedNextPostprocessAt:Infinity,distributedLaunchInFlight:new Set()});
  p.isRealtimeMode=()=>true;p.projectTopologyAssessment=()=>({mode:'worker_pool'});p.workerCodeSyncTargets=()=>[];
  p.workerActionTargets=()=>[{id:'a'},{id:'b'}];p.enabledWorkerConfigs=()=>[{id:'a'},{id:'b'}];
  p.lastWorkerProbes={a:{status:'ok',capabilities:{endpoints}},b:{status:'ok',capabilities:{endpoints}}};
  p.lastCodeSyncState={workerVersions:{a:{fingerprint:'f'},b:{fingerprint:'f'}}};p.schedulerSettings=()=>({});p.gpuOwnerConfig=()=>({});
  const errors=[],calls=[],observed=new Map();let saves=0,posts=0,manifests=0;
  p.recordActionError=e=>errors.push(e);p.postState=()=>posts++;p.scheduleDistributedPostprocess=()=>{};p.queuePlanArtifactSyncStatusCheck=()=>{};
  p.buildDistributedJobCodeManifest=async()=>{manifests++;return {};};
  p.readWorkerTaskSnapshotBatch=async ids=>ids.map(id=>snapshot(id,observed.get(id)||[]));
  p.client={getGpu:async()=>({a:[{index:'0',utilizationPercent:0,memoryTotalMb:24576,memoryUsedMb:7,processes:[]}],
    b:[{index:'0',utilizationPercent:99,memoryTotalMb:24576,memoryUsedMb:5000,processes:[{username:'foreign'}]}]})};
  const input=id=>({projectId:DistributedPlanQueue.canonicalProjectId(root),executionMode:'train',planFile:id+'.yaml',revision:'r',codeFingerprint:'f',
    jobs:[0,1].map(index=>({index,case:'bus',seed:index,outputDir:`runs/${id}/${index}`,collectionResultCsv:`results/${id}-${index}.csv`}))});
  let stored=DistributedPlanQueue.enqueuePlan(DistributedPlanQueue.emptyDistributedQueue(),input('p'),'p');
  p.loadDistributedQueue=async()=>structuredClone(stored);p.saveDistributedQueue=async(_r,value)=>{saves++;stored=structuredClone(value);};
  p.sendDistributedJob=async(plan,job,workerId,gpuId,commandId)=>{
    assert.equal(stored.plans.find(x=>x.id===plan.id).jobs[job.index].commandId,commandId,'persist exact identity before RPC');
    calls.push({plan:plan.id,index:job.index,workerId,gpuId,commandId});return {lifecycleProtocol:2,commandId,status:'accepted'};
  };
  function task(job,status='running',plan=stored.plans[0]) {
    const observation={lifecycleProtocol:2,projectId:plan.projectId,workerId:job.workerId,commandId:job.commandId,observedAt:new Date().toISOString(),result:null,
      tmux:{windowId:'@'+(job.index+1),paneId:'%'+(job.index+1),dead:['failed','completed'].includes(status),
        ...(['failed','completed'].includes(status)?{exitCode:status==='failed'?1:0}:{phase:status==='queued'?'bound':'running'})}};
    if(status==='completed')observation.result={runId:job.commandId,status:'completed',present:true,verified:true,identityMatches:true,artifactsComplete:true,exitCode:0};
    return {...job,lifecycleProtocol:2,workflowId:plan.id,projectId:plan.projectId,experimentIndex:job.index,planFile:plan.planFile,
      planRevision:plan.revision,codeFingerprint:plan.codeFingerprint,planJobCount:plan.planJobCount,status,observation};
  }
  function bind(index=0,status='unknown') {const job=stored.plans[0].jobs[index];Object.assign(job,{status,workerId:'a',gpuId:'0',commandId:'original-'+index,runKey:'original-'+index});return job;}
  function retireOther() {const job=stored.plans[0].jobs[1];Object.assign(job,{status:'cancelled',commandId:'cancelled-1',workerId:'a'});observed.set('a',[{...task(job),observation:{...task(job).observation,tmux:undefined,cancelled:true}}]);}
  return {p,calls,errors,observed,input,task,bind,retireOther,stored:()=>stored,counts:()=>({saves,posts,manifests})};
}

test('actual tick dispatches only the idle Worker and persists identity before RPC',async()=>{
  const f=fixture();await f.p.tickDistributedQueueCore();assert.equal(f.calls.length,1);assert.equal(f.calls[0].workerId,'a');
  assert.equal(f.calls[0].gpuId,'0');assert.equal(f.counts().manifests,1);assert.equal(f.stored().plans[0].jobs[1].workerId,undefined);
  assert.equal(f.stored().plans[0].jobs[0].status,'unknown','acceptance is not execution evidence');
});
test('GPU read starts while task snapshots are still pending',async()=>{
  const f=fixture();let release,started=false;const gate=new Promise(r=>release=r),read=f.p.readWorkerTaskSnapshotBatch;
  f.p.readWorkerTaskSnapshotBatch=async ids=>{await gate;return read(ids);};const gpu=f.p.client.getGpu;
  f.p.client.getGpu=async()=>{started=true;return gpu();};const tick=f.p.tickDistributedQueueCore();
  try{for(let i=0;i<50&&!started;i++)await new Promise(setImmediate);assert.equal(started,true);}finally{release();await tick;}
});
test('saved server_prequeue settings keep new unassigned jobs local',async()=>{
  const f=fixture();f.stored().plans[0].schedulingMode='server_prequeue';await f.p.tickDistributedQueueCore();
  assert.equal(f.calls.length,1);assert.equal(f.calls[0].gpuId,'0');assert.equal(f.stored().plans[0].localDispatchOverride,true);
});
test('a currently observed queued job keeps its original Worker and command',async()=>{
  const f=fixture();const j=f.bind();f.retireOther();f.observed.set('a',[...f.observed.get('a'),f.task(j,'queued')]);
  await f.p.tickDistributedQueueCore();assert.equal(f.calls.length,0);assert.equal(f.stored().plans[0].jobs[0].status,'queued');assert.equal(f.stored().plans[0].jobs[0].commandId,'original-0');
});
test('busy GPU telemetry cannot silently migrate an already dispatched protocol-2 job',async()=>{
  const f=fixture();const j=f.bind();f.retireOther();f.observed.set('a',[...f.observed.get('a'),f.task(j,'queued')]);
  f.p.client.getGpu=async()=>({a:[{index:'0',utilizationPercent:99,memoryTotalMb:24576,memoryUsedMb:5000,processes:[{pid:7}]}],b:[{index:'0',utilizationPercent:0,memoryTotalMb:24576,memoryUsedMb:0,processes:[]}]});
  f.p.client.postWorkerAction=()=>assert.fail('no automatic queued-task release');await f.p.tickDistributedQueueCore();
  assert.equal(f.calls.length,0);assert.equal(f.stored().plans[0].jobs[0].workerId,'a');assert.equal(f.stored().plans[0].jobs[0].commandId,'original-0');
});
test('missing GPU telemetry cannot authorize a release or new dispatch',async()=>{
  const f=fixture();const j=f.bind();f.retireOther();f.observed.set('a',[...f.observed.get('a'),f.task(j,'queued')]);f.p.client.getGpu=async()=>({});
  f.p.client.postWorkerAction=()=>assert.fail('no automatic release');await f.p.tickDistributedQueueCore();assert.equal(f.calls.length,0);
});
test('a remote start observed during polling supersedes queued state without a second command',async()=>{
  const f=fixture();const j=f.bind(0,'queued');f.retireOther();f.observed.set('a',[...f.observed.get('a'),f.task(j,'running')]);
  await f.p.tickDistributedQueueCore();assert.equal(f.stored().plans[0].jobs[0].status,'running');assert.equal(f.calls.length,0);
});
test('four missing-observation ticks retain unknown identity and never replay the command',async()=>{
  const f=fixture();f.bind();f.retireOther();for(let i=0;i<4;i++)await f.p.tickDistributedQueueCore();
  assert.equal(f.calls.length,0);assert.equal(f.stored().plans[0].jobs[0].status,'unknown');assert.equal(f.stored().plans[0].jobs[0].commandId,'original-0');
});
test('snapshot grace preserves real cache age and rejects stale or failed cached ownership',async()=>{
  const P=provider(['readWorkerTaskSnapshotBatch']),p=new P();let release;const slow=new Promise(r=>release=r);p.readWorkerTaskSnapshot=()=>slow;
  const cached=snapshot('a',[{commandId:'verified-command'}]);p.cachedWorkerTaskSnapshot=()=>cached;
  try{const result=await p.readWorkerTaskSnapshotBatch(['a'],{graceMs:0});assert.equal(result[0].refreshPending,true);assert.equal(result[0].fetchedAt,cached.fetchedAt);
    cached.fetchedAt=cached.generatedAt=new Date(Date.now()-21000).toISOString();const expired=await p.readWorkerTaskSnapshotBatch(['a'],{graceMs:0});
    assert.equal(expired[0].pending,true);assert.equal(expired[0].tasks.length,0);assert.equal(DistributedPlanQueue.hasFreshDurableSnapshot(expired[0]),false);
    cached.error='disconnected';const failed=await p.readWorkerTaskSnapshotBatch(['a'],{graceMs:0});assert.equal(failed[0].error,'disconnected');
  }finally{release(snapshot('a'));}
});
test('real nonzero task exit is recorded without an automatic rerun or attempt increment',async()=>{
  const f=fixture();const j=f.bind();f.retireOther();f.observed.set('a',[...f.observed.get('a'),f.task(j,'failed')]);
  await f.p.tickDistributedQueueCore();const failed=f.stored().plans[0].jobs[0];assert.equal(failed.status,'failed');assert.equal(failed.exitCode,1);
  await f.p.tickDistributedQueueCore();assert.equal(f.calls.length,0);assert.equal(f.stored().plans[0].jobs[0].attempt,0);assert.equal(f.stored().plans[0].jobs[0].commandId,'original-0');
});
test('unsent jobs wait for matching Worker code and fresh idle telemetry without becoming failures',async()=>{
  const f=fixture();f.p.lastCodeSyncState.workerVersions.a.fingerprint='other';await f.p.tickDistributedQueueCore();assert.equal(f.calls.length,0);
  assert.ok(f.stored().plans[0].jobs.every(j=>j.status==='pending'));f.p.lastCodeSyncState.workerVersions.a.fingerprint='f';await f.p.tickDistributedQueueCore();assert.equal(f.calls.length,1);
});
test('two source versions can dispatch to independent matching Workers in one tick',async()=>{
  const f=fixture();const next=f.input('next');next.codeFingerprint='other';f.stored().plans.push(DistributedPlanQueue.enqueuePlan(DistributedPlanQueue.emptyDistributedQueue(),next,'next').plans[0]);
  f.p.lastCodeSyncState.workerVersions.b.fingerprint='other';f.p.client.getGpu=async()=>({a:[{index:'0',utilizationPercent:0,memoryTotalMb:24576,memoryUsedMb:0,processes:[]}],b:[{index:'0',utilizationPercent:0,memoryTotalMb:24576,memoryUsedMb:0,processes:[]}]});
  await f.p.tickDistributedQueueCore();assert.deepEqual(f.calls.map(r=>[r.plan,r.workerId]).sort(),[['next','b'],['p','a']]);
});
test('code upload holds new allocation while an existing command still gets terminal observations',async()=>{
  const f=fixture();const j=f.bind();f.observed.set('a',[f.task(j,'completed')]);f.p.codeSyncInFlight=1;
  await f.p.tickDistributedQueueCore();assert.equal(f.stored().plans[0].jobs[0].status,'completed');assert.equal(f.calls.length,0);assert.equal(f.stored().plans[0].jobs[1].status,'pending');
});
test('a stopped generation drains a delayed RPC without committing or publishing its late receipt',async()=>{
  const f=fixture();let release,started=false;const gate=new Promise(r=>release=r),send=f.p.sendDistributedJob;
  f.p.sendDistributedJob=async(...args)=>{const result=await send(...args);started=true;await gate;return result;};const tick=f.p.tickDistributedQueueCore();
  try{for(let i=0;i<50&&!started;i++)await new Promise(setImmediate);assert.equal(started,true);f.p.distributedQueueGeneration++;
    const before=JSON.stringify(f.stored()),counts=f.counts();release();await tick;assert.equal(JSON.stringify(f.stored()),before);assert.equal(f.counts().posts,counts.posts);
  }finally{release();await tick;}
});
test('a failed queue commit drains all dispatched RPCs and retains no launch in flight',async()=>{
  const f=fixture();let release,started=0;const gate=new Promise(r=>release=r),save=f.p.saveDistributedQueue,send=f.p.sendDistributedJob;
  f.p.client.getGpu=async()=>({a:[0,1].map(index=>({index:String(index),utilizationPercent:0,memoryTotalMb:24576,memoryUsedMb:0,processes:[]})),b:[]});
  f.p.sendDistributedJob=async(...args)=>{const result=await send(...args);started++;if(started===1)await gate;return result;};
  f.p.saveDistributedQueue=async(...args)=>{if(started)throw Error('commit failed');return save(...args);};
  const tick=f.p.tickDistributedQueueCore();const rejected=assert.rejects(tick,/commit failed/);
  try{for(let i=0;i<50&&started<2;i++)await new Promise(setImmediate);assert.equal(started,2);assert.ok(f.p.distributedLaunchInFlight.size>0);}finally{release();await rejected;}
  assert.equal(f.p.distributedLaunchInFlight.size,0);
});

test('G1 actual RPC envelope distinguishes local GPU admission from durable hosted prequeue', async () => {
  const Provider=provider(['sendDistributedJob'], {vscode:{workspace:{getConfiguration:()=>({get:(_key,value)=>value})},Uri:{file:value=>value}},
    loadSyncHolds:async()=>[],buildLocalCodeManifest:async()=>({}),filterHeldFiles:manifest=>manifest,fingerprintFromManifest:()=> 'f'});
  const p=new Provider();p.distributedQueueGeneration=0;p.distributedPlanStopEpoch=0;
  p.context={globalStorageUri:{fsPath:'cache'}};p.localCodeManifestCacheFile=()=> 'cache';
  p.workerActionTargets=()=>[{id:'w',condaEnv:'env'}];p.enabledWorkerConfigs=()=>[{id:'w',gpuIdleUtilThreshold:0,gpuMaxConcurrentCards:1,gpuJobsPerCard:2,gpuMinFreeMemoryGb:0}];
  p.schedulerSettings=()=>({gpuIdleUtilThreshold:5,gpuIdleMemThresholdMb:200,workerActionMinIntervalMs:500});
  p.withRemoteActionResource=async(_worker,_action,_request,callback)=>callback();let sent;
  p.client={postWorkerAction:async(_worker,_action,request)=>{sent=request;return {status:'queued'};}};
  const plan={id:'p',projectId:'project',planFile:'p.yaml',revision:'r',codeFingerprint:'f',enqueuedAt:'date',planJobCount:1,schedulingMode:'server_prequeue',executionMode:'train'};
  const job={index:0,case:'bus',seed:42,attempt:0,outputDir:'runs/0',globalJobId:'p:0',collectionResultCsv:'results/0.csv'};
  plan.resultPathPolicy='declared';plan.jobs=[job];
  p.lastWorkerProbes={w:{capabilities:{endpoints:{declaredJobPaths:true,formalJobIdentityEnv:1,taskShellEnvironment:1,projectManagedValidation:1,gpuQuotaScheduling:1,gpuCardLimitScheduling:1}}}};
  await p.sendDistributedJob(plan,job,'w',undefined,'same-command',{});
  assert.equal(sent.schedulingMode,'server_prequeue');assert.equal(sent.requireIdleGpu,false);assert.equal(Object.hasOwn(sent,'gpuId'),false);
  assert.equal(sent.options.maxConcurrentGpus,0);assert.equal(sent.options.gpuJobsPerCard,2);assert.equal(sent.options.gpuMinFreeMemoryGb,0);assert.equal(sent.options.gpuMaxConcurrentCards,1);assert.equal(sent.opId,'same-command',{});
  plan.schedulingMode='local_idle';await p.sendDistributedJob(plan,job,'w','0','new-command',{});
  assert.equal(sent.schedulingMode,'local_idle');assert.equal(sent.requireIdleGpu,true);assert.equal(sent.gpuId,'0');
});
const agentSource=fs.readFileSync(path.join(root,'src/clusterAgentRuntime.legacy.ts'),'utf8');
function definition(name){const start=agentSource.indexOf(`\ndef ${name}(`)+1;assert.ok(start>0,name);
  const end=agentSource.indexOf('\ndef ',start+1);return agentSource.slice(start,end<0?undefined:end);}
function python(script){const file=path.join(os.tmpdir(),`simpleex-lifecycle-${process.pid}-${Date.now()}.py`);fs.writeFileSync(file,script,'utf8');
  try {const run=spawnSync(process.env.PYTHON||'python',['-X','utf8',file],{encoding:'utf8',timeout:10000,windowsHide:true});
    assert.equal(run.status,0,run.stderr||run.error?.message);return JSON.parse(run.stdout.trim());}
  finally { /* Preserve bounded probe. */ }}
test('G2 real Agent idle admission guard rejects a competing process and untrusted telemetry',()=>{
  const result=python(`import json, math\nGPU_IDLE_UTIL_THRESHOLD=5\nGPU_IDLE_MEM_THRESHOLD_MB=200\nDISTRIBUTED_GPU_RESERVATIONS={}\ndef read_json(*args): return {}\ndef active_cleanup_operations(root): return []\ndef formal_job_path_capable(root): return True\ndef path_for(*args): return ''\ndef read_durable_plan_queue(*args): return {'jobs':[]}\ndef gpu_row_id(row): return str(row['gpuId'])\ndef gpu_row_busy(*args,**kwargs): return False\n${definition('_durable_gpu_busy_reason')}\nrow={'gpuId':'0','utilizationPercent':0,'memoryUsedMb':7,'processes':[{'pid':7}]}\nprint(json.dumps([_durable_gpu_busy_reason('', '0', 'c', [row]),_durable_gpu_busy_reason('', '0', 'c', [{'gpuId':'0'}])]))\n`);
  assert.deepEqual(result,['gpu_busy','gpu_busy'],'G2 admission must reject occupied or unknown GPU');
});
test('G3 actual task API syncs exit evidence into durable ledger immediately, with mode and terminal metadata',()=>{
  const fields=agentSource.match(/^DURABLE_PLAN_IDENTITY_FIELDS\s*=\s*\([\s\S]*?^\)/m)[0];
  const result=python(`import json, threading\nSCHEMA_VERSION=1\nWORKER_TASK_SNAPSHOT_LOCK=threading.RLock()\n${fields}\ndef now_iso(): return '2026-09-29T00:00:00Z'\n${['durable_plan_value','durable_plan_identity','durable_plan_same_identity','durable_plan_task_status','sync_durable_plan_task_rows','durable_plan_public_identity','durable_plan_public_task','api_worker_tasks'].map(definition).join('\n')}\nROW={key:'x' for key in DURABLE_PLAN_IDENTITY_FIELDS}\nROW.update({'status':'running','planJobCount':1,'enqueuedAt':now_iso(),'schedulingMode':'server_prequeue','gpuId':''})\nTASK=dict(ROW)\nLEDGER={'jobs':[ROW]}\ndef active_cleanup_operations(root): return []\ndef formal_job_path_capable(root): return True\ndef path_for(*args): return ''\ndef read_json(*args): return {'tasks':[TASK]}\ndef read_durable_plan_queue(*args): return LEDGER\ndef write_durable_plan_queue(root,data): pass\ndef read_runtime_json_cached(*args): return None\ndef reconcile_worker_task_exit_codes(root): TASK.update({'status':'completed','exitCode':0,'finishedAt':now_iso()})\nprint(json.dumps(api_worker_tasks('')['tasks'][0]))\n`);
  assert.equal(result.status,'completed','G3 exit evidence must supersede durable running during same API call');
  assert.equal(result.exitCode,0);assert.ok(result.finishedAt);assert.equal(result.schedulingMode,'server_prequeue');
});
test('G4 automatic postprocess schedules only Worker mirroring and package/lock/runtime versions match',async()=>{
  const Provider=provider(['scheduleDistributedPostprocess']);const p=new Provider();let calls=0;
  p.syncDistributedJobArtifacts=()=>calls++;p.rebuildDistributedResults=()=>calls++;
  p.isRealtimeMode=()=>true;p.projectTopologyAssessment=()=>({mode:'worker_pool'});
  p.captureProjectContext=()=>({root});p.projectContextIsCurrent=()=>true;
  let mirrors=0;p.syncCompletedPlanArtifacts=async()=>mirrors++;p.queuePlanArtifactSyncStatusCheck=()=>{};p.postState=()=>{};
  p.scheduleDistributedPostprocess(root,true);await p.distributedPostprocessPromise;
  assert.equal(mirrors,1);assert.equal(calls,0,'G4 no automatic raw result download or publication');
  const version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
  assert.match(version,/^\d+\.\d+\.\d+$/);assert.equal(JSON.parse(fs.readFileSync(path.join(root,'package-lock.json'),'utf8')).version,version);
  assert.match(fs.readFileSync(path.join(root,'src/runtime/RuntimeManifest.ts'),'utf8'),new RegExp(`CURRENT_RUNTIME_VERSION = "${version.replaceAll('.','\\.')}"`));
});
