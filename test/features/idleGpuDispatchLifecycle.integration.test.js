const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const ts = require('typescript');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname,'../..');
const original = require.extensions['.ts'];
require.extensions['.ts'] = (loaded, filename) => loaded._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'), {
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true},
}).outputText,filename);
const DistributedPlanQueue = require('../../src/features/DistributedPlanQueue.ts');
const DistributedSchedulingPolicy = require('../../src/features/DistributedSchedulingPolicy.ts');
const GpuJobOwnership = require('../../src/features/GpuJobOwnership.ts');
const PlanExecutionMode = require('../../src/features/PlanExecutionMode.ts');
require.extensions['.ts'] = original;
const source = fs.readFileSync(path.join(root,'src/extension/legacy.ts'),'utf8');
const proofHelperSource = source.match(/^function durableCodeProofRequestFields\([\s\S]*?^\}/m)?.[0];
assert.ok(proofHelperSource, 'missing production durable code proof request helper');
const durableCodeProofRequestFields = new Function(`${proofHelperSource}\nreturn durableCodeProofRequestFields;`)();
function provider(names, extra={}) {
  const ast=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true);
  const cls=ast.statements.find(node=>ts.isClassDeclaration(node)&&node.name?.text==='RealtimeTunnelPanelProvider');
  const code='class Provider {'+cls.members.filter(node=>names.includes(node.name?.getText(ast))).map(node=>node.getText(ast)).join('\n')+'}; Provider;';
  return vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,
    {...require('../_helpers/nativeHostScope'),DistributedPlanQueue,DistributedSchedulingPolicy,GpuJobOwnership,PlanExecutionMode,durableCodeProofRequestFields,workspaceRoot:()=>root,setInterval,clearInterval,
      mapLimited:async(rows,_limit,callback)=>Promise.all(rows.map(callback)),errorMessage:error=>error.message,...extra});
}

