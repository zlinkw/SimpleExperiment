const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const test = require("node:test");

const root = path.join(__dirname, "..", "..");
const extension = fs.readFileSync(path.join(root, "src", "extension", "legacy.ts"), "utf8");
const panel = fs.readFileSync(path.join(root, "src", "ui", "PanelHtml.legacy.ts"), "utf8");
const vscodeStub = {
  commands: { executeCommand: async () => ({ ok: true }) },
  workspace: {
    getConfiguration: (_section, scope) => ({ get: (key, fallback) => key === "projectAdapterRules" && scope?.fsPath && adapterRulesByRoot.get(scope.fsPath) || fallback }),
    workspaceFolders: [{ uri: { fsPath: "", scheme: "file", path: "" } }],
  },
  window: {
    showSaveDialog: async () => undefined,
    showWarningMessage: async (_text, _options, first) => vscodeStub.window.downloadChoice || first,
    showInformationMessage: async () => {},
    setStatusBarMessage: () => {},
    withProgress: async (_options, task) => task({ report() {} }, { isCancellationRequested: false }),
  },
  Uri: { file: (value) => ({ fsPath: value }) },
  ProgressLocation: { Notification: 1 },
};
const adapterRulesByRoot = new Map();
const originalLoad = Module._load;
Module._load = function (request, ...args) {
  return request === "vscode" ? vscodeStub : originalLoad.call(this, request, ...args);
};

function sliceBetween(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `${start} .. ${end}`);
  return source.slice(from, to);
}

