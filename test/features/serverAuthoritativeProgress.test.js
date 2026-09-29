const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const original = require.extensions['.ts'];
require.extensions['.ts'] = (loaded, filename) => loaded._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'), {
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true},
}).outputText, filename);
const queue = require('../../src/features/DistributedPlanQueue.ts');
const policy = require('../../src/features/DistributedSchedulingPolicy.ts');
require.extensions['.ts'] = original;
const now = Date.now();
const iso = new Date(now).toISOString();
function intent() {
  const result = queue.enqueuePlan(queue.emptyDistributedQueue(), {projectId:'project',schedulingMode:'server_prequeue',
    planFile:'p.yaml',revision:'r',codeFingerprint:'f',jobs:[0,1].map(index=>({index,case:'bus',seed:42+index,outputDir:`runs/${index}`}))},'p',iso);
  return policy.allocateServerPrequeue(result,[{workerId:'a',online:true,weight:1,codeFingerprint:'f'},
    {workerId:'b',online:true,weight:1,codeFingerprint:'f'}]).queue;
}
function snapshot(plan, job, status='running', overrides={}) {
  return {workerId:job.workerId,generatedAt:iso,fetchedAt:iso,capabilities:{durablePlanQueue:true,schemaVersion:1},tasks:[{
    projectId:plan.projectId,workflowId:plan.id,planFile:plan.planFile,planRevision:plan.revision,
    codeFingerprint:plan.codeFingerprint,planJobCount:plan.planJobCount,enqueuedAt:plan.enqueuedAt,
    experimentIndex:job.index,attempt:job.attempt,case:job.case,seed:job.seed,outputDir:job.outputDir,
    commandId:job.commandId,runKey:job.commandId,workerId:job.workerId,status,schedulingMode:plan.schedulingMode,
    ...(status==='completed'?{finishedAt:iso}:{}),}],...overrides};
}
test('all-server projection immediately supersedes local running, while one failed server only fences its own jobs', () => {
  const input = intent(); const plan=input.plans[0]; plan.jobs.forEach(job=>job.status='running');
  const snapshots=plan.jobs.map((job,index)=>snapshot(plan,job,index===0?'completed':'running'));
  const projected=policy.serverAuthoritativeProgress(input,snapshots,'project',now);
  assert.deepEqual(projected[0].jobs.map(job=>job.status),['completed','running']);
  assert.deepEqual(input.plans[0].jobs.map(job=>job.status),['running','running']);
  const partial=policy.serverAuthoritativeProgress(input,[snapshots[0],{...snapshots[1],error:'disconnected'}],'project',now);
  assert.deepEqual(partial[0].jobs.map(job=>job.status),['completed','unknown']);
  assert.equal(partial[0].jobs[1].commandId,plan.jobs[1].commandId);
  const expired=policy.serverAuthoritativeProgress(input,snapshots,'project',now+5001);
  assert.ok(expired[0].jobs.every(job=>job.status==='unknown'));
});
test('cold restart rebuilds hosted identities across servers without duplicate jobs or fabricated completion', () => {
  const input=intent(); const plan=input.plans[0]; const snapshots=plan.jobs.map(job=>snapshot(plan,job,'completed'));
  let restored=queue.emptyDistributedQueue();
  for(let index=0;index<3;index++) restored={...restored,plans:policy.serverAuthoritativeProgress(restored,snapshots,'project',now)};
  assert.equal(restored.plans.length,1); assert.equal(restored.plans[0].jobs.length,2);
  assert.equal(restored.plans[0].schedulingMode,'server_prequeue');
  assert.equal(restored.plans[0].remoteAcceptedJobCount,2);
  assert.deepEqual(restored.plans[0].jobs.map(job=>job.commandId),plan.jobs.map(job=>job.commandId));
  assert.equal(policy.serverAuthoritativeProgress(input,[],'project',now)[0].jobs[0].status,'unknown');
});
test('known unassigned local intent remains waiting rather than missing server state', () => {
  const input=intent(); const plan=input.plans[0];
  Object.assign(plan.jobs[1],{status:'pending',workerId:undefined,commandId:undefined,runKey:undefined});
  const projected=policy.serverAuthoritativeProgress(input,[snapshot(plan,plan.jobs[0])],'project',now)[0];
  assert.equal(projected.jobs[1].status,'pending'); assert.equal(projected.recoveryMissingCount,0);
});
test('hosted unbound GPU receives its first authoritative GPU without false identity conflict', () => {
  const input=intent(); const plan=input.plans[0]; const job=plan.jobs[0]; job.gpuId='';job.status='queued';
  const remote=snapshot(plan,job);remote.tasks[0].gpuId='0';
  assert.equal(queue.remoteTaskMatchesJob(plan,job,remote.tasks[0]),true);
  const bound=policy.serverAuthoritativeProgress(input,[remote,snapshot(plan,plan.jobs[1])],'project',now)[0];
  assert.equal(bound.jobs[0].gpuId,'0');assert.equal(bound.jobs[0].status,'running');assert.equal(bound.jobs[0].recoveryConflict,undefined);
  remote.tasks[0].gpuId='1';assert.equal(queue.remoteTaskMatchesJob(bound,bound.jobs[0],remote.tasks[0]),false);
  plan.schedulingMode='local_idle';assert.equal(queue.remoteTaskMatchesJob(plan,job,remote.tasks[0]),false);
});

