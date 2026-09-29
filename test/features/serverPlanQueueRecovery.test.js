const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readSource } = require("../_helpers/sourceReader");

const extension = readSource("src/extension.ts");
const queue = readSource("src/features/DistributedPlanQueue.ts");

test("fresh durable snapshots reconstruct a cold empty local queue across configured Workers", () => {
  const resumeStart = extension.indexOf("async resumePersistedDistributedQueue() {");
  const resumeEnd = extension.indexOf("async deferDistributedPlan(", resumeStart);
  const resume = extension.slice(resumeStart, resumeEnd);
  assert.match(resume, /if \(!queue\.plans\.length && !hasLegacyDeferred && this\.workerActionTargets\(\)\.length\)/);
  assert.match(resume, /distributed queue cold recovery/);
  const tickStart = extension.indexOf("async tickDistributedQueueCore(");
  const tickEnd = extension.indexOf("async syncDistributedJobArtifacts(", tickStart);
  const tick = extension.slice(tickStart, tickEnd);
  assert.match(tick, /const candidateWorkerIds = this\.workerActionTargets\(\)\.map/);
  assert.match(tick, /mergeDurableWorkerSnapshots\(queue, taskSnapshots/);
  assert.doesNotMatch(tick, /lastRealtimeState\?\.workerTasks\?\[workerId\]/);
});

test("new admission carries project identity and expected count, and requires a durable receipt", () => {
  assert.match(extension, /durablePlanQueue: true, schedulingMode: DistributedSchedulingPolicy\.schedulingMode\(plan\.schedulingMode\)/);
  assert.match(extension, /requireIdleGpu: gpuId !== undefined, codeManifest, projectId: plan\.projectId/);
  assert.match(extension, /planJobCount: Number\(plan\.planJobCount/);
  assert.match(extension, /receipt\?\.durableAccepted !== true/);
  assert.match(extension, /receipt\.commandId \|\| ""\) !== job\.commandId/);
  assert.match(extension, /持久队列接收回执未确认，保留原 Worker、GPU 和 commandId/);
  assert.match(queue, /export function durableCommandId/);
  assert.match(queue, /export function mergeDurableWorkerSnapshots/);
});

test("cold recovery cannot infer a complete Plan from the returned task subset", () => {
  assert.match(queue, /planJobCount\?: number/);
  assert.match(queue, /remoteAcceptedJobCount = currentAcceptedIndices\.size/);
  assert.match(queue, /recoveryMissingCount = Math\.max\(0, jobCount - currentAcceptedIndices\.size - knownLocalPending\)/);
  assert.match(extension, /!plan\.recoveryMissingCount/);
});
