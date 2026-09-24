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

test("SFTP stages only one Plan and uploads to a Worker-specific mirror", async () => {
  const entry = {
    planFile: "plans/corim.yaml", revision: "rev1", runId: "operation-2", sourceWorkerId: "nwpu2",
    artifactPaths: ["work_dirs/corim", "experiments/results/corim.csv"],
    directoryPaths: ["work_dirs/corim"], destinations: { nwpu3: { status: "pending" } },
  };
  const source = { id: "nwpu2", host: "server2", user: "research", port: 22, remotePath: "/srv/nwpu2/project" };
  const destination = { id: "nwpu3", host: "server3", user: "research", port: 22, remotePath: "/srv/nwpu3/project" };
  const calls = [];
  const filesApi = {
    mkdir: async () => undefined,
    writeFile: async () => undefined,
    stat: async () => ({ isFile: () => true }),
    readdir: async () => ["metrics.csv", "model.pth"].map((name) => ({ name, isSymbolicLink: () => false, isDirectory: () => false, isFile: () => true })),
  };
  const result = await transfer.transferPlanArtifacts(entry, source, destination, "C:\\stage", async (method, params) => {
    calls.push({ method, params });
    return { ok: true };
  }, filesApi);
  assert.equal(result.files, 3);
  assert.deepEqual(calls.map((call) => call.method), ["sync.fromRemote", "upload.files", "sync.fromRemote", "upload.files"]);
  assert.equal(calls[0].params.remotePath, "/srv/nwpu2/project/work_dirs/corim");
  assert.match(calls[1].params.remotePath, /^\/srv\/nwpu3\/project\/simple_cluster\/worker_mirrors\/nwpu2\//);
  assert.equal(calls[1].params.files[0].remoteName, "metrics.csv");
  assert.equal(calls[1].params.files[1].remoteName, "model.pth");
  assert.equal(calls[2].params.remotePath, "/srv/nwpu2/project/experiments/results");
  assert.equal(calls[3].params.files[0].remoteName, "corim.csv");
  assert.ok(calls.every((call) => call.params.confirm && call.params.pathConfirmed));
  const rerun = { ...entry, runId: "operation-3" };
  assert.equal(transfer.planMirrorRoot(entry, destination), transfer.planMirrorRoot(rerun, destination));
});
