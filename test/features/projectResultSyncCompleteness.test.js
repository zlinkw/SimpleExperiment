const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const vscodeStub = {
  commands: { executeCommand: async () => ({ ok: true }) },
  workspace: {
    getConfiguration: () => ({ get: (_key, fallback) => fallback }),
    workspaceFolders: [{ uri: { fsPath: "", scheme: "file", path: "" } }],
  },
  window: {
    showWarningMessage: async () => "覆盖已有文件并同步",
    showInformationMessage: async (text) => { vscodeStub.window.messages.push(String(text)); },
    setStatusBarMessage: () => {},
    withProgress: async (_options, task) => task({ report() {} }, { isCancellationRequested: false }),
    messages: [],
  },
  Uri: { file: (value) => ({ fsPath: value }) },
  ProgressLocation: { Notification: 1 },
};
const originalLoad = Module._load;
Module._load = function (request, ...args) {
  return request === "vscode" ? vscodeStub : originalLoad.call(this, request, ...args);
};

function target(id) {
  return {
    id, host: id + ".example", user: "exp", port: 22, remotePath: "/projects/" + id,
    transferHost: id + ".example", resolvedHost: id + ".example", sftpHost: id + ".example", sshHost: id + ".example",
    networkHost: id + ".example", sshConfigHost: "", sshConfigAlias: "",
  };
}

function row(workerId, caseName, seed, metric, revision = "ra") {
  return {
    workerId,
    runId: "run-" + revision,
    attempt: "1",
    planRevision: revision,
    resultOwnerWorkerId: workerId,
    dimensions: { case: caseName, seed: String(seed), method: "method", dataset: "set", eval_protocol: "holdout" },
    metrics: { AUC: { value: metric } },
    sourceFiles: [{ path: "simple_cluster/results/" + workerId + "/raw.csv" }],
  };
}

function table(workerId, status = "ready") {
  return {
    workerId,
    aggregateStatus: status,
    rawResultCsvPath: "simple_cluster/results/" + workerId + "/raw.csv",
    aggregateCsvPath: "simple_cluster/results/" + workerId + "/detail.csv",
  };
}

function providerFor(workspace) {
  const plans = {
    "experiments/plans/a.yaml": {
      planFile: "experiments/plans/a.yaml", planRevision: "ra",
      workerResultTables: [table("w1"), table("w2")],
      completedRunId: "run-ra",
      results: [row("w1", "alpha", 1, 0.81), row("w1", "alpha", 2, 0.82), row("w2", "alpha", 3, 0.83)],
    },
    "experiments/plans/b.yaml": {
      planFile: "experiments/plans/b.yaml", planRevision: "rb",
      workerResultTables: [table("w2")],
      results: [row("w2", "beta", 1, 0.71, "rb")],
    },
    "experiments/plans/c.yaml": {
      planFile: "experiments/plans/c.yaml", planRevision: "rc",
      workerResultTables: [table("w1")],
      results: [row("w1", "gamma", 1, 0.61, "rc"), row("w1", "gamma", 2, 0.62, "rc")],
    },
  };
  const calls = [];
  const provider = {
    calls,
    planFileInput: "experiments/plans/b.yaml",
    selectedPlanId: "experiments/plans/b.yaml",
    selectedRunKeys: new Set(), selectedExperimentIds: new Set(), selectedArchiveKeys: new Set(), selectedTaskUiKeys: new Set(),
    context: { globalStorageUri: { fsPath: workspace } },
    localPlanMetadata: { plans: [
      { planFile: "experiments/plans/a.yaml", revision: "ra", seeds: [1, 2, 3], outputSignals: ["结果目录：simple_cluster/results/w1"] },
      { planFile: "experiments/plans/b.yaml", revision: "rb", seeds: [1] },
      { planFile: "experiments/plans/c.yaml", revision: "rc", seeds: [1, 2] },
      { planFile: "experiments/plans/empty.yaml", revision: "re", seeds: [] },
    ] },
    setupConfig: { workerTunnels: [{ id: "w1" }, { id: "w2" }] },
    client: {
      getResultsSummary: async (planFile) => {
        calls.push(["summary", planFile]);
        if (planFile.endsWith("empty.yaml")) throw new Error("worker unreachable");
        return plans[planFile];
      },
    },
    simpleSftpApiCall: async (method, params) => {
      calls.push([method, params.server.id, params.entries.map((entry) => entry.remotePath)]);
      for (const entry of params.entries) {
        const full = path.join(workspace, ...entry.localRelativePath.split("/"));
        fs.mkdirSync(path.dirname(full), { recursive: true });
        const worker = params.server.id;
        const relative = String(entry.localRelativePath);
        const planName = relative.includes("/b/") ? "beta" : relative.includes("/c/") ? "gamma" : "alpha";
        const seeds = planName === "alpha" ? (worker === "w2" ? [["3", "0.83"]] : [["1", "0.81"], ["2", "0.82"]]) : planName === "gamma" ? [["1", "0.61"], ["2", "0.62"]] : [["1", "0.71"]];
        const body = seeds.map(([seed, metric]) => planName + "," + seed + "," + worker + ",set,holdout," + metric).join("\n");
        fs.writeFileSync(full, "case,seed,method,dataset,eval_protocol,AUC\n" + body + "\n");
      }
      return { ok: true, fileCount: params.entries.length, completedFiles: params.entries.length };
    },
    sftpServerOptions: (item) => ({ id: item.id, host: item.host, user: item.user, port: item.port, remotePath: item.remotePath, transferHost: item.host, resolvedHost: item.host }),
    postState() {
      calls.push(["postState", this.resultSyncReport, this.resultsSummary && this.resultsSummary.planFile]);
      this.postedReport = this.resultSyncReport;
      this.postedSummary = this.resultsSummary;
    },
    resolveSelectedPlanFile: (hint = "") => String(hint || provider.planFileInput || ""),
    captureProjectContext: () => ({ root: workspace, generation: 1 }),
    projectContextIsCurrent: () => true,
    effectiveConnectionMode: () => "tunnel",
    refreshLocalPlanMetadataForAction: async () => { calls.push(["metadata"]); },
    loadPlanSyncLedger: async () => ({
      schemaVersion: 2,
      entries: {
        onlyOwner: {
          planFile: "experiments/plans/a.yaml", revision: "ra", runId: "run-ra", sourceWorkerId: "w1",
          artifactPaths: ["simple_cluster/results/w1/raw.csv"], directoryPaths: ["simple_cluster/results/w1"],
          destinations: {},
        },
      },
    }),
    workerCodeSyncTargets: () => [target("w1"), target("w2")],
    enabledWorkerConfigs: () => [{ id: "w1" }, { id: "w2" }],
    filterResultsSummaryForPlan: (value) => value,
    loadProjectTableRegistry: undefined,
    writeProjectTableRegistry: undefined,
    queueHistoricalPlanArtifactSyncs: async () => { calls.push(["queue-historic"]); },
    mergeLatestWorkerVersions: async (_root, _targets, scopePaths) => {
      calls.push(["merge", scopePaths.slice()]);
      return { completed: [], errors: [] };
    },
  };
  const prototype = require("../../dist/extension/legacy.js").RealtimeTunnelPanelProvider.prototype;
  provider.loadProjectTableRegistry = (root) => prototype.loadProjectTableRegistry.call(provider, root);
  provider.writeProjectTableRegistry = (root, registry) => prototype.writeProjectTableRegistry.call(provider, root, registry);
  return provider;
}

