const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..", "..");
const extension = fs.readFileSync(path.join(root, "src/extension/legacy.ts"), "utf8");
const panel = fs.readFileSync(path.join(root, "src/ui/PanelHtml.legacy.ts"), "utf8");
const DistributedPlanQueue = require("../../dist/features/DistributedPlanQueue.js");
const drf = "experiments/plans/comparison/drf.yaml";

function method(name) {
  const lines = extension.split(/\r?\n/);
  const start = lines.findIndex((line) => new RegExp(`^    (?:async )?${name}\\(`).test(line));
  assert.ok(start >= 0, name);
  let depth = 0;
  for (let index = start; index < lines.length; index += 1) {
    depth += (lines[index].match(/\{/g) || []).length - (lines[index].match(/\}/g) || []).length;
    if (index > start && depth <= 0) return lines.slice(start, index + 1).join("\n").replace(/: any/g, "").replace(/ as const/g, "");
  }
  throw new Error(`unclosed ${name}`);
}

function functionSource(name) {
  const start = extension.indexOf(`function ${name}(`);
  assert.ok(start >= 0, name);
  const open = extension.indexOf("{", start);
  let depth = 0;
  for (let index = open; index < extension.length; index += 1) {
    if (extension[index] === "{") depth += 1;
    else if (extension[index] === "}") {
      depth -= 1;
      if (!depth) return extension.slice(start, index + 1);
    }
  }
  throw new Error(`unclosed ${name}`);
}

const production = new Function("DistributedPlanQueue", "fs", "path", "workspaceRoot", `
  function stringField(message, key) { return String((message && message[key]) || ""); }
  function operationResultPlanFile(body) { return String((body && (body.planFile || body.selectedPlanId || (body.options && body.options.planFile))) || ""); }
  let opSeq = 0;
  function makeOpId(prefix) { opSeq += 1; return prefix + "-" + opSeq; }
  function operationStatusToken(value) { return String(value || "").toLowerCase(); }
  function resultStatus(result) { return result && (result.status || result.state) || ""; }
  function remoteActionSucceeded(value) { return ["completed", "succeeded", "done"].includes(operationStatusToken(value)); }
  ${functionSource("planCheckAccepted")}
  return {
    beginPlanSubmissionProgress: ${method("beginPlanSubmissionProgress").replace("beginPlanSubmissionProgress", "function")},
    planSubmissionOperationId: ${method("planSubmissionOperationId").replace("planSubmissionOperationId", "function")},
    planSubmissionPlanFile: ${method("planSubmissionPlanFile").replace("planSubmissionPlanFile", "function")},
    finishPlanSubmissionProgress: ${method("finishPlanSubmissionProgress").replace("finishPlanSubmissionProgress", "function")},
    planSubmissionQueueDetail: ${method("planSubmissionQueueDetail").replace("planSubmissionQueueDetail", "function")},
    distributedCodeVersionHold: ${method("distributedCodeVersionHold").replace("async distributedCodeVersionHold", "async function")},
    deferDistributedPlan: ${method("deferDistributedPlan").replace("async deferDistributedPlan", "async function")},
    supersedeDeferredPlan: ${method("supersedeDeferredPlan").replace("async supersedeDeferredPlan", "async function")},
    finishDistributedPlanSubmission: ${method("finishDistributedPlanSubmission").replace("async finishDistributedPlanSubmission", "async function")},
    activeDeferredForSubmission: ${method("activeDeferredForSubmission").replace("async activeDeferredForSubmission", "async function")},
  };
`)(DistributedPlanQueue, fs, path, () => root);

