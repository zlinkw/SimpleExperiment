// Item 85/50 host-side channel evidence. The RealtimeTunnelClient members that
// accept a GPU sample carried by the execution inventory, that skip the separate
// fallback getGpu read while a carried sample is fresh, and the bounded host ring
// with seq/epoch/dedup/isolation/local window clipping are exercised for real:
// class members and module-local helpers are extracted from the actual sources;
// only the transport boundary (http) and the plain read coalescer (a pass-through
// for a single call in these tests) are recorded.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), ts = require('typescript'), vm = require('node:vm');
require('../_helpers/registerTsRequire');
const Reducer = require('../../src/tunnel/RealtimeEventReducer.legacy.ts');
const { GpuSampleRing } = require('../../src/features/GpuSampleRing.ts');
const now = Date.now(), iso = n => new Date(n).toISOString();

const sourceText = fs.readFileSync(require.resolve('../../src/tunnel/RealtimeTunnelClient.legacy.ts'), 'utf8');
const ast = ts.createSourceFile('RealtimeTunnelClient.legacy.ts', sourceText, ts.ScriptTarget.Latest, true);
const cls = ast.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'RealtimeTunnelClient');
function member(name) {
  const found = cls.members.find(node => node.name?.getText(ast) === name);
  assert.ok(found, 'class member ' + name + ' must exist');
  return found.getText(ast);
}
function topLevelFunction(name) {
  const found = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(found, 'module function ' + name + ' must exist');
  return found.getText(ast);
}
const code = [
  topLevelFunction('gpuSnapshotRows'), topLevelFunction('isHardConnectionError'),
  topLevelFunction('objectRecord'), topLevelFunction('message'),
  'class T {' + ['getWorkerTasks', 'readSnapshot', 'snapshotFallbackDelayMs', 'acceptWorkerGpuSample', 'isWorkerTelemetryEndpoint', 'workerEndpointId'].map(member).join('\n') + '}; T;',
].join('\n');
const Client = vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText,
  { AbortController, applySnapshot: Reducer.applySnapshot });

function clientHarness(carried) {
  const reads = { workerTasks: 0, gpu: 0 };
  const states = [];
  const client = new Client();
  client.requiresManualReconnect = false;
  client.connectionGeneration = 1;
  client.disposed = false;
  client.status = 'sse';
  client.hidden = false;
  client.lastError = '';
  client.snapshotInFlight = undefined;
  client.snapshotAbort = undefined;
  client.protectedLogKeys = [];
  client.policy = { mode: 'always' };
  client.reconnectPolicy = { reset() { } };
  client.connectionLost = () => { throw new Error('unexpected connectionLost'); };
  client.endpoint = { id: 'srv1', capabilities: { mode: 'worker_telemetry' } };
  client.state = Reducer.createRealtimeState();
  client.onState = value => states.push(value);
  // SharedReadCoalescer only deduplicates concurrent identical reads; with one
  // call per turn it is a pass-through of the real read.
  client.coalescedRead = (_key, _options, run) => Promise.resolve().then(run);
  client.http = {
    getWorkerTasks: async () => { reads.workerTasks++; return carried; },
    getGpu: async () => {
      reads.gpu++;
      return { schemaVersion: 1, source: 'worker_telemetry', generatedAt: iso(now), status: 'ok', error: '', seq: 900, epoch: 'fresh-boot', gpus: [{ index: '1', memoryUsed: 1, utilization: 1 }] };
    },
  };
  return { client, reads, states };
}

const carriedSample = { schemaVersion: 1, source: 'worker_telemetry', generatedAt: iso(now - 500), status: 'ok', error: '', seq: 7, epoch: 'boot-a', gpus: [{ index: '0', memoryUsed: 2222, utilization: 55 }] };

test('an execution inventory carrying the Worker sample updates the existing in-memory GPU state without re-stamping its time', async () => {
  const h = clientHarness({ schemaVersion: 1, executionOnly: true, queryComplete: true, tasks: [], gpuSample: carriedSample });
  await h.client.getWorkerTasks({ executionOnly: true });
  assert.equal(Object.keys(h.client.state.gpu).length, 1, 'the carried sample populated the shared GPU state');
  assert.equal(h.client.state.workerHealth.srv1.updatedAt, carriedSample.generatedAt, 'the Worker-collected time is kept as-is');
  assert.ok(h.states.length >= 1, 'listeners were notified');
  const older = { ...carriedSample, seq: 6, generatedAt: iso(now - 60000), gpus: [{ index: '0', memoryUsed: 1, utilization: 1 }] };
  await h.client.getWorkerTasks({ executionOnly: true, queries: [{ projectId: 'p', commandId: 'x', workerId: 'w', outputDir: 'work/x' }] })
    .catch(() => undefined);
  h.client.http.getWorkerTasks = async () => ({ schemaVersion: 1, executionOnly: true, queryComplete: true, tasks: [], gpuSample: older });
  await h.client.getWorkerTasks({ executionOnly: true });
  assert.equal(h.client.state.workerHealth.srv1.updatedAt, carriedSample.generatedAt, 'an older carried sample cannot rewind or overwrite fresher evidence');
});

