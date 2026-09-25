const { test } = require("node:test");
const assert = require("node:assert/strict");
const { normalizeDistributedProjectContract } = require("../../dist/features/DistributedProjectContract.js");

test("default independent Plan prefix and required evidence remain compatible", () => {
  const contract = normalizeDistributedProjectContract();
  assert.deepEqual(contract.planPrefixes, ["experiments/plans/comparison/"]);
  assert.ok(contract.requiredPaths.includes("best_model.pth"));
  assert.ok(contract.fragmentPaths.includes("test_results/formal_result_rows.csv"));
});

test("project contract accepts a different Plan family and protects the checkpoint", () => {
  const contract = normalizeDistributedProjectContract({ planPrefixes: ["experiments/plans/formal/"],
    mergeModule: "my_project.results.merge", checkpointPath: "weights/final.pt",
    fragmentPaths: ["metrics/job.json"], requiredPaths: ["metrics/job.json"] });
  assert.deepEqual(contract.planPrefixes, ["experiments/plans/formal/"]);
  assert.deepEqual(contract.requiredPaths, ["metrics/job.json", "weights/final.pt"]);
  assert.throws(() => normalizeDistributedProjectContract({ checkpointPath: "../weights/final.pt" }));
  assert.throws(() => normalizeDistributedProjectContract({ mergeModule: "package.module;rm" }));
});