function provider() {
  const host = Object.create(production);
  host.localOperations = {};
  host.planRunStageStartedAt = Date.now();
  host.distributedQueueCache = { schemaVersion: 1, plans: [], deferred: [] };
  host.distributedQueueRoot = root;
  host.lastCodeSyncState = { fingerprint: "new-code", workerVersions: { w1: { fingerprint: "old-code" } } };
  host.distributedPostprocessPromise = undefined;
  host.posts = [];
  host.stages = [];
  host.saved = [];
  host.calls = [];
  host.postState = () => host.posts.push(JSON.parse(JSON.stringify(host.localOperations)));
  host.markLocalOperationsDirty = () => {};
  host.reportPlanStage = (_message, text) => host.stages.push(text);
  host.openPanelAt = async () => {};
  host.loadDistributedQueue = async () => host.distributedQueueCache;
  host.saveDistributedQueue = async (_root, queue) => {
    const current = new Map((host.distributedQueueCache.deferred || []).map((row) => [row.id, row]));
    queue = { ...queue, deferred: (queue.deferred || []).map((row) => current.get(row.id)?.status === "superseded" ? current.get(row.id) : row) };
    host.saved.push(queue);
    host.distributedQueueCache = queue;
  };
  host.localDistributedCodeFingerprint = async () => "new-code";
  host.ensureCodeReadyForRun = async () => { host.calls.push("sync"); };
  host.runPlanPreflight = async () => { host.calls.push("preflight"); return validation(); };
  host.confirmDistributedPlanExistingOutputs = async (_plan, body) => {
    host.calls.push("confirm");
    body.overwriteExisting = false;
    body.distributedSkipJobIndices = [0];
  };
  host.enqueueDistributedPlan = async (body, _validated, _skip, supersededDeferredId = "") => {
    host.calls.push("enqueue:" + JSON.stringify(body.distributedSkipJobIndices || []));
    if (supersededDeferredId) {
      host.distributedQueueCache.deferred = (host.distributedQueueCache.deferred || []).map((row) => row.id === supersededDeferredId ? { ...row, status: "superseded" } : row);
    }
  };
  host.assertExecutionCondaEnvReady = () => {};
  host.workerActionTargets = () => [];
  return host;
}

function validation() {
  return { ok: true, status: "completed", validation: { ok: true, jobs: [
    { index: 0, case: "bus", seed: 42, output_dir: "work/drf/bus" },
  ], existing: [{ index: 0, case: "bus", seed: 42, output_dir: "work/drf/bus" }] } };
}

function message() {
  return { command: "runPlan", clientActionId: "click-drf", planFile: drf };
}

function mountOldPlan(host) {
  host.distributedQueueCache.plans.push({ id: "old-plan", planFile: "experiments/plans/comparison/old.yaml",
    revision: "rev-old", codeFingerprint: "old-code", jobs: [{ status: "running" }] });
}

function commandHost() {
  const host = provider();
  host.actionBody = (item) => ({ planFile: item.planFile, planRevision: item.planRevision || "rev-drf", options: {}, deferredPlanId: item.deferredPlanId || "" });
  host.refreshLocalPlanMetadataForAction = async () => {};
  host.stampPlanRevision = () => {};
  host.assertPlanLocalConfigFiles = async () => {};
  host.localPlanForActionBody = () => ({ planFile: drf, revision: "rev-drf" });
  host.distributedPlanEligible = () => true;
  host.assertPlanTopologyReady = () => ({ mode: "worker_pool" });
  host.selectDistributedPlanPrimary = async () => "w1";
  host.assertExecutionWorkersReady = () => {};
  host.assertExecutionAgentProjectsReady = () => {};
  host.assertPlanNotAlreadyActive = async () => {};
  host.ensureSimpleSftpReadyForSetup = async () => true;
  host.confirmPlanRunSubmission = async () => {};
  host.recordRunGitProvenance = async () => ({ localCommit: "abc" });
  host.finishDistributedPlanSubmission = production.finishDistributedPlanSubmission;
  return host;
}

function webviewState(host) {
  const queue = host.distributedQueueCache;
  return {
    planFileInput: drf,
    operations: host.localOperations,
    schedulerStates: [],
    distributedPlans: queue.plans,
    deferredPlans: (queue.deferred || []).map((item) => ({ ...item })),
  };
}

test("click creates a named running-progress row before preflight", async () => {
  const host = provider();
  host.beginPlanSubmissionProgress(message(), { planFile: drf, planRevision: "rev-drf" });
  const row = host.localOperations["plan-submit-click-drf"];
  assert.equal(row.planFile, drf);
  assert.equal(row.type, "run-plan");
  assert.equal(row.localSubmissionProgress, true);
  assert.equal(row.status, "running");
  host.beginPlanSubmissionProgress(message(), { planFile: drf, planRevision: "rev-reset" });
  assert.equal(host.localOperations["plan-submit-click-drf"].planRevision, "rev-drf");
  const html = renderExecution(progressState(host));
  assert.match(html.executionPlanList, /drf\.yaml/);
  assert.match(html.executionPlanList, /running/);
  assert.match(html.executionPlanList, /运行计划/);
  assert.doesNotMatch(html.executionPlanList, /强制中止调度器|abortScheduler/);
});