const endpoints={declaredJobPaths:true,formalJobIdentityEnv:1,taskShellEnvironment:1,projectManagedValidation:1,gpuQuotaScheduling:1};
function gpu(id,free=24){return {index:String(id),memoryTotalMb:32768,memoryFreeMb:free*1024,memoryUsedMb:(32-free)*1024,utilizationPercent:free<22?99:0,processes:[]};}
function nativeFixture(){
  const Provider=provider(['tickDistributedQueueCore']),p=new Provider(),remote={a:[],b:[]},sent=[],errors=[];
  let queue=DistributedPlanQueue.enqueuePlan(DistributedPlanQueue.emptyDistributedQueue(),{projectId:DistributedPlanQueue.canonicalProjectId(root),
    schedulingMode:'local_idle',planFile:'p.yaml',revision:'r',codeFingerprint:'f',executionMode:'train',
    jobs:[0,1].map(index=>({index,case:'bus',seed:index,outputDir:'runs/'+index,collectionResultCsv:'tmp/result/'+index+'.csv'}))},'p');
  let builds=0,gpus={a:[gpu(0)],b:[gpu(0)]};
  Object.assign(p,{taskLifecycleProtocol:2,distributedQueueGeneration:0,distributedPlanStopEpoch:0,distributedNextFailureDetailAt:Infinity,
    distributedNextPostprocessAt:Infinity,distributedLaunchInFlight:new Set(),distributedNextProbeAt:0,lastWorkerProbes:{a:{status:'ok',capabilities:{endpoints}},b:{status:'ok',capabilities:{endpoints}}},
    lastCodeSyncState:{workerVersions:{a:{fingerprint:'f'},b:{fingerprint:'f'}}},workerActionTargets:()=>[{id:'a'},{id:'b'}],workerCodeSyncTargets:()=>[],
    enabledWorkerConfigs:()=>[{id:'a'},{id:'b'}],schedulerSettings:()=>({}),gpuOwnerConfig:()=>({}),isRealtimeMode:()=>true,
    projectTopologyAssessment:()=>({mode:'worker_pool'}),recordActionError:e=>errors.push(e),postState(){},scheduleDistributedPostprocess(){},
    queuePlanArtifactSyncStatusCheck(){},detachStaleDistributedTick(){},buildDistributedJobCodeManifest:async()=>{builds++;return {};},
    loadDistributedQueue:async()=>structuredClone(queue),saveDistributedQueue:async(_root,value)=>{queue=structuredClone(value);},
    client:{getGpu:async()=>gpus,postWorkerAction:async()=>{throw Error('unexpected stop/post');}},
  });
  p.readWorkerTaskSnapshotBatch=async ids=>ids.map(workerId=>({workerId,queryComplete:true,generatedAt:new Date().toISOString(),fetchedAt:new Date().toISOString(),
    capabilities:{taskLifecycle:2,durablePlanQueue:true,idleGpuAdmission:true,schemaVersion:1},tasks:structuredClone(remote[workerId]||[])}));
  const ack=(plan,job,workerId,gpuId,commandId)=>({lifecycleProtocol:2,status:'unknown',commandId});
  p.sendDistributedJob=async(...args)=>{const j=queue.plans.find(x=>x.id===args[0].id).jobs.find(x=>x.index===args[1].index);
    assert.equal(j.commandId,args[4],'identity must persist before RPC');assert.equal(j.workerId,args[2]);
    sent.push({plan:args[0].id,index:args[1].index,worker:args[2],gpu:args[3],commandId:args[4]});return ack(...args);};
  function publish(index,status,planId='p'){
    const plan=queue.plans.find(x=>x.id===planId),j=plan.jobs.find(x=>x.index===index),at=new Date().toISOString();
    assert.ok(j.workerId&&j.commandId);const dead=['failed','completed'].includes(status);
    const observation={lifecycleProtocol:2,commandId:j.commandId,projectId:plan.projectId,workerId:j.workerId,observedAt:at,
      tmux:{dead,phase:dead?'running':status,windowId:'@'+index,paneId:'%'+index,...(dead?{exitCode:status==='failed'?1:0}:{})},
      result:dead?{runId:j.commandId,status,present:true,verified:true,identityMatches:true,artifactsComplete:status==='completed',exitCode:status==='failed'?1:0}:null,
      runtimeDiagnostics:{schemaVersion:1,runId:j.commandId,commandId:j.commandId,state:'clear',count:0,scanComplete:true}};
    const task={commandId:j.commandId,projectId:plan.projectId,workerId:j.workerId,outputDir:j.outputDir,collectionResultCsv:j.collectionResultCsv,
      codeFingerprint:plan.codeFingerprint,observation};
    remote[j.workerId]=[...(remote[j.workerId]||[]).filter(x=>x.commandId!==j.commandId),task];
  }
  function own(index,status){const j=queue.plans[0].jobs[index];Object.assign(j,{status,workerId:'a',gpuId:String(index),commandId:'original-'+index,runKey:'original-'+index});publish(index,status);}
  return {p,sent,errors,ack,publish,own,remote,stored:()=>queue,setGpu:x=>{gpus=x;},builds:()=>builds};
}
function queuedFixture(){const f=nativeFixture();f.own(0,'completed');f.own(1,'queued');return f;}

