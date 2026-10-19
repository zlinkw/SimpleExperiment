// Item 39 scope guard: an automatic round on a protocol-2 Worker must never widen
// into the legacy full task_query (GET /api/worker/tasks or a POST without the
// selected/observation mode), because the real agent answers that with manifest and
// dead-pane log reads for EVERY inventory row, including solidified completions
// (proved by taskQueryWideReadRealChain.test.js on the extracted runtime chain).
// The provider method and the real HttpTunnelClient.getWorkerTasks routing branch
// are extracted from the actual sources; only requestJson (the HTTP boundary) is
// recorded and answered.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), ts = require('typescript'), vm = require('node:vm');
require('../_helpers/registerTsRequire');
const W = require('../../src/features/WorkerProgressQuery.ts');
const TaskQuery = require('../../src/features/WorkerTaskQuery.ts');
const P = require('../../src/features/DistributedSchedulingPolicy.ts');
const { cleanupDigest } = require('../../src/features/PlanCleanup.ts');
const { completionIdentity, hasVerifiedCompletion } = require('../../src/features/VerifiedCompletion.ts');
const now = Date.now(), iso = n => new Date(n).toISOString();

function fixtures(mode, emptySeed = false) {
  const job = (index, status, commandId, extra = {}) => ({
    index, case: commandId, seed: index, lifecycleProtocol: 2, status, workerId: 'w', commandId, outputDir: 'work/' + commandId, ...extra });
  const solid = job(0, 'completed', 'solid');
  const plan1 = { id: 'plan1', projectId: 'p', planFile: 'one.yaml', revision: 'r', codeFingerprint: 'f', enqueuedAt: iso(now - 50000),
    resultPathPolicy: 'declared', planJobCount: 4, jobs: [solid, job(1, 'running', 'run'), job(2, 'unknown', 'unk'), job(3, 'failed', 'fail')] };
  const plan2 = { id: 'plan2', projectId: 'p', planFile: 'two.yaml', revision: 'r', codeFingerprint: 'f', enqueuedAt: iso(now - 40000),
    resultPathPolicy: 'declared', planJobCount: 1, jobs: [job(4, 'completed', 'recall', { recallRequested: true })] };
  const queue = { schemaVersion: 1, plans: [plan1, plan2] };
  solid.verifiedCompletion = { schemaVersion: 1, identity: completionIdentity(plan1, solid), verifiedAt: iso(now - 60000), exitCode: 0 };
  queue.plans[1].jobs[0].verifiedCompletion = { schemaVersion: 1, identity: completionIdentity(plan2, queue.plans[1].jobs[0]), verifiedAt: iso(now - 60000), exitCode: 0 };
  const row = commandId => ({ projectId: 'p', workerId: 'w', commandId, outputDir: 'work/' + commandId,
    observation: { lifecycleProtocol: 2, commandId, projectId: 'p', workerId: 'w', observedAt: iso(now),
      evidence: { execution: { networkStartedAt: iso(now), receivedAt: iso(now) } }, tmux: { dead: true, exitCode: 0 } } });
  const observedRows = () => ['solid', 'run', 'unk', 'fail', 'recall'].map(id => ({ ...row(id),
    observation: { ...row(id).observation, result: { runId: id, status: 'completed', present: true, verified: true, artifactsComplete: true } } }));
  const lane = queries => ({ queryComplete: true, resultsOnly: true, metadataOnly: true, capabilities: { taskLifecycle: 2, schemaVersion: 1 },
    tasks: queries.map(q => ({ ...q, observation: { lifecycleProtocol: 2, commandId: q.commandId, projectId: 'p', workerId: 'w',
      observedAt: iso(now), result: { runId: q.commandId, status: 'completed', present: true, verified: true, artifactsComplete: true },
      runtimeDiagnostics: { schemaVersion: 1, commandId: q.commandId, runId: q.commandId, state: 'clear', count: 0, bytesRead: 4096, totalBytes: 4096, scanComplete: true } } })) });
  const calls = { all: [], executions: 0, wide: [], observationBatches: [], logBatches: [] };
  // Real HttpTunnelClient.getWorkerTasks: POST when a mode flag or non-empty queries
  // exist, otherwise GET /api/worker/tasks (the agent then runs task_query over the
  // whole inventory). Only requestJson is replaced by the recording boundary.
  const tunnelSource = fs.readFileSync(require.resolve('../../src/tunnel/TunnelClient.legacy.ts'), 'utf8');
  const tunnelAst = ts.createSourceFile('TunnelClient.legacy.ts', tunnelSource, ts.ScriptTarget.Latest, true);
  const tunnelClass = tunnelAst.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'HttpTunnelClient');
  const routeMethod = tunnelClass.members.find(node => node.name?.getText(tunnelAst) === 'getWorkerTasks');
  const routingCode = 'class Routing {' + routeMethod.getText(tunnelAst) +
    '\nrequestJson(path, purpose, payload, options) { return __zzDispatch(path, purpose, payload, options); } }; Routing;';
  const dispatch = (path, purpose, payload, options) => {
    const record = { path, method: options.method, body: payload };
    calls.all.push(record);
    const isWide = (options.method === 'GET' && path.startsWith('/api/worker/tasks'))
      || (path === '/api/worker/tasks/query' && payload && !payload.executionOnly && !payload.selectedOnly && !payload.declarationOnly);
    if (path === '/api/worker/tasks/diagnostics') {
      calls.logBatches.push((payload.queries || []).map(q => q.commandId));
      return Promise.resolve({ queryComplete: true, diagnosticsOnly: true, tasks: (payload.queries || []).map(q => ({ ...q,
        observation: { runtimeDiagnostics: { schemaVersion: 1, commandId: q.commandId, runId: q.commandId, state: 'clear', count: 0, bytesRead: 4096, totalBytes: 4096, scanComplete: true } } })) });
    }
    if (isWide) {
      calls.wide.push(record);
      // Real task_query shape: every current inventory row comes back observed.
      return Promise.resolve({ schemaVersion: 1, queryComplete: true, generatedAt: iso(now), cleanupExecutors: [], queryErrors: [],
        capabilities: { taskLifecycle: 2, durablePlanQueue: true, schemaVersion: 1 }, tasks: mode === 'invEmpty' ? [] : observedRows() });
    }
    if (payload.executionOnly) {
      calls.executions++;
      if (mode === 'invFail') return Promise.reject(new Error('tmux inventory unavailable'));
      return Promise.resolve({ schemaVersion: 1, executionOnly: true, queryComplete: true, generatedAt: iso(now),
        capabilities: { taskLifecycle: 2, durablePlanQueue: true, schemaVersion: 1 }, cleanupExecutors: [],
        tasks: mode === 'invEmpty' ? [] : observedRows().map(task => ({ ...task, observation: { ...task.observation, result: undefined } })) });
    }
    calls.observationBatches.push((payload.queries || []).map(q => q.commandId));
    return Promise.resolve(lane(payload.queries || []));
  };
  const Routing = vm.runInNewContext(ts.transpileModule(routingCode, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText,
    { URLSearchParams, __zzDispatch: dispatch });
  const routing = new Routing();
  // MultiEndpointRealtimeClient.getWorkerTasks(workerId, options) is a thin per-Worker
  // delegation; reproduced exactly, with the real HttpTunnelClient branch behind it.
  const client = { clients: new Map([['w', { progressGeneration: 0 }]]), getWorkerTasks: (_workerId, options) => routing.getWorkerTasks(options) };

  const source = fs.readFileSync(require.resolve('../../src/extension/legacy.ts'), 'utf8');
  const ast = ts.createSourceFile('legacy.ts', source, ts.ScriptTarget.Latest, true);
  const cls = ast.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'RealtimeTunnelPanelProvider');
  const names = ['readWorkerTaskSnapshot', 'refreshWorkerTaskSnapshot'];
  const code = 'class Provider {' + cls.members.filter(node => names.includes(node.name?.getText(ast))).map(node => node.getText(ast)).join('\n') + '}; Provider;';
  const Provider = vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText,
    { AbortController, setTimeout, clearTimeout, workspaceRoot: () => '/project', mapLimited: async (rows, _limit, callback) => Promise.all(rows.map(callback)),
      cleanupDigest, WorkerTaskQuery: TaskQuery, WorkerProgressQuery: W, DistributedSchedulingPolicy: P,
      workerTaskSnapshotPayload: value => value, workerTaskLooksRunning: task => task.status === 'running',
      RequestBudget_1: { RequestBudgetDeniedError: class extends Error {} }, errorMessage: error => String(error?.message || error),
      hasVerifiedCompletion });
  const provider = new Provider(), cache = new Map(), published = [];
  provider.workerTaskRequests = new Map();
  provider.workerTaskSnapshotRevision = 0;
  provider.loadDistributedQueue = async () => queue;
  provider.cachedWorkerTaskSnapshot = (_id, _root, key) => cache.get(key);
  provider.storeWorkerTaskSnapshot = (key, value) => { cache.set(key, value); published.push(value); provider.workerTaskSnapshotRevision++; };
  provider.noteWorkerTaskPlanStatus = () => {};
  provider.postState = () => {};
  provider.client = client;
  const cacheKey = '/project\u0000w';
  // A prior round already proved protocol 2 and published the solidified dead-window row.
  provider.storeWorkerTaskSnapshot(cacheKey, { workerId: 'w', schemaVersion: 1, queryComplete: true, generatedAt: iso(now - 90000),
    capabilities: { taskLifecycle: 2, durablePlanQueue: true, schemaVersion: 1 }, cleanupExecutors: [], fetchedAt: iso(now - 90000),
    tasks: emptySeed ? [] : observedRows() });
  calls.wide.length = 0; calls.executions = 0; calls.observationBatches.length = 0; calls.logBatches.length = 0; calls.all.length = 0;
  return { queue, plan1, solid, provider, cache, cacheKey, calls, published };
}

