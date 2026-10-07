const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const Module = require('node:module');
const test = require('node:test');
const repo = path.join(__dirname, '../..');
const vscode = {
  workspace: { workspaceFolders: [], getConfiguration: () => ({ get: (_name, fallback) => fallback }) },
  extensions: { getExtension: () => ({ extensionPath: repo, packageJSON: require('../../package.json') }) },
  Uri: { file: fsPath => ({ fsPath }) }, ProgressLocation: { Notification: 1 },
  window: { withProgress: async (_options, work) => work({ report() {} }, { isCancellationRequested: false }),
    showWarningMessage: async () => {}, showInformationMessage: async () => {}, setStatusBarMessage() {} },
};
const originalLoad = Module._load;
Module._load = function (name, ...args) { return name === 'vscode' ? vscode : originalLoad.call(this, name, ...args); };
const { RealtimeTunnelPanelProvider } = require('../../dist/extension/legacy');
Module._load = originalLoad;
const tables = require('../../dist/results/ProjectResultTables');
const bundle = require('../../dist/results/WrapperResultBundle');
const publication = require('../../dist/results/ProjectResultPublication');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const planFile = 'experiments/plans/comparison/anything.yaml';

function fixture({ wrapperOnly = false, incomplete = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'simple-wrapper-results-'));
  const files = new Map(), calls = [];
  const makeRun = (id, value, done = 3) => ({ id, planFile, revision: 'same-revision', enqueuedAt: id === 'A' ? '2026-10-01T00:00:00Z' : '2026-10-02T00:00:00Z',
    jobs: [42, 43, 44].map((seed, index) => {
      const outputDir = `work_dirs/arbitrary/${seed}/attempts/${id}`;
      const checkpoint = outputDir + '/best_model.pth';
      const job = { index, case: 'case-one', seed, attempt: 1, workerId: 'owner', commandId: id + '-' + seed,
        outputDir, status: index < done ? 'completed' : 'running' };
      const endpoint = wrapperOnly ? outputDir + '/scoring.csv' : outputDir + '/test_results/formal_result_rows.csv';
      const endpointText = `case,seed,method,dataset,metric,value,checkpoint_path,job_dir,run_id\ncase-one,${seed},unknown_method,arbitrary_set,AUC,${value},${checkpoint},${outputDir},${id}\n`;
      files.set(endpoint, Buffer.from(endpointText));
      if (!wrapperOnly) files.set(outputDir + '/test_results/four_state_metrics.csv', Buffer.from('state,metric,value,p0_value,delta_p100_minus_p0,sample_count,checkpoint_path,job_dir,seed,method,dataset,undefined_reason,p0_undefined_reason,extra_column\n'
        + ['both', 'image_missing', 'text_missing', 'both_missing'].map(state => `${state},AUC,${value},0.7,0.2,210,${checkpoint},${outputDir},${seed},unknown_method,arbitrary_set,,,保留原文`).join('\n') + '\n'));
      files.set(outputDir + '/custom.csv', Buffer.from('case,state,label,score,unknown_field\npatient-case,custom-state,lesion,NaN,不能计算\n'));
      files.set(outputDir + '/custom.json', Buffer.from(JSON.stringify({ arbitrary: { list: [1, null, '完整保留'] } })));
      files.set(outputDir + '/config_snapshot.yaml', Buffer.from('model: untouched\n'));
      files.set(outputDir + '/mask.npz', Buffer.from([0, 255, 2, 4, 9]));
      files.set(outputDir + '/artifact_manifest.json', Buffer.from(JSON.stringify({ output_dir: outputDir, checkpoint_path: checkpoint,
        metrics_summary: endpoint, outputs: ['custom.csv', 'custom.json', 'config_snapshot.yaml', 'mask.npz',
          ...(!wrapperOnly ? ['test_results/four_state_metrics.csv'] : [])] })));
      // Discovery must work with just a standard manifest, without metric hashes recorded in the queue.
      job.artifacts = {};
      return job;
    }) });
  const runs = [makeRun('A', .81), makeRun('B', .92, incomplete ? 2 : 3)];
  vscode.workspace.workspaceFolders = [{ uri: { fsPath: root, scheme: 'file', path: root } }];
  const host = Object.create(RealtimeTunnelPanelProvider.prototype);
  Object.assign(host, {
    client: {}, context: { globalStorageUri: { fsPath: root } }, resultCsvDirectory: 'experiments/results',
    localPlanMetadata: { plans: [{ planFile, revision: 'same-revision', seeds: [42, 43, 44] }],
      detectedProject: { adapterRules: { distributedResults: !wrapperOnly } } },
    captureProjectContext: () => ({ root, generation: 1 }), projectContextIsCurrent: () => true,
    effectiveConnectionMode: () => 'tunnel', actionBody: body => body, refreshLocalPlanMetadataForAction: async () => {},
    loadPlanSyncLedger: async () => ({ schemaVersion: 2, entries: {} }), loadDistributedQueue: async () => ({ plans: runs }),
    resolveSelectedPlanFile: () => planFile, enabledWorkerConfigs: () => [{ id: 'owner' }],
    mappedDownloadServerForSource: id => ({ id, host: 'current-config.example', remotePath: '/verified/project' }),
    simpleSftpCapability: async () => ({ methodOptions: { 'sync.downloadMappedPaths': { memoryOnly: true } } }),
    postState() {}, invalidateResultCatalogCache() {},
    simpleSftpApiCall: async (method, params) => {
      calls.push({ method, params });
      if (method === 'sync.projectInventory') return { ok: true, files: Object.fromEntries(params.scopePaths.filter(file => files.has(file))
        .map(file => [file, { size: files.get(file).length, sha256: sha(files.get(file)) }])) };
      assert.equal(method, 'sync.downloadMappedPaths');
      if (!params.memoryOnly) {
        for (const entry of params.entries) {
          const target = path.join(root, entry.localRelativePath); fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.writeFileSync(target, files.get(entry.remotePath));
        }
        return { ok: true, completedFiles: params.entries.length };
      }
      return { ok: true, memoryOnly: true, entries: params.entries.map(entry => ({ remotePath: entry.remotePath,
        bytes: entry.bytes, sha256: entry.sha256, dataBase64: files.get(entry.remotePath).toString('base64') })) };
    },
  });
  const sync = () => host.rebuildProjectResultTablesFromUi({ planFiles: [planFile] });
  const registry = () => JSON.parse(fs.readFileSync(path.join(root, 'simple_cluster/results/project_table_registry.json'), 'utf8'));
  return { root, host, files, calls, runs, sync, registry };
}

