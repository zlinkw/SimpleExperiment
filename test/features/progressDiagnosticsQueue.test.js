const test = require('node:test'), assert = require('node:assert/strict');
require('../_helpers/registerTsRequire');
const W = require('../../src/features/WorkerProgressQuery.ts');
const { enqueueProgressDiagnostics, progressQuery } = require('../../src/features/WorkerProgressDiagnostics.ts');
const immediate = () => new Promise(setImmediate);
const waitFor = async predicate => { for (let i = 0; i < 100 && !predicate(); i++) await new Promise(r => setTimeout(r, 1)); assert.ok(predicate()); };
const query = id => ({ commandId: id, projectId: 'p', workerId: 'w', outputDir: 'work/' + id });
const observation = q => ({ ...q, lifecycleProtocol: 2, tmux: { dead: true, exitCode: 0 } });
const result = q => ({ ...q, observation: { ...observation(q), result: { runId: q.commandId, status: 'completed', present: true, verified: true, artifactsComplete: true } } });
const log = (q, offset, complete) => ({ ...q, observation: { runtimeDiagnostics: { schemaVersion: 1, commandId: q.commandId,
  runId: q.commandId, state: complete ? 'clear' : 'scanning', count: 0, bytesRead: offset, totalBytes: 786432, scanComplete: complete } } });

test('logs finish and publish even when another metadata batch consumes the round deadline', async () => {
  const queries = Array.from({ length: 8 }, (_, i) => query('c' + i)), controller = new AbortController(), snapshots = [];
  let metadataCalls = 0, logCalls = 0, release;
  const blocked = new Promise(r => { release = r; });
  const client = { getWorkerTasks: async (_, o) => {
    if (o.diagnosticsOnly) { logCalls++; return { queryComplete: true, tasks: o.queries.map(q => log(q, 786432, true)) }; }
    if (++metadataCalls > 1) return blocked;
    return { queryComplete: true, resultsOnly: true, metadataOnly: true, capabilities: { taskLifecycle: 2 }, tasks: o.queries.map(result) };
  } };
  const execution = { fetchedAt: new Date().toISOString(), queryComplete: true, capabilities: { taskLifecycle: 2 },
    tasks: queries.map(q => ({ ...q, observation: observation(q) })) };
  const pending = W.queryWorkerProgress(client, 'w', queries, execution, { signal: controller.signal,
    deferDiagnostics: true, onSnapshot: s => snapshots.push(s) });
  try {
    await waitFor(() => logCalls > 0);
    controller.abort(Object.assign(Error('metadata round deadline'), { code: 'TASK_QUERY_TIMEOUT' }));
    await pending;
    assert.ok(snapshots.some(s => s.tasks.some(t => t.commandId === 'c0' && t.completionState === 'verified')));
  } finally { release({ queryComplete: true, tasks: [] }); await pending; }
});

test('incremental scans autonomously reach EOF and share one request with continuous refreshes', async () => {
  const q = query('scan'), seen = [], reports = [];
  let release;
  const blocked = new Promise(r => { release = r; });
  const client = { getWorkerTasks: async (_, o) => {
    seen.push(o.queries.map(q => q.commandId));
    if (seen.length === 1) await blocked;
    return { queryComplete: true, tasks: o.queries.map(q => log(q, seen.length * 262144, seen.length >= 3)) };
  } };
  for (let i = 0; i < 24; i++) enqueueProgressDiagnostics(client, 'w', q, v => reports.push(v));
  assert.equal(seen.length, 1); release();
  await waitFor(() => reports.some(r => r.tasks[0].observation.runtimeDiagnostics.scanComplete));
  assert.equal(seen.length, 3); assert.equal(reports.length, 3);
});

test('long log scans rotate behind other exact runs and stop when no progress is made', async () => {
  const seen = [], client = { getWorkerTasks: async (_, o) => {
    seen.push(o.queries.map(q => q.commandId));
    await immediate(); return { queryComplete: true, tasks: o.queries.map(q => log(q, 262144, false)) };
  } };
  for (let i = 0; i < 7; i++) enqueueProgressDiagnostics(client, 'w', query('c' + i), () => {});
  await waitFor(() => seen.flat().includes('c6'));
  await new Promise(r => setTimeout(r, 25));
  const length = seen.length; await new Promise(r => setTimeout(r, 10)); assert.equal(seen.length, length);
  assert.ok(seen.slice(0, 3).flat().includes('c6'));
});