test('G1 real native tick persists identity and admits only a Worker with current GPU quota evidence',async()=>{
  const f=nativeFixture();f.setGpu({a:[gpu(0)],b:[gpu(0,16)]});
  let gpuStarted=false,release;const gate=new Promise(r=>{release=r;}),read=f.p.readWorkerTaskSnapshotBatch;
  f.p.readWorkerTaskSnapshotBatch=async ids=>{await gate;return read(ids);};
  const get=f.p.client.getGpu;f.p.client.getGpu=async()=>{gpuStarted=true;return get();};
  const tick=f.p.tickDistributedQueueCore();try{for(let i=0;i<20&&!gpuStarted;i++)await new Promise(setImmediate);assert.equal(gpuStarted,true);}
  finally{release();await tick;}
  assert.equal(f.builds(),1);assert.equal(f.sent.length,1);assert.equal(f.sent[0].worker,'a');assert.equal(f.sent[0].gpu,'0');
  assert.equal(f.stored().plans[0].jobs[0].status,'unknown','POST does not prove startup');
  assert.equal(f.stored().plans[0].jobs[1].workerId,undefined);
  const hosted=nativeFixture();hosted.stored().plans[0].schedulingMode='server_prequeue';hosted.setGpu({a:[gpu(0)],b:[gpu(0,16)]});
  await hosted.p.tickDistributedQueueCore();assert.equal(hosted.sent.length,1,'pool admission still uses current quota for historical hosted preferences');
});
test('a native queued command keeps its original allocation over repeated ticks',async()=>{
  const f=queuedFixture(),before=f.stored().plans[0].jobs[1].commandId;for(let i=0;i<4;i++)await f.p.tickDistributedQueueCore();
  assert.equal(f.sent.length,0);assert.equal(f.stored().plans[0].jobs[1].commandId,before);assert.equal(f.stored().plans[0].jobs[1].attempt,0);
});
test('busy owner GPU telemetry never automatically cancels and migrates an accepted native command',async()=>{
  const f=queuedFixture();let stops=0;f.p.client.postWorkerAction=async()=>stops++;f.setGpu({a:[gpu(1,1)],b:[gpu(0)]});
  for(let i=0;i<3;i++)await f.p.tickDistributedQueueCore();
  const job=f.stored().plans[0].jobs[1];assert.equal(stops,0);assert.equal(f.sent.length,0);assert.equal(job.workerId,'a');
  assert.equal(job.commandId,'original-1');assert.equal(job.attempt,0);assert.equal(job.automaticRetry,undefined);
});
test('unknown or missing GPU telemetry cannot authorize a native queued-task release',async()=>{
  for(const a of [[{index:'0'}],[]]){const f=queuedFixture();let stops=0;f.p.client.postWorkerAction=async()=>stops++;
    f.setGpu({a,b:[gpu(0)]});await f.p.tickDistributedQueueCore();assert.equal(stops,0);assert.equal(f.sent.length,0);}
});
test('a fresh Worker start supersedes queued metadata without a second command or release',async()=>{
  const f=queuedFixture();f.publish(1,'running');await f.p.tickDistributedQueueCore();const j=f.stored().plans[0].jobs[1];
  assert.equal(j.status,'running');assert.equal(j.commandId,'original-1');assert.equal(j.attempt,0);
  assert.equal(j.reassignmentWorkerId,undefined);assert.equal(f.sent.length,0);
});
test('unconfirmed native commands remain unknown and never resend the original POST',async()=>{
  const f=nativeFixture();f.own(0,'completed');f.own(1,'running');f.remote.a=[];const command=f.stored().plans[0].jobs[1].commandId;
  for(let i=0;i<4;i++)await f.p.tickDistributedQueueCore();
  assert.equal(f.sent.length,0);assert.equal(f.stored().plans[0].jobs[1].status,'unknown');
  assert.equal(f.stored().plans[0].jobs[1].commandId,command);assert.equal(f.stored().plans[0].jobs[1].attempt,0);
});
test('snapshot grace preserves the age of fresh evidence and rejects expired or failed cache authority',async()=>{
  const Provider=provider(['readWorkerTaskSnapshotBatch'],{setTimeout,clearTimeout}),p=new Provider();let release;
  const slow=new Promise(r=>{release=r;});p.readWorkerTaskSnapshot=()=>slow;
  const at=new Date().toISOString(),cache={workerId:'a',queryComplete:true,generatedAt:at,fetchedAt:at,capabilities:{taskLifecycle:2},tasks:[{commandId:'verified'}]};
  p.cachedWorkerTaskSnapshot=()=>cache;
  try{
    const fresh=await p.readWorkerTaskSnapshotBatch(['a'],{graceMs:0});assert.equal(fresh[0].tasks[0].commandId,'verified');assert.equal(fresh[0].fetchedAt,at);
    cache.fetchedAt=cache.generatedAt=new Date(Date.now()-60000).toISOString();
    const expired=await p.readWorkerTaskSnapshotBatch(['a'],{graceMs:0});assert.equal(expired[0].pending,true);assert.equal(expired[0].tasks.length,0);
    cache.error='offline';const failed=await p.readWorkerTaskSnapshotBatch(['a'],{graceMs:0});
    assert.equal(failed[0].error,'offline');assert.equal(DistributedPlanQueue.hasFreshDurableSnapshot(failed[0]),false);
  }finally{release(cache);}
});
test('partial native failure keeps its completed sibling and never creates an automatic attempt',async()=>{
  const f=nativeFixture();f.own(0,'completed');f.own(1,'failed');
  f.p.localPlanMetadata={plans:[],archivedPlans:[{originalFile:'p.yaml'}]};await f.p.tickDistributedQueueCore();
  f.p.localPlanMetadata.plans=[{planFile:'p.yaml'}];for(let i=0;i<3;i++)await f.p.tickDistributedQueueCore();
  const p=f.stored().plans[0];assert.equal(p.jobs[0].status,'completed');assert.equal(p.jobs[1].status,'failed');
  assert.equal(p.jobs[1].attempt,0);assert.equal(p.jobs[1].automaticRetry,undefined);assert.equal(p.jobs[1].commandId,'original-1');assert.equal(f.sent.length,0);
});
test('GPU or code availability changes cannot silently retry a failed native command',async()=>{
  const f=nativeFixture();f.own(0,'completed');f.own(1,'failed');f.stored().plans[0].jobs[1].error='CUDA out of memory';
  f.p.lastCodeSyncState.workerVersions={a:{fingerprint:'other'},b:{fingerprint:'other'}};await f.p.tickDistributedQueueCore();
  f.p.lastCodeSyncState.workerVersions={a:{fingerprint:'f'},b:{fingerprint:'f'}};f.setGpu({a:[gpu(0,1)],b:[gpu(0,1)]});await f.p.tickDistributedQueueCore();
  f.setGpu({a:[gpu(0)],b:[gpu(0)]});await f.p.tickDistributedQueueCore();
  const j=f.stored().plans[0].jobs[1];assert.equal(j.status,'failed');assert.equal(j.attempt,0);assert.equal(j.automaticRetry,undefined);assert.equal(f.sent.length,0);
});
test('majority native startup failure never changes command generations or automatically dispatches retries',async()=>{
  const f=nativeFixture();f.own(0,'running');f.own(1,'running');await f.p.tickDistributedQueueCore();
  f.publish(0,'failed');f.publish(1,'failed');for(let i=0;i<3;i++)await f.p.tickDistributedQueueCore();
  for(const j of f.stored().plans[0].jobs){assert.equal(j.status,'failed');assert.equal(j.commandId,'original-'+j.index);assert.equal(j.attempt,0);assert.equal(j.automaticRetry,undefined);}
  assert.equal(f.sent.length,0);
});
test('actual send rejects an unsafe historical attempt before any Worker POST',async()=>{
  const f=nativeFixture(),Provider=provider(['sendDistributedJob']),send=new Provider().sendDistributedJob;
  const p=f.stored().plans[0],j=p.jobs[1];Object.assign(j,{attempt:2,outputDir:'runs/1/attempts/old',history:[{status:'failed',commandId:'old'}]});
  let posts=0;f.p.client.postWorkerAction=async()=>posts++;
  await assert.rejects(send.call(f.p,p,j,'a','0','new'),/HISTORICAL_ATTEMPT_READ_ONLY/);
  assert.equal(posts,0);assert.equal(j.attempt,2);assert.equal(j.history.length,1);assert.equal(p.jobs[0].status,'pending');
});
test('two code versions dispatch only to their independently verified Workers under explicit quota',async()=>{
  const f=nativeFixture();f.p.schedulerSettings=()=>({gpuJobsPerCard:2});f.p.lastCodeSyncState.workerVersions.b.fingerprint='g';
  await f.p.saveDistributedQueue(root,DistributedPlanQueue.enqueuePlan(f.stored(),{projectId:DistributedPlanQueue.canonicalProjectId(root),
    schedulingMode:'local_idle',planFile:'next.yaml',revision:'r2',codeFingerprint:'g',executionMode:'train',
    jobs:[0,1].map(index=>({index,case:'pad',seed:index,outputDir:'next/'+index,collectionResultCsv:'tmp/result/next'+index+'.csv'}))},'next'));
  await f.p.tickDistributedQueueCore();
  assert.deepEqual(f.sent.map(x=>({plan:x.plan,worker:x.worker})),[{plan:'p',worker:'a'},{plan:'p',worker:'a'},{plan:'next',worker:'b'},{plan:'next',worker:'b'}]);
  assert.ok(f.stored().plans.every(p=>p.jobs.every(j=>j.status==='unknown')));assert.equal(f.p.distributedLaunchInFlight.size,0);
});
test('code upload holds allocation while native completion is still observed and persisted',async()=>{
  const f=nativeFixture();f.own(0,'running');f.publish(0,'completed');f.p.codeSyncInFlight=1;
  await f.p.tickDistributedQueueCore();assert.equal(f.stored().plans[0].jobs[0].status,'completed');
  assert.equal(f.stored().plans[0].jobs[1].status,'pending');assert.equal(f.stored().plans[0].jobs[1].workerId,undefined);assert.equal(f.sent.length,0);
});
test('receipt commits stay serialized and a failed commit drains outstanding RPCs before rejection',async()=>{
  const f=nativeFixture();let release;const gate=new Promise(r=>{release=r;}),save=f.p.saveDistributedQueue;
  let inflight=0,max=0,commitFailed=false,slowDone=false,calls=0;
  f.p.saveDistributedQueue=async(r,q)=>{inflight++;max=Math.max(max,inflight);try{
    if(q.plans[0].jobs.some(j=>j.status==='unknown')&&!commitFailed){commitFailed=true;throw Error('commit failure');}
    await new Promise(setImmediate);await save(r,q);
  }finally{inflight--;}};
  f.p.sendDistributedJob=async(...args)=>{calls++;if(args[1].index===1){await gate;slowDone=true;}return f.ack(...args);};
  const tick=f.p.tickDistributedQueueCore();let settled=false;const outcome=tick.then(()=>{settled=true;return null;},e=>{settled=true;return e;});
  try{for(let i=0;i<40&&calls<2;i++)await new Promise(setImmediate);assert.equal(calls,2);assert.equal(commitFailed,false,'native ACK is not a per-job runtime fact');assert.equal(settled,false);}
  finally{release();}
  const error=await outcome;assert.match(error.message,/commit failure/);assert.equal(commitFailed,true);assert.equal(slowDone,true);assert.equal(max,1);
});
test('late native receipt after a generation change cannot save or publish the old run',async()=>{
  const f=nativeFixture();let release;const gate=new Promise(r=>{release=r;});let calls=0,posts=0;
  f.p.postState=()=>posts++;f.p.sendDistributedJob=async(...args)=>{calls++;await gate;return f.ack(...args);};
  const tick=f.p.tickDistributedQueueCore();
  try{for(let i=0;i<40&&calls<2;i++)await new Promise(setImmediate);assert.equal(calls,2);f.p.distributedQueueGeneration++;
    const before=JSON.stringify(f.stored());release();await tick;assert.equal(JSON.stringify(f.stored()),before);assert.equal(posts,0);
  }finally{release();await tick;}
});
test('G1 actual native RPC preserves mode, quota and explicit GPU admission while returning only unknown',async()=>{
  const Provider=provider(['sendDistributedJob']),p=new Provider(),F='f'.repeat(64);const sent=[];
  Object.assign(p,{distributedQueueGeneration:0,distributedPlanStopEpoch:0,workerActionTargets:()=>[{id:'w',condaEnv:'env'}],enabledWorkerConfigs:()=>[{id:'w'}],
    schedulerSettings:()=>({}),lastWorkerProbes:{w:{capabilities:{endpoints,actionEndpoints:{'register-code-sync-proof':true}}}},
    lastWorkerTaskSnapshots:new Map([[root+'\u0000w',{capabilities:{taskLifecycle:2}}]]),
    lastCodeSyncState:{workerVersions:{w:{fingerprint:F,manifestDigest:F,codeSyncProofId:'a'.repeat(64)}}},
    client:{postWorkerAction:async(_w,_a,q)=>{sent.push(q);return {status:'queued'};}}});
  const plan={id:'p',projectId:'project',planFile:'p.yaml',revision:'r',codeFingerprint:F,enqueuedAt:'date',planJobCount:1,jobs:[{}],resultPathPolicy:'declared',schedulingMode:'server_prequeue',executionMode:'train'};
  const job={index:0,case:'bus',seed:42,attempt:0,lifecycleProtocol:2,outputDir:'runs/0',collectionResultCsv:'tmp/result/0.csv',globalJobId:'p:0'};
  assert.equal((await p.sendDistributedJob(plan,job,'w',undefined,'same-command')).status,'unknown');
  assert.equal(sent[0].schedulingMode,'server_prequeue');assert.equal(sent[0].requireIdleGpu,false);assert.equal(Object.hasOwn(sent[0],'gpuId'),false);
  assert.equal(sent[0].options.gpuQuotaScheduling,1);assert.equal(sent[0].options.maxConcurrentGpus,0);assert.equal(sent[0].opId,'same-command');
  plan.schedulingMode='local_idle';await p.sendDistributedJob(plan,job,'w','0','new-command');
  assert.equal(sent[1].requireIdleGpu,true);assert.equal(sent[1].gpuId,'0');assert.equal(sent[1].mode,'train');
});
const agentSource=fs.readFileSync(path.join(root,'src/clusterAgentRuntime.legacy.ts'),'utf8');
function definition(name){const start=agentSource.indexOf(`\ndef ${name}(`)+1;assert.ok(start>0,name);
  const end=agentSource.indexOf('\ndef ',start+1);return agentSource.slice(start,end<0?undefined:end);}
