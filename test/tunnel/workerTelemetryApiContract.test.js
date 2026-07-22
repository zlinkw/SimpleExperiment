const test = require("node:test");
const assert = require("node:assert/strict");

const {
  workerTelemetryAllowedEvents,
  workerTelemetryAllowedActions,
  workerTelemetryForbiddenEndpoints,
  workerTelemetryRequiredEndpoints,
  validateWorkerTelemetryCapabilities,
} = require("../../dist/tunnel/WorkerTelemetryApi.js");

test("worker telemetry permits bounded worker controls and forbids Hub or file APIs", () => {
  assert.ok(workerTelemetryRequiredEndpoints.includes("/api/gpu"));
  assert.ok(workerTelemetryRequiredEndpoints.includes("/api/worker/tasks"));
  assert.deepEqual([...workerTelemetryAllowedActions].sort(), [
    "POST /api/actions/start-worker-task",
    "POST /api/actions/retry-worker-task",
    "POST /api/actions/stop-worker-task",
    "POST /api/actions/delete-worker-artifacts",
    "POST /api/actions/archive-worker-artifacts",
  ].sort());
  assert.ok(workerTelemetryForbiddenEndpoints.includes("POST /api/actions/run-plan"));
  assert.ok(workerTelemetryForbiddenEndpoints.includes("GET /api/files/*"));
  assert.deepEqual([...workerTelemetryAllowedEvents].sort(), ["agent_heartbeat", "diagnostics_updated", "gpu_snapshot", "log_tail", "worker_health", "worker_task_snapshot"].sort());
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

test("worker capabilities accept bounded actions and reject Hub actions", () => {
  const base = {
    schemaVersion: 1,
    mode: "worker_telemetry",
    apiVersion: "1",
    agentVersion: "1",
    endpoints: { health: true, capabilities: true, gpu: true, workerTasks: true, liveOutput: true, diagnostics: true, websocketEvents: true, sseEvents: true, actions: true, fileList: false },
  };
  assert.equal(validateWorkerTelemetryCapabilities({ ...base, actionEndpoints: { "start-worker-task": true, "retry-worker-task": true } }).ok, true);
  assert.equal(validateWorkerTelemetryCapabilities({ ...base, actionEndpoints: { "run-plan": true } }).ok, false);
});
