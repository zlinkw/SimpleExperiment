const test = require("node:test");
const assert = require("node:assert/strict");

const {
  applyRealtimeEvent,
  compactRealtimeState,
  createRealtimeState,
  REALTIME_FILE_TRANSFER_RECORD_LIMIT,
  REALTIME_OPERATION_RECORD_LIMIT,
  REALTIME_SCHEDULER_RECORD_LIMIT,
  REALTIME_TRACE_RECORD_LIMIT,
  REALTIME_WORKER_TASK_RECORD_LIMIT,
} = require("../../dist/tunnel/RealtimeEventReducer.js");
const { mergeAuthorityRealtimeStates } = require("../../dist/tunnel/AuthorityMergePolicy.js");

test("realtime reducer caps traces operations transfers and last known good", () => {
  let state = createRealtimeState();
  for (let seq = 1; seq <= REALTIME_TRACE_RECORD_LIMIT + 30; seq += 1) {
    state = applyRealtimeEvent(state, event(seq, "experiment_trace", { runKey: `run-${seq}`, status: "completed" }));
  }
  assert.equal(state.experimentTraces.length, REALTIME_TRACE_RECORD_LIMIT);
  assert.equal(state.experimentTraces.some((row) => row.runKey === "run-1"), false);
  assert.equal(state.lastKnownGood.experimentTraces.length, REALTIME_TRACE_RECORD_LIMIT);

  for (let seq = 1000; seq < 1000 + REALTIME_OPERATION_RECORD_LIMIT + 30; seq += 1) {
    state = applyRealtimeEvent(state, {
      ...event(seq, "operation_completed", { operationId: `op-${seq}`, status: "completed" }),
      operationId: `op-${seq}`,
    });
  }
  assert.equal(Object.keys(state.operations).length, REALTIME_OPERATION_RECORD_LIMIT);
  assert.equal(Boolean(state.operations["op-1000"]), false);

  for (let seq = 2000; seq < 2000 + REALTIME_FILE_TRANSFER_RECORD_LIMIT + 30; seq += 1) {
    state = applyRealtimeEvent(state, {
      ...event(seq, "file_transfer_progress", { transferId: `transfer-${seq}`, status: "completed" }),
      transferId: `transfer-${seq}`,
    });
  }
  assert.equal(Object.keys(state.fileTransfers).length, REALTIME_FILE_TRANSFER_RECORD_LIMIT);
  assert.equal(Boolean(state.fileTransfers["transfer-2000"]), false);
});

test("snapshot and authority merge apply realtime state budgets", () => {
  const schedulerRows = Array.from({ length: REALTIME_SCHEDULER_RECORD_LIMIT + 20 }, (_, i) => ({ runKey: `sched-${i}`, status: "completed", seq: i }));
  const traceRows = Array.from({ length: REALTIME_TRACE_RECORD_LIMIT + 20 }, (_, i) => ({ runKey: `trace-${i}`, status: "archived", seq: i }));
  const workerTasks = Array.from({ length: REALTIME_WORKER_TASK_RECORD_LIMIT + 20 }, (_, i) => ({ runKey: `worker-${i}`, localStatus: "process_gone", lastSeenAt: `2026-07-05T00:${String(i % 60).padStart(2, "0")}:00Z` }));
  const state = compactRealtimeState({
    ...createRealtimeState({ schedulerStates: schedulerRows, experimentTraces: traceRows }),
    workerTasks: { w1: workerTasks },
  });
  assert.equal(state.schedulerStates.length, REALTIME_SCHEDULER_RECORD_LIMIT);
  assert.equal(state.experimentTraces.length, REALTIME_TRACE_RECORD_LIMIT);
  assert.equal(state.workerTasks.w1.length, REALTIME_WORKER_TASK_RECORD_LIMIT);
  assert.equal(state.lastKnownGood.schedulerStates.length, REALTIME_SCHEDULER_RECORD_LIMIT);

  const merged = mergeAuthorityRealtimeStates([
    { endpoint: { id: "hub", role: "hub" }, state },
    { endpoint: { id: "w1", role: "worker" }, state: { ...createRealtimeState(), lastHeartbeatAt: new Date().toISOString(), workerTasks: { w1: workerTasks } } },
  ]);
  assert.equal(merged.schedulerStates.length, REALTIME_SCHEDULER_RECORD_LIMIT);
  assert.equal(merged.experimentTraces.length, REALTIME_TRACE_RECORD_LIMIT);
  assert.equal(merged.workerTasks.w1.length, REALTIME_WORKER_TASK_RECORD_LIMIT);
  assert.equal(merged.lastKnownGood.experimentTraces.length, REALTIME_TRACE_RECORD_LIMIT);
});

function event(seq, type, payload) {
  return {
    schemaVersion: 1,
    seq,
    type,
    generatedAt: `2026-07-05T00:00:${String(seq % 60).padStart(2, "0")}.000Z`,
    source: "hub_agent",
    payload,
  };
}