const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), ts = require('typescript'), vm = require('node:vm');
require('../_helpers/registerTsRequire');
const W = require('../../src/features/WorkerProgressQuery.ts');
const TaskQuery = require('../../src/features/WorkerTaskQuery.ts');
const P = require('../../src/features/DistributedSchedulingPolicy.ts');
const { cleanupDigest } = require('../../src/features/PlanCleanup.ts');
const { completionIdentity, hasVerifiedCompletion } = require('../../src/features/VerifiedCompletion.ts');
const now = Date.now(), iso = n => new Date(n).toISOString();
const immediate = () => new Promise(setImmediate);

function fixtures(time = now) {
  const job = (index, caseName, seed, status, commandId, extra = {}) => ({
    index, case: caseName, seed, lifecycleProtocol: 2, status, workerId: 'w', commandId, outputDir: 'work/' + commandId, ...extra });
  const solid = job(0, 'a', 1, 'completed', 'solid');
  const stopping = job(4, 'e', 5, 'completed', 'recall', { recallRequested: true });
  const queue = { schemaVersion: 1, plans: [
    { id: 'plan1', projectId: 'p', planFile: 'one.yaml', revision: 'r', codeFingerprint: 'f', enqueuedAt: iso(time - 50000),
      resultPathPolicy: 'declared', planJobCount: 4, jobs: [solid, job(1, 'b', 2, 'running', 'run'),
        job(2, 'c', 3, 'unknown', 'unk'), job(3, 'd', 4, 'failed', 'fail')] },
    { id: 'plan2', projectId: 'p', planFile: 'two.yaml', revision: 'r', codeFingerprint: 'f', enqueuedAt: iso(time - 40000),
      resultPathPolicy: 'declared', planJobCount: 1, jobs: [stopping] } ] };
  const proof = job => ({ schemaVersion: 1, identity: completionIdentity(queue.plans[0], job), verifiedAt: iso(time - 60000), exitCode: 0 });
  solid.verifiedCompletion = proof(solid); stopping.verifiedCompletion = proof(stopping);
  assert.equal(hasVerifiedCompletion(queue.plans[0], solid), true);
  const row = commandId => ({ projectId: 'p', workerId: 'w', commandId, outputDir: 'work/' + commandId,
    observation: { lifecycleProtocol: 2, commandId, projectId: 'p', workerId: 'w', observedAt: iso(time),
      evidence: { execution: { networkStartedAt: iso(time), receivedAt: iso(time) } }, tmux: { dead: true, exitCode: 0 } } });
  const inventory = () => ({ schemaVersion: 1, executionOnly: true, queryComplete: true, generatedAt: iso(time),
    capabilities: { taskLifecycle: 2, durablePlanQueue: true, schemaVersion: 1 },
    tasks: ['solid', 'run', 'unk', 'fail', 'recall'].map(row) });
  return { queue, solid, stopping, inventory, row };
}

test('automatic query selection never re-observes a solidified completion but keeps every live or stopping identity', () => {
  const f = fixtures();
  const ids = options => TaskQuery.workerTaskQueries(f.queue, 'w', options).map(q => q.commandId).sort();
  const automatic = ids({ excludeVerifiedCompleted: true });
  assert.equal(automatic.includes('solid'), false, 'solidified exit-0 completion must not receive automatic progress/log/artifact rechecks');
  for (const live of ['run', 'unk', 'fail', 'recall']) assert.equal(automatic.includes(live), true, live + ' must stay observable');
  const manual = ids({});
  for (const all of ['solid', 'run', 'unk', 'fail', 'recall']) assert.equal(manual.includes(all), true, 'manual exact checks still query every identity');
});

