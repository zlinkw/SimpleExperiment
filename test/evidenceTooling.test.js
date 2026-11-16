const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  parseSimpleRunArgs,
  runRecordedExperiment,
} = require("../dist/features/ExperimentRunner.js");
const { checkpointRecordsFromManifest } = require("../dist/features/Checkpoint.js");

test("checkpoint manifest retains metadata", () => {
  const records = checkpointRecordsFromManifest({ run_id: "run1", checkpoints: [{ path: "outputs/model.pth", paper_ready: "paper_ready", epoch: 4 }] });
  assert.equal(records[0].runId, "run1");
  assert.equal(records[0].paperReady, true);
  assert.equal(records[0].epoch, 4);
});

test("simpleex run creates standard run directory and metrics summary from stdout", () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "simpleex-run-"));
  const options = parseSimpleRunArgs(["--name", "baseline", "--seed", "1", "--config", "configs/a.yaml", "--", "node", "-e", "console.log('AUC: 0.932 accuracy: 89.5% F1=0.88')"]);
  const result = runRecordedExperiment({ ...options, cwd });
  assert.equal(result.exitCode, 0);
  assert.equal(fs.existsSync(path.join(result.runDir, "command.txt")), true);
  assert.equal(fs.existsSync(path.join(result.runDir, "stdout.log")), true);
  assert.equal(fs.existsSync(path.join(result.runDir, "env_snapshot.json")), true);
  assert.equal(fs.existsSync(path.join(result.runDir, "config_snapshot.yaml")), true);
  assert.equal(fs.existsSync(path.join(result.runDir, "artifact_manifest.json")), true);
  assert.equal(fs.existsSync(path.join(result.runDir, "metrics_summary.csv")), true);
  assert.equal(result.metricsRows, 3);
});
