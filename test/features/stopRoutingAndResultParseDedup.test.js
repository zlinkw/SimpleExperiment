const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const { runOperationMatchesTarget } = require("../../dist/features/RunOperations");

const extensionSource = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");
const terminalStatuses = new Set(["completed", "failed", "cancelled", "stale"]);
const operationTerminal = (row) => terminalStatuses.has(String(row?.status || ""));

function extractMethod(source, signature) {
  const start = source.indexOf(signature);
  assert.ok(start >= 0, `missing method ${signature}`);
  const bodyStart = source.indexOf("{", start);
  assert.ok(bodyStart > start, `missing body for ${signature}`);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`unterminated method ${signature}`);
}

function createContext(extra = {}) {
  const context = {
    Error,
    Set,
    String,
    Number,
    Boolean,
    Date,
    Object,
    Array,
    Map,
    Promise,
    uniqueStrings: (values) => [...new Set(values.filter(Boolean))],
    stringField: (record, key) => String(record?.[key] || ""),
    numberField: (record, key) => Number(record?.[key] || 0),
    stringArrayField: (record, keys) => {
      const values = [keys].flat().map((key) => record?.[key]).find(Array.isArray);
      return Array.isArray(values) ? values.map(String) : [];
    },
    operationResultPlanFile: (row) => String(row?.planFile || row?.plan || row?.options?.planFile || ""),
    usableSelectionKey: (value) => String(value || "").trim(),
    operationTerminal: (row) => ["completed", "failed", "cancelled", "stale"].includes(String(row?.status || "")),
    makeOpId: (prefix) => `${prefix}-${Math.random().toString(16).slice(2)}`,
    resultStatus: (record) => String(record?.status || ""),
    stringFromRecord: (record, keys) => keys.map((key) => String(record?.[key] || "")).find(Boolean) || "",
    LONG_RUNNING_OPERATION_ACTIONS: new Set(["run-plan", "reproduce-plan"]),
    ...extra,
  };
  vm.createContext(context);
  return context;
}

test("single-worker stop routes by Plan to the sole Worker without Hub", async () => {
  const calls = [];
  const operation = {
    operationId: "run-plan-old",
    type: "run-plan",
    status: "running",
    planFile: "experiments/plans/demo.yaml",
    schedulerOwnerWorkerId: "nwpu3",
  };
  const provider = {
    resolveWorkerEndpointId: (value) => String(value || "").trim(),
    localOperations: { [operation.operationId]: { ...operation } },
    projectTopologyAssessment: () => ({ mode: "single_worker", hubAllowed: false }),
    enabledWorkerConfigs: () => [{ id: "nwpu3" }],
    longRunningPlanRunOperations() {
      return Object.values(this.localOperations).filter((row) => !operationTerminal(row));
    },
    runOperationWorkerId: (row) => String(row.schedulerOwnerWorkerId || ""),
    stopExperimentMatchesTarget: (row, target) => runOperationMatchesTarget(row, target),
    async postWorkerTunnelAction(workerId, action, request) {
      calls.push({ workerId, action, request });
      return { status: "completed", terminatedSessions: ["simple-scheduler-old"] };
    },
    markLocalOperationsDirty() {},
    postState() {},
  };

  const result = await contextStop(provider, { planFile: "experiments\\plans\\demo.yaml" });

  assert.deepEqual(calls.map((call) => [call.workerId, call.action]), [["nwpu3", "stop-scheduler-operation"]]);
  assert.equal(result.ok, true);
  assert.equal(result.stopped, 1);
  assert.deepEqual([...result.matchedOperations], ["run-plan-old"]);
  assert.equal(provider.localOperations["run-plan-old"].status, "completed");
});

test("single-worker orphan stop marks the submission stale when no process is terminated", async () => {
  const operation = {
    operationId: "run-plan-orphan",
    type: "run-plan",
    status: "running",
    planFile: "experiments/plans/orphan.yaml",
    schedulerOwnerWorkerId: "nwpu3",
  };
  const provider = {
    resolveWorkerEndpointId: (value) => String(value || "").trim(),
    localOperations: { [operation.operationId]: { ...operation } },
    projectTopologyAssessment: () => ({ mode: "single_worker", hubAllowed: false }),
    enabledWorkerConfigs: () => [{ id: "nwpu3" }],
    longRunningPlanRunOperations() {
      return Object.values(this.localOperations).filter((row) => !operationTerminal(row));
    },
    runOperationWorkerId: (row) => String(row.schedulerOwnerWorkerId || ""),
    stopExperimentMatchesTarget: (row, target) => runOperationMatchesTarget(row, target),
    async postWorkerTunnelAction() {
      return { status: "completed" };
    },
    markLocalOperationsDirty() {},
    postState() {},
  };

  const result = await contextStop(provider, { planFile: "experiments/plans/orphan.yaml" });

  assert.equal(result.stopped, 0);
  assert.equal(provider.localOperations["run-plan-orphan"].status, "stale");
  assert.equal(provider.localOperations["run-plan-orphan"].reconcileReason, "stop:no_remote_activity");
});

