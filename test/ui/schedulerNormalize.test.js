const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeSchedulerRows, taskStatusRank, formatDuration } = require("../../dist/ui/WebviewRenderState.js");

test("scheduler normalize expands buckets and sorts active tasks first", () => {
  const rows = normalizeSchedulerRows([
    {
      plan: "plan-a",
      running_experiments: [{ run_key: "run", case: "train", worker_id: "w1", gpu_ids: [0], started_at: "2026-07-01T00:00:00Z", updated_at: "2026-07-01T00:01:00Z" }],
      completed_experiments: [{ run_key: "done", case: "eval", worker_id: "w2" }],
      failed_experiments: [{ run_key: "bad", case: "fail", worker_id: "w3" }],
      pending_experiments: [{ run_key: "queued", case: "q", worker_id: "w4" }],
    },
  ]);
  assert.deepEqual(rows.map((row) => row.status), ["running", "queued", "failed", "completed"]);
  assert.equal(rows[0].plan, "plan-a");
  assert.equal(rows[0].gpuIds[0], 0);
  assert.equal(taskStatusRank("running") < taskStatusRank("completed"), true);
  assert.equal(formatDuration("2026-07-01T00:00:00Z", "2026-07-01T00:01:05Z"), "1m 5s");
});

test("scheduler normalize filters deleted rows from task table", () => {
  const rows = normalizeSchedulerRows([{ status: "deleted", runKey: "gone" }, { state: "completed", runKey: "done" }]);
  assert.deepEqual(rows.map((row) => row.runKey), ["done"]);
});