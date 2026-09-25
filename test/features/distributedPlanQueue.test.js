const { test } = require("node:test");
const assert = require("node:assert/strict");
const queue = require("../../dist/features/DistributedPlanQueue.js");

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