test("sync includes every completed plan and both workers before one mapped download per source", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "simple-result-complete-"));
  vscodeStub.workspace.workspaceFolders = [{ uri: { fsPath: workspace, scheme: "file", path: workspace } }];
  vscodeStub.window.messages = [];
  const provider = providerFor(workspace);
  const { RealtimeTunnelPanelProvider } = require("../../dist/extension/legacy.js");
  const host = Object.assign(Object.create(RealtimeTunnelPanelProvider.prototype), provider);
  await RealtimeTunnelPanelProvider.prototype.handleMessageCore.call(host, { command: "syncPendingPlanArtifacts" }, "syncPendingPlanArtifacts");
  const result = host.postedReport;
  const registry = JSON.parse(fs.readFileSync(path.join(workspace, "simple_cluster", "results", "project_table_registry.json"), "utf8"));
  assert.deepEqual(Object.keys(registry.plans).sort(), [
    "experiments/plans/a.yaml", "experiments/plans/b.yaml", "experiments/plans/c.yaml",
  ]);
  assert.equal(registry.plans["experiments/plans/a.yaml"].records.length, 3);
  assert.deepEqual([...new Set(registry.plans["experiments/plans/a.yaml"].records.map((item) => item.workerId))].sort(), ["w1", "w2"]);
  assert.equal(registry.plans["experiments/plans/b.yaml"].records.length, 1);
  assert.equal(registry.plans["experiments/plans/c.yaml"].records.length, 2);
  const mergeAt = host.calls.findIndex((call) => call[0] === "merge");
  const downloadAt = host.calls.findIndex((call) => call[0] === "sync.downloadMappedPaths");
  assert.ok(mergeAt >= 0 && mergeAt < downloadAt);
  const downloads = host.calls.filter((call) => call[0] === "sync.downloadMappedPaths");
  assert.equal(host.postedSummary.results.length > 0, true);
  assert.equal(host.calls.some((call) => call[0] === "postState" && call[1] && call[1].discovered === 4), true);
  assert.deepEqual(downloads.map((call) => call[1]).sort(), ["w1", "w2"]);
  assert.equal(downloads.every((call) => call[2].length >= 1), true);
  assert.match(result.skipped.join("\n"), /empty\.yaml/);
  assert.equal(result.discovered, 4);
  assert.match(JSON.stringify(host.postedReport), /发现|empty\.yaml|收录/);
  assert.equal(fs.existsSync(path.join(workspace, "experiments", "results", "final", "final.csv")), true);
});