function providerMethods(names, extra={}) {
  const source=fs.readFileSync(require.resolve('../../src/extension/legacy.ts'),'utf8');
  const ast=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true);
  const cls=ast.statements.find(node=>ts.isClassDeclaration(node)&&node.name?.text==='RealtimeTunnelPanelProvider');
  const code='class Provider {'+cls.members.filter(node=>names.includes(node.name?.getText(ast))).map(node=>node.getText(ast)).join('\n')+'}; Provider;';
  return vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText,
    {AbortController,setTimeout,clearTimeout,workspaceRoot:()=>'/project',mapLimited:async(rows,_limit,callback)=>Promise.all(rows.map(callback)),...extra});
}
test('actual provider read-only progress lane publishes a fast server while dispatch and another server stay pending', async () => {
  const Provider=providerMethods(['refreshServerPlanProgress']); const provider=new Provider();
  provider.distributedQueueRoot='/project';provider.distributedQueueCache={plans:[{}]};provider.isRealtimeMode=()=>true;
  provider.workerActionTargets=()=>[{id:'fast'},{id:'slow'}];provider.postState=()=>{};
  let release;let fast=false;let calls=0;
  const slow=new Promise(resolve=>release=resolve);
  provider.distributedQueueTickPromise=new Promise(()=>{});
  provider.readWorkerTaskSnapshot=async id=>{calls++;if(id==='slow')await slow;else fast=true;};
  const first=provider.refreshServerPlanProgress(); const second=provider.refreshServerPlanProgress();
  await Promise.resolve();assert.equal(fast,true);assert.equal(calls,2);
  release();await Promise.all([first,second]);assert.equal(provider.progressRefreshPromise,undefined);
});
test('actual snapshot reader deduplicates fresh reads, publishes immediately and invalidates cached running on failure', async () => {
  const Provider=providerMethods(['readWorkerTaskSnapshot','refreshWorkerTaskSnapshot'],{
    workerTaskSnapshotPayload:row=>row,workerTaskLooksRunning:row=>row.status==='running',RequestBudget_1:{RequestBudgetDeniedError:class extends Error{}},
  });
  const provider=new Provider();provider.workerTaskRequests=new Map();provider.lastWorkerTaskSnapshots=new Map();
  provider.cachedWorkerTaskSnapshot=(_worker,_root,key)=>provider.lastWorkerTaskSnapshots.get(key);
  provider.writeWorkerTaskSnapshot=()=>{};let posts=0;provider.postState=()=>posts++;
  let count=0;let release;const response=new Promise(resolve=>release=resolve);
  provider.client={getWorkerTasks:async()=>{count++;return response;}};
  const a=provider.readWorkerTaskSnapshot('w',{fresh:true}), b=provider.readWorkerTaskSnapshot('w',{fresh:true});
  release({schemaVersion:1,generatedAt:iso,capabilities:{durablePlanQueue:true,schemaVersion:1},tasks:[{status:'running'}]});
  await Promise.all([a,b]);assert.equal(count,1);assert.equal(posts,1);
  provider.client.getWorkerTasks=async()=>{throw new Error('offline');};
  const failed=await provider.readWorkerTaskSnapshot('w',{fresh:true});
  assert.equal(failed.error,'Worker task snapshot unavailable');
  assert.equal(provider.lastWorkerTaskSnapshots.get('/project\u0000w').error,failed.error);assert.equal(posts,2);
});
