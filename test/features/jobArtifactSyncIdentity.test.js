const test = require("node:test");
const assert = require("node:assert/strict");
const { jobArtifactRetentionKey, jobArtifactRunGeneration } = require("../../src/features/JobArtifactSyncIdentity.ts");

test("the completed-job retentionKey is the exact five-tuple the dedicated plan chain already uses", () => {
  const planFile = "experiments/plans/comparison/qmf.yaml", index = 2, caseName = "qmf_bus_p100", seed = 43;
  // Byte-for-byte equal to the dedicated chain's literal construction (legacy.ts syncDistributedJobArtifacts).
  assert.equal(jobArtifactRetentionKey(planFile, index, caseName, seed),
    JSON.stringify(["job-artifacts", planFile, index, caseName, seed]));
  assert.equal(jobArtifactRetentionKey("plans/p.yaml", 0, "case0", 42),
    JSON.stringify(["job-artifacts", "plans/p.yaml", 0, "case0", 42]));
  assert.notEqual(jobArtifactRetentionKey("plans/p.yaml", 0, "case0", 42),
    jobArtifactRetentionKey("plans/p.yaml", 1, "case0", 42), "different jobs never share a staging identity");
});

test("the run generation is a 64-hex value that retries of the same source manifest reuse", () => {
  const files = { "work_dirs/p/job0/model.pth": "A".repeat(64), "work_dirs/p/job0/summary.json": "b".repeat(64) };
  const first = jobArtifactRunGeneration("plan", "command0", files);
  assert.match(first, /^[0-9a-f]{64}$/, "hex passes the receiver transferScope64 unchanged");
  assert.equal(jobArtifactRunGeneration("plan", "command0", { ...files }), first, "same input retries and reloads reuse one generation");
  assert.equal(jobArtifactRunGeneration("plan", "command0", Object.fromEntries(Object.entries(files).reverse())), first,
    "inventory key order cannot change the generation");
  assert.equal(jobArtifactRunGeneration("plan", "command0", { "work_dirs/p/job0/model.pth": "a".repeat(64), "work_dirs/p/job0/summary.json": "b".repeat(64) }), first,
    "SHA case is normalized before hashing");
});

test("a new command, run or content hash always opens a new generation while missing destination progress never does", () => {
  const files = { "work_dirs/p/job0/model.pth": "a".repeat(64) };
  const base = jobArtifactRunGeneration("plan", "command0", files);
  assert.notEqual(jobArtifactRunGeneration("plan", "command1", files), base, "a new dispatch/attempt never reuses the old run generation");
  assert.notEqual(jobArtifactRunGeneration("plan-2", "command0", files), base, "a new plan run opens its own generation");
  assert.notEqual(jobArtifactRunGeneration("plan", "command0", { "work_dirs/p/job0/model.pth": "c".repeat(64) }), base,
    "a changed source SHA opens a new generation even under the same command");
  assert.notEqual(jobArtifactRunGeneration("plan", "command0", { ...files, "work_dirs/p/job0/extra.bin": "d".repeat(64) }), base,
    "a changed source file set opens a new generation");
  assert.notEqual(jobArtifactRunGeneration("plan", "command0", {}), base);
});
