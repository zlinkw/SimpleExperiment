const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const test = require("node:test");
const ts = require("typescript");

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
  if (request === "../results/ProjectResultTables" && parent?.filename.endsWith(path.join("src", "extension", "legacy.ts"))) return tablesModule.exports;
  return originalLoad.call(this, request, parent, isMain);
};
const { __syncPendingResultMetricsForTest, RealtimeTunnelPanelProvider, planValidationFromResult } = require("../../src/extension/legacy.ts");
Module._load = originalLoad;
if (originalTsLoader) Module._extensions[".ts"] = originalTsLoader;
else delete Module._extensions[".ts"];

const planFile = "experiments/plans/demo.yaml";
const remoteCsv = "simple_cluster/results/worker-a/seed_metrics.csv";
const localCsvPattern = path.join("experiments", "results", "demo", "raw");
const csvFor = (rows) => "case,seed,method,dataset,metric,value\n" + rows.map((row) =>
  `alpha,${row.seed},demo,set,${row.metric},${row.value}`).join("\n") + "\n";

function providerFor(workspace, csvText, oldRegistry) {
  const calls = [];
  const summary = { planFile, planRevision: "rev-1", completedRunId: "run-complete",
    resultOwnerWorkerId: "worker-a", rawResultCsvPath: remoteCsv,
    workerResultTables: [{ workerId: "worker-a", rawResultCsvPath: remoteCsv, aggregateStatus: "ready" }], results: [] };
  const provider = {
    calls, context: { globalStorageUri: { fsPath: workspace } }, client: { getResultsSummary: async () => summary },
    setupConfig: { workerTunnels: [{ id: "worker-a" }] }, localPlanMetadata: { plans: [{ planFile, revision: "rev-1", seeds: [42, 43] }] },
    selectedRunKeys: new Set(), selectedExperimentIds: new Set(), selectedArchiveKeys: new Set(), selectedTaskUiKeys: new Set(),
    planFileInput: "", selectedPlanId: "", selectedRunKey: "", resultsSummary: undefined,
    captureProjectContext: () => ({ root: workspace, generation: 1 }), projectContextIsCurrent: () => true,
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
    simpleSftpApiCall: async (method, params) => {
      calls.push([method, params]);
      assert.equal(method, "sync.downloadMappedPaths");
      for (const entry of params.entries) {
        const staged = path.join(workspace, ...entry.localRelativePath.split("/"));
        fs.mkdirSync(path.dirname(staged), { recursive: true });
        fs.writeFileSync(staged, csvText, "utf8");
      }
      return { ok: true, fileCount: params.entries.length, completedFiles: params.entries.length };
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

test("production metrics-only SFTP mapping produces raw provenance, alias-normalized mean and sample SD", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "p6-metrics-chain-"));
  try {
    const provider = providerFor(workspace, csvFor([
      { seed: 42, metric: "AUC", value: 0.4 }, { seed: 42, metric: "roc_auc", value: 0.4 },
      { seed: 42, metric: "ECE", value: 0.1 }, { seed: 42, metric: "ece", value: 0.1 },
      { seed: 43, metric: "auc", value: 0.6 }, { seed: 43, metric: "ECE", value: 0.3 },
    ]));
    const report = await __syncPendingResultMetricsForTest(provider);
    assert.equal(report.downloaded, true);
    assert.equal(report.included.length, 1);
    const call = provider.calls[0];
    assert.equal(call[0], "sync.downloadMappedPaths");
    assert.equal(call[1].metricsOnly, true);
    assert.equal(call[1].confirm, true);
    assert.equal(call[1].pathConfirmed, true);
    assert.equal(call[1].server.id, "worker-a");
    assert.equal(call[1].server.host, "worker-a.example", "the mapped transfer follows the configured Worker endpoint");
    assert.equal(call[1].server.remotePath, "/project");
    assert.equal(provider.calls.every(([method]) => method === "sync.downloadMappedPaths"), true,
      "the cross test uses only the mapped metrics transport seam");
    assert.deepEqual(call[1].entries.map((entry) => entry.remotePath), [remoteCsv]);
    assert.ok(call[1].entries.every((entry) => !/weight|checkpoint|\.log$/i.test(entry.remotePath)));
    const localMetricFiles = [];
    const visit = (directory) => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) visit(full);
        else if (entry.isFile() && full.includes(localCsvPattern)) localMetricFiles.push(full);
      }
    };
    visit(workspace);
    assert.equal(localMetricFiles.length, 1);
    assert.equal(fs.readFileSync(localMetricFiles[0], "utf8").split("\n").length, 8);
    const outputRoot = path.join(workspace, "experiments", "results", "final");
    const csv = fs.readFileSync(path.join(outputRoot, "final.csv"), "utf8");
    const markdown = fs.readFileSync(path.join(outputRoot, "final.md"), "utf8");
    const table = tablesModule.exports.readCsv(csv);
    assert.equal(table.header.filter((column) => column === "roc_auc_mean").length, 1);
    assert.equal(table.rows[0][table.header.indexOf("roc_auc_mean")], "0.5");
    assert.ok(Math.abs(Number(table.rows[0][table.header.indexOf("roc_auc_sd")]) - Math.sqrt(0.02)) < 1e-12);
    assert.equal(table.rows[0][table.header.indexOf("ece_mean")], "0.2");
    assert.ok(Math.abs(Number(table.rows[0][table.header.indexOf("ece_sd")]) - Math.sqrt(0.02)) < 1e-12);
    assert.match(markdown, /0\.5000 ± 0\.1414/);
    const registry = JSON.parse(fs.readFileSync(path.join(workspace, "simple_cluster", "results", "project_table_registry.json"), "utf8"));
    assert.deepEqual(Object.keys(registry.plans[planFile].records[0].metrics).sort(), ["AUC", "ECE", "ece", "roc_auc"].sort());
    assert.equal(registry.plans[planFile].records[0].runId, "run-complete");
    assert.ok(localMetricFiles[0].toLowerCase().includes(path.join("experiments", "results", "demo", "raw").toLowerCase()));
  } finally {
    vscode.workspace.workspaceFolders = [];
  }
});

