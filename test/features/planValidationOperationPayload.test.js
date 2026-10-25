const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");
const DistributedPlanQueue = require("../../dist/features/DistributedPlanQueue.js");
const { ProgressInactivity } = require("../../dist/core/ProgressInactivity.js");

const source = fs.readFileSync(path.join(__dirname, "../../src/extension/legacy.ts"), "utf8");
const parsed = ts.createSourceFile("legacy.ts", source, ts.ScriptTarget.Latest, true);
const methods = new Map();
const functions = new Map();
function collect(node) {
  if (ts.isMethodDeclaration(node)) methods.set(node.name.getText(parsed), node.getText(parsed));
  if (ts.isFunctionDeclaration(node) && node.name) functions.set(node.name.text, node.getText(parsed));
  ts.forEachChild(node, collect);
}
collect(parsed);

const planFile = "experiments/plans/comparison/ebmc.yaml";
const revision = "52e776e5f9f455939795596b803a86e33e71333b55355b793c4d64accd946580";
const root = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "wrapped-formal-"));
const operationId = "validate-plan-1790619402512-cc0n8y";
// The affected NWPU3 operation returned these six jobs inside payload.validation.
const jobs = ["ebmc_bus_p100", "ebmc_pad_p100"].flatMap((caseName, caseIndex) =>
  [42, 43, 44].map((seed, seedIndex) => {
    const index = caseIndex * 3 + seedIndex;
    return { index, case: caseName, seed, result_csv: `tmp/result/ebmc/${index}.csv`, output_dir: `work_dirs/ebmc/${index}_${caseName}_seed${seed}` };
  }));

function completedOperation(shape = "payload", validationOverrides = {}) {
  const validation = { ok: true, result_path_policy: "declared", execution_mode: "train_test", job_count: 6, jobs, existing: [], ...validationOverrides };
  const payload = { status: "completed", workerId: "nwpu3", planFile, planRevision: revision, validation };
  const operation = { operationId, type: "validate-plan", status: "completed", workerId: "nwpu3", planFile, planRevision: revision };
  if (shape === "direct") return { ...operation, validation };
  if (shape === "result") return { ...operation, result: { validation } };
  if (shape === "latestEvent") return { ...operation, latestEvent: { type: "operation_completed", payload } };
  return { ...operation, payload, latestEvent: { type: "operation_completed", payload } };
}