test('memoryOnly persistence includes four-state and arbitrary wrapper outputs with exact bytes and provenance', async () => {
  const f = fixture(); const report = await f.sync(); assert.deepEqual(report.skipped, []);
  const evidence = f.registry().plans[planFile].wrapperEvidence;
  assert.equal(evidence.runId, 'B'); assert.equal(evidence.jobs.length, 3);
  for (const job of evidence.jobs) {
    assert.equal(job.checkpointPath, job.job.outputDir + '/best_model.pth');
    for (const source of job.sources) {
      const bytes = fs.readFileSync(path.join(f.root, source.localRelativePath));
      assert.equal(sha(bytes), source.sha256); assert.deepEqual(bytes, f.files.get(source.remotePath));
      const sidecar = JSON.parse(fs.readFileSync(path.join(f.root, source.localRelativePath + '.provenance.json'), 'utf8'));
      assert.equal(sidecar.job.runId, 'B'); assert.equal(sidecar.job.attempt, 1); assert.equal(sidecar.job.workerId, 'owner');
    }
  }
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
  const four = walk(path.join(f.root, 'experiments/results/arbitrary_set/methods')).find(file => /four_state.*\.csv$/.test(file));
  const rows = tables.readCsv(fs.readFileSync(four, 'utf8'));
  assert.equal(rows.rows.length, 12); assert.ok(rows.header.includes('p0_value')); assert.ok(rows.header.includes('extra_column'));
  assert.ok(rows.rows.every(row => row[rows.header.indexOf('simple_run_id')] === 'B'));
  assert.ok(tables.resultCatalog(f.root, 'experiments/results').datasets.flatMap(dataset => dataset.plans).flatMap(plan => plan.artifacts)
    .some(artifact => artifact.kind === 'wrapper' && /four_state/.test(artifact.path)));
  const custom = walk(path.join(f.root, 'experiments/results/_unassigned/methods')).find(file => /custom\.csv.*\.csv$/.test(file));
  assert.match(fs.readFileSync(custom, 'utf8'), /NaN/); assert.match(fs.readFileSync(custom, 'utf8'), /不能计算/);
});

