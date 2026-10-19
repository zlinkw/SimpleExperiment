// Item 85/167 provider-side evidence: a successful automatic inventory round
// stores the Worker's carried GPU sample in the bounded host ring with its own
// seq/collected time (idempotent across the shared/direct layers), the UI window
// accessor clips locally from the ring without any remote request, and agents
// that carry nothing keep working with an empty ring. The provider methods are
// extracted from the real source; the recording client answers the same request
// shapes proven in autoFallbackWideReadGuard.test.js.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), ts = require('typescript'), vm = require('node:vm');
require('../_helpers/registerTsRequire');
const W = require('../../src/features/WorkerProgressQuery.ts');
const TaskQuery = require('../../src/features/WorkerTaskQuery.ts');
const P = require('../../src/features/DistributedSchedulingPolicy.ts');
const { cleanupDigest } = require('../../src/features/PlanCleanup.ts');
const { GpuSampleRing } = require('../../src/features/GpuSampleRing.ts');
const now = Date.now(), iso = n => new Date(n).toISOString();

function harness(carriedSeq) {
  const job = (index, status, commandId, extra = {}) => ({
    index, case: commandId, seed: index, lifecycleProtocol: 2, status, workerId: 'w', commandId, outputDir: 'work/' + commandId, ...extra });
  const solid = job(0, 'completed', 'solid');
  const queue = { schemaVersion: 1, plans: [{ id: 'plan1', projectId: 'p', planFile: 'one.yaml', revision: 'r', codeFingerprint: 'f',
    enqueuedAt: iso(now - 50000), resultPathPolicy: 'declared', planJobCount: 1, jobs: [solid] }] };
  const reads = { execution: 0, gpuEndpoint: 0, other: 0 };
  const client = {
    clients: new Map([['w', { progressGeneration: 0 }]]),
    getWorkerTasks: async (_id, options) => {
      if (options.executionOnly) {
        reads.execution++;
        return {
          schemaVersion: 1, executionOnly: true, queryComplete: true, generatedAt: iso(now),
          capabilities: { taskLifecycle: 2, durablePlanQueue: true, schemaVersion: 1 }, cleanupExecutors: [], tasks: [],
          ...(carriedSeq === undefined ? {} : {
            gpuSample: { schemaVersion: 1, source: 'worker_telemetry', generatedAt: iso(now - 400), status: 'ok', error: '', seq: carriedSeq, epoch: 'boot-a', gpus: [{ index: '0', memoryUsed: 3210, utilization: 60 }] },
          }),
        };
      }
      reads.other++;
      return { schemaVersion: 1, queryComplete: true, tasks: [], capabilities: { taskLifecycle: 2 } };
    },
    getGpu: async () => { reads.gpuEndpoint++; throw new Error('automatic rounds must not read the separate GPU endpoint'); },
  };
  const source = fs.readFileSync(require.resolve('../../src/extension/legacy.ts'), 'utf8');
  const ast = ts.createSourceFile('legacy.ts', source, ts.ScriptTarget.Latest, true);
  const cls = ast.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'RealtimeTunnelPanelProvider');
  const names = ['readWorkerTaskSnapshot', 'refreshWorkerTaskSnapshot', 'gpuWindowSamplesFromUi'];
  const code = 'class Provider {' + cls.members.filter(node => names.includes(node.name?.getText(ast))).map(node => node.getText(ast)).join('\n') + '}; Provider;';
  const Provider = vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText,
    { AbortController, setTimeout, clearTimeout, workspaceRoot: () => '/project', mapLimited: async (rows, _limit, callback) => Promise.all(rows.map(callback)),
      cleanupDigest, WorkerTaskQuery: TaskQuery, WorkerProgressQuery: W, DistributedSchedulingPolicy: P,
      workerTaskSnapshotPayload: value => value, workerTaskLooksRunning: task => task.status === 'running',
      RequestBudget_1: { RequestBudgetDeniedError: class extends Error {} }, errorMessage: error => String(error?.message || error) });
  const provider = new Provider(), cache = new Map(), posts = [];
  provider.workerTaskRequests = new Map();
  provider.workerTaskSnapshotRevision = 0;
  provider.loadDistributedQueue = async () => queue;
  provider.cachedWorkerTaskSnapshot = (_id, _root, key) => cache.get(key);
  provider.storeWorkerTaskSnapshot = (key, value) => { cache.set(key, value); };
  provider.noteWorkerTaskPlanStatus = () => {};
  provider.postState = () => {};
  provider.gpuSampleRing = new GpuSampleRing();
  provider.view = { webview: { postMessage: async message => { posts.push(message); return true; } } };
  provider.client = client;
  return { provider, cache, client, reads, posts };
}

test('a successful automatic round stores the carried sample with the Worker seq and collected time; repeats stay idempotent', async () => {
  const h = harness(7);
  await h.provider.refreshWorkerTaskSnapshot('w', '/project', '/project\u0000w', { excludeVerifiedCompleted: true });
  const stored = h.provider.gpuSampleRing.latest('w');
  assert.ok(stored, 'the ring received the sample carried by this round');
  assert.equal(stored.seq, 7, 'the Worker seq is kept');
  assert.equal(stored.collectedAt, now - 400, 'the Worker-collected time is kept, not the host receive time');
  assert.equal(h.reads.gpuEndpoint, 0, 'the automatic round never read the separate GPU endpoint');
  await h.provider.refreshWorkerTaskSnapshot('w', '/project', '/project\u0000w', { excludeVerifiedCompleted: true });
  assert.equal(h.provider.gpuSampleRing.size('w'), 1, 'the same seq through the shared layers is stored once');
});

test('the window accessor clips locally and posts the frames without touching any remote endpoint', async () => {
  const h = harness(7);
  await h.provider.refreshWorkerTaskSnapshot('w', '/project', '/project\u0000w', { excludeVerifiedCompleted: true });
  const inside = await h.provider.gpuWindowSamplesFromUi({ workerId: 'w', start: now - 1000, end: now });
  assert.equal(inside.length, 1, 'the stored frame lies inside the requested window');
  const outside = await h.provider.gpuWindowSamplesFromUi({ workerId: 'w', start: now + 1, end: now + 5000 });
  assert.equal(outside.length, 0, 'window switching clips locally with no remote history request');
  assert.equal(h.reads.other + h.reads.gpuEndpoint, 0, 'no GPU history or endpoint read happened for window switching');
  assert.equal(h.posts.at(-1).type, 'gpuWindowSamples', 'the clipped window is posted to the panel over the existing channel');
  await assert.rejects(() => h.provider.gpuWindowSamplesFromUi({ workerId: 'w', start: 10, end: 5 }), /窗口范围无效/);
  await assert.rejects(() => h.provider.gpuWindowSamplesFromUi({ start: 0, end: 5 }), /需要指定 Worker/);
});

test('an older agent without a carried sample keeps working and leaves the ring empty', async () => {
  const h = harness(undefined);
  const snapshot = await h.provider.refreshWorkerTaskSnapshot('w', '/project', '/project\u0000w', { excludeVerifiedCompleted: true });
  assert.ok(snapshot, 'the round still completes');
  assert.equal(h.provider.gpuSampleRing.size('w'), 0, 'nothing is fabricated when the Worker carried no sample');
  assert.equal(h.reads.execution, 1);
});
