const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { spawnSync } = require("node:child_process");

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

test("missing local progress can be recovered from one trusted worker task", () => {
  const plan = "experiments/plans/comparison/drf.yaml";
  const recovered = planner.trustedRemotePlanOperations({
    tasks: [
      { kind: "scheduler", action: "run-plan", operationId: "op-drf", planFile: plan, status: "running", workerId: "nwpu3", pid: 42, tmuxSession: "zlk-sch-op-drf", startedAt: "2026-09-26T01:00:00Z" },
      { kind: "scheduler", action: "run-plan", operationId: "op-other", planFile: "experiments/plans/other.yaml", status: "running", workerId: "nwpu3" },
      { kind: "worker-task", action: "run-plan", operationId: "op-child", planFile: plan, status: "running", workerId: "nwpu3" },
      { kind: "scheduler", action: "run-plan", operationId: "op-foreign", planFile: plan, status: "running", workerId: "other-worker" },
    ],
  }, "nwpu3", plan);
  assert.deepEqual(recovered.map((item) => item.operationId), ["op-drf"]);
  const merged = planner.mergeTrustedPlanOperations({}, recovered);
  const targets = planner.planCleanupTargets(merged, plan, () => false);
  assert.deepEqual(targets.map((item) => item.operationId), ["op-drf"]);
  assert.equal(targets[0].workerId, "nwpu3");
  assert.equal(targets[0].active, true);
  assert.match(planner.planStopClearPreview(plan, targets), /op-drf/);
  assert.doesNotMatch(planner.planStopClearPreview(plan, targets), /op-other|op-foreign/);
  const missing = planner.planStopMissingEvidenceMessage(plan, { realtime: true, workersChecked: 1, failures: [] });
  assert.match(missing, /没有找到 experiments\/plans\/comparison\/drf\.yaml 的本机运行进度条目/);
  assert.match(missing, /未发送停止命令/);
  assert.match(missing, /刷新状态/);
});

test("scheduler identity conflicts are rejected without changing the trusted record", () => {
  const plan = "experiments/plans/comparison/drf.yaml";
  const missingKind = planner.trustedRemotePlanOperations({
    tasks: [{ action: "run-plan", operationId: "op-drf", planFile: plan, status: "failed", workerId: "nwpu3" }],
  }, "nwpu3", plan);
  assert.deepEqual(missingKind, []);
  const existing = {
    "op-drf": { operationId: "op-drf", type: "run-plan", status: "running", planFile: plan, schedulerOwnerWorkerId: "nwpu3", message: "keep" },
  };
  const remote = [{ operationId: "op-drf", planFile: plan, type: "run-plan", status: "failed", workerId: "other-worker", source: "worker-task" }];
  assert.equal(planner.planRecoveryConflicts(existing, remote)[0].reason, "worker");
  const merged = planner.mergeTrustedPlanOperations(existing, remote);
  assert.equal(merged["op-drf"].status, "running");
  assert.equal(merged["op-drf"].schedulerOwnerWorkerId, "nwpu3");
  assert.equal(merged["op-drf"].message, "keep");
  const otherPlan = [{ operationId: "op-drf", planFile: "experiments/plans/other.yaml", type: "run-plan", status: "cancelled", workerId: "nwpu3", source: "worker-task" }];
  assert.equal(planner.planRecoveryConflicts(existing, otherPlan)[0].reason, "plan");
  assert.equal(planner.mergeTrustedPlanOperations(existing, otherPlan)["op-drf"].status, "running");
  assert.match(planner.planStopIdentityConflictMessage(plan, [{ operationId: "op-drf", reason: "worker" }]), /未发送停止命令/);
});

