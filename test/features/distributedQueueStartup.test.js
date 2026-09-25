const assert = require("node:assert/strict");
const test = require("node:test");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const { readSource } = require("../_helpers/sourceReader");

const source = readSource("src/extension.ts");
const start = source.indexOf("async resumePersistedDistributedQueue() {");
const end = source.indexOf("async deferDistributedPlan(", start);
assert.ok(start >= 0 && end > start);
const method = source.slice(start, end).replace("async resumePersistedDistributedQueue()", "async function resumePersistedDistributedQueue()");
const sandbox = { workspaceRoot: () => "C:/project", Object };
vm.createContext(sandbox);
vm.runInContext(method + "\nthis.resume = resumePersistedDistributedQueue;", sandbox);

test("activation reconnects and ticks a persisted Plan queue without opening the panel", async () => {
  const events = [];
  const provider = {
    lastWorkerProbes: {},
    isRealtimeMode: () => true,
    projectTopologyAssessment: () => ({ mode: "worker_pool" }),
    loadDistributedQueue: async () => ({ plans: [{ jobs: [{ status: "pending" }] }] }),
    tickDistributedQueue: async () => { events.push("tick"); provider.lastWorkerProbes = { workerA: { status: "ok" } }; },
    startAvailabilityPushLoop: () => events.push("availability"),
    ensureRealtimeConnected: async () => events.push("connected"),
  };
  await sandbox.resume.call(provider);
  assert.deepEqual(events, ["tick", "availability", "connected"]);
  const activation = source.slice(source.indexOf("async runActivationOnboarding()"), source.indexOf("async recordOnboardingBackgroundError"));
  assert.ok(activation.indexOf("projectStateBootstrap") < activation.indexOf("distributedQueueContinuation"));
  assert.match(activation, /distributedQueueContinuation.*resumePersistedDistributedQueue/);
});

test("activation does not start Worker communication for a completed queue", async () => {
  const provider = {
    lastWorkerProbes: {},
    isRealtimeMode: () => true,
    projectTopologyAssessment: () => ({ mode: "worker_pool" }),
    loadDistributedQueue: async () => ({ plans: [{ jobs: [{ status: "completed" }] }] }),
    tickDistributedQueue: async () => { throw new Error("unexpected dispatch"); },
  };
  await sandbox.resume.call(provider);
});

test("an outstanding queue retries an unavailable tunnel probe without a panel", async () => {
  const tickStart = source.indexOf("async tickDistributedQueueCore() {");
  const tickEnd = source.indexOf("const assigned = queue.plans.flatMap", tickStart);
  assert.ok(tickStart >= 0 && tickEnd > tickStart);
  const prefix = source.slice(tickStart, tickEnd).replace("async tickDistributedQueueCore()", "async function probeQueue()");
  const clock = { now: 100_000 };
  const probeSandbox = { workspaceRoot: () => "C:/project", Object, Date: { now: () => clock.now } };
  vm.createContext(probeSandbox);
  vm.runInContext(prefix + "return true; }\nthis.probeQueue = probeQueue;", probeSandbox);
  let probes = 0;
  const provider = {
    lastWorkerProbes: {}, distributedNextProbeAt: 0,
    isRealtimeMode: () => true,
    projectTopologyAssessment: () => ({ mode: "worker_pool" }),
    loadDistributedQueue: async () => ({ plans: [{ jobs: [{ status: "pending" }] }] }),
    testTunnel: async () => { probes += 1; if (probes === 2) provider.lastWorkerProbes = { workerA: { status: "ok" } }; },
  };
  assert.equal(await probeSandbox.probeQueue.call(provider), undefined);
  assert.equal(await probeSandbox.probeQueue.call(provider), undefined);
  assert.equal(probes, 1);
  clock.now += 30_000;
  assert.equal(await probeSandbox.probeQueue.call(provider), true);
  assert.equal(probes, 2);
});

