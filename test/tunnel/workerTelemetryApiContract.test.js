const test = require("node:test");
const assert = require("node:assert/strict");

const {
  workerTelemetryAllowedEvents,
  workerTelemetryForbiddenEndpoints,
  workerTelemetryRequiredEndpoints,
  validateWorkerTelemetryCapabilities,
} = require("../../dist/tunnel/WorkerTelemetryApi.js");

test("worker telemetry api contract is status-only", () => {
  assert.ok(workerTelemetryRequiredEndpoints.includes("/api/gpu"));
  assert.ok(workerTelemetryRequiredEndpoints.includes("/api/worker/tasks"));
  assert.ok(workerTelemetryForbiddenEndpoints.includes("POST /api/actions/*"));
  assert.ok(workerTelemetryForbiddenEndpoints.includes("GET /api/files/*"));
  assert.deepEqual(workerTelemetryAllowedEvents.sort(), ["agent_heartbeat", "diagnostics_updated", "gpu_snapshot", "log_tail", "worker_health", "worker_task_snapshot"].sort());
});

test("worker capabilities tolerate missing file and action api", () => {
  const result = validateWorkerTelemetryCapabilities({
    schemaVersion: 1,
    mode: "worker_telemetry",
    apiVersion: "1",
    agentVersion: "1",
    endpoints: { health: true, capabilities: true, gpu: true, workerTasks: true, liveOutput: true, diagnostics: true, websocketEvents: true, sseEvents: true, actions: false, fileList: false },
  });
  assert.equal(result.ok, true);
});