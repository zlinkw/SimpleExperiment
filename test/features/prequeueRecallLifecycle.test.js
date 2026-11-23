const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = 'C:/project';
const source = fs.readFileSync(path.resolve(__dirname, '../../src/extension/legacy.ts'), 'utf8');
const original = require.extensions['.ts'];
require.extensions['.ts'] = (loaded, filename) => loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, filename);
const queueApi = require('../../src/features/DistributedPlanQueue.ts');
require.extensions['.ts'] = original;

function provider(names, extra = {}) {
  const ast = ts.createSourceFile('legacy.ts', source, ts.ScriptTarget.Latest, true);
  const cls = ast.statements.find((node) => ts.isClassDeclaration(node) && node.name?.text === 'RealtimeTunnelPanelProvider');
  const code = 'class Provider {' + cls.members.filter((node) => names.includes(node.name?.getText(ast))).map((node) => node.getText(ast)).join('\n') + '}; Provider;';
  return vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText,
    { ...require('../_helpers/nativeHostScope'), DistributedPlanQueue: queueApi, workspaceRoot: () => root, makeOpId: (kind) => `${kind}-12345678`,
      errorMessage: (error) => error.message, vscode: { window: { showInformationMessage: () => undefined, showWarningMessage: async()=> "确认召回" } },
      trustedTerminalProofFor: require('../../dist/features/VerifiedCompletion.js').trustedTerminalProofFor, ...extra });
}
function snapshot(plan, job, status = 'queued', aliases = false, extra = {}) {
  const now = new Date().toISOString();
  return { workerId: job.workerId, generatedAt: now, fetchedAt: now,
    capabilities: { durablePlanQueue: true, queuedJobRecall: true, schemaVersion: 1 }, tasks: [{
      ...(aliases ? { commandId: job.commandId, planId: plan.id, plan: plan.planFile, caseName: job.case }
        : { projectId: plan.projectId, workflowId: plan.id, planFile: plan.planFile, planRevision: plan.revision,
          codeFingerprint: plan.codeFingerprint, planJobCount: plan.planJobCount, experimentIndex: job.index,
          runKey: job.runKey || job.commandId, case: job.case }),
      seed: job.seed, attempt: job.attempt, outputDir: job.outputDir, workerId: job.workerId,
      ...(plan.resultPathPolicy === 'declared' ? { resultPathPolicy: 'declared', globalJobId: job.globalJobId,
        collectionResultCsv: job.collectionResultCsv } : {}),
      commandId: job.commandId, gpuId: job.gpuId, status, ...extra,
    }] };
}
function releaseReceipt(request, legacy = false) {
  return { ...request, status: 'cancelled', stopReason: 'requeue', durableReleased: true,
    durableAccepted: !legacy, legacyReleased: legacy, neverStarted: true,
    neverStartedEvidence: legacy ? 'worker_command_queued' : 'durable_queued_row' };
}
function providerState(stored) {
  const Provider = provider(['recallPlanToLocalQueueFromUi', 'processDistributedRecall']);
  const instance = new Provider();
  instance.distributedQueueGeneration = 0;
  const context={root};instance.captureProjectContext=()=>context;instance.projectContextIsCurrent=value=>value===context;
  instance.distributedRecallInFlight = new Set();
  instance.distributedQueueTickPromise = undefined;
  instance.distributedTickAbort = undefined;
  instance.detachStaleDistributedTick = () => undefined;
  instance.postState = () => undefined;
  instance.captureProjectContext = () => ({root});
  instance.projectContextIsCurrent = context => context.root === root;
  instance.tickDistributedQueue = async () => undefined;
  instance.loadDistributedQueue = async () => structuredClone(stored.value);
  instance.saveDistributedQueue = async (_root, next) => { stored.value = structuredClone(next); };
  instance.withRemoteActionResource = async (_worker, _action, _request, action) => action();
  instance.workerActionTargets = () => [{ id: 'worker-a', host: 'fake', port: 22, user: 'test', project_dir: '/project', local_agent_url: 'http://fake' }];
  return instance;
}

