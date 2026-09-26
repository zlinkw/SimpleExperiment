const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const Module = require("node:module");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..", "..");
const extension = fs.readFileSync(path.join(root, "src", "extension", "legacy.ts"), "utf8");
const panel = fs.readFileSync(path.join(root, "src", "ui", "PanelHtml.legacy.ts"), "utf8");
const vscodeStub = {
  commands: { executeCommand: async () => ({ ok: true }) },
  workspace: {
    getConfiguration: () => ({ get: (_key, fallback) => fallback }),
    workspaceFolders: [{ uri: { fsPath: "" } }],
  },
  window: {
    showWarningMessage: async (_text, _options, first) => first,
    showInformationMessage: async () => {},
    setStatusBarMessage: () => {},
    withProgress: async (_options, task) => task({ report() {} }, { isCancellationRequested: false }),
  },
  Uri: { file: (value) => ({ fsPath: value }) },
  ProgressLocation: { Notification: 1 },
};
const originalLoad = Module._load;
Module._load = function (request, ...args) {
  return request === "vscode" ? vscodeStub : originalLoad.call(this, request, ...args);
};

function removeTempDirectory(target) {
  const resolved = path.resolve(target);
  const parent = path.dirname(resolved);
  const base = path.basename(resolved);
  if (!base || base === "." || base === ".." || !base.startsWith("simple-result-metrics-")) throw new Error("PARENT_CD_FAILED");
  const realParent = fs.realpathSync(parent);
  const tempRoot = fs.realpathSync(os.tmpdir());
  const relative = path.relative(tempRoot, realParent);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("PARENT_CD_FAILED");
  const probe = spawnSync(process.execPath, ["-e", "const fs=require('node:fs'); process.chdir(process.argv[1]); if (fs.realpathSync(process.cwd())!==process.argv[2]) process.exit(2); fs.rmSync('./'+process.argv[3],{recursive:true,force:true});", realParent, realParent, base], {
    encoding: "utf8", timeout: 10000, windowsHide: true,
  });
  if (probe.status !== 0) throw new Error(`PARENT_CD_FAILED ${probe.stderr}`);
}

function sliceBetween(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `${start} .. ${end}`);
  return source.slice(from, to);
}