test("old fingerprint holds before sync and does not claim output confirmation", async () => {
  const host = provider();
  mountOldPlan(host);
  host.beginPlanSubmissionProgress(message(), { planFile: drf });
  const body = { planFile: drf, planRevision: "rev-drf", options: {} };
  const hold = await host.distributedCodeVersionHold(body);
  assert.equal(hold.fingerprint, "new-code");
  await host.deferDistributedPlan(root, body, hold.fingerprint, {
    waitingForPlanFile: hold.blocker.planFile, waitingForRevision: hold.blocker.revision, waitingForFingerprint: "old-code",
    confirmedOutputChoice: false,
  });
  host.finishPlanSubmissionProgress(message(), "queued", host.planSubmissionQueueDetail(body, hold.blocker, false));
  assert.deepEqual(host.calls, []);
  const deferred = host.distributedQueueCache.deferred[0];
  assert.equal(deferred.confirmedOutputChoice, false);
  assert.match(deferred.reason, /尚未校验\/尚未确认已有产物/);
  assert.match(host.localOperations["plan-submit-click-drf"].message, /尚未校验\/尚未确认已有产物/);
  const html = renderTask({ planFileInput: drf, distributedPlans: [], deferredPlans: [{ ...deferred, confirmedOutputChoice: false }], schedulerStates: [] });
  assert.match(html.taskSummary, /尚未校验\/尚未确认已有产物/);
  assert.match(html.taskSummary, /继续提交/);
  assert.match(html.taskSummary, /当前版本调度 job 数为 0/);
});

test("distributed submission holds an old fingerprint before sync and renders that queue row", async () => {
  const host = commandHost();
  mountOldPlan(host);
  host.beginPlanSubmissionProgress(message(), { planFile: drf, planRevision: "rev-drf" });
  await host.finishDistributedPlanSubmission("runPlan", message(), { planFile: drf }, host.actionBody(message()));
  assert.deepEqual(host.calls, []);
  const deferred = host.distributedQueueCache.deferred;
  assert.equal(deferred.length, 1);
  assert.equal(deferred[0].confirmedOutputChoice, false);
  assert.equal(host.localOperations["plan-submit-click-drf"].status, "queued");
  const progress = renderExecution(webviewState(host));
  assert.match(progress.executionPlanList, /drf/);
  const tasks = renderTask(webviewState(host));
  assert.match(tasks.taskSummary, /尚未校验、尚未确认已有产物/);
  assert.match(tasks.taskSummary, /data-command="runPlan"/);
  assert.match(tasks.taskSummary, new RegExp('data-deferred-plan-id="' + deferred[0].id + '"'));
});

test("continue submit maps the rendered deferred id and supersedes that record", async () => {
  const host = commandHost();
  mountOldPlan(host);
  host.beginPlanSubmissionProgress(message(), { planFile: drf, planRevision: "rev-drf" });
  await host.finishDistributedPlanSubmission("runPlan", message(), { planFile: drf }, host.actionBody(message()));
  const firstId = host.distributedQueueCache.deferred[0].id;
  const tasks = renderTask(webviewState(host));
  const button = { dataset: datasetFromHtml(tasks.taskSummary, "继续提交") };
  const payload = buttonDatasetActionPayload(button);
  assert.equal(payload.deferredPlanId, firstId);
  assert.equal(payload.planFile, drf);
  const again = { command: "runPlan", clientActionId: "click-drf-2", ...payload };
  host.beginPlanSubmissionProgress(again, { planFile: drf, planRevision: "rev-drf" });
  await host.finishDistributedPlanSubmission("runPlan", again, { planFile: drf }, { planFile: payload.planFile, planRevision: "rev-drf", deferredPlanId: payload.deferredPlanId, options: {} });
  const rows = host.distributedQueueCache.deferred;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, firstId);
  assert.equal(rows[0].status, "pending");
  const resumed = renderTask(webviewState(host));
  assert.equal((resumed.taskSummary.match(/>继续提交</g) || []).length, 1);
  assert.match(resumed.taskSummary, new RegExp('data-deferred-plan-id="' + firstId + '"'));
});

test("missing continuation id rejects before sync or queue mutation", async () => {
  const host = commandHost();
  mountOldPlan(host);
  await submit(host, message());
  host.calls = [];
  const before = JSON.stringify(host.distributedQueueCache);
  await assert.rejects(() => submit(host, { ...message(), clientActionId: "missing", deferredPlanId: "missing-id" }));
  assert.deepEqual(host.calls, []);
  assert.equal(JSON.stringify(host.distributedQueueCache), before);
});

test("continuation identity mismatch rejects without changing the original row", async () => {
  const host = commandHost();
  mountOldPlan(host);
  await submit(host, message());
  const original = host.distributedQueueCache.deferred[0];
  await assert.rejects(() => submit(host, { ...message(), clientActionId: "other", deferredPlanId: original.id, planFile: "experiments/plans/comparison/other.yaml" }));
  assert.equal(host.distributedQueueCache.deferred.length, 1);
  assert.equal(host.distributedQueueCache.deferred[0].status, "pending");
  assert.match(renderTask(webviewState(host)).taskSummary, new RegExp('data-deferred-plan-id="' + original.id + '"'));
});

