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
require.extensions['.ts'] = original;
const source = fs.readFileSync(path.join(root,'src/extension/legacy.ts'),'utf8');
function provider(names, extra={}) {
  const ast=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true);
  const cls=ast.statements.find(node=>ts.isClassDeclaration(node)&&node.name?.text==='RealtimeTunnelPanelProvider');
  const code='class Provider {'+cls.members.filter(node=>names.includes(node.name?.getText(ast))).map(node=>node.getText(ast)).join('\n')+'}; Provider;';
  return vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,
    {DistributedPlanQueue,DistributedSchedulingPolicy,workspaceRoot:()=>root,setInterval,clearInterval,
      mapLimited:async(rows,_limit,callback)=>Promise.all(rows.map(callback)),errorMessage:error=>error.message,...extra});
}
test('G1 actual host tick only dispatches idle NWPU3, persists identity before RPC, and explicitly hosts opt-in queue',async()=>{
  const Provider=provider(['tickDistributedQueueCore']);const p=new Provider();
  p.distributedQueueGeneration=0;p.distributedPlanStopEpoch=0;p.distributedNextFailureDetailAt=Infinity;
  p.distributedNextPostprocessAt=Infinity;p.distributedLaunchInFlight=new Set();
  p.isRealtimeMode=()=>true;p.projectTopologyAssessment=()=>({mode:'worker_pool'});
  p.workerCodeSyncTargets=()=>[];p.workerActionTargets=()=>[{id:'nwpu3'},{id:'nwpu5'}];
  p.lastWorkerProbes={nwpu3:{status:'ok'},nwpu5:{status:'ok'}};
  p.lastCodeSyncState={workerVersions:{nwpu3:{fingerprint:'f'},nwpu5:{fingerprint:'f'}}};
  p.enabledWorkerConfigs=()=>[{id:'nwpu3',workerUser:'alice'},{id:'nwpu5',workerUser:'alice'}];
  p.schedulerSettings=()=>({gpuIdleUtilThreshold:5,gpuIdleMemThresholdMb:200});p.gpuOwnerConfig=()=>({currentUser:'alice'});
  p.recordActionError=()=>{};p.postState=()=>{};p.scheduleDistributedPostprocess=()=>{};
  p.readWorkerTaskSnapshot=async workerId=>({workerId,generatedAt:new Date().toISOString(),fetchedAt:new Date().toISOString(),
    capabilities:{durablePlanQueue:true,idleGpuAdmission:true,schemaVersion:1},tasks:[]});
  p.client={getGpu:async()=>({nwpu3:[{index:'0',utilizationPercent:0,memoryUsedMb:7,processes:[]}],
    nwpu5:[{index:'0',utilizationPercent:99,memoryUsedMb:5000,processes:[{username:'alice'}]}]})};
  let stored;let calls=[];
  p.loadDistributedQueue=async()=>JSON.parse(JSON.stringify(stored));
  p.saveDistributedQueue=async(_root,value)=>{stored=JSON.parse(JSON.stringify(value));};
  p.sendDistributedJob=async(plan,job,workerId,gpuId,commandId)=>{
    assert.equal(stored.plans[0].jobs.find(row=>row.index===job.index).commandId,commandId,'identity must precede remote write');
    calls.push({workerId,gpuId,commandId});
    return {projectId:plan.projectId,workflowId:plan.id,planRevision:plan.revision,codeFingerprint:plan.codeFingerprint,
      planJobCount:plan.planJobCount,planFile:plan.planFile,experimentIndex:job.index,case:job.case,seed:job.seed,attempt:job.attempt,
      outputDir:job.outputDir,runKey:commandId,commandId,workerId,gpuId:gpuId??'',status:gpuId===undefined?'queued':'running',durableAccepted:true};
  };
  const make=mode=>DistributedPlanQueue.enqueuePlan(DistributedPlanQueue.emptyDistributedQueue(),{
    projectId:DistributedPlanQueue.canonicalProjectId(root),schedulingMode:mode,planFile:'p.yaml',revision:'r',codeFingerprint:'f',
    jobs:[0,1].map(index=>({index,case:'bus',seed:index,outputDir:`runs/${index}`}))},'p');
  stored=make('local_idle');await p.tickDistributedQueueCore();
  assert.equal(calls.length,1,'G1 busy NWPU5 must receive no default dispatch');assert.equal(calls[0].workerId,'nwpu3');assert.equal(calls[0].gpuId,'0');
  assert.equal(stored.plans[0].jobs[1].workerId,undefined);
  stored=make('server_prequeue');calls=[];await p.tickDistributedQueueCore();
  assert.equal(calls.length,2);assert.deepEqual(calls.map(row=>row.workerId).sort(),['nwpu3','nwpu5']);
  assert.ok(calls.every(row=>row.gpuId===undefined));assert.ok(stored.plans[0].jobs.every(row=>row.status==='queued'));
});
test('G1 actual RPC envelope distinguishes local GPU admission from durable hosted prequeue', async () => {
  const Provider=provider(['sendDistributedJob'], {vscode:{workspace:{getConfiguration:()=>({get:(_key,value)=>value})},Uri:{file:value=>value}},
    loadSyncHolds:async()=>[],buildLocalCodeManifest:async()=>({}),filterHeldFiles:manifest=>manifest,fingerprintFromManifest:()=> 'f'});
  const p=new Provider();p.distributedQueueGeneration=0;p.distributedPlanStopEpoch=0;
  p.context={globalStorageUri:{fsPath:'cache'}};p.localCodeManifestCacheFile=()=> 'cache';
  p.workerActionTargets=()=>[{id:'w',condaEnv:'env'}];p.enabledWorkerConfigs=()=>[{id:'w',gpuIdleUtilThreshold:0,maxConcurrentGpus:1}];
  p.schedulerSettings=()=>({gpuIdleUtilThreshold:5,gpuIdleMemThresholdMb:200,workerActionMinIntervalMs:500});
  p.withRemoteActionResource=async(_worker,_action,_request,callback)=>callback();let sent;
  p.client={postWorkerAction:async(_worker,_action,request)=>{sent=request;return {status:'queued'};}};
  const plan={id:'p',projectId:'project',planFile:'p.yaml',revision:'r',codeFingerprint:'f',enqueuedAt:'date',planJobCount:1,schedulingMode:'server_prequeue'};
  const job={index:0,case:'bus',seed:42,attempt:1,outputDir:'runs/0'};
  await p.sendDistributedJob(plan,job,'w',undefined,'same-command');
  assert.equal(sent.schedulingMode,'server_prequeue');assert.equal(sent.requireIdleGpu,false);assert.equal(Object.hasOwn(sent,'gpuId'),false);
  assert.equal(sent.options.maxConcurrentGpus,1);assert.equal(sent.options.gpuIdleUtilThreshold,0);assert.equal(sent.opId,'same-command');
  plan.schedulingMode='local_idle';await p.sendDistributedJob(plan,job,'w','0','new-command');
  assert.equal(sent.schedulingMode,'local_idle');assert.equal(sent.requireIdleGpu,true);assert.equal(sent.gpuId,'0');
});
const agentSource=fs.readFileSync(path.join(root,'src/clusterAgentRuntime.legacy.ts'),'utf8');
function definition(name){const start=agentSource.indexOf(`\ndef ${name}(`)+1;assert.ok(start>0,name);
  const end=agentSource.indexOf('\ndef ',start+1);return agentSource.slice(start,end<0?undefined:end);}
