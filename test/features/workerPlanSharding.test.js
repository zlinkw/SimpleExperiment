const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { createWorkerPlanShardSet, workerPlanShardSetMatches } = require("../../dist/features/WorkerPlanSharding.js");
const root = path.join(__dirname, "..", "..");

test("Worker pool sharding is deterministic and covers every experiment once", () => {
  const first = createWorkerPlanShardSet("plan-rev-1", ["worker-b", "worker-a", "worker-c"], [4, 0, 3, 1, 2, 2]);
  const second = createWorkerPlanShardSet("plan-rev-1", ["worker-c", "worker-b", "worker-a"], [0, 1, 2, 3, 4]);
  assert.deepEqual(first, second);
  assert.deepEqual(first.workerIds, ["worker-a", "worker-b", "worker-c"]);
  assert.deepEqual(first.shards.flatMap((shard) => shard.experimentIndices).sort((a, b) => a - b), [0, 1, 2, 3, 4]);
  assert.equal(new Set(first.shards.flatMap((shard) => shard.experimentIndices)).size, 5);
  assert.equal(workerPlanShardSetMatches(first, "plan-rev-1", ["worker-c", "worker-a", "worker-b"]), true);
});

test("Plan or Worker set changes create a new immutable shard revision", () => {
  const base = createWorkerPlanShardSet("plan-rev-1", ["worker-a", "worker-b"], [0, 1, 2, 3, 4, 5]);
  const changedPlan = createWorkerPlanShardSet("plan-rev-2", ["worker-a", "worker-b"], [0, 1, 2, 3, 4, 5]);
  const changedWorkers = createWorkerPlanShardSet("plan-rev-1", ["worker-a", "worker-b", "worker-c"], [0, 1, 2, 3, 4, 5]);
  assert.notEqual(base.workerSetRevision, changedPlan.workerSetRevision);
  assert.notEqual(base.workerSetRevision, changedWorkers.workerSetRevision);
  assert.equal(workerPlanShardSetMatches(base, "plan-rev-1", ["worker-a", "worker-c"]), false);
});

test("Worker pool sharding rejects incomplete identity", () => {
  assert.throws(() => createWorkerPlanShardSet("", ["worker-a", "worker-b"], [0]), /Plan revision/);
  assert.throws(() => createWorkerPlanShardSet("rev", ["worker-a"], [0]), /at least two/);
  assert.throws(() => createWorkerPlanShardSet("rev", ["worker-a", "worker-b"], []), /no experiment/);
});

test("Extension submits one immutable shard to each Worker without using Hub actions", () => {
  const source = fs.readFileSync(path.join(root, "src", "extension.ts"), "utf8");
  const methodStart = source.indexOf("async postWorkerPoolPlanAction");
  const method = source.slice(methodStart, source.indexOf("assertTopologyActualWorkRoots", methodStart));
  assert.match(method, /createWorkerPlanShardSet\)\(planRevision, workerIds, expected\)/);
  assert.match(method, /postWorkerTunnelAction\(shard\.workerId, action, request/);
  assert.match(method, /shard\.experimentIndices\.length > 0/);
  assert.doesNotMatch(method, /postTunnelAction\(/);

  const requestStart = source.indexOf("workerPoolActionBody(body");
  const request = source.slice(requestStart, source.indexOf("async postWorkerPoolPlanAction", requestStart));
  assert.match(request, /workers: \[\{/);
  assert.match(request, /schedulerOwnerWorkerId: workerId/);
  assert.match(request, /assignedExperimentIndices: indices/);
  assert.match(request, /automaticBackup: false/);
});

test("Worker Agent rejects incomplete or mismatched pool shard identity", () => {
  const source = fs.readFileSync(path.join(root, "src", "clusterAgentRuntime.ts"), "utf8");
  assert.match(source, /topology_mode != "single_worker" and topology_mode != "worker_pool"/);
  assert.match(source, /owner != current_worker or worker_ids != \[owner\]/);
  assert.match(source, /topology_mode == "worker_pool" and action in \("dry-run-plan", "run-plan", "reproduce-plan"\)/);
  assert.match(source, /if not assigned or not worker_set_revision:/);
  assert.match(source, /scheduler_args\.extend\(\["--only-indices"/);
  assert.match(source, /scheduler_args\.extend\(\["--worker-set-revision"/);
  assert.match(source, /scheduler_args\.extend\(\["--scheduler-owner-worker-id"/);
});

test("Scheduler limits dry-run and execution queues to assigned indices", () => {
  const source = fs.readFileSync(path.join(root, "src", "clusterSchedulerRuntime.ts"), "utf8");
  assert.match(source, /parser\.add_argument\("--only-indices", default=""\)/);
  assert.match(source, /jobs = \[job for job in jobs if int\(job\.index\) in allowed\]/);
  assert.match(source, /missing = sorted\(allowed\.difference\(int\(job\.index\) for job in jobs\)\)/);
  assert.match(source, /jobs_by_index\[int\(experiment_index\)\]/);
  assert.match(source, /"workerSetRevision": str\(args\.worker_set_revision or ""\)/);
  assert.match(source, /"assignedExperimentIndices": only_indices_for_args\(args\)/);
});