test("failed confirmation keeps the original continue button", async () => {
  const host = commandHost();
  mountOldPlan(host);
  await submit(host, message());
  const original = host.distributedQueueCache.deferred[0];
  host.distributedQueueCache.plans = [];
  host.confirmDistributedPlanExistingOutputs = async () => { throw new Error("已取消"); };
  await assert.rejects(() => submit(host, { ...message(), clientActionId: "resume", deferredPlanId: original.id }));
  assert.equal(host.distributedQueueCache.deferred[0].id, original.id);
  assert.equal(host.distributedQueueCache.deferred[0].status, "pending");
  assert.match(renderTask(webviewState(host)).taskSummary, />继续提交</);
});

test("repeated plan clicks reuse one active deferred row", async () => {
  const host = commandHost();
  mountOldPlan(host);
  await submit(host, message());
  await submit(host, { ...message(), clientActionId: "again" });
  const active = host.distributedQueueCache.deferred.filter((row) => row.status !== "superseded");
  assert.equal(active.length, 1);
  assert.equal((renderTask(webviewState(host)).taskSummary.match(/>继续提交</g) || []).length, 1);
});

test("queued continuation is not replayed after the same plan is enqueued", () => {
  const tick = extension.slice(extension.indexOf("const deferred = !activeVersion"), extension.indexOf("if (deferred) {"));
  assert.match(tick, /sameDeferredPlanFile\(plan\.planFile, row\.planFile\)/);
  assert.match(tick, /plan\.revision === row\.revision/);
  assert.match(tick, /plan\.codeFingerprint === row\.codeFingerprint/);
});

test("successful continuation supersedes only after enqueue", async () => {
  const host = commandHost();
  mountOldPlan(host);
  await submit(host, message());
  const original = host.distributedQueueCache.deferred[0].id;
  host.distributedQueueCache.plans = [];
  await submit(host, { ...message(), clientActionId: "done", deferredPlanId: original });
  assert.equal(host.calls.at(-1).startsWith("enqueue"), true);
  assert.equal(host.distributedQueueCache.deferred.find((row) => row.id === original).status, "superseded");
  assert.equal(host.distributedQueueCache.deferred.filter((row) => row.status !== "superseded").length, 0);
});

async function submit(host, item) {
  host.beginPlanSubmissionProgress(item, { planFile: item.planFile, planRevision: "rev-drf" });
  await host.finishDistributedPlanSubmission("runPlan", item, { planFile: item.planFile }, host.actionBody(item));
}

function deferredRow(overrides = {}) {
  return {
    id: "deferred-drf",
    planFile: drf,
    revision: "rev-drf",
    codeFingerprint: "new-code",
    status: "pending",
    confirmedOutputChoice: false,
    ...overrides,
  };
}

