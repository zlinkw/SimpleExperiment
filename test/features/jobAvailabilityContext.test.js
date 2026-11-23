const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
require('../_helpers/registerTsRequire');
const Q = require('../../src/features/DistributedPlanQueue.ts');
const { changeJobAvailabilityFromUi } = require('../../src/features/JobAvailability.ts');

function fixture(mode) {
  const root = 'D:/fixture-project-a', context = { root };
  const plan = { id: 'fixture-plan', projectId: Q.canonicalProjectId(root), planFile: 'plans/a.yaml',
    revision: 'r', codeFingerprint: 'c', executionMode: 'train', enqueuedAt: '2026-01-01T00:00:00Z', planJobCount: 1,
    jobs: [{ index: 0, case: 'case', seed: 1, attempt: 1, status: 'pending', outputDir: 'work/a' }] };
  const queue = { schemaVersion: 1, plans: [plan] };
  const marked = Q.markJobUnavailable(queue, plan.id, 0, Q.jobAvailabilityIdentity(plan, plan.jobs[0]),
    '不适用', '2026-01-01T00:00:00Z');
  let disk = Q.serializeDistributedQueue(marked), active = true, writes = 0, posts = 0, ticks = 0, reads = 0;
  const initialDisk = disk, bCache = { sentinel: 'B' }, bDiagnostics = { status: 'B' };
  const source = fs.readFileSync(path.resolve(__dirname, '../../src/extension/legacy.ts'), 'utf8');
  const tree = ts.createSourceFile('host.ts', source, ts.ScriptTarget.Latest, true);
  let member;
  function visit(node) { if (ts.isMethodDeclaration(node) && node.name.getText(tree) === 'saveDistributedQueue') member = node; ts.forEachChild(node, visit); }
  visit(tree); assert.ok(member);
  const Host = vm.runInNewContext(ts.transpileModule('class Host {' + member.getText(tree) + '}; Host',
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    DistributedPlanQueue: Q, path, fs: { readFile: async () => {
      reads++;
      if (mode === 'read-error') { switchProject(); throw Error('fixture read failed'); }
      if (mode === 'reread-conflict' && reads === 2) { switchProject(); return disk + ' '; }
      return disk;
    }, mkdir: async () => {} },
    compactSensitiveText: String, errorMessage: error => error.message,
    atomicWriteText: async (_file, text, options) => {
      if (mode === 'before') switchProject();
      await options.beforeRename();
      disk = text; writes++;
      if (mode === 'after') switchProject();
    },
  });
  const host = new Host();
  function switchProject() {
    active = false; host.client = {}; host.distributedQueueRoot = 'D:/fixture-project-b';
    host.distributedQueueCache = bCache; host.distributedQueueDiskSignature = 'B';
    host.distributedQueueStorageDiagnostics = bDiagnostics;
  }
  Object.assign(host, {
    client: {}, context: { globalStorageUri: { fsPath: 'D:/fixture-storage' } },
    captureProjectContext: () => context, projectContextIsCurrent: value => active && value === context,
    loadDistributedQueue: async () => Q.restoreFormalJobQueue(JSON.parse(disk)),
    withQueueWriteResource: async (_root, work) => work(), distributedQueueWritePromise: Promise.resolve(),
    distributedQueueGeneration: 0, distributedPlanStopEpoch: 0, distributedQueueRoot: root,
    distributedQueueCache: marked, distributedQueueDiskSignature: '', distributedQueueStorageDiagnostics: { status: 'ready' },
    detachStaleDistributedTick() {}, postState() { posts++; }, tickDistributedQueue: async () => { ticks++; }, recordActionError() {},
  });
  const message = { command: 'restoreJobAvailability', planId: plan.id, planFile: plan.planFile,
    jobIndex: 0, attempt: 1, commandId: '' };
  return { host, message, root, bCache, bDiagnostics, initialDisk,
    get disk() { return disk; }, get writes() { return writes; }, get posts() { return posts; }, get ticks() { return ticks; } };
}

test('availability save fences publication and preserves a later project cache', async () => {
  const before = fixture('before');
  await assert.rejects(changeJobAvailabilityFromUi(before.host, before.message, async () => '', async () => true), /项目已切换/);
  assert.equal(before.writes, 0); assert.equal(before.disk, before.initialDisk);
  assert.equal(before.host.distributedQueueCache, before.bCache); assert.equal(before.host.distributedQueueStorageDiagnostics, before.bDiagnostics);
  assert.equal(before.posts, 0); assert.equal(before.ticks, 0);

  for (const mode of ['read-error', 'reread-conflict']) {
    const failure = fixture(mode);
    await assert.rejects(changeJobAvailabilityFromUi(failure.host, failure.message, async () => '', async () => true));
    assert.equal(failure.writes, 0); assert.equal(failure.disk, failure.initialDisk);
    assert.equal(failure.host.distributedQueueCache, failure.bCache);
    assert.equal(failure.host.distributedQueueStorageDiagnostics, failure.bDiagnostics);
    assert.equal(failure.posts, 0); assert.equal(failure.ticks, 0);
  }

  const after = fixture('after');
  const result = await changeJobAvailabilityFromUi(after.host, after.message, async () => '', async () => true);
  assert.equal(result.status, 'partial'); assert.match(result.message, /原项目.*已保存/);
  assert.equal(after.writes, 1); assert.equal(JSON.parse(after.disk).plans[0].jobs[0].status, 'pending');
  assert.equal(after.host.distributedQueueRoot, 'D:/fixture-project-b');
  assert.equal(after.host.distributedQueueCache, after.bCache); assert.equal(after.host.distributedQueueDiskSignature, 'B');
  assert.equal(after.host.distributedQueueStorageDiagnostics, after.bDiagnostics); assert.equal(after.posts, 0); assert.equal(after.ticks, 0);

  const normal = fixture('normal');
  const completed = await changeJobAvailabilityFromUi(normal.host, normal.message, async () => '', async () => true);
  assert.equal(completed.status, 'completed'); assert.equal(normal.writes, 1);
  assert.equal(normal.host.distributedQueueRoot, normal.root); assert.equal(normal.posts, 1); assert.equal(normal.ticks, 1);
});