test("the result table button merges every known result scope before any metric download", () => {
  assert.match(panel, /data-command="syncPendingPlanArtifacts"/);
  assert.match(panel, /合并最新结果并拉取指标/);
  assert.doesNotMatch(panel, /同步待处理产物 \(/);
  assert.match(panel, /待处理产物计数属于自动的权重和日志同步/);
  assert.match(extension, /case "syncPendingPlanArtifacts":\s*await this\.syncPendingResultMetricsFromUi\(\)/);
  const manual = sliceBetween(extension, "async syncPendingResultMetricsFromUi()", "async summaryForMetricDownload(");
  const mergeAt = manual.indexOf("await this.mergeLatestWorkerVersions(");
  const downloadAt = manual.indexOf("downloadResultArtifactCandidates(");
  assert.ok(mergeAt > 0 && downloadAt > mergeAt);
  assert.match(manual, /latestPlanSyncEntry\(ledger, planFile\)/);
  assert.match(manual, /localPlanMetadata\.plans/);
  assert.match(manual, /targets\.length >= 2/);
  assert.match(manual, /outcome === false/);
  assert.match(manual, /Worker 结果未完全合并，未下载指标文件/);
  assert.match(manual, /summaryMatchesPlanRevision\(/);
  assert.match(manual, /metricsOnly: true/);
  assert.equal(manual.match(/mergeLatestWorkerVersions\(/g).length, 1);
  assert.doesNotMatch(manual, /pendingPlanSyncs\(ledger\)|markPlanSyncComplete\(/);
  assert.doesNotMatch(manual, /this\.planFileInput \|\| this\.selectedPlanId/);
  assert.doesNotMatch(manual, /syncPendingPlanArtifacts\(|reconcileProjectFilesAcrossWorkers|syncCodeTargets\(/);
  const background = sliceBetween(extension, "async syncPendingPlanArtifacts(onlyKey = \"\", knownSummary?)", "async reconcileProjectFilesAcrossWorkers");
  assert.doesNotMatch(background, /mergeLatestWorkerVersions\(/);
  const auto = extension.slice(extension.indexOf("async refreshResultsSummary"), extension.indexOf("scheduleResultsSummaryRefreshFromRealtime"));
  assert.match(auto, /syncPendingPlanArtifacts\(pending\.key, summary\)/);
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
    planFileInput: "",
    selectedPlanId: "",
    selectedRunKeys: new Set(),
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
    captureProjectContext: () => ({ root: workspace, generation: 1 }),
    projectContextIsCurrent: () => options.current !== false,
    effectiveConnectionMode: () => options.mode || "tunnel",
    refreshLocalPlanMetadataForAction: async () => { calls.push(["metadata"]); },
    loadPlanSyncLedger: async () => options.ledger || ledger,
    workerCodeSyncTargets: () => options.targets || workers.map((worker) => ({ id: worker.id })),
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

test("two pending plans merge on all workers before either metric download when no plan is selected", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "simple-result-metrics-"));
  try {
    const provider = providerFor(workspace);
    const { __syncPendingResultMetricsForTest } = require("../../dist/extension/legacy.js");
    const result = await __syncPendingResultMetricsForTest(provider);
    assert.deepEqual(result.plans, ["experiments/plans/a.yaml", "experiments/plans/b.yaml"]);
    assert.equal(result.downloaded, true);
    const merges = provider.calls.filter((call) => call[0] === "merge");
    const firstDownload = provider.calls.findIndex((call) => call[0] === "download");
    const lastMerge = provider.calls.map((call) => call[0]).lastIndexOf("merge");
    assert.equal(merges.length, 1);
    assert.deepEqual(merges[0][1], ["simple_cluster/results/w1", "simple_cluster/results/w2"]);
    assert.ok(lastMerge >= 0 && lastMerge < firstDownload);
    assert.deepEqual(provider.calls.filter((call) => call[0] === "download").map((call) => [call[1], call[2]]), [
      ["w1", "simple_cluster/results/w1/raw.csv"],
      ["w1", "simple_cluster/results/w1/detail.csv"],
      ["w2", "simple_cluster/results/w2/raw.csv"],
      ["w2", "simple_cluster/results/w2/detail.csv"],
    ]);
    assert.equal(provider.calls.some((call) => String(call[2] || "").includes("weight")), false);
  } finally {
    removeTempDirectory(workspace);
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
    assert.ok(provider.calls.map((call) => call[0]).lastIndexOf("merge") < provider.calls.findIndex((call) => call[0] === "download"));
    assert.equal(provider.calls.some((call) => call[0] === "mark"), false);
  } finally {
    removeTempDirectory(workspace);
  }
});

test("merge rejection, conflicts, offline workers and revision changes download nothing", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "simple-result-metrics-fail-"));
  const { __syncPendingResultMetricsForTest } = require("../../dist/extension/legacy.js");
  try {
    const cancelled = providerFor(workspace, { merge: false });
    await assert.rejects(() => __syncPendingResultMetricsForTest(cancelled), /未下载指标文件/);
    assert.equal(cancelled.calls.some((call) => call[0] === "download"), false);

    const conflicted = providerFor(workspace, { mergeErrors: ["simple_cluster/results/w1/raw.csv：没有可靠的最新版"] });
    await assert.rejects(() => __syncPendingResultMetricsForTest(conflicted), /未完全合并/);
    assert.equal(conflicted.calls.some((call) => call[0] === "download"), false);

    const offline = providerFor(workspace, { targets: [{ id: "w1" }] });
    await assert.rejects(() => __syncPendingResultMetricsForTest(offline), /未连接或未启用/);
    assert.equal(offline.calls.some((call) => call[0] === "merge" || call[0] === "download"), false);

    const stale = providerFor(workspace, { ledgerRevision: "old" });
    await assert.rejects(() => __syncPendingResultMetricsForTest(stale), /revision/);
    assert.equal(stale.calls.some((call) => call[0] === "download"), false);
    assert.ok(stale.calls.some((call) => call[0] === "merge"));
  } finally {
    removeTempDirectory(workspace);
  }
});

test("one connected worker skips cross-worker merge and still downloads pending metrics", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "simple-result-metrics-one-"));
  try {
    const provider = providerFor(workspace, { workers: [{ id: "w1" }], targets: [{ id: "w1" }], onlyFirst: true });
    const { __syncPendingResultMetricsForTest } = require("../../dist/extension/legacy.js");
    const result = await __syncPendingResultMetricsForTest(provider);
    assert.equal(result.merged, true);
    assert.equal(provider.calls.some((call) => call[0] === "merge"), false);
    assert.equal(provider.calls.filter((call) => call[0] === "download").length, 2);
  } finally {
    removeTempDirectory(workspace);
  }
});

test("bulk plan sync keeps the previous candidate policy and metric mode stays optional", () => {
  const download = sliceBetween(extension, "async downloadResultArtifactCandidates(", "async loadProjectTableRegistry");
  assert.match(download, /options\.metricsOnly === true/);
  assert.match(download, /metricsOnly && !isResultMetricFile\(remotePath\)/);
  assert.match(download, /【批量同步结果确认】/);
  assert.match(download, /"覆盖已有文件并同步", "只同步缺失文件"/);
  assert.match(download, /批量同步已取消/);
  const bulk = sliceBetween(extension, "async syncAllResultArtifactsFromUi(message)", "async syncPendingResultMetricsFromUi");
  assert.match(bulk, /resultSummarySyncCandidates\(summary, planFile\)/);
  assert.match(bulk, /metricsOnly: false/);
  assert.doesNotMatch(bulk, /mergeLatestWorkerVersions\(/);
});