test('generic wrapper requires no four-state schema or project-specific CSV name', async () => {
  const f = fixture({ wrapperOnly: true });
  f.host.localPlanMetadata.detectedProject.adapterRules.distributedResults = true;
  await f.sync();
  assert.equal(f.registry().plans[planFile].records.length, 3);
  assert.ok(f.registry().plans[planFile].wrapperEvidence.jobs.every(job => job.sources.some(source => source.kind === 'mask.npz')));
  const local = await f.host.summaryFromLocalMetricFiles(f.root, planFile, f.host.resultsSummary, { authoritativeLocal: true });
  assert.equal(local.wrapperEvidence.runId, 'B');
  const binary = local._wrapperFiles.find(file => file.relativePath.endsWith('.npz'));
  assert.deepEqual(binary.contents, Buffer.from([0, 255, 2, 4, 9]));
});

test('a wrapper with no endpoint CSV publishes structured outputs without inventing statistics', async () => {
  const f = fixture({ wrapperOnly: true });
  for (const run of f.runs) for (const job of run.jobs) {
    f.files.delete(job.outputDir + '/scoring.csv');
    const manifestPath = job.outputDir + '/artifact_manifest.json';
    const manifest = JSON.parse(f.files.get(manifestPath)); delete manifest.metrics_summary;
    f.files.set(manifestPath, Buffer.from(JSON.stringify(manifest)));
  }
  const report = await f.sync(); assert.deepEqual(report.skipped, []); assert.deepEqual(report.missing, []);
  const plan = f.registry().plans[planFile];
  assert.equal(plan.wrapperEvidence.runId, 'B'); assert.deepEqual(plan.records, []);
  assert.equal(plan.wrapperEvidence.jobs.length, 3);
  assert.ok(plan.wrapperEvidence.views.some(file => /custom\.csv/.test(file)));
  assert.equal(fs.existsSync(path.join(f.root, 'experiments/results/arbitrary_set/final/final.csv')), false);
});

test('TSV merge preserves commas, quotes and multiline cells; JSONL run mismatches are rejected', () => {
  const job = { runId: 'A', index: 0, attempt: 1, case: 'one', seed: 42, workerId: 'owner', outputDir: 'work_dirs/a/attempts/A', commandId: 'cmd' };
  const remotePath = job.outputDir + '/custom.tsv', text = 'label\tnote\nlesion,benign\t"first\nsecond,third"\n';
  const prepared = bundle.prepareWrapperJob(job, [{ remotePath, text, sha256: sha(text), bytes: Buffer.byteLength(text) }], '', [remotePath], file => 'experiments/results/' + file);
  const pub = bundle.prepareWrapperPublication('A', [{ case: 'one', seed: 42 }], [prepared]);
  const merged = bundle.wrapperMergedFiles('experiments/results', planFile, pub, [prepared]);
  const csv = tables.readCsv(merged[0].contents);
  assert.equal(csv.rows[0][csv.header.indexOf('label')], 'lesion,benign');
  assert.equal(csv.rows[0][csv.header.indexOf('note')], 'first\nsecond,third');
  const bad = '{"run_id":"B","job_dir":"work_dirs/a/attempts/A"}\n';
  assert.throws(() => bundle.prepareWrapperJob(job, [{ remotePath: job.outputDir + '/rows.jsonl', text: bad, sha256: sha(bad) }], '', [], file => file), /身份不匹配/);
});

