const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const previous = require.extensions['.ts'];
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, file);
const control = require('../../src/features/PulledTaskControl.ts');
const queueApi = require('../../src/features/DistributedPlanQueue.ts');
if (previous) require.extensions['.ts'] = previous; else delete require.extensions['.ts'];

const plan = { id: 'plan', projectId: 'project', planFile: 'plans/a.yaml', jobs: [{ index: 0 }] };
const job = { index: 0, workerId: 'worker', commandId: 'command' };
function fixture(capable = true) {
  let phase = 'queued', cancelled = false, proof, writes = 0, posts = 0;
  const client = {
    getWorkerTasks: async () => ({ queryComplete: true, capabilities: { taskLifecycle: 2, ...(capable ? { queuedRecallExact: 1 } : {}) }, tasks: [{
      observation: { lifecycleProtocol: 2, commandId: 'command', projectId: 'project', workerId: 'worker', observedAt: new Date().toISOString(),
        cancelled, queuedRecall: proof, tmux: cancelled ? null : { windowId: '@1', paneId: '%1', dead: false, phase } },
    }] }),
    postWorkerAction: async (_worker, _action, request) => { posts++; assert.equal(request.queuedRecallOnly, true); cancelled = true;
      proof = { phase: 'completed', operationId: request.operationId, commandId: 'command', workerId: 'worker', projectId: 'project', workflowId: 'plan', experimentIndex: 0 }; },
  };
  return { client, before: async () => { writes++; }, changePhase: value => { phase = value; }, changeProof: value => { proof = value; cancelled = true; }, get writes() { return writes; }, get posts() { return posts; } };
}

test('queued recall requires capability and current queued state before intent or POST', async () => {
  let f = fixture(false);
  await assert.rejects(control.recallQueuedTask(f.client, plan, job, 'recall-1', f.before, () => {}), /QUEUED_RECALL_UNSUPPORTED/);
  assert.equal(f.writes, 0); assert.equal(f.posts, 0);
  f = fixture(); f.changePhase('running');
  await assert.rejects(control.recallQueuedTask(f.client, plan, job, 'recall-1', f.before, () => {}), /不在排队状态/);
  assert.equal(f.writes, 0); assert.equal(f.posts, 0);
});

test('queued recall saves intent before one POST and subsequently only observes', async () => {
  const f = fixture();
  assert.equal(await control.recallQueuedTask(f.client, plan, job, 'recall-1', f.before, () => {}), true);
  assert.equal(f.writes, 1); assert.equal(f.posts, 1);
  assert.equal(await control.observeQueuedRecall(f.client, plan, { ...job, recallOperationId: 'recall-1' }), true);
  assert.equal(f.posts, 1);
});

test('intent persistence failure or a changed project prevents POST', async () => {
  const f = fixture();
  await assert.rejects(control.recallQueuedTask(f.client, plan, job, 'recall-1', async () => { throw Error('disk'); }, () => {}), /disk/);
  assert.equal(f.posts, 0);
  let checks = 0;
  await assert.rejects(control.recallQueuedTask(f.client, plan, job, 'recall-2', f.before, () => { if (++checks === 2) throw Error('changed'); }), /changed/);
  assert.equal(f.posts, 0);
});

test('lost response keeps the original request and recheck only observes', async () => {
  const f = fixture(), send = f.client.postWorkerAction;
  f.client.postWorkerAction = async (...args) => { await send(...args); throw Error('lost response'); };
  await assert.rejects(control.recallQueuedTask(f.client, plan, job, 'recall-1', f.before, () => {}), /lost response/);
  assert.equal(f.posts, 1); assert.equal(await control.observeQueuedRecall(f.client, plan, { ...job, recallOperationId: 'recall-1' }), true); assert.equal(f.posts, 1);
});

