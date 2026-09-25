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

test("activation does not start Worker communication for a fully mirrored completed queue", async () => {
  const provider = {
    lastWorkerProbes: {},
    isRealtimeMode: () => true,
    projectTopologyAssessment: () => ({ mode: "worker_pool" }),
    workerCodeSyncTargets: () => [{ id: "worker-a" }],
    loadDistributedQueue: async () => ({ plans: [{ jobs: [{ status: "completed", mirroredWorkerIds: ["worker-a"] }] }] }),
    tickDistributedQueue: async () => { throw new Error("unexpected dispatch"); },
  };
  await sandbox.resume.call(provider);
});

test("activation retries completed jobs whose mirrors were not verified", async () => {
  let ticks = 0;
  const provider = {
    lastWorkerProbes: {}, isRealtimeMode: () => true,
    projectTopologyAssessment: () => ({ mode: "worker_pool" }),
    workerCodeSyncTargets: () => [{ id: "worker-a" }, { id: "worker-b" }],
    loadDistributedQueue: async () => ({ plans: [{ jobs: [{ status: "completed", mirroredWorkerIds: ["worker-a"], artifactError: "offline" }] }] }),
    tickDistributedQueue: async () => { ticks += 1; },
  };
  await sandbox.resume.call(provider);
  assert.equal(ticks, 1);
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
    workerCodeSyncTargets: () => [],
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

test("completed job retries a stale source probe even while another Worker is online", async () => {
  const tickStart = source.indexOf("async tickDistributedQueueCore() {");
  const tickEnd = source.indexOf("const assigned = queue.plans.flatMap", tickStart);
  const prefix = source.slice(tickStart, tickEnd).replace("async tickDistributedQueueCore()", "async function probeQueue()");
  const probeSandbox = { workspaceRoot: () => "C:/project", Object, Date: { now: () => 100_000 } };
  vm.createContext(probeSandbox);
  vm.runInContext(prefix + "return true; }\nthis.probeQueue = probeQueue;", probeSandbox);
  let probes = 0;
  const provider = {
    lastWorkerProbes: { "worker-a": { status: "ok" }, "worker-b": { status: "timeout" } },
    distributedNextProbeAt: 0, isRealtimeMode: () => true,
    projectTopologyAssessment: () => ({ mode: "worker_pool" }),
    workerCodeSyncTargets: () => [{ id: "worker-a" }],
    loadDistributedQueue: async () => ({ plans: [{ jobs: [{ status: "completed", workerId: "worker-b", artifactError: "source offline", mirroredWorkerIds: [] }] }] }),
    testTunnel: async () => { probes += 1; provider.lastWorkerProbes["worker-b"] = { status: "ok" }; },
  };
  assert.equal(await probeSandbox.probeQueue.call(provider), true);
  assert.equal(probes, 1);
});

test("manual refresh re-probes Workers and retries artifact sync without waiting for backoff", async () => {
  const compiled = fs.readFileSync(path.join(__dirname, "../../dist/extension/legacy.js"), "utf8");
  const first = compiled.indexOf("async manualSnapshot() {");
  const last = compiled.indexOf("async manualGpuSnapshot() {", first);
  assert.ok(first >= 0 && last > first);
  const context = { workspaceRoot: () => "C:/project", errorMessage: String,
    vscode: { window: { showInformationMessage: () => undefined } } };
  vm.createContext(context);
  vm.runInContext(compiled.slice(first, last).replace("async manualSnapshot()", "async function manualSnapshot()")
    + "\nthis.refresh = manualSnapshot;", context);
  const events = [];
  const client = { getSnapshot: async () => { events.push("snapshot"); return {}; },
    getGpu: async () => ({}), getScheduler: async () => [], getTraces: async () => [] };
  const provider = {
    projectContextGeneration: 0, client: {}, localPlanMetadata: {},
    refreshLocalPlanMetadata: async () => undefined,
    effectiveConnectionMode: () => "realtime",
    testTunnel: async () => { events.push("probe"); provider.client = client; },
    pushLocalWorkerAvailability: async () => undefined,
    projectTopologyAssessment: () => ({ mode: "worker_pool" }),
    loadDistributedQueue: async () => ({ plans: [{ id: "plan-1", jobs: [{ index: 0, attempt: 1, status: "completed", artifactRetryAfter: "tomorrow" }] }] }),
    patchDistributedJob: async (_root, _plan, _index, _attempt, fields) => { events.push(fields.artifactRetryAfter === undefined ? "retry-now" : "wrong-retry"); },
    tickDistributedQueue: async () => { events.push("tick"); },
    postState: () => undefined,
  };
  await context.refresh.call(provider);
  assert.ok(events.indexOf("probe") < events.indexOf("snapshot"));
  assert.ok(events.indexOf("retry-now") < events.indexOf("tick"));
});

test("successful artifact pass clears an old disconnected warning", async () => {
  const compiled = fs.readFileSync(path.join(__dirname, "../../dist/extension/legacy.js"), "utf8");
  const first = compiled.indexOf("async syncDistributedJobArtifacts(");
  const last = compiled.indexOf("async distributedOutputHashes(", first);
  assert.ok(first >= 0 && last > first);
  const context = { workspaceRoot: () => "C:/project", Date, Set, Map, Object, errorMessage: String };
  vm.createContext(context);
  vm.runInContext(compiled.slice(first, last).replace("async syncDistributedJobArtifacts(root, queue, phase, verifyAll = false)", "async function syncJobArtifacts(root, queue, phase, verifyAll = false)")
    + "\nthis.sync = syncJobArtifacts;", context);
  const job = { index: 0, attempt: 1, status: "completed", workerId: "worker-b", outputDir: "runs/a",
    artifacts: {}, fragmentWorkerIds: ["worker-a"], mirroredWorkerIds: ["worker-a"], artifactError: "old disconnect" };
  const patched = [];
  const provider = {
    distributedProjectContract: () => ({ fragmentPaths: [], requiredPaths: [] }),
    workerCodeSyncTargets: () => [{ id: "worker-a" }],
    lastWorkerProbes: { "worker-a": { status: "ok" } },
    sftpServerOptions: () => ({}),
    patchDistributedJob: async (_root, _plan, _index, _attempt, fields) => patched.push(fields),
  };
  await context.sync.call(provider, "C:/project", { plans: [{ id: "plan-1", planFile: "plans/p.yaml", jobs: [job] }] }, "bulk");
  assert.equal(job.artifactError, undefined);
  assert.ok(patched.some((row) => Object.hasOwn(row, "artifactError") && row.artifactError === undefined));
});

test("a failed preview rebuild does not prevent completed job artifacts from mirroring", async () => {
  const compiled = fs.readFileSync(path.join(__dirname, "../../dist/extension/legacy.js"), "utf8");
  const first = compiled.indexOf("scheduleDistributedPostprocess(root, rerunIfBusy = false) {");
  const last = compiled.indexOf("async enqueueDistributedPlan(", first);
  assert.ok(first >= 0 && last > first);
  const context = { workspaceRoot: () => "C:/project", errorMessage: String };
  vm.createContext(context);
  vm.runInContext(compiled.slice(first, last).replace("scheduleDistributedPostprocess(root, rerunIfBusy = false)",
    "function scheduleDistributedPostprocess(root, rerunIfBusy = false)")
    + "\nthis.schedule = scheduleDistributedPostprocess;", context);
  const calls = [];
  const provider = {
    loadDistributedQueue: async () => ({ plans: [{}] }),
    syncDistributedJobArtifacts: async (_root, _queue, phase) => calls.push(phase),
    rebuildDistributedResults: async (_root, _queue, preview) => {
      calls.push(preview ? "preview" : "final");
      if (preview) throw new Error("preview failed");
    },
    recordActionError: ({ command }) => calls.push(command),
    postState: () => calls.push("state"),
  };
  context.schedule.call(provider, "C:/project");
  await provider.distributedPostprocessPromise;
  assert.deepEqual(calls, ["fragments", "preview", "distributedPreviewRebuild", "bulk", "final", "state"]);
});

test("every newly completed job rechecks all recorded job mirrors and repairs drift", async () => {
  const compiled = fs.readFileSync(path.join(__dirname, "../../dist/extension/legacy.js"), "utf8");
  const first = compiled.indexOf("async syncDistributedJobArtifacts(");
  const last = compiled.indexOf("async distributedOutputHashes(", first);
  const context = { workspaceRoot: () => "C:/project", Date, Set, Map, Object, errorMessage: String };
  vm.createContext(context);
  vm.runInContext(compiled.slice(first, last).replace("async syncDistributedJobArtifacts(root, queue, phase, verifyAll = false)",
    "async function syncJobArtifacts(root, queue, phase, verifyAll = false)")
    + "\nthis.sync = syncJobArtifacts;", context);
  const file = "runs/a/result.csv";
  const job = { index: 0, attempt: 1, status: "completed", workerId: "w2", outputDir: "runs/a",
    artifacts: { [file]: "new" }, fragmentWorkerIds: ["w2", "w3"], mirroredWorkerIds: ["w2", "w3"] };
  let copied = false;
  const patches = [];
  const provider = {
    distributedProjectContract: () => ({ fragmentPaths: [], requiredPaths: [] }),
    workerCodeSyncTargets: () => [{ id: "w2" }, { id: "w3" }],
    lastWorkerProbes: { w2: { status: "ok" }, w3: { status: "ok" } },
    sftpServerOptions: (target) => ({ id: target.id }),
    verifiedSftpProjectInventory: async ({ source }) => ({ files: { [file]: { sha256: source.id === "w2" || copied ? "new" : "old" } } }),
    assertSshTransportIdentities: async () => undefined,
    simpleSftpApiCall: async () => { copied = true; },
    patchDistributedJob: async (_root, _plan, _index, _attempt, fields) => patches.push(fields),
    recordActionError: () => undefined,
  };
  await context.sync.call(provider, "C:/project", { plans: [{ id: "p", planFile: "p.yaml", jobs: [job] }] }, "bulk", true);
  assert.equal(copied, true);
  assert.ok(patches.some((fields) => fields.replaceMirroredWorkerIds && !fields.mirroredWorkerIds.includes("w3")));
  assert.deepEqual(Array.from(job.mirroredWorkerIds), ["w2", "w3"]);
});

test("a new completion also repairs a stale shared preview on every Worker", async () => {
  const compiled = fs.readFileSync(path.join(__dirname, "../../dist/extension/legacy.js"), "utf8");
  const first = compiled.indexOf("async rebuildDistributedResults(");
  const last = compiled.indexOf("async retryDistributedJobFromUi(", first);
  const context = {
    workspaceRoot: () => "C:/project", Map, Set, Object,
    crypto: { createHash: () => ({ update: () => ({ digest: () => "signature" }) }) },
  };
  vm.createContext(context);
  vm.runInContext(compiled.slice(first, last).replace("async rebuildDistributedResults(root, queue, previewOnly, verifyAll = false)",
    "async function rebuildDistributedResults(root, queue, previewOnly, verifyAll = false)")
    + "\nthis.rebuild = rebuildDistributedResults;", context);
  const file = "simple_cluster/results/distributed_preview.json";
  const queue = { plans: [{ planFile: "p.yaml", revision: "r", jobs: [{
    case: "a", seed: 1, attempt: 1, status: "completed", workerId: "w3", outputDir: "runs/a",
    artifacts: {}, fragmentWorkerIds: ["w3", "w2"], mirroredWorkerIds: ["w3", "w2"],
  }] }], previewSignature: "signature", previewWorkerId: "w3", previewWorkerIds: ["w3", "w2"], previewPaths: [file] };
  let copied = false;
  const patches = [];
  const provider = {
    distributedProjectContract: () => ({ fragmentPaths: [], requiredPaths: [], configPath: "cfg", checkpointPath: "chk",
      resultRowsPath: "rows", fourStatePath: "four" }),
    workerCodeSyncTargets: () => [{ id: "w3" }, { id: "w2" }],
    lastWorkerProbes: { w3: { status: "ok" }, w2: { status: "ok" } },
    sftpServerOptions: (row) => ({ id: row.id }),
    distributedOutputHashes: async (source) => ({ [file]: source.id === "w3" || copied ? "good" : "old" }),
    patchDistributedPublication: async (_root, fields) => patches.push(fields),
    assertSshTransportIdentities: async () => undefined,
    simpleSftpApiCall: async () => { copied = true; },
    recordActionError: (error) => { throw new Error(error.message); },
  };
  await context.rebuild.call(provider, "C:/project", queue, true, true);
  assert.equal(copied, true);
  assert.ok(patches.some((fields) => fields.previewWorkerIds && !fields.previewWorkerIds.includes("w2")));
  assert.deepEqual(Array.from(queue.previewWorkerIds), ["w3", "w2"]);
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
    workerCodeSyncTargets: () => [],
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

test("a failed job retains its Agent error in the durable Plan queue", async () => {
  const compiled = fs.readFileSync(path.join(__dirname, "../../dist/extension/legacy.js"), "utf8");
  const start = compiled.indexOf("async tickDistributedQueueCore() {");
  const end = compiled.indexOf("async syncDistributedJobArtifacts(", start);
  const queueMethod = compiled.slice(start, end).replace("async tickDistributedQueueCore()", "async function tickQueue()");
  const DistributedPlanQueue = require("../../dist/features/DistributedPlanQueue");
  const context = { workspaceRoot: () => "C:/project", DistributedPlanQueue,
    mapLimited: async (items, _limit, fn) => Promise.all(items.map(fn)),
    compactSensitiveText: String, Object, Set, Date };
  vm.createContext(context);
  vm.runInContext(queueMethod + "\nthis.tickQueue = tickQueue;", context);
  let queue = { schemaVersion: 1, plans: [{ id: "plan-1", planFile: "plans/p.yaml", revision: "rev-1", codeFingerprint: "code-1",
    jobs: [{ index: 0, case: "case-a", seed: 1, attempt: 1, outputDir: "runs/a",
      status: "failed", workerId: "worker-a", gpuId: "0", commandId: "command-1" }] }], deferred: [] };
  const task = { commandId: "command-1", workflowId: "plan-1", planRevision: "rev-1", case: "case-a",
    seed: 1, attempt: 1, outputDir: "runs/a", workerId: "worker-a", gpuId: "0", status: "failed",
    error: "FileNotFoundError: missing label_schema.json" };
  const provider = {
    lastWorkerProbes: { "worker-a": { status: "ok" } }, distributedNextFailureDetailAt: 0,
    workerCodeSyncTargets: () => [],
    lastCodeSyncState: { workerVersions: {} },
    isRealtimeMode: () => true, projectTopologyAssessment: () => ({ mode: "worker_pool" }),
    loadDistributedQueue: async () => queue, saveDistributedQueue: async (_root, next) => { queue = next; },
    workerActionTargets: () => [{ id: "worker-a" }], readWorkerTaskSnapshot: async () => ({ tasks: [task] }),
    client: { getGpu: async () => ({}) }, localWorkerAvailabilityRows: () => [],
    availabilityPushTtlSeconds: () => 45, schedulerSettings: () => ({}),
    scheduleDistributedPostprocess: () => undefined, postState: () => undefined,
  };
  await context.tickQueue.call(provider);
  assert.equal(queue.plans[0].jobs[0].status, "failed");
  assert.equal(queue.plans[0].jobs[0].error, task.error);
});