test("the result table button merges every known result scope before any metric download", () => {
  assert.match(panel, /data-command="syncPendingPlanArtifacts"/);
  assert.match(panel, /同步服务器结果并更新总表/);
  assert.match(panel, /下载指标并重新汇总/);
  assert.doesNotMatch(panel, /刷新所有结果|合并最新结果并拉取指标/);
  assert.match(panel, /尚无总表。点击“同步服务器结果并更新总表”/);
  assert.doesNotMatch(panel, /同步待处理产物 \(/);
  assert.doesNotMatch(panel, /待处理产物计数属于自动的权重和日志同步/);
  assert.match(extension, /case "syncPendingPlanArtifacts":\s*await this\.syncPendingResultMetricsFromUi\(\)/);
  const manual = sliceBetween(extension, "async syncPendingResultMetricsFromUi(", "async summaryForMetricDownload(");
  const mergeAt = manual.indexOf("await this.mergeLatestWorkerVersions(");
  const downloadAt = manual.indexOf("downloadMappedResultBatch(");
  assert.ok(mergeAt > 0 && downloadAt > mergeAt);
  assert.match(manual, /latestPlanSyncEntry\(ledger, planFile\)/);
  assert.match(manual, /localPlanMetadata\.plans/);
  assert.match(manual, /targets\.length >= 2/);
  assert.match(manual, /outcome === false/);
  assert.match(manual, /mergeConflictForPlan\(unverifiedScopes, item, item\.candidates\)/);
  assert.match(manual, /acceptedCompletedRevision\(/);
  assert.match(manual, /metricsOnly: true/);
  assert.equal(manual.match(/mergeLatestWorkerVersions\(/g).length, 1);
  assert.doesNotMatch(manual, /pendingPlanSyncs\(ledger\)|markPlanSyncComplete\(/);
  assert.doesNotMatch(manual, /this\.planFileInput \|\| this\.selectedPlanId/);
  assert.doesNotMatch(manual, /syncPendingPlanArtifacts\(|reconcileProjectFilesAcrossWorkers|syncCodeTargets\(/);
  const background = sliceBetween(extension, "async syncPendingPlanArtifacts(onlyKey = \"\", knownSummary?)", "async reconcileProjectFilesAcrossWorkers");
  assert.doesNotMatch(background, /mergeLatestWorkerVersions\(/);
  const auto = extension.slice(extension.indexOf("async refreshResultsSummary"), extension.indexOf("scheduleResultsSummaryRefreshFromRealtime"));
  assert.doesNotMatch(auto, /syncPendingPlanArtifacts\(pending\.key, summary\)/);
  assert.doesNotMatch(auto, /syncPendingResultMetricsFromUi|mergeLatestWorkerVersions/);
});

function planEntry(planFile, owner, revision) {
  return {
    planFile,
    revision,
    runId: "run-" + owner,
    sourceWorkerId: owner,
    artifactPaths: [`simple_cluster/results/${owner}/raw.csv`],
    directoryPaths: [`simple_cluster/results/${owner}`],
    destinations: { other: { status: "pending" } },
  };
}

function rawLocation(workspace, plan = "a", dataset = "_unassigned", remote = "simple_cluster/results/w1/raw.csv") {
  const key = require("../../dist/results/ProjectResultTables").planDirectoryKey("experiments/plans/" + plan + ".yaml");
  const hash = require("node:crypto").createHash("sha256").update(remote).digest("hex").slice(0, 8);
  return path.join(workspace, "experiments", "results", dataset, "plans", key, "raw", path.basename(remote, ".csv") + "__" + hash + ".csv");
}
function summaryFor(planFile, owner) {
  return {
    planFile,
    planRevision: owner === "w1" ? "r1" : "r2",
    resultOwnerWorkerId: owner,
    rawResultCsvPath: `simple_cluster/results/${owner}/raw.csv`,
    aggregateCsvPath: `simple_cluster/results/${owner}/detail.csv`,
    workerResultTables: [{
      workerId: owner,
      rawResultCsvPath: `simple_cluster/results/${owner}/raw.csv`,
      aggregateCsvPath: `simple_cluster/results/${owner}/detail.csv`,
      aggregateStatus: "ready",
    }],
  };
}

function sftpTarget(id, remotePath) {
  return {
    id, host: id + ".example", user: "exp", port: 22, remotePath,
    transferHost: id + ".example", resolvedHost: id + ".example", sftpHost: id + ".example", sshHost: id + ".example",
    networkHost: id + ".example", sshConfigHost: "", sshConfigAlias: "",
  };
}

function providerFor(workspace, options = {}) {
  const workers = options.workers || [{ id: "w1" }, { id: "w2" }];
  const calls = [];
  const ledger = {
    schemaVersion: 2,
    entries: options.onlyFirst ? {
      a: planEntry("experiments/plans/a.yaml", "w1", "r1"),
    } : {
      a: planEntry("experiments/plans/a.yaml", "w1", "r1"),
      b: planEntry("experiments/plans/b.yaml", "w2", options.ledgerRevision || "r2"),
    },
  };
  const provider = {
    calls,
    planFileInput: options.selectedPlan || "",
    selectedPlanId: options.selectedPlan || "",
    selectedRunKeys: new Set(),
    selectedExperimentIds: new Set(),
    selectedArchiveKeys: new Set(),
    selectedTaskUiKeys: new Set(),
    context: { globalStorageUri: { fsPath: workspace } },
    localPlanMetadata: { plans: [
      { planFile: "experiments/plans/a.yaml", revision: "r1", outputSignals: ["结果目录：simple_cluster/results/w1"] },
      ...(options.onlyFirst ? [] : [{ planFile: "experiments/plans/b.yaml", revision: options.revision || "r2", outputSignals: ["结果目录：simple_cluster/results/w2"], outputCandidates: ["work_dirs/b/weight.pt"] }]),
    ] },
    setupConfig: { workerTunnels: workers },
    client: {
      getResultsSummary: async (planFile) => {
        calls.push(["summary", planFile]);
        return summaryFor(planFile, planFile.includes("/a.") ? "w1" : "w2");
      },
      downloadWorkerFile: async (...args) => { calls.push(["download", ...args]); },
      downloadFile: async (...args) => { calls.push(["hub-download", ...args]); },
    },
    simpleSftpApiCall: async (method, params) => {
      calls.push([method, params]);
      if (options.transferError) throw new Error(options.transferError);
      const written = (params.entries || []).map((entry) => entry.localRelativePath);
      for (const relative of written) {
        const full = path.join(workspace, ...relative.split("/"));
        fs.mkdirSync(path.dirname(full), { recursive: true });
        const owner = String(params.server?.id || "w");
        fs.writeFileSync(full, "case,seed,method,dataset,metric,value\nalpha,1," + owner + ",set,AUC,0.91\n");
      }
      return { ok: true, fileCount: written.length, completedFiles: written.length, sshCount: 1, streamCount: 1 };
    },
    sftpServerOptions: (target) => ({
      id: target.id, host: target.host, user: target.user, port: target.port, remotePath: target.remotePath,
      transferHost: target.host, resolvedHost: target.host,
    }),
    postState() { calls.push(["postState", this.resultsSummary]); },
    resolveSelectedPlanFile: (hint = "") => String(hint || provider.planFileInput || ""),
    resultsSummary: options.previousSummary,
    captureProjectContext: () => ({ root: workspace, generation: 1 }),
    projectContextIsCurrent: () => options.current !== false,
    effectiveConnectionMode: () => options.mode || "tunnel",
    refreshLocalPlanMetadataForAction: async () => { calls.push(["metadata"]); },
    loadPlanSyncLedger: async () => options.ledger || ledger,
    workerCodeSyncTargets: () => options.targets || workers.map((worker) => sftpTarget(worker.id, "/projects/" + worker.id)),
    enabledWorkerConfigs: () => workers,
    missingCapabilities: () => [],
    filterResultsSummaryForPlan: (value) => value,
    mergeLatestWorkerVersions: async (...args) => {
      calls.push(["merge", [...args[2]], args[3]]);
      return options.merge === undefined ? { completed: [], errors: options.mergeErrors || [] } : options.merge;
    },
  };
  return provider;
}

test("dataset metadata overrides stale directory hints and preserves the old local table", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "simple-result-layout-sync-"));
  const legacy = path.join(workspace, "experiments/results/final/final.csv");
  fs.mkdirSync(path.dirname(legacy), { recursive: true });
  fs.writeFileSync(legacy, "old table retained", "utf8");
  const provider = providerFor(workspace, { onlyFirst: true });
  const newPath = "simple_cluster/results/by_plan/a__stable/datasets/set/final.csv";
  provider.localPlanMetadata.plans[0].outputSignals = ["结果目录：old_layout/full_outputs"];
  provider.client.getResultsSummary = async planFile => ({
    ...summaryFor(planFile, "w1"),
    datasetResultTables: [{ dataset: "set", datasetKey: "set", finalCsvPath: newPath }],
  });
  provider.loadDistributedQueue = async () => ({ plans: [] });
  const originalSftp = provider.simpleSftpApiCall;
  provider.simpleSftpApiCall = async (method, params) => {
    if (method !== "sync.projectInventory") return originalSftp(method, params);
    provider.calls.push([method, params]);
    assert.equal(params.relativePath, ".");
    assert.ok(params.scopePaths.includes(newPath));
    assert.ok(params.scopePaths.every(file => /\.(csv|json|md)$/.test(file)));
    return { files: Object.fromEntries(params.scopePaths.map(file => [file, { sha256: "a".repeat(64), size: 10 }])) };
  };
  provider.mergeLatestWorkerVersions = function (...args) {
    this.calls.push(["merge", args[2]]);
    return require("../../dist/extension/legacy.js").RealtimeTunnelPanelProvider.prototype.mergeLatestWorkerVersions.call(this, ...args);
  };
  const result = await require("../../dist/extension/legacy.js").__syncPendingResultMetricsForTest(provider);
  assert.equal(result.downloaded, true);
  const scopes = provider.calls.find(call => call[0] === "merge")[1];
  assert.ok(scopes.includes(newPath));
  assert.ok(scopes.every(file => /\.(csv|json|md)$/.test(file)));
  assert.equal(scopes.some(file => file.startsWith("old_layout/")), false);
  assert.equal(fs.readFileSync(legacy, "utf8"), "old table retained");
  assert.ok(fs.existsSync(path.join(workspace, "experiments/results/set/final/final.csv")));
  assert.equal(provider.calls.filter(call => call[0] === "sync.projectInventory").length, 2);
});

test("unindexed summaries never invoke the full directory merge fallback", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "simple-result-empty-sync-"));
  const provider = providerFor(workspace, { onlyFirst: true });
  provider.client.getResultsSummary = async planFile => ({ planFile, planRevision: "r1", results: [] });
  await assert.rejects(require("../../dist/extension/legacy.js").__syncPendingResultMetricsForTest(provider), /服务器摘要尚未收录可解析的 CSV/);
  assert.equal(provider.calls.some(call => call[0] === "merge"), false);
  assert.equal(provider.calls.some(call => call[0] === "sync.downloadMappedPaths"), false);
});

test("two pending plans merge on all workers before either metric download when no plan is selected", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "simple-result-metrics-"));
  try {
    const provider = providerFor(workspace);
    const { __syncPendingResultMetricsForTest } = require("../../dist/extension/legacy.js");
    const result = await __syncPendingResultMetricsForTest(provider);
    assert.deepEqual(result.plans, ["experiments/plans/a.yaml", "experiments/plans/b.yaml"]);
    assert.equal(result.downloaded, true);
    const merges = provider.calls.filter((call) => call[0] === "merge");
    const firstDownload = provider.calls.findIndex((call) => call[0] === "sync.downloadMappedPaths");
    const lastMerge = provider.calls.map((call) => call[0]).lastIndexOf("merge");
    assert.equal(merges.length, 1);
    assert.deepEqual(merges[0][1], ["simple_cluster/results/w1/detail.csv", "simple_cluster/results/w1/raw.csv", "simple_cluster/results/w2/detail.csv", "simple_cluster/results/w2/raw.csv"]);
    assert.ok(lastMerge >= 0 && lastMerge < firstDownload);
    const mapped = provider.calls.filter((call) => call[0] === "sync.downloadMappedPaths");
    assert.equal(mapped.length, 2);
    assert.deepEqual(mapped.map((call) => call[1].server.id), ["w1", "w2"]);
    assert.equal(mapped.every((call) => call[1].confirm === true && call[1].pathConfirmed === true && call[1].maxFileBytes === 128 * 1024 * 1024 && call[1].localPath === workspace), true);
    assert.deepEqual(mapped[0][1].entries.map((entry) => entry.remotePath), [
      "simple_cluster/results/w1/raw.csv",
      "simple_cluster/results/w1/detail.csv",
    ]);
    assert.equal(mapped[0][1].entries.every((entry) => !path.isAbsolute(entry.remotePath) && !path.isAbsolute(entry.localRelativePath)), true);
    assert.equal(provider.calls.some((call) => call[0] === "download" || call[0] === "hub-download"), false);
    assert.equal(provider.calls.some((call) => call[0] === "postState"), true);
    assert.equal(provider.calls.some((call) => String(JSON.stringify(call[1]?.entries || "")).includes("weight")), false);
  } finally {
    vscodeStub.workspace.workspaceFolders = [{ uri: { fsPath: "", scheme: "file", path: "" } }];
  }
});