test("rebuild downloads metrics from both workers before recomputing and does not merge directories", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "simple-result-rebuild-"));
  vscodeStub.workspace.workspaceFolders = [{ uri: { fsPath: workspace, scheme: "file", path: workspace } }];
  const provider = providerFor(workspace);
  provider.loadPlanSyncLedger = async () => ({ schemaVersion: 2, entries: {
    a: { planFile: "experiments/plans/a.yaml", revision: "ra", runId: "run-ra", sourceWorkerId: "w1", artifactPaths: [], directoryPaths: [], destinations: {} },
    b: { planFile: "experiments/plans/b.yaml", revision: "rb", runId: "run-rb", sourceWorkerId: "w2", artifactPaths: [], directoryPaths: [], destinations: {} },
    c: { planFile: "experiments/plans/c.yaml", revision: "rc", runId: "run-rc", sourceWorkerId: "w1", artifactPaths: [], directoryPaths: [], destinations: {} },
  } });
  const { __handleResultUiCommandForTest } = require("../../dist/extension/legacy.js");
  await __handleResultUiCommandForTest(provider, { command: "rebuildProjectResultTables" });
  assert.equal(provider.calls.some((call) => call[0] === "merge"), false);
  assert.deepEqual(provider.calls.filter((call) => call[0] === "sync.downloadMappedPaths").map((call) => call[1]).sort(), ["w1", "w2"]);
  const registry = JSON.parse(fs.readFileSync(path.join(workspace, "simple_cluster", "results", "project_table_registry.json"), "utf8"));
  assert.equal(registry.plans["experiments/plans/a.yaml"].records.length, 3);
  assert.equal(provider.calls.filter((call) => call[0] === "summary").length, 4);
});

test("a failed plan keeps the other completed plans and does not claim full success", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "simple-result-partial-"));
  vscodeStub.workspace.workspaceFolders = [{ uri: { fsPath: workspace, scheme: "file", path: workspace } }];
  vscodeStub.window.messages = [];
  const provider = providerFor(workspace);
  provider.client.getResultsSummary = async (planFile) => {
    provider.calls.push(["summary", planFile]);
    if (String(planFile).includes("/b.")) throw new Error("summary timeout");
    if (String(planFile).includes("empty")) return { planFile, planRevision: "re", results: [], workerResultTables: [] };
    return {
      planFile, planRevision: planFile.includes("/a.") ? "ra" : "rc",
      workerResultTables: [table(planFile.includes("/a.") ? "w1" : "w1"), ...(planFile.includes("/a.") ? [table("w2")] : [])],
      results: planFile.includes("/a.")
        ? [row("w1", "alpha", 1, 0.81), row("w2", "alpha", 3, 0.83)]
        : [row("w1", "gamma", 1, 0.61, "rc")],
    };
  };
  const { RealtimeTunnelPanelProvider } = require("../../dist/extension/legacy.js");
  const host = Object.assign(Object.create(RealtimeTunnelPanelProvider.prototype), provider);
  await RealtimeTunnelPanelProvider.prototype.handleMessageCore.call(host, { command: "syncPendingPlanArtifacts" }, "syncPendingPlanArtifacts");
  const result = host.postedReport;
  const registry = JSON.parse(fs.readFileSync(path.join(workspace, "simple_cluster", "results", "project_table_registry.json"), "utf8"));
  assert.equal(Boolean(registry.plans["experiments/plans/a.yaml"]), true);
  assert.equal(Boolean(registry.plans["experiments/plans/c.yaml"]), true);
  assert.equal(registry.plans["experiments/plans/b.yaml"], undefined);
  assert.match(result.skipped.join("\n"), /b\.yaml/);
  assert.match(result.skipped.join("\n"), /跳过\/失败|b\.yaml/);
});

test("downloaded csv rows fill plans when the server summary has no result rows", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "simple-result-download-parse-"));
  vscodeStub.workspace.workspaceFolders = [{ uri: { fsPath: workspace, scheme: "file", path: workspace } }];
  const provider = providerFor(workspace);
  provider.localPlanMetadata.plans = [{ planFile: "experiments/plans/a.yaml", revision: "ra", seeds: [1, 2, 3] }];
  provider.client.getResultsSummary = async (planFile) => ({
    planFile, planRevision: "ra", workerResultTables: [table("w1"), table("w2")], results: [],
  });
  const { RealtimeTunnelPanelProvider } = require("../../dist/extension/legacy.js");
  const host = Object.assign(Object.create(RealtimeTunnelPanelProvider.prototype), provider);
  await RealtimeTunnelPanelProvider.prototype.handleMessageCore.call(host, { command: "syncPendingPlanArtifacts" }, "syncPendingPlanArtifacts");
  const registry = JSON.parse(fs.readFileSync(path.join(workspace, "simple_cluster", "results", "project_table_registry.json"), "utf8"));
  const seeds = registry.plans["experiments/plans/a.yaml"].records.map((item) => item.seed).sort();
  assert.deepEqual(seeds, ["1", "2", "3"]);
  assert.equal(host.postedReport.included.some((line) => line.includes("a.yaml")), true);
});

