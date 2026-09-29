const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");
const queueSourcePath = path.join(__dirname, "../../src/features/DistributedPlanQueue.ts");
const compiledQueue = ts.transpileModule(fs.readFileSync(queueSourcePath, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const queueModule = new Module(queueSourcePath, module);
queueModule.filename = queueSourcePath;
queueModule.paths = Module._nodeModulePaths(path.dirname(queueSourcePath));
queueModule._compile(compiledQueue, queueSourcePath);
const queue = queueModule.exports;

function plan(name, fingerprint = "code-a") {
  return { planFile: `experiments/plans/comparison/${name}.yaml`, revision: `rev-${name}`, codeFingerprint: fingerprint,
    jobs: ["bus", "pad"].flatMap((caseName, c) => [42, 43, 44].map((seed, s) => ({ index: c * 3 + s, case: caseName, seed, outputDir: `work_dirs/${name}/${caseName}_${seed}` }))) };
}

test("one Worker takes a Plan when it has enough idle GPU slots", () => {
  const input = queue.enqueuePlan(queue.emptyDistributedQueue(), plan("a"), "run-a");
  const result = queue.allocateAvailable(input, [{ workerId: "nwpu2", idleGpuIds: ["0", "1", "2", "3", "4", "5"], online: true }, { workerId: "nwpu3", idleGpuIds: ["0"], online: true }]);
  assert.equal(result.dispatches.length, 6);
  assert.deepEqual(new Set(result.dispatches.map((row) => row.workerId)), new Set(["nwpu2"]));
});

test("Case first, then seed spill; next Plan uses remaining slots without waiting for completion", () => {
  let input = queue.enqueuePlan(queue.emptyDistributedQueue(), plan("a"), "run-a");
  input = queue.enqueuePlan(input, plan("b"), "run-b");
  const first = queue.allocateAvailable(input, [
    { workerId: "nwpu2", idleGpuIds: ["0", "1", "2"], online: true },
    { workerId: "nwpu3", idleGpuIds: ["0", "1"], online: true },
    { workerId: "nwpu5", idleGpuIds: ["0", "1"], online: true },
  ]);
  assert.deepEqual(first.dispatches.slice(0, 3).map((row) => row.workerId), ["nwpu2", "nwpu2", "nwpu2"]);
  assert.equal(first.dispatches.filter((row) => row.planId === "run-a").length, 6);
  assert.equal(first.dispatches.filter((row) => row.planId === "run-b").length, 1);
});

test("different code revision waits; uncertain job cannot be reassigned", () => {
  let input = queue.enqueuePlan(queue.emptyDistributedQueue(), plan("a"), "run-a");
  input = queue.enqueuePlan(input, plan("b", "code-b"), "run-b");
  const first = queue.allocateAvailable(input, [{ workerId: "nwpu2", idleGpuIds: ["0", "1", "2", "3", "4", "5", "6"], online: true }]);
  assert.equal(first.dispatches.length, 6);
  const record = first.dispatches[0];
  const uncertain = queue.setJobState(first.queue, record.planId, record.jobIndex, "unknown", record.commandId);
  assert.equal(queue.allocateAvailable(uncertain, [{ workerId: "nwpu3", idleGpuIds: ["0"], online: true }]).dispatches.length, 0);
});

test("verified recovery creates a new attempt and retains the prior run", () => {
  const input = queue.enqueuePlan(queue.emptyDistributedQueue(), { ...plan("a"), jobs: [{
    index: 0, case: "bus", seed: 42, outputDir: "work_dirs/a/bus/seed_42/attempts/run-a",
  }] }, "run-a");
  const first = queue.allocateAvailable(input, [{ workerId: "nwpu2", idleGpuIds: ["0"], online: true }]);
  const failed = queue.setJobState(first.queue, "run-a", 0, "failed", first.dispatches[0].commandId);
  const recovered = queue.retryVerifiedJob(failed, "run-a", 0, "run-retry-1234");
  const job = recovered.plans[0].jobs[0];
  assert.equal(job.attempt, 2);
  assert.equal(job.status, "pending");
  assert.equal(job.outputDir, "work_dirs/a/bus/seed_42/attempts/run-retry-1234");
  assert.equal(job.history[0].outputDir, "work_dirs/a/bus/seed_42/attempts/run-a");
});

test("a request blocked locally returns to the queue without losing its job", () => {
  const input = queue.enqueuePlan(queue.emptyDistributedQueue(), plan("a"), "run-a");
  const first = queue.allocateAvailable(input, [{ workerId: "nwpu2", idleGpuIds: ["0"], online: true }]);
  const blocked = first.dispatches[0];
  const reset = queue.resetUnsentDispatch(first.queue, blocked.planId, blocked.jobIndex, blocked.commandId);
  const job = reset.plans[0].jobs[0];
  assert.equal(job.status, "pending");
  assert.equal(job.commandId, undefined);
  assert.equal(queue.allocateAvailable(reset, [{ workerId: "nwpu3", idleGpuIds: ["1"], online: true }]).dispatches.length, 1);
});

test("an explicit idle GPU admission rejection releases only the matching reservation", () => {
  const input = queue.enqueuePlan(queue.emptyDistributedQueue(), { ...plan("busy"), jobs: [
    { index: 0, case: "bus", seed: 42, outputDir: "work_dirs/busy/bus/attempts/run-a" },
  ] }, "run-busy");
  const allocation = queue.allocateAvailable(input, [{ workerId: "nwpu5", idleGpuIds: ["2"], online: true }]);
  const dispatch = allocation.dispatches[0];
  const planRow = allocation.queue.plans[0];
  const job = planRow.jobs[0];
  const rejected = { durableAccepted: false, admissionRejected: true, status: "pending", reason: "gpu_busy",
    commandId: dispatch.commandId, workerId: dispatch.workerId, gpuId: dispatch.gpuId, workflowId: planRow.id,
    planFile: planRow.planFile, planRevision: planRow.revision, case: job.case, seed: job.seed,
    attempt: job.attempt, outputDir: job.outputDir };
  const reset = queue.resetBusyRejectedDispatch(allocation.queue, dispatch, rejected);
  assert.equal(reset.plans[0].jobs[0].status, "pending");
  assert.equal(reset.plans[0].jobs[0].workerId, undefined);
  assert.equal(reset.plans[0].jobs[0].commandId, undefined);
  assert.deepEqual(queue.resetBusyRejectedDispatch(allocation.queue, dispatch, { ...rejected, durableAccepted: true }), allocation.queue);
  assert.deepEqual(queue.resetBusyRejectedDispatch(allocation.queue, dispatch, { ...rejected, gpuId: "0" }), allocation.queue);
});

test("queued reassignment requires an exact atomic release proof and advances the attempt", () => {
  const input = queue.enqueuePlan(queue.emptyDistributedQueue(), { ...plan("release"), jobs: [
    { index: 0, case: "bus", seed: 42, outputDir: "work_dirs/release/bus/attempts/run-old" },
  ] }, "run-release");
  const allocation = queue.allocateAvailable(input, [{ workerId: "nwpu5", idleGpuIds: ["2"], online: true }]);
  const dispatch = allocation.dispatches[0];
  let accepted = queue.setJobState(allocation.queue, "run-release", 0, "queued", dispatch.commandId);
  accepted.plans[0].jobs[0].reassignmentPending = true;
  const planRow = accepted.plans[0];
  const job = planRow.jobs[0];
  const release = { durableReleased: true, durableAccepted: true, status: "cancelled", stopReason: "requeue",
    commandId: job.commandId, targetCommandId: job.commandId, workerId: job.workerId, gpuId: job.gpuId,
    workflowId: planRow.id, projectId: planRow.projectId, planRevision: planRow.revision, codeFingerprint: planRow.codeFingerprint,
    planJobCount: planRow.planJobCount, planFile: planRow.planFile, experimentIndex: job.index, case: job.case,
    seed: job.seed, attempt: job.attempt, outputDir: job.outputDir, runKey: job.runKey, finishedAt: "2026-09-29T12:00:00.000Z" };
  const migrated = queue.releaseQueuedForReassignment(accepted, planRow.id, job.index, release, "run-next");
  const next = migrated.plans[0].jobs[0];
  assert.equal(next.status, "pending");
  assert.equal(next.attempt, 2);
  assert.equal(next.workerId, undefined);
  assert.equal(next.commandId, undefined);
  assert.equal(next.outputDir, "work_dirs/release/bus/attempts/run-next");
  assert.equal(next.history[0].status, "cancelled");
  assert.equal(next.history[0].stopReason, "requeue");
  assert.equal(next.history[0].finishedAt, release.finishedAt);
  assert.equal(next.history[0].commandId, job.commandId);
  for (const invalid of [{ ...release, durableReleased: false }, { ...release, stopReason: "scheduler_aborted" }, { ...release, attempt: 2 }]) {
    assert.throws(() => queue.releaseQueuedForReassignment(accepted, planRow.id, job.index, invalid, "run-next"));
  }
  assert.throws(() => queue.releaseQueuedForReassignment(accepted, planRow.id, job.index, { ...release, planJobCount: 99 }, "run-next"));
  assert.throws(() => queue.releaseQueuedForReassignment(allocation.queue, planRow.id, job.index, release, "run-next"));
});

test("idle GPU evidence fails closed for missing process, memory, utilization, or server rows", () => {
  const valid = { index: "0", utilizationPercent: 1, memoryUsedMb: 50, processCount: 0 };
  const complete = queue.freshIdleGpuEvidence({ nwpu3: [valid], nwpu5: [valid] }, ["nwpu3", "nwpu5"], 5, 200);
  assert.equal(complete.complete, true);
  assert.deepEqual(complete.idleGpuIdsByWorker.get("nwpu3"), ["0"]);
  assert.equal(queue.freshIdleGpuEvidence({ nwpu3: [valid] }, ["nwpu3", "nwpu5"], 5, 200).complete, false);
  assert.equal(queue.freshIdleGpuEvidence({ nwpu3: [{ ...valid, processCount: 1 }] }, ["nwpu3"], 5, 200)
    .idleGpuIdsByWorker.get("nwpu3").length, 0);
  assert.equal(queue.freshIdleGpuEvidence({ nwpu3: [{ ...valid, processes: [{ pid: 99 }] }] }, ["nwpu3"], 5, 200)
    .idleGpuIdsByWorker.get("nwpu3").length, 0);
  assert.equal(queue.freshIdleGpuEvidence({ nwpu3: [{ index: "0", utilizationPercent: 1, memoryUsedMb: 50 }] }, ["nwpu3"], 5, 200).complete, false);
  assert.equal(queue.freshIdleGpuEvidence({ nwpu3: [{ ...valid, utilizationPercent: "" }] }, ["nwpu3"], 5, 200).complete, false);
  assert.equal(queue.freshIdleGpuEvidence({ nwpu3: [{ ...valid, processCount: -1 }] }, ["nwpu3"], 5, 200).complete, false);
});

test("crash before send retries the same pinned command only after fresh owner evidence", () => {
  const input = queue.enqueuePlan(queue.emptyDistributedQueue(), { ...plan("crash"), jobs: [
    { index: 0, case: "bus", seed: 42, outputDir: "work_dirs/crash/bus/attempts/run-a" },
  ] }, "run-crash");
  const allocated = queue.allocateAvailable(input, [{ workerId: "nwpu3", idleGpuIds: ["0"], online: true }]);
  const dispatch = allocated.dispatches[0];
  const now = Date.now();
  const snapshot = { workerId: dispatch.workerId, capabilities: { durablePlanQueue: true, idleGpuAdmission: true, schemaVersion: 1 },
    generatedAt: new Date(now).toISOString(), fetchedAt: new Date(now).toISOString(), tasks: [] };
  assert.deepEqual(queue.retryPinnedDispatch(allocated.queue, dispatch.planId, dispatch.jobIndex, snapshot, [dispatch.gpuId], now), dispatch);
  assert.equal(queue.retryPinnedDispatch(allocated.queue, dispatch.planId, dispatch.jobIndex, snapshot, [], now), undefined);
  const job = allocated.queue.plans[0].jobs[0];
  const acceptedTask = { ...job, workflowId: allocated.queue.plans[0].id, planFile: allocated.queue.plans[0].planFile,
    planRevision: allocated.queue.plans[0].revision, codeFingerprint: allocated.queue.plans[0].codeFingerprint,
    projectId: allocated.queue.plans[0].projectId, planJobCount: allocated.queue.plans[0].planJobCount,
    experimentIndex: job.index, workerId: job.workerId, runKey: job.runKey, status: "queued" };
  assert.equal(queue.retryPinnedDispatch(allocated.queue, dispatch.planId, dispatch.jobIndex,
    { ...snapshot, tasks: [acceptedTask] }, [dispatch.gpuId], now), undefined);
  assert.equal(queue.retryPinnedDispatch(allocated.queue, dispatch.planId, dispatch.jobIndex,
    { ...snapshot, fetchedAt: new Date(now - 181_000).toISOString() }, [dispatch.gpuId], now), undefined);
});

test("fresh idle GPU slots skip a saturated earlier Worker and never reserve busy cards", () => {
  const input = queue.enqueuePlan(queue.emptyDistributedQueue(), { ...plan("late-bind"), jobs: [
    { index: 0, case: "bus", seed: 42, outputDir: "work_dirs/late-bind/bus/attempts/run-a" },
    { index: 1, case: "bus", seed: 43, outputDir: "work_dirs/late-bind/bus/attempts/run-b" },
  ] }, "run-late-bind");
  const result = queue.allocateAvailable(input, [
    { workerId: "nwpu5", idleGpuIds: [], online: true, capacity: 8, codeFingerprint: "code-a" },
    { workerId: "nwpu3", idleGpuIds: ["0", "2"], online: true, capacity: 1, codeFingerprint: "code-a" },
  ]);
  assert.deepEqual(result.dispatches.map(({ workerId, gpuId }) => [workerId, gpuId]), [["nwpu3", "0"]]);
  assert.equal(result.queue.plans[0].jobs[1].status, "pending");
  assert.equal(result.queue.plans[0].jobs[1].workerId, undefined);
});

test("local preflight previews the same slots without modifying the persisted queue", () => {
  const input = queue.enqueuePlan(queue.emptyDistributedQueue(), plan("a"), "run-a");
  const workers = [{ workerId: "nwpu2", idleGpuIds: ["0", "1", "2", "3", "4", "5", "6"], online: true }];
  const preview = queue.previewAvailable(input, plan("b"), workers);
  const submitted = queue.enqueuePlan(input, plan("b"), "run-b");
  const actual = queue.allocateAvailable(submitted, workers).dispatches.filter((row) => row.planId === "run-b");
  assert.equal(preview.dispatchableCount, actual.length);
  assert.deepEqual(preview.assignments, actual.map(({ jobIndex, workerId, gpuId }) => ({ jobIndex, workerId, gpuId })));
  assert.equal(input.plans.length, 1);
});

test("an older pending fingerprint does not starve a newer Plan once Workers only have the newer code", () => {
  const older = { ...plan("ebmc", "a84a822d"), jobs: [{ index: 0, case: "bus", seed: 1, outputDir: "work_dirs/ebmc/bus_1" }] };
  const newer = { ...plan("edrl", "ec594411"), jobs: [{ index: 0, case: "pad", seed: 2, outputDir: "work_dirs/edrl/pad_2" }] };
  const input = queue.enqueuePlan(queue.enqueuePlan(queue.emptyDistributedQueue(), older, "old-pending"), newer, "new-pending");
  const workers = [
    { workerId: "nwpu3", idleGpuIds: ["0", "1", "2", "3"], online: true, codeFingerprint: "ec594411" },
    { workerId: "nwpu5", idleGpuIds: ["0", "1"], online: true, codeFingerprint: "ec594411" },
  ];
  const result = queue.allocateAvailable(input, workers);
  assert.deepEqual(result.dispatches.map((row) => row.planId), ["new-pending"]);
  const oldJob = result.queue.plans.find((row) => row.id === "old-pending").jobs[0];
  const newJob = result.queue.plans.find((row) => row.id === "new-pending").jobs[0];
  assert.equal(oldJob.status, "pending");
  assert.equal(oldJob.commandId, undefined);
  assert.match(oldJob.blockReason, /代码指纹不匹配/);
  assert.match(oldJob.blockReason, /重新提交/);
  assert.equal(newJob.status, "dispatching");
  assert.equal(newJob.workerId, "nwpu3");
  assert.equal(queue.fingerprintStillMounted(input, "a84a822d", ["ec594411"]), false);
  assert.equal(queue.fingerprintStillMounted(input, "a84a822d", ["a84a822d"]), true);
});

test("a fingerprint with no idle GPU does not lock out another fingerprint that has free slots", () => {
  const busy = { ...plan("old", "code-old"), jobs: [{ index: 0, case: "bus", seed: 1, outputDir: "work_dirs/old/bus_1" }] };
  const ready = { ...plan("new", "code-new"), jobs: [{ index: 0, case: "pad", seed: 2, outputDir: "work_dirs/new/pad_2" }] };
  const input = queue.enqueuePlan(queue.enqueuePlan(queue.emptyDistributedQueue(), busy, "busy-version"), ready, "ready-version");
  const result = queue.allocateAvailable(input, [
    { workerId: "nwpu3", idleGpuIds: [], online: true, codeFingerprint: "code-old" },
    { workerId: "nwpu5", idleGpuIds: ["0", "1"], online: true, codeFingerprint: "code-new" },
  ]);
  assert.deepEqual(result.dispatches.map((row) => row.planId), ["ready-version"]);
  assert.equal(result.queue.plans.find((row) => row.id === "busy-version").jobs[0].status, "pending");
  assert.equal(result.queue.plans.find((row) => row.id === "busy-version").jobs[0].blockReason, undefined);
});

test("an active fingerprint waits other matching versions and clears the reason when it finishes", () => {
  const active = { ...plan("live", "code-live"), jobs: [{ index: 0, case: "bus", seed: 1, outputDir: "work_dirs/live/bus_1" }] };
  const next = { ...plan("next", "code-next"), jobs: [{ index: 0, case: "pad", seed: 2, outputDir: "work_dirs/next/pad_2" }] };
  let input = queue.enqueuePlan(queue.enqueuePlan(queue.emptyDistributedQueue(), active, "live-plan"), next, "next-plan");
  input = queue.allocateAvailable(input, [{ workerId: "nwpu3", idleGpuIds: ["0"], online: true, codeFingerprint: "code-live" }]).queue;
  input.plans[0].jobs[0].status = "running";
  const held = queue.allocateAvailable(input, [
    { workerId: "nwpu3", idleGpuIds: ["1"], online: true, codeFingerprint: "code-live" },
    { workerId: "nwpu5", idleGpuIds: ["0"], online: true, codeFingerprint: "code-next" },
  ]);
  const waiting = held.queue.plans.find((row) => row.id === "next-plan").jobs[0];
  assert.equal(held.dispatches.length, 0);
  assert.equal(waiting.status, "pending");
  assert.match(waiting.blockReason, /等待当前代码版本/);
  assert.doesNotMatch(waiting.blockReason, /代码指纹不匹配/);
  held.queue.plans.find((row) => row.id === "live-plan").jobs[0].status = "completed";
  const released = queue.allocateAvailable(held.queue, [
    { workerId: "nwpu5", idleGpuIds: ["0"], online: true, codeFingerprint: "code-next" },
  ]);
  const resumed = released.queue.plans.find((row) => row.id === "next-plan").jobs[0];
  assert.equal(resumed.status, "dispatching");
  assert.equal(resumed.blockReason, undefined);
});

test("stop clear removes only the confirmed plan and keeps a failed sibling job", () => {
  let input = queue.enqueuePlan(queue.emptyDistributedQueue(), plan("ebmc"), "run-ebmc");
  input = queue.enqueuePlan(input, plan("keep"), "run-keep");
  input = { ...input, deferred: [{ id: "defer-ebmc", planFile: input.plans[0].planFile, revision: "rev-ebmc", codeFingerprint: "code-a", body: {}, enqueuedAt: "t", status: "blocked" }, { id: "defer-keep", planFile: input.plans[1].planFile, revision: "rev-keep", codeFingerprint: "code-a", body: {}, enqueuedAt: "t", status: "pending" }] };
  const targets = queue.distributedStopTargets(input, "experiments/plans/comparison/ebmc.yaml");
  assert.equal(targets.filter((row) => row.kind === "job").length, 6);
  assert.equal(targets.filter((row) => row.kind === "deferred" && row.status === "blocked").length, 1);
  assert.equal(targets.some((row) => row.tmuxSession || row.tmuxTarget), false);
  const confirmed = new Set(targets.filter((row) => row.kind === "job" && row.jobIndex !== 0).map((row) => `${row.planId}\0${row.jobIndex}\0${row.attempt}`));
  const next = queue.removeConfirmedDistributedPlan(input, "experiments/plans/comparison/ebmc.yaml", { jobKeys: confirmed, deferredIds: new Set(["defer-ebmc"]) });
  assert.deepEqual(next.plans.find((row) => row.id === "run-ebmc").jobs.map((job) => job.index), [0]);
  assert.equal(next.plans.find((row) => row.id === "run-keep").jobs.length, 6);
  assert.deepEqual(next.deferred.map((row) => row.id), ["defer-keep"]);
});

test("stop identity rejects another plan that shares only the worker", () => {
  const input = queue.enqueuePlan(queue.emptyDistributedQueue(), { ...plan("a"), jobs: [{ index: 0, case: "bus", seed: 42, outputDir: "work_dirs/a/bus/attempts/run-a" }] }, "run-a");
  const allocated = queue.allocateAvailable(input, [{ workerId: "worker-a", idleGpuIds: ["0"], online: true }]);
  const current = allocated.queue.plans[0];
  const job = current.jobs[0];
  const identity = { commandId: job.commandId, workflowId: current.id, planRevision: current.revision, planFile: current.planFile, case: job.case, seed: job.seed, attempt: job.attempt, outputDir: job.outputDir, workerId: job.workerId, gpuId: job.gpuId };
  assert.equal(queue.stopIdentityMatchesJob(current, job, identity), true);
  assert.equal(queue.stopIdentityMatchesJob(current, job, { ...identity, commandId: "" }), false);
  assert.equal(queue.stopIdentityMatchesJob(current, job, { ...identity, workflowId: "other-plan" }), false);
  assert.equal(queue.stopIdentityMatchesJob(current, job, { workerId: job.workerId }), false);
});

test("reconnection accepts only the exact persisted Plan, job, attempt and Worker", () => {
  const input = queue.enqueuePlan(queue.emptyDistributedQueue(), { ...plan("a"), jobs: [{
    index: 0, case: "bus", seed: 42, outputDir: "work_dirs/a/bus/attempts/run-a",
  }] }, "run-a");
  const allocated = queue.allocateAvailable(input, [{ workerId: "worker-a", idleGpuIds: ["0"], online: true }]);
  const current = allocated.queue.plans[0];
  const job = current.jobs[0];
  const remote = { commandId: job.commandId, workflowId: current.id, planRevision: current.revision,
    case: job.case, seed: job.seed, attempt: job.attempt, outputDir: job.outputDir,
    workerId: job.workerId, gpuId: job.gpuId, status: "running" };
  assert.equal(queue.remoteTaskMatchesJob(current, job, remote), true);
  for (const [field, value] of [["attempt", 2], ["case", "pad"], ["workerId", "worker-b"],
    ["planRevision", "old"], ["outputDir", "other"]]) {
    assert.equal(queue.remoteTaskMatchesJob(current, job, { ...remote, [field]: value }), false, field);
  }
});

test("cold recovery uses fresh full-identity server rows and preserves the expected job count", () => {
  const now = Date.now();
  const projectId = queue.canonicalProjectId("C:/research/project");
  const snapshot = { workerId: "worker-a", capabilities: { durablePlanQueue: true, schemaVersion: 1 },
    generatedAt: new Date(now).toISOString(), fetchedAt: new Date(now).toISOString(), tasks: [
      { projectId, workflowId: "workflow-a", planFile: "experiments/plans/a.yaml", planRevision: "rev-a",
        codeFingerprint: "code-a", planJobCount: 3, enqueuedAt: new Date(now).toISOString(), experimentIndex: 0,
        case: "case-a", seed: 7, attempt: 1, outputDir: "runs/a/0", runKey: "command-a",
        commandId: "command-a", workerId: "worker-a", status: "queued" },
    ] };
  const recovered = queue.mergeDurableWorkerSnapshots(queue.emptyDistributedQueue(), [snapshot], projectId, now);
  assert.equal(recovered.plans.length, 1);
  assert.equal(recovered.plans[0].planJobCount, 3);
  assert.equal(recovered.plans[0].remoteAcceptedJobCount, 1);
  assert.equal(recovered.plans[0].recoveryMissingCount, 2);
  assert.equal(recovered.plans[0].jobs.length, 1);
  assert.equal(recovered.plans[0].jobs[0].status, "queued");
  assert.equal(recovered.plans[0].jobs[0].gpuId, undefined);
  assert.equal(queue.remoteTaskMatchesJob(recovered.plans[0], recovered.plans[0].jobs[0], snapshot.tasks[0]), true);
});

test("cold recovery ignores old agents, stale snapshots, and another project", () => {
  const now = Date.now();
  const projectId = queue.canonicalProjectId("C:/research/project");
  const task = { projectId, workflowId: "workflow-a", planFile: "a.yaml", planRevision: "rev-a", codeFingerprint: "code-a",
    planJobCount: 1, enqueuedAt: new Date(now).toISOString(), experimentIndex: 0, case: "case-a", seed: 7,
    attempt: 1, outputDir: "runs/a", runKey: "command-a", commandId: "command-a", workerId: "worker-a", status: "queued" };
  const base = { workerId: "worker-a", generatedAt: new Date(now).toISOString(), fetchedAt: new Date(now).toISOString(), tasks: [task] };
  const recovered = queue.mergeDurableWorkerSnapshots(queue.emptyDistributedQueue(), [
    { ...base, capabilities: undefined },
    { ...base, capabilities: { durablePlanQueue: true, schemaVersion: 1 }, generatedAt: new Date(now - 181_000).toISOString() },
    { ...base, capabilities: { durablePlanQueue: true, schemaVersion: 1 }, tasks: [{ ...task, projectId: `${projectId}-other` }] },
  ], projectId, now);
  assert.deepEqual(recovered.plans, []);
});

test("cold recovery keeps a released older attempt as provenance without replacing the newer pending attempt", () => {
  const now = Date.now();
  const projectId = queue.canonicalProjectId("C:/research/project");
  const input = queue.enqueuePlan(queue.emptyDistributedQueue(), { projectId, planJobCount: 1,
    planFile: "experiments/plans/a.yaml", revision: "rev-a", codeFingerprint: "code-a", jobs: [
      { index: 0, case: "case-a", seed: 7, outputDir: "runs/a/attempts/run-new" },
    ] }, "workflow-a");
  input.plans[0].jobs[0].attempt = 2;
  const old = { projectId, workflowId: "workflow-a", planFile: "experiments/plans/a.yaml", planRevision: "rev-a",
    codeFingerprint: "code-a", planJobCount: 1, enqueuedAt: new Date(now).toISOString(), experimentIndex: 0,
    case: "case-a", seed: 7, attempt: 1, outputDir: "runs/a/attempts/run-old", runKey: "command-old",
    commandId: "command-old", workerId: "worker-a", status: "cancelled", stopReason: "requeue", finishedAt: new Date(now).toISOString() };
  const recovered = queue.mergeDurableWorkerSnapshots(input, [{ workerId: "worker-a",
    capabilities: { durablePlanQueue: true, schemaVersion: 1 }, generatedAt: new Date(now).toISOString(),
    fetchedAt: new Date(now).toISOString(), tasks: [old] }], projectId, now);
  const job = recovered.plans[0].jobs.find((row) => row.attempt === 2);
  assert.equal(job.status, "pending");
  assert.equal(job.workerId, undefined);
  assert.equal(job.history[0].status, "cancelled");
  assert.equal(job.history[0].stopReason, "requeue");
});

test("a delayed old queued row contradicting release fences the plan", () => {
  const now = Date.now();
  const projectId = queue.canonicalProjectId("C:/research/project");
  const input = queue.enqueuePlan(queue.emptyDistributedQueue(), { projectId, planJobCount: 1,
    planFile: "experiments/plans/a.yaml", revision: "rev-a", codeFingerprint: "code-a", jobs: [
      { index: 0, case: "case-a", seed: 7, outputDir: "runs/a/attempts/run-new" },
    ] }, "workflow-a");
  input.plans[0].jobs[0].attempt = 2;
  input.plans[0].jobs[0].history = [{ attempt: 1, status: "cancelled", workerId: "worker-a", commandId: "command-old",
    outputDir: "runs/a/attempts/run-old", stopReason: "requeue" }];
  const old = { projectId, workflowId: "workflow-a", planFile: "experiments/plans/a.yaml", planRevision: "rev-a",
    codeFingerprint: "code-a", planJobCount: 1, enqueuedAt: new Date(now).toISOString(), experimentIndex: 0,
    case: "case-a", seed: 7, attempt: 1, outputDir: "runs/a/attempts/run-old", runKey: "command-old",
    commandId: "command-old", workerId: "worker-a", status: "queued" };
  const recovered = queue.mergeDurableWorkerSnapshots(input, [{ workerId: "worker-a",
    capabilities: { durablePlanQueue: true, schemaVersion: 1 }, generatedAt: new Date(now).toISOString(),
    fetchedAt: new Date(now).toISOString(), tasks: [old] }], projectId, now);
  assert.match(recovered.plans[0].recoveryConflict, /overlapping or contradictory/);
});

test("contradictory fresh server copies make the job unknown instead of selecting a winner", () => {
  const now = Date.now();
  const projectId = queue.canonicalProjectId("C:/research/project");
  const task = { projectId, workflowId: "workflow-a", planFile: "a.yaml", planRevision: "rev-a", codeFingerprint: "code-a",
    planJobCount: 1, enqueuedAt: new Date(now).toISOString(), experimentIndex: 0, case: "case-a", seed: 7,
    attempt: 1, outputDir: "runs/a", runKey: "command-a", commandId: "command-a", status: "queued" };
  const snapshot = (workerId, status) => ({ workerId, capabilities: { durablePlanQueue: true, schemaVersion: 1 },
    generatedAt: new Date(now).toISOString(), fetchedAt: new Date(now).toISOString(),
    tasks: [{ ...task, workerId, status }] });
  const recovered = queue.mergeDurableWorkerSnapshots(queue.emptyDistributedQueue(), [snapshot("worker-a", "queued"), snapshot("worker-b", "running")], projectId, now);
  assert.equal(recovered.plans[0].jobs[0].status, "unknown");
  assert.equal(recovered.plans[0].jobs[0].recoveryConflict, true);
  assert.ok(recovered.plans[0].jobs[0].blockReason);
});
