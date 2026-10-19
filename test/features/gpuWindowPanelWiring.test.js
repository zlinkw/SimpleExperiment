// Item 85 UI consumption evidence. The panel functions that ask the host ring
// first when a GPU window changes, apply carried fine frames into the existing
// chart cache, and honestly fall back to the remote history request on an empty
// answer or an older host that never replies are exercised for real: the
// function bodies are extracted from the actual PanelHtml.legacy.ts script text,
// the rendered full script is parsed, and the routing/whitelist wiring is read
// from the same source. Only the vscode transport and the chart scheduler are
// recorded stubs.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), ts = require('typescript'), vm = require('node:vm');
require('../_helpers/registerTsRequire');

const source = fs.readFileSync(require.resolve('../../src/ui/PanelHtml.legacy.ts'), 'utf8');
assert.match(source, /if \(item\.type === "gpuWindowSamples"\) \{\s*applyGpuWindowSamples\(item\);/, 'the panel message router must dispatch gpuWindowSamples to the ring consumer');
assert.ok(source.includes('"manualGpuSnapshot", "loadGpuHistory", "gpuWindowSamples"'), 'gpuWindowSamples must be an allowed outgoing panel command');

function extractFunction(name) {
  const match = source.match(new RegExp('    function ' + name + '\\([\\s\\S]*?\\n    \\}\\n'));
  assert.ok(match, 'panel function ' + name + ' must exist in the real script');
  return match[0];
}
const code = ['"use strict";',
  extractFunction('gpuHistorySeriesKey'), extractFunction('gpuWindowFineWindowMs'),
  extractFunction('requestGpuHistoryRemote'),
  extractFunction('applyGpuWindowSamples'), extractFunction('requestGpuHistory')].join('\n');
const compiled = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

function harness() {
  const posted = [], drawn = [];
  const context = {
    posted, drawn, Map, Number, Array, String, Math, Boolean, Object, Date, isFinite, Number,
    vscode: { postMessage: message => posted.push(message) },
    gpuWindowPending: new Map(), gpuHistorySeriesCache: new Map(), gpuHistoryRequestLastAt: new Map(),
    gpuHistoryMeta: {}, gpuHistorySeriesRevision: 0,
    GPU_HISTORY_REQUEST_COOLDOWN_MS: 0, GPU_HISTORY_SERIES_CACHE_LIMIT: 8,
    scheduleGpuHistoryDraw: () => drawn.push(1),
    setTimeout: (fn, ms) => setTimeout(fn, ms), clearTimeout: id => clearTimeout(id),
  };
  vm.runInNewContext(compiled, context);
  return { context, posted, drawn };
}

const t0 = Date.now();
const fineSample = { seq: 9, epoch: 'e2', collectedAt: t0, source: 'worker_telemetry',
  gpus: [{ index: 0, memoryUsedMb: 3000, memoryTotalMb: 8192, utilizationPercent: 61 }, { index: 1, memoryUsedMb: 100, memoryTotalMb: 8192, utilizationPercent: 0 }] };

test('a GPU window request first asks the host ring for fine frames instead of re-requesting remote history', () => {
  const h = harness();
  vm.runInNewContext('requestGpuHistory({ serverId: "srv1", gpuId: "0", maxPoints: 96 });', h.context);
  assert.deepEqual(h.posted.map(m => m.command), ['gpuWindowSamples'], 'the window switch sends only the host ring query first');
  const query = h.posted[0];
  assert.equal(query.workerId, 'srv1');
  assert.ok(query.end - query.start === 96 * 60000, 'the requested window matches the chart window span');
});

test('carried fine frames update the existing chart series (keeping older coarse history intact) without any remote request', () => {
  const h = harness();
  vm.runInNewContext('requestGpuHistory({ serverId: "srv1", gpuId: "0", maxPoints: 96 });', h.context);
  const coarse = { serverId: 'srv1', gpuId: '0', points: [{ bucketEpoch: t0 - 7200000, gpuUtilPercent: 10, memoryUsedMb: 1, memoryTotalMb: 8192, imputed: false }] };
  h.context.gpuHistorySeriesCache.set('srv1::0', coarse);
  vm.runInNewContext('applyGpuWindowSamples({ workerId: "srv1", samples: SAMPLES });', Object.assign(h.context, { SAMPLES: [fineSample] }));
  assert.deepEqual(h.posted.map(m => m.command), ['gpuWindowSamples'], 'no duplicate remote history request happened for the fine window');
  const series = h.context.gpuHistorySeriesCache.get('srv1::0');
  assert.equal(series.points.length, 2, 'the older coarse frame is kept and the fine frame added, nothing synthesized');
  assert.equal(series.points[1].bucketEpoch, t0, 'the fine frame keeps the Worker collected time');
  assert.equal(series.points[1].gpuUtilPercent, 61, 'the fine frame feeds the chart point shape');
  assert.equal(h.drawn.length, 1, 'the chart is redrawn from the merged cache');
  assert.equal(h.context.gpuHistorySeriesRevision, 1);
  const second = h.context.gpuHistorySeriesCache.get('srv1::1');
  assert.ok(second && second.points[0].bucketEpoch === t0, 'both carried GPUs are applied');
});

test('an empty ring answer and an older host that never answers both fall back to the existing remote history request', async () => {
  const empty = harness();
  vm.runInNewContext('requestGpuHistory({ serverId: "srv1", gpuId: "0", maxPoints: 96 });', empty.context);
  vm.runInNewContext('applyGpuWindowSamples({ workerId: "srv1", samples: [] });', empty.context);
  assert.deepEqual(empty.posted.map(m => m.command), ['gpuWindowSamples', 'loadGpuHistory'], 'empty ring answer honestly falls back to remote history for the same window');
  const oldHost = harness();
  vm.runInNewContext('requestGpuHistory({ serverId: "srv1", gpuId: "0", maxPoints: 96 });', oldHost.context);
  assert.deepEqual(oldHost.posted.map(m => m.command), ['gpuWindowSamples']);
  await new Promise(resolve => setTimeout(resolve, 1000));
  assert.deepEqual(oldHost.posted.map(m => m.command), ['gpuWindowSamples', 'loadGpuHistory'], 'an old host without the ring handler still gets its history after the bounded wait');
  const overview = harness();
  vm.runInNewContext('requestGpuHistory({ maxPoints: 96 });', overview.context);
  assert.deepEqual(overview.posted.map(m => m.command), ['loadGpuHistory'], 'overview requests without a Worker keep the old remote path');
});

test('the full rendered panel script parses after the outer template strip (P0 gate)', () => {
  const Module = require('node:module');
  const path = require('node:path');
  const sourcePath = path.resolve(__dirname, '../../src/ui/PanelHtml.legacy.ts');
  const codeText = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = new Module(sourcePath, module);
  loaded.filename = sourcePath;
  loaded.paths = Module._nodeModulePaths(path.dirname(sourcePath));
  loaded._compile(codeText, sourcePath);
  const html = loaded.exports.renderPanelHtml();
  const expression = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let match, count = 0;
  while ((match = expression.exec(html))) { new vm.Script(match[1], { filename: 'panel-script-' + ++count }); }
  assert.ok(count > 0 && /gpuWindowSamples/.test(html), 'the rendered script contains the ring wiring and parses');
});