test("yaml newer than the trusted completed run still publishes that completed run", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "simple-result-old-run-"));
  vscodeStub.workspace.workspaceFolders = [{ uri: { fsPath: workspace, scheme: "file", path: workspace } }];
  const provider = providerFor(workspace);
  provider.localPlanMetadata.plans = [{ planFile: "experiments/plans/a.yaml", revision: "yaml-new", seeds: [1, 2, 3] }];
  provider.loadPlanSyncLedger = async () => ({ schemaVersion: 2, entries: { done: {
    planFile: "experiments/plans/a.yaml", revision: "ra", runId: "run-ra", sourceWorkerId: "w1",
    artifactPaths: ["simple_cluster/results/w1/raw.csv"], directoryPaths: ["simple_cluster/results/w1"], destinations: {},
  } } });
  const { RealtimeTunnelPanelProvider } = require("../../dist/extension/legacy.js");
  const host = Object.assign(Object.create(RealtimeTunnelPanelProvider.prototype), provider);
  host.planVersionForFile = RealtimeTunnelPanelProvider.prototype.planVersionForFile;
  host.filterResultsSummaryForPlan = RealtimeTunnelPanelProvider.prototype.filterResultsSummaryForPlan;
  host.resolveSelectedPlanFile = (hint = "") => String(hint || "");
  host.client.getResultsSummary = async () => ({
    planFile: "experiments/plans/a.yaml", planRevision: "ra", completedRunId: "run-ra",
    results: [
      row("w1", "alpha", 1, 0.81),
      { ...row("w1", "other", 9, 0.1), planFile: "experiments/plans/b.yaml" },
    ],
    workerResultTables: [table("w1"), table("w2")],
  });
  await RealtimeTunnelPanelProvider.prototype.handleMessageCore.call(host, { command: "syncPendingPlanArtifacts" }, "syncPendingPlanArtifacts");
  const registry = JSON.parse(fs.readFileSync(path.join(workspace, "simple_cluster", "results", "project_table_registry.json"), "utf8"));
  assert.equal(registry.plans["experiments/plans/a.yaml"].revision, "ra");
  assert.equal(registry.plans["experiments/plans/a.yaml"].records.some((item) => item.case === "other"), false);
  assert.match(host.postedReport.included.join("\n"), /yaml-new/);
});

test("a plan known only from the registry is still discovered", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "simple-result-registry-plan-"));
  vscodeStub.workspace.workspaceFolders = [{ uri: { fsPath: workspace, scheme: "file", path: workspace } }];
  fs.mkdirSync(path.join(workspace, "simple_cluster", "results"), { recursive: true });
  fs.writeFileSync(path.join(workspace, "simple_cluster", "results", "project_table_registry.json"), JSON.stringify({
    schemaVersion: 1, plans: { "experiments/plans/c.yaml": { revision: "rc", expectedSeeds: 2, records: [] } },
  }));
  const provider = providerFor(workspace);
  provider.localPlanMetadata.plans = [];
  provider.loadPlanSyncLedger = async () => ({ schemaVersion: 2, entries: {} });
  const { RealtimeTunnelPanelProvider } = require("../../dist/extension/legacy.js");
  const host = Object.assign(Object.create(RealtimeTunnelPanelProvider.prototype), provider);
  await RealtimeTunnelPanelProvider.prototype.handleMessageCore.call(host, { command: "syncPendingPlanArtifacts" }, "syncPendingPlanArtifacts");
  assert.equal(host.postedReport.discovered, 1);
  assert.equal(Boolean(host.postedReport.plans.includes("experiments/plans/c.yaml")), true);
});

test("one failed worker is omitted and the successful worker is published", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "simple-result-one-source-"));
  vscodeStub.workspace.workspaceFolders = [{ uri: { fsPath: workspace, scheme: "file", path: workspace } }];
  const provider = providerFor(workspace);
  provider.localPlanMetadata.plans = [{ planFile: "experiments/plans/a.yaml", revision: "ra", seeds: [1, 2, 3] }];
  provider.simpleSftpApiCall = async (method, params) => {
    provider.calls.push([method, params.server.id, params.entries.map((entry) => entry.remotePath)]);
    if (params.server.id === "w2") throw new Error("w2 ssh closed");
    for (const entry of params.entries) {
      const full = path.join(workspace, ...entry.localRelativePath.split("/"));
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, "case,seed,method,dataset,eval_protocol,AUC\nalpha,1,w1,set,holdout,0.91\nalpha,2,w1,set,holdout,0.92\n");
    }
    return { ok: true, fileCount: params.entries.length, completedFiles: params.entries.length };
  };
  const { RealtimeTunnelPanelProvider } = require("../../dist/extension/legacy.js");
  const host = Object.assign(Object.create(RealtimeTunnelPanelProvider.prototype), provider);
  await RealtimeTunnelPanelProvider.prototype.handleMessageCore.call(host, { command: "syncPendingPlanArtifacts" }, "syncPendingPlanArtifacts");
  const registry = JSON.parse(fs.readFileSync(path.join(workspace, "simple_cluster", "results", "project_table_registry.json"), "utf8"));
  const workers = [...new Set(registry.plans["experiments/plans/a.yaml"].records.map((item) => item.workerId))];
  assert.deepEqual(workers, ["w1"]);
  assert.match(host.postedReport.skipped.join("\n"), /w2/);
});