test('recalled local work shows automatic admission waiting instead of a manual-only promise', () => {
  const html = require('../../dist/ui/PanelHtml.legacy.js').renderPanelHtml();
  const script = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]).join('\n');
  const start = script.indexOf('const waitNote ='), end = script.indexOf('const recheckNote =', start);
  assert.ok(start >= 0 && end > start);
  const note = new Function('job', 'status', 'stopPending', script.slice(start, end) + ';return waitNote;');
  const recalled = { lifecycleProtocol: 2, localQueueOnly: true };
  assert.match(note(recalled, 'pending', false), /自动调度/);
  assert.doesNotMatch(note(recalled, 'pending', false), /不会自动派发/);
  assert.match(note({ ...recalled, manualDispatch: { stage: 'preparing' } }, 'pending', false), /手动派发/);
  assert.equal(note({ ...recalled, outputIsolationBlocked: {} }, 'pending', false), '');
  assert.equal(note(recalled, 'pending', true), '');
});

test('lost stop ACK preserves native recall intent; restart settles only from an active exact query',async()=>{
  const at=new Date().toISOString();
  const queue=queueApi.enqueuePlan(queueApi.emptyDistributedQueue(),{projectId:queueApi.canonicalProjectId(root),schedulingMode:'server_prequeue',
    planFile:'plans/recall.yaml',revision:'r1',codeFingerprint:'f1',jobs:[0,1].map(index=>({index,case:'case-'+index,seed:40+index,outputDir:'runs/'+index,collectionResultCsv:'tmp/result/'+index+'.csv'}))},'plan-recall',at);
  const plan=queue.plans[0],job=plan.jobs[0];
  Object.assign(job,{status:'queued',workerId:'worker-a',commandId:'target-command-0001',gpuId:'0'});
  Object.assign(plan.jobs[1],{status:'running',workerId:'worker-a',commandId:'running-command-0002',gpuId:'1'});
  const sibling=structuredClone(plan.jobs[1]),stored={value:queue},p=providerState(stored),calls=[];
  p.client={postWorkerAction:async(_w,_a,request)=>{calls.push(request);throw Error('lost ACK');},
    getWorkerTasks:async()=>({capabilities:{taskLifecycle:2,queuedRecallExact:1},queryComplete:true,tasks:[{observation:{lifecycleProtocol:2,commandId:job.commandId,
      projectId:plan.projectId,workerId:job.workerId,observedAt:new Date().toISOString(),cancelled:false,tmux:{windowId:'@1',paneId:'%1',dead:false,phase:'queued'}}}]})};
  await assert.rejects(p.recallPlanToLocalQueueFromUi({planId:plan.id,planFile:plan.planFile,jobIndex:0}),/lost ACK/);
  assert.equal(stored.value.plans[0].jobs[0].recallRequested,true);
  const operationId=stored.value.plans[0].jobs[0].recallOperationId;assert.ok(operationId);
  assert.equal(stored.value.plans[0].jobs[0].commandId,job.commandId);
  assert.deepEqual(stored.value.plans[0].jobs[1],sibling);
  const resumed=providerState(stored);
  resumed.client={postWorkerAction:async()=>{assert.fail('unknown recall must not be reposted');},
    getWorkerTasks:async()=>({capabilities:{taskLifecycle:2},queryComplete:true,tasks:[{observation:{lifecycleProtocol:2,commandId:job.commandId,
      projectId:plan.projectId,workerId:job.workerId,observedAt:new Date().toISOString(),cancelled:true,tmux:null,result:null,
      queuedRecall:{phase:'completed',operationId,commandId:job.commandId,projectId:plan.projectId,workerId:job.workerId,workflowId:plan.id,experimentIndex:job.index}}}]})};
  await resumed.processDistributedRecall(root,plan.id,0,0);
  const released=stored.value.plans[0].jobs[0];
  assert.equal(calls.length,1);assert.equal(calls[0].operationId,operationId);assert.equal(calls[0].targetCommandId,job.commandId);
  assert.equal(released.status,'pending');assert.equal(released.attempt,0);assert.equal(released.commandId,undefined);
  assert.ok(released.nextCommandId);assert.equal(released.outputDir,job.outputDir);
  assert.deepEqual(stored.value.plans[0].jobs[1],sibling);
});
test('historical queued jobs without the exact protocol are rejected without sending', async () => {
  const stamp = new Date().toISOString();
  let queue = queueApi.enqueuePlan(queueApi.emptyDistributedQueue(), { projectId: queueApi.canonicalProjectId(root),
    schedulingMode: 'server_prequeue', planFile: 'plans/recall.yaml', revision: 'r1', codeFingerprint: 'f1',
    jobs: [0, 1].map((index) => ({ index, case: `case-${index}`, seed: 40 + index,
      outputDir: `runs/${index}`, collectionResultCsv: `tmp/result/${index}/metrics.csv` })) }, 'plan-recall', stamp);
  const plan = queue.plans[0];
  for (const job of plan.jobs) delete job.lifecycleProtocol; // Retained pre-protocol2 queue, never a newly admitted native task.
  const [queued, running] = plan.jobs;
  Object.assign(queued, { status: 'queued', workerId: 'worker-a', commandId: 'target-command-0001', runKey: 'target-command-0001', gpuId: '' });
  Object.assign(running, { status: 'running', workerId: 'worker-a', commandId: 'running-command-0002', runKey: 'running-command-0002', gpuId: '0' });
  const stored = { value: queue };
  const p = providerState(stored);
  p.tickDistributedQueue = async () => p.processDistributedRecall(root, plan.id, queued.index, p.distributedQueueGeneration);
  let calls = [];
  p.readWorkerTaskSnapshot = async () => snapshot(plan, queued);
  p.client = { postWorkerAction: async (_worker, _action, request) => { calls.push(request); throw new Error('lost ACK'); } };
  await assert.rejects(p.recallPlanToLocalQueueFromUi({ planId: plan.id, planFile: plan.planFile }), /旧协议任务不支持/);
  const persisted = stored.value.plans[0];
  assert.equal(persisted.schedulingMode, 'server_prequeue');
  assert.equal(persisted.jobs[0].status, 'queued');
  assert.equal(persisted.jobs[0].recallRequested, undefined);
  assert.equal(persisted.jobs[0].workerId, 'worker-a');
  assert.equal(persisted.jobs[1].status, 'running');
  assert.equal(calls.length, 0);
  assert.equal(persisted.jobs[0].outputDir, 'runs/0');
  assert.equal(persisted.jobs[0].commandId, 'target-command-0001');
  assert.equal(persisted.jobs[1].status, 'running');
});