for (const fault of ['missing-four', 'hash-mismatch', 'wrong-checkpoint', 'missing-custom']) test(fault + ' retains old complete endpoint and wrapper generation', async () => {
  const f = fixture(); const b = f.runs.pop(); await f.sync();
  const previous = fs.readFileSync(path.join(f.root, 'experiments/results/arbitrary_set/final/final.csv'));
  f.runs.push(b);
  const output = b.jobs[0].outputDir;
  if (fault === 'missing-four') f.files.delete(output + '/test_results/four_state_metrics.csv');
  if (fault === 'missing-custom') f.files.delete(output + '/custom.json');
  if (fault === 'wrong-checkpoint') f.files.set(output + '/test_results/four_state_metrics.csv',
    Buffer.from(f.files.get(output + '/test_results/four_state_metrics.csv').toString().replaceAll('best_model.pth', 'other_model.pth')));
  if (fault === 'hash-mismatch') {
    const call = f.host.simpleSftpApiCall;
    f.host.simpleSftpApiCall = async (method, params) => {
      const response = await call(method, params);
      if (method === 'sync.downloadMappedPaths' && params.memoryOnly && response.entries.some(file => file.remotePath.endsWith('four_state_metrics.csv')))
        response.entries.find(file => file.remotePath.endsWith('four_state_metrics.csv')).dataBase64 = Buffer.from('tampered').toString('base64');
      return response;
    };
  }
  const report = await f.sync(); assert.ok(report.skipped.length || report.missing.length);
  assert.equal(f.registry().plans[planFile].wrapperEvidence.runId, 'A');
  assert.deepEqual(fs.readFileSync(path.join(f.root, 'experiments/results/arbitrary_set/final/final.csv')), previous);
});

test('same revision rerun A to incomplete B produces isolated preview without lending old seeds', async () => {
  const f = fixture({ incomplete: true }); const report = await f.sync();
  assert.equal(f.registry().plans[planFile].wrapperEvidence.runId, 'A');
  assert.equal(report.previews[0].runId, 'B'); assert.equal(report.previews[0].completedJobs, 2);
  for (const file of report.previews[0].paths.filter(file => file.endsWith('.csv'))) {
    const csv = tables.readCsv(fs.readFileSync(path.join(f.root, file), 'utf8'));
    assert.ok(csv.rows.every(row => row[csv.header.indexOf('simple_run_id')] === 'B'));
    assert.ok(csv.rows.every(row => row[csv.header.indexOf('simple_seed')] !== '44'));
  }
  f.runs[1].jobs[2].status = 'completed'; await f.sync();
  assert.equal(f.registry().plans[planFile].wrapperEvidence.runId, 'B');
  assert.deepEqual(new Set(f.registry().plans[planFile].records.map(row => row.runId)), new Set(['B']));
});

test('repeated collection is byte-idempotent and never overwrites another attempt', async () => {
  const f = fixture(); f.runs.pop(); await f.sync();
  const previousSources = f.registry().plans[planFile].wrapperEvidence.jobs.flatMap(job => job.sources);
  for (const job of f.runs[0].jobs) job.artifacts = Object.fromEntries([...f.files].filter(([file]) => file.startsWith(job.outputDir + '/'))
    .map(([file, bytes]) => [file, sha(bytes)]));
  await f.sync();
  assert.deepEqual(f.registry().plans[planFile].wrapperEvidence.jobs.flatMap(job => job.sources), previousSources);
  for (const source of previousSources) assert.equal(sha(fs.readFileSync(path.join(f.root, source.localRelativePath))), source.sha256);
});