test('a solidified completion releases its Worker from automatic freshness hotness while unverified completion stays hot', () => {
  const f = fixtures();
  const settled = structuredClone(f.queue); settled.plans.pop();
  settled.plans[0].jobs = [settled.plans[0].jobs[0], settled.plans[0].jobs[3]]; // solidified + terminal failed only
  const staleSnapshot = { workerId: 'w', fetchedAt: iso(now - 30000), queryComplete: true,
    tasks: [{ ...f.solid, projectId: 'p', observation: { runtimeDiagnostics: { schemaVersion: 1, commandId: 'solid', runId: 'solid', state: 'scanning', count: 0, scanComplete: false } } }] };
  assert.deepEqual(P.progressRefreshWorkerIds(settled, ['w'], [staleSnapshot]), [],
    'solidified completion with a stale snapshot must not keep the Worker hot');
  const unverified = structuredClone(settled); delete unverified.plans[0].jobs[0].verifiedCompletion;
  assert.deepEqual(P.progressRefreshWorkerIds(unverified, ['w'], [staleSnapshot]), ['w'],
    'a completion without solid proof must keep its hotness until artifacts confirm it');
  assert.deepEqual(P.progressRefreshWorkerIds(f.queue, ['w'], [staleSnapshot]), ['w'],
    'a confirmed completion with a recall request still stays under observation');
});

test('progress observation lanes skip solidified identities even while their dead pane is still in the execution inventory', async () => {
  const f = fixtures();
  const batches = [];
  const client = { getWorkerTasks: async (_, options) => {
    batches.push(options.queries.map(q => q.commandId));
    return { queryComplete: true, resultsOnly: true, metadataOnly: true, capabilities: { taskLifecycle: 2, schemaVersion: 1 },
      tasks: options.queries.map(q => ({ ...q, observation: { lifecycleProtocol: 2, commandId: q.commandId, projectId: 'p',
        workerId: 'w', observedAt: iso(now), result: { runId: q.commandId, status: 'completed', present: true, verified: true,
        artifactsComplete: true }, runtimeDiagnostics: { schemaVersion: 1, commandId: q.commandId, runId: q.commandId,
        state: 'clear', count: 0, bytesRead: 4096, totalBytes: 4096, scanComplete: true } } })) };
  } };
  const execution = { generatedAt: iso(now), tasks: f.inventory().tasks };
  const snapshot = await W.queryWorkerProgress(client, 'w', [], execution, { deferDiagnostics: true, excludeVerified: new Set(['p:solid']) });
  assert.equal(batches.flat().includes('solid'), false, 'no artifact or log batch may name the solidified job');
  for (const live of ['run', 'unk', 'fail', 'recall']) assert.equal(batches.flat().includes(live), true, live + ' still receives observation');
  assert.ok(snapshot.tasks.some(task => task.commandId === 'solid'), 'the inventory row itself stays published for display');
  const withoutExclusion = [];
  await W.queryWorkerProgress({ getWorkerTasks: async (_, options) => {
    withoutExclusion.push(options.queries.map(q => q.commandId));
    return { queryComplete: true, resultsOnly: true, metadataOnly: true, tasks: options.queries.map(q => ({ ...q, observation: { result: { runId: q.commandId } } })) };
  } }, 'w', [], execution, { deferDiagnostics: true });
  assert.equal(withoutExclusion.flat().includes('solid'), true, 'manual rounds keep the pre-existing full observation behaviour');
});

