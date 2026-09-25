const assert = require("node:assert/strict");
const test = require("node:test");
const vm = require("node:vm");
const { readSource } = require("../_helpers/sourceReader");

const panel = readSource("src/ui/PanelHtml.ts");

function extract(startName, endName) {
  const start = panel.indexOf(`function ${startName}(`);
  const end = panel.indexOf(`function ${endName}(`, start + 1);
  assert.ok(start >= 0 && end > start);
  return panel.slice(start, end).replaceAll("\\\\", "\\");
}

test("Plan overview prioritizes live work and folds old failures after restart", () => {
  let html = "";
  const sandbox = {
    Map,
    Set,
    operationRowsForState: () => [
      { planFile: "plans/done.yaml", status: "completed", updatedAt: "2026-09-20T10:00:00Z" },
      { planFile: "plans/old-fail.yaml", status: "failed", finishedAt: "2026-09-20T11:00:00Z" },
      { planFile: "plans/new-fail.yaml", status: "failed", finishedAt: "2026-09-25T12:10:00Z" },
      { planFile: "plans/live.yaml", status: "running", updatedAt: "2026-09-20T09:00:00Z" },
    ],
    taskSectionViewModelForState: () => ({ allRows: [
      { planFile: "plans/done.yaml", status: "completed" },
      { planFile: "plans/live.yaml", status: "running" },
    ] }),
    taskPlanFile: (row) => row.planFile,
    taskSelectionSetsForState: () => ({}),
    normalizePlanSelectionKey: String,
    samePlanSelection: (left, right) => left === right,
    selectedExecutionPlanFile: "plans/live.yaml",
    persistWebviewState: () => undefined,
    taskStatusToken: String,
    TASK_LIVE_STATUS_TOKENS: new Set(["running"]),
    TASK_QUEUED_STATUSES: new Set(["queued"]),
    TASK_TERMINAL_STATUSES: new Set(["completed"]),
    operationIsActive: (value) => value === "running",
    operationIsFailureLike: (value) => value === "failed",
    operationHasDeadEvidence: () => false,
    taskFailureLikeStatus: (value) => value === "failed",
    planBaseName: (value) => value.split("/").pop(),
    esc: String,
    escAttr: String,
    detailsOpenAttr: () => "",
    statusClass: String,
    renderOperationItem: () => "<div>operation</div>",
    renderTaskCards: () => "<div>tasks</div>",
    setHtmlIfChanged: (_id, value) => { html = value; },
  };
  vm.createContext(sandbox);
  vm.runInContext(extract("renderExecutionPlanList", "renderOperationSection") + "\nthis.render = renderExecutionPlanList;", sandbox);
  sandbox.render({ sessionStartedAt: "2026-09-25T12:00:00Z" });
  assert.ok(html.indexOf("live.yaml") < html.indexOf("历史 Plan"));
  assert.ok(html.indexOf("new-fail.yaml") < html.indexOf("历史 Plan"));
  assert.ok(html.indexOf("old-fail.yaml") > html.indexOf("历史 Plan"));
  assert.match(html, /<summary>历史 Plan · 2<\/summary>/);
  assert.match(html, /任务与日志/);
  assert.match(html, /data-command="clearOperations" data-plan-file="plans\/live.yaml"/);
  assert.match(html, /data-execution-plan-select="plans\/live.yaml" aria-pressed="true"/);
});