test("conflicting raw aliases retain the previous published CSV and Markdown", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "p6-metrics-conflict-"));
  try {
    const oldRegistry = seedRegistry();
    const prior = tablesModule.exports.buildTables(oldRegistry).final;
    const outputRoot = path.join(workspace, "experiments", "results", "final");
    fs.mkdirSync(outputRoot, { recursive: true });
    fs.writeFileSync(path.join(outputRoot, "final.csv"), tablesModule.exports.writeCsv(prior.header, prior.rows), "utf8");
    fs.writeFileSync(path.join(outputRoot, "final.md"), prior.markdown, "utf8");
    const beforeCsv = fs.readFileSync(path.join(outputRoot, "final.csv"), "utf8");
    const beforeMd = fs.readFileSync(path.join(outputRoot, "final.md"), "utf8");
    const provider = providerFor(workspace, csvFor([
      { seed: 42, metric: "AUC", value: 0.4 }, { seed: 42, metric: "roc_auc", value: 0.8 },
      { seed: 43, metric: "AUC", value: 0.6 },
    ]), oldRegistry);
    await assert.rejects(() => __syncPendingResultMetricsForTest(provider), /等价指标值冲突/);
    assert.equal(provider.calls[0][1].metricsOnly, true);
    assert.equal(fs.readFileSync(path.join(outputRoot, "final.csv"), "utf8"), beforeCsv);
    assert.equal(fs.readFileSync(path.join(outputRoot, "final.md"), "utf8"), beforeMd);
  } finally {
    vscode.workspace.workspaceFolders = [];
  }
});

