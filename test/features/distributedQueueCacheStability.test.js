const assert = require("node:assert/strict");
const test = require("node:test");
const vm = require("node:vm");
const path = require("node:path");
const crypto = require("node:crypto");
const queueApi = require("../../dist/features/DistributedPlanQueue.js");
const schedulingPolicy = require("../../dist/features/DistributedSchedulingPolicy.js");
const source = require("node:fs").readFileSync(require.resolve("../../dist/extension/legacy.js"), "utf8");

function sourceBlock(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `missing compiled method: ${startMarker}`);
  return source.slice(start, end);
}

const memoryFiles = new Map();
const memoryFs = {
  async readFile(file) {
    if (!memoryFiles.has(file)) {
      const error = new Error("missing");
      error.code = "ENOENT";
      throw error;
    }
    return memoryFiles.get(file);
  },
  async mkdir() {},
  async writeFile(file, value) { memoryFiles.set(file, String(value)); },
  async rename(from, to) {
    if (!memoryFiles.has(from)) throw new Error("temporary file missing");
    memoryFiles.set(to, memoryFiles.get(from));
    memoryFiles.delete(from);
  },
};

const queueMethods = sourceBlock("async loadDistributedQueue(root) {", "scheduleDistributedPostprocess(root")
  .replace(/}\s+async /g, "}, async ").replace(/,\s*$/, "").trim();
const progressMethod = sourceBlock("serverPlanProgress() {", "async refreshServerPlanProgress() {")
  .replace(/}\s+async /g, "}, async ").replace(/,\s*$/, "").trim();
const methodSource = `${queueMethods},\n${progressMethod}`;
const sandbox = {
  DistributedPlanQueue: queueApi,
  DistributedSchedulingPolicy: schedulingPolicy,
  DistributedPlanQueue_1: queueApi,
  DistributedSchedulingPolicy_1: schedulingPolicy,
  fs: memoryFs,
  path,
  process,
  crypto,
  workspaceRoot: () => "C:/project",
  errorMessage: (error) => String(error?.message || error),
  compactSensitiveText: (value) => String(value || "").slice(0, 240),
  workerTaskSnapshotPayload: (snapshot) => snapshot,
  UiCommandRemotePending: class extends Error {},
};
vm.createContext(sandbox);
vm.runInContext(`this.methods = { ${methodSource} };`, sandbox);

const root = "C:/project";
const file = queueApi.distributedQueuePath("C:/storage", root);
const projectId = queueApi.canonicalProjectId(root);

function makeQueue(count, job = {}) {
  return { schemaVersion: 1, plans: Array.from({ length: count }, (_, index) => ({
    id: `plan-${index}`, projectId, planFile: `experiments/plans/plan-${index}.yaml`, revision: "r1",
    codeFingerprint: "fp", enqueuedAt: new Date(1_700_000_000_000 + index).toISOString(), jobs: [{
      index: 0, case: "case", seed: 1, attempt: 1, status: "completed", workerId: "worker-0",
      commandId: `command-${index}`, outputDir: `experiments/runs/plan-${index}/attempts/one`,
      finishedAt: new Date(1_700_000_000_000).toISOString(), ...job,
    }],
  })), deferred: [] };
}

function makeHost() {
  return {
    ...sandbox.methods,
    context: { globalStorageUri: { fsPath: "C:/storage" } },
    distributedQueueWritePromise: Promise.resolve(),
    distributedQueueRoot: "",
    distributedQueueCache: undefined,
    distributedQueueDiskSignature: "",
    distributedQueueStorageDiagnostics: { status: "ready" },
    distributedQueueGeneration: 0,
    postStateCount: 0,
    postState() { this.postStateCount += 1; },
    detachStaleDistributedTick() {},
    workerActionTargets: () => [],
    cachedWorkerTaskSnapshot: () => undefined,
  };
}

test("20 tick-equivalent writes keep all 28 historical Plans visible and isolate the display snapshot", async () => {
  memoryFiles.clear();
  memoryFiles.set(file, JSON.stringify(makeQueue(28)));
  const host = makeHost();
  let firstWorking;
  let initialDisplay;
  for (let index = 0; index < 20; index++) {
    const working = await host.loadDistributedQueue(root);
    if (index === 0) {
      firstWorking = working;
      initialDisplay = JSON.stringify(host.distributedQueueCache);
      const base = queueApi.distributedQueueBaseSignature(working);
      working.plans[0].jobs[0].finishedAt = "mutated-only-in-working-copy";
      assert.equal(JSON.stringify(host.distributedQueueCache), initialDisplay);
      assert.equal(queueApi.distributedQueueBaseSignature(working), base);
    }
    working.plans[0].jobs[0].error = `tick-${index}`;
    await host.saveDistributedQueue(root, working);
    const state = { distributedPlans: host.serverPlanProgress() };
    assert.equal(state.distributedPlans.length, 28);
    assert.equal(host.distributedQueueStorageDiagnostics.status, "ready");
  }
  assert.equal(host.distributedQueueCache.plans.length, 28);
  assert.notEqual(firstWorking, host.distributedQueueCache);
});

