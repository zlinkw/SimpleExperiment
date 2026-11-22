const test = require("node:test");
const assert = require("node:assert/strict");

const { checkpointRecordsFromManifest } = require("../dist/features/Checkpoint.js");

test("checkpoint manifest retains metadata", () => {
  const records = checkpointRecordsFromManifest({ run_id: "run1", checkpoints: [{ path: "outputs/model.pth", paper_ready: "paper_ready", epoch: 4 }] });
  assert.equal(records[0].runId, "run1");
  assert.equal(records[0].paperReady, true);
  assert.equal(records[0].epoch, 4);
});