test("a fully synced ledger still merges known plan results before download", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "simple-result-metrics-synced-"));
  try {
    const synced = {
      schemaVersion: 2,
      entries: {
        a: { ...planEntry("experiments/plans/a.yaml", "w1", "r1"), destinations: { w2: { status: "synced", syncedAt: "t" } } },
        b: { ...planEntry("experiments/plans/b.yaml", "w2", "r2"), destinations: { w1: { status: "synced", syncedAt: "t" } } },
      },
    };
    const provider = providerFor(workspace, { ledger: synced });
    const { __syncPendingResultMetricsForTest } = require("../../dist/extension/legacy.js");
    const result = await __syncPendingResultMetricsForTest(provider);
    assert.equal(result.reason, undefined);
    assert.equal(result.downloaded, true);
    assert.equal(provider.calls.filter((call) => call[0] === "merge").length, 1);
    assert.ok(provider.calls.map((call) => call[0]).lastIndexOf("merge") < provider.calls.findIndex((call) => call[0] === "sync.downloadMappedPaths"));
    assert.equal(provider.calls.filter((call) => call[0] === "sync.downloadMappedPaths").length, 2);
    assert.equal(provider.calls.some((call) => call[0] === "mark"), false);
  } finally {
    vscodeStub.workspace.workspaceFolders = [{ uri: { fsPath: "", scheme: "file", path: "" } }];
  }
});

test("merge rejection, conflicts, offline workers and revision changes download nothing", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "simple-result-metrics-fail-"));
  const { __syncPendingResultMetricsForTest } = require("../../dist/extension/legacy.js");
  try {
    const cancelled = providerFor(workspace, { merge: false });
    await assert.rejects(() => __syncPendingResultMetricsForTest(cancelled), /未下载指标文件/);
    assert.equal(cancelled.calls.some((call) => call[0] === "sync.downloadMappedPaths" || call[0] === "download"), false);

    const conflicted = providerFor(workspace, { mergeErrors: ["simple_cluster/results/w1：没有可靠的最新版", "simple_cluster/results/w2：没有可靠的最新版"] });
    await assert.rejects(() => __syncPendingResultMetricsForTest(conflicted), /未完全合并|未下载/);
    assert.equal(conflicted.calls.some((call) => call[0] === "sync.downloadMappedPaths" || call[0] === "download"), false);

    const offline = providerFor(workspace, { targets: [{ id: "w1" }] });
    await assert.rejects(() => __syncPendingResultMetricsForTest(offline), /未连接|未收录|w2/);
    assert.equal(offline.calls.some((call) => call[0] === "merge"), false);
    assert.equal(offline.resultsSummary === undefined || offline.resultsSummary.stale !== false, true);

    const stale = providerFor(workspace, { ledgerRevision: "old" });
    const staleResult = await __syncPendingResultMetricsForTest(stale);
    assert.match(staleResult.skipped.join("\n"), /revision/);
    assert.equal(staleResult.included.some((line) => line.includes("b.yaml")), false);
    assert.ok(stale.calls.some((call) => call[0] === "merge"));
  } finally {
    vscodeStub.workspace.workspaceFolders = [{ uri: { fsPath: "", scheme: "file", path: "" } }];
  }
});

test("one connected worker skips cross-worker merge and still downloads pending metrics", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "simple-result-metrics-one-"));
  try {
    const provider = providerFor(workspace, { workers: [{ id: "w1" }], targets: [sftpTarget("w1", "/projects/w1")], onlyFirst: true });
    const { __syncPendingResultMetricsForTest } = require("../../dist/extension/legacy.js");
    const result = await __syncPendingResultMetricsForTest(provider);
    assert.equal(result.merged, true);
    assert.equal(provider.calls.some((call) => call[0] === "merge"), false);
    assert.equal(provider.calls.filter((call) => call[0] === "sync.downloadMappedPaths").length, 1);
    assert.equal(provider.calls.filter((call) => call[0] === "sync.downloadMappedPaths")[0][1].entries.length, 2);
  } finally {
    vscodeStub.workspace.workspaceFolders = [{ uri: { fsPath: "", scheme: "file", path: "" } }];
  }
});

test("bulk plan sync keeps the previous candidate policy and metric mode stays optional", () => {
  const download = sliceBetween(extension, "collectMappedResultDownloadBatches(", "async loadProjectTableRegistry");
  assert.match(download, /options\.metricsOnly === true/);
  assert.match(download, /metricsOnly && !isResultMetricFile\(remotePath\)/);
  assert.match(download, /【批量同步结果确认】/);
  assert.match(download, /"覆盖已有文件并同步", "只同步缺失文件"/);
  assert.match(download, /批量同步已取消/);
  const bulk = sliceBetween(extension, "async syncAllResultArtifactsFromUi(message)", "async syncPendingResultMetricsFromUi");
  assert.match(bulk, /resultSummarySyncCandidates\(summary, planFile\)/);
  assert.match(bulk, /metricsOnly: false/);
  assert.doesNotMatch(bulk, /mergeLatestWorkerVersions\(/);
  assert.match(download, /sync\.downloadMappedPaths/);
  assert.doesNotMatch(download, /client\.downloadWorkerFile\(/);
});

test("the same worker across plans is one mapped download and a second worker is another", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "simple-result-metrics-batch-"));
  vscodeStub.workspace.workspaceFolders = [{ uri: { fsPath: workspace, scheme: "file", path: workspace } }];
  const previous = vscodeStub.window.showWarningMessage;
  vscodeStub.window.showWarningMessage = async () => "只同步缺失文件";
  try {
    fs.writeFileSync(path.join(workspace, "existing.csv"), "old");
    const shared = {
      schemaVersion: 2,
      entries: {
        a: planEntry("experiments/plans/a.yaml", "w1", "r1"),
        b: { ...planEntry("experiments/plans/b.yaml", "w1", "r2"), artifactPaths: ["simple_cluster/results/w1/b-raw.csv"] },
      },
    };
    const provider = providerFor(workspace, { ledger: shared, workers: [{ id: "w1" }, { id: "w2" }], targets: [sftpTarget("w1", "/projects/w1"), sftpTarget("w2", "/projects/w2")] });
    provider.localPlanMetadata.plans[1].revision = "r2";
    provider.client.getResultsSummary = async (planFile) => {
      provider.calls.push(["summary", planFile]);
      const owner = "w1";
      const raw = planFile.includes("/a.") ? "simple_cluster/results/w1/raw.csv" : "simple_cluster/results/w1/b-raw.csv";
      return {
        planFile, planRevision: planFile.includes("/a.") ? "r1" : "r2", resultOwnerWorkerId: owner,
        rawResultCsvPath: raw, aggregateCsvPath: raw.replace("raw", "detail"),
        workerResultTables: [{ workerId: owner, rawResultCsvPath: raw, aggregateCsvPath: raw.replace("raw", "detail"), aggregateStatus: "ready" }],
      };
    };
    const { __handleResultUiCommandForTest } = require("../../dist/extension/legacy.js");
    await __handleResultUiCommandForTest(provider, { command: "syncPendingPlanArtifacts" });
    const mapped = provider.calls.filter((call) => call[0] === "sync.downloadMappedPaths");
    assert.equal(mapped.length, 1);
    assert.equal(mapped[0][1].server.id, "w1");
    assert.equal(mapped[0][1].entries.length, 4);
    assert.equal(provider.calls.filter((call) => call[0] === "download").length, 0);
  } finally {
    vscodeStub.window.showWarningMessage = previous;
    vscodeStub.workspace.workspaceFolders = [{ uri: { fsPath: "", scheme: "file", path: "" } }];
  }
});

