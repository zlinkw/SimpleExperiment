const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const panel = require("../../dist/ui/PanelHtml.js").renderPanelHtml();

function extractFunction(name) {
  const start = panel.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing ${name}`);
  const body = panel.indexOf("{", start);
  let depth = 0;
  for (let index = body; index < panel.length; index += 1) {
    if (panel[index] === "{") depth += 1;
    if (panel[index] === "}") depth -= 1;
    if (depth === 0) return panel.slice(start, index + 1);
  }
  throw new Error(`unterminated ${name}`);
}

function loadTaskStats() {
  const sandbox = {
    overviewTaskStatsCacheRows: null,
    overviewTaskStatsCacheNativePlans: null,
    overviewTaskStatsCacheValue: null,
    schedulerRowsForState(state) { return state.rows; },
    taskFailureLikeStatus(status) { return new Set(["failed", "error", "stalled", "stopped", "cancelled"]).has(status); },
  };
  vm.createContext(sandbox);
  vm.runInContext(`${extractFunction("normalizePlanSelectionKey")}\n${extractFunction("executionPlanGroupKey")}\n${extractFunction("overviewTaskStats")}\nthis.check = overviewTaskStats;`, sandbox);
  return sandbox;
}

function trackedRows(statuses, counter, verified = true) {
  return {
    forEach(callback) {
      counter.count += 1;
      statuses.forEach((status) => callback({ status, completionState: verified ? "verified" : "unknown" }));
    },
  };
}

test("overview task statistics reuse stable scheduler rows and preserve status groups", () => {
  const sandbox = loadTaskStats();
  const scans = { count: 0 };
  const rows = trackedRows([
    "RUNNING", "testing", "queued", "pending", "failed", "error", "stalled",
    "stopped", "cancelled", "completed", "done", "unknown",
  ], scans);
  const state = { rows };
  const first = sandbox.check(state);

  assert.strictEqual(sandbox.check(state), first);
  assert.deepEqual(JSON.parse(JSON.stringify(first)), { running: 2, queued: 2, failed: 5, completed: 2 });
  assert.equal(scans.count, 1);

  state.rows = trackedRows(["running", "completed"], scans);
  const refreshed = sandbox.check(state);
  assert.notStrictEqual(refreshed, first);
  assert.deepEqual(JSON.parse(JSON.stringify(refreshed)), { running: 1, queued: 0, failed: 0, completed: 1 });
  assert.equal(scans.count, 2);
  state.rows = trackedRows(["completed", "done"], scans, false);
  assert.equal(sandbox.check(state).completed, 0, "unverified historical completion cannot count as confirmed success");
});

test("Plan run workbench consumes the shared task statistics", () => {
  const source = extractFunction("renderPlanRunWorkbench");
  assert.match(source, /const taskStats = overviewTaskStats\(state\)/);
  assert.match(source, /const running = taskStats\.running/);
  assert.match(source, /const queued = taskStats\.queued/);
  assert.match(source, /const failed = taskStats\.failed/);
  assert.doesNotMatch(source, /rows\.filter\(/);
  assert.doesNotMatch(source, /const rows = schedulerRowsForState\(state\)/);
});

test("overview includes current native logical jobs once and reacts to a changed native snapshot", () => {
  const sandbox = loadTaskStats();
  const planFile = "experiments/plans/native.yaml";
  const job = (index, status, completionState) => ({ index, case: "case" + index, seed: 42, outputDir: "work/job" + index, status, completionState });
  const common = { projectId: "project", planFile, revision: "rev", fullPlanJobCount: 3 };
  const state = { rows: [
    { planFile: "./EXPERIMENTS\\plans\\native.yaml", status: "running" },
    { plan: "experiments/plans/legacy.yaml", status: "failed" },
  ], distributedPlans: [
    { ...common, id: "first", enqueuedAt: "2026-11-01T01:00:00Z", planJobCount: 2, jobs: [job(0, "completed", "verified"), job(1, "running")] },
    { ...common, id: "recovery", enqueuedAt: "2026-11-01T02:00:00Z", planJobCount: 1, jobs: [job(2, "pending")] },
  ] };
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.check(state))), { running: 1, queued: 1, failed: 1, completed: 1 });
  state.distributedPlans = [{ ...common, id: "current", enqueuedAt: "2026-11-01T03:00:00Z", planJobCount: 3,
    jobs: [job(0, "completed", "unknown"), job(1, "completed", "review_required"), job(2, "queued")] }];
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.check(state))), { running: 0, queued: 1, failed: 1, completed: 0 });
  state.distributedPlans = [];
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.check(state))), { running: 1, queued: 0, failed: 1, completed: 0 });
});