test("nested comparison plans are discovered and a conflicting metric path blocks only that plan", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "simple-result-nested-"));
  vscodeStub.workspace.workspaceFolders = [{ uri: { fsPath: workspace, scheme: "file", path: workspace } }];
  const provider = providerFor(workspace);
  const nested = ["experiments/plans/comparison/drf.yaml", "experiments/plans/comparison/dpl.yaml", "experiments/plans/comparison/nested/x.yaml"];
  provider.localPlanMetadata.plans = nested.map((planFile) => ({ planFile, revision: "rn", seeds: [1] }));
  provider.loadPlanSyncLedger = async () => ({ schemaVersion: 2, entries: {} });
  provider.client.getResultsSummary = async (planFile) => ({
    planFile, planRevision: "rn",
    workerResultTables: [{ workerId: "w1", rawResultCsvPath: "simple_cluster/results/" + planFile.split("/").at(-2) + "/raw.csv", aggregateStatus: "ready" }],
    results: [{ workerId: "w1", dimensions: { case: "alpha", seed: "1", method: "method", dataset: "set", eval_protocol: "holdout" }, metrics: { AUC: { value: 0.5 } }, sourceFiles: [{ path: "simple_cluster/results/" + planFile.split("/").at(-2) + "/raw.csv" }] }],
  });
  provider.mergeLatestWorkerVersions = async () => ({ completed: [], errors: ["simple_cluster/results/comparison/raw.csv：没有可靠的最新版"] });
  const { RealtimeTunnelPanelProvider } = require("../../dist/extension/legacy.js");
  const host = Object.assign(Object.create(RealtimeTunnelPanelProvider.prototype), provider);
  await RealtimeTunnelPanelProvider.prototype.handleMessageCore.call(host, { command: "syncPendingPlanArtifacts" }, "syncPendingPlanArtifacts");
  assert.deepEqual(host.postedReport.plans, nested);
  assert.match(host.postedReport.skipped.join("\n"), /drf\.yaml/);
  assert.equal(host.calls.some((call) => call[0] === "sync.downloadMappedPaths" && JSON.stringify(call).includes("comparison/raw.csv")), false);
});

test("an existing w2 record stays when this sync fails w2 and updates w1", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "simple-result-keep-w2-"));
  vscodeStub.workspace.workspaceFolders = [{ uri: { fsPath: workspace, scheme: "file", path: workspace } }];
  fs.mkdirSync(path.join(workspace, "simple_cluster", "results"), { recursive: true });
  fs.writeFileSync(path.join(workspace, "simple_cluster", "results", "project_table_registry.json"), JSON.stringify({ schemaVersion: 1, plans: { "experiments/plans/a.yaml": { revision: "ra", expectedSeeds: 3, records: [
    { planFile: "experiments/plans/a.yaml", workerId: "w2", case: "alpha", seed: "3", method: "method", dataset: "set", rate: "", endpoint: "holdout", metrics: { AUC: 0.83 }, runId: "run-ra", attempt: "1", revision: "ra" },
  ] } } }));
  const provider = providerFor(workspace);
  provider.localPlanMetadata.plans = [{ planFile: "experiments/plans/a.yaml", revision: "ra", seeds: [1, 2, 3] }];
  provider.loadPlanSyncLedger = async () => ({ schemaVersion: 2, entries: { done: { planFile: "experiments/plans/a.yaml", revision: "ra", runId: "run-ra", sourceWorkerId: "w1", artifactPaths: [], directoryPaths: [], destinations: {} } } });
  provider.client.getResultsSummary = async () => ({
    planFile: "experiments/plans/a.yaml", planRevision: "ra", completedRunId: "run-ra",
    workerResultTables: [table("w1"), table("w2")],
    results: [row("w1", "alpha", 1, 0.81), row("w2", "alpha", 3, 0.99)],
  });
  provider.simpleSftpApiCall = async (method, params) => {
    provider.calls.push([method, params.server.id]);
    if (params.server.id === "w2") throw new Error("w2 ssh closed");
    for (const entry of params.entries) {
      const full = path.join(workspace, ...entry.localRelativePath.split("/"));
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, "case,seed,method,dataset,eval_protocol,AUC\nalpha,1,w1,set,holdout,0.81\n");
    }
    return { ok: true, fileCount: params.entries.length, completedFiles: params.entries.length };
  };
  const { RealtimeTunnelPanelProvider } = require("../../dist/extension/legacy.js");
  const host = Object.assign(Object.create(RealtimeTunnelPanelProvider.prototype), provider);
  await RealtimeTunnelPanelProvider.prototype.handleMessageCore.call(host, { command: "syncPendingPlanArtifacts" }, "syncPendingPlanArtifacts");
  const registry = JSON.parse(fs.readFileSync(path.join(workspace, "simple_cluster", "results", "project_table_registry.json"), "utf8"));
  const records = registry.plans["experiments/plans/a.yaml"].records;
  assert.equal(records.find((item) => item.workerId === "w2").metrics.AUC, 0.83);
  assert.equal(records.some((item) => item.workerId === "w1" && item.seed === "1"), true);
});

