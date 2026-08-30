const assert = require("node:assert/strict");
const test = require("node:test");

const {
  isLongRunningPlanOperation,
  reconcileRunOperation,
  runOperationMatchesTarget,
} = require("../../dist/features/RunOperations");

const running = {
  operationId: "run-plan-old",
  type: "run-plan",
  status: "running",
  planFile: "experiments/plans/demo.yaml",
  startedAt: "2026-01-01T00:00:00.000Z",
};

test("long-running plan operations include run and reproduce but exclude terminal records", () => {
  assert.equal(isLongRunningPlanOperation(running), true);
  assert.equal(isLongRunningPlanOperation({ ...running, type: "reproduce-plan" }), true);
  assert.equal(isLongRunningPlanOperation({ ...running, status: "completed" }), false);
});

test("orphan local runs become stale after the bounded reconciliation grace", () => {
  const evidence = { pidAlive: false, tmuxSessionAlive: false, schedulerStatesCount: 0, experimentTracesCount: 0, liveLogCount: 0 };
  const fresh = reconcileRunOperation(running, evidence, "workflow.plan", Date.parse(running.startedAt) + 1000);
  assert.equal(fresh.terminal, false);
  assert.equal(fresh.patch.reconcileEvidenceActive, false);

  const stale = reconcileRunOperation(running, evidence, "activation", Date.parse(running.startedAt) + 91_000);
  assert.equal(stale.terminal, true);
  assert.equal(stale.patch.status, "stale");
  assert.match(stale.patch.reconcileReason, /no_remote_activity$/);
});

test("remote terminal or active evidence wins over the local pending record", () => {
  const terminal = reconcileRunOperation(running, {
    operation: { status: "failed", message: "remote stopped" },
    pidAlive: false,
  }, "activation", Date.now());
  assert.equal(terminal.terminal, true);
  assert.equal(terminal.patch.status, "failed");

  const active = reconcileRunOperation(running, {
    operation: { status: "running" },
    tmuxSessionAlive: true,
    liveLogCount: 4,
    liveLogUpdatedAt: new Date().toISOString(),
  }, "activation", Date.now());
  assert.equal(active.terminal, false);
  assert.equal(active.patch.status, "running");
  assert.equal(active.patch.reconcileEvidenceActive, true);
});

test("stop targets match plan, operation, run key, pid, or tmux identity", () => {
  assert.equal(runOperationMatchesTarget(running, { planFile: "experiments\\plans\\demo.yaml" }), true);
  assert.equal(runOperationMatchesTarget(running, { operationId: "run-plan-old" }), true);
  assert.equal(runOperationMatchesTarget(running, { runKey: "run-plan-old" }), true);
  assert.equal(runOperationMatchesTarget({ ...running, pid: 123 }, { pid: "123" }), true);
  assert.equal(runOperationMatchesTarget({ ...running, tmuxSession: "simple-scheduler" }, { tmuxSession: "simple-scheduler" }), true);
  assert.equal(runOperationMatchesTarget(running, { planFile: "other.yaml" }), false);
});

test("stop targets still match reconciled stale submissions", () => {
  const stale = { ...running, status: "stale" };
  assert.equal(isLongRunningPlanOperation(stale), false);
  assert.equal(runOperationMatchesTarget(stale, { planFile: running.planFile }), true);
  assert.equal(runOperationMatchesTarget(stale, { operationId: running.operationId }), true);
});

test("tmux-alive with real activity stays running (no false stale)", () => {
  const active = reconcileRunOperation(running, {
    tmuxSessionAlive: true,
    pidAlive: false,
    schedulerStatesCount: 0,
    liveLogCount: 4,
    liveLogUpdatedAt: new Date().toISOString(),
  }, "activation", Date.now());
  assert.equal(active.terminal, false);
  assert.equal(active.patch.status, "running");
});

test("pid-alive with no activity stays running (real process trusted)", () => {
  const active = reconcileRunOperation(running, {
    pidAlive: true,
    tmuxSessionAlive: false,
    schedulerStatesCount: 0,
    liveLogCount: 0,
    liveLogUpdatedAt: new Date().toISOString(),
  }, "activation", Date.now());
  assert.equal(active.terminal, false);
  assert.equal(active.patch.status, "running");
});

test("tmux-alive but no activity promotes to stale after the grace window", () => {
  // First reconcile seeds reconcileNoActivitySince=now; simulate a later reconcile
  // where no activity has been observed for longer than the grace period.
  const seeded = reconcileRunOperation(running, {
    tmuxSessionAlive: true,
    pidAlive: false,
    schedulerStatesCount: 0,
    liveLogCount: 0,
  }, "activation", Date.now());
  assert.equal(seeded.terminal, false);
  const noActivitySince = seeded.patch.reconcileNoActivitySince;
  assert.ok(noActivitySince);
  const stale = reconcileRunOperation({ ...running, reconcileNoActivitySince: noActivitySince }, {
    tmuxSessionAlive: true,
    pidAlive: false,
    schedulerStatesCount: 0,
    liveLogCount: 0,
  }, "activation", noActivitySince + 91_000);
  assert.equal(stale.terminal, true);
  assert.equal(stale.patch.status, "stale");
  assert.match(stale.patch.reconcileReason, /tmux_alive_no_activity$/);
});