function hostFor(operation, accepted = true, outputChoice) {
  const notices = [];
  const dialogs = [];
  const context = {
    PlanRunHost: require("../../dist/extension/PlanRunHost").PlanRunHost,
    DistributedPlanQueue, DistributedSchedulingPolicy: { schedulingMode: (value) => value || "all" }, ProgressInactivity, Date, Set, Map,
    OPERATION_TERMINAL_STATUSES: new Set(["completed", "operation_completed", "completed_with_errors", "failed", "operation_failed", "cancelled", "canceled", "stalled", "unsupported", "error"]),
    REMOTE_ACTION_PENDING_STATUSES: new Set(["accepted", "submitted", "queued", "pending", "running", "progress", "in_progress", "operation_started"]),
    LONG_RUNNING_OPERATION_ACTIONS: new Set(["run-plan", "reproduce-plan"]),
    workspaceRoot: () => root,
    path, AbortController, assertRetryRequestCurrent() {},
    WorkflowBinding: require("../../dist/features/WorkflowWorkspaceBinding"),
    PlanExecutionMode: require("../../dist/features/PlanExecutionMode"),
    cleanupStablePlanId: require("../../dist/features/PlanCleanupEvidence").cleanupStablePlanId,
    replacementJobGroups: require("../../dist/features/PlanOutputReplacement").replacementJobGroups,
    fs: {readFile: async () => "plan_id: fixture\n"},
    normalizePlanSelectionKey: value => value,
    makeOpId: (prefix) => `${prefix}-fixture`,
    sleep: async () => {},
    actionErrorSuggestion: (message) => message,
    errorMessage: (error) => String(error.message || error),
    UiCommandCancelled: class UiCommandCancelled extends Error { constructor(message) { super(message); this.name = "UiCommandCancelled"; } },
    isUiCommandCancelled: (error) => error.name === "UiCommandCancelled",
    isUiCommandRemotePending: () => false,
    actionAffectsResultsSummary: () => false,
    vscode: { window: {
      showWarningMessage: async (message, _options, ...choices) => { notices.push(message); dialogs.push(choices); return outputChoice === null ? undefined : choices.includes(outputChoice) ? outputChoice : choices[0]; },
      showInformationMessage: async (message) => { notices.push(message); },
    } },
    uniqueStrings: (values) => [...new Set(values)],
  };
  const helperNames = ["stringFromRecord", "resultStatus", "operationStatusToken", "remoteActionPendingStatus", "remoteActionSucceeded", "operationStatusOf", "operationTerminal", "operationTerminalStatus", "operationLongRunningAction", "operationSubmissionAccepted", "operationResultPlanFile", "usableSelectionKey", "planCheckAccepted"];
  if (functions.has("planValidationFromResult")) helperNames.push("planValidationFromResult");
  helperNames.push("remoteOperationDurationMs");
  // commitIsolatedEnqueueLocal 是入队落盘后的真实批次账本 producer（新主线接线）：本夹具无隔离批次上下文，
  // 真实方法在 currentIsolatedBatchLocal 缺失时即返回 false 早退——提取真身而非 stub（同 distributedPlanExecutionMode 口径）。
  // 块C：真实 enqueue 含队列窄溯源收敛（queueGitProvenance/stripGitUrlCredentials 纯法身一并提取）。
  const methodNames = ["runPlanPreflight", "waitForOperationTerminalResult", "refreshOperationStatus", "confirmPlanExistingOutputs", "confirmPlanExistingOutputsFromValidation", "confirmDeclaredPlanOutputs", "confirmDistributedPlanExistingOutputs", "enqueueDistributedPlan", "commitIsolatedEnqueueLocal", "queueGitProvenance", "stripGitUrlCredentials"];
  const emitted = ts.transpileModule(
    helperNames.map((name) => functions.get(name)).join("\n") + "\nthis.production = {\n" + methodNames.map((name) => methods.get(name)).join(",\n") + "\n}; this.accepted = planCheckAccepted;",
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  vm.createContext(context);
  new vm.Script(emitted).runInContext(context);
  const host = Object.create(context.production);
  Object.assign(host, {
    captureProjectContext: () => ({root,generation:1}), projectContextIsCurrent: () => true,
    effectiveConnectionMode: () => "realtime",
    localOperations: {}, queue: DistributedPlanQueue.emptyDistributedQueue(),
    lastWorkerProbes: { nwpu3: { status: "ok", capabilities: {endpoints: {declaredJobPaths:true, formalJobIdentityEnv:1, taskShellEnvironment:1, projectManagedValidation:1}} } },
    lastCodeSyncState: { fingerprint: "verified-code", workerVersions: { nwpu3: { fingerprint: "verified-code" } } },
    projectContextGeneration: 1, errors: [], reads: [], actions: [], authorityValid: true,
    client: {
      getWorkerOperation: async (workerId, opId) => { host.reads.push([workerId, opId]); return operation; },
      getGpu: async () => ({ workers: [] }),
    },
    assertActionAuthorityCurrent: () => { if (!host.authorityValid) { const error = new Error("工作区已切换"); error.name = "UiCommandCancelled"; throw error; } },
    planSchedulerWorkerId: () => "nwpu3",
    enabledWorkerConfigs: () => [{ id: "nwpu3", displayName: "NWPU3" }],
    postPlanSchedulerAction: async (action) => { host.actions.push(action); return accepted ? { operationId, status: "accepted", planFile, planRevision: revision } : operation; },
    operationManualWaitDelayMs: () => 0,
    throwIfTerminalActionFailure: (_title, _action, status) => { if (["failed", "cancelled", "completed_with_errors"].includes(status)) throw new Error(status); },
    clearOperationStatusProbe: () => {}, clearOperationWatchdog: () => {}, markLocalOperationsDirty: () => {}, postState: () => {},
    distributedPlanEligible: () => true,
    workerActionTargets: () => [{id:"nwpu3"}],
    planCleanupHost: () => ({service:{
      preview: async request => {
        const job=request.job.manifest.declarations[0];
        const exists=host.queue.plans.some(p=>p.jobs.some(j=>j.outputDir===job.output_dir)) || (operation.payload?.validation?.existing || []).some(j=>j.index===job.index);
        return {token:"private-preview-"+job.index,digest:"private-digest",action:"isolate",blockers:[],rows:exists?[{disposition:"isolate",absolutePath:"/private/worker/"+job.output_dir,type:"directory",node:{id:"nwpu3",kind:"remote",host:"fixture.invalid",user:"test",port:22}}]:[]};
      }, confirm: async request => {host.actions.push("confirm-isolation");assert.equal(request.phase,1);},
      preflightConfirmed: async () => {},assertIsolatedSourcesAbsent:async()=>{},status:async()=>({state:"completed"})},
      execute:async()=>{host.actions.push("private-isolation");return {state:"completed"};}}),
    apiTaskPreflight: async params => { host.actions.push("completed-hash-preflight"); return {params}; },
    waitForCompleted: true,
    planValidationCacheKey: () => "",
    cachedPlanValidation: () => undefined,
    rememberPlanValidation: () => {},
    loadDistributedQueue: async () => host.queue,
    saveDistributedQueue: async (_root, queue, options) => { host.queue = options?.mutateLatest ? options.mutateLatest(host.queue) : queue; },
    refreshLocalPlanMetadataForAction: async () => {}, stampPlanRevision: body => {body.planRevision=revision;},
    localDistributedCodeFingerprint: async () => "verified-code", assertPlanSubmissionWorkers: async () => {},
    readWorkerTaskSnapshot: async (workerId, options) => {
      host.actions.push("fresh-declared-inventory");
      return {workerId,queryComplete:true,tasks:[],declaredResults:options.declarations.map(job => ({index:job.index,outputDir:job.output_dir,collectionResultCsv:job.result_csv,
        completed:host.queue.plans.some(p=>p.revision===revision && p.jobs.some(j=>j.index===job.index && j.status==="completed")),runId:"fresh-"+job.index}))};
    },
    askRunConfirmation: async payload => {dialogs.push(payload);return outputChoice===null ? "cancel" : payload.phase===2 ? "isolate_and_run" : outputChoice==="仅补跑缺失任务" ? "rerun_missing" : outputChoice==="保留已有产物，不运行" ? "cancel" : "rerun_all";},
    availabilityPushTtlSeconds: () => 60, schedulerSettings: () => ({}),
    localWorkerAvailabilityRows: () => [{ workerId: "nwpu3", availableGpuIds: [0, 1, 2, 3, 4, 5], capacityLimit: 6 }],
    recordActionError: (error) => host.errors.push(error),
  });
  return { host, notices, dialogs, accepted: context.accepted };
}


for (const shape of ["payload", "latestEvent", "direct", "result"]) test(shape + " completion travels through real formal preview and queue without attempts", async () => {
  const {host, notices} = hostFor(completedOperation(shape));
  const body = {planFile, planRevision:revision, options:{}};
  const checked = await host.runPlanPreflight(body, "当前计划");
  assert.equal(checked.distributedPreview.totalJobs,6);
  assert.equal(checked.distributedPreview.dispatchableCount,6);
  await host.confirmDistributedPlanExistingOutputs({},body,checked);
  assert.equal((await host.enqueueDistributedPlan(body,checked,true)).enqueued,true);
  assert.deepEqual(Array.from(host.queue.plans[0].jobs,job=>job.outputDir), jobs.map(job=>job.output_dir));
  assert.ok(host.queue.plans[0].jobs.every(job=>!job.outputDir.includes("/attempts/")));
  assert.equal(host.queue.plans[0].overwriteExisting,false);
  assert.deepEqual(host.reads,[["nwpu3",operationId]]);
  assert.equal(notices.length,0);
});

function historical(host, selectedJobs=jobs.slice(0,4), current=true) {
  host.queue = DistributedPlanQueue.enqueuePlan(host.queue,{
    projectId:DistributedPlanQueue.canonicalProjectId(root), planFile, revision: current ? revision : "old",
    codeFingerprint:"verified-code", executionMode:"train_test",
    jobs:selectedJobs.map(job=>({index:job.index,case:job.case,seed:job.seed,outputDir:job.output_dir,collectionResultCsv:job.result_csv}))
  },"old-run");
  for (const job of host.queue.plans[0].jobs) Object.assign(job,{status:"completed",workerId:"nwpu3",commandId:"old-command-"+job.index});
}
test("missing-only with wrapped remote validation requires live completed hashes and preserves original indices",async()=>{
  const {host}=hostFor(completedOperation("latestEvent"),true,"仅补跑缺失任务");
  historical(host);
  const normalWait=host.waitForOperationTerminalResult;
  host.waitForOperationTerminalResult=async function(action,...args){
    return action==="preflight-worker-task" ? {payload:{report:{completed:true}}} : normalWait.call(this,action,...args);
  };
  const body={planFile,planRevision:revision,options:{}}, checked=await host.runPlanPreflight(body,"当前计划");
  await host.confirmDistributedPlanExistingOutputs({},body,checked);
  assert.deepEqual(Array.from(body.distributedSkipJobIndices),[0,1,2,3]);
  assert.equal(host.actions.filter(action=>action==="fresh-declared-inventory").length,1);
  assert.equal(host.actions.filter(action=>action==="completed-hash-preflight").length,0);
  await host.enqueueDistributedPlan(body,checked,true);
  assert.deepEqual(Array.from(host.queue.plans[1].jobs,job=>job.index),[4,5]);
  assert.equal(host.queue.plans[1].overwriteExisting,false);
});
test("old queue revision cannot supply completion when fresh inventory does not confirm it",async()=>{
  const {host}=hostFor(completedOperation(),true,"仅补跑缺失任务"); historical(host,jobs.slice(0,4),false);
  const body={planFile,planRevision:revision}, checked=await host.runPlanPreflight(body,"当前计划");
  await assert.rejects(host.confirmDistributedPlanExistingOutputs({},body,checked),/HOLD_TARGET_NOT_FOUND/);
  assert.equal(host.queue.plans.length,1);
});
test("keep and cancel preserve all historical records without new submission",async()=>{
  for (const choice of ["保留已有产物，不运行",null]){
    const {host}=hostFor(completedOperation(),true,choice); historical(host);
    const before=JSON.stringify(host.queue), body={planFile,planRevision:revision}, checked=await host.runPlanPreflight(body,"当前计划");
    await assert.rejects(host.confirmDistributedPlanExistingOutputs({},body,checked),/已取消/);
    assert.equal(JSON.stringify(host.queue),before);
  }
});
test("unowned outputs cannot authorize overwrite or an attempt fallback",async()=>{
  const {host}=hostFor(completedOperation("payload",{existing:[{index:0,output_dir:jobs[0].output_dir}]}),true,"覆盖并重跑");
  const body={planFile,planRevision:revision,overwrite:true}, checked=await host.runPlanPreflight(body,"当前计划");
  await assert.rejects(host.confirmDistributedPlanExistingOutputs({},body,checked),/HOLD_TARGET_NOT_FOUND/);
  assert.equal(host.queue.plans.length,0);
  assert.equal(body.overwrite,false);
});

test("missing jobs still block preview and never create a queue entry", async () => {
  const { host } = hostFor(completedOperation("payload", { jobs: [] }));
  await assert.rejects(() => host.runPlanPreflight({ planFile, planRevision: revision }, "当前计划"), /Agent 校验未返回逐 job 清单/);
  assert.equal(host.queue.plans.length, 0);
});

test("terminal failure and wrapped validation rejection cannot be accepted", async () => {
  const { accepted } = hostFor(completedOperation());
  assert.equal(accepted({ ...completedOperation(), status: "failed" }), false);
  assert.equal(accepted({ ...completedOperation(), status: "completed_with_errors" }), false);
  assert.equal(accepted(completedOperation("payload", { ok: false })), false);
  assert.equal(accepted(completedOperation("latestEvent", { ok: false })), false);
  const { host } = hostFor(completedOperation("payload", { ok: false }));
  await assert.rejects(() => host.runPlanPreflight({ planFile }, "当前计划"), /计划校验.*失败|计划校验失败/);
  assert.equal(host.queue.plans.length, 0);
});

test("latest validation evidence overrides a stale root or payload validation", async () => {
  const operation = completedOperation("latestEvent", { jobs: [] });
  operation.validation = { ok: true, jobs, existing: [] };
  operation.payload = { validation: operation.validation };
  const { host } = hostFor(operation);
  await assert.rejects(() => host.runPlanPreflight({ planFile, planRevision: revision }, "当前计划"), /Agent 校验未返回逐 job 清单/);
});

test("switching workspace while waiting cancels before local preview or enqueue", async () => {
  const { host } = hostFor(completedOperation());
  const read = host.client.getWorkerOperation;
  host.client.getWorkerOperation = async (...args) => { const result = await read(...args); host.authorityValid = false; return result; };
  await assert.rejects(() => host.runPlanPreflight({ planFile }, "当前计划"), /工作区已切换/);
  assert.equal(host.queue.plans.length, 0);
  assert.equal(host.errors.length, 0);
});
