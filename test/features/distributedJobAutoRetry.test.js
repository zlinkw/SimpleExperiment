const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const filename = path.resolve(__dirname, '../../src/features/DistributedPlanQueue.ts');
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(path.dirname(filename));
loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, filename);
const api = loaded.exports;
const initialTime = Date.parse('2026-10-08T08:00:00Z');
const projectId = 'test-project';
let serial = 0;
function fixture(states = ['completed', 'failed', 'pending', 'pending', 'pending', 'pending'], id = 'current-plan') {
  const queue = api.enqueuePlan(api.emptyDistributedQueue(), { projectId, planFile: 'plans/model.yaml', revision: 'rev',
    codeFingerprint: 'code', jobs: states.map((_, index) => ({ index, case: index < 3 ? 'bus' : 'pad', seed: 42 + index % 3,
      outputDir: `work_dirs/job${index}/attempts/${id}` })) }, id, new Date(initialTime).toISOString());
  queue.plans[0].jobs.forEach((job, index) => {
    job.status = states[index];
    if (states[index] !== 'pending') Object.assign(job, { workerId: 'worker', gpuId: String(index),
      commandId: `command-${index}-${job.attempt}`, runKey: `command-${index}-${job.attempt}` });
    if (['completed', 'failed'].includes(job.status)) job.finishedAt = new Date(initialTime).toISOString();
    if (job.status === 'failed') job.error = 'CUDA unavailable';
  });
  return queue;
}
function snapshots(queue, now) {
  return [{ workerId: 'worker', generatedAt: new Date(now).toISOString(), fetchedAt: new Date(now).toISOString(),
    capabilities: { durablePlanQueue: true, schemaVersion: 1, idleGpuAdmission: true },
    tasks: queue.plans.flatMap(plan => plan.jobs.filter(job => job.commandId).map(job => ({
      projectId, workflowId: plan.id, planRevision: plan.revision, planFile: plan.planFile, codeFingerprint: plan.codeFingerprint,
      planJobCount: plan.planJobCount, fullPlanJobCount: plan.fullPlanJobCount, enqueuedAt: plan.enqueuedAt,
      experimentIndex: job.index, case: job.case, seed: job.seed, attempt: job.attempt, outputDir: job.outputDir,
      commandId: job.commandId, runKey: job.runKey || job.commandId, workerId: job.workerId, gpuId: job.gpuId,
      status: job.status, finishedAt: job.finishedAt, error: job.error, stopReason: job.stopReason,
    }))) }];
}
function apply(queue, now = initialTime, evidence = snapshots(queue, now), extra = {}) {
  return api.scheduleAutomaticJobRetries(queue, evidence, projectId, { now,
    makeAttemptId: () => `auto-retry-${++serial}`, ...extra });
}
function failed(queue) { return queue.plans[0].jobs[1]; }

test('one exact successful job enables a durable, idempotent 30 second retry', () => {
  const original = fixture();
  api.setDistributedQueueBaseSignature(original, 'disk-signature');
  const queue = apply(original);
  assert.equal(original.plans[0].automaticRetry.healthyAt, undefined, 'input must not mutate');
  assert.equal(failed(original).automaticRetry, undefined);
  assert.equal(queue.plans[0].automaticRetry.healthyReason, 'completed');
  assert.equal(failed(queue).automaticRetry.failureCount, 1);
  assert.equal(Date.parse(failed(queue).automaticRetry.retryAt), initialTime + 30000);
  assert.equal(api.distributedQueueBaseSignature(queue), 'disk-signature');
  assert.equal(apply(queue, initialTime + 1000), queue, 'repeated snapshots do not reset the deadline or increment counts');
  const restarted = JSON.parse(JSON.stringify(queue));
  assert.equal(apply(restarted, initialTime + 29999), restarted);
  const next = apply(restarted, initialTime + 30000);
  assert.equal(failed(next).status, 'pending');
  assert.equal(failed(next).attempt, 2);
  assert.equal(failed(next).workerId, undefined);
  assert.equal(failed(next).commandId, undefined);
  assert.notEqual(failed(next).outputDir, failed(queue).outputDir);
  assert.equal(failed(next).history[0].outputDir, failed(queue).outputDir);
  assert.equal(failed(next).history[0].error, 'CUDA unavailable');
  assert.equal(failed(next).automaticRetry.failureCount, 1);
  assert.equal(next.plans[0].jobs[0].status, 'completed');
});

