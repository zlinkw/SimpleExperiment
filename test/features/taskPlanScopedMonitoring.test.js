const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");

function taskStatusSets() {
  return {
    TASK_FAILURE_STATUSES: new Set(["failed", "error", "stalled", "stopped", "cancelled"]),
    TASK_TERMINAL_STATUSES: new Set(["completed", "done", "archived", "deleted"]),
    TASK_ARCHIVABLE_STATUSES: new Set(["completed", "done"]),
  };
}

function extractFunction(name) {
  const start = panel.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing function ${name}`);
  const body = panel.indexOf("{", start);
  let depth = 0;
  for (let index = body; index < panel.length; index += 1) {
    if (panel[index] === "{") depth += 1;
    if (panel[index] === "}") depth -= 1;
    if (depth === 0) return panel.slice(start, index + 1);
  }
  throw new Error(`unterminated function ${name}`);
}

function loadScope() {
  const normalize = (value) => String(value || "").replace(/\\/g, "/").replace(/^\.\//, "").toLowerCase();
  const sandbox = {
    asArray: (value) => Array.isArray(value) ? value : [],
    normalizePlanSelectionKey: normalize,
    taskPlanFile: (row) => String((row || {}).planFile || (row || {}).plan || ""),
    samePlanSelection(left, right) {
      const a = normalize(left);
      const b = normalize(right);
      return Boolean(a && b && (a === b || a.split("/").pop() === b.split("/").pop()));
    },
    taskMatchesPlanVersion(row, planRevision, planUpdatedAt) {
      const revision = String((row || {}).planRevision || "");
      if (planRevision && revision) return revision === planRevision;
      if (Number.isFinite(planUpdatedAt)) {
        const taskAt = Date.parse(String((row || {}).updatedAt || (row || {}).startedAt || ""));
        return Number.isFinite(taskAt) && taskAt >= planUpdatedAt;
      }
      return !planRevision;
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(`${extractFunction("taskRowsForPlanScope")}\nthis.scope = taskRowsForPlanScope;`, sandbox);
  return sandbox.scope;
}

function loadCompletion() {
  const normalize = (value) => String(value || "").replace(/\\/g, "/").replace(/^\.\//, "").toLowerCase();
  const sandbox = {
    ...taskStatusSets(),
    asArray: (value) => Array.isArray(value) ? value : [],
    samePlanSelection(left, right) {
      const a = normalize(left);
      const b = normalize(right);
      return Boolean(a && b && (a === b || a.split("/").pop() === b.split("/").pop()));
    },
    debugRunRecord(row) { return row && row.debugMode === true; },
  };
  vm.createContext(sandbox);
  vm.runInContext(`${extractFunction("taskStatusToken")}\n${extractFunction("taskFailureLikeStatus")}\n${extractFunction("taskTerminalStatus")}\n${extractFunction("taskPlanResultCount")}\n${extractFunction("taskPlanCompletionState")}\nthis.completion = taskPlanCompletionState;`, sandbox);
  return sandbox.completion;
}

function loadTaskStatus() {
  const sandbox = taskStatusSets();
  vm.createContext(sandbox);
  vm.runInContext([
    extractFunction("taskStatusToken"),
    extractFunction("taskStatusLabel"),
    extractFunction("taskFailureLikeStatus"),
    extractFunction("taskTerminalStatus"),
    extractFunction("taskArchivableStatus"),
    extractFunction("taskCardClass"),
    extractFunction("statusClass"),
    "this.api = { taskStatusToken, taskStatusLabel, taskFailureLikeStatus, taskTerminalStatus, taskArchivableStatus, taskCardClass, statusClass };",
  ].join("\n"), sandbox);
  return sandbox.api;
}

function loadFailureLogTarget() {
  const sandbox = {
    asArray: (value) => Array.isArray(value) ? value : [],
    taskFailureLikeStatus: (status) => ["failed", "error", "stalled", "stopped", "cancelled", "canceled"].includes(String(status || "")),
    taskLogActionKey: (row) => String((row || {}).logKey || ""),
    resolveWorkerId: (value) => value ? "worker:" + value : "",
  };
  vm.createContext(sandbox);
  vm.runInContext(`${extractFunction("taskFailureLogTarget")}
this.target = taskFailureLogTarget;`, sandbox);
  return (scope) => {
    const result = sandbox.target(scope);
    return result ? JSON.parse(JSON.stringify(result)) : undefined;
  };
}

function loadDebugLogTarget() {
  const sandbox = {
    asArray: (value) => Array.isArray(value) ? value : [],
    debugRunRecord: (row) => row && row.debugMode === true,
    taskLogActionKey: (row) => String((row || {}).logKey || ""),
    resolveWorkerId: (value) => value ? "worker:" + value : "",
  };
  vm.createContext(sandbox);
  vm.runInContext(`${extractFunction("taskDebugLogTarget")}
this.target = taskDebugLogTarget;`, sandbox);
  return (scope) => {
    const result = sandbox.target(scope);
    return result ? JSON.parse(JSON.stringify(result)) : undefined;
  };
}

test("task monitoring defaults to the selected Plan revision without deleting access to other tasks", () => {
  const scope = loadScope();
  const rows = [
    { id: "a", planFile: "experiments/plans/a.yaml", planRevision: "rev2" },
    { id: "b", planFile: "experiments/plans/b.yaml" },
    { id: "a2", planFile: "plans/a.yaml", planRevision: "rev2" },
    { id: "old", planFile: "experiments/plans/a.yaml", planRevision: "rev1" },
  ];
  const selected = JSON.parse(JSON.stringify(scope(rows, "experiments/plans/a.yaml", "selected", { revision: "rev2" })));
  assert.equal(selected.scoped, true);
  assert.deepEqual(selected.rows.map((row) => row.id), ["a", "a2"]);
  assert.equal(selected.selectedCount, 2);
  assert.equal(selected.selectedPlanRevision, "rev2");
  assert.equal(selected.totalCount, 4);
  const all = JSON.parse(JSON.stringify(scope(rows, "experiments/plans/a.yaml", "all", { revision: "rev2" })));
  assert.equal(all.scoped, false);
  assert.equal(all.rows.length, 4);
  const unselected = JSON.parse(JSON.stringify(scope(rows, "", "selected")));
  assert.equal(unselected.scoped, false);
  assert.equal(unselected.rows.length, 4);
  const planUpdatedAt = "2026-07-20T01:00:00.000Z";
  const legacyRows = [
    { id: "before", planFile: "experiments/plans/a.yaml", updatedAt: "2026-07-20T00:59:59.000Z" },
    { id: "after", planFile: "experiments/plans/a.yaml", updatedAt: "2026-07-20T01:00:01.000Z" },
  ];
  assert.deepEqual(Array.from(scope(legacyRows, "experiments/plans/a.yaml", "selected", { revision: "rev3", updatedAt: planUpdatedAt }).rows, (row) => row.id), ["after"]);
});

test("task UI exposes an explicit current-Plan/all-task switch and resets scope after submission", () => {
  assert.match(panel, /let taskPlanScope = normalizePlanViewScope\(restoredWebviewState\.taskPlanScope\)/);
  assert.match(panel, /persistWebviewState\(\{ taskPlanScope \}\)/);
  assert.match(panel, /data-task-plan-scope="selected"[\s\S]{0,240}当前版本/);
  assert.match(panel, /data-task-plan-scope="all"[\s\S]{0,240}全部任务/);
  assert.match(panel, /当前 Plan 暂无任务，等待提交或调度状态回传/);
  assert.match(panel, /setTaskPlanScope\(String\(data\.command \|\| ""\) === "runAllPlans" \? "all" : "selected"\)/);
  assert.match(panel, /stableSectionJson\(\{ expandedTaskLogs, taskPlanScope \}\)/);
  assert.match(panel, /event\.target\.closest\("button\[data-task-plan-scope\]"\)/);
  assert.match(panel, /handleTaskPlanScopeClick\(taskPlanScopeTarget\)/);
  assert.match(panel, /input\.matches\('input\[type="checkbox"\]\[data-command="selectExperiment"\]'\)/);
  assert.match(panel, /handleTaskSelectionChange\(input\)/);
  assert.doesNotMatch(panel, /boundSelectExperiment|bindTaskSelectionControls|bindTaskPlanScopeControls/);
  assert.match(panel, /const parentPlanRevision = row\.planRevision \|\| row\.plan_revision/);
  assert.match(panel, /status: childRecord\.status \|\| childRecord\.state \|\| bucketStatus\(key\)/);
  assert.match(panel, /planRevision: pick\(row, \["planRevision", "plan_revision"\]/);
  assert.match(panel, /taskRowsForPlanScope\(allRows, selectedPlanFile, taskPlanScope, selectedPlan\)/);
});

test("current Plan terminal tasks lead to results or explicit failure recovery", () => {
  const completion = loadCompletion();
  const planFile = "experiments/plans/smoke.yaml";
  const scope = (rows) => ({ scoped: true, selectedPlanFile: planFile, rows });
  assert.equal(completion({}, scope([{ status: "running" }])), undefined);
  const waiting = JSON.parse(JSON.stringify(completion({}, scope([{ status: "completed" }]))));
  assert.equal(waiting.kind, "waiting");
  assert.match(waiting.message, /等待自动检查输出并解析结果/);
  const review = JSON.parse(JSON.stringify(completion({}, scope([{ status: "failed" }, { status: "completed" }]))));
  assert.equal(review.kind, "review");
  assert.match(review.message, /1 个失败、停止或取消/);
  for (const status of ["error", "stalled", "stopped", "cancelled", "canceled"]) {
    const variant = JSON.parse(JSON.stringify(completion({}, scope([{ status }]))));
    assert.equal(variant.kind, "review", `${status} must be terminal and recoverable`);
  }
  const results = JSON.parse(JSON.stringify(completion({ resultsSummary: { planFile, results: [{ planFile }, { provenance: { planFile } }] } }, scope([{ status: "completed" }]))));
  assert.equal(results.kind, "results");
  assert.match(results.message, /已解析 2 条结果/);
  assert.equal(completion({ resultsSummary: { planFile: "other.yaml", results: [{ planFile: "other.yaml" }] } }, scope([{ status: "completed" }])).kind, "waiting");
  const debugReview = JSON.parse(JSON.stringify(completion({ resultsSummary: { planFile, results: [{ planFile }] } }, scope([{ status: "completed", debugMode: true }]))));
  assert.equal(debugReview.kind, "debug-review");
  assert.match(debugReview.message, /复核日志和输出/);
  const debugFailed = JSON.parse(JSON.stringify(completion({}, scope([{ status: "failed", debugMode: true }]))));
  assert.equal(debugFailed.kind, "review");
  assert.match(debugFailed.message, /Debug 任务已结束/);
  const mixedFormal = JSON.parse(JSON.stringify(completion({}, scope([{ status: "completed", debugMode: true }, { status: "completed" }]))));
  assert.equal(mixedFormal.kind, "waiting");
  assert.match(panel, /data\.workerTelemetry, data\.resultsSummary/);
});

test("successful Debug completion opens log review and explicit formal run", () => {
  const target = loadDebugLogTarget();
  assert.deepEqual(target({ rows: [{ status: "completed", debugMode: true, logKey: "debug/run", serverId: "worker-a" }] }), {
    runKey: "debug/run",
    workerId: "worker:worker-a",
  });
  assert.deepEqual(target({ rows: [{ status: "completed", debugMode: true }] }), { manualReview: true });
  assert.equal(target({ rows: [{ status: "completed" }] }), undefined);
  const source = extractFunction("renderTaskPlanCompletionNext");
  assert.match(source, /打开 Debug 日志/);
  assert.match(source, /data-debug-mode="false" data-force-formal="true"/);
  assert.match(source, />正式运行<\/button>/);
  assert.ok(source.indexOf('outcome.kind === "debug-review"') < source.indexOf('outcome.kind === "review"'));
});

test("failed current-Plan tasks expose a direct log target without auto retry", () => {
  const target = loadFailureLogTarget();
  assert.deepEqual(target({ rows: [{ status: "completed" }, { status: "failed", logKey: "run/failure", serverId: "worker-a" }] }), {
    runKey: "run/failure",
    workerId: "worker:worker-a",
  });
  assert.deepEqual(target({ rows: [{ status: "failed" }, { status: "stopped", logKey: "run/stopped", serverId: "worker-b" }] }), {
    runKey: "run/stopped",
    workerId: "worker:worker-b",
  });
  assert.deepEqual(target({ rows: [{ status: "cancelled" }] }), { manualReview: true });
  assert.equal(target({ rows: [{ status: "completed" }] }), undefined);
  const recoverySource = extractFunction("renderTaskPlanCompletionNext");
  assert.match(recoverySource, /打开失败日志/);
  assert.match(recoverySource, /任务缺少可定位日志标识，请从任务卡检查 Worker、runKey 和日志路径/);
  assert.doesNotMatch(recoverySource, /retryExperiment/);
});

test("task UI treats all scheduler failure terminals as visible retryable failures", () => {
  const status = loadTaskStatus();
  assert.match(panel, /const TASK_FAILURE_STATUSES = new Set\(\["failed", "error", "stalled", "stopped", "cancelled"\]\)/);
  assert.match(panel, /const TASK_TERMINAL_STATUSES = new Set\(\["completed", "done", "archived", "deleted"\]\)/);
  assert.match(panel, /const TASK_ARCHIVABLE_STATUSES = new Set\(\["completed", "done"\]\)/);
  assert.match(panel, /TASK_FAILURE_STATUSES\.has\(taskStatusToken\(status\)\)/);
  assert.match(panel, /TASK_TERMINAL_STATUSES\.has\(value\)/);
  assert.match(panel, /TASK_ARCHIVABLE_STATUSES\.has\(value\)/);
  assert.equal(status.taskStatusLabel("queued"), "排队中");
  assert.equal(status.taskStatusLabel("normal_completed"), "已完成");
  assert.equal(status.taskStatusLabel("manual_interrupted_completed"), "已停止");
  assert.equal(status.taskStatusLabel("failed"), "失败");
  assert.equal(status.taskStatusLabel("unknown_custom_status"), "unknown_custom_status");
  assert.equal(status.taskStatusToken("canceled"), "cancelled");
  for (const value of ["failed", "error", "stalled", "stopped", "cancelled", "canceled", "manual_interrupted_completed"]) {
    assert.equal(status.taskFailureLikeStatus(value), true, value);
    assert.equal(status.taskTerminalStatus(value), true, value);
    assert.equal(status.taskArchivableStatus(value), true, value);
    assert.equal(status.statusClass(value), "status-failed", value);
  }
  assert.equal(status.taskStatusToken("normal_completed"), "completed");
  assert.equal(status.taskTerminalStatus("normal_completed"), true);
  assert.equal(status.taskCardClass("cancelled"), "is-stopped");
  assert.equal(status.taskCardClass("canceled"), "is-stopped");
  assert.equal(status.taskCardClass("stalled"), "is-failed");
  assert.ok([...panel.matchAll(/\["重试", "retryExperiment", taskFailureLikeStatus\(row\.status\), true\]/g)].length >= 3);
  assert.ok([...panel.matchAll(/\["归档", "archiveArtifacts", taskArchivableStatus\(row\.status\), true\]/g)].length >= 3);
  assert.match(panel, /function taskStatusLabel\(status\)/);
  assert.match(panel, /原始状态：/);
});
