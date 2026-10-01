const test = require("node:test");
const assert = require("node:assert/strict");
const freshness = require("../../dist/results/PlanRunFreshness.js");

function run(id, enqueuedAt, revision = "same", status = "completed") {
  const jobs = [42, 43, 44].map((seed, index) => ({
    index, case: "ebmc", seed, attempt: 1, status, workerId: "worker-" + (index % 2 + 1),
    outputDir: `simple_cluster/runs/ebmc/attempts/${id}/job-${seed}`,
    commandId: `${id}-command-${seed}`,
    artifacts: { [`job-${seed}.csv`]: (String(index + 1)).repeat(64) },
  }));
  return { id, planFile: "experiments/plans/comparison/ebmc.yaml", revision, enqueuedAt, planJobCount: 3, jobs };
}

test("latest complete same-revision run wins and carries job provenance", () => {
  const a = run("run-a", "2026-09-01T00:00:00.000Z");
  const b = run("run-b", "2026-09-02T00:00:00.000Z");
  const selected = freshness.selectLatestCompletePlanRun({ plans: [a, b] }, a.planFile, "same");
  assert.equal(selected.runId, "run-b");
  assert.equal(selected.expectedJobCount, 3);
  assert.equal(selected.jobs[1].outputDir, b.jobs[1].outputDir);
  assert.equal(selected.jobs[1].commandId, b.jobs[1].commandId);
  assert.equal(selected.jobs[1].artifactHashes["job-43.csv"], "2".repeat(64));
});

test("incomplete or mismatched-revision runs cannot replace the newest complete run", () => {
  const a = run("run-a", "2026-09-01T00:00:00.000Z");
  const b = run("run-b", "2026-09-02T00:00:00.000Z", "same", "running");
  const newerRevision = run("run-c", "2026-09-03T00:00:00.000Z", "next");
  assert.equal(freshness.selectLatestCompletePlanRun({ plans: [a, b] }, a.planFile, "same").runId, "run-a");
  assert.equal(freshness.selectLatestCompletePlanRun({ plans: [a, newerRevision] }, a.planFile, "same").runId, "run-a");
  assert.equal(freshness.selectLatestCompletePlanRun({ plans: [a, newerRevision] }, a.planFile, "missing"), undefined);
});

test("completed rows without command and artifact identity are not authoritative runs", () => {
  const plan = run("run-unverified", "2026-09-02T00:00:00.000Z");
  delete plan.jobs[0].commandId;
  delete plan.jobs[1].artifacts;
  assert.equal(freshness.selectLatestCompletePlanRun({ plans: [plan] }, plan.planFile, "same"), undefined);
});

test("summary freshness requires an explicit, non-conflicting run identity", () => {
  const plan = run("run-b", "2026-09-02T00:00:00.000Z");
  const selected = freshness.selectLatestCompletePlanRun({ plans: [plan] }, plan.planFile, "same");
  assert.equal(freshness.summaryProvesRun({ planRevision: "same", completedRunId: "run-b" }, selected), true);
  assert.equal(freshness.summaryProvesRun({ planRevision: "same", completedRunId: null }, selected), false);
  assert.equal(freshness.summaryProvesRun({ planRevision: "same", completedRunId: "run-a" }, selected), false);
  assert.equal(freshness.summaryProvesRun({ planRevision: "same", completedRunId: "run-b", results: [{ run_id: "run-a" }] }, selected), false);
});

test("recovery projection strips shared summary paths before applying the authoritative run", () => {
  const plan = run("run-b", "2026-09-02T00:00:00.000Z");
  const selected = freshness.selectLatestCompletePlanRun({ plans: [plan] }, plan.planFile, "same");
  const summary = freshness.summaryForRunRecovery({
    planFile: plan.planFile, planRevision: "same", projectFinalCsvPath: "experiments/results/formal/ebmc.csv",
    results: [{ run_id: "run-a" }], workerResultTables: [{ rawResultCsvPath: "experiments/results/formal/ebmc.csv" }],
  }, plan.planFile, selected);
  assert.equal(summary.completedRunId, "run-b");
  assert.deepEqual(summary.results, []);
  assert.deepEqual(summary.workerResultTables, []);
  assert.equal(summary.projectFinalCsvPath, undefined);
});
