const test = require("node:test");
const assert = require("node:assert/strict");

const { mergeClusterSnapshots, mergeRealtimeStates } = require("../../dist/tunnel/MultiEndpointRealtimeClient.js");
const { createRealtimeState, applyRealtimeEvent } = require("../../dist/tunnel/RealtimeEventReducer.js");

test("multi endpoint snapshots merge hub scheduler and worker gpu", () => {
  const snapshot = mergeClusterSnapshots([
    {
      endpoint: { id: "hub", role: "hub", localHost: "127.0.0.1", localPort: 18765 },
      snapshot: { generatedAt: "2026-01-01T00:00:00Z", gpu: { hub: [{ index: 0 }] }, schedulerStates: [{ runKey: "r1" }] },
    },
    {
      endpoint: { id: "w1", role: "worker", localHost: "127.0.0.1", localPort: 18766 },
      snapshot: { generatedAt: "2026-01-01T00:00:01Z", gpu: { hub: [{ index: 1 }] } },
    },
  ]);
  assert.equal(snapshot.generatedAt, "2026-01-01T00:00:01Z");
  assert.equal(snapshot.gpu.hub[0].index, 0);
  assert.equal(snapshot.gpu.w1[0].index, 1);
  assert.equal(snapshot.schedulerStates[0].runKey, "r1");
});

test("multi endpoint realtime state remaps worker default gpu key", () => {
  const hubState = applyRealtimeEvent(createRealtimeState(), {
    schemaVersion: 1,
    seq: 1,
    type: "gpu_snapshot",
    generatedAt: "2026-01-01T00:00:00Z",
    source: "hub_agent",
    workerId: "hub",
    payload: { gpus: [{ index: 0 }] },
  });
  const workerState = applyRealtimeEvent(createRealtimeState(), {
    schemaVersion: 1,
    seq: 1,
    type: "gpu_snapshot",
    generatedAt: "2026-01-01T00:00:01Z",
    source: "hub_agent",
    payload: { gpus: [{ index: 1 }] },
  });
  const state = mergeRealtimeStates([
    { endpoint: { id: "hub", role: "hub", localHost: "127.0.0.1", localPort: 18765 }, state: hubState },
    { endpoint: { id: "w1", role: "worker", localHost: "127.0.0.1", localPort: 18766 }, state: workerState },
  ]);
  assert.equal(state.gpu.hub[0].index, 0);
  assert.equal(state.gpu.w1[0].index, 1);
  assert.equal(state.lastSeq, 1);
});