test("overwrite refusal, transfer failure and project switch do not publish a new summary", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "simple-result-metrics-guard-"));
  vscodeStub.workspace.workspaceFolders = [{ uri: { fsPath: workspace, scheme: "file", path: workspace } }];
  const previous = vscodeStub.window.showWarningMessage;
  try {
    const { __handleResultUiCommandForTest } = require("../../dist/extension/legacy.js");
    vscodeStub.window.showWarningMessage = async () => undefined;
    const { __syncPendingResultMetricsForTest } = require("../../dist/extension/legacy.js");
    const refused = providerFor(workspace, { previousSummary: { planFile: "old", stale: true } });
    const raw = rawLocation(workspace);
    fs.mkdirSync(path.dirname(raw), { recursive: true });
    fs.writeFileSync(raw, "old");
    await assert.rejects(() => __handleResultUiCommandForTest(refused, { command: "syncPendingPlanArtifacts" }), /已取消/);
    assert.equal(refused.calls.some((call) => call[0] === "sync.downloadMappedPaths"), false);
    assert.equal(refused.resultsSummary.stale, true);

    vscodeStub.window.showWarningMessage = async () => "覆盖已有文件并同步";
    const failed = providerFor(workspace, { transferError: "ssh closed", previousSummary: { planFile: "old", stale: true } });
    await assert.rejects(() => __handleResultUiCommandForTest(failed, { command: "syncPendingPlanArtifacts" }), /ssh closed|未收录/);
    assert.equal(failed.calls.filter((call) => call[0] === "sync.downloadMappedPaths").length >= 1, true);
    assert.equal(failed.resultsSummary.stale, true);
    assert.equal(failed.resultsSummary.planFile, "old");

    let switched = false;
    const moving = providerFor(workspace, { previousSummary: { planFile: "old", stale: true } });
    const originalCurrent = moving.projectContextIsCurrent;
    moving.projectContextIsCurrent = () => switched ? false : originalCurrent();
    moving.simpleSftpApiCall = async (method, params) => {
      switched = true;
      moving.calls.push([method, params]);
      return { ok: true, fileCount: params.entries.length };
    };
    const moved = await __syncPendingResultMetricsForTest(moving);
    assert.equal(switched, true);
    assert.equal(moved.reason, "revision-changed");
    assert.equal(moving.calls.some((call) => call[0] === "postState"), false);
    assert.equal(moving.resultsSummary.stale, true);
  } finally {
    vscodeStub.window.showWarningMessage = previous;
    vscodeStub.workspace.workspaceFolders = [{ uri: { fsPath: "", scheme: "file", path: "" } }];
  }
});

test("refresh all results redraws tables from local metric files for empty and stale catalogs", async () => {
  vscodeStub.window.downloadChoice = "只同步缺失文件";
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "simple-result-metrics-refresh-"));
  vscodeStub.workspace.workspaceFolders = [{ uri: { fsPath: workspace, scheme: "file", path: workspace } }];
  try {
    const csvDir = path.dirname(rawLocation(workspace));
    fs.mkdirSync(csvDir, { recursive: true });
    fs.writeFileSync(rawLocation(workspace), "case,seed,method,dataset,metric,value\nalpha,1,w1,set,AUC,0.8\n");
    const staleDir = path.join(workspace, "experiments", "results", "set", "final");
    fs.mkdirSync(staleDir, { recursive: true });
    fs.writeFileSync(path.join(staleDir, "final.csv"), "result_family,dataset,rate_percent,eval_protocol,jobs,auc_mean,auc_sd\r\nold,set,, ,1,0.1000,\r\n");
    const provider = providerFor(workspace, { onlyFirst: true, workers: [{ id: "w1" }], targets: [sftpTarget("w1", "/projects/w1")], previousSummary: { planFile: "experiments/plans/a.yaml", planRevision: "stale", results: [] } });
    provider.planFileInput = "experiments/plans/a.yaml";
    provider.client.getResultsSummary = async () => ({
      planFile: "experiments/plans/a.yaml",
      planRevision: "r1",
      resultOwnerWorkerId: "w1",
      rawResultCsvPath: "simple_cluster/results/w1/raw.csv",
      workerResultTables: [{ workerId: "w1", rawResultCsvPath: "simple_cluster/results/w1/raw.csv", aggregateStatus: "pending" }],
      results: [],
    });
    provider.loadProjectTableRegistry = async () => ({ schemaVersion: 1, plans: {} });
    provider.loadPlanSyncLedger = async () => ({ schemaVersion: 2, entries: {} });
    const { __handleResultUiCommandForTest } = require("../../dist/extension/legacy.js");
    await __handleResultUiCommandForTest(provider, { command: "rebuildProjectResultTables" });
    const posted = provider.calls.filter((call) => call[0] === "postState").map((call) => call[1]);
    assert.equal(posted.length > 0, true);
    assert.equal(posted.at(-1).planRevision, "r1");
    assert.equal(posted.at(-1).results[0].metrics.AUC.value, 0.8);
    const finalCsv = fs.readFileSync(path.join(staleDir, "final.csv"), "utf8");
    assert.match(finalCsv, /0\.8/);
    assert.doesNotMatch(finalCsv, /0\.1000/);
  } finally {
    vscodeStub.workspace.workspaceFolders = [{ uri: { fsPath: "", scheme: "file", path: "" } }];
  }
});