test('a projectless legacy queue rejects unsafe recall and preserves its running sibling', async () => {
  const plan = { id: 'old-plan-id', planFile: 'plans/old.yaml', revision: 'legacy-r', codeFingerprint: 'legacy-f',
    enqueuedAt: new Date().toISOString(), schedulingMode: 'server_prequeue', jobs: [{ index: 4, case: 'old-case', seed: 8,
      outputDir: 'runs/historical', attempt: 1, status: 'queued', workerId: 'worker-old', commandId: 'old-command-1234', runKey: 'old-command-1234' },
    { index: 5, case: 'still-running', seed: 9, outputDir: 'runs/legacy-running', attempt: 1, status: 'running',
      workerId: 'worker-old', commandId: 'old-running-5678', runKey: 'old-running-5678', gpuId: '0' }] };
  const job = plan.jobs[0];
  const sibling = plan.jobs[1];
  const stored = { value: { schemaVersion: 1, plans: [plan] } };
  const p = providerState(stored);
  const calls = [];
  p.readWorkerTaskSnapshot = async () => snapshot(plan, job, 'queued', true);
  p.client = { postWorkerAction: async (_worker, _action, request) => {
    calls.push(request);
    return releaseReceipt({ ...request, targetCommandId: job.commandId }, true);
  } };
  await assert.rejects(p.recallPlanToLocalQueueFromUi({ planId: plan.id, planFile: plan.planFile, jobIndex: job.index }), /旧协议任务不支持/);
  const current = stored.value.plans[0];
  assert.equal(calls.length, 0);
  assert.equal(current.schedulingMode, 'server_prequeue', 'single-job recall keeps unrelated hosted policy');
  assert.equal(current.localDispatchOverride, undefined);
  assert.equal(current.projectId, undefined);
  assert.equal(current.jobs[0].status, 'queued');
  assert.equal(current.jobs[0].outputDir, 'runs/historical');
  assert.equal(current.jobs[0].attempt, 1);
  assert.equal(current.jobs[1].status, 'running');
  const completedLegacyReceipt = { commandId: sibling.commandId, workerId: sibling.workerId, planId: plan.id,
    plan: plan.planFile, caseName: sibling.case, status: 'completed' };
  assert.equal(queueApi.historicalRecallTaskMatchesJob(current, current.jobs[1], completedLegacyReceipt), true,
    'a later legacy completion must still match the untouched historical identity');
  const promoted = structuredClone(stored.value);
  promoted.plans[0].projectId = queueApi.canonicalProjectId(root);
  promoted.plans[0].jobs[1].legacyOwnership = true;
  const fresh = new Date().toISOString();
  const recovered = queueApi.mergeDurableWorkerSnapshots(promoted, [{ workerId: sibling.workerId,
    generatedAt: fresh, fetchedAt: fresh, capabilities: { durablePlanQueue: true, schemaVersion: 1 },
    tasks: [completedLegacyReceipt] }], promoted.plans[0].projectId);
  assert.equal(recovered.plans[0].jobs[1].status, 'completed', 'the server projection updates a promoted legacy sibling immediately');
  const stale = new Date(Date.now() - 6000).toISOString();
  const staleProjection = queueApi.mergeDurableWorkerSnapshots(promoted, [{ workerId: sibling.workerId,
    generatedAt: stale, fetchedAt: stale, capabilities: { durablePlanQueue: true, schemaVersion: 1 },
    tasks: [completedLegacyReceipt] }], promoted.plans[0].projectId, Date.now(), 5000);
  assert.equal(staleProjection.plans[0].jobs[1].status, 'unknown', 'expired historical evidence cannot preserve a running display');
  assert.match(source, /filter\(\(\{ plan, job \}\) => !plan\.projectId \|\| DistributedPlanQueue\.hasLegacyOwnership\(job\)\)/,
    'the tick reconciler must continue polling legacy-owned jobs after Plan promotion');
});

