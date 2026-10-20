const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const test = require("node:test");
const ts = require("typescript");
Module._extensions[".ts"] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, file);

const repo = path.join(__dirname, "..", "..");
const tablesPath = path.join(repo, "src", "results", "ProjectResultTables.ts");
const tablesModule = new Module(tablesPath, module);
tablesModule.filename = tablesPath;
tablesModule.paths = Module._nodeModulePaths(path.dirname(tablesPath));
tablesModule._compile(ts.transpileModule(fs.readFileSync(tablesPath, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, tablesPath);

const uiNotices = [];
const vscode = {
  commands: { executeCommand: async () => ({ ok: true }) },
  workspace: { workspaceFolders: [], getConfiguration: () => ({ get: (_key, fallback) => fallback }) },
  window: { withProgress: async (_options, task) => task({ report() {} }, { isCancellationRequested: false }),
    showInformationMessage: async (...args) => { uiNotices.push(["info", ...args]); },
    showWarningMessage: async (...args) => { uiNotices.push(["warning", ...args]); }, setStatusBarMessage() {} },
  Uri: { file: (fsPath) => ({ fsPath }) }, ProgressLocation: { Notification: 1 },
};
const originalLoad = Module._load;
const originalTsLoader = Module._extensions[".ts"];
Module._extensions[".ts"] = (loadedModule, filename) => {
  const source = fs.readFileSync(filename, "utf8") + (filename.endsWith(path.join("src", "extension", "legacy.ts"))
    ? "\nexport { planValidationFromResult };\n" : "");
  loadedModule._compile(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, filename);
};
Module._load = function (request, parent, isMain) {
  if (request === "vscode") return vscode;
  if (request === "node:worker_threads" || request === "worker_threads") {
    const workerThreads = originalLoad.call(this, request, parent, isMain);
    return { ...workerThreads, Worker: class extends workerThreads.Worker { constructor(filename, options) {
      super(String(filename).endsWith(path.join('src', 'results', 'ProjectResultCatalogWorker.js'))
        ? path.join(repo, 'dist/results/ProjectResultCatalogWorker.js') : filename, options);
    } } };
  }
  if (request.startsWith("../vendor/semver/")) return originalLoad.call(this, path.join(repo, "dist/vendor/semver", request.slice("../vendor/semver/".length)), parent, isMain);
  if (request === "../results/ProjectResultTables" && parent?.filename.endsWith(path.join("src", "extension", "legacy.ts"))) return tablesModule.exports;
  if (request === "../results/ProjectResultCatalog") return originalLoad.call(this, path.join(repo, "dist/results/ProjectResultCatalog.js"), parent, isMain);
  return originalLoad.call(this, request, parent, isMain);
};
const { __syncPendingResultMetricsForTest, RealtimeTunnelPanelProvider, planValidationFromResult } = require("../../src/extension/legacy.ts");
Module._load = originalLoad;
if (originalTsLoader) Module._extensions[".ts"] = originalTsLoader;
else delete Module._extensions[".ts"];

const planFile = "experiments/plans/demo.yaml";
const remoteCsv = "simple_cluster/results/worker-a/seed_metrics.csv";
const localCsvPattern = path.join("experiments", "results", "_unassigned", "plans", tablesModule.exports.planDirectoryKey(planFile), "raw");
const csvFor = (rows) => "case,seed,method,dataset,metric,value\n" + rows.map((row) =>
  `alpha,${row.seed},demo,set,${row.metric},${row.value}`).join("\n") + "\n";

function providerFor(workspace, csvText, oldRegistry) {
  const calls = [];
  const summary = { planFile, planRevision: "rev-1", completedRunId: "run-complete",
    resultOwnerWorkerId: "worker-a", rawResultCsvPath: remoteCsv,
    workerResultTables: [{ workerId: "worker-a", rawResultCsvPath: remoteCsv, aggregateStatus: "ready" }], results: [] };
  const provider = {
    calls, context: { globalStorageUri: { fsPath: workspace } }, client: { getResultsSummary: async () => summary },
    hostOperationLease: { run: async (_request, operation) => operation() },
    workerProbeSignatures: new Map(), workerProbeGenerations: new Map(),
    setupConfig: { workerTunnels: [{ id: "worker-a" }] }, localPlanMetadata: { plans: [{ planFile, revision: "rev-1", seeds: [42, 43] }] },
    selectedRunKeys: new Set(), selectedExperimentIds: new Set(), selectedArchiveKeys: new Set(), selectedTaskUiKeys: new Set(),
    panelSectionInterest: { documentGeneration: "1", mainSection: "results", visibleSections: ["results"], expandedSections: ["results"], pinnedInspectorSection: "" },
    planFileInput: "", selectedPlanId: "", selectedRunKey: "", resultsSummary: undefined,
    captureProjectContext: () => ({ root: workspace, generation: 1 }), projectContextIsCurrent: () => true,
    lastWorkerProbes: {},
    refreshResultCatalogForCurrentInterest: () => undefined,
    refreshDistributedResultSyncProbes: async function () { this.lastWorkerProbes = { "worker-a": { status: "ok" } }; },
    effectiveConnectionMode: () => "tunnel", refreshLocalPlanMetadataForAction: async () => {},
    loadPlanSyncLedger: async () => ({ schemaVersion: 2, entries: { demo: { planFile, revision: "rev-1", runId: "run-complete",
      sourceWorkerId: "worker-a", artifactPaths: [remoteCsv], directoryPaths: ["simple_cluster/results/worker-a"], destinations: {} } } }),
    loadDistributedQueue: async () => ({ schemaVersion: 1, plans: [] }),
    distributedProjectContract: () => ({ resultRowsPath: "test_results/formal_result_rows.csv", fourStatePath: "test_results/four_state_metrics.csv" }),
    schedulerSettings: () => ({ gpuIdleUtilThreshold: 5, gpuIdleMemThresholdMb: 200, sessionCheckMinSeconds: 30, workerStatusTtlSeconds: 180 }),
    workerCodeSyncTargets: () => [{ id: "worker-a", host: "worker-a.example", user: "exp", port: 22,
      remotePath: "/project", transferHost: "worker-a.example", resolvedHost: "worker-a.example" }],
    resolveSelectedPlanFile: () => "", enabledWorkerConfigs: () => [{ id: "worker-a" }], postState() {},
    sftpServerOptions: (target) => ({ id: target.id, host: target.host, user: target.user, port: target.port, remotePath: target.remotePath }),
    loadProjectTableRegistry: async () => oldRegistry || tablesModule.exports.emptyTableRegistry(),
    simpleSftpCapability: async () => ({ methodOptions: { "sync.downloadMappedPaths": { memoryOnly: true, memoryWrapperResults: true } } }),
    simpleSftpApiCall: async (method, params) => {
      calls.push([method, params]);
      if (method === "sync.projectInventory") return { files: { [remoteCsv]: { size: Buffer.byteLength(csvText), sha256: crypto.createHash("sha256").update(csvText).digest("hex") } } };
      if (method === "sync.projectFileStats") return { files: { [remoteCsv]: { size: Buffer.byteLength(csvText) } } };
      assert.equal(method, "sync.downloadMappedPaths");
      assert.equal(params.memoryOnly, true);
      return { ok: true, memoryOnly: true, fileCount: params.entries.length, completedFiles: params.entries.length,
        entries: params.entries.map(entry => ({ remotePath: entry.remotePath, bytes: Buffer.byteLength(csvText),
          sha256: crypto.createHash("sha256").update(csvText).digest("hex"), dataBase64: Buffer.from(csvText).toString("base64") })) };
    },
  };
  provider.testSummary = summary;
  return provider;
}

function seedRegistry() {
  return tablesModule.exports.updateRegistry(tablesModule.exports.emptyTableRegistry(), {
    planFile, planRevision: "rev-1", completedRunId: "run-old", rawResultCsvPath: remoteCsv,
    workerResultTables: [{ workerId: "worker-a", rawResultCsvPath: remoteCsv, aggregateStatus: "ready" }],
    results: [{ workerId: "worker-a", runId: "run-old", attempt: "1", planRevision: "rev-1",
      dimensions: { case: "alpha", seed: "42", method: "demo", dataset: "set" }, metrics: { AUC: { value: 0.5 } },
      sourceFiles: [{ path: remoteCsv }] }],
  }, planFile, 1);
}

const {fixture}=require('../_helpers/freshResultHost');
test("actual UI entry reads native manifests and alias metrics into memory without a result registry", async()=>{
  const f=fixture();f.raw['work_dirs/alpha42/metrics.csv']=csvFor([{seed:42,metric:'AUC',value:.4},{seed:42,metric:'roc_auc',value:.4},{seed:42,metric:'ECE',value:.1}]);
  f.host.parseFreshResultMetric=RealtimeTunnelPanelProvider.prototype.parseFreshResultMetric;
  const report=await __syncPendingResultMetricsForTest(f.host);
  assert.equal(report.current,true,JSON.stringify(report.skipped));assert.equal(report.included.length,1);
  const table=tablesModule.exports.readCsv(fs.readFileSync(path.join(f.root,'experiments/results/set/final/final.csv'),'utf8'));
  assert.equal(table.rows[0][table.header.indexOf('roc_auc_mean')],'0.4');
  assert.equal(fs.existsSync(path.join(f.root,'simple_cluster/results/project_table_registry.json')),false);
  assert.ok(f.calls.filter(call=>call[0]==='sync.downloadMappedPaths').every(call=>call[1].memoryOnly));
});
test("conflicting aliases remain visible as an unknown job and do not borrow the previous export",async()=>{
  const f=fixture();f.host.parseFreshResultMetric=RealtimeTunnelPanelProvider.prototype.parseFreshResultMetric;
  f.raw['work_dirs/alpha42/metrics.csv']=csvFor([{seed:42,metric:'AUC',value:.4}]);
  await __syncPendingResultMetricsForTest(f.host);
  f.raw['work_dirs/alpha42/metrics.csv']=csvFor([{seed:42,metric:'AUC',value:.4},{seed:42,metric:'roc_auc',value:.8}]);
  const report=await __syncPendingResultMetricsForTest(f.host);
  assert.equal(report.results.length,0);assert.equal(report.jobs[0].state,'unknown');assert.match(report.missing.join(' '),/指标.*冲突/);
});
test("pulled completion automatically updates results without mirroring, remote aggregation or persisted completion marks",async()=>{
  const f=fixture();const {resultCollectionHost}=require('../../src/extension/ResultCollectionHost.ts');
  const service=resultCollectionHost(f.host);
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('automatic summary did not complete')),3000);
    f.host.postState=()=>{clearTimeout(timer);resolve();};
    service.observe({workerId:'a',queryComplete:true,capabilities:{resultCollection:1},tasks:[{commandId:'command',observation:{result:{verified:true,runId:'command',status:'completed'},tmux:{dead:true,exitCode:0}}}]});
  });
  assert.equal(f.host.resultsSummary.current,true,JSON.stringify(f.host.resultsSummary.skipped));assert.equal(f.host.resultsSummary.completed,1);
  assert.ok(!f.calls.some(call=>/merge|rebuild|serverToServer/.test(call[0])));
});
test("API and legacy parse entry use the same fresh collection as UI",async()=>{
  const f=fixture();
  const report=await RealtimeTunnelPanelProvider.prototype.apiResultsList.call(f.host,{planFile});
  assert.equal(report.source,'active_query');assert.equal(report.results.length,1);
  const parsed=await RealtimeTunnelPanelProvider.prototype.runActionCommandCore.call(f.host,'parseResults',{});
  assert.equal(parsed.source,'active_query');assert.equal(parsed.completed,1);
});