test("a missing owner does not publish server rows and a partial worker aggregate keeps the verified worker", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "simple-result-partial-owner-"));
  vscodeStub.workspace.workspaceFolders = [{ uri: { fsPath: workspace, scheme: "file", path: workspace } }];
  const provider = providerFor(workspace);
  provider.localPlanMetadata.plans = [{ planFile: "experiments/plans/a.yaml", revision: "ra", seeds: [1, 2] }];
  provider.loadPlanSyncLedger = async () => ({ schemaVersion: 2, entries: {} });
  const { mergeWorkerResultsSummaries } = require("../../dist/tunnel/MultiEndpointRealtimeClient.legacy.js");
  const merged = mergeWorkerResultsSummaries([
    { workerId: "w1", summary: { planFile: "experiments/plans/a.yaml", planRevision: "ra", aggregateStatus: "ready", rawResultCsvPath: "simple_cluster/results/w1/raw.csv", results: [row("w1", "alpha", 1, 0.81)] } },
  ], "experiments/plans/a.yaml", ["w1", "w2"]);
  provider.client.getResultsSummary = async () => ({
    ...merged,
    rawResultCsvPath: "simple_cluster/results/w1/raw.csv",
    workerResultTables: [{ ...(merged.workerResultTables || [])[0], workerId: "w1", aggregateStatus: "ready", rawResultCsvPath: "simple_cluster/results/w1/raw.csv" }],
    results: [{ ...merged.results[0], workerId: "w1", sourceFiles: [{ path: "simple_cluster/results/w1/raw.csv" }] }],
  });
  const { RealtimeTunnelPanelProvider } = require("../../dist/extension/legacy.js");
  const host = Object.assign(Object.create(RealtimeTunnelPanelProvider.prototype), provider);
  await RealtimeTunnelPanelProvider.prototype.handleMessageCore.call(host, { command: "rebuildProjectResultTables" }, "rebuildProjectResultTables");
  const registry = JSON.parse(fs.readFileSync(path.join(workspace, "simple_cluster", "results", "project_table_registry.json"), "utf8"));
  assert.deepEqual(registry.plans["experiments/plans/a.yaml"].records.map((item) => [item.workerId, item.seed]), [["w1", "1"], ["w1", "2"]]);
  assert.match(JSON.stringify(host.resultSyncReport || {}), /w2|unavailable|缺/);
});

test("three plans survive a real request budget cooldown and cancel publishes nothing", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "simple-result-budget-"));
  vscodeStub.workspace.workspaceFolders = [{ uri: { fsPath: workspace, scheme: "file", path: workspace } }];
  const { RequestBudgetDeniedError } = require("../../dist/tunnel/RequestBudget.js");
  const provider = providerFor(workspace);
  provider.localPlanMetadata.plans = ["a", "b", "c"].map((name) => ({ planFile: "experiments/plans/" + name + ".yaml", revision: "r" + name, seeds: [1] }));
  let hits = 0;
  provider.client.getResultsSummary = async (planFile) => {
    hits += 1;
    if (hits === 1) throw new RequestBudgetDeniedError("manual_refresh", { allowed: false, reason: "cooldown", retryAfterMs: 1000 });
    const owner = planFile.includes("/b.") ? "w2" : "w1";
    return { planFile, planRevision: planFile.includes("/b.") ? "rb" : planFile.includes("/c.") ? "rc" : "ra", workerResultTables: [table(owner)], results: [row(owner, "alpha", 1, 0.5, planFile.includes("/b.") ? "rb" : planFile.includes("/c.") ? "rc" : "ra")] };
  };
  provider.resultSummaryBudgetWait = async (delay, label, isCurrent, token) => {
    provider.calls.push(["budget-wait", delay, label, token.isCancellationRequested]);
    if (token.isCancellationRequested || !isCurrent()) throw new Error("cancelled");
  };
  const { RealtimeTunnelPanelProvider } = require("../../dist/extension/legacy.js");
  const host = Object.assign(Object.create(RealtimeTunnelPanelProvider.prototype), provider);
  await RealtimeTunnelPanelProvider.prototype.handleMessageCore.call(host, { command: "syncPendingPlanArtifacts" }, "syncPendingPlanArtifacts");
  const registry = JSON.parse(fs.readFileSync(path.join(workspace, "simple_cluster", "results", "project_table_registry.json"), "utf8"));
  assert.equal(Object.keys(registry.plans).length, 3);
  assert.equal(host.calls.some((call) => call[0] === "budget-wait" && call[1] === 1000), true);

  const cancelled = providerFor(workspace);
  cancelled.localPlanMetadata.plans = provider.localPlanMetadata.plans;
  cancelled.client.getResultsSummary = async () => { throw new RequestBudgetDeniedError("manual_refresh", { allowed: false, reason: "rate_limited", retryAfterMs: 1000 }); };
  cancelled.resultSummaryBudgetWait = async (_delay, _label, _isCurrent, token) => { token.isCancellationRequested = true; };
  const cancelHost = Object.assign(Object.create(RealtimeTunnelPanelProvider.prototype), cancelled);
  await RealtimeTunnelPanelProvider.prototype.handleMessageCore.call(cancelHost, { command: "syncPendingPlanArtifacts" }, "syncPendingPlanArtifacts");
  assert.equal(cancelHost.calls.some((call) => call[0] === "postState"), false);
  assert.equal(fs.existsSync(path.join(workspace, "simple_cluster", "results", "project_table_registry.json")), true);
});