test('strictly more than half normally running qualifies and stays qualified after a later failure', () => {
  for (const count of [0, 3, 4]) {
    const queue = fixture(['failed', 'pending', ...Array(count).fill('running'), ...Array(4 - count).fill('queued')]);
    const result = apply(queue);
    assert.equal(Boolean(result.plans[0].automaticRetry.healthyAt), count === 4);
    assert.equal(Boolean(result.plans[0].jobs[0].automaticRetry), count === 4);
    if (count === 4) {
      assert.equal(result.plans[0].automaticRetry.healthyReason, 'majority_running');
      result.plans[0].jobs.slice(2).forEach(job => { job.status = 'failed'; job.finishedAt = new Date(initialTime + 1000).toISOString(); });
      assert.equal(apply(result, initialTime + 1000).plans[0].jobs[2].automaticRetry.failureCount, 1);
    }
  }
  const queue = fixture(['failed', 'pending', 'running', 'running', 'running', 'running']);
  queue.plans[0].jobs[2].error = 'not normal';
  assert.equal(apply(queue).plans[0].automaticRetry.healthyAt, undefined);
  queue.plans[0].jobs[2].error = undefined;
  queue.plans[0].fullPlanJobCount = 8;
  assert.equal(apply(queue).plans[0].automaticRetry.healthyAt, undefined, 'use the full configured count');
});

test('an early failed job waits for a healthy sibling before scheduling', () => {
  const queue = fixture(['queued', 'failed', 'pending', 'pending', 'pending', 'pending']);
  assert.equal(apply(queue), queue);
  queue.plans[0].jobs[0].status = 'completed';
  assert.equal(failed(apply(queue)).automaticRetry.failureCount, 1);
});

test('failure delays are 30/60/120/240 seconds and the fifth total failure is final', () => {
  let queue = fixture(), now = initialTime;
  for (let count = 1; count <= 5; count++) {
    queue = apply(queue, now);
    const retry = failed(queue).automaticRetry;
    assert.equal(retry.failureCount, count);
    if (count === 5) {
      assert.equal(retry.exhausted, true);
      assert.equal(retry.retryAt, undefined);
      assert.equal(apply(queue, now + 1000000), queue);
      assert.equal(failed(queue).status, 'failed');
      assert.equal(failed(queue).attempt, 5);
      assert.equal(failed(queue).history.length, 4);
      break;
    }
    const delay = 30000 * 2 ** (count - 1);
    assert.equal(Date.parse(retry.retryAt) - now, delay);
    assert.equal(apply(queue, now + delay - 1), queue);
    now += delay;
    queue = apply(queue, now);
    assert.equal(failed(queue).status, 'pending');
    Object.assign(failed(queue), { status: 'failed', workerId: 'worker', gpuId: '1', commandId: `command-retry-${count}`,
      runKey: `command-retry-${count}`, finishedAt: new Date(now).toISOString(), error: `error-${count}` });
  }
});

test('unknown, stopped, cancelled, stale, mismatched and incomplete failure proofs never requeue', () => {
  const edits = [
    task => { task.status = 'unknown'; }, task => { task.status = 'stopped'; }, task => { task.status = 'cancelled'; },
    task => { task.stopReason = 'user_cancel'; }, task => { task.manualStopType = 'manual'; },
    task => { task.finishedAt = undefined; }, task => { task.seed = 123; }, task => { task.workflowId = 'another-run'; },
    task => { task.codeFingerprint = 'other-code'; }, task => { task.commandId = 'another-command'; },
    task => { task.outputDir = 'different-output'; }, task => { task.identityConflict = true; },
  ];
  for (const edit of edits) {
    const queue = fixture(), evidence = snapshots(queue, initialTime);
    edit(evidence[0].tasks[1]);
    assert.equal(failed(apply(queue, initialTime, evidence)).automaticRetry, undefined);
  }
  const queue = apply(fixture());
  const stale = snapshots(queue, initialTime);
  assert.equal(apply(queue, initialTime + 180001, stale), queue, 'expired terminal proof cannot launch');
  for (const edit of [p => { p.recoveryConflict = 'conflict'; }, p => { p.jobs[1].recallRequested = true; },
    p => { p.jobs[1].recoveryConflict = true; }, p => { p.jobs[1].stopReason = 'manual'; }]) {
    const blocked = fixture(); edit(blocked.plans[0]);
    assert.equal(failed(apply(blocked)).automaticRetry, undefined);
  }
});

