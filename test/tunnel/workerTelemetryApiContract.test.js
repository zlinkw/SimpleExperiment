const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { MultiEndpointRealtimeClient, mergeWorkerResultsSummaries } = require("../../dist/tunnel/MultiEndpointRealtimeClient.js");
const { RequestBudget, defaultRequestBudgetConfig } = require("../../dist/tunnel/RequestBudget.js");

const {
  workerTelemetryAllowedEvents,
  workerTelemetryAllowedActions,
  workerLocalSchedulerActionNames,
  workerResultActionNames,
  workerTelemetryForbiddenEndpoints,
  workerTelemetryRequiredEndpoints,
  validateWorkerTelemetryCapabilities,
} = require("../../dist/tunnel/WorkerTelemetryApi.js");

function panelFunction(name) {
  const source = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing ${name}`);
  const body = source.indexOf("{", start);
  let depth = 0;
  for (let index = body; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`unterminated ${name}`);
}

test("worker telemetry permits bounded worker controls plus local scheduler actions", () => {
  assert.ok(workerTelemetryRequiredEndpoints.includes("/api/gpu"));
  assert.ok(workerTelemetryRequiredEndpoints.includes("/api/worker/tasks"));
  assert.ok(workerTelemetryRequiredEndpoints.includes("/api/results/summary"));
  assert.deepEqual([...workerTelemetryAllowedActions].sort(), [
    "POST /api/actions/start-worker-task",
    "POST /api/actions/retry-worker-task",
    "POST /api/actions/stop-worker-task",
    "POST /api/actions/delete-worker-artifacts",
    "POST /api/actions/archive-worker-artifacts",
  ].sort());
  assert.deepEqual([...workerLocalSchedulerActionNames], ["validate-plan", "dry-run-plan", "run-plan", "reproduce-plan"]);
  assert.ok(workerResultActionNames.includes("parse-results"));
  assert.ok(workerResultActionNames.includes("archive-artifacts"));
  assert.equal(workerTelemetryForbiddenEndpoints.includes("POST /api/actions/parse-results"), false);
  assert.ok(workerTelemetryForbiddenEndpoints.includes("GET /api/files/*"));
  assert.deepEqual([...workerTelemetryAllowedEvents].sort(), ["agent_heartbeat", "diagnostics_updated", "gpu_snapshot", "log_tail", "worker_health", "worker_task_snapshot"].sort());
});

test("worker capabilities tolerate missing file and action api", () => {
  const result = validateWorkerTelemetryCapabilities({
    schemaVersion: 1,
    mode: "worker_telemetry",
    apiVersion: "1",
    agentVersion: "1",
    endpoints: { health: true, capabilities: true, gpu: true, workerTasks: true, resultsSummary: true, liveOutput: true, diagnostics: true, websocketEvents: true, sseEvents: true, actions: false, fileList: false },
  });
  assert.equal(result.ok, true);
});

test("worker capabilities accept local scheduler actions and reject other Hub actions", () => {
  const base = {
    schemaVersion: 1,
    mode: "worker_telemetry",
    apiVersion: "1",
    agentVersion: "1",
    endpoints: { health: true, capabilities: true, gpu: true, workerTasks: true, resultsSummary: true, liveOutput: true, diagnostics: true, websocketEvents: true, sseEvents: true, actions: true, fileList: false },
  };
  assert.equal(validateWorkerTelemetryCapabilities({ ...base, actionEndpoints: { "start-worker-task": true, "retry-worker-task": true } }).ok, true);
  assert.equal(validateWorkerTelemetryCapabilities({ ...base, actionEndpoints: { "run-plan": true, "validate-plan": true } }).ok, true);
  assert.equal(validateWorkerTelemetryCapabilities({ ...base, actionEndpoints: { "parse-results": true, "archive-artifacts": true } }).ok, true);
  assert.equal(validateWorkerTelemetryCapabilities({ ...base, actionEndpoints: { "deploy-runtime": true } }).ok, false);
});

test("Worker-only client requires topology stamp and never substitutes Worker for Hub", async () => {
  const client = new MultiEndpointRealtimeClient([
    { id: "worker-1", role: "worker", localHost: "127.0.0.1", localPort: 1 },
  ], () => new RequestBudget({ ...defaultRequestBudgetConfig, minIntervalByPurpose: {}, disabledPurposes: [] }));
  await assert.rejects(client.postWorkerAction("worker-1", "run-plan", {}), /action not allowed/);
  await assert.rejects(client.postWorkerAction("worker-1", "parse-results", {}), /action not allowed/);
  await assert.rejects(client.postAction("run-plan", {}), /Hub realtime endpoint not configured/);
  await assert.rejects(client.getResultsSummary(), /fetch failed|ECONNREFUSED|No Worker endpoint/);
});

test("Worker summaries merge read-only while preserving result ownership", () => {
  const merged = mergeWorkerResultsSummaries([
    { workerId: "worker-b", summary: { planFile: "experiments/plans/demo.yaml", planRevision: "rev-1", workerSetRevision: "set-1", results: [{ resultId: "same", finalEvidenceState: "pending_review" }] } },
    { workerId: "worker-a", summary: { planFile: "experiments/plans/demo.yaml", planRevision: "rev-1", workerSetRevision: "set-1", results: [{ resultId: "same", finalEvidenceState: "archived", metrics: { AUC: { value: 0.9 } } }] } },
  ], "experiments/plans/demo.yaml");
  assert.equal(merged.authoritative, false);
  assert.equal(merged.displayAggregateOnly, true);
  assert.equal(merged.resultCount, 2);
  assert.equal(merged.finalResultCount, 1);
  assert.deepEqual(merged.workerIds, ["worker-a", "worker-b"]);
  assert.deepEqual(merged.results.map((row) => row.resultOwnershipKey).sort(), ["worker-a:same", "worker-b:same"]);
  assert.ok(merged.results.every((row) => row.workerId === row.resultOwnerWorkerId && row.provenance.workerId === row.workerId));
});

test("no-Hub result buttons use the owning Worker capability instead of Hub capability", () => {
  const sandbox = {
    noHubWorkerResultCommands: new Set(["archiveArtifacts", "parseResults", "refreshResults"]),
    asArray: (value) => Array.isArray(value) ? value : [],
    resolveWorkerId: (value) => String(value || "").trim(),
    uniqueText: (values) => [...new Set(values)],
    enabledWorkerTunnelsForState: (state) => state.setup.workerTunnels.filter((worker) => worker.enabled !== false),
    hasCapability: () => false,
  };
  vm.createContext(sandbox);
  vm.runInContext(panelFunction("missingNoHubWorkerResultCapabilities") + "\nthis.check = missingNoHubWorkerResultCapabilities;", sandbox);
  const good = { status: "ok", capabilities: { endpoints: { actions: true, resultsSummary: true }, actionEndpoints: { "archive-artifacts": true, "parse-results": true } } };
  const stale = { status: "ok", capabilities: { endpoints: { actions: true, resultsSummary: false }, actionEndpoints: { "archive-artifacts": false, "parse-results": false } } };
  const state = {
    topology: { mode: "worker_pool" },
    setup: { workerTunnels: [{ id: "worker-a" }, { id: "worker-b" }] },
    workerProbes: { "worker-a": good, "worker-b": stale },
  };
  assert.deepEqual([...sandbox.check(state, "archiveArtifacts", ["actions.archive-artifacts"], { workerId: "worker-a" })], []);
  assert.deepEqual([...sandbox.check(state, "parseResults", ["actions.parse-results"], {})], ["worker-b: actions.parse-results"]);
  assert.deepEqual([...sandbox.check(state, "refreshResults", ["endpoints.resultsSummary"], {})], ["worker-b: endpoints.resultsSummary"]);
  assert.equal(sandbox.check({ ...state, topology: { mode: "hub_worker" } }, "parseResults", ["actions.parse-results"], {}), null);
});