test("pending jobs cannot use GPU slots until that Worker's task ledger is verified", () => {
  const start = source.indexOf("const rows = snapshot ? this.localWorkerAvailabilityRows", source.indexOf("async tickDistributedQueueCore()"));
  const end = source.indexOf("const allocation = DistributedPlanQueue.allocateAvailable", start);
  assert.ok(start >= 0 && end > start);
  const selectWorkers = new Function("snapshot", "verifiedWorkerIds", "occupied", "dispatchFingerprint",
    source.slice(start, end) + "return workers;");
  const provider = {
    lastWorkerProbes: { workerA: { status: "ok" } },
    lastCodeSyncState: { workerVersions: { workerA: { fingerprint: "code-a" } } },
    availabilityPushTtlSeconds: () => 45,
    schedulerSettings: () => ({}),
    localWorkerAvailabilityRows: () => [{ workerId: "workerA", availableGpuIds: ["0"] }],
  };
  const args = [{ workerA: [] }, new Set(), new Set(), "code-a"];
  assert.equal(selectWorkers.call(provider, ...args)[0].online, false);
  args[1].add("workerA");
  assert.equal(selectWorkers.call(provider, ...args)[0].online, true);
  assert.doesNotMatch(source.slice(source.indexOf("async tickDistributedQueueCore()"), source.indexOf("async syncDistributedJobArtifacts(")),
    /catch\s*\{\s*snapshot\s*=\s*this\.lastRealtimeState\?\.gpu/);
});

test("restart resends an unacknowledged dispatch with its original command ID", async () => {
  const compiled = fs.readFileSync(path.join(__dirname, "../../dist/extension/legacy.js"), "utf8");
  const start = compiled.indexOf("async tickDistributedQueueCore() {");
  const end = compiled.indexOf("async syncDistributedJobArtifacts(", start);
  assert.ok(start >= 0 && end > start);
  const queueMethod = compiled.slice(start, end).replace("async tickDistributedQueueCore()", "async function tickQueue()");
  const DistributedPlanQueue = require("../../dist/features/DistributedPlanQueue");
  const context = {
    workspaceRoot: () => "C:/project", DistributedPlanQueue,
    mapLimited: async (items, _limit, fn) => Promise.all(items.map(fn)),
    Object, Set, Date, errorMessage: String,
  };
  vm.createContext(context);
  vm.runInContext(queueMethod + "\nthis.tickQueue = tickQueue;", context);
  let queue = { schemaVersion: 1, plans: [{
    id: "plan-1", planFile: "plans/p.yaml", revision: "rev-1", codeFingerprint: "code-1",
    jobs: [{ index: 0, case: "case-a", seed: 1, attempt: 1, outputDir: "runs/a",
      status: "dispatching", workerId: "worker-a", gpuId: "0", commandId: "command-1" }],
  }], deferred: [] };
  const sent = [];
  const provider = {
    lastWorkerProbes: { "worker-a": { status: "ok" } }, lastCodeSyncState: { workerVersions: {} },
    isRealtimeMode: () => true, projectTopologyAssessment: () => ({ mode: "worker_pool" }),
    loadDistributedQueue: async () => queue,
    saveDistributedQueue: async (_root, next) => { queue = next; },
    workerActionTargets: () => [{ id: "worker-a" }],
    readWorkerTaskSnapshot: async () => ({ tasks: [] }),
    sendDistributedJob: async (_plan, _job, workerId, gpuId, commandId) => {
      sent.push({ workerId, gpuId, commandId });
      return { status: "completed" };
    },
    client: { getGpu: async () => ({}) },
    localWorkerAvailabilityRows: () => [], availabilityPushTtlSeconds: () => 45,
    schedulerSettings: () => ({}), scheduleDistributedPostprocess: () => undefined,
    postState: () => undefined,
  };
  await context.tickQueue.call(provider);
  assert.deepEqual(sent, [{ workerId: "worker-a", gpuId: "0", commandId: "command-1" }]);
  assert.equal(queue.plans[0].jobs[0].status, "running");
  assert.equal(queue.plans[0].jobs[0].commandId, "command-1");
});