test('native recall without an original target binding remains unknown after restart', async () => {
  const stamp = new Date().toISOString();
  const queue = queueApi.enqueuePlan(queueApi.emptyDistributedQueue(), { projectId: queueApi.canonicalProjectId(root),
    schedulingMode: 'local_idle', localDispatchOverride: true, planFile: 'plans/tombstone.yaml', revision: 'r1',
    codeFingerprint: 'f1', jobs: [{ index: 0, case: 'case', seed: 3, outputDir: 'runs/case', collectionResultCsv: 'tmp/result/case/metrics.csv' }] },
  'tombstone-plan', stamp);
  const plan = queue.plans[0];
  const job = plan.jobs[0];
  Object.assign(job, { status: 'unknown', workerId: 'worker-a', commandId: 'target-command-tombstone',
    runKey: 'target-command-tombstone', recallRequested: true, recallOperationId: 'saved-operation-1234', reassignmentPending: true });
  const stored = { value: queue };
  const p = providerState(stored);
  const tombstone = releaseReceipt({ projectId: plan.projectId, workflowId: plan.id, planFile: plan.planFile,
    planRevision: plan.revision, codeFingerprint: plan.codeFingerprint, planJobCount: plan.planJobCount,
    experimentIndex: job.index, case: job.case, seed: job.seed, attempt: job.attempt, outputDir: job.outputDir,
    workerId: job.workerId, gpuId: job.gpuId, runKey: job.runKey, commandId: job.commandId,
    targetCommandId: job.commandId, opId: job.recallOperationId });
  p.readWorkerTaskSnapshot = async () => snapshot(plan, job, 'cancelled', false, tombstone);
  let rpcCalls = 0;
  p.client = { postWorkerAction: async () => { rpcCalls++; throw new Error('lost ACK'); },
    getWorkerTasks:async()=>({capabilities:{taskLifecycle:2},queryComplete:true,tasks:[{observation:{lifecycleProtocol:2,commandId:job.commandId,projectId:plan.projectId,workerId:job.workerId,observedAt:new Date().toISOString(),cancelled:true,tmux:null,result:null}}]}) };
  await p.processDistributedRecall(root, plan.id, job.index, 0);
  const released = stored.value.plans[0].jobs[0];
  assert.equal(rpcCalls, 0, 'an old unbound request must not be resent');
  assert.equal(released.status, 'unknown');
  assert.equal(released.recallOperationId, 'saved-operation-1234');
  assert.equal(released.recallRequested, true);
});