test("activeDeferredForSubmission uses the real exported helper without a sandbox binding", async () => {
  assert.equal(typeof DistributedPlanQueue.matchingActiveDeferred, "function");
  assert.doesNotMatch(extension.slice(extension.indexOf("async activeDeferredForSubmission"), extension.indexOf("async supersedeDeferredPlan")), /(?<!DistributedPlanQueue\.)matchingActiveDeferred\(/);
  const host = provider();
  host.distributedQueueCache.deferred = [deferredRow()];
  const body = { planFile: drf, planRevision: "rev-drf", options: {} };
  const none = await host.activeDeferredForSubmission(root, body, "new-code", "");
  assert.equal(none.id, "deferred-drf");
  const pending = await host.activeDeferredForSubmission(root, body, "new-code", "deferred-drf");
  assert.equal(pending.status, "pending");
  host.distributedQueueCache.deferred = [deferredRow({ status: "blocked" })];
  const blocked = await host.activeDeferredForSubmission(root, body, "new-code", "deferred-drf");
  assert.equal(blocked.status, "blocked");
  assert.equal(await host.activeDeferredForSubmission(root, body, "new-code", "other-id"), null);
  assert.equal(await host.activeDeferredForSubmission(root, { ...body, planRevision: "rev-other" }, "new-code", "deferred-drf"), null);
  assert.equal(await host.activeDeferredForSubmission(root, body, "other-code", "deferred-drf"), null);
  assert.equal(await host.activeDeferredForSubmission(root, { planFile: "experiments/plans/comparison/other.yaml", planRevision: "rev-drf" }, "new-code", "deferred-drf"), null);
  host.distributedQueueCache.deferred = [deferredRow({ confirmedOutputChoice: true })];
  assert.equal(await host.activeDeferredForSubmission(root, body, "new-code", "deferred-drf"), null);
  host.distributedQueueCache.deferred = [];
  assert.equal(await host.activeDeferredForSubmission(root, body, "new-code", ""), undefined);
});

test("runPlan command reaches the real deferred lookup before preflight", async () => {
  const signature = extension.indexOf("    async runActionCommandCore(command, message) {");
  const start = extension.indexOf("        const action = actionCommandMap[command];", signature);
  const end = extension.indexOf("        const danger = command === \"deleteArtifacts\";", start);
  const body = extension.slice(start, end)
    .replace(/: any\[\]/g, "")
    .replace(/: any/g, "")
    .replace(/ as any/g, "")
    .replace(/\(this as any\)/g, "this");
  const run = new Function("PLAN_SUBMISSION_COMMANDS", "PLAN_PREFLIGHT_COMMANDS", "LENIENT_RUN", "DistributedPlanQueue", "operationResultPlanFile", "projectOutputGateReason", "makeOpId", "actionCommandMap", "assertSingleProjectWorkspace", "pluginProjectAdapterRules", "workspaceRoot", "stringField", "stringArrayField", "uniqueStrings", "usableSelectionKey", "directWorkerActionMap", `
    return async function(command, message) {
      ${body}
    };
  `)(new Set(["runPlan", "reproducePlan"]), new Set(), false, DistributedPlanQueue,
    (record) => String((record && (record.planFile || record.selectedPlanId || (record.options && record.options.planFile))) || ""),
    () => "",
    (action) => action + "-op",
    { runPlan: "run-plan" },
    () => {},
    () => ({}),
    () => root,
    (message, key) => String((message && message[key]) || ""),
    () => [],
    (values) => [...new Set(values || [])],
    (value) => String(value || ""),
    {});
  const host = commandHost();
  host.calls = [];
  host.localPlanMetadata = { detectedProject: {} };
  host.reportPlanStage = (_message, text) => host.calls.push("stage:" + text);
  host.workerActionTargets = () => [];
  host.syncProjectAdapterRulesToAgents = async () => [];
  host.assertRetryPlanContext = () => {};
  host.ensureManualStopReason = async () => {};
  host.resolveWorkerEndpointId = () => "";
  host.assertPlanSchedulerAgentReady = () => {};
  host.ensureHubCodeReadyForPlanCheck = async () => {};
  host.ensureWorkerPoolPlanTarget = async () => {};
  await run.call(host, "runPlan", message());
  assert.equal(host.calls.includes("preflight"), true);
  assert.equal(host.calls.at(-1), "enqueue:[0]");
});

test("runPlan submission reuses only a matching active deferred row and still reaches preflight", async () => {
  const host = commandHost();
  const body = { planFile: drf, planRevision: "rev-drf", options: {} };
  host.beginPlanSubmissionProgress(message(), { planFile: drf, planRevision: "rev-drf" });
  host.distributedQueueCache.deferred = [];
  await host.finishDistributedPlanSubmission("runPlan", message(), { planFile: drf }, body);
  assert.deepEqual(host.calls, ["sync", "preflight", "confirm", "enqueue:[0]"]);
  assert.equal(host.localOperations["plan-submit-click-drf"].status, "succeeded");

  host.calls = [];
  host.distributedQueueCache.deferred = [deferredRow()];
  await host.finishDistributedPlanSubmission("runPlan", { ...message(), deferredPlanId: "deferred-drf" }, { planFile: drf }, { ...body, deferredPlanId: "deferred-drf" });
  assert.deepEqual(host.calls, ["sync", "preflight", "confirm", "enqueue:[0]"]);
  assert.equal(host.distributedQueueCache.deferred[0].status, "superseded");

  const blockedHost = commandHost();
  blockedHost.distributedQueueCache.deferred = [deferredRow({ id: "blocked-drf", status: "blocked" })];
  blockedHost.beginPlanSubmissionProgress({ ...message(), clientActionId: "click-blocked" }, { planFile: drf, planRevision: "rev-drf" });
  await blockedHost.finishDistributedPlanSubmission("runPlan", { ...message(), clientActionId: "click-blocked", deferredPlanId: "blocked-drf" }, { planFile: drf }, { ...body, deferredPlanId: "blocked-drf" });
  assert.equal(blockedHost.calls[0], "sync");
  assert.equal(blockedHost.calls.includes("preflight"), true);
  assert.equal(blockedHost.distributedQueueCache.deferred[0].status, "superseded");

  const mismatched = commandHost();
  mismatched.distributedQueueCache.deferred = [deferredRow()];
  await assert.rejects(
    () => mismatched.finishDistributedPlanSubmission("runPlan", { ...message(), deferredPlanId: "deferred-drf" }, { planFile: drf }, { ...body, planRevision: "rev-other", deferredPlanId: "deferred-drf" }),
    /不一致/,
  );
  assert.deepEqual(mismatched.calls, []);
  assert.equal(mismatched.distributedQueueCache.deferred[0].status, "pending");

  const confirmed = commandHost();
  confirmed.distributedQueueCache.deferred = [deferredRow({ confirmedOutputChoice: true })];
  await confirmed.finishDistributedPlanSubmission("runPlan", message(), { planFile: drf }, body);
  assert.equal(confirmed.calls.includes("preflight"), true);
  assert.equal(confirmed.distributedQueueCache.deferred[0].confirmedOutputChoice, true);
  assert.equal(confirmed.distributedQueueCache.deferred[0].status, "pending");
});

test("direct distributed submission confirms once and enqueues once", async () => {
  const host = commandHost();
  host.beginPlanSubmissionProgress(message(), { planFile: drf, planRevision: "rev-drf" });
  await host.finishDistributedPlanSubmission("runPlan", message(), { planFile: drf }, host.actionBody(message()));
  assert.deepEqual(host.calls, ["sync", "preflight", "confirm", "enqueue:[0]"]);
  assert.equal(host.localOperations["plan-submit-click-drf"].status, "succeeded");
});

test("direct submission confirms once and enqueues once", async () => {
  const host = provider();
  const body = { planFile: drf, options: {} };
  assert.equal(await host.distributedCodeVersionHold(body), undefined);
  await host.ensureCodeReadyForRun();
  const checked = await host.runPlanPreflight(body, "当前计划", {}, () => {});
  await host.confirmDistributedPlanExistingOutputs({}, body, checked);
  await host.enqueueDistributedPlan(body, checked);
  assert.deepEqual(host.calls, ["sync", "preflight", "confirm", "enqueue:[0]"]);
});

test("cancel and failed preflight become terminal progress states", () => {
  const host = provider();
  host.beginPlanSubmissionProgress(message(), { planFile: drf });
  host.finishPlanSubmissionProgress(message(), "cancelled", "已取消，未提交运行。");
  assert.equal(host.localOperations["plan-submit-click-drf"].status, "cancelled");
  host.localOperations = {};
  host.beginPlanSubmissionProgress(message(), { planFile: drf });
  host.finishPlanSubmissionProgress(message(), "failed", "校验未通过");
  assert.equal(host.localOperations["plan-submit-click-drf"].status, "failed");
  assert.match(renderExecution(progressState(host)).executionPlanList, /失败|校验未通过/);
});

test("deferred replay keeps the saved skip choice and blocks a changed fingerprint", async () => {
  const host = provider();
  const deferred = { id: "d1", planFile: drf, codeFingerprint: "new-code", status: "pending", confirmedOutputChoice: true,
    overwriteExisting: false, distributedSkipJobIndices: [0], body: { planFile: drf, overwriteExisting: false, distributedSkipJobIndices: [0], options: {} } };
  host.distributedQueueCache.deferred = [deferred];
  const body = JSON.parse(JSON.stringify(deferred.body));
  body.distributedSkipJobIndices = [];
  body.overwriteExisting = true;
  body.overwriteExisting = deferred.overwriteExisting === true;
  body.distributedSkipJobIndices = body.overwriteExisting ? [] : deferred.distributedSkipJobIndices.slice();
  await host.runPlanPreflight(body, "排队计划", {}, () => {});
  body.overwriteExisting = deferred.overwriteExisting === true;
  body.distributedSkipJobIndices = body.overwriteExisting ? [] : deferred.distributedSkipJobIndices.slice();
  assert.deepEqual(body.distributedSkipJobIndices, [0]);
  assert.equal(body.overwriteExisting, false);
  host.localDistributedCodeFingerprint = async () => "changed-code";
  const changed = await host.localDistributedCodeFingerprint(root);
  assert.notEqual(changed, deferred.codeFingerprint);
  host.distributedQueueCache.deferred = [{ ...deferred, status: "blocked", error: "排队期间本机代码已变更，请重新提交该 Plan 以固定新版本" }];
  const html = renderTask({ planFileInput: drf, distributedPlans: [{ id: "old", planFile: "experiments/plans/old.yaml", revision: "r0", jobs: [{ index: 1, case: "pad", seed: 7, status: "failed" }] }],
    deferredPlans: host.distributedQueueCache.deferred, schedulerStates: [] });
  assert.match(html.taskSummary, /已阻塞，需要继续提交/);
  assert.match(html.taskSummary, /其他 Plan 的历史与待处理记录/);
  assert.match(html.taskSummary, /恢复 pad seed 7/);
  assert.doesNotMatch(html.taskSummary.split("其他 Plan 的历史与待处理记录")[0], /恢复 pad seed 7/);
});

test("plan check acceptance follows the real validate payload", () => {
  const accepted = new Function(`${functionSource("planCheckAccepted")}; return planCheckAccepted;`.replace("function planCheckAccepted", "function planCheckAccepted"))();
  global.operationStatusToken = (value) => String(value || "").toLowerCase();
  global.resultStatus = (result) => result && (result.status || result.state) || "";
  global.remoteActionSucceeded = (value) => ["completed", "succeeded", "done"].includes(String(value));
  const jobs = [{ index: 0, case: "bus", output_dir: "work/bus" }];
  assert.equal(accepted({ ok: true, validation: { jobs } }), true);
  assert.equal(accepted({ status: "completed", validation: { jobs } }), true);
  assert.equal(accepted({ ok: false, validation: { jobs } }), false);
  assert.equal(accepted({ status: "failed", validation: { jobs } }), false);
  assert.equal(accepted({ status: "" }), false);
  assert.equal(accepted({ ok: true, validation: { jobs: [] } }), false);
});

test("unconfirmed deferred rows are blocked instead of auto dispatched", () => {
  const tickStart = extension.indexOf("if (deferred.confirmedOutputChoice !== true)");
  assert.ok(tickStart > 0);
  const tick = extension.slice(tickStart, tickStart + 700);
  assert.match(tick, /confirmedOutputChoice !== true/);
  assert.match(tick, /尚未校验\/尚未确认已有产物/);
  assert.doesNotMatch(tick.slice(0, tick.indexOf("} else {")), /confirmDistributedPlanExistingOutputs|enqueueDistributedPlan|ensureCodeReadyForRun/);
  assert.doesNotMatch(extension, /runLocalDistributedPlanCheck|localPlanCheck/);
});

test("skipping every existing job closes the continued row without a new run", async () => {
  const enqueue = new Function("workspaceRoot", "operationResultPlanFile", "makeOpId", "DistributedPlanQueue", "vscode", "errorMessage", `
    return ${method("enqueueDistributedPlan").replace("async enqueueDistributedPlan", "async function").replace(/ as const/g, "")};
  `)(() => root, (body) => body.planFile, () => "new-plan", DistributedPlanQueue,
    { window: { showInformationMessage: () => Promise.resolve() } }, (error) => String(error));
  const previous = { id: "deferred-drf", planFile: drf, revision: "rev-drf", codeFingerprint: "new-code", status: "blocked", confirmedOutputChoice: false };
  const host = {
    distributedQueueTickPromise: undefined,
    lastCodeSyncState: { fingerprint: "new-code" },
    queue: { schemaVersion: 1, plans: [], deferred: [previous] },
    async loadDistributedQueue() { return this.queue; },
    async saveDistributedQueue(_root, next) { this.queue = next; },
    postState() {},
  };
  const result = await enqueue.call(host, { planFile: drf, planRevision: "rev-drf", distributedSkipJobIndices: [0], options: {} },
    validation(), false, previous.id);
  assert.equal(result.enqueued, false);
  assert.equal(host.queue.plans.length, 0);
  assert.equal(host.queue.deferred[0].status, "superseded");
  assert.equal(host.queue.deferred[0].supersededBy, "skip-all");
});

function datasetFromHtml(html, label) {
  const buttons = [...html.matchAll(/<button\b[^>]*>[^<]*<\/button>/g)].map((item) => item[0]);
  const button = buttons.find((item) => item.includes(label));
  assert.ok(button, label);
  const dataset = {};
  for (const match of button.matchAll(/data-([a-z0-9-]+)="([^"]*)"/g)) {
    dataset[match[1].replace(/-([a-z])/g, (_all, letter) => letter.toUpperCase())] = match[2];
  }
  return dataset;
}

