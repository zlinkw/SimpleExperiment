const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");

function extractMethod(name) {
  const match = new RegExp(`^\\s*(?:private\\s+)?(?:async\\s+)?${name}\\(`, "m").exec(source);
  assert.ok(match, `missing method ${name}`);
  const body = source.indexOf("{", match.index);
  let depth = 0;
  for (let index = body; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(match.index, index + 1).trim();
  }
  throw new Error(`unterminated method ${name}`);
}

test("Extension Host reuses endpoint assignments and port conflicts by config", () => {
  let assignmentCalls = 0;
  let conflictCalls = 0;
  const sandbox = {
    endpointAssignmentsFromConfig(config) {
      assignmentCalls += 1;
      return [
        { endpointId: "hub", role: "hub_control", localForwardPort: 18765 },
        ...config.workerTunnels.map((worker) => ({ endpointId: worker.id, role: "worker_telemetry", localForwardPort: worker.localForwardPort })),
      ];
    },
    detectStaticTunnelPortConflicts(assignments, range) {
      conflictCalls += 1;
      return assignments.filter((item) => item.localForwardPort < range.start || item.localForwardPort > range.end);
    },
  };
  const methods = ["currentAssignments", "currentPortConflicts"].map(extractMethod).join("\n")
    .replace(/\(0, TunnelEndpointRegistry_1\.endpointAssignmentsFromConfig\)/g, "endpointAssignmentsFromConfig")
    .replace(/\(0, TunnelPortAllocator_1\.detectStaticTunnelPortConflicts\)/g, "detectStaticTunnelPortConflicts");
  vm.createContext(sandbox);
  vm.runInContext(`
    class Subject {
      currentAssignmentsCacheConfig;
      currentAssignmentsCacheValue = [];
      currentPortConflictsCacheAssignments;
      currentPortConflictsCacheRangeKey = "";
      currentPortConflictsCacheValue = [];
      enabledWorkerConfigs() { return this.setupConfig.workerTunnels.filter((worker) => worker.enabled !== false); }
      ${methods}
    }
    this.Subject = Subject;
  `, sandbox);

  const subject = new sandbox.Subject();
  subject.setupConfig = {
    workerTunnels: [
      { id: "a", enabled: true, localForwardPort: 18766 },
      { id: "disabled", enabled: false, localForwardPort: 18767 },
    ],
    ports: { workerLocalPortRange: { start: 18000, end: 19000 } },
  };
  const assignments = subject.currentAssignments();
  const conflicts = subject.currentPortConflicts();
  assert.equal(subject.currentAssignments(), assignments);
  assert.equal(subject.currentPortConflicts(), conflicts);
  assert.deepEqual(assignments.map((item) => item.endpointId), ["hub", "a"]);
  assert.equal(assignmentCalls, 1);
  assert.equal(conflictCalls, 1);

  subject.setupConfig.ports.workerLocalPortRange.start = 18766;
  assert.notEqual(subject.currentPortConflicts(), conflicts);
  assert.equal(assignmentCalls, 1);
  assert.equal(conflictCalls, 2);

  subject.setupConfig = {
    workerTunnels: [{ id: "b", enabled: true, localForwardPort: 18768 }],
    ports: { workerLocalPortRange: { start: 18000, end: 19000 } },
  };
  assert.notEqual(subject.currentAssignments(), assignments);
  subject.currentPortConflicts();
  assert.equal(assignmentCalls, 2);
  assert.equal(conflictCalls, 3);
});

test("endpoint registry state consumes shared assignment and conflict views", () => {
  const endpointState = extractMethod("endpointRegistryState");
  assert.match(endpointState, /assignments: this\.currentAssignments\(\)/);
  assert.match(endpointState, /conflicts: this\.currentPortConflicts\(\)/);
});