test('historical restart reconciles a cancelled requeue tombstone only with its complete never-started proof', async () => {
  const stamp = new Date().toISOString();
  const queue = queueApi.enqueuePlan(queueApi.emptyDistributedQueue(), { projectId: queueApi.canonicalProjectId(root),
    schedulingMode: 'local_idle', localDispatchOverride: true, planFile: 'plans/tombstone.yaml', revision: 'r1',
    codeFingerprint: 'f1', jobs: [{ index: 0, case: 'case', seed: 3, outputDir: 'runs/case', collectionResultCsv: 'tmp/result/case/metrics.csv' }] },
  'tombstone-plan', stamp);
  const plan = queue.plans[0];
  const job = plan.jobs[0];
  delete job.lifecycleProtocol; // Persisted pre-protocol2 declared record.
  Object.assign(job, { status: 'unknown', workerId: 'worker-a', commandId: 'target-command-tombstone',
    runKey: 'target-command-tombstone', recallRequested: true, recallOperationId: 'saved-operation-1234', reassignmentPending: true });
  const stored = { value: queue };
  const p = providerState(stored);
  const tombstone = releaseReceipt({ projectId: plan.projectId, workflowId: plan.id, planFile: plan.planFile,
    planRevision: plan.revision, codeFingerprint: plan.codeFingerprint, planJobCount: plan.planJobCount,
    experimentIndex: job.index, case: job.case, seed: job.seed, attempt: job.attempt, outputDir: job.outputDir,
    workerId: job.workerId, gpuId: job.gpuId, runKey: job.runKey, commandId: job.commandId,
    targetCommandId: job.commandId, opId: job.recallOperationId });
  p.readWorkerTaskSnapshot = async () => snapshot(plan, job, 'cancelled', false, tombstone);
  let rpcCalls = 0;
  p.client = { postWorkerAction: async () => { rpcCalls++; throw new Error('lost ACK'); },
    getWorkerTasks: async () => { throw new Error('legacy tombstone recall must not need a native active query'); } };
  await p.processDistributedRecall(root, plan.id, job.index, 0);
  const released = stored.value.plans[0].jobs[0];
  assert.equal(rpcCalls, 0, 'a pre-protocol2 tombstone settles from its complete never-started proof without RPC');
  assert.equal(released.status, 'pending');
  assert.equal(released.attempt, 0);
  assert.equal(released.recallRequested, undefined);
});

