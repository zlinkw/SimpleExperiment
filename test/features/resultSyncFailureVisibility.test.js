const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync(require.resolve("../../dist/extension/legacy.js"), "utf8");
function method(first, next) {
  const start = source.indexOf(first), end = source.indexOf(next, start);
  assert.ok(start >= 0 && end > start, first);
  return source.slice(start, end).replace(/}\r?\n {4}(?=(?:async )?[a-zA-Z_$][\w$]*\()/g, "},\n    ");
}

function fixture() {
  const alerts = [], statuses = [], progress = [];
  const sandbox = {
    workspaceRoot: () => "C:/project",
    PLAN_SUBMISSION_COMMANDS: new Set(["runPlan"]),
    actionCommandMap: { runPlan: "plan/run" },
    localCommandReleasesAfterTrigger: () => false,
    hostOperationLeaseActionLabel: command => command,
    errorMessage: error => error.message, compactSensitiveText: text => text,
    isUiCommandRemotePending: () => false, isUiCommandCancelled: error => error.name === "UiCommandCancelled",
    actionErrorSuggestion: () => "inspect", formatResultSyncReport: report => `skipped: ${report.skipped.join(";")}`,
    vscode: { window: { showErrorMessage: async (...args) => alerts.push(args), showInformationMessage() {} } },
  };
  vm.createContext(sandbox);
  vm.runInContext(`this.methods = { ${[
    method("async withUiCommandStatus(", "uiCommandWatchdogMs("),
    method("async runActionCommandCore(", "async runPlanPreflight("),
    method("\n    assertPlanSubmissionNotDuringResultSync(", "\n    async finishDistributedPlanSubmission("),
    method("async finishDistributedPlanSubmission(", "async activeDeferredForSubmission("),
    method("async distributedCodeVersionHold(", "planValidationCacheKey("),
  ].join(",")} };`, sandbox);
  const host = {
    ...sandbox.methods, localOperations: {}, manualResultSyncCounts: new Map(),
    postUiCommandStatus(_id, status) { statuses.push(status); },
    planSubmissionOperationId: () => "op", submissionStillCurrent: () => true,
    finishPlanSubmissionProgress(_message, status, detail) { progress.push({ status, detail }); },
    postState() {}, recordActionError() {},
  };
  return { host, alerts, statuses, progress };
}

test("run during result sync fails in a modal without navigating, cancelling or touching the sync", async () => {
  const f = fixture();
  const sync = Promise.resolve("still syncing");
  f.host.distributedPostprocessPromise = sync;
  let codeSync = false;
  f.host.ensureCodeReadyForRun = async () => { codeSync = true; };
  await f.host.withUiCommandStatus("click", "runPlan", {},
    () => f.host.finishDistributedPlanSubmission("runPlan", {}, {}, {}));
  assert.equal(f.host.distributedPostprocessPromise, sync);
  assert.equal(codeSync, false);
  assert.equal(f.alerts.length, 1);
  assert.equal(f.alerts[0][1].modal, true);
  assert.match(f.alerts[0][1].detail, /同步将继续/);
  assert.equal(f.statuses.at(-1), "failed");
});

test("the full result download scope blocks submission before rules, Worker selection or client changes", async () => {
  const f = fixture();
  const client = {};
  f.host.client = client;
  let release;
  const download = f.host.withManualResultSync(() => new Promise(resolve => { release = resolve; }));
  await f.host.withUiCommandStatus("run-click", "runPlan", {}, () => f.host.runActionCommandCore("runPlan", {}));
  assert.equal(f.host.client, client);
  assert.equal(f.host.manualResultSyncCounts.get("C:/project"), 1);
  assert.equal(f.alerts.length, 1);
  assert.equal(f.alerts[0][1].modal, true);
  assert.match(f.alerts[0][1].detail, /同步将继续/);
  release();
  await download;
  assert.equal(f.host.manualResultSyncCounts.size, 0);
  await assert.rejects(f.host.withManualResultSync(async () => { throw new Error("sync failed"); }), /sync failed/);
  assert.equal(f.host.manualResultSyncCounts.size, 0);
});

test("result sync with uncollected Plans reports failure in a modal rather than completed", async () => {
  const f = fixture();
  await f.host.withUiCommandStatus("click", "syncPendingPlanArtifacts", {},
    async () => ({ discovered: 2, included: ["a"], skipped: ["b: content missing"], missing: [] }));
  assert.equal(f.alerts.length, 1);
  assert.equal(f.alerts[0][1].modal, true);
  assert.match(f.alerts[0][1].detail, /content missing/);
  assert.equal(f.statuses.at(-1), "failed");
});

test("completed old-revision history and an artifact sync do not masquerade as a live training blocker", async () => {
  const f = fixture();
  f.host.distributedPostprocessPromise = Promise.resolve();
  f.host.loadDistributedQueue = async () => ({ plans: [{ codeFingerprint: "old", jobs: [{ status: "completed" }] }] });
  f.host.localDistributedCodeFingerprint = async () => { throw new Error("should not compare inactive code"); };
  assert.equal(await f.host.distributedCodeVersionHold({}), undefined);
});