test("one-click stop and clear keeps the hide-only control and requires two confirms", () => {
  assert.match(panel, /data-command="stopAndClearPlan"/);
  assert.match(panel, /一键中止并清除 Plan/);
  assert.match(panel, /清理选中记录/);
  assert.match(panel, /data-command="' \+ topStopCommand \+ '"/);
  const handler = extension.slice(extension.indexOf("workerSupportsExactPaneStop("), extension.indexOf("async downloadDebugBundle("));
  assert.match(handler, /planCleanupTargets/);
  assert.match(handler, /继续中止并清除/);
  assert.match(handler, /确认中止并清除/);
  const first = handler.indexOf("继续中止并清除");
  const second = handler.indexOf("确认中止并清除");
  const stop = handler.indexOf("stopExperimentRouted");
  const hide = handler.indexOf("executionHistoryHiddenOperationIds");
  assert.ok(first > 0 && second > first && stop > second && hide > stop);
  assert.match(handler, /recoverPlanOperationsForStopClear/);
  assert.match(handler, /planStopIdentityConflictMessage/);
  assert.match(handler, /planStopMissingEvidenceMessage/);
  const recover = extension.slice(extension.indexOf("async recoverPlanOperationsForStopClear("), extension.indexOf("async restoreRemotePlanOperations("));
  assert.match(recover, /planRecoveryConflicts/);
  assert.doesNotMatch(recover, /restorePlanOperationsFromWorkerTasks/);
  assert.match(handler, /buildPlanRuntimeEvidenceState/);
  assert.match(handler, /distributedStopTargets/);
  assert.match(handler, /removeConfirmedDistributedPlan/);
  assert.match(handler, /stopDistributedJobForClear/);
  assert.match(handler, /targetCommandId/);
  assert.match(handler, /distributedPlanStopEpoch/);
  assert.match(panel, /代码版本不匹配/);
  assert.match(panel, /空闲 GPU 不能运行这份旧代码/);
  assert.match(handler, /performKillTmuxWindow/);
  assert.ok(handler.indexOf("performKillTmuxWindow") < handler.indexOf("executionHistoryHiddenOperationIds"));
  assert.match(handler, /tmux 仅有会话名/);
  assert.doesNotMatch(handler, /enabledWorkerConfigs\(\)\[0\]/);
  const kill = extension.slice(extension.indexOf("async killTmuxWindowFromUi("), extension.indexOf("async openTensorBoardUrlFromUi("));
  assert.doesNotMatch(kill, /message\?\.confirmed === true/);
  assert.match(kill, /非 Agent session:index，拒绝只用会话名定位/);
  const stopper = extension.slice(extension.indexOf("async stopDistributedJobForClear("), extension.indexOf("async stopAndClearPlanFromUi("));
  assert.equal((stopper.match(/makeOpId\("stop-distributed-job"\)/g) || []).length, 1);
  assert.doesNotMatch(stopper, /commandId: job\.commandId/);
  assert.match(stopper, /stopIdentityMatchesJob/);
  assert.match(stopper, /paneClosed !== true/);
  assert.match(stopper, /快照不含该 job/);
});