test("two plans sharing one remote CSV use one mapped RPC and land in both plan files", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "simple-result-metrics-shared-"));
  vscodeStub.workspace.workspaceFolders = [{ uri: { fsPath: workspace, scheme: "file", path: workspace } }];
  try {
    const shared = {
      schemaVersion: 2,
      entries: {
        a: planEntry("experiments/plans/a.yaml", "w1", "r1"),
        b: { ...planEntry("experiments/plans/b.yaml", "w1", "r1"), artifactPaths: ["simple_cluster/results/shared/raw.csv"] },
      },
    };
    const provider = providerFor(workspace, { ledger: shared, workers: [{ id: "w1" }], targets: [sftpTarget("w1", "/projects/w1")] });
    provider.localPlanMetadata.plans = [
      { planFile: "experiments/plans/a.yaml", revision: "r1" },
      { planFile: "experiments/plans/b.yaml", revision: "r1" },
    ];
    provider.client.getResultsSummary = async (planFile) => ({
      planFile, planRevision: "r1", resultOwnerWorkerId: "w1",
      rawResultCsvPath: "simple_cluster/results/shared/raw.csv",
      aggregateCsvPath: "simple_cluster/results/shared/detail.csv",
      workerResultTables: [{ workerId: "w1", rawResultCsvPath: "simple_cluster/results/shared/raw.csv", aggregateCsvPath: "simple_cluster/results/shared/detail.csv", aggregateStatus: "ready" }],
    });
    const { __handleResultUiCommandForTest } = require("../../dist/extension/legacy.js");
    await __handleResultUiCommandForTest(provider, { command: "syncPendingPlanArtifacts" });
    const mapped = provider.calls.filter((call) => call[0] === "sync.downloadMappedPaths");
    assert.equal(mapped.length, 1);
    assert.deepEqual(mapped[0][1].entries.map((entry) => entry.remotePath).sort(), [
      "simple_cluster/results/shared/detail.csv",
      "simple_cluster/results/shared/raw.csv",
    ]);
    assert.equal(fs.existsSync(rawLocation(workspace, "a", "_unassigned", "simple_cluster/results/shared/raw.csv")), true);
    assert.equal(fs.existsSync(rawLocation(workspace, "b", "_unassigned", "simple_cluster/results/shared/raw.csv")), true);
  } finally {
    vscodeStub.workspace.workspaceFolders = [{ uri: { fsPath: "", scheme: "file", path: "" } }];
  }
});

test("quoted mapped columns refresh the visible table and a stale local file does not replace a newer summary", async () => {
  vscodeStub.window.downloadChoice = "只同步缺失文件";
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "simple-result-metrics-quoted-"));
  vscodeStub.workspace.workspaceFolders = [{ uri: { fsPath: workspace, scheme: "file", path: workspace } }];
  adapterRulesByRoot.set(workspace, { csvColumnMapping: { case: "specimen", seed: "rng", rate_percent: "rate", eval_protocol: "protocol" } });
  try {
    const csvDir = path.dirname(rawLocation(workspace));
    fs.mkdirSync(csvDir, { recursive: true });
    fs.writeFileSync(rawLocation(workspace), 'specimen,rng,method,dataset,rate,protocol,AUC\n"alpha,set",1,w1,set,10,holdout,0.77\n');
    const provider = providerFor(workspace, { onlyFirst: true, workers: [{ id: "w1" }], targets: [sftpTarget("w1", "/projects/w1")] });
    provider.planFileInput = "experiments/plans/a.yaml";
    provider.client.getResultsSummary = async () => ({
      planFile: "experiments/plans/a.yaml", planRevision: "r1", resultOwnerWorkerId: "w1",
      rawResultCsvPath: "simple_cluster/results/w1/raw.csv",
      workerResultTables: [{ workerId: "w1", rawResultCsvPath: "simple_cluster/results/w1/raw.csv", aggregateStatus: "pending" }],
      results: [],
    });
    provider.loadProjectTableRegistry = async () => ({ schemaVersion: 1, plans: {} });
    provider.loadPlanSyncLedger = async () => ({ schemaVersion: 2, entries: {} });
    const { __handleResultUiCommandForTest } = require("../../dist/extension/legacy.js");
    await __handleResultUiCommandForTest(provider, { command: "rebuildProjectResultTables" });
    const posted = provider.calls.filter((call) => call[0] === "postState").at(-1)[1];
    assert.equal(posted.results[0].dimensions.case, "alpha,set");
    assert.equal(posted.results[0].dimensions.rate_percent, "10");
    assert.equal(posted.results[0].dimensions.eval_protocol, "holdout");
    assert.equal(posted.results[0].dimensions.split, "");
    assert.equal(posted.results[0].metrics.AUC.value, 0.77);

    const newer = providerFor(workspace, { onlyFirst: true, workers: [{ id: "w1" }], targets: [sftpTarget("w1", "/projects/w1")] });
    newer.planFileInput = "experiments/plans/a.yaml";
    newer.client.getResultsSummary = async () => ({
      planFile: "experiments/plans/a.yaml", planRevision: "r1", lastParsedAt: "2999-01-01T00:00:00.000Z", resultOwnerWorkerId: "w1",
      rawResultCsvPath: "simple_cluster/results/w1/raw.csv",
      workerResultTables: [{ workerId: "w1", rawResultCsvPath: "simple_cluster/results/w1/raw.csv", aggregateStatus: "ready" }],
      results: [{ workerId: "w1", dimensions: { case: "beta", seed: "2", method: "w1", dataset: "set" }, metrics: { AUC: { value: 0.99 } }, sourceFiles: [{ path: "simple_cluster/results/w1/raw.csv" }] }],
    });
    newer.loadProjectTableRegistry = async () => ({ schemaVersion: 1, plans: {} });
    newer.loadPlanSyncLedger = async () => ({ schemaVersion: 2, entries: {} });
    await __handleResultUiCommandForTest(newer, { command: "rebuildProjectResultTables" });
    const fresh = newer.calls.filter((call) => call[0] === "postState").at(-1)[1];
    assert.equal(fresh.planRevision, "r1");
    assert.equal(fresh.results[0].metrics.AUC.value, 0.99);
    assert.equal(fresh.results[0].dimensions.case, "beta");
  } finally {
    adapterRulesByRoot.delete(workspace);
    vscodeStub.workspace.workspaceFolders = [{ uri: { fsPath: "", scheme: "file", path: "" } }];
  }
});

function hubProvider(workspace) {
  const provider = providerFor(workspace, { workers: [], targets: [], onlyFirst: true });
  provider.projectTopologyAssessment = () => ({ hubAllowed: true });
  provider.hubCodeSyncTarget = () => sftpTarget("hub", "/projects/hub");
  provider.workerCodeSyncTargets = () => [];
  provider.enabledWorkerConfigs = () => [];
  return provider;
}