function providerHarness(f, client) {
  const source = fs.readFileSync(require.resolve('../../src/extension/legacy.ts'), 'utf8');
  const ast = ts.createSourceFile('legacy.ts', source, ts.ScriptTarget.Latest, true);
  const cls = ast.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'RealtimeTunnelPanelProvider');
  const names = ['readWorkerTaskSnapshot', 'refreshWorkerTaskSnapshot', 'refreshServerPlanProgress'];
  const code = 'class Provider {' + cls.members.filter(node => names.includes(node.name?.getText(ast))).map(node => node.getText(ast)).join('\n') + '}; Provider;';
  const Provider = vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText,
    { AbortController, setTimeout, clearTimeout, workspaceRoot: () => '/project', mapLimited: async (rows, _limit, callback) => Promise.all(rows.map(callback)),
      cleanupDigest, WorkerTaskQuery: TaskQuery, WorkerProgressQuery: W, DistributedSchedulingPolicy: P,
      workerTaskSnapshotPayload: value => value, workerTaskLooksRunning: task => task.status === 'running',
      RequestBudget_1: { RequestBudgetDeniedError: class extends Error {} }, errorMessage: error => String(error?.message || error),
      hasVerifiedCompletion });
  const provider = new Provider(), published = [], cache = new Map();
  provider.workerTaskRequests = new Map();
  provider.workerTaskSnapshotRevision = 0;
  provider.loadDistributedQueue = async () => f.queue;
  provider.cachedWorkerTaskSnapshot = (_id, _root, key) => cache.get(key);
  provider.storeWorkerTaskSnapshot = (_key, value) => { cache.set('snap', value); published.push(value); provider.workerTaskSnapshotRevision++; };
  provider.noteWorkerTaskPlanStatus = () => {};
  provider.postState = () => {};
  provider.distributedQueueRoot = '/project';
  provider.distributedQueueCache = f.queue;
  provider.isRealtimeMode = () => true;
  provider.workerActionTargets = () => [{ id: 'w' }];
  provider.client = { clients: new Map([['w', { progressGeneration: 0 }]]), getWorkerTasks: (id, options) => client.getWorkerTasks(id, options) };
  return { provider, published };
}

function observationClient(f, behaviour = {}) {
  const state = { executions: 0, observationBatches: [], logBatches: [], executionGate: behaviour.executionGate };
  state.getWorkerTasks = async (_workerId, options) => {
    if (options.executionOnly) {
      state.executions++;
      if (state.executionGate) await state.executionGate;
      return f.inventory();
    }
    if (options.diagnosticsOnly) {
      state.logBatches.push(options.queries.map(q => q.commandId));
      if (behaviour.hangLogs) return new Promise(() => {});
      return { queryComplete: true, diagnosticsOnly: true, tasks: options.queries.map(q => ({ ...q,
        observation: { runtimeDiagnostics: { schemaVersion: 1, commandId: q.commandId, runId: q.commandId, state: 'clear', count: 0, bytesRead: 4096, totalBytes: 4096, scanComplete: true } } })) };
    }
    state.observationBatches.push(options.queries.map(q => q.commandId));
    return { queryComplete: true, resultsOnly: true, metadataOnly: true, capabilities: { taskLifecycle: 2, schemaVersion: 1 },
      tasks: options.queries.map(q => ({ ...q, observation: { lifecycleProtocol: 2, commandId: q.commandId, projectId: 'p',
        workerId: 'w', observedAt: iso(now), result: { runId: q.commandId, status: 'completed', present: true, verified: true, artifactsComplete: true } } })) };
  };
  return state;
}

test('one automatic round fetches the real execution inventory once for warm-up, full and tick readers', async () => {
  const f = fixtures();
  let release; const gate = new Promise(resolve => { release = resolve; });
  const client = observationClient(f, { executionGate: gate });
  const { provider } = providerHarness(f, client);
  const warm = provider.readWorkerTaskSnapshot('w', { fresh: true, executionOnly: true });
  const full = provider.readWorkerTaskSnapshot('w', { fresh: true, excludeVerifiedCompleted: true });
  const tick = provider.readWorkerTaskSnapshot('w', { fresh: true, executionOnly: true });
  await immediate();
  release();
  await Promise.all([warm, full, tick]);
  assert.equal(client.executions, 1, 'concurrent helpers in one round must share exactly one live tmux inventory RPC');
  assert.equal(client.observationBatches.flat().includes('solid'), false);
  assert.equal(client.observationBatches.flat().includes('run'), true);
  await provider.readWorkerTaskSnapshot('w', { fresh: true, executionOnly: true });
  assert.equal(client.executions, 2, 'a new round must fetch a fresh inventory instead of reusing the old cache');
});

