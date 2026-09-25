const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const planner = require("../../dist/features/PlanStopClear.js");
const extension = fs.readFileSync(path.join(__dirname, "../../src/extension/legacy.ts"), "utf8");
const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.legacy.ts"), "utf8");

test("cleanup targets include failed and finished plan rows and keep unrelated plans", () => {
  const targets = planner.planCleanupTargets({
    running: { type: "run-plan", operationId: "op-run", planFile: "plans/dpl.yaml", status: "running", schedulerOwnerWorkerId: "w1", tmuxSession: "zlk-sch-op-run" },
    failed: { type: "run-plan", operationId: "op-fail", planFile: "./plans/dpl.yaml", status: "failed", tmuxSession: "zlk-sch-op-fail", tmuxTarget: "zlk-sch-op-fail:3" },
    other: { type: "run-plan", operationId: "op-other", planFile: "plans/other.yaml", status: "failed" },
    sameName: { type: "run-plan", operationId: "op-same", planFile: "other/dpl.yaml", status: "failed" },
    parse: { type: "parse-results", operationId: "op-parse", planFile: "plans/dpl.yaml", status: "failed" },
  }, "plans/dpl.yaml", (row) => ["failed", "completed", "cancelled"].includes(String(row.status)));
  assert.deepEqual(targets.map((item) => item.operationId), ["op-run", "op-fail"]);
  assert.equal(targets[0].active, true);
  assert.equal(targets[1].active, false);
  assert.equal(targets[0].tmuxTarget, "");
  assert.equal(targets[1].tmuxTarget, "zlk-sch-op-fail:3");
  assert.match(planner.planStopClearPreview("plans/dpl.yaml", targets), /两次|再次/);
  assert.doesNotMatch(planner.planStopClearPreview("plans/dpl.yaml", targets), /op-same/);
});

test("one-click stop and clear keeps the hide-only control and requires two confirms", () => {
  assert.match(panel, /data-command="stopAndClearPlan"/);
  assert.match(panel, /一键中止并清除 Plan/);
  assert.match(panel, /清理选中记录/);
  assert.match(panel, /data-command="stopExperiment"/);
  const handler = extension.slice(extension.indexOf("async stopAndClearPlanFromUi("), extension.indexOf("async downloadDebugBundle("));
  assert.match(handler, /planCleanupTargets/);
  assert.match(handler, /继续中止并清除/);
  assert.match(handler, /确认中止并清除/);
  const first = handler.indexOf("继续中止并清除");
  const second = handler.indexOf("确认中止并清除");
  const stop = handler.indexOf("stopExperimentRouted");
  const hide = handler.indexOf("executionHistoryHiddenOperationIds");
  assert.ok(first > 0 && second > first && stop > second && hide > stop);
  assert.match(handler, /buildPlanRuntimeEvidenceState/);
  assert.match(handler, /performKillTmuxWindow/);
  assert.ok(handler.indexOf("performKillTmuxWindow") < handler.indexOf("executionHistoryHiddenOperationIds"));
  assert.match(handler, /tmux 仅有会话名/);
  assert.doesNotMatch(handler, /enabledWorkerConfigs\(\)\[0\]/);
  const kill = extension.slice(extension.indexOf("async killTmuxWindowFromUi("), extension.indexOf("async openTensorBoardUrlFromUi("));
  assert.doesNotMatch(kill, /message\?\.confirmed === true/);
  assert.match(kill, /非 Agent session:index，拒绝只用会话名定位/);
});