test("Hub debug, inspection, archive evidence, and metrics use the Hub SFTP target", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "simple-result-metrics-hub-"));
  vscodeStub.workspace.workspaceFolders = [{ uri: { fsPath: workspace, scheme: "file", path: workspace } }];
  const previousWarning = vscodeStub.window.showWarningMessage;
  const previousDialog = vscodeStub.window.showSaveDialog;
  try {
    const provider = hubProvider(workspace);
    provider.localOperations = [{ type: "check-output-contract", planFile: "experiments/plans/a.yaml", planRevision: "r1", unparseableFiles: ["simple_cluster/results/w1/raw.csv"] }];
    provider.lastRealtimeState = { operations: [] };
    provider.planVersionForFile = () => ({ revision: "r1", updatedAt: "" });
    provider.debugBundlePath = "simple_cluster/debug/bundle.json";
    provider.openWorkspaceFileForProjectContext = async (relative) => { provider.calls.push(["open", relative]); return true; };
    vscodeStub.window.showWarningMessage = async () => "下载并打开";
    vscodeStub.window.showSaveDialog = async () => ({ fsPath: path.join(workspace, "saved-debug.json") });
    const { __handleResultUiCommandForTest } = require("../../dist/extension/legacy.js");
    await __handleResultUiCommandForTest(provider, { command: "downloadRemoteResult", planFile: "experiments/plans/a.yaml", remotePath: "simple_cluster/results/w1/raw.csv" });
    await __handleResultUiCommandForTest(provider, { command: "downloadDebugBundle" });
    provider.loadPlanSyncLedger = async () => ({ schemaVersion: 2, entries: {} });
    provider.localPlanMetadata.plans = [{ planFile: "experiments/plans/a.yaml", revision: "r1" }];
    provider.client.getResultsSummary = async () => ({
      planFile: "experiments/plans/a.yaml", planRevision: "r1",
      rawResultCsvPath: "simple_cluster/results/w1/raw.csv", aggregateCsvPath: "simple_cluster/results/w1/detail.csv",
      workerResultTables: [],
    });
    await __handleResultUiCommandForTest(provider, { command: "syncPendingPlanArtifacts" });
    const mapped = provider.calls.filter((call) => call[0] === "sync.downloadMappedPaths");
    assert.equal(mapped.length, 3);
    assert.equal(mapped.every((call) => call[1].server.id === "hub" && call[1].server.remotePath === "/projects/hub"), true);
    assert.equal(provider.calls.some((call) => call[0] === "download" || call[0] === "hub-download"), false);
  } finally {
    vscodeStub.window.showWarningMessage = previousWarning;
    vscodeStub.window.showSaveDialog = previousDialog;
    vscodeStub.workspace.workspaceFolders = [{ uri: { fsPath: "", scheme: "file", path: "" } }];
  }
});

test("missing-only confirmation transfers exactly the absent source", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "simple-result-metrics-missing-"));
  vscodeStub.workspace.workspaceFolders = [{ uri: { fsPath: workspace, scheme: "file", path: workspace } }];
  const previous = vscodeStub.window.showWarningMessage;
  vscodeStub.window.showWarningMessage = async () => "只同步缺失文件";
  try {
    const existing = rawLocation(workspace);
    fs.mkdirSync(path.dirname(existing), { recursive: true });
    fs.writeFileSync(existing, "old");
    const provider = providerFor(workspace, { workers: [{ id: "w1" }], targets: [sftpTarget("w1", "/projects/w1")], onlyFirst: true });
    const { __handleResultUiCommandForTest } = require("../../dist/extension/legacy.js");
    await __handleResultUiCommandForTest(provider, { command: "syncPendingPlanArtifacts" });
    const mapped = provider.calls.filter((call) => call[0] === "sync.downloadMappedPaths");
    assert.equal(mapped.length, 1);
    assert.deepEqual(mapped[0][1].entries.map((entry) => entry.remotePath), ["simple_cluster/results/w1/detail.csv"]);
  } finally {
    vscodeStub.window.showWarningMessage = previous;
    vscodeStub.workspace.workspaceFolders = [{ uri: { fsPath: "", scheme: "file", path: "" } }];
  }
});

test("distribution rejects symlink destinations and preserves content when replacement fails", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "simple-result-metrics-link-"));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "simple-result-metrics-outside-"));
  try {
    const stage = path.join(workspace, "simple_cluster", "downloads", "mapped_stage", "source.csv");
    const destination = rawLocation(workspace);
    fs.mkdirSync(path.dirname(stage), { recursive: true });
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(stage, "new");
    fs.writeFileSync(destination, "original");
    fs.writeFileSync(path.join(outside, "secret.txt"), "secret");
    let linked = false;
    try { fs.symlinkSync(path.join(outside, "secret.txt"), destination + ".link"); linked = true; }
    catch { linked = false; }
    const { __distributeMappedDownloadsForTest } = require("../../dist/extension/legacy.js");
    if (linked) {
      await assert.rejects(() => __distributeMappedDownloadsForTest(workspace, [{
        remotePath: "simple_cluster/results/w1/raw.csv",
        localRelative: "experiments/results/a/raw/a_seed.csv.link",
        stageRelative: "simple_cluster/downloads/mapped_stage/source.csv",
      }], [{ remotePath: "simple_cluster/results/w1/raw.csv" }], true), /符号链接/);
      assert.equal(fs.readFileSync(path.join(outside, "secret.txt"), "utf8"), "secret");
    }
    const originalOpen = fs.promises.open;
    fs.promises.open = async (...args) => {
      const handle = await originalOpen(...args);
      if (String(args[0]).endsWith("source.csv"))
        handle.read = async () => { throw new Error("copy interrupted"); };
      return handle;
    };
    try {
      await assert.rejects(() => __distributeMappedDownloadsForTest(workspace, [{
        remotePath: "simple_cluster/results/w1/raw.csv",
        localRelative: "experiments/results/a/raw/a_seed.csv",
        stageRelative: "simple_cluster/downloads/mapped_stage/source.csv",
      }], [{ remotePath: "simple_cluster/results/w1/raw.csv" }], true), /暂存残留|分发/);
    } finally {
      fs.promises.open = originalOpen;
    }
    assert.equal(fs.readFileSync(destination, "utf8"), "original");
    const originalRealpath = fs.promises.realpath;
    const swappedRealpath = async (target, ...args) => {
      const resolved = await originalRealpath(target, ...args);
      if (String(target).endsWith(`${path.sep}raw`)) return path.join(outside, "secret-dir");
      return resolved;
    };
    try {
      await assert.rejects(() => __distributeMappedDownloadsForTest(workspace, [{
        remotePath: "simple_cluster/results/w1/raw.csv",
        localRelative: "experiments/results/a/raw/a_seed.csv",
        stageRelative: "simple_cluster/downloads/mapped_stage/source.csv",
      }], [{ remotePath: "simple_cluster/results/w1/raw.csv" }], true, {
        beforeRename() { fs.promises.realpath = swappedRealpath; },
      }), /父目录在写入后发生变化|超出项目根目录|符号链接/);
    } finally {
      fs.promises.realpath = originalRealpath;
    }
    assert.equal(fs.readFileSync(destination, "utf8"), "original");
    assert.equal(fs.existsSync(path.join(outside, "a_seed.csv")), false);
  } finally {
    vscodeStub.workspace.workspaceFolders = [{ uri: { fsPath: "", scheme: "file", path: "" } }];
  }
});

