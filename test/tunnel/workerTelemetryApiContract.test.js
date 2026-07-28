const test = require("node:test");
const assert = require("node:assert/strict");
const { MultiEndpointRealtimeClient } = require("../../dist/tunnel/MultiEndpointRealtimeClient.js");
const { RequestBudget, defaultRequestBudgetConfig } = require("../../dist/tunnel/RequestBudget.js");

const {
  workerTelemetryAllowedEvents,
  workerTelemetryAllowedActions,
  workerLocalSchedulerActionNames,
  workerTelemetryForbiddenEndpoints,
  workerTelemetryRequiredEndpoints,
  validateWorkerTelemetryCapabilities,
} = require("../../dist/tunnel/WorkerTelemetryApi.js");

test("worker telemetry permits bounded worker controls plus local scheduler actions", () => {
  assert.ok(workerTelemetryRequiredEndpoints.includes("/api/gpu"));
  assert.ok(workerTelemetryRequiredEndpoints.includes("/api/worker/tasks"));
  assert.deepEqual([...workerTelemetryAllowedActions].sort(), [
    "POST /api/actions/start-worker-task",
    "POST /api/actions/retry-worker-task",
    "POST /api/actions/stop-worker-task",
    "POST /api/actions/delete-worker-artifacts",
    "POST /api/actions/archive-worker-artifacts",
  ].sort());
  assert.deepEqual([...workerLocalSchedulerActionNames], ["validate-plan", "dry-run-plan", "run-plan", "reproduce-plan"]);
  assert.ok(workerTelemetryForbiddenEndpoints.includes("POST /api/actions/parse-results"));
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

test("worker capabilities accept local scheduler actions and reject other Hub actions", () => {
  const base = {
    schemaVersion: 1,
    mode: "worker_telemetry",
    apiVersion: "1",
    agentVersion: "1",
    endpoints: { health: true, capabilities: true, gpu: true, workerTasks: true, liveOutput: true, diagnostics: true, websocketEvents: true, sseEvents: true, actions: true, fileList: false },
  };
  assert.equal(validateWorkerTelemetryCapabilities({ ...base, actionEndpoints: { "start-worker-task": true, "retry-worker-task": true } }).ok, true);
  assert.equal(validateWorkerTelemetryCapabilities({ ...base, actionEndpoints: { "run-plan": true, "validate-plan": true } }).ok, true);
  assert.equal(validateWorkerTelemetryCapabilities({ ...base, actionEndpoints: { "parse-results": true } }).ok, false);
});

test("Worker-only client requires topology stamp and never substitutes Worker for Hub", async () => {
  const client = new MultiEndpointRealtimeClient([
    { id: "worker-1", role: "worker", localHost: "127.0.0.1", localPort: 1 },
  ], () => new RequestBudget({ ...defaultRequestBudgetConfig, minIntervalByPurpose: {}, disabledPurposes: [] }));
  await assert.rejects(client.postWorkerAction("worker-1", "run-plan", {}), /action not allowed/);
  await assert.rejects(client.postAction("run-plan", {}), /Hub realtime endpoint not configured/);
  await assert.rejects(client.getResultsSummary(), /Hub realtime endpoint not configured/);
});