test('the fallback poll skips the separate getGpu read while a carried sample is fresh, and samples again once freshness ends', async () => {
  const fresh = clientHarness({ schemaVersion: 1, executionOnly: true, tasks: [], gpuSample: carriedSample });
  await fresh.client.getWorkerTasks({ executionOnly: true });
  await fresh.client.readSnapshot(false, true);
  assert.equal(fresh.reads.gpu, 0, 'poll with a just-carried sample does not read getGpu a second time');
  assert.ok(fresh.client.state.gpu.srv1?.length, 'the poll still publishes the carried rows');
  const stale = clientHarness({ schemaVersion: 1, executionOnly: true, tasks: [], gpuSample: carriedSample });
  await stale.client.getWorkerTasks({ executionOnly: true });
  stale.client.workerGpuUpdatedAt = now - 600000; // 10 minutes ago: beyond the 2x poll window
  await stale.client.readSnapshot(false, true);
  assert.equal(stale.reads.gpu, 1, 'once the carried sample is old the poll samples again honestly');
  const boot = clientHarness({ schemaVersion: 1, executionOnly: true, tasks: [], gpuSample: carriedSample });
  boot.client.workerGpuUpdatedAt = now; // fresh, but this is the bootstrap read
  await boot.client.readSnapshot(false, false);
  assert.equal(boot.reads.gpu, 1, 'bootstrap never skips the initial read');
});

test('the bounded ring rejects foreign sources, duplicate and out-of-order seq, isolates workers and clips windows locally without synthesis', () => {
  const ring = new GpuSampleRing(4);
  const sample = (seq, epoch = 'e1', at = now + seq) => ({ schemaVersion: 1, source: 'worker_telemetry', generatedAt: iso(at), seq, epoch, gpus: [{ index: '0', memoryUsedMb: seq }] });
  assert.equal(ring.push('w1', { ...sample(1), source: 'hub' }), false, 'foreign source rejected');
  assert.equal(ring.push('w1', { ...sample(2), epoch: '', seq: undefined }), false, 'unstable stamps rejected');
  assert.equal(ring.push('w1', sample(1)), true);
  assert.equal(ring.push('w1', sample(1)), false, 'duplicate seq ignored');
  assert.equal(ring.push('w1', sample(0)), false, 'out-of-order seq ignored');
  assert.equal(ring.push('w2', sample(1)), true, 'a second Worker keeps an independent run');
  for (const seq of [2, 3, 4, 5, 6]) assert.equal(ring.push('w1', sample(seq)), true);
  assert.equal(ring.size('w1'), 4, 'the ring is bounded to its capacity');
  assert.equal(ring.latest('w1').seq, 6);
  assert.equal(ring.push('w1', sample(3)), false, 'old-generation seq after the cap is still refused');
  const clipped = ring.slice('w1', { start: now + 6, end: now + 6, maxPoints: 10 });
  assert.deepEqual(clipped.map(s => s.seq), [6], 'window clipping keeps only stored collected frames');
  const thinned = ring.slice('w1', { start: now + 3, end: now + 6, maxPoints: 2 });
  assert.ok(thinned.every(frame => [3, 4, 5, 6].includes(frame.seq)), 'thinning selects stored frames only, never interpolates between them');
  assert.equal(thinned[thinned.length - 1].seq, 6, 'the newest stored frame survives thinning');
  assert.equal(ring.slice('w2', { start: 0, end: Number.MAX_SAFE_INTEGER })[0].epoch, 'e1', 'the other Worker kept its own run');
});

test('a late old-epoch frame can never roll back the current run, while a genuine restart with newer real time is accepted even if its monotonic clock reset', () => {
  const ring = new GpuSampleRing(900);
  const sample = (seq, epoch, at) => ({ schemaVersion: 1, source: 'worker_telemetry', generatedAt: iso(at), seq, epoch, gpus: [{ index: '0', memoryUsedMb: seq }] });
  // Old agent generation e1 delivered two frames.
  assert.equal(ring.push('w1', sample(1, 'e1', now - 4000)), true);
  assert.equal(ring.push('w1', sample(2, 'e1', now - 2000)), true);
  // The agent restarts (monotonic clock may reset; real wall time is newer).
  assert.equal(ring.push('w1', sample(1, 'e2', now)), true);
  assert.equal(ring.size('w1'), 1, 'the restarted generation starts a fresh run');
  // A response from the OLD request finally arrives after the restart.
  assert.equal(ring.push('w1', sample(3, 'e1', now - 1000)), false, 'a late old-epoch frame cannot wipe the newer run');
  assert.equal(ring.size('w1'), 1, 'the current history survived the late frame (no self-heal wait)');
  assert.equal(ring.latest('w1').epoch, 'e2', 'the live generation stays current');
  // The live generation continues normally.
  assert.equal(ring.push('w1', sample(2, 'e2', now + 1000)), true);
  assert.equal(ring.size('w1'), 2, 'the active restart generation keeps accepting its own frames');
  // A replaced endpoint client (reconnect) on the SAME live agent continues by seq.
  assert.equal(ring.push('w1', sample(3, 'e2', now + 2000), { token: { client: 'new' } }), true, 'reconnect attribution continues the live run by seq');
  assert.equal(ring.push('w1', sample(3, 'e2', now + 3000), { token: { client: 'old-replay' } }), false, 'a replayed seq from any client stays refused');
  // Machine reboot: monotonic restarted from zero, wall clock newer, epoch fresh.
  assert.equal(ring.push('w1', sample(1, 'e3', now + 60000)), true, 'a rebooted agent is accepted by real time despite a reset monotonic clock');
  assert.equal(ring.size('w1'), 1);
});