test("queued-only plan clears without a worker stop and a mixed failure keeps the unconfirmed job", async () => {
  const queue = require("../../dist/features/DistributedPlanQueue.js");
  const marker = extension.indexOf("clearable = stoppedOrEnded.filter((target)");
  const start = extension.indexOf("const latest = await this.loadDistributedQueue(root);", marker);
  const end = extension.indexOf("if (confirmedJobs.size || confirmedDeferred.size)", start);
  const body = extension.slice(start, end)
    .replaceAll("this.loadDistributedQueue(root)", "loadDistributedQueue()")
    .replaceAll("this.client.getWorkerTasks", "getWorkerTasks")
    .replaceAll("this.stopDistributedJobForClear", "stopDistributedJobForClear")
    .replaceAll("this.refreshExactPaneStopCapability", "refreshExactPaneStopCapability")
    .replaceAll("DistributedPlanQueue.", "queueApi.")
    .replace(/:\s*any/g, "");
  let saved = null;
  const calls = [];
  const queued = queue.enqueuePlan(queue.enqueuePlan(queue.emptyDistributedQueue(), {
    planFile: "plans/ebmc.yaml", revision: "rev-ebmc", codeFingerprint: "old",
    jobs: [0, 1, 2].map((index) => ({ index, case: "bus", seed: index, outputDir: `work/ebmc/${index}` })),
  }, "plan-ebmc"), {
    planFile: "plans/keep.yaml", revision: "rev-keep", codeFingerprint: "new",
    jobs: [{ index: 0, case: "pad", seed: 9, outputDir: "work/keep/0" }],
  }, "plan-keep");
  queued.deferred = [{ id: "defer-ebmc", planFile: "plans/ebmc.yaml", revision: "rev-ebmc", codeFingerprint: "old", body: {}, enqueuedAt: "t", status: "processing" }];
  const allocated = queue.allocateAvailable(queue.enqueuePlan(queue.emptyDistributedQueue(), {
    planFile: "plans/mix.yaml", revision: "rev-mix", codeFingerprint: "new",
    jobs: [0, 1].map((index) => ({ index, case: "bus", seed: index, outputDir: `work/mix/${index}` })),
  }, "plan-mix"), [{ workerId: "w1", idleGpuIds: ["0"], online: true }]);
  const running = allocated.queue.plans[0].jobs.find((job) => job.status === "dispatching");
  running.status = "running";
  const sandbox = {
    planFile: "plans/ebmc.yaml",
    failures: [],
    confirmedJobs: new Set(),
    confirmedDeferred: new Set(),
    loadDistributedQueue: () => saved || queued,
    getWorkerTasks: async () => { throw new Error("queued plan must not query a worker"); },
    refreshExactPaneStopCapability: async () => { throw new Error("queued plan must not probe a worker"); },
    stopDistributedJobForClear: async () => { throw new Error("queued plan must not stop a worker"); },
    saveDistributedQueue: async (_root, next) => { saved = next; },
  };
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const run = new AsyncFunction("queueApi", "root", `const { failures, confirmedJobs, confirmedDeferred, loadDistributedQueue, getWorkerTasks, stopDistributedJobForClear, saveDistributedQueue, planFile } = this;\nconst errorMessage = (error) => String(error && error.message || error);\n${body}\nif (confirmedJobs.size || confirmedDeferred.size) {\n  const current = await loadDistributedQueue();\n  const next = queueApi.removeConfirmedDistributedPlan(current, planFile, { jobKeys: confirmedJobs, deferredIds: confirmedDeferred });\n  await saveDistributedQueue(root, next);\n}`);
  await run.call(sandbox, queue, "root");
  assert.equal(sandbox.failures.length, 0, sandbox.failures.join(";"));
  assert.equal(saved.plans.some((plan) => plan.id === "plan-ebmc"), false);
  assert.equal(saved.plans.find((plan) => plan.id === "plan-keep").jobs.length, 1);
  assert.deepEqual(saved.deferred, []);
  sandbox.planFile = "plans/mix.yaml";
  sandbox.failures = [];
  sandbox.confirmedJobs = new Set();
  saved = allocated.queue;
  sandbox.loadDistributedQueue = () => saved;
  sandbox.getWorkerTasks = async (workerId) => { calls.push(["tasks", workerId]); return { tasks: [{ commandId: running.commandId, status: "running", tmuxPane: "%9", workflowId: "plan-mix", planRevision: "rev-mix", planFile: "plans/mix.yaml", case: running.case, seed: running.seed, attempt: running.attempt, outputDir: running.outputDir, workerId: "w1", gpuId: "0" }] }; };
  sandbox.refreshExactPaneStopCapability = async () => false;
  sandbox.stopDistributedJobForClear = async () => { calls.push("stop"); throw new Error("旧 Agent 无精确 pane 能力"); };
  await run.call(sandbox, queue, "root");
  assert.equal(calls.includes("stop"), true);
  assert.equal(saved.plans[0].jobs.length, 1);
  assert.equal(saved.plans[0].jobs.some((job) => job.status === "running"), true);
  assert.match(sandbox.failures.join("\n"), /旧 Agent/);
  const finished = queue.enqueuePlan(queue.emptyDistributedQueue(), {
    planFile: "plans/done.yaml", revision: "rev-done", codeFingerprint: "new",
    jobs: [
      { index: 0, case: "bus", seed: 1, outputDir: "work/done/session" },
      { index: 1, case: "pad", seed: 2, outputDir: "work/done/clear" },
    ],
  }, "plan-done");
  const sessionJob = finished.plans[0].jobs[0];
  const clearJob = finished.plans[0].jobs[1];
  for (const job of [sessionJob, clearJob]) Object.assign(job, { status: "completed", workerId: "w1", gpuId: "0", commandId: "cmd-" + job.index, attempt: 1 });
  sandbox.planFile = "plans/done.yaml";
  sandbox.failures = [];
  sandbox.confirmedJobs = new Set();
  saved = finished;
  calls.length = 0;
  sandbox.getWorkerTasks = async () => ({ tasks: [
    { commandId: sessionJob.commandId, status: "completed", tmuxSession: "simple-gpu-0", workflowId: "plan-done", planRevision: "rev-done", planFile: "plans/done.yaml", case: sessionJob.case, seed: sessionJob.seed, attempt: 1, outputDir: sessionJob.outputDir, workerId: "w1", gpuId: "0" },
    { commandId: clearJob.commandId, status: "completed", workflowId: "plan-done", planRevision: "rev-done", planFile: "plans/done.yaml", case: clearJob.case, seed: clearJob.seed, attempt: 1, outputDir: clearJob.outputDir, workerId: "w1", gpuId: "0" },
  ] });
  sandbox.stopDistributedJobForClear = async () => { calls.push("stop-session"); };
  await run.call(sandbox, queue, "root");
  assert.equal(calls.includes("stop-session"), false);
  assert.deepEqual(saved.plans[0].jobs.map((job) => job.index), [0]);
  assert.match(sandbox.failures.join("\n"), /只有 tmux 会话名 simple-gpu-0/);
});