test("late local lock ACK is fenced before the captured Worker client can send", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "p6-late-ack-"));
  try {
    vscode.workspace.workspaceFolders = [{ uri: { scheme: "file", path: workspace.replace(/\\/g, "/"),
      fsPath: workspace, toString: () => "file://" + workspace.replace(/\\/g, "/") } }];
    let sends = 0;
    const provider = providerFor(workspace, "");
    provider.context.globalStorageUri.fsPath = workspace;
    provider.client = { postWorkerAction: async () => { sends += 1; return { status: "queued" }; } };
    provider.workerActionTargets = () => [{ id: "worker-a", condaEnv: "env-a" }];
    provider.localCodeManifestCacheFile = () => path.join(workspace, "manifest-cache.json");
    const host = Object.assign(Object.create(RealtimeTunnelPanelProvider.prototype), provider);
    host.distributedQueueGeneration = 7;
    let manifestBuilds = 0;
    host.buildDistributedJobCodeManifest = async () => { manifestBuilds += 1; throw new Error("code manifest must not be prepared before the fence"); };
    host.lastWorkerProbes = { 'worker-a': { capabilities: { endpoints: { declaredJobPaths: true, formalJobIdentityEnv: 1, taskShellEnvironment: 1, projectManagedValidation: 1, gpuQuotaScheduling: 1 } } } };
    host.withRemoteActionResource = async (_workerId, _resource, _request, callback) => {
      host.distributedQueueGeneration += 1;
      return callback();
    };
    const emptyManifestFingerprint = crypto.createHash("sha256").update("[]").digest("hex");
    await assert.rejects(() => host.sendDistributedJob(
      { id: "plan-a", projectId: "project-a", resultPathPolicy: "declared", executionMode: "train_test", planJobCount: 1, planFile, revision: "rev-1", codeFingerprint: emptyManifestFingerprint },
      { index: 0, case: "alpha", seed: 42, outputDir: "runs/a", collectionResultCsv: "tmp/result/a.csv" }, "worker-a", undefined, "command-a",
    ), /提交已取消或项目已切换/);
    assert.equal(sends, 0, "generation changed while awaiting the local resource lock must block the remote write");
    assert.equal(manifestBuilds, 0, "a late lock ACK must fence before any code-manifest preparation runs");
  } finally {
    vscode.workspace.workspaceFolders = [];
  }
});

