const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const extension = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");
const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing function ${name}`);
  const body = source.indexOf("{", start);
  let depth = 0;
  for (let index = body; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`unterminated function ${name}`);
}

function samePlanSelection(left, right) {
  const key = (value) => String(value || "").replace(/\\/g, "/").replace(/^\.\//, "").toLowerCase();
  const a = key(left);
  const b = key(right);
  return Boolean(a && b && (a === b || a.split("/").pop() === b.split("/").pop()));
}

function loadExtensionGuard() {
  const sandbox = {
    normalizePlanSelectionKey: (value) => String(value || "").replace(/\\/g, "/").replace(/^\.\//, ""),
    operationResultPlanFile: (row) => String((row || {}).planFile || (row || {}).plan || ""),
    samePlanSelection,
    operationStatusToken: (value) => String(value || "").trim().toLowerCase(),
    operationStatusOf: (row) => String((row || {}).status || (row || {}).state || (row || {}).type || ""),
    remoteResultOperationPayloads: (row) => [row || {}, (row || {}).payload || {}, (row || {}).latestEvent || {}, ((row || {}).latestEvent || {}).payload || {}],
    flattenPlanArchiveSchedulerRows: (rows) => Array.isArray(rows) ? rows.flatMap((row) => {
      const out = [];
      for (const [key, status] of [["running_experiments", "running"], ["testing_experiments", "testing"], ["queued_experiments", "queued"], ["pending_experiments", "pending"], ["completed_experiments", "completed"]]) {
        for (const child of Array.isArray((row || {})[key]) ? row[key] : []) out.push({ ...child, status, planFile: child.planFile || row.planFile });
      }
      return out.length ? out : [row];
    }) : [],
  };
  vm.createContext(sandbox);
  vm.runInContext(`${extractFunction(extension, "activePlanRunEvidence")}\nthis.guard = activePlanRunEvidence;`, sandbox);
  return sandbox.guard;
}

function loadPanelGuard() {
  const sandbox = {
    normalizePlanSelectionKey: (value) => String(value || "").replace(/\\/g, "/"),
    samePlanSelection,
    operationRowsForState: (state) => state.operations || [],
    schedulerRowsForState: (state) => state.schedulerStates || [],
  };
  vm.createContext(sandbox);
  vm.runInContext(`${extractFunction(panel, "planActiveRunEvidence")}\nthis.guard = planActiveRunEvidence;`, sandbox);
  return sandbox.guard;
}

test("backend blocks duplicate run operations and active scheduler tasks for the same Plan", () => {
  const guard = loadExtensionGuard();
  const planFile = "experiments/plans/smoke.yaml";
  const empty = guard({ operations: {} }, planFile);
  assert.equal(empty.active, false);
  assert.equal(empty.operationCount, 0);
  assert.equal(empty.taskCount, 0);
  const operation = guard({ operations: { op: { type: "run-plan", status: "accepted", planFile } } }, planFile);
  assert.equal(operation.active, true);
  assert.equal(operation.operationCount, 1);
  assert.equal(guard({ operations: { op: { type: "run-plan", status: "completed", planFile } } }, planFile).active, false);
  assert.equal(guard({ operations: { op: { type: "run-plan", status: "running", planFile, schedulerFinished: true } } }, planFile).active, false);
  assert.equal(guard({ operations: { op: { type: "run-plan", status: "running", planFile: "other.yaml" } } }, planFile).active, false);
  const task = guard({ schedulerStates: [{ planFile, running_experiments: [{ id: "job-1" }] }] }, planFile);
  assert.equal(task.active, true);
  assert.equal(task.taskCount, 1);
});

test("backend protects active old revisions without misclassifying them as current", () => {
  const guard = loadExtensionGuard();
  const planFile = "experiments/plans/smoke.yaml";
  const plan = { revision: "rev2", updatedAt: "2026-07-20T01:00:00.000Z" };
  const oldOperation = guard({ operations: { op: { type: "run-plan", status: "running", planFile, planRevision: "rev1", updatedAt: "2026-07-20T01:05:00.000Z" } } }, planFile, plan);
  assert.equal(oldOperation.active, true);
  assert.equal(oldOperation.historicalOnly, true);
  assert.equal(oldOperation.currentOperationCount, 0);
  assert.equal(oldOperation.historicalOperationCount, 1);

  const oldTask = guard({ schedulerStates: [{ planFile, running_experiments: [{ id: "job-old", planRevision: "rev1", updatedAt: "2026-07-20T01:05:00.000Z" }] }] }, planFile, plan);
  assert.equal(oldTask.active, true);
  assert.equal(oldTask.historicalOnly, true);
  assert.equal(oldTask.currentTaskCount, 0);

  const current = guard({ operations: { op: { type: "run-plan", status: "running", planFile, planRevision: "rev2" } } }, planFile, plan);
  assert.equal(current.active, true);
  assert.equal(current.historicalOnly, false);
  assert.equal(current.currentOperationCount, 1);
});

test("webview disables duplicate submission using the same Plan-scoped activity evidence", () => {
  const guard = loadPanelGuard();
  const planFile = "experiments/plans/smoke.yaml";
  assert.equal(guard({ operations: [{ type: "reproduce-plan", status: "submitted", planFile }] }, planFile).operationCount, 1);
  assert.equal(guard({ schedulerStates: [{ status: "queued", planFile }] }, planFile).taskCount, 1);
  assert.equal(guard({ operations: [{ type: "run-plan", status: "completed", planFile }] }, planFile).active, false);
  assert.match(panel, /当前 Plan 已有 [\s\S]{0,160}不能重复提交/);
  assert.match(extension, /assertPlanNotAlreadyActive[\s\S]{0,1000}已阻止重复提交/);
});

test("webview explains old revision activity and opens all tasks", () => {
  const guard = loadPanelGuard();
  const planFile = "experiments/plans/smoke.yaml";
  const plan = { revision: "rev2", updatedAt: "2026-07-20T01:00:00.000Z" };
  const activity = guard({ schedulerStates: [{ planFile, status: "running", planRevision: "rev1", updatedAt: "2026-07-20T01:05:00.000Z" }] }, planFile, plan);
  assert.equal(activity.active, true);
  assert.equal(activity.historicalOnly, true);
  assert.equal(activity.currentTaskCount, 0);
  assert.match(panel, /旧 revision 的/);
  assert.match(panel, /查看全部任务/);
  assert.match(panel, /taskPlanScope === "all"/);
  assert.match(extension, /旧 Plan revision 仍有/);
  assert.match(extension, /next === "查看全部任务"/);
});