test("local train_rate 0.5 becomes 50 in the project table while rate_percent stays 50", async () => {
  vscodeStub.window.downloadChoice = "只同步缺失文件";
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "simple-result-metrics-rate-"));
  vscodeStub.workspace.workspaceFolders = [{ uri: { fsPath: workspace, scheme: "file", path: workspace } }];
  try {
    const csvDir = path.dirname(rawLocation(workspace));
    fs.mkdirSync(csvDir, { recursive: true });
    fs.writeFileSync(rawLocation(workspace), "case,seed,method,dataset,train_rate,rate_percent,eval_protocol,AUC\nlow,1,w1,set,0.5,,holdout,0.7\nhigh,1,w1,set,,50,holdout,0.8\n");
    const provider = providerFor(workspace, { onlyFirst: true, workers: [{ id: "w1" }], targets: [sftpTarget("w1", "/projects/w1")] });
    provider.planFileInput = "experiments/plans/a.yaml";
    provider.client.getResultsSummary = async () => ({
      planFile: "experiments/plans/a.yaml", planRevision: "r1", resultOwnerWorkerId: "w1",
      rawResultCsvPath: "simple_cluster/results/w1/raw.csv",
      workerResultTables: [{ workerId: "w1", rawResultCsvPath: "simple_cluster/results/w1/raw.csv", aggregateStatus: "pending" }],
      results: [],
    });
    provider.loadProjectTableRegistry = async () => ({ schemaVersion: 1, plans: {} });
    provider.loadPlanSyncLedger = async () => ({ schemaVersion: 2, entries: {} });
    const { __handleResultUiCommandForTest } = require("../../dist/extension/legacy.js");
    await __handleResultUiCommandForTest(provider, { command: "rebuildProjectResultTables" });
    const posted = provider.calls.filter((call) => call[0] === "postState").at(-1)[1];
    assert.equal(posted.results.find((row) => row.dimensions.case === "low").dimensions.train_rate, "0.5");
    assert.equal(posted.results.find((row) => row.dimensions.case === "high").dimensions.rate_percent, "50");
    const finalCsv = fs.readFileSync(path.join(workspace, "experiments", "results", "set", "final", "final.csv"), "utf8");
    const parsed = require("../../dist/results/ProjectResultTables").readCsv(finalCsv);
    assert.deepEqual(parsed.rows.map(row => row[parsed.header.indexOf("rate_percent")]).sort(), ["50", "50"]);
  } finally {
    vscodeStub.workspace.workspaceFolders = [{ uri: { fsPath: "", scheme: "file", path: "" } }];
  }
});

test("refresh keeps a newer online summary when the local file has no trustworthy parsed timestamp", async () => {
  vscodeStub.window.downloadChoice = "只同步缺失文件";
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "simple-result-metrics-online-"));
  vscodeStub.workspace.workspaceFolders = [{ uri: { fsPath: workspace, scheme: "file", path: workspace } }];
  try {
    const csvDir = path.dirname(rawLocation(workspace, "a", "set"));
    fs.mkdirSync(csvDir, { recursive: true });
    fs.writeFileSync(rawLocation(workspace, "a", "set"), "case,seed,method,dataset,metric,value\nalpha,1,w1,set,AUC,0.1\n");
    const provider = providerFor(workspace, { onlyFirst: true, workers: [{ id: "w1" }], targets: [sftpTarget("w1", "/projects/w1")] });
    provider.planFileInput = "experiments/plans/a.yaml";
    provider.client.getResultsSummary = async () => ({
      planFile: "experiments/plans/a.yaml", planRevision: "r1", resultOwnerWorkerId: "w1",
      rawResultCsvPath: "simple_cluster/results/w1/raw.csv",
      workerResultTables: [{ workerId: "w1", rawResultCsvPath: "simple_cluster/results/w1/raw.csv", aggregateStatus: "ready" }],
      results: [{ workerId: "w1", dimensions: { case: "beta", seed: "9", method: "w1", dataset: "set" }, metrics: { AUC: { value: 0.66 } }, sourceFiles: [{ path: "simple_cluster/results/w1/raw.csv" }] }],
    });
    provider.loadProjectTableRegistry = async () => ({ schemaVersion: 1, plans: {} });
    provider.loadPlanSyncLedger = async () => ({ schemaVersion: 2, entries: {} });
    const { __handleResultUiCommandForTest } = require("../../dist/extension/legacy.js");
    await __handleResultUiCommandForTest(provider, { command: "rebuildProjectResultTables" });
    const posted = provider.calls.filter((call) => call[0] === "postState").at(-1)[1];
    assert.equal(posted.results[0].metrics.AUC.value, 0.66);
    assert.equal(posted.results[0].dimensions.case, "beta");
  } finally {
    vscodeStub.workspace.workspaceFolders = [{ uri: { fsPath: "", scheme: "file", path: "" } }];
  }
});

test("rebuild reuses accepted seed records and reports unparsed Plans as awaiting metrics", async () => {
  vscodeStub.window.downloadChoice = undefined;
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "simple-rebuild-registered-"));
  vscodeStub.workspace.workspaceFolders = [{ uri: { fsPath: workspace, scheme: "file", path: workspace } }];
  try {
    const planFile = "experiments/plans/a.yaml";
    const provider = providerFor(workspace, { workers: [{ id: "w1" }] });
    provider.queueHistoricalPlanArtifactSyncs = async () => assert.fail("metric-only rebuild must not queue artifact transfers");
    let report;
    const post = provider.postState;
    provider.postState = function () { report = this.resultSyncReport; return post.call(this); };
    provider.loadProjectTableRegistry = async () => ({ schemaVersion: 1, plans: {
      [planFile]: { revision: "r1", expectedSeeds: 1, records: [{ planFile, workerId: "w1", case: "alpha", seed: "1", method: "a", dataset: "set", rate: "100", endpoint: "clean", metrics: { AUC: 0.77 } }] },
    } });
    provider.loadPlanSyncLedger = async () => ({ schemaVersion: 2, entries: {} });
    provider.client.getResultsSummary = async (requested) => ({ planFile: requested, planRevision: requested === planFile ? "r1" : "r2", results: [], workerResultTables: [{ workerId: "w1", rawResultCsvPath: "", aggregateStatus: "no_declared_csv" }] });
    const { __handleResultUiCommandForTest } = require("../../dist/extension/legacy.js");
    await __handleResultUiCommandForTest(provider, { command: "rebuildProjectResultTables" });
    assert.equal(report.included.length, 1);
    assert.equal(report.pending.length, 1);
    assert.equal(report.skipped.length, 0);
    assert.match(report.included[0], /已收录|本机/);
    assert.match(fs.readFileSync(path.join(workspace, "experiments/results/set/final/final.csv"), "utf8"), /0\.77/);
    assert.equal(provider.calls.some(([name]) => name === "download.mappedBatch" || name === "download"), false);
  } finally { vscodeStub.workspace.workspaceFolders = [{ uri: { fsPath: "", scheme: "file", path: "" } }]; }
});