test("cancelling the first worker does not publish the second worker of the same plan", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "simple-result-cancel-source-"));
  vscodeStub.workspace.workspaceFolders = [{ uri: { fsPath: workspace, scheme: "file", path: workspace } }];
  const previous = vscodeStub.window.withProgress;
  let cancelNext = false;
  vscodeStub.window.withProgress = async (_options, task) => {
    const token = { isCancellationRequested: cancelNext };
    const result = await task({ report() {} }, token);
    cancelNext = true;
    return result;
  };
  const provider = providerFor(workspace);
  provider.localPlanMetadata.plans = [{ planFile: "experiments/plans/a.yaml", revision: "ra", seeds: [1, 2, 3] }];
  provider.simpleSftpApiCall = async (method, params) => {
    provider.calls.push([method, params.server.id]);
    return { ok: true, fileCount: params.entries.length, completedFiles: params.entries.length };
  };
  const { RealtimeTunnelPanelProvider } = require("../../dist/extension/legacy.js");
  const host = Object.assign(Object.create(RealtimeTunnelPanelProvider.prototype), provider);
  const result = await RealtimeTunnelPanelProvider.prototype.syncPendingResultMetricsFromUi.call(host);
  vscodeStub.window.withProgress = previous;
  assert.equal(result.reason, "cancelled");
  assert.equal(host.resultsSummary, undefined);
  assert.equal(host.calls.filter((call) => call[0] === "sync.downloadMappedPaths").some((call) => call[1] === "w2"), false);
});

test("a ledger run does not stamp anonymous summary rows and a contradictory run keeps the old table", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "simple-result-anonymous-run-"));
  vscodeStub.workspace.workspaceFolders = [{ uri: { fsPath: workspace, scheme: "file", path: workspace } }];
  const provider = providerFor(workspace);
  provider.localPlanMetadata.plans = [{ planFile: "experiments/plans/a.yaml", revision: "ra", seeds: [1] }];
  provider.loadPlanSyncLedger = async () => ({ schemaVersion: 2, entries: { done: { planFile: "experiments/plans/a.yaml", revision: "ra", runId: "run-ledger", sourceWorkerId: "w1", artifactPaths: [], directoryPaths: [], destinations: {} } } });
  const anonymous = row("w1", "alpha", 1, 0.81);
  delete anonymous.runId;
  provider.client.getResultsSummary = async () => ({ planFile: "experiments/plans/a.yaml", planRevision: "ra", workerResultTables: [table("w1")], results: [anonymous] });
  const { RealtimeTunnelPanelProvider } = require("../../dist/extension/legacy.js");
  const host = Object.assign(Object.create(RealtimeTunnelPanelProvider.prototype), provider);
  await RealtimeTunnelPanelProvider.prototype.handleMessageCore.call(host, { command: "rebuildProjectResultTables" }, "rebuildProjectResultTables");
  const registry = JSON.parse(fs.readFileSync(path.join(workspace, "simple_cluster", "results", "project_table_registry.json"), "utf8"));
  assert.equal(registry.plans["experiments/plans/a.yaml"].records[0].runId || "", "");
  assert.match(JSON.stringify(host.resultSyncReport), /run-ledger/);

  const contradictory = providerFor(workspace);
  contradictory.localPlanMetadata.plans = provider.localPlanMetadata.plans;
  contradictory.loadPlanSyncLedger = provider.loadPlanSyncLedger;
  contradictory.client.getResultsSummary = async () => ({ planFile: "experiments/plans/a.yaml", planRevision: "ra", completedRunId: "run-other", workerResultTables: [table("w1")], results: [anonymous] });
  const other = Object.assign(Object.create(RealtimeTunnelPanelProvider.prototype), contradictory);
  await RealtimeTunnelPanelProvider.prototype.handleMessageCore.call(other, { command: "rebuildProjectResultTables" }, "rebuildProjectResultTables");
  const kept = JSON.parse(fs.readFileSync(path.join(workspace, "simple_cluster", "results", "project_table_registry.json"), "utf8"));
  assert.equal(kept.plans["experiments/plans/a.yaml"].records[0].runId || "", "");
  assert.match(JSON.stringify(other.resultSyncReport), /矛盾/);
});

