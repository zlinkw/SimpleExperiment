const assert = require("node:assert/strict");
const test = require("node:test");
const { planProjectMirror } = require("../../dist/features/ProjectMirror.js");
const { emptyPlanSyncLedger, queuePlanSync } = require("../../dist/features/PlanArtifactSync.js");

test("remote-only files are copied by content and conflicting files are held", () => {
  const ledger = queuePlanSync(emptyPlanSyncLedger(), "plans/a.yaml", "r1", "nwpu2", ["work_dirs/a"], ["nwpu2", "nwpu3"], ["work_dirs/a"], "run-1");
  const inventories = {
    nwpu2: { "datasets/a.bin": { sha256: "aa", size: 1 }, "datasets/conflict.bin": { sha256: "11", size: 1 }, "work_dirs/a/model.pt": { sha256: "cc", size: 1 }, "train.py": { sha256: "dd", size: 1 } },
    nwpu3: { "datasets/conflict.bin": { sha256: "22", size: 1 }, "work_dirs/a/model.pt": { sha256: "ee", size: 1 }, "train.py": { sha256: "ff", size: 1 } },
  };
  const plan = planProjectMirror(inventories, { "train.py": { sha256: "dd" } }, ledger);
  assert.deepEqual(plan.copies, [{ sourceWorkerId: "nwpu2", destinationWorkerId: "nwpu3", path: "datasets/a.bin" }]);
  assert.deepEqual(plan.conflicts, [{ path: "datasets/conflict.bin", workers: ["nwpu2", "nwpu3"] }]);
  assert.deepEqual(plan.protectedPaths, ["train.py", "work_dirs/a/model.pt"]);
  assert.deepEqual(plan.protectedDifferences, ["train.py", "work_dirs/a/model.pt"]);
});