test('automatic round with a failed execution inventory never widens into the full task_query (counter-example guard)', async () => {
  const f = fixtures('invFail');
  f.queue.plans[0].jobs = [f.solid]; f.queue.plans[1].jobs = []; // only the solidified identity on this Worker
  const snapshot = await f.provider.refreshWorkerTaskSnapshot('w', '/project', f.cacheKey, { excludeVerifiedCompleted: true });
  assert.equal(f.calls.wide.length, 0, 'no GET /api/worker/tasks nor unselected POST may run: the real agent would read the solidified manifest and dead-pane log: ' + JSON.stringify(f.calls.all.map(c => [c.method, c.path])));
  assert.equal(f.calls.observationBatches.length, 0, 'no artifact lane names any job either');
  assert.equal(f.calls.logBatches.length, 0);
  assert.ok(snapshot, 'the round ends honestly instead of throwing out');
  assert.equal(f.solid.verifiedCompletion.exitCode, 0, 'the solid proof is untouched');
  const stored = f.cache.get(f.cacheKey);
  assert.ok(stored.tasks.some(task => task.commandId === 'solid'), 'the previous evidence frame is preserved, not wiped');
});

test('automatic round keeps live identities unobserved-but-honest when the inventory fails: no wide scan may substitute', async () => {
  const f = fixtures('invFail'); // full queue: live, unknown, failed and recall identities present
  await f.provider.refreshWorkerTaskSnapshot('w', '/project', f.cacheKey, { excludeVerifiedCompleted: true });
  assert.equal(f.calls.wide.length, 0, 'a non-empty selector list must not fall back to a selected_only=false POST, which reads every row server-side');
  assert.equal(f.calls.executions, 1, 'the execution inventory was attempted once');
});