test("each execution plan row can stop and clear its own plan file", () => {
  const { renderPanelHtml } = require("../../dist/ui/PanelHtml.js");
  const htmlSource = renderPanelHtml();
  const scriptStart = htmlSource.indexOf("<script");
  const script = htmlSource.slice(htmlSource.indexOf(">", scriptStart) + 1, htmlSource.indexOf("</script>", scriptStart));
  const start = script.indexOf("function renderExecutionPlanList(state)");
  const end = script.indexOf("function renderOperationSection(state)", start);
  assert.ok(start >= 0 && end > start);
  const source = script.slice(start, end);
  let html = "";
  const sandbox = {
    Map, Set,
    operationRowsForState: () => [],
    taskSectionViewModelForState: () => ({ allRows: [] }),
    taskPlanFile: (row) => row.planFile,
    taskSelectionSetsForState: () => ({}),
    normalizePlanSelectionKey: String,
    samePlanSelection: (left, right) => left === right,
    selectedExecutionPlanFile: "",
    persistWebviewState: () => undefined,
    taskStatusToken: String,
    TASK_LIVE_STATUS_TOKENS: new Set(["running"]),
    TASK_QUEUED_STATUSES: new Set(["queued"]),
    TASK_TERMINAL_STATUSES: new Set(["completed"]),
    operationIsActive: () => false,
    operationIsFailureLike: () => false,
    operationHasDeadEvidence: () => false,
    taskFailureLikeStatus: () => false,
    planBaseName: (value) => String(value).split("/").pop(),
    esc: String,
    escAttr: String,
    detailsOpenAttr: () => "",
    statusClass: String,
    loadingPrefix: () => "",
    renderOperationItem: () => "",
    renderTaskCards: () => "",
    setHtmlIfChanged: (_id, value) => { html = value; },
  };
  vm.createContext(sandbox);
  vm.runInContext(source + "\nthis.render = renderExecutionPlanList;", sandbox);
  sandbox.render({
    planFileInput: "plans/editing.yaml",
    distributedPlans: [
      { planFile: "plans/ebmc.yaml", jobs: [{ status: "pending", blockReason: "代码指纹不匹配：旧代码", case: "bus", seed: 1 }] },
      { planFile: "plans/edrl.yaml", jobs: [{ status: "pending", case: "pad", seed: 2 }] },
    ],
  });
  assert.match(html, /data-command="stopAndClearPlan" data-plan-file="plans\/ebmc.yaml"/);
  assert.match(html, /data-command="stopAndClearPlan" data-plan-file="plans\/edrl.yaml"/);
  assert.doesNotMatch(html, /data-plan-file="plans\/editing.yaml"/);
  assert.equal((html.match(/终止并清除该 Plan/g) || []).length, 2);
  const controlsStart = script.indexOf("function renderOperationSection(state)");
  const controlsEnd = script.indexOf("function renderFileTransferProgress(", controlsStart);
  const controls = script.slice(controlsStart, controlsEnd);
  let controlsHtml = "";
  const controlSandbox = {
    operationViewModelForState: () => ({ rows: [], visibleRows: [], hiddenCount: 0, statusCounts: {} }),
    operationIsActive: () => false,
    operationIsFailureLike: () => false,
    operationIsCancelled: () => false,
    operationIsCompleted: () => false,
    selectedOperationHistoryIds: new Set(),
    selectedExecutionPlanFile: "",
    renderOperationStatusSummary: () => "",
    renderOperationHiddenSummary: () => "",
    renderFileTransferProgress: () => "",
    escAttr: String,
    setHtmlIfChanged: (id, value) => { if (id === "executionControls") controlsHtml = value; },
  };
  vm.createContext(controlSandbox);
  vm.runInContext(controls + "\nthis.render = renderOperationSection;", controlSandbox);
  controlSandbox.render({
    planFileInput: "plans/editing.yaml",
    operations: {},
    distributedPlans: [
      { planFile: "plans/ebmc.yaml", jobs: [{ status: "pending" }] },
      { planFile: "plans/edrl.yaml", jobs: [{ status: "pending" }] },
    ],
  });
  assert.match(controlsHtml, /data-command="stopAndClearPlan" data-plan-file=""[^>]*disabled/);
  assert.doesNotMatch(controlsHtml, /plans\/editing.yaml/);
  controlSandbox.selectedExecutionPlanFile = "plans/ebmc.yaml";
  controlSandbox.render({
    planFileInput: "plans/editing.yaml",
    operations: {},
    distributedPlans: [
      { planFile: "plans/ebmc.yaml", jobs: [{ status: "pending" }] },
      { planFile: "plans/edrl.yaml", jobs: [{ status: "pending" }] },
    ],
  });
  assert.match(controlsHtml, /data-command="stopAndClearPlan" data-plan-file="plans\/ebmc.yaml"/);
  assert.doesNotMatch(controlsHtml, /plans\/editing.yaml/);
});