test("a budget-limited second worker is retried and an offline worker stays reported", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "simple-result-worker-budget-"));
  vscodeStub.workspace.workspaceFolders = [{ uri: { fsPath: workspace, scheme: "file", path: workspace } }];
  const { mergeWorkerResultsSummaries } = require("../../dist/tunnel/MultiEndpointRealtimeClient.legacy.js");
  const provider = providerFor(workspace);
  provider.localPlanMetadata.plans = [{ planFile: "experiments/plans/a.yaml", revision: "ra", seeds: [1, 2, 3] }];
  provider.loadPlanSyncLedger = async () => ({ schemaVersion: 2, entries: {} });
  let calls = 0;
  const partial = mergeWorkerResultsSummaries([
    { workerId: "w1", summary: { planFile: "experiments/plans/a.yaml", planRevision: "ra", aggregateStatus: "ready", rawResultCsvPath: "simple_cluster/results/w1/raw.csv", results: [row("w1", "alpha", 1, 0.81), row("w1", "alpha", 2, 0.82)] } },
  ], "experiments/plans/a.yaml", ["w1", "w2"]);
  const complete = mergeWorkerResultsSummaries([
    { workerId: "w1", summary: { planFile: "experiments/plans/a.yaml", planRevision: "ra", aggregateStatus: "ready", rawResultCsvPath: "simple_cluster/results/w1/raw.csv", results: [row("w1", "alpha", 1, 0.81), row("w1", "alpha", 2, 0.82)] } },
    { workerId: "w2", summary: { planFile: "experiments/plans/a.yaml", planRevision: "ra", aggregateStatus: "ready", rawResultCsvPath: "simple_cluster/results/w2/raw.csv", results: [row("w2", "alpha", 3, 0.83)] } },
  ], "experiments/plans/a.yaml", ["w1", "w2"]);
  provider.client.getResultsSummary = async () => {
    calls += 1;
    const summary = calls === 1 ? partial : complete;
    return { ...summary, results: summary.results.map((item) => ({ ...item, sourceFiles: [{ path: "simple_cluster/results/" + item.workerId + "/raw.csv" }] })) };
  };
  provider.client.budgetSnapshots = () => ({ w2: { lastDeniedReason: "cooldown", lastAllowedAt: new Date(Date.now() - 200).toISOString(), requestsLastMinute: 1 } });
  provider.resultSummaryBudgetWait = async (delay) => { provider.calls.push(["budget-wait", delay]); };
  const { RealtimeTunnelPanelProvider } = require("../../dist/extension/legacy.js");
  const host = Object.assign(Object.create(RealtimeTunnelPanelProvider.prototype), provider);
  await RealtimeTunnelPanelProvider.prototype.handleMessageCore.call(host, { command: "syncPendingPlanArtifacts" }, "syncPendingPlanArtifacts");
  const registry = JSON.parse(fs.readFileSync(path.join(workspace, "simple_cluster", "results", "project_table_registry.json"), "utf8"));
  assert.deepEqual(registry.plans["experiments/plans/a.yaml"].records.map((item) => item.seed).sort(), ["1", "2", "3"]);
  assert.equal(calls, 2);

  fs.writeFileSync(path.join(workspace, "simple_cluster", "results", "project_table_registry.json"), JSON.stringify({ schemaVersion: 1, plans: {} }));
  const offline = providerFor(workspace);
  offline.localPlanMetadata.plans = provider.localPlanMetadata.plans;
  offline.loadPlanSyncLedger = provider.loadPlanSyncLedger;
  offline.client.getResultsSummary = async () => ({ ...partial, results: partial.results.map((item) => ({ ...item, sourceFiles: [{ path: "simple_cluster/results/w1/raw.csv" }] })) });
  offline.client.budgetSnapshots = () => ({ w2: { lastDeniedReason: "offline" } });
  const offlineHost = Object.assign(Object.create(RealtimeTunnelPanelProvider.prototype), offline);
  await RealtimeTunnelPanelProvider.prototype.handleMessageCore.call(offlineHost, { command: "rebuildProjectResultTables" }, "rebuildProjectResultTables");
  const partialRegistry = JSON.parse(fs.readFileSync(path.join(workspace, "simple_cluster", "results", "project_table_registry.json"), "utf8"));
  assert.deepEqual([...new Set(partialRegistry.plans["experiments/plans/a.yaml"].records.map((item) => item.workerId))], ["w1"]);
  assert.match(JSON.stringify(offlineHost.resultSyncReport), /w2/);
  assert.doesNotMatch(JSON.stringify(offlineHost.resultSyncReport.skipped || []), /^$/);
});

test("an existing trusted summary updates the table without download and a bad plan does not block the next", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "simple-result-zero-download-"));
  vscodeStub.workspace.workspaceFolders = [{ uri: { fsPath: workspace, scheme: "file", path: workspace } }];
  const provider = providerFor(workspace);
  provider.localPlanMetadata.plans = [
    { planFile: "experiments/plans/a.yaml", revision: "ra", seeds: [1] },
    { planFile: "experiments/plans/b.yaml", revision: "rb", seeds: [1] },
  ];
  provider.loadPlanSyncLedger = async () => ({ schemaVersion: 2, entries: {} });
  provider.client.getResultsSummary = async (planFile) => {
    if (String(planFile).includes("/a.")) return {
      planFile, planRevision: "ra", workerResultTables: [table("w1")],
      results: [{ ...row("w1", "alpha", 1, 0.81), metrics: { AUC: { value: Number.NaN } } }],
    };
    return { planFile, planRevision: "rb", workerResultTables: [table("w2")], results: [row("w2", "beta", 1, 0.71, "rb")] };
  };
  const { RealtimeTunnelPanelProvider } = require("../../dist/extension/legacy.js");
  const host = Object.assign(Object.create(RealtimeTunnelPanelProvider.prototype), provider);
  await RealtimeTunnelPanelProvider.prototype.handleMessageCore.call(host, { command: "rebuildProjectResultTables" }, "rebuildProjectResultTables");
  const registry = JSON.parse(fs.readFileSync(path.join(workspace, "simple_cluster", "results", "project_table_registry.json"), "utf8"));
  assert.equal(Boolean(registry.plans["experiments/plans/b.yaml"]), true);
  assert.equal(host.calls.some((call) => call[0] === "postState"), true);
  assert.match(JSON.stringify(host.resultSyncReport), /a\.yaml/);
});