test("rebuild never replaces a contradictory server revision with old registered metrics", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "simple-rebuild-revision-"));
  vscodeStub.workspace.workspaceFolders = [{ uri: { fsPath: workspace, scheme: "file", path: workspace } }];
  try {
    const planFile = "experiments/plans/a.yaml";
    const provider = providerFor(workspace, { onlyFirst: true });
    let report;
    const post = provider.postState;
    provider.postState = function () { report = this.resultSyncReport; return post.call(this); };
    provider.loadProjectTableRegistry = async () => ({ schemaVersion: 1, plans: {
      [planFile]: { revision: "r1", expectedSeeds: 1, records: [{ planFile, workerId: "w1", case: "alpha", seed: "1", method: "a", dataset: "set", rate: "100", endpoint: "clean", metrics: { AUC: 0.77 } }] },
    } });
    provider.loadPlanSyncLedger = async () => ({ schemaVersion: 2, entries: {} });
    provider.client.getResultsSummary = async () => ({ planFile, planRevision: "different", results: [], workerResultTables: [] });
    const { __handleResultUiCommandForTest } = require("../../dist/extension/legacy.js");
    await __handleResultUiCommandForTest(provider, { command: "rebuildProjectResultTables" });
    assert.equal(report.included.length, 0);
    assert.match(report.skipped.join("\n"), /revision|不一致/);
    assert.equal(fs.existsSync(path.join(workspace, "experiments/results/set/final/final.csv")), false);
  } finally { vscodeStub.workspace.workspaceFolders = [{ uri: { fsPath: "", scheme: "file", path: "" } }]; }
});

test("rebuild downloads raw and final metric files before recomputing without merging directories", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "simple-rebuild-download-"));
  const provider = providerFor(workspace, { onlyFirst: true, workers: [{ id: "w1" }] });
  provider.client.getResultsSummary = async (planFile) => ({ ...summaryFor(planFile, "w1"),
    finalCsvPath: "simple_cluster/results/w1/final.csv", finalMarkdownPath: "simple_cluster/results/w1/final.md" });
  const { __handleResultUiCommandForTest } = require("../../dist/extension/legacy.js");
  await __handleResultUiCommandForTest(provider, { command: "rebuildProjectResultTables" });
  const transfers = provider.calls.filter(([name]) => name === "sync.downloadMappedPaths");
  assert.equal(transfers.length, 1);
  assert.deepEqual(transfers[0][1].entries.map((row) => row.remotePath).sort(), [
    "simple_cluster/results/w1/detail.csv", "simple_cluster/results/w1/final.csv",
    "simple_cluster/results/w1/final.md", "simple_cluster/results/w1/raw.csv",
  ]);
  assert.equal(transfers[0][1].metricsOnly, true);
  assert.equal(provider.calls.some(([name]) => name === "merge" || name === "download"), false);
  assert.match(fs.readFileSync(path.join(workspace, "experiments/results/set/final/final.csv"), "utf8"), /0\.91/);
});

for (const fault of ["", "wrong-seed", "wrong-hash"]) {
test("rebuild verifies completed job CSVs when the server summary has no indexed CSV: " + (fault || "valid"), async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "simple-rebuild-job-files-"));
  const provider = providerFor(workspace, { onlyFirst: true, workers: [{ id: "w1" }] });
  const planFile = "experiments/plans/a.yaml";
  const jobs = [1, 2].map((seed, index) => ({ index, case: "alpha", seed, attempt: 1, workerId: "w1",
    status: "completed", outputDir: "work_dirs/a/" + index + "/attempts/run-a" }));
  provider.loadDistributedQueue = async () => ({ schemaVersion: 1, plans: [{ id: "run-a", planFile,
    revision: "r1", enqueuedAt: "2026-09-27T00:00:00Z", jobs }] });
  provider.loadPlanSyncLedger = async () => ({ schemaVersion: 2, entries: {} });
  provider.client.getResultsSummary = async () => ({ planFile, planRevision: "r1", results: [],
    workerResultTables: [{ workerId: "w1", aggregateStatus: "no_declared_csv", rawResultCsvPath: "" }] });
  const files = Object.fromEntries(jobs.flatMap((job) => {
    const csv = "case,seed,method,dataset,eval_protocol,metric,value,epoch\nalpha," + (fault === "wrong-seed" ? 99 : job.seed) + ",a,set,clean,AUC," + (0.7 + job.seed / 10) + ",99\n";
    return [[job.outputDir + "/test_results/formal_result_rows.csv", csv], [job.outputDir + "/test_results/four_state_metrics.csv", csv]];
  }));
  provider.simpleSftpApiCall = async (method, params) => {
    provider.calls.push([method, params]);
    if (method === "sync.projectInventory") {
      assert.equal(params.scopePaths.every((file) => file.endsWith(".csv") && !file.includes("best_model")), true);
      return { ok: true, files: Object.fromEntries(Object.entries(files).map(([file, text]) => [file,
        { size: Buffer.byteLength(text), sha256: crypto.createHash("sha256").update(text).digest("hex") }])) };
    }
    assert.equal(method, "sync.downloadMappedPaths");
    for (const entry of params.entries) {
      const full = path.join(workspace, ...entry.localRelativePath.split("/"));
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, files[entry.remotePath] + (fault === "wrong-hash" ? "\n" : ""), "utf8");
    }
    return { ok: true, fileCount: params.entries.length, completedFiles: params.entries.length };
  };
  const { __handleResultUiCommandForTest } = require("../../dist/extension/legacy.js");
  if (fault) {
    await assert.rejects(__handleResultUiCommandForTest(provider, { command: "rebuildProjectResultTables" }), /Case\/seed|指纹不一致/);
    assert.equal(fs.existsSync(path.join(workspace, "simple_cluster/results/project_table_registry.json")), false);
    return;
  }
  await __handleResultUiCommandForTest(provider, { command: "rebuildProjectResultTables" });
  const registry = JSON.parse(fs.readFileSync(path.join(workspace, "simple_cluster/results/project_table_registry.json"), "utf8"));
  assert.equal(registry.plans[planFile].records.length, 2);
  assert.deepEqual(registry.plans[planFile].records.map((row) => row.seed).sort(), ["1", "2"]);
  assert.equal(registry.plans[planFile].records.every((row) => row.runId === "run-a"), true);
  assert.equal(registry.plans[planFile].records.every((row) => Object.keys(row.metrics).join() === "AUC"), true);
  assert.equal(provider.calls.filter(([name]) => name === "sync.projectInventory").length, 1);
  assert.equal(provider.calls.filter(([name]) => name === "sync.downloadMappedPaths").length, 1);
  assert.equal(provider.calls.some(([name]) => name === "merge"), false);
});
}
