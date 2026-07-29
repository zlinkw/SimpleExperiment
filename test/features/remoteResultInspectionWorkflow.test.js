const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "../..");
const extension = fs.readFileSync(path.join(root, "src/extension.ts"), "utf8");
const panel = fs.readFileSync(path.join(root, "src/ui/PanelHtml.ts"), "utf8");
const agent = fs.readFileSync(path.join(root, "src/clusterAgentRuntime.ts"), "utf8");
const fileClient = fs.readFileSync(path.join(root, "src/tunnel/FileTransferClient.ts"), "utf8");
const realtimeClient = fs.readFileSync(path.join(root, "src/tunnel/RealtimeTunnelClient.ts"), "utf8");
const multiClient = fs.readFileSync(path.join(root, "src/tunnel/MultiEndpointRealtimeClient.ts"), "utf8");
const { isSafeRemotePath } = require("../../src/tunnel/FileTransferTypes.ts");
const { FileTransferClient } = require("../../dist/tunnel/FileTransferClient.js");

function loadHelpers() {
  const start = extension.indexOf("const REMOTE_RESULT_INSPECTION_MAX_BYTES");
  const end = extension.indexOf("function findDebugBundlePath", start);
  assert.ok(start > 0 && end > start);
  const sandbox = {
    path,
    crypto,
    FileTransferTypes_1: { isSafeRemotePath },
    normalizePlanSelectionKey: (value) => String(value || "").trim().replace(/\\/g, "/"),
    operationResultPlanFile(item) {
      return String(item.planFile || item.plan_file || item.plan || item.selectedPlanId || (item.options || {}).planFile || "");
    },
    samePlanSelection(left, right) {
      const key = (value) => String(value || "").replace(/\\/g, "/").toLowerCase().replace(/^experiments\/plans\//, "");
      return Boolean(key(left) && key(left) === key(right));
    },
    uniqueStrings: (values) => [...new Set(values.filter(Boolean))],
    stringFromRecord(item, keys) {
      for (const key of keys) if (typeof item[key] === "string" && item[key].trim()) return item[key].trim();
      return "";
    },
    planVersionTimestamp(value) {
      const parsed = Date.parse(String(value || ""));
      return Number.isFinite(parsed) ? parsed : NaN;
    },
    safePlanToken: (value) => String(value || "experiment").replace(/[^\w.-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 48) || "experiment",
    Date,
  };
  vm.createContext(sandbox);
  vm.runInContext(extension.slice(start, end) + "\nthis.api = { REMOTE_RESULT_INSPECTION_MAX_BYTES, normalizeRemoteResultInspectionPath, remoteResultInspectionLocalRelativePath, remoteResultInspectionCandidates, resultSummaryInspectionCandidates };", sandbox);
  return sandbox.api;
}

function loadPanelDetailHelper() {
  const start = panel.indexOf("function normalizeUnparseableDetails");
  const end = panel.indexOf("function operationSearchText", start);
  assert.ok(start > 0 && end > start);
  const sandbox = {
    asArray(value) {
      return Array.isArray(value) ? value : (!value || typeof value !== "object" ? [] : Object.values(value));
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(panel.slice(start, end) + "\nthis.api = { normalizeUnparseableDetails };", sandbox);
  return sandbox.api;
}

test("remote result inspection accepts only lightweight project files", () => {
  const helpers = loadHelpers();
  assert.equal(helpers.REMOTE_RESULT_INSPECTION_MAX_BYTES, 5 * 1024 * 1024);
  for (const file of [
    "metrics_summary.csv",
    "work_dirs/smoke/metrics_summary.csv",
    "outputs/eval/metrics.json",
    "reports/run/summary.txt",
    "logs/run/stdout.log",
    "artifacts/eval/output.out",
  ]) {
    assert.equal(helpers.normalizeRemoteResultInspectionPath(file), file);
  }
  for (const file of ["/etc/passwd", "../metrics.csv", "work_dirs/model.pt", "outputs/plot.png", "reports/id_rsa.txt", "logs/key.pem"]) {
    assert.equal(helpers.normalizeRemoteResultInspectionPath(file), "");
  }
  const local = helpers.remoteResultInspectionLocalRelativePath("work_dirs/smoke/metrics_summary.csv", "experiments/plans/smoke.yaml", "2026-07-17T12:34:56.000Z");
  assert.match(local, /^zlk_cluster\/downloads\/result_inspection\/experiments_plans_smoke\.yaml\/metrics_summary__[a-f0-9]{10}__20260717123456\.csv$/);
});

test("remote result inspection is authorized by the matching Plan contract operation", () => {
  const helpers = loadHelpers();
  const operations = {
    matching: {
      type: "check-output-contract",
      planFile: "experiments/plans/smoke.yaml",
      updatedAt: "2026-07-17T10:00:00Z",
      contractReport: {
        unparseableFiles: ["work_dirs/smoke/metrics_summary.csv", "outputs/smoke/metrics.json", "outputs/smoke/plot.png"],
      },
    },
    otherPlan: {
      type: "check-output-contract",
      planFile: "experiments/plans/other.yaml",
      unparseableFiles: ["work_dirs/other/metrics_summary.csv"],
    },
    unrelated: {
      type: "parse-results",
      planFile: "experiments/plans/smoke.yaml",
      unparseableFiles: ["work_dirs/smoke/untrusted.csv"],
    },
  };
  assert.deepEqual(
    Array.from(helpers.remoteResultInspectionCandidates([operations], "experiments/plans/smoke.yaml")),
    ["work_dirs/smoke/metrics_summary.csv", "outputs/smoke/metrics.json"]
  );
  assert.deepEqual(Array.from(helpers.remoteResultInspectionCandidates([operations], "experiments/plans/missing.yaml")), []);
  operations.latestSuccess = {
    type: "check-output-contract",
    planFile: "experiments/plans/smoke.yaml",
    updatedAt: "2026-07-17T11:00:00Z",
    status: "completed",
    contractReport: { unparseableFiles: [] },
  };
  assert.deepEqual(Array.from(helpers.remoteResultInspectionCandidates([operations], "experiments/plans/smoke.yaml")), []);

  operations.latestSuccess.planRevision = "rev-old";
  operations.currentVersion = {
    type: "check-output-contract",
    planFile: "experiments/plans/smoke.yaml",
    planRevision: "rev-current",
    updatedAt: "2026-07-17T10:30:00Z",
    contractReport: { unparseableFiles: ["work_dirs/smoke/current.csv"] },
  };
  assert.deepEqual(
    Array.from(helpers.remoteResultInspectionCandidates([operations], "experiments/plans/smoke.yaml", "rev-current", "2026-07-17T09:00:00Z")),
    ["work_dirs/smoke/current.csv"]
  );
});

test("generated result artifacts are authorized only by the matching Plan summary", () => {
  const helpers = loadHelpers();
  const summary = {
    planFile: "experiments/plans/smoke.yaml",
    previewCsvPath: "zlk_cluster/results/by_plan/smoke/results_preview_all.csv",
    effectiveResultsCsvPath: "zlk_cluster/results/by_plan/smoke/results_effective_archived.csv",
    statisticsPath: "zlk_cluster/results/by_plan/smoke/statistics.json",
    paperTableCsvPath: "zlk_cluster/results/by_plan/smoke/paper_table.csv",
    claimEvidence: { path: "zlk_cluster/results/by_plan/smoke/claim_evidence.json" },
    qualityGatePath: "../outside.json",
  };
  assert.deepEqual(Array.from(helpers.resultSummaryInspectionCandidates(summary, "experiments/plans/smoke.yaml")), [
    "zlk_cluster/results/by_plan/smoke/results_preview_all.csv",
    "zlk_cluster/results/by_plan/smoke/results_effective_archived.csv",
    "zlk_cluster/results/by_plan/smoke/statistics.json",
    "zlk_cluster/results/by_plan/smoke/paper_table.csv",
    "zlk_cluster/results/by_plan/smoke/claim_evidence.json",
  ]);
  assert.deepEqual(Array.from(helpers.resultSummaryInspectionCandidates(summary, "experiments/plans/other.yaml")), []);
});

test("extension and workbench expose a confirmed download-and-open path", () => {
  assert.match(extension, /case "downloadRemoteResult":\s*await this\.downloadRemoteResultFromUi\(message\)/);
  const download = extension.match(/async downloadRemoteResultFromUi\(message\)[\s\S]*?async openResultArtifactFromUi/)?.[0] || "";
  assert.match(download, /const generation = this\.projectContextGeneration/);
  assert.match(download, /const client = this\.client/);
  assert.ok([...download.matchAll(/generation !== this\.projectContextGeneration \|\| root !== workspaceRoot\(\) \|\| client !== this\.client/g)].length >= 4);
  assert.ok(download.indexOf("await client.downloadFile") < download.indexOf("await openWorkspaceFile(localRelative)"));
  assert.match(extension, /remoteResultInspectionCandidates\(\[this\.localOperations, this\.lastRealtimeState\?\.operations\], planFile, version\.revision, version\.updatedAt\)/);
  assert.match(extension, /showWarningMessage\(\[\s*"【远端结果查看确认】"[\s\S]*`远端来源：\$\{remotePath\}`[\s\S]*`本地副本：\$\{localPath\}`[\s\S]*\{ modal: true \}, "下载并打开"\)/);
  assert.match(extension, /client\.downloadFile\(remotePath, localPath, \{ maxBytes: REMOTE_RESULT_INSPECTION_MAX_BYTES \}\)/);
  assert.match(extension, /await openWorkspaceFile\(localRelative\)/);
  assert.doesNotMatch(extension.slice(extension.indexOf("async downloadRemoteResultFromUi"), extension.indexOf("async openAuditTail")), /openWorkspaceFile\(remotePath\)/);
  assert.match(panel, /downloadRemoteResult: \["endpoints\.fileDownload"\]/);
  assert.match(panel, /data-command="downloadRemoteResult" data-remote-path=/);
  assert.match(panel, /outputContractUnparseableFileList: item\.unparseableFileList/);
  assert.match(panel, /renderRemoteResultInspectionActions\(stage\.unparseableFileList, planFile, 2, stage\.unparseableDetails\)/);
  assert.match(panel, /class="operationFileReason"/);
  assert.match(panel, /compactText\(error, 120\)/);
  assert.match(panel, /outputContractUnparseableDetails: item\.unparseableDetails/);
});

test("preview and effective CSV buttons open result artifacts without changing Plan selection", () => {
  const handler = extension.slice(extension.indexOf("async openResultArtifactFromUi"), extension.indexOf("async openAuditTail"));
  assert.match(extension, /case "openResultArtifact":\s*await this\.openResultArtifactFromUi\(message\)/);
  assert.match(extension, /"downloadRemoteResult", "openResultArtifact", "openAuditTail"/);
  assert.match(handler, /this\.filterResultsSummaryForPlan\(this\.resultsSummary, planFile\)/);
  assert.match(handler, /resultSummaryInspectionCandidates\(summary, planFile\)/);
  assert.match(handler, /"【结果文件位置确认】"/);
  assert.match(handler, /`远端来源：\$\{artifactPath\}`/);
  assert.match(handler, /`预期本地只读副本：\$\{localCopyPath\}`/);
  assert.match(handler, /client\.downloadFile\(artifactPath, localCopyPath, \{ maxBytes: REMOTE_RESULT_INSPECTION_MAX_BYTES \}\)/);
  assert.match(handler, /await openWorkspaceFile\(localRelative\)/);
  assert.doesNotMatch(handler, /selectPlanFromUi|this\.selectedPlanId\s*=/);
  assert.match(panel, /resultFileButton\("打开完整预览", previewCsvPath, resultPlanFile\)/);
  assert.match(panel, /resultFileButton\("打开有效结果", effectiveResultsCsvPath, resultPlanFile\)/);
  assert.match(panel, /function resultFileButton\(label, file, planFile\)/);
  assert.match(panel, /data-command="openResultArtifact" data-remote-path=/);
  const buttonHelper = panel.slice(panel.indexOf("function resultFileButton"), panel.indexOf("function renderResultNextAction"));
  assert.doesNotMatch(buttonHelper, /data-command="openPlan"/);
});

test("operation details retain each parser error and add file-only fallbacks", () => {
  const helpers = loadPanelDetailHelper();
  const details = helpers.normalizeUnparseableDetails([
    { path: "work_dirs/a/metrics_summary.csv", error: "value 列不是数值" },
  ], ["work_dirs/a/metrics_summary.csv", "work_dirs/b/metrics_summary.csv"]);
  assert.deepEqual(Array.from(details, (item) => ({ ...item })), [
    { path: "work_dirs/a/metrics_summary.csv", error: "value 列不是数值" },
    { path: "work_dirs/b/metrics_summary.csv", error: "" },
  ]);
  assert.match(agent, /"unparseable": report\.get\("unparseable"\) or \[\]/);
});

test("file transfer enforces the inspection size cap before streaming", () => {
  assert.match(fileClient, /query\.set\("maxBytes", String\(Math\.trunc\(maxBytes\)\)\)/);
  assert.match(fileClient, /contentLength > maxBytes/);
  assert.match(realtimeClient, /downloadFile\(remotePath: string, localPath: string, options: DownloadOptions = \{\}\)/);
  assert.match(realtimeClient, /this\.files\.downloadFile\(remotePath, localPath, options\)/);
  assert.match(multiClient, /downloadFile\(remotePath: string, localPath: string, options: DownloadOptions = \{\}\)/);
  assert.match(multiClient, /hubClient\(\)\.downloadFile\(remotePath, localPath, options\)/);
  assert.match(agent, /if int\(max_bytes or 0\) > 0 and size > int\(max_bytes\):/);
  assert.match(agent, /status=413/);
  assert.match(agent, /params\.get\("maxBytes"\)/);
});

test("file transfer sends maxBytes to the Hub file API", async () => {
  const previousFetch = global.fetch;
  let requestedUrl = "";
  global.fetch = async (url) => {
    requestedUrl = String(url);
    return new Response('{"error":"file exceeds requested maxBytes"}', { status: 413, headers: { "content-type": "application/json" } });
  };
  try {
    const budget = { run: async (_kind, work) => work() };
    const client = new FileTransferClient({ localHost: "127.0.0.1", localPort: 18765 }, budget);
    await assert.rejects(
      client.downloadFile("work_dirs/smoke/metrics_summary.csv", path.join(root, "zlk_cluster", "tmp", "unused.csv"), { maxBytes: 12345 }),
      /HTTP 413/
    );
    assert.match(requestedUrl, /maxBytes=12345/);
  } finally {
    global.fetch = previousFetch;
  }
});