test('endpoint and wrapper tables roll back together on transactional publication failure', async () => {
  const f = fixture(); const b = f.runs.pop(); await f.sync();
  const before = fs.readFileSync(path.join(f.root, 'simple_cluster/results/project_table_registry.json'));
  const previous = fs.readFileSync(path.join(f.root, 'experiments/results/arbitrary_set/final/final.csv'));
  const wrapperPath = f.registry().plans[planFile].wrapperEvidence.views.find(file => /four_state/.test(file));
  const previousWrapper = fs.readFileSync(path.join(f.root, wrapperPath));
  const oldVisible = { runId: 'A', marker: 'published' }; f.host.resultsSummary = oldVisible;
  f.runs.push(b);
  const publish = publication.publishProjectResultFiles;
  publication.publishProjectResultFiles = (root, dir, files, options) => publish(root, dir, files, { ...options,
    rename: async (from, to) => { if (from.endsWith('.new') && to.endsWith(path.join('final', 'final.csv'))) throw new Error('injected atomic failure'); return fs.promises.rename(from, to); } });
  try { await assert.rejects(f.sync(), /injected atomic failure/); }
  finally { publication.publishProjectResultFiles = publish; }
  assert.deepEqual(fs.readFileSync(path.join(f.root, 'simple_cluster/results/project_table_registry.json')), before);
  assert.deepEqual(fs.readFileSync(path.join(f.root, 'experiments/results/arbitrary_set/final/final.csv')), previous);
  assert.deepEqual(fs.readFileSync(path.join(f.root, wrapperPath)), previousWrapper);
  assert.equal(f.host.resultsSummary, oldVisible);
});

test('a first incomplete run has only an explicit preview and no formal endpoint table', async () => {
  const f = fixture({ incomplete: true }); f.runs.shift(); const report = await f.sync();
  assert.equal(report.previews[0].completedJobs, 2);
  assert.equal(fs.existsSync(path.join(f.root, 'experiments/results/arbitrary_set/final/final.csv')), false);
});

test('the same attempt cannot overwrite immutable historical raw bytes', async () => {
  const f = fixture(); await f.sync();
  const evidence = f.registry().plans[planFile].wrapperEvidence;
  const source = evidence.jobs[0].sources.find(source => source.remotePath.endsWith('/custom.csv'));
  f.files.set(source.remotePath, Buffer.from(f.files.get(source.remotePath).toString().replace('NaN', '0.9')));
  await assert.rejects(f.sync(), /历史原始指标已变化/);
  assert.equal(sha(fs.readFileSync(path.join(f.root, source.localRelativePath))), source.sha256);
});

test('a legacy endpoint-only refresh cannot replace a complete wrapper bundle', async () => {
  const f = fixture(); await f.sync();
  const registry = f.registry(), summary = tables.registeredPlanSummary(registry, planFile);
  assert.equal(summary.results[0].jobDir, registry.plans[planFile].records[0].jobDir);
  const wrongRun = { ...summary, completedRunId: 'A', results: summary.results.map(row => ({ ...row, runId: 'A' })) };
  assert.throws(() => tables.mergeAvailableWorkerResults(registry, wrongRun, planFile, 3), /运行身份不一致/);
  assert.throws(() => tables.updateRegistry(registry, wrongRun, planFile, 3), /运行身份不一致/);
  delete summary.wrapperEvidence;
  assert.throws(() => tables.mergeAvailableWorkerResults(registry, summary, planFile, 3), /完整结果证明缺失/);
  assert.throws(() => tables.updateRegistry(registry, summary, planFile, 3), /完整结果证明缺失/);
});

test('wrapper declaration rejects out-of-job paths and retains unknown JSON without coercion', () => {
  assert.throws(() => bundle.declaredWrapperResults('{"outputs":["../../other.csv"]}', 'work_dirs/a/attempts/A'), /不安全/);
  assert.throws(() => bundle.declaredWrapperResults('{"outputs":["/other/a.csv"]}', 'work_dirs/a/attempts/A'), /不属于/);
  assert.deepEqual(bundle.declaredWrapperResults('{"outputs":["extra.parquet","test/custom.tsv"],"checkpoint_path":"best.pth"}', 'work_dirs/a/attempts/A'),
    ['work_dirs/a/attempts/A/extra.parquet', 'work_dirs/a/attempts/A/test/custom.tsv']);
});