test("concurrent artifact and publication patches read their base inside the serialized write", async () => {
  memoryFiles.clear();
  memoryFiles.set(file, JSON.stringify(makeQueue(28)));
  const host = makeHost();
  await host.loadDistributedQueue(root);
  await Promise.all([
    host.patchDistributedJob(root, "plan-0", 0, 1, { fragmentWorkerIds: ["worker-1"] }),
    host.patchDistributedJob(root, "plan-1", 0, 1, { mirroredWorkerIds: ["worker-2"] }),
    host.patchDistributedPublication(root, { publishedSignature: "latest" }),
  ]);
  const queue = JSON.parse(memoryFiles.get(file));
  assert.deepEqual(queue.plans[0].jobs[0].fragmentWorkerIds, ["worker-1"]);
  assert.deepEqual(queue.plans[1].jobs[0].mirroredWorkerIds, ["worker-2"]);
  assert.equal(queue.publishedSignature, "latest");
  assert.equal(host.serverPlanProgress().length, 28);
});

test("a tick preserves intervening same-Host metadata writes without false external conflicts", async () => {
  memoryFiles.clear();
  memoryFiles.set(file, JSON.stringify(makeQueue(28)));
  const host = makeHost();
  for (let index = 0; index < 20; index++) {
    const working = await host.loadDistributedQueue(root);
    working.plans[0].jobs[0].error = `tick-${index}`;
    await host.patchDistributedJob(root, "plan-1", 0, 1, { fragmentWorkerIds: [`worker-${index}`] });
    await host.saveDistributedQueue(root, working, { queueGeneration: 0 });
    const queue = JSON.parse(memoryFiles.get(file));
    assert.ok(queue.plans[1].jobs[0].fragmentWorkerIds.includes(`worker-${index}`));
    assert.equal(queue.plans[0].jobs[0].error, `tick-${index}`);
    assert.equal(host.serverPlanProgress().length, 28);
    assert.equal(host.distributedQueueStorageDiagnostics.status, "ready");
  }
});

test("an intervening business-state write cannot be rebased as artifact metadata", async () => {
  memoryFiles.clear();
  memoryFiles.set(file, JSON.stringify(makeQueue(28)));
  const host = makeHost();
  const stale = await host.loadDistributedQueue(root);
  const fresh = await host.loadDistributedQueue(root);
  fresh.plans[1].jobs[0].status = "failed";
  await host.saveDistributedQueue(root, fresh);
  await assert.rejects(host.saveDistributedQueue(root, stale), /另一窗口已更新/);
  assert.equal(JSON.parse(memoryFiles.get(file)).plans[1].jobs[0].status, "failed");
});

test("terminal task logs remain bound to their attempt over ten repeated Worker snapshots", async () => {
  memoryFiles.clear();
  const initial = makeQueue(1, { logPath: "tmp/tmux_logs/gpu-0.log" });
  memoryFiles.set(file, JSON.stringify(initial));
  const host = makeHost();
  for (let index = 0; index < 10; index++) {
    const working = await host.loadDistributedQueue(root);
    const plan = working.plans[0];
    const job = plan.jobs[0];
    const binding = queueApi.workerTaskLogBinding(plan, job, "tmp/tmux_logs/gpu-0.log");
    assert.ok(binding);
    Object.assign(job, binding);
    await host.saveDistributedQueue(root, working);
    const stored = host.distributedQueueCache.plans[0].jobs[0];
    assert.equal(stored.logPath, `${stored.outputDir}/stdout.log`);
    assert.equal(JSON.stringify(stored.historyLogIdentity), JSON.stringify({
      commandId: "command-0", outputDir: stored.outputDir, runId: "plan-0",
    }));
    assert.equal(host.distributedQueueStorageDiagnostics.status, "ready");
  }
});

test("real disk edits conflict without overwriting the disk or emptying the last-known-good display", async () => {
  memoryFiles.clear();
  memoryFiles.set(file, JSON.stringify(makeQueue(28)));
  const host = makeHost();
  const staleWork = await host.loadDistributedQueue(root);
  staleWork.plans[0].jobs[0].error = "stale write";
  const externalSource = JSON.stringify(makeQueue(29));
  memoryFiles.set(file, externalSource);

  await assert.rejects(host.saveDistributedQueue(root, staleWork), /另一窗口已更新/);
  assert.equal(memoryFiles.get(file), externalSource);
  assert.equal(host.distributedQueueCache.plans.length, 29);
  assert.equal(host.serverPlanProgress().length, 29);
  assert.equal(host.distributedQueueStorageDiagnostics.status, "conflict");
  assert.equal(host.postStateCount, 1);
});

test("a disk read failure retains the last-known-good display queue and marks it stale", async () => {
  memoryFiles.clear();
  memoryFiles.set(file, JSON.stringify(makeQueue(28)));
  const host = makeHost();
  await host.loadDistributedQueue(root);
  const readFile = memoryFs.readFile;
  memoryFs.readFile = async () => { throw new Error("disk unavailable"); };
  try {
    const loaded = await host.loadDistributedQueue(root);
    assert.equal(loaded.plans.length, 28);
    assert.equal(host.distributedQueueCache.plans.length, 28);
    assert.equal(host.serverPlanProgress().length, 28);
    assert.equal(host.distributedQueueStorageDiagnostics.status, "stale");
  } finally {
    memoryFs.readFile = readFile;
  }
});