test("plugin refuses exact pane stop unless the live worker probe advertises it", () => {
  const stopper = extension.slice(extension.indexOf("workerSupportsExactPaneStop("), extension.indexOf("async stopAndClearPlanFromUi("));
  assert.match(stopper, /lastWorkerProbes\?\.\[workerId\]/);
  assert.match(stopper, /stop-worker-task-exact-pane/);
  assert.match(stopper, /请先更新并重启该 Worker Agent/);
  const agent = fs.readFileSync(path.join(__dirname, "../../src/clusterAgentRuntime.legacy.ts"), "utf8");
  const capabilities = agent.slice(agent.indexOf("def api_capabilities"), agent.indexOf("def api_file_capabilities"));
  assert.match(capabilities, /"stop-worker-task-exact-pane": True/);
  const clear = extension.slice(extension.indexOf("const stopEpoch = this.distributedPlanStopEpoch"), extension.indexOf("async downloadDebugBundle("));
  const arm = clear.indexOf("this.distributedPlanStopEpoch = (this.distributedPlanStopEpoch || 0) + 1");
  const wait = clear.indexOf("distributedQueueTickPromise");
  const restore = clear.lastIndexOf("this.distributedPlanStopEpoch = 0");
  assert.ok(arm >= 0 && wait > arm && restore > wait);
  assert.ok(clear.indexOf("try {") < wait);
  assert.ok(clear.lastIndexOf("finally {") < restore);
});

test("agent stop-worker-task requires a full job identity and closes only that pane", () => {
  const agentPath = path.join(__dirname, "../../dist/runtime/cluster_agent.py");
  const file = path.join(__dirname, "fixtures/exactPaneStop.py");
  const result = spawnSync("python", [file], {
    encoding: "utf8",
    timeout: 10000,
    windowsHide: true,
    env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1", TEST_AGENT_PATH: agentPath },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