test("a granted local lock ACK with unchanged context still sends the durable job with its proof fields", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "p6-ack-ok-"));
  try {
    vscode.workspace.workspaceFolders = [{ uri: { scheme: "file", path: workspace.replace(/\\/g, "/"),
      fsPath: workspace, toString: () => "file://" + workspace.replace(/\\/g, "/") } }];
    const sent = [];
    const provider = providerFor(workspace, "");
    provider.context.globalStorageUri.fsPath = workspace;
    provider.client = { postWorkerAction: async (_workerId, _action, request) => { sent.push(request); return { status: "queued" }; } };
    provider.workerActionTargets = () => [{ id: "worker-a", condaEnv: "env-a" }];
    provider.localCodeManifestCacheFile = () => path.join(workspace, "manifest-cache.json");
    const host = Object.assign(Object.create(RealtimeTunnelPanelProvider.prototype), provider);
    host.distributedQueueGeneration = 7;
    let manifestBuilds = 0;
    host.buildDistributedJobCodeManifest = async () => { manifestBuilds += 1; throw new Error("a durable proof worker must not rebuild the local manifest"); };
    const emptyManifestFingerprint = crypto.createHash("sha256").update("[]").digest("hex");
    host.lastWorkerProbes = { 'worker-a': { capabilities: { endpoints: { declaredJobPaths: true, formalJobIdentityEnv: 1, taskShellEnvironment: 1, projectManagedValidation: 1, gpuQuotaScheduling: 1 }, actionEndpoints: { "register-code-sync-proof": true } } } };
    host.lastCodeSyncState = { workerVersions: { 'worker-a': { codeSyncProofId: "proof-9", manifestDigest: emptyManifestFingerprint, fingerprint: emptyManifestFingerprint } } };
    host.withRemoteActionResource = async (_workerId, _resource, _request, callback) => callback();
    const receipt = await host.sendDistributedJob(
      { id: "plan-a", projectId: "project-a", resultPathPolicy: "declared", executionMode: "train_test", planJobCount: 1, planFile, revision: "rev-1", codeFingerprint: emptyManifestFingerprint },
      { index: 0, case: "alpha", seed: 42, outputDir: "runs/a", collectionResultCsv: "tmp/result/a.csv" }, "worker-a", undefined, "command-a",
    );
    assert.deepEqual(receipt, { status: "queued" });
    assert.equal(sent.length, 1, "an undisrupted lock ACK must still deliver exactly one durable job");
    assert.equal(manifestBuilds, 0, "the persistent proof path carries the proof id without touching the local tree");
    assert.equal(sent[0].codeSyncProofId, "proof-9", "the deferred proof preparation must rejoin the request before transport");
    assert.equal(sent[0].manifestDigest, emptyManifestFingerprint);
    assert.equal(sent[0].projectId, "project-a");
    assert.equal(sent[0].outputDir, "runs/a");
    assert.equal(sent[0].planFile, planFile);
    assert.equal(sent[0].resultPathPolicy, "declared");
  } finally {
    vscode.workspace.workspaceFolders = [];
  }
});