function buttonDatasetActionPayload(button) {
  const start = panel.indexOf("function buttonDatasetActionPayload");
  const end = panel.indexOf("function showStatusCardContextMenu", start);
  return vm.runInNewContext(`${panel.slice(start, end)}\nbuttonDatasetActionPayload(button)`, { button });
}

function progressState(host) {
  return { planFileInput: drf, operations: host.localOperations, distributedPlans: [], deferredPlans: [], schedulerStates: [] };
}

function renderExecution(state) {
  return renderPanel(["normalizePlanSelectionKey", "operationIsActive", "operationIsFailureLike", "operationHasDeadEvidence", "renderExecutionPlanList"], state, ["executionPlanList"]);
}

function renderTask(state) {
  return renderPanel(["taskSectionViewModelForState", "renderTaskSection"], state, ["taskSummary"]);
}

function renderPanel(names, state, ids) {
  const html = {};
  const sandbox = {
    executionHistoryRowsCacheState: null,
    executionHistoryRowsCacheValue: null,
    taskSectionViewCacheState: null,
    taskSectionViewCacheScope: "",
    taskSectionViewCacheValue: null,
    taskPlanScope: "selected",
    setHtmlIfChanged: (id, value) => { html[id] = value; return true; },
    esc: (value) => String(value ?? ""),
    escAttr: (value) => String(value ?? ""),
    compactPath: (value) => String(value || "").split("/").slice(-1)[0],
    compactIdentifier: (value) => String(value || "-"),
    statusClass: () => "status",
    taskStatusLabel: (value) => String(value),
    renderTaskPlanCompletionNext: () => "",
    renderTaskBatchActions: () => {},
    renderTaskCards: () => "",
    renderTaskDetailPane: () => {},
    invalidateSelectedTaskPayload: () => {},
    executionHistoryRowVisible: () => true,
    normalizePlanSelectionKey: (value) => String(value || "").replace(/\\/g, "/").replace(/^\.\//, ""),
    samePlanSelection: (left, right) => String(left || "").replace(/\\/g, "/").endsWith(String(right || "").replace(/\\/g, "/")),
    planFileEquivalenceEntry: (value) => { const key = String(value || "").split("/").pop(); return { keys: [key], keySet: new Set([key]) }; },
    operationRowsForState: (data) => Object.values((data && data.operations) || {}),
    operationRowsForInput: (input) => Object.values(input || {}),
    taskSelectionSetsForState: () => ({ hiddenLegacyTaskUiKeys: new Set() }),
    schedulerRowsForState: () => [],
    taskRowsForPlanScope: () => ({ rows: [], scoped: true, selectedPlanFile: state.planFileInput || "", selectedPlanRevision: "", selectedCount: 0, totalCount: 0 }),
    planFromContext: () => ({}),
    taskPlanFile: () => "",
    taskStatusToken: () => "",
    TASK_LIVE_STATUS_TOKENS: new Set(),
    TASK_QUEUED_STATUSES: new Set(),
    taskRowsViewModel: () => ({ counts: {}, selectedRows: [], visibleRows: [], detailRow: undefined }),
    OPERATION_ACTIVE_MATCH_TOKENS: ["running", "queued", "pending"],
    OPERATION_FAILURE_MATCH_TOKENS: ["failed"],
    operationIsActive: (status) => ["running", "queued", "pending"].includes(String(status)),
    operationIsFailureLike: (status) => String(status) === "failed",
    operationHasDeadEvidence: () => false,
    taskSectionViewModelForState: () => ({ selected: new Set(), allRows: [], scope: { selectedPlanFile: state.planFileInput, selectedCount: 0, scoped: true, totalCount: 0, selectedPlanRevision: "" }, rows: [], taskView: { counts: {}, selectedRows: [], visibleRows: [], detailRow: undefined } }),
    loadingPrefix: () => "",
    planBaseName: (value) => String(value).split("/").pop(),
    detailsOpenAttr: () => "",
    selectedExecutionPlanFile: state.planFileInput,
    renderOperationItem: (row) => {
      const rawType = String(row.type || "");
      const label = rawType === "run-plan" ? "运行计划" : rawType;
      const abortable = ["running", "queued", "pending"].includes(String(row.status)) && row.reconcileEvidenceActive !== false && rawType === "run-plan";
      return `<div class="operationItem">${label} ${row.planFile} ${row.status} ${row.message || ""}${abortable ? " abortScheduler" : ""}</div>`;
    },
  };
  vm.createContext(sandbox);
  const script = names.map((name) => extract(name)).join("\n");
  vm.runInContext(script, sandbox);
  vm.runInContext(`${names.at(-1)}(state)`, vm.createContext({ ...sandbox, state }));
  return html;
}

function extract(name) {
  const start = panel.indexOf(`function ${name}(`);
  assert.ok(start >= 0, name);
  const next = panel.indexOf("\n    function ", start + 1);
  return panel.slice(start, next);
}