test('observation wire payload removes cached logs and launch source while preserving identity checks', () => {
  const q = { ...query('c'), collectionResultCsv: 'work/c/results.csv', experimentIndex: 4, case: 'PAD', seed: 44,
    executionMode: 'train_test', checkpointTestOnly: true, runtimeLogAnalysisId: 'explicit',
    observation: { tmux: {}, runtimeDiagnostics: { exceptions: [{ summary: 'x'.repeat(40000) }] } },
    sourceSnapshot: 'x'.repeat(100000), command: 'train.py', status: 'completed' };
  const compact = progressQuery(q);
  for (const field of ['commandId','projectId','workerId','outputDir','collectionResultCsv','experimentIndex','case','seed','executionMode','checkpointTestOnly','runtimeLogAnalysisId'])
    assert.equal(compact[field], q[field]);
  assert.ok(JSON.stringify(compact).length < JSON.stringify(q).length / 100);
  assert.equal(compact.observation, undefined); assert.equal(compact.sourceSnapshot, undefined);
});

test('old connection responses cannot publish logs after a generation change', async () => {
  let release, receipts = 0;
  const blocked = new Promise(r => { release = r; });
  const client = { progressGeneration: 1, getWorkerTasks: async () => blocked };
  enqueueProgressDiagnostics(client, 'w', query('c'), () => receipts++);
  client.progressGeneration = 2;
  release({ queryComplete: true, tasks: [log(query('c'), 10, true)] });
  await immediate(); assert.equal(receipts, 0);
});

test('Worker bootstrap selects SSE before cached capabilities exist', async () => {
  const { RealtimeTunnelClient } = require('../../src/tunnel/RealtimeTunnelClient.ts');
  const { RequestBudget } = require('../../src/tunnel/RequestBudget.ts');
  const client = new RealtimeTunnelClient({ id: 'w', role: 'worker', localHost: 'localhost', localPort: 1 }, new RequestBudget());
  let sse = 0, ws = 0;
  client.connectWebSocket = () => { ws++; throw Error('unadvertised WebSocket'); };
  client.connectSse = async () => { sse++; client.status = 'sse'; };
  client.http.getGpu = async () => ({ gpu: [] });
  try { await client.connect(); assert.equal(ws, 0); assert.equal(sse, 1); assert.equal(client.diagnostics().streamStatus, 'sse'); }
  finally { await client.disconnect('dispose'); }
});

test('slow GPU metadata preserves the open event stream but authentication failures still disconnect', async () => {
  const { RealtimeTunnelClient } = require('../../src/tunnel/RealtimeTunnelClient.ts');
  const { RequestBudget } = require('../../src/tunnel/RequestBudget.ts');
  const client = new RealtimeTunnelClient({ id: 'w', role: 'worker', localHost: 'localhost', localPort: 1 }, new RequestBudget());
  client.status = 'sse';
  const generation = client.progressGeneration;
  client.http.getGpu = async () => { throw Error('30 seconds without a GPU response'); };
  try {
    await assert.rejects(client.getSnapshot(), /GPU response/);
    assert.equal(client.diagnostics().streamStatus, 'sse'); assert.equal(client.progressGeneration, generation);
    assert.match(client.diagnostics().lastError, /遥测查询待核实/);
    client.http.getGpu = async () => { throw Error('Worker Agent HTTP 401: unauthorized'); };
    await assert.rejects(client.getSnapshot(), /401/);
    assert.equal(client.diagnostics().streamStatus, 'disconnected'); assert.equal(client.diagnostics().requiresManualReconnect, true);
  } finally { await client.disconnect('dispose'); }
});

test('initial GPU timeout cannot downgrade an established SSE bootstrap into failed polling', async () => {
  const { RealtimeTunnelClient } = require('../../src/tunnel/RealtimeTunnelClient.ts');
  const { RequestBudget } = require('../../src/tunnel/RequestBudget.ts');
  const client = new RealtimeTunnelClient({ id: 'w', role: 'worker', localHost: 'localhost', localPort: 1 }, new RequestBudget());
  let polling = 0;
  client.connectSse = async () => { client.status = 'sse'; };
  client.http.getGpu = async () => { throw Error('slow initial GPU sample'); };
  client.startPolling = async () => { polling++; client.status = 'disconnected'; };
  try { await client.connect(); assert.equal(polling, 0); assert.equal(client.diagnostics().streamStatus, 'sse'); }
  finally { await client.disconnect('dispose'); }
});

test('runtime scans beyond the old chunk boundary and compact polling retains anomaly and identity verdicts', () => {
  const { spawnSync } = require('node:child_process'), path = require('node:path');
  const r = spawnSync(process.platform === 'win32' ? 'python' : 'python3', ['-B', '-X', 'utf8',
    path.join(__dirname, 'progressDiagnosticsWire.fixture.py')], { encoding: 'utf8', timeout: 10000, windowsHide: true });
  assert.equal(r.status, 0, r.stderr || r.stdout); assert.equal(JSON.parse(r.stdout).ok, true);
});