test("a normal send without a resolvable local project root fails explicitly before manifest preparation", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "p6-no-root-"));
  try {
    vscode.workspace.workspaceFolders = [];
    let sends = 0;
    const provider = providerFor(workspace, "");
    provider.context.globalStorageUri.fsPath = workspace;
    provider.client = { postWorkerAction: async () => { sends += 1; return { status: "queued" }; } };
    provider.workerActionTargets = () => [{ id: "worker-a", condaEnv: "env-a" }];
    provider.localCodeManifestCacheFile = () => path.join(workspace, "manifest-cache.json");
    const host = Object.assign(Object.create(RealtimeTunnelPanelProvider.prototype), provider);
    host.distributedQueueGeneration = 7;
    let manifestBuilds = 0;
    host.buildDistributedJobCodeManifest = async () => { manifestBuilds += 1; throw new Error("manifest preparation must be blocked by the explicit root guard"); };
    host.lastWorkerProbes = { 'worker-a': { capabilities: { endpoints: { declaredJobPaths: true, formalJobIdentityEnv: 1, taskShellEnvironment: 1, projectManagedValidation: 1, gpuQuotaScheduling: 1 } } } };
    host.withRemoteActionResource = async (_workerId, _resource, _request, callback) => callback();
    const emptyManifestFingerprint = crypto.createHash("sha256").update("[]").digest("hex");
    await assert.rejects(() => host.sendDistributedJob(
      { id: "plan-a", projectId: "project-a", resultPathPolicy: "declared", executionMode: "train_test", planJobCount: 1, planFile, revision: "rev-1", codeFingerprint: emptyManifestFingerprint },
      { index: 0, case: "alpha", seed: 42, outputDir: "runs/a", collectionResultCsv: "tmp/result/a.csv" }, "worker-a", undefined, "command-a",
    ), /缺少本机项目根目录/);
    assert.equal(sends, 0, "a request without a resolvable project root must never reach the Worker transport");
    assert.equal(manifestBuilds, 0, "the explicit root guard must reject before any local manifest I/O");
  } finally {
    vscode.workspace.workspaceFolders = [];
  }
});

test("actual plan validation parser prefers the latest complete 0.5.179 wrapped payload", () => {
  const rows = [0, 1, 2].map((index) => ({ index, case: "alpha", seed: 42 + index, output_dir: "runs/a/" + index }));
  const parsed = planValidationFromResult({
    latestEvent: { payload: { validation: { ok: true, jobs: rows } } },
    payload: { validation: { ok: true, jobs: [rows[0]] } },
    result: { validation: { ok: true, jobs: [] } },
  });
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.jobs.map((job) => job.index), [0, 1, 2], "the newest full preflight list must win over stale wrappers");
  for (const wrapper of [
    { payload: { validation: { jobs: rows } } },
    { result: { validation: { jobs: rows } } },
    { validation: { jobs: rows } },
  ]) assert.deepEqual(planValidationFromResult(wrapper).jobs.map((job) => job.index), [0, 1, 2]);
});