test('exit code can prove failure, but absent or successful exit code cannot', () => {
  for (const code of [undefined, 0, 1]) {
    const queue = fixture(), evidence = snapshots(queue, initialTime);
    evidence[0].tasks[1].finishedAt = undefined;
    evidence[0].tasks[1].exitCode = code;
    assert.equal(Boolean(failed(apply(queue, initialTime, evidence)).automaticRetry), code === 1);
  }
});

test('old successes and old abandoned runs do not enable new runs; current legacy run is adopted', () => {
  const old = fixture(), recent = fixture(['queued', 'failed', 'pending', 'pending', 'pending', 'pending'], 'new-plan');
  recent.plans[0].enqueuedAt = new Date(initialTime + 1000).toISOString();
  const combined = { ...recent, plans: [...old.plans, ...recent.plans] };
  const result = apply(combined, initialTime + 1000);
  assert.equal(result.plans[0].jobs[1].automaticRetry, undefined);
  assert.equal(result.plans[1].jobs[1].automaticRetry, undefined);
  const legacy = fixture(['completed', 'failed', 'completed', 'completed', 'completed', 'completed']);
  delete legacy.plans[0].automaticRetry;
  assert.equal(apply(legacy), legacy);
  assert.equal(failed(apply(legacy, initialTime, snapshots(legacy, initialTime), { selectedPlanFile: 'plans/model.yaml' })).automaticRetry.failureCount, 1);
  legacy.plans[0].jobs[5].status = 'running';
  assert.equal(failed(apply(legacy)).automaticRetry.failureCount, 1);
  assert.equal(apply(legacy, initialTime, snapshots(legacy, initialTime), { excludedPlanFiles: ['plans/model.yaml'] }), legacy);
});

test('explicit stop disables scheduled retries durably and keeps other Plans untouched', () => {
  const queue = apply(fixture());
  queue.plans.push({ ...fixture().plans[0], id: 'unrelated', planFile: 'plans/unrelated.yaml' });
  const stopped = api.disableAutomaticJobRetries(queue, 'plans/model.yaml', new Date(initialTime).toISOString());
  assert.equal(failed(stopped).automaticRetry.retryAt, undefined);
  assert.equal(stopped.plans[0].automaticRetry.disabledAt, new Date(initialTime).toISOString());
  assert.equal(stopped.plans[1], queue.plans[1]);
  const restarted = JSON.parse(JSON.stringify(stopped));
  const result = apply(restarted, initialTime + 100000);
  assert.equal(failed(result).status, 'failed');
  assert.equal(failed(result).attempt, 1);
});

test('remote history merge keeps retry count, old failure details and new attempt; success resets the counter', () => {
  const scheduled = apply(fixture()), old = snapshots(scheduled, initialTime + 30000);
  const retried = apply(scheduled, initialTime + 30000, old);
  const reconciled = api.mergeDurableWorkerSnapshots(retried, old, projectId, initialTime + 30000);
  assert.equal(failed(reconciled).status, 'pending');
  assert.equal(failed(reconciled).automaticRetry.failureCount, 1);
  assert.equal(failed(reconciled).history.length, 1);
  assert.equal(failed(reconciled).history[0].error, 'CUDA unavailable');
  Object.assign(failed(reconciled), { status: 'running', workerId: 'worker', gpuId: '1', commandId: 'second-attempt', runKey: 'second-attempt' });
  const terminal = snapshots(reconciled, initialTime + 60000);
  terminal[0].tasks[1].status = 'completed';
  terminal[0].tasks[1].finishedAt = new Date(initialTime + 60000).toISOString();
  terminal[0].tasks.push(old[0].tasks[1]);
  const merged = api.mergeDurableWorkerSnapshots(reconciled, terminal, projectId, initialTime + 60000);
  const success = apply(merged, initialTime + 60000, terminal);
  assert.equal(failed(success).status, 'completed');
  assert.equal(failed(success).automaticRetry, undefined);
  assert.equal(failed(success).history[0].error, 'CUDA unavailable');
});

test('attempt ids cannot reuse or escape existing output paths', () => {
  const queue = apply(fixture());
  assert.throws(() => apply(queue, initialTime + 30000, snapshots(queue, initialTime + 30000), { makeAttemptId: () => 'current-plan' }), /already in use/);
  failed(queue).outputDir = '../unsafe/attempts/current-plan';
  assert.throws(() => apply(queue, initialTime + 30000), /directory is invalid/);
});
