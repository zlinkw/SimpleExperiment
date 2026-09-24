const assert = require("node:assert/strict");
const test = require("node:test");
const { resolvePlanWorkerAffinity } = require("../../dist/features/PlanWorkerAffinity.js");

const plan = "experiments/plans/comparison/corim.yaml";
const workers = ["nwpu2", "nwpu3", "nwpu5"];
const complete = { availableWorkerIds: workers, results: [], workerSummaries: [] };
const history = { plans: { [plan]: { records: [{ workerId: "nwpu2" }] } } };

test("rerun stays on the Worker that owns earlier results", () => {
  assert.equal(resolvePlanWorkerAffinity(plan, workers, complete, history, {}), "nwpu2");
  assert.equal(resolvePlanWorkerAffinity(plan, workers, complete, { plans: {} }, {
    old: { type: "run-plan", status: "completed", planFile: plan, workerId: "nwpu2" },
  }), "nwpu2");
});

test("rerun requires every Worker and blocks mixed ownership", () => {
  assert.throws(() => resolvePlanWorkerAffinity(plan, workers, { ...complete, availableWorkerIds: ["nwpu2", "nwpu3"] }, history, {}), /nwpu5/);
  assert.throws(() => resolvePlanWorkerAffinity(plan, workers, {
    ...complete,
    results: [{ workerId: "nwpu3" }],
  }, history, {}), /多个 Worker/);
  assert.throws(() => resolvePlanWorkerAffinity(plan, workers, complete, { plans: { [plan]: { records: [{ workerId: "old-worker" }] } } }, {}), /未启用/);
});

test("a fresh Plan can choose any Worker after checking all of them", () => {
  assert.equal(resolvePlanWorkerAffinity(plan, workers, complete, { plans: {} }, {}), undefined);
  assert.equal(resolvePlanWorkerAffinity(plan, workers, complete, { plans: {} }, {
    failed: { type: "run-plan", status: "failed", planFile: plan, workerId: "nwpu2" },
  }), undefined);
});
