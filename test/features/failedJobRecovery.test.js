const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
function load(name, imports = {}) {
  const file = path.resolve(__dirname, "../../src/features/" + name + ".ts");
  const mod = new Module(file, module);
  mod.filename = file; mod.paths = Module._nodeModulePaths(path.dirname(file));
  const original = mod.require.bind(mod);
  mod.require = key => imports[key] || original(key);
  mod._compile(ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);
  return mod.exports;
}
const Q = load("DistributedPlanQueue");
const R = load("FailedJobRecovery", { "./DistributedPlanQueue": Q });
const root = "D:/project", server = { host: "example-worker", user: "researcher", port: 22, remotePath: "/srv/project" };
function fixture(mode = "train") {
  let queue = { schemaVersion: 1, plans: [{ id: "workflow-123456", projectId: Q.canonicalProjectId(root),
    planFile: "experiments/plans/comparison_tuning/cpsc.yaml", revision: "rev", codeFingerprint: "code",
    executionMode: mode, schedulingMode: "server_prequeue", enqueuedAt: new Date(0).toISOString(), planJobCount: 18,
    jobs: Array.from({ length: 18 }, (_, index) => ({ index, case: "case" + index, seed: 42, attempt: 1,
      status: index ? "completed" : "failed", workerId: "old-worker", commandId: "command-" + index,
      runKey: "command-" + index, gpuId: "1", outputDir: `work_dirs/cpsc/${index}/attempts/workflow-123456`,
      error: index ? undefined : "Agent restarted without pane" })) }] };
  let active = true, actions = [], stops = 0, ids = 0, snapshotError, capability = true, reply,
    snapshotStatus = "failed", waitCount = 0, context = { root };
  const original = structuredClone(queue.plans[0]);
  const proof = () => ({ projectId: original.projectId, workflowId: original.id, planFile: original.planFile,
    planRevision: original.revision, codeFingerprint: original.codeFingerprint, experimentIndex: 0,
    ...original.jobs[0] });
  const client = {
    getWorkerTasks: async () => { if (snapshotError) throw snapshotError;
      return { capabilities: { failedAttemptQuarantine: capability }, tasks: [{ ...proof(), status: snapshotStatus }] }; },
    postWorkerAction: async (worker, action, request) => { actions.push({ worker, action, request });
      return reply || { status: "accepted", operationId: request.opId }; },
  };
  const host = { client, distributedQueueGeneration: 0,
    captureProjectContext: () => context, projectContextIsCurrent: value => active && value === context,
    loadDistributedQueue: async () => structuredClone(queue),
    saveDistributedQueue: async (_, _unused, options) => { queue = options.mutateLatest(structuredClone(queue)); },
    workerCodeSyncTargets: () => [{ id: "old-worker" }], sftpServerOptions: () => server,
    detachStaleDistributedTick() {}, postState() {}, tickDistributedQueue: async () => {}, recordActionError() {},
    stopDistributedJobForClear: async (plan, job) => { assert.equal(plan.id, original.id); assert.equal(job.commandId, "command-0"); stops++; },
    withRemoteActionResource: async (_worker, _action, _request, callback) => callback(),
    waitForOperationTerminalResult: async (_, submitted) => { waitCount++; const row = queue.failedAttemptRecoveries[0];
      return { ...proof(), status: "completed", recoveryId: row.id, quarantined: true, absolutePath: row.absolutePath, destination: row.destination }; },
  };
  const message = { planId: original.id, planFile: original.planFile, jobIndex: 0, attempt: 1, commandId: "command-0" };
  return { host, message, original, actions, proof, id: kind => `${kind}-12345678-${++ids}`,
    get queue() { return queue; }, get stops() { return stops; }, get waitCount() { return waitCount; },
    setActive: value => active = value, offline: () => snapshotError = Error("offline"), online: () => snapshotError = undefined,
    capability: value => capability = value, reply: value => reply = value, snapshotStatus: value => snapshotStatus = value,
  };
}
test("offline recall creates just one local attempt and preserves all execution modes and successful siblings", async () => {
  for (const mode of ["train", "test", "train_test"]) {
    const f = fixture(mode); f.offline(); let confirmation;
    const result = await R.recallFailedJobFromUi(f.host, f.message, async text => (confirmation = text, true), f.id);
    assert.equal(result.status, "completed");
    const plan = f.queue.plans[0], job = plan.jobs[0];
    assert.equal(plan.executionMode, mode); assert.equal(plan.schedulingMode, "server_prequeue");
    assert.deepEqual(plan.jobs.slice(1), f.original.jobs.slice(1));
    assert.equal(job.status, "pending"); assert.equal(job.attempt, 2); assert.equal(job.localQueueOnly, true);
    assert.equal(job.workerId, undefined); assert.equal(job.commandId, undefined);
    assert.equal(job.history[0].outputDir, f.original.jobs[0].outputDir);
    assert.equal(f.queue.failedAttemptRecoveries[0].job.commandId, "command-0");
    assert.match(confirmation, /researcher@example-worker:22/); assert.ok(confirmation.includes("/srv/project/clean_dir/"));
    assert.equal(f.actions.length, 0);
    const allocated = Q.allocateAvailable(f.queue, [
      { workerId: "old-worker", online: false, idleGpuIds: ["0"], codeFingerprint: "code", idleGpuAdmission: true },
      { workerId: "healthy-worker", online: true, idleGpuIds: ["0"], codeFingerprint: "code", idleGpuAdmission: true },
    ], { localIdleOnly: true, requireIdleGpuAdmission: true });
    assert.equal(allocated.dispatches.length, 1); assert.equal(allocated.dispatches[0].workerId, "healthy-worker");
    await assert.rejects(R.recallFailedJobFromUi(f.host, f.message, async () => true, f.id), /目标失败 job 已变化/);
    assert.equal(f.queue.failedAttemptRecoveries.length, 1);
  }
});
test("confirmation cancellation, project changes and concurrent job changes cannot queue a new attempt", async () => {
  let f = fixture(); const before = structuredClone(f.queue);
  await R.recallFailedJobFromUi(f.host, f.message, async () => false, f.id); assert.deepEqual(f.queue, before);
  f = fixture(); await R.recallFailedJobFromUi(f.host, f.message, async () => { f.setActive(false); return true; }, f.id);
  assert.equal(f.queue.plans[0].jobs[0].attempt, 1);
  f = fixture(); const save = f.host.saveDistributedQueue;
  f.host.saveDistributedQueue = async (...args) => { f.queue.plans[0].jobs[0].status = "running"; return save(...args); };
  await assert.rejects(R.recallFailedJobFromUi(f.host, f.message, async () => true, f.id), /身份、状态/);
});
test("remote obligations survive restart, back off offline, and never block or overwrite the new job", async () => {
  const f = fixture(); await R.recallFailedJobFromUi(f.host, f.message, async () => true, f.id);
  const pendingJob = structuredClone(f.queue.plans[0].jobs[0]); f.offline();
  await R.processFailedAttemptRecoveries(f.host, root, f.id, 1000);
  let row = f.queue.failedAttemptRecoveries[0]; assert.equal(row.tries, 1); assert.equal(Date.parse(row.retryAt), 31000);
  await R.processFailedAttemptRecoveries(f.host, root, f.id, 2000); assert.equal(row.tries, 1); assert.equal(f.actions.length, 0);
  f.online(); f.capability(false);
  await R.processFailedAttemptRecoveries(f.host, root, f.id, 32000); assert.equal(f.actions.length, 0);
  f.capability(true);
  await R.processFailedAttemptRecoveries(f.host, root, f.id, 100000);
  row = f.queue.failedAttemptRecoveries[0]; assert.equal(row.status, "completed"); assert.equal(f.waitCount, 1);
  assert.equal(f.actions[0].action, "archive-worker-artifacts"); assert.equal(f.actions[0].request.targetCommandId, "command-0");
  assert.deepEqual(f.queue.plans[0].jobs[0], pendingJob);
  await R.processFailedAttemptRecoveries(f.host, root, f.id, 200000); assert.equal(f.actions.length, 1);
});
test("a restored active original attempt is stopped by its full identity; completed originals are retained", async () => {
  const f = fixture(); await R.recallFailedJobFromUi(f.host, f.message, async () => true, f.id); f.snapshotStatus("running");
  await R.processFailedAttemptRecoveries(f.host, root, f.id, 1000); assert.equal(f.stops, 1);
  const g = fixture(); await R.recallFailedJobFromUi(g.host, g.message, async () => true, g.id); g.snapshotStatus("completed");
  await R.processFailedAttemptRecoveries(g.host, root, g.id, 1000);
  assert.equal(g.actions.length, 0); assert.equal(g.stops, 0); assert.equal(g.queue.failedAttemptRecoveries[0].status, "blocked");
});
test("wrong identity, failed receipt and changed server authorization never confirm cleanup", async () => {
  for (const patch of [{ seed: 43 }, { commandId: "another-job" }, { status: "failed" }]) {
    const f = fixture(); await R.recallFailedJobFromUi(f.host, f.message, async () => true, f.id);
    const row = f.queue.failedAttemptRecoveries[0];
    f.reply({ ...f.proof(), status: "completed", quarantined: true, recoveryId: row.id, absolutePath: row.absolutePath, destination: row.destination, ...patch });
    await R.processFailedAttemptRecoveries(f.host, root, f.id, 1000);
    assert.equal(f.queue.failedAttemptRecoveries[0].status, "pending");
  }
  const f = fixture(); await R.recallFailedJobFromUi(f.host, f.message, async () => true, f.id);
  f.host.sftpServerOptions = () => ({ ...server, user: "other-user" });
  await R.processFailedAttemptRecoveries(f.host, root, f.id, 1000); assert.equal(f.actions.length, 0);
  assert.throws(() => R.failedAttemptPaths("/srv/project", "work_dirs/a/attempts/../escape"));
});
test("late original receipts cannot restore the failed attempt over its replacement", async () => {
  const f = fixture(); await R.recallFailedJobFromUi(f.host, f.message, async () => true, f.id);
  const restarted = JSON.parse(JSON.stringify(f.queue));
  const merged = Q.mergeDurableWorkerSnapshots(restarted, [{ workerId: "old-worker", capabilities: { durablePlanQueue: true },
    fetchedAt: new Date().toISOString(), generatedAt: new Date().toISOString(), tasks: [{ ...f.proof(), status: "failed" }] }], Q.canonicalProjectId(root));
  assert.equal(merged.plans[0].jobs[0].attempt, 2); assert.equal(merged.failedAttemptRecoveries.length, 1);
});