test('automatic round with a valid but empty inventory ends on the execution frame without any wide read', async () => {
  const f = fixtures('invEmpty', true);
  f.queue.plans[0].jobs = [f.solid]; f.queue.plans[1].jobs = [];
  const snapshot = await f.provider.refreshWorkerTaskSnapshot('w', '/project', f.cacheKey, { excludeVerifiedCompleted: true });
  assert.equal(f.calls.wide.length, 0, 'the empty-inventory round must not issue the legacy wide read');
  assert.equal(f.calls.observationBatches.length, 0);
  assert.equal(f.calls.logBatches.length, 0);
  assert.equal(snapshot.tasks.length, 0, 'the honest empty execution truth is published, nothing is backfilled');
});

test('manual rounds keep the wide fallback available (user-initiated full read is not restricted)', async () => {
  const f = fixtures('invFail');
  f.queue.plans[0].jobs = [f.solid]; f.queue.plans[1].jobs = [];
  const snapshot = await f.provider.refreshWorkerTaskSnapshot('w', '/project', f.cacheKey, {});
  assert.equal(f.calls.wide.length, 1, 'the manual failed-inventory round still performs exactly one worker-wide read');
  assert.ok(f.calls.wide[0].method === 'GET' || f.calls.wide[0].body.queries.some(q => q.commandId === 'solid'),
    'the manual read is the legacy full task_query shape (GET-wide or an unselected named batch)');
  assert.ok(snapshot.tasks.some(task => task.commandId === 'solid'), 'the manual wide read really returns observed rows');
});

test('execution-only monitoring reads keep using the precise execution endpoint and report inventory failure honestly', async () => {
  const f = fixtures('invFail');
  let outcome;
  try { outcome = await f.provider.readWorkerTaskSnapshot('w', { executionOnly: true, fresh: true }); }
  catch (error) { outcome = { error: String(error?.message || error) }; }
  assert.ok(outcome && (outcome.error || JSON.stringify(outcome).includes('executionQueryError')),
    'the failed tick surfaces the failure in its frame instead of pretending success');
  assert.equal(f.calls.executions, 1, 'the global execution monitoring probe ran');
  assert.equal(f.calls.wide.length, 0, 'the tick never substitutes a wide read');
});

test('legacy protocol-1 automatic rounds keep the pre-existing fallback (the guard is protocol-2 scoped)', async () => {
  const f = fixtures('invFail');
  for (const plan of f.queue.plans) for (const job of plan.jobs) delete job.lifecycleProtocol;
  f.provider.storeWorkerTaskSnapshot(f.cacheKey, { workerId: 'w', schemaVersion: 1, queryComplete: true, generatedAt: iso(now - 90000),
    fetchedAt: iso(now - 90000), tasks: [] }); // no protocol-2 capability cached
  f.calls.wide.length = 0; f.calls.executions = 0;
  const snapshot = await f.provider.refreshWorkerTaskSnapshot('w', '/project', f.cacheKey, { excludeVerifiedCompleted: true });
  assert.equal(f.calls.wide.length, 1, 'a protocol-1 Worker without the precise protocol keeps its legacy snapshot read');
  assert.ok(snapshot);
});