test('ordinary cancellation and mismatched or incomplete recall proofs do not release the job', async () => {
  const f = fixture(), observedJob = { ...job, recallOperationId: 'recall-1' };
  const proof = { phase: 'completed', operationId: 'recall-1', commandId: 'command', workerId: 'worker', projectId: 'project', workflowId: 'plan', experimentIndex: 0 };
  for (const candidate of [undefined, { ...proof, operationId: 'other' }, { ...proof, commandId: 'other' },
    { ...proof, workerId: 'other' }, { ...proof, projectId: 'other' }, { ...proof, workflowId: 'other' },
    { ...proof, experimentIndex: 1 }, { ...proof, phase: 'pending' }]) {
    f.changeProof(candidate); assert.equal(await control.observeQueuedRecall(f.client, plan, observedJob), false);
  }
  assert.equal(f.posts, 0);
});

function hostFixture(jobs) {
  const source = fs.readFileSync(path.join(__dirname, '../../src/extension/legacy.ts'), 'utf8');
  const start = source.indexOf('    async recallPlanToLocalQueueFromUi(message)');
  const end = source.indexOf('    async processDistributedRecall(', start);
  assert.ok(start >= 0 && end > start);
  const next = source.indexOf('\n    async ', end + 12);
  assert.ok(next > end);
  let stored = { plans: [{ id: 'plan', projectId: 'project', planFile: 'plans/a.yaml', jobs }] }, posts = 0, observations = 0, current = true;
  const workerControl = {
    recallQueuedTask: async (_client, _plan, _job, _id, before, check) => { await before(); check(); posts++; return true; },
    observeQueuedRecall: async () => { observations++; return true; },
    returnPulledJobToLocal: (queue, planId, index) => ({ ...queue, plans: queue.plans.map(p => p.id !== planId ? p : { ...p,
      jobs: p.jobs.map(j => j.index !== index ? j : { ...j, status: 'pending', commandId: undefined, workerId: undefined, recallRequested: undefined }) }) }),
  };
  const box = { workspaceRoot: () => 'C:/project', DistributedPlanQueue: { sameDistributedPlanFile: (a, b) => a === b },
    PulledTaskControl: workerControl, vscode: { window: { showWarningMessage: async () => '确认召回', showInformationMessage: () => {} } }, makeOpId: () => 'recall-1' };
  vm.createContext(box);
  vm.runInContext(ts.transpileModule(`class Host { ${source.slice(start, end)}\n${source.slice(end, next)} } this.Host=Host;`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, box);
  const host = new box.Host();
  Object.assign(host, { client: {}, captureProjectContext: () => 'project', projectContextIsCurrent: () => current,
    workerActionTargets: () => [{ id: 'w', host: 'server', port: 22, user: 'u', project_dir: '/project', local_agent_url: 'http://localhost' }],
    distributedRecallInFlight: new Set(), distributedQueueGeneration: 0,
    loadDistributedQueue: async () => structuredClone(stored), saveDistributedQueue: async (_root, next, options) => { options?.recallAssertCurrent?.(); stored = structuredClone(next); }, postState() {} });
  return { host, box, workerControl, get stored() { return stored; }, set stored(value) { stored = value; }, get posts() { return posts; }, get observations() { return observations; }, changeProject: () => { current = false; } };
}

test('bulk recall preserves running, completed and unknown siblings', async () => {
  const rows = ['queued', 'running', 'completed', 'unknown'].map((status, index) => ({ lifecycleProtocol: 2, index, status,
    workerId: 'w', commandId: 'c' + index, ...(status === 'completed' ? { completionState: 'verified' } : {}) }));
  const f = hostFixture(rows);
  await f.host.recallPlanToLocalQueueFromUi({ planId: 'plan', planFile: 'plans/a.yaml' });
  assert.equal(f.posts, 1); assert.equal(f.stored.plans[0].jobs[0].status, 'pending');
  assert.deepEqual(f.stored.plans[0].jobs.slice(1), rows.slice(1));
});

test('local pending jobs remain local in mixed and local-only selections', async () => {
  for (const jobs of [
    [{ lifecycleProtocol: 2, index: 0, status: 'pending' }],
    [{ lifecycleProtocol: 2, index: 0, status: 'pending' }, { lifecycleProtocol: 2, index: 1, status: 'queued', workerId: 'w', commandId: 'remote' }],
  ]) {
    const f = hostFixture(jobs);
    await f.host.recallPlanToLocalQueueFromUi({ planId: 'plan', planFile: 'plans/a.yaml' });
    assert.equal(f.stored.plans[0].jobs[0].localQueueOnly, true);
    assert.equal(f.posts, jobs.length - 1);
  }
});

test('mixed old and native queues process eligible native jobs and report the old limit', async () => {
  const f = hostFixture([{ index: 0, status: 'queued', workerId: 'legacy', commandId: 'old' },
    { lifecycleProtocol: 2, index: 1, status: 'queued', workerId: 'w', commandId: 'new' }]);
  let notice = '';
  f.box.vscode.window.showInformationMessage = value => { notice = value; };
  await f.host.recallPlanToLocalQueueFromUi({ planId: 'plan', planFile: 'plans/a.yaml' });
  assert.equal(f.posts, 1); assert.equal(f.stored.plans[0].jobs[0].commandId, 'old');
  assert.equal(f.stored.plans[0].jobs[1].status, 'pending'); assert.match(notice, /旧协议任务未召回/);
});

test('changed job during confirmation causes no intent or POST', async () => {
  const f = hostFixture([{ lifecycleProtocol: 2, index: 0, status: 'queued', workerId: 'w', commandId: 'old' }]);
  f.box.vscode.window.showWarningMessage = async () => { f.stored.plans[0].jobs[0].commandId = 'new'; return '确认召回'; };
  await assert.rejects(f.host.recallPlanToLocalQueueFromUi({ planId: 'plan', planFile: 'plans/a.yaml' }), /任务身份已变化/);
  assert.equal(f.posts, 0); assert.equal(f.stored.plans[0].jobs[0].recallRequested, undefined);
});

test('changed Worker during confirmation causes no intent or POST', async () => {
  const f = hostFixture([{ lifecycleProtocol: 2, index: 0, status: 'queued', workerId: 'w', commandId: 'old' }]);
  let host = 'server';
  f.host.workerActionTargets = () => [{ id: 'w', host, port: 22, user: 'u', project_dir: '/project', local_agent_url: 'http://localhost' }];
  f.box.vscode.window.showWarningMessage = async () => { host = 'other'; return '确认召回'; };
  await assert.rejects(f.host.recallPlanToLocalQueueFromUi({ planId: 'plan', planFile: 'plans/a.yaml' }), /Worker 目标已变化/);
  assert.equal(f.posts, 0); assert.equal(f.stored.plans[0].jobs[0].recallRequested, undefined);
});

test('existing unknown recall only observes its original request', async () => {
  const binding = JSON.stringify([['w', 'server', 22, 'u', '/project', 'http://localhost']]);
  const f = hostFixture([{ lifecycleProtocol: 2, index: 0, status: 'unknown', workerId: 'w', commandId: 'old', recallRequested: true, recallOperationId: 'original', recallWorkerBinding: binding }]);
  await f.host.recallPlanToLocalQueueFromUi({ planId: 'plan', planFile: 'plans/a.yaml', jobIndex: 0 });
  assert.equal(f.posts, 0); assert.equal(f.observations, 1); assert.equal(f.stored.plans[0].jobs[0].status, 'pending');
});

test('old unknown recall without a target binding stays unresolved', async () => {
  const f = hostFixture([{ lifecycleProtocol: 2, index: 0, status: 'unknown', workerId: 'w', commandId: 'old', recallRequested: true, recallOperationId: 'original' }]);
  await assert.rejects(f.host.recallPlanToLocalQueueFromUi({ planId: 'plan', planFile: 'plans/a.yaml', jobIndex: 0 }), /目标无法核实/);
  await f.host.processDistributedRecall('C:/project', 'plan', 0, 0);
  assert.equal(f.posts, 0); assert.equal(f.observations, 0); assert.equal(f.stored.plans[0].jobs[0].recallOperationId, 'original');
});

test('background recovery observes without another POST and preserves verified completion', async () => {
  const binding = JSON.stringify([['w', 'server', 22, 'u', '/project', 'http://localhost']]);
  const rows = [{ lifecycleProtocol: 2, index: 0, status: 'unknown', workerId: 'w', commandId: 'old', recallRequested: true, recallOperationId: 'original', recallWorkerBinding: binding }];
  const f = hostFixture(rows);
  f.workerControl.observeQueuedRecall = async () => false;
  await f.host.processDistributedRecall('C:/project', 'plan', 0, 0);
  assert.equal(f.posts, 0); assert.equal(f.stored.plans[0].jobs[0].recallOperationId, 'original');
  f.workerControl.observeQueuedRecall = async () => { throw Error('query failed'); };
  await assert.rejects(f.host.processDistributedRecall('C:/project', 'plan', 0, 0), /query failed/);
  assert.equal(f.host.distributedRecallInFlight.size, 0); assert.equal(f.posts, 0);
  f.stored.plans[0].jobs[0].status = 'completed'; f.stored.plans[0].jobs[0].completionState = 'verified';
  f.workerControl.observeQueuedRecall = async () => { throw Error('must not observe'); };
  await f.host.processDistributedRecall('C:/project', 'plan', 0, 0);
  assert.equal(f.stored.plans[0].jobs[0].completionState, 'verified'); assert.equal(f.posts, 0);
});

test('background recall does not settle after the original Plan identity changes', async () => {
  const binding = JSON.stringify([['w', 'server', 22, 'u', '/project', 'http://localhost']]);
  for (const field of ['planFile', 'projectId']) {
    const f = hostFixture([{ lifecycleProtocol: 2, index: 0, status: 'unknown', workerId: 'w', commandId: 'old', recallRequested: true, recallOperationId: 'original', recallWorkerBinding: binding }]);
    f.workerControl.observeQueuedRecall = async () => { f.stored.plans[0][field] = 'changed'; return true; };
    await f.host.processDistributedRecall('C:/project', 'plan', 0, 0);
    assert.equal(f.stored.plans[0].jobs[0].commandId, 'old'); assert.equal(f.stored.plans[0].jobs[0].recallRequested, true); assert.equal(f.posts, 0);
  }
});

test('the original recall identity and target survive queue serialization', () => {
  const job = { lifecycleProtocol: 2, resultPathPolicy: 'declared', index: 0, status: 'unknown',
    workerId: 'w', commandId: 'c', recallRequested: true, recallOperationId: 'original', recallWorkerBinding: 'target' };
  const queue = { schemaVersion: 1, plans: [{ id: 'p', projectId: 'project', resultPathPolicy: 'declared', jobs: [job] }] };
  const restored = queueApi.restoreFormalJobQueue(JSON.parse(queueApi.serializeDistributedQueue(queue))).plans[0].jobs[0];
  assert.equal(restored.recallRequested, true); assert.equal(restored.recallOperationId, 'original');
  assert.equal(restored.recallWorkerBinding, 'target'); assert.equal(restored.commandId, 'c');
});

test('legacy queued requests are not sent or repeated', async () => {
  const f = hostFixture([{ index: 0, status: 'queued', workerId: 'w', commandId: 'old' }]);
  await assert.rejects(f.host.recallPlanToLocalQueueFromUi({ planId: 'plan', planFile: 'plans/a.yaml', jobIndex: 0 }), /旧协议任务不支持/);
  assert.equal(f.posts, 0); assert.equal(f.stored.plans[0].jobs[0].recallRequested, undefined);
  Object.assign(f.stored.plans[0].jobs[0], { status: 'unknown', recallRequested: true, recallOperationId: 'old-request' });
  Object.assign(f.box.DistributedPlanQueue, { hasFreshDurableSnapshot: () => true, remoteTaskMatchesJob: () => true,
    historicalRecallTaskMatchesJob: () => false, isExactQueuedReleaseProof: () => false });
  f.host.readWorkerTaskSnapshot = async () => ({ capabilities: { queuedJobRecall: true }, tasks: [{ status: 'queued' }] });
  await f.host.processDistributedRecall('C:/project', 'plan', 0, 0);
  assert.equal(f.posts, 0); assert.equal(f.stored.plans[0].jobs[0].recallOperationId, 'old-request');
  assert.equal(f.stored.plans[0].jobs[0].recallRequested, true);
});