function python(script){const directory=fs.mkdtempSync(path.join(os.tmpdir(),'simpleex-lifecycle-'));
  const file=path.join(directory,'assertions.py');fs.writeFileSync(file,script,'utf8');
  const run=spawnSync(process.env.PYTHON||'python',['-X','utf8',file],{encoding:'utf8',timeout:10000,windowsHide:true});
  assert.equal(run.status,0,run.stderr||run.error?.message);return JSON.parse(run.stdout.trim());}
test('G2 real Agent idle admission guard rejects a competing process and untrusted telemetry',()=>{
  const result=python(`import json, math\nGPU_IDLE_UTIL_THRESHOLD=5\nGPU_IDLE_MEM_THRESHOLD_MB=200\nDISTRIBUTED_GPU_RESERVATIONS={}\ndef read_json(*args): return {}\ndef path_for(*args): return ''\ndef read_durable_plan_queue(*args): return {'jobs':[]}\ndef gpu_row_id(row): return str(row['gpuId'])\ndef gpu_row_busy(*args,**kwargs): return False\n${definition('_durable_gpu_busy_reason')}\nrow={'gpuId':'0','utilizationPercent':0,'memoryUsedMb':7,'processes':[{'pid':7}]}\nprint(json.dumps([_durable_gpu_busy_reason('', '0', 'c', [row]),_durable_gpu_busy_reason('', '0', 'c', [{'gpuId':'0'}])]))\n`);
  assert.deepEqual(result,['gpu_busy','gpu_busy'],'G2 admission must reject occupied or unknown GPU');
});
test('G3 actual task API syncs exit evidence into durable ledger immediately, with mode and terminal metadata',()=>{
  const fields=agentSource.match(/^DURABLE_PLAN_IDENTITY_FIELDS\s*=\s*\([\s\S]*?^\)/m)[0];
  const result=python(`import json, threading\nSCHEMA_VERSION=1\nWORKER_TASK_SNAPSHOT_LOCK=threading.RLock()\n${fields}\ndef now_iso(): return '2026-09-29T00:00:00Z'\n${['durable_plan_value','durable_plan_identity','durable_plan_same_identity','durable_plan_task_status','sync_durable_plan_task_rows','durable_plan_public_task','api_worker_tasks'].map(definition).join('\n')}\nROW={key:'x' for key in DURABLE_PLAN_IDENTITY_FIELDS}\nROW.update({'status':'running','planJobCount':1,'enqueuedAt':now_iso(),'schedulingMode':'server_prequeue','gpuId':''})\nTASK=dict(ROW)\nLEDGER={'jobs':[ROW]}\ndef path_for(*args): return ''\ndef read_json(*args): return {'tasks':[TASK]}\ndef read_durable_plan_queue(*args): return LEDGER\ndef write_durable_plan_queue(root,data): pass\ndef read_runtime_json_cached(*args): return None\ndef reconcile_worker_task_exit_codes(root): TASK.update({'status':'completed','exitCode':0,'finishedAt':now_iso()})\nprint(json.dumps(api_worker_tasks('')['tasks'][0]))\n`);
  assert.equal(result.status,'completed','G3 exit evidence must supersede durable running during same API call');
  assert.equal(result.exitCode,0);assert.ok(result.finishedAt);assert.equal(result.schedulingMode,'server_prequeue');
});
test('G4 automatic postprocess stays inert and package/lock/runtime versions match',()=>{
  const Provider=provider(['scheduleDistributedPostprocess']);const p=new Provider();let calls=0;
  p.syncDistributedJobArtifacts=()=>calls++;p.rebuildDistributedResults=()=>calls++;
  p.scheduleDistributedPostprocess(root,true);assert.equal(calls,0,'G4 no automatic result transfer');
  const version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
  assert.match(version,/^\d+\.\d+\.\d+$/);assert.equal(JSON.parse(fs.readFileSync(path.join(root,'package-lock.json'),'utf8')).version,version);
  assert.match(fs.readFileSync(path.join(root,'src/runtime/RuntimeManifest.ts'),'utf8'),new RegExp(`CURRENT_RUNTIME_VERSION = "${version.replaceAll('.','\\.')}"`));
});