test('a partial historical requeue snapshot retains the original request without reposting', async () => {
  const plan = { id: 'legacy-replay', planFile: 'plans/old.yaml', revision: 'rev-old', codeFingerprint: 'old-f',
    jobs: [{ index: 0, case: 'old', seed: 42, attempt: 1, outputDir: 'runs/old', status: 'unknown',
      workerId: 'worker-old', gpuId: '0', commandId: 'legacy-replay-command', recallRequested: true,
      recallOperationId: 'persisted-recall-1234', reassignmentPending: true }] };
  const job = plan.jobs[0];
  const stored = { value: { schemaVersion: 1, plans: [plan] } };
  const p = providerState(stored);
  p.readWorkerTaskSnapshot = async () => snapshot(plan, job, 'cancelled', true, { stopReason: 'requeue' });
  let calls = 0;
  p.client = { postWorkerAction: async (_worker, _action, request) => {
    calls++;
    assert.equal(request.operationId, 'persisted-recall-1234');
    return { workflowId: plan.id, planFile: plan.planFile, planRevision: plan.revision,
      case: job.case, seed: job.seed, attempt: job.attempt, outputDir: job.outputDir,
      workerId: job.workerId, gpuId: job.gpuId, commandId: job.commandId, targetCommandId: job.commandId,
      status: 'cancelled', stopReason: 'requeue', durableReleased: true, legacyReleased: true,
      neverStarted: true, neverStartedEvidence: 'worker_task_queued' };
  } };
  await p.processDistributedRecall(root, plan.id, job.index, 0);
  assert.equal(calls, 0);
  assert.equal(stored.value.plans[0].jobs[0].status, 'unknown');
  assert.equal(stored.value.plans[0].jobs[0].recallOperationId, 'persisted-recall-1234');
  assert.equal(stored.value.plans[0].jobs[0].workerId, 'worker-old');
});

test('historical pending jobs reject a new recall without exact queued capability', async () => {
  const plan = { id: 'legacy-pending', planFile: 'plans/pending.yaml', revision: 'rev-old', codeFingerprint: 'old-f',
    jobs: [{ index: 0, case: 'old', seed: 42, attempt: 1, outputDir: 'runs/pending', status: 'queued',
      workerId: 'worker-old', gpuId: '0', commandId: 'legacy-pending-command' }] };
  const job = plan.jobs[0];
  const stored = { value: { schemaVersion: 1, plans: [plan] } };
  const p = providerState(stored);
  p.readWorkerTaskSnapshot = async () => snapshot(plan, job, 'pending', true);
  let calls = 0;
  p.client = { postWorkerAction: async (_worker, _action, request) => {
    calls++;
    return { ...releaseReceipt(request, true), neverStartedEvidence: 'worker_task_pending' };
  } };
  await assert.rejects(p.recallPlanToLocalQueueFromUi({ planId: plan.id, planFile: plan.planFile, jobIndex: job.index }), /旧协议任务不支持/);
  assert.equal(calls, 0);
  assert.equal(stored.value.plans[0].jobs[0].status, 'queued');
  assert.equal(stored.value.plans[0].jobs[0].workerId, 'worker-old');
});

test('a native recall cannot settle from an old cancelled receipt when the current query fails', async () => {
  const queue = queueApi.enqueuePlan(queueApi.emptyDistributedQueue(), {projectId:queueApi.canonicalProjectId(root),
    planFile:'plans/native.yaml',revision:'r',codeFingerprint:'code',jobs:[{index:0,case:'a',seed:1,
      outputDir:'runs/native',collectionResultCsv:'tmp/result/native.csv'}]}, 'native-recall');
  const job = queue.plans[0].jobs[0];
  Object.assign(job,{workerId:'worker-a',commandId:'native-original',status:'unknown',recallRequested:true,recallOperationId:'native-stop-request',
    recallWorkerBinding:JSON.stringify([['worker-a','fake',22,'test','/project','http://fake']])});
  const stored = {value:queue}, p = providerState(stored), posts=[];
  const before = JSON.stringify(queue);
  p.client = {postWorkerAction: async (worker,action,request) => {posts.push({worker,action,request}); return {status:'completed'};},
    getWorkerTasks: async () => ({capabilities:{taskLifecycle:2},queryComplete:false,error:'query unavailable',tasks:[]})};
  p.readWorkerTaskSnapshot = async () => assert.fail('native recall must query protocol2 observation instead of adopting an old receipt');
  await assert.rejects(p.processDistributedRecall(root,'native-recall',0,0), /query unavailable/);
  assert.equal(JSON.stringify(stored.value),before);
  assert.equal(posts.length,0, 'query failure must never resend the original stop');
});
