const assert = require("node:assert/strict");
const test = require("node:test");
const { planLatestWorkerMerge } = require("../../dist/features/SyncLatestMerge.js");

test("latest Worker merge chooses per-file Plan or timestamp source and skips ambiguity", () => {
  const statuses = {
    "results/plan.csv": { state: "different", detail: "", versions: {
      w2: { sha256: "new", latest: "plan", modifiedAtMs: 100 },
      w3: { sha256: "old", modifiedAtMs: 200 },
      w5: { sha256: "new", modifiedAtMs: 50 },
    } },
    "results/weight.bin": { state: "different", detail: "", versions: {
      w2: { sha256: "old", modifiedAtMs: 100 },
      w3: { sha256: "new", latest: "candidate", modifiedAtMs: 200 },
    } },
    "results/ambiguous.csv": { state: "different", detail: "", versions: {
      w2: { sha256: "a", modifiedAtMs: 100 }, w3: { sha256: "b", modifiedAtMs: 100 },
    } },
    "results/unstable.csv": { state: "unknown", detail: "", unverified: true, versions: {} },
  };
  const result = planLatestWorkerMerge(statuses, ["w2", "w3", "w5"]);
  assert.deepEqual(result.items, [
    { path: "results/plan.csv", sourceId: "w2", destinationIds: ["w3"] },
    { path: "results/weight.bin", sourceId: "w3", destinationIds: ["w2", "w5"] },
  ]);
  assert.match(result.skipped.join(" "), /ambiguous\.csv/);
  assert.match(result.skipped.join(" "), /unstable\.csv/);
});