function python(script){const file=path.join(os.tmpdir(),`simpleex-lifecycle-${process.pid}-${Date.now()}.py`);fs.writeFileSync(file,script,'utf8');
  try {const run=spawnSync(process.env.PYTHON||'python',['-X','utf8',file],{encoding:'utf8',timeout:10000,windowsHide:true});
    assert.equal(run.status,0,run.stderr||run.error?.message);return JSON.parse(run.stdout.trim());}
  finally {fs.unlinkSync(file);}}
test('G2 real Agent idle admission guard rejects a competing process and untrusted telemetry',()=>{
  const result=python(`import json, math\nGPU_IDLE_UTIL_THRESHOLD=5\nGPU_IDLE_MEM_THRESHOLD_MB=200\nDISTRIBUTED_GPU_RESERVATIONS={}\ndef read_json(*args): return {}\ndef path_for(*args): return ''\ndef read_durable_plan_queue(*args): return {'jobs':[]}\ndef gpu_row_id(row): return str(row['gpuId'])\ndef gpu_row_busy(*args,**kwargs): return False\n${definition('_durable_gpu_busy_reason')}\nrow={'gpuId':'0','utilizationPercent':0,'memoryUsedMb':7,'processes':[{'pid':7}]}\nprint(json.dumps([_durable_gpu_busy_reason('', '0', 'c', [row]),_durable_gpu_busy_reason('', '0', 'c', [{'gpuId':'0'}])]))\n`);
  assert.deepEqual(result,['gpu_busy','gpu_busy'],'G2 admission must reject occupied or unknown GPU');
});
test('G3 actual task API syncs exit evidence into durable ledger immediately, with mode and terminal metadata',()=>{
  const fields=agentSource.match(/^DURABLE_PLAN_IDENTITY_FIELDS\s*=\s*\([\s\S]*?^\)/m)[0];
  const result=python(`import json, threading\nSCHEMA_VERSION=1\nWORKER_TASK_SNAPSHOT_LOCK=threading.RLock()\n${fields}\ndef now_iso(): return '2026-09-29T00:00:00Z'\n${['durable_plan_value','durable_plan_identity','durable_plan_same_identity','durable_plan_public_identity','durable_plan_task_status','sync_durable_plan_task_rows','durable_plan_public_task','api_worker_tasks'].map(definition).join('\n')}\nROW={key:'x' for key in DURABLE_PLAN_IDENTITY_FIELDS}\nROW.update({'status':'running','planJobCount':1,'enqueuedAt':now_iso(),'schedulingMode':'server_prequeue','gpuId':''})\nTASK=dict(ROW)\nLEDGER={'jobs':[ROW]}\ndef path_for(*args): return ''\ndef read_json(*args): return {'tasks':[TASK]}\ndef read_durable_plan_queue(*args): return LEDGER\ndef write_durable_plan_queue(root,data): pass\ndef read_runtime_json_cached(*args): return None\ndef active_cleanup_operations(root): return []\ndef formal_job_path_capable(root): return True\ndef reconcile_worker_task_exit_codes(root): TASK.update({'status':'completed','exitCode':0,'finishedAt':now_iso()})\nprint(json.dumps(api_worker_tasks('')['tasks'][0]))\n`);
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