async function contextStop(provider, body) {
  const context = createContext({
    resolveWorkerEndpointId: (value) => String(value || "").trim(),
  });
  const method = extractMethod(extensionSource, "async stopExperimentRouted(body)");
  vm.runInContext(`const methods = { ${method} };\nthis.stopExperimentRouted = methods.stopExperimentRouted;`, context);
  return context.stopExperimentRouted.call(provider, body);
}

test("result parse idempotency keys include workspace, Plan version, and owner", () => {
  const context = createContext({
    workspaceRoot: () => "C:\\work\\project",
    sha256Text: (value) => {
      sha256Inputs.push(value);
      return crypto.createHash("sha256").update(String(value), "utf8").digest("hex");
    },
  });
  const sha256Inputs = [];
  const provider = {
    resolveWorkerEndpointId: (value) => String(value || "").trim(),
    localPlanForActionBody(message) {
      const file = this.stringPlanFile(message);
      return file === "plans/demo.yaml" ? { revision: "rev-1" } : {};
    },
    stringPlanFile(message) {
      return message.options.planFile;
    },
    planSchedulerWorkerId(message) {
      return message.options.selectedWorkerIds?.[0] || "default";
    },
  };
  const method = extractMethod(extensionSource, "resultParseIdempotencyKey(command, message)");
  vm.runInContext(`const methods = { ${method} };\nthis.resultParseIdempotencyKey = methods.resultParseIdempotencyKey;`, context);
  const key = context.resultParseIdempotencyKey.bind(provider);
  const message = {
    planFile: "plans/demo.yaml",
    selectedWorkerIds: ["nwpu3"],
    options: { planFile: "plans/demo.yaml", selectedWorkerIds: ["nwpu3"] },
  };
  const expectedInput = [
    "C:\\work\\project", "parseResults", "plans/demo.yaml", "rev-1", "nwpu3",
  ].join("\n");

  assert.equal(key("parseResults", message).length, 64);
  assert.equal(sha256Inputs.at(-1), expectedInput);
  assert.equal(key("refreshResults", message).length, 64);
  assert.notEqual(key("parseResults", message), key("parseResults", {
    ...message,
    selectedWorkerIds: ["nwpu4"],
    options: { ...message.options, selectedWorkerIds: ["nwpu4"] },
  }));
});

test("concurrent result parses merge into one active operation", async () => {
  const context = createContext({
    RESULT_PARSE_COMMANDS: new Set(["parseResults", "refreshResults"]),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    HostOperationLeaseConflictError: class HostOperationLeaseConflictError extends Error {},
    HostOperationLease_1: { HostOperationLeaseConflictError: class HostOperationLeaseConflictError extends Error {} },
  });
  const method = extractMethod(extensionSource, "async runActionCommand(command, message)");
  vm.runInContext(`const methods = { ${method} };\nthis.runActionCommand = methods.runActionCommand;`, context);
  const provider = {
    resultParseInFlight: new Map(),
    localOperations: {},
    resultParseIdempotencyKey: () => "parse-key",
    activeResultParseOperation(keyValue) {
      return Object.values(this.localOperations).find((row) => row.resultParseKey === keyValue && !operationTerminal(row));
    },
    async runActionCommandLeased() {
      calls += 1;
      this.localOperations.operation = { operationId: "operation", status: "running", resultParseKey: "parse-key" };
      await wait(30);
      return this.localOperations.operation;
    },
    async loadProjectLocalOperationsState() {},
  };
  let calls = 0;
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const first = context.runActionCommand.call(provider, "parseResults", {});
  await new Promise((resolve) => setTimeout(resolve, 5));
  const second = await context.runActionCommand.call(provider, "parseResults", {});
  const firstResult = await first;

  assert.equal(calls, 1);
  assert.equal(firstResult.merged, undefined);
  assert.equal(second.merged, true);
  assert.equal(firstResult.operationId, "operation");
  assert.equal(second.operationId, "operation");
});