test('solidified jobs receive zero job-specific queries across repeated automatic rounds', async () => {
  const f = fixtures();
  const client = observationClient(f);
  const { provider } = providerHarness(f, client);
  for (let round = 0; round < 4; round++) {
    await provider.refreshServerPlanProgress({ automatic: true });
    assert.equal(client.observationBatches.flat().includes('solid'), false, 'round ' + round + ' must not re-observe the solidified job');
    assert.equal(client.logBatches.flat().includes('solid'), false, 'round ' + round + ' must not re-scan the solidified log');
    for (const live of ['run', 'unk', 'fail', 'recall']) assert.equal(client.observationBatches.flat().includes(live), true);
    assert.equal(client.executions >= round + 1, true, 'global execution inventory monitoring keeps running every round');
    client.observationBatches.length = 0; client.logBatches.length = 0;
  }
});

test('a manual exact check is never coalesced behind the filtered automatic round and still observes the solidified job', async () => {
  const f = fixtures();
  let release; const gate = new Promise(resolve => { release = resolve; });
  const client = observationClient(f, { executionGate: gate });
  const { provider } = providerHarness(f, client);
  const automatic = provider.readWorkerTaskSnapshot('w', { fresh: true, excludeVerifiedCompleted: true });
  await immediate();
  const manual = provider.readWorkerTaskSnapshot('w', { fresh: true });
  await immediate();
  release();
  await Promise.all([automatic, manual]);
  const solidBatches = client.observationBatches.filter(batch => batch.includes('solid'));
  assert.equal(solidBatches.length >= 1, true, 'the manual round must re-observe the exact solidified identity');
  assert.equal(client.executions, 1, 'manual and automatic rounds still share the one live inventory RPC');
});

test('a hung log scan cannot block artifact publication or the execution channel used by scheduling and precise stop', async () => {
  const f = fixtures();
  const client = observationClient(f, { hangLogs: true });
  const { provider, published } = providerHarness(f, client);
  const round = provider.readWorkerTaskSnapshot('w', { fresh: true, excludeVerifiedCompleted: true });
  await round;
  assert.ok(published.some(snapshot => snapshot.tasks?.some(task => task.observation?.result?.verified === true)),
    'artifact lanes publish while the deferred log reader stays hung');
  const inventoriesBefore = client.executions;
  await provider.readWorkerTaskSnapshot('w', { fresh: true, executionOnly: true });
  assert.equal(client.executions, inventoriesBefore + 1, 'the scheduling/stop execution channel keeps polling while logs hang');
  assert.equal(client.logBatches.flat().includes('solid'), false, 'even the background log queue must not re-scan the solidified identity');
});

test('clearing the solid proof (manual counter-evidence path) immediately re-admits automatic observation', () => {
  const f = fixtures();
  delete f.solid.verifiedCompletion;
  assert.equal(hasVerifiedCompletion(f.queue.plans[0], f.solid), false);
  const automatic = TaskQuery.workerTaskQueries(f.queue, 'w', { excludeVerifiedCompleted: true }).map(q => q.commandId);
  assert.equal(automatic.includes('solid'), true, 'after genuine counter-evidence revokes the proof the job is queried again');
});

test('refreshServerPlanProgress only filters the automatic full read, never the inventory or manual rounds', async () => {
  const f = fixtures();
  const calls = [];
  const client = observationClient(f);
  const { provider } = providerHarness(f, client);
  provider.readWorkerTaskSnapshot = async (_id, options = {}) => { calls.push(options); return {}; };
  await provider.refreshServerPlanProgress({ automatic: true });
  assert.equal(calls.some(call => call.executionOnly === true && call.excludeVerifiedCompleted === undefined), true,
    'execution inventory polling stays unfiltered global monitoring');
  assert.equal(calls.some(call => !call.executionOnly && call.excludeVerifiedCompleted === true), true,
    'automatic full reads carry the solidified exclusion');
  calls.length = 0;
  await provider.refreshServerPlanProgress();
  assert.equal(calls.some(call => !call.executionOnly && call.excludeVerifiedCompleted === false), true,
    'manual progress refresh keeps observing solidified identities');
});
