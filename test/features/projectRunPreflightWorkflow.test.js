const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

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

function loadPlanExecutionStage() {
  const names = ["planExecutionStage", "taskMatchesPlanVersion", "terminalPlanTaskExecutionStage", "debugRunRecord", "planVersionOperationRows", "operationMatchesPlanVersion", "operationAtOrAfter", "operationSucceeded", "operationPending", "operationIsActive", "operationIsFailureLike", "taskStatusToken", "taskFailureLikeStatus", "taskTerminalStatus"];
  const sandbox = {
    planFromContext: (state) => state.plan || {},
    operationRowsForState: (state) => state.operations || [],
    schedulerRowsForState: (state) => state.tasks || [],
    samePlanSelection: (left, right) => String(left || "") === String(right || ""),
  };
  vm.createContext(sandbox);
  vm.runInContext(names.map((name) => extractFunction(panel, name)).join("\n") + "\nthis.result = planExecutionStage;", sandbox);
  return sandbox.result;
}

test("project next action follows the real preflight order", () => {
  const extension = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");
  assert.match(panel, /function projectEndpointReadiness\(state\)/);
  assert.match(panel, /function projectCodeSyncReadiness\(state\)/);
  assert.match(panel, /检测 Xshell 隧道与 Hub\/Worker Agent[\s\S]{0,120}"testAll"/);
  assert.match(extension, /await this\.ensureHubCodeReadyForPlanCheck\(\)/);
  assert.match(extension, /await this\.ensureCodeReadyForRun\(\)/);
  assert.match(panel, /return renderPlanExecutionNextAction\(state, planFile\)/);
  assert.match(panel, /projectQuickRow\("连接"/);
  assert.match(panel, /projectQuickRow\("代码同步"/);
  assert.match(panel, /可开始校验；正式运行会自动同步全部代码/);
  const preflightStart = extension.indexOf("async runPlanPreflight(body, label)");
  const preflightEnd = extension.indexOf("async openSetupGuide()", preflightStart);
  assert.ok(preflightStart >= 0 && preflightEnd > preflightStart);
  const preflight = extension.slice(preflightStart, preflightEnd);
  assert.ok(preflight.indexOf('postTunnelAction("validate-plan"') < preflight.indexOf('postTunnelAction("dry-run-plan"'));
  assert.match(preflight, /waitForOperationTerminalResult\("validate-plan"/);
  assert.match(preflight, /waitForOperationTerminalResult\("dry-run-plan"/);
  assert.match(extension, /if \(!await this\.runPlanPreflight\(body, "当前计划"\)\)\s*return;/);
  assert.match(extension, /if \(!await this\.runPlanPreflight\(body, `计划 \$\{planFile\}`\)\)\s*throw new Error\(`计划 \$\{planFile\} 的校验或预演未返回有效结果，已停止整批提交。`\);/);
  assert.match(extension, /已完成逐计划校验与预演，并提交/);
});

test("Hub-only projects do not require a Worker sync status", () => {
  assert.match(panel, /const workerRequired = asArray\(setup\.workerTunnels\)\.some/);
  assert.match(panel, /const workerReady = !workerRequired \|\| syncStatusOk\(sync\.workers\)/);
  assert.match(panel, /ready: hubReady && workerReady && fingerprintReady/);
});

test("Agent version mismatch leads to deploy then restart guidance", () => {
  const extension = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");
  assert.match(panel, /versionMismatch = hubStatus === "agent_version_mismatch"/);
  assert.match(panel, /Agent 版本与插件不兼容；部署后需重启 Xshell 会话[\s\S]{0,140}"deployLatestAgent"/);
  assert.match(panel, /最新版 Agent 已部署；请重启 Hub\/Worker Xshell 会话后检测[\s\S]{0,140}"startAllConnections"/);
  assert.match(panel, /Agent 已部署，需重启会话并检测/);
  assert.match(extension, /state: "agent_restart_required"/);
  assert.match(extension, /this\.lastProbe = undefined;\s*this\.lastWorkerProbes = \{\};/);
  assert.match(extension, /最新版 Agent runtime 已部署到全部服务器。请重启 Hub\/Worker Xshell 会话/);
});

test("Plan next action starts with one-click run and preserves manual recovery stages", () => {
  assert.match(panel, /function planExecutionStage\(state, planFile\)/);
  assert.match(panel, /function planPreflightSummary\(state, planFile\)/);
  assert.match(panel, /dispatchableCount: pick\(row/);
  assert.match(panel, /\["校验预演", Boolean\(\(preflight \|\| \{\}\)\.ready\)/);
  assert.doesNotMatch(panel, /\["操作终态", true/);
  assert.match(panel, /准备就绪；确认后自动同步、校验、预演并提交/);
  assert.match(panel, /label: "校验并提交运行"/);
  assert.match(panel, /校验已通过，预演调度与任务展开结果/);
  assert.match(panel, /预演已通过，可以提交正式运行/);
  assert.match(panel, /计划已提交，查看排队、运行与失败任务/);
  assert.match(panel, /command: "validatePlan"/);
  assert.match(panel, /command: "dryRunPlan"/);
  assert.match(panel, /command: "runPlan"/);
  assert.match(panel, /section: "tasks"/);
  assert.match(panel, /planFile: pick\(row, \["planFile", "plan_file", "plan"\]/);
  assert.match(panel, /data\.codeSync, data\.operations, data\.resultsSummary, data\.schedulerStates, data\.capabilities/);
});

test("submitted Plan runs navigate directly to the task list", () => {
  assert.match(panel, /function submittedCommandTarget\(command, status\)/);
  assert.match(panel, /\["runPlan", "reproducePlan", "runAllPlans"\]/);
  assert.match(panel, /return \{ section: "tasks", anchor: "tasks-list" \}/);
  assert.match(panel, /submittedTarget = submittedCommandTarget\(data\.command, data\.status\)/);
  assert.match(panel, /navigateToResourceTarget\(submittedTarget\.section, submittedTarget\.anchor, \{ force: true \}\)/);
  assert.match(panel, /navigateToResourceTarget\(treeTarget\.dataset\.sectionTarget, treeTarget\.dataset\.anchorTarget\)/);
});

test("editing a Plan invalidates older validation and dry-run operations", () => {
  const extension = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");
  assert.match(panel, /function operationMatchesPlanVersion\(row, planRevision, planUpdatedAt\)/);
  assert.match(panel, /rowRevision = String\(\(row \|\| \{\}\)\.planRevision \|\|/);
  assert.match(panel, /operationAt >= planUpdatedAt/);
  assert.match(extension, /revision: sha256Text\(String\(text \|\| ""\)\)/);
  assert.match(extension, /this\.stampPlanRevision\(body\)/);
  assert.match(extension, /planRevision = String\(body\.planRevision/);
});

test("Plan execution stage uses scoped terminal operations", () => {
  const stage = loadPlanExecutionStage();
  const planFile = "experiments/plans/smoke.yaml";
  const plan = { revision: "rev1", updatedAt: "2026-07-16T02:00:00.000Z" };
  const op = (type, status, updatedAt, planRevision = "rev1") => ({ type, status, updatedAt, planFile, planRevision });

  const fresh = stage({ plan, operations: [] }, planFile);
  assert.equal(fresh.phase, "ready");
  assert.equal(fresh.command, "runPlan");
  assert.equal(stage({ plan, operations: [op("validate-plan", "accepted", "2026-07-16T02:01:00.000Z")] }, planFile).phase, "validating");
  assert.equal(stage({ plan, operations: [op("validate-plan", "completed_with_errors", "2026-07-16T02:01:00.000Z")] }, planFile).phase, "validate");
  assert.equal(stage({ plan, operations: [op("validate-plan", "completed", "2026-07-16T02:01:00.000Z")] }, planFile).phase, "dry-run");
  assert.equal(stage({ plan, operations: [
    op("dry-run-plan", "completed", "2026-07-16T02:02:00.000Z"),
    op("validate-plan", "completed", "2026-07-16T02:01:00.000Z"),
  ] }, planFile).phase, "run");
  assert.equal(stage({ plan, operations: [
    op("run-plan", "completed", "2026-07-16T02:03:00.000Z"),
    op("dry-run-plan", "completed", "2026-07-16T02:02:00.000Z"),
    op("validate-plan", "completed", "2026-07-16T02:01:00.000Z"),
  ] }, planFile).phase, "monitor");
  assert.equal(stage({ plan, operations: [op("validate-plan", "completed", "2026-07-16T02:01:00.000Z", "old-revision")] }, planFile).phase, "ready");
  assert.equal(stage({ plan, operations: [{ ...op("validate-plan", "completed", "2026-07-16T02:01:00.000Z"), planFile: "other.yaml" }] }, planFile).phase, "ready");
});

test("Plan execution stage recovers from terminal scheduler tasks when operations are absent", () => {
  const stage = loadPlanExecutionStage();
  const planFile = "experiments/plans/smoke.yaml";
  const plan = { revision: "rev1", updatedAt: "2026-07-16T02:00:00.000Z" };
  const task = { planFile, planRevision: "rev1", status: "normal_completed", updatedAt: "2026-07-16T02:05:00.000Z" };
  assert.equal(stage({ plan, operations: [], tasks: [task] }, planFile).phase, "results");
  assert.equal(stage({ plan, operations: [], tasks: [{ ...task, status: "manual_interrupted_completed" }] }, planFile).phase, "review");
  assert.equal(stage({ plan, operations: [], tasks: [{ ...task, status: "running" }] }, planFile).phase, "ready");
  assert.equal(stage({ plan, operations: [], tasks: [{ ...task, planRevision: "old" }] }, planFile).phase, "ready");
  assert.equal(stage({ plan, operations: [], tasks: [{ ...task, planFile: "other.yaml" }] }, planFile).phase, "ready");
});

test("Plan next action advances from validation to dry-run, run, and monitoring", () => {
  assert.match(panel, /function planExecutionStage\(state, planFile\)/);
  assert.match(panel, /运行门禁已通过，先校验当前计划/);
  assert.match(panel, /校验已通过，预演调度与任务展开结果/);
  assert.match(panel, /预演已通过，可以提交正式运行/);
  assert.match(panel, /计划已提交，查看排队、运行与失败任务/);
  assert.match(panel, /command: "validatePlan"/);
  assert.match(panel, /command: "dryRunPlan"/);
  assert.match(panel, /command: "runPlan"/);
  assert.match(panel, /section: "tasks"/);
  assert.match(panel, /planFile: pick\(row, \["planFile", "plan_file", "plan"\]/);
});

test("editing a Plan invalidates older validation and dry-run operations", () => {
  const extension = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");
  assert.match(panel, /function operationNotOlderThanPlan\(row, planUpdatedAt\)/);
  assert.match(panel, /operationAt >= planUpdatedAt/);
  assert.match(extension, /updatedAt: stat\?\.mtime\?\.toISOString\?\.\(\)/);
  assert.match(extension, /updatedAt: stat\.mtime\?\.toISOString\?\.\(\)/);
});
