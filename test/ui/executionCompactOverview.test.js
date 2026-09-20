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

test("Plan overview prioritizes running work and folds completed plans", () => {
  let html = "";
  const sandbox = {
    Map,
    Set,
    operationRowsForState: () => [
      { planFile: "plans/done.yaml", status: "completed", updatedAt: "2026-09-20T10:00:00Z" },
      { planFile: "plans/live.yaml", status: "running", updatedAt: "2026-09-20T09:00:00Z" },
    ],
    taskSectionViewModelForState: () => ({ allRows: [
      { planFile: "plans/done.yaml", status: "completed" },
      { planFile: "plans/live.yaml", status: "running" },
    ] }),
    taskPlanFile: (row) => row.planFile,
    taskSelectionSetsForState: () => ({}),
    normalizePlanSelectionKey: String,
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
  sandbox.render({});
  assert.ok(html.indexOf("live.yaml") < html.indexOf("已结束的 Plan"));
  assert.match(html, /<summary>已结束的 Plan · 1<\/summary>/);
  assert.match(html, /任务与日志/);
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
