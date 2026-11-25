const test = require("node:test"), assert = require("node:assert/strict");
require("../_helpers/registerTsRequire");
const { summarizePlanStatuses } = require("../../src/features/PanelPlanStatusSummary.ts");

test("protocol 2 plan counts require verified output completion", () => {
  const plan = { id: "p", planFile: "p.yaml", jobs: [
    { index: 0, lifecycleProtocol: 2, status: "completed", completionState: "unverified" },
    { index: 1, lifecycleProtocol: 2, status: "completed", completionState: "verified" },
  ] };
  const [summary] = summarizePlanStatuses({ plans: [{ file: "p.yaml", jobCount: 2 }], distributedPlans: [plan], topologyMode: "worker_pool" });
  assert.equal(summary.completedCount, 1);
});