test("persisted distributed jobs keep their Plan live after restart despite old failed operations", () => {
  let html = "";
  const sandbox = {
    Map, Set,
    operationRowsForState: () => [{ planFile: "plans/corim.yaml", status: "failed", finishedAt: "2026-09-24T11:00:00Z" }],
    taskSectionViewModelForState: () => ({ allRows: [] }),
    taskPlanFile: (row) => row.planFile,
    taskSelectionSetsForState: () => ({}),
    normalizePlanSelectionKey: String,
    samePlanSelection: (left, right) => left === right,
    selectedExecutionPlanFile: "plans/corim.yaml",
    persistWebviewState: () => undefined,
    taskStatusToken: String,
    TASK_LIVE_STATUS_TOKENS: new Set(["running"]),
    TASK_QUEUED_STATUSES: new Set(["queued"]),
    TASK_TERMINAL_STATUSES: new Set(["completed"]),
    operationIsActive: (value) => value === "running",
    operationIsFailureLike: (value) => value === "failed",
    operationHasDeadEvidence: () => false,
    taskFailureLikeStatus: (value) => value === "failed",
    planBaseName: (value) => value.split("/").pop(),
    esc: String, escAttr: String,
    detailsOpenAttr: () => "",
    statusClass: String,
    renderOperationItem: () => "<div>operation</div>",
    renderTaskCards: () => "<div>tasks</div>",
    setHtmlIfChanged: (_id, value) => { html = value; },
  };
  vm.createContext(sandbox);
  vm.runInContext(extract("renderExecutionPlanList", "renderOperationSection") + "\nthis.render = renderExecutionPlanList;", sandbox);
  sandbox.render({ sessionStartedAt: "2026-09-25T12:00:00Z", distributedPlans: [{
    id: "distributed-1", planFile: "plans/corim.yaml", enqueuedAt: "2026-09-24T10:00:00Z",
    jobs: [
      { index: 0, case: "bus", seed: 42, status: "completed", workerId: "worker-a", gpuId: "0", commandId: "old-job" },
      { index: 1, case: "pad", seed: 42, status: "running", workerId: "worker-b", gpuId: "1", commandId: "live-job" },
    ],
  }] });
  assert.match(html, /executionPlanRow running/);
  assert.match(html, /任务 1\/2 · 运行 1/);
  assert.match(html, /pad seed 42/);
  assert.match(html, /data-command="selectLogRunKey" data-run-key="live-job" data-worker-id="worker-b"/);
  assert.doesNotMatch(html, /历史 Plan/);
});

test("diagnostics default to current server health and actionable issues", () => {
  let html = "";
  const sandbox = {
    Set,
    asArray: (value) => Array.isArray(value) ? value : [],
    workerName: String,
    compactText: String,
    esc: String,
    escAttr: String,
    setHtmlIfChanged: (_id, value) => { html = value; },
  };
  vm.createContext(sandbox);
  vm.runInContext(extract("renderDiagnosticOverview", "renderDiagnosticDetailsJson") + "\nthis.render = renderDiagnosticOverview;", sandbox);
  sandbox.render({ setup: { workerTunnels: [{ id: "nwpu3", enabled: true }] }, workerProbes: { nwpu3: { status: "ok" } }, actionErrors: [] });
  assert.match(html, /nwpu3/);
  assert.match(html, /当前无待处理的连接或端口问题/);
  sandbox.render({ setup: { workerTunnels: [{ id: "nwpu3", enabled: true }] }, workerProbes: { nwpu3: { status: "timeout", message: "连接超时" } }, actionErrors: [] });
  assert.match(html, /连接超时/);
  assert.doesNotMatch(html, /当前无待处理的连接或端口问题/);
});

test("history clearing hides old terminal rows only in the selected Plan", () => {
  const sandbox = { normalizePlanSelectionKey: (value) => String(value || "").replaceAll("\\", "/") };
  vm.createContext(sandbox);
  vm.runInContext(extract("executionHistoryRowVisible", "operationRowsForInput") + "\nthis.visible = executionHistoryRowVisible;", sandbox);
  const state = { executionHistoryCutoffs: { "plans/a.yaml": "2026-09-21T10:00:00Z" } };
  const old = { updatedAt: "2026-09-20T10:00:00Z" };
  const newer = { updatedAt: "2026-09-21T10:01:00Z" };
  assert.equal(sandbox.visible(state, old, "plans/a.yaml", false), false);
  assert.equal(sandbox.visible(state, old, "plans/b.yaml", false), true);
  assert.equal(sandbox.visible(state, old, "plans/a.yaml", true), true);
  assert.equal(sandbox.visible(state, { ...old, status: "running", reconcileEvidenceActive: false }, "plans/a.yaml", false), false);
  assert.equal(sandbox.visible(state, newer, "plans/a.yaml", false), true);
});