test("completed postprocess downloads and publishes metrics once through the production hook", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "p6-postprocess-chain-"));
  try {
    vscode.workspace.workspaceFolders = [{ uri: { scheme: "file", path: workspace.replace(/\\/g, "/"),
      fsPath: workspace, toString: () => "file://" + workspace.replace(/\\/g, "/") } }];
    const provider = providerFor(workspace, csvFor([
      { seed: 42, metric: "AUC", value: 0.4 }, { seed: 43, metric: "AUC", value: 0.6 },
    ]));
    provider.testSummary.results = [42, 43].map((seed) => ({
      workerId: "worker-a", runId: "run-complete", attempt: "1", planRevision: "rev-1",
      dimensions: { case: "alpha", seed: String(seed), method: "demo", dataset: "set" },
      metrics: { AUC: { value: seed === 42 ? 0.4 : 0.6 } }, sourceFiles: [{ path: remoteCsv }],
    }));
    let queue = { schemaVersion: 1, publishedSignature: "published-v1", previewSignature: "preview-v1",
      plans: [{ id: "demo", planFile, revision: "rev-1", planJobCount: 1, recoveryMissingCount: 0,
        jobs: [{ index: 0, attempt: 1, commandId: "command-1", status: "completed", workerId: "worker-a" }] }] };
    provider.loadDistributedQueue = async () => queue;
    provider.saveDistributedQueue = async (_root, next) => { queue = next; };
    provider.distributedQueueWritePromise = Promise.resolve();
    const stages = [];
    provider.syncDistributedJobArtifacts = async (_root, _queue, stage) => { stages.push(stage); };
    provider.rebuildDistributedResults = async (_root, _queue, preview) => { stages.push(preview ? "preview-rebuild" : "final-rebuild"); };
    provider.recordActionError = (action) => { throw new Error("unexpected postprocess error: " + action.message); };
    const host = Object.assign(Object.create(RealtimeTunnelPanelProvider.prototype), provider);
    const confirmations = [];
    const confirmDownloads = host.confirmMappedResultDownloads;
    host.confirmMappedResultDownloads = async (...args) => {
      confirmations.push(args[4]);
      return confirmDownloads.apply(host, args);
    };
    const warningCount = uiNotices.filter(([kind]) => kind === "warning").length;
    host.scheduleDistributedPostprocess(workspace, true);
    assert.ok(host.distributedPostprocessPromise);
    await host.distributedPostprocessPromise;
    await Promise.resolve();

    assert.deepEqual(stages, ["fragments", "preview-rebuild", "bulk", "final-rebuild"]);
    assert.equal(provider.calls.length, 1, "completion hook reaches mapped SFTP transport once");
    const [method, params] = provider.calls[0];
    assert.equal(method, "sync.downloadMappedPaths");
    assert.equal(params.metricsOnly, true);
    assert.equal(confirmations[0]?.missingOnly, true, "background completion downloads only missing mapped raw files");
    assert.deepEqual(params.entries.map((entry) => entry.remotePath), [remoteCsv]);
    assert.equal(queue.localMetricsSignature?.length > 0, true, "successful publication records the completion signature");
    assert.equal(uiNotices.filter(([kind]) => kind === "warning").length, warningCount, "background flow requires no modal warning");
    assert.ok(fs.existsSync(path.join(workspace, "experiments", "results", "final", "final.csv")));
    assert.ok(fs.existsSync(path.join(workspace, "experiments", "results", "final", "final.md")));

    host.scheduleDistributedPostprocess(workspace, true);
    await host.distributedPostprocessPromise;
    await Promise.resolve();
    assert.equal(provider.calls.length, 1, "the same completion signature does not download twice");
  } finally {
    vscode.workspace.workspaceFolders = [];
  }
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
    host.withRemoteActionResource = async (_workerId, _resource, _request, callback) => {
      host.distributedQueueGeneration += 1;
      return callback();
    };
    const emptyManifestFingerprint = crypto.createHash("sha256").update("[]").digest("hex");
    await assert.rejects(() => host.sendDistributedJob(
      { id: "plan-a", projectId: "project-a", planJobCount: 1, planFile, revision: "rev-1", codeFingerprint: emptyManifestFingerprint },
      { index: 0, attempt: 1, case: "alpha", seed: 42, outputDir: "runs/a" }, "worker-a", undefined, "command-a",
    ), /提交已取消或项目已切换/);
    assert.equal(sends, 0, "generation changed while awaiting the local resource lock must block the remote write");
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
