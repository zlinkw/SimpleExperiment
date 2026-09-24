const assert = require("node:assert/strict");
const test = require("node:test");
const sync = require("../../dist/features/PlanArtifactSync.js");
const transfer = require("../../dist/features/PlanArtifactTransfer.js");

test("Plan artifact scope includes its output directory and declared result files only", () => {
  const paths = sync.planArtifactPaths({
    outputSignals: ["结果目录: work_dirs/corim", "结果目录: ../unsafe"],
    outputCandidates: ["experiments/results/formal/corim.csv", "*/metrics.csv", "experiments/results/other?.csv"],
  }, { workerResultTables: [
    { workerId: "nwpu2", rawResultCsvPath: "experiments/results/corim.csv" },
    { workerId: "nwpu3", rawResultCsvPath: "experiments/results/other.csv" },
  ] }, "nwpu2");
  assert.deepEqual(paths, ["experiments/results/corim.csv", "experiments/results/formal/corim.csv", "work_dirs/corim"]);
});

test("sync ledger retains disabled destinations until transfer succeeds", () => {
  let ledger = sync.queuePlanSync(sync.emptyPlanSyncLedger(), "plans/corim.yaml", "rev1", "nwpu2", ["work_dirs/corim"], ["nwpu2", "nwpu3", "nwpu5"]);
  const pending = sync.pendingPlanSyncs(ledger);
  assert.deepEqual(pending.map((item) => item.destinationWorkerId), ["nwpu3", "nwpu5"]);
  ledger = sync.markPlanSyncComplete(ledger, pending[0].key, "nwpu3", "2026-09-25T00:00:00Z");
  assert.deepEqual(sync.pendingPlanSyncs(ledger).map((item) => item.destinationWorkerId), ["nwpu5"]);
  ledger = sync.queuePlanSync(ledger, "plans/corim.yaml", "rev1", "nwpu2", ["experiments/results/corim.csv"], ["nwpu3", "nwpu5"]);
  assert.deepEqual(ledger.entries[pending[0].key].artifactPaths, ["experiments/results/corim.csv", "work_dirs/corim"]);
  assert.equal(ledger.entries[pending[0].key].destinations.nwpu3.status, "pending");
  ledger = sync.queuePlanSync(ledger, "plans/corim.yaml", "rev1", "nwpu2", ["work_dirs/corim"], ["nwpu3", "nwpu5"], ["work_dirs/corim"], "operation-2");
  assert.deepEqual(sync.pendingPlanSyncs(ledger).map((item) => item.entry.runId), ["operation-2", "operation-2"]);
});

test("old mirror sync records become pending for direct-path migration", () => {
  const old = { schemaVersion: 1, entries: { sample: {
    planFile: "plans/corim.yaml", revision: "rev1", runId: "old-run", sourceWorkerId: "nwpu2",
    artifactPaths: ["work_dirs/corim"], directoryPaths: ["work_dirs/corim"],
    destinations: { nwpu3: { status: "synced", syncedAt: "2026-09-25T00:00:00Z" } },
  } } };
  const migrated = sync.migratePlanSyncLedger(old);
  assert.equal(migrated.schemaVersion, 2);
  assert.equal(migrated.entries.sample.destinations.nwpu3.status, "pending");
});

test("new run records removed Plan paths for exact cleanup", () => {
  let ledger = sync.queuePlanSync(sync.emptyPlanSyncLedger(), "plans/corim.yaml", "rev1", "nwpu2", ["work_dirs/corim", "experiments/results/old.csv"], ["nwpu3"], ["work_dirs/corim"], "run-1");
  ledger = sync.queuePlanSync(ledger, "plans/corim.yaml", "rev2", "nwpu2", ["work_dirs/corim", "experiments/results/new.csv"], ["nwpu3"], ["work_dirs/corim"], "run-2");
  const latest = sync.pendingPlanSyncs(ledger)[0].entry;
  assert.deepEqual(latest.stalePaths, [{ path: "experiments/results/old.csv", directory: false }]);
  ledger = sync.queuePlanSync(ledger, "plans/corim.yaml", "rev3", "nwpu2", ["work_dirs/corim", "experiments/results/newer.csv"], ["nwpu3"], ["work_dirs/corim"], "run-3");
  assert.deepEqual(sync.pendingPlanSyncs(ledger)[0].entry.stalePaths, [
    { path: "experiments/results/old.csv", directory: false },
    { path: "experiments/results/new.csv", directory: false },
  ]);
});

test("a completed cross-Worker rerun supersedes older source transfers", () => {
  let ledger = sync.queuePlanSync(sync.emptyPlanSyncLedger(), "plans/corim.yaml", "rev1", "nwpu2", ["work_dirs/corim", "experiments/results/old.csv"], ["nwpu2", "nwpu3", "nwpu5"], ["work_dirs/corim"], "run-old");
  ledger = sync.queuePlanSync(ledger, "plans/corim.yaml", "rev2", "nwpu3", ["work_dirs/corim", "experiments/results/new.csv"], ["nwpu2", "nwpu3", "nwpu5"], ["work_dirs/corim"], "run-new");
  const pending = sync.pendingPlanSyncs(ledger);
  assert.deepEqual(pending.map((item) => item.destinationWorkerId), ["nwpu2", "nwpu5"]);
  assert.ok(pending.every((item) => item.entry.sourceWorkerId === "nwpu3"));
  assert.deepEqual(pending[0].entry.stalePaths, [{ path: "experiments/results/old.csv", directory: false }]);
});

test("SFTP transfers Plan outputs and weights directly to their original paths", async () => {
  const entry = {
    planFile: "plans/corim.yaml", revision: "rev1", runId: "operation-2", sourceWorkerId: "nwpu2",
    artifactPaths: ["work_dirs/corim", "experiments/results/corim.csv"],
    directoryPaths: ["work_dirs/corim"], destinations: { nwpu3: { status: "pending" } },
  };
  const source = { id: "nwpu2", host: "server2", user: "research", port: 22, remotePath: "/srv/nwpu2/project" };
  const destination = { id: "nwpu3", host: "server3", user: "research", port: 22, remotePath: "/srv/nwpu3/project" };
  const calls = [];
  const result = await transfer.transferPlanArtifacts(entry, source, destination, async (method, params) => {
    calls.push({ method, params });
    return { ok: true };
  });
  assert.equal(result.paths, 2);
  assert.deepEqual(calls.map((call) => call.method), ["sync.serverToServer", "sync.serverToServer"]);
  assert.equal(calls[0].params.relativePath, "work_dirs/corim");
  assert.equal(calls[0].params.directory, true);
  assert.equal(calls[1].params.relativePath, "experiments/results/corim.csv");
  assert.equal(calls[1].params.directory, false);
  assert.deepEqual(transfer.directPlanSyncPreview(entry, source, destination), [
    "/srv/nwpu2/project/work_dirs/corim → /srv/nwpu3/project/work_dirs/corim",
    "/srv/nwpu2/project/experiments/results/corim.csv → /srv/nwpu3/project/experiments/results/corim.csv",
  ]);
  assert.ok(calls.every((call) => call.params.confirm && call.params.pathConfirmed));
});
