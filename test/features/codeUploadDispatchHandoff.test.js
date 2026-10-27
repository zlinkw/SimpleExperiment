// 代码写入／派发交接 gate：所有权、per-Worker 独立状态、阶段诊断与发送口围栏。
// 全部使用可控替身与事件顺序断言，不做计时断言、不设性能阈值。
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
require('../_helpers/registerTsRequire');
const source = fs.readFileSync('src/extension/legacy.ts', 'utf8');
const tree = ts.createSourceFile('host.ts', source, ts.ScriptTarget.Latest, true);
const cls = tree.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'RealtimeTunnelPanelProvider');
const Gate = require('../../src/features/DispatchHandoffGate.ts');
const Q = require('../../src/features/DistributedPlanQueue.ts');
const ExecutionMode = require('../../src/features/PlanExecutionMode.ts');
const ROOT = '/handoff-fixture';

// 交接 gate 的字段与成员在夹具里复用真实实现；真实扩展类内这些成员恒定存在。
const GATE_MEMBERS = ['dispatchHandoffGate', 'codeUploadTargetLeases', 'gateStateLocal', 'targetLeaseTableLocal', 'distributedTickIds',
  'codeUploadHandoffSeq', 'distributedTickSeq',
  'codeSyncTargetResults', 'dispatchHandoffTimeoutEvidence', 'distributedQueueStorageDiagnostics',
  'beginCodeUploadHandoffLocal', 'endCodeUploadHandoffLocal', 'awaitDispatchHandoffSafeLocal', 'markCodeUploadWorkerReadyLocal',
  'markCodeUploadWorkerFailedLocal', 'dispatchHandoffAllowsWorkerLocal', 'dispatchHandoffYieldsRoundLocal', 'registerDispatchHandoffsLocal',
  'advanceDispatchHandoffLocal', 'markDispatchHandoffTransmissionLocal', 'endDispatchHandoffLocal', 'endTickHandoffsLocal',
  'beginDistributedTickRecordLocal', 'beginDistributedTickLocal', 'setDistributedTickPhaseLocal', 'endDistributedTickRecordLocal',
  'recordDispatchHandoffTimeoutLocal', 'dispatchHandoffDiagnosticsLocal', 'distributedTickDiagnosticsLocal',
  'assertDispatchHandoffSendAllowedLocal', 'ensureDispatchHandoffForSendLocal', 'acquireCodeUploadTargetLeaseLocal',
  'releaseCodeUploadTargetLeaseLocal', 'markCodeSyncTargetResultLocal', 'boundedPromise'];
function gateHost(globals = {}, extraMembers = []) {
  const wanted = [...GATE_MEMBERS, ...extraMembers];
  const picked = wanted.filter(name => cls.members.some(node => node.name?.getText(tree) === name));
  assert.equal(picked.length, wanted.length, 'every handoff member must exist in the real class');
  const code = 'class Host {' + cls.members.filter(node => picked.includes(node.name?.getText(tree))).map(node => node.getText(tree)).join('\n') + '}; Host;';
  const Ctor = vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText,
    { DispatchHandoffGate: Gate, workspaceRoot: () => ROOT, errorMessage: error => error?.message || String(error), setInterval, clearInterval, ...globals });
  return new Ctor();
}
const target = (id, remotePath, host = 'worker.example') => ({ id, role: 'worker', label: id, host, port: 22, remotePath });

test('a code write intent is registered synchronously and releases one Worker at a time', async () => {
  const h = gateHost();
  const intent = h.beginCodeUploadHandoffLocal(ROOT, 'run', ['w1', 'w2']);
  assert.equal(h.dispatchHandoffAllowsWorkerLocal(ROOT, 'w1'), false, 'registered target must not accept a new dispatch');
  assert.equal(h.dispatchHandoffAllowsWorkerLocal(ROOT, 'other'), true, 'an unrelated Worker is never falsely locked');
  assert.equal(h.dispatchHandoffYieldsRoundLocal(ROOT, ['w1', 'w2']), true);
  h.markCodeUploadWorkerReadyLocal(intent, ROOT, 'w1');
  assert.equal(h.dispatchHandoffAllowsWorkerLocal(ROOT, 'w1'), true, 'a Worker confirmed written in this round dispatches again');
  assert.equal(h.dispatchHandoffAllowsWorkerLocal(ROOT, 'w2'), false, 'a Worker still uploading must not be released');
  assert.equal(h.dispatchHandoffYieldsRoundLocal(ROOT, ['w1', 'w2']), false, 'one released Worker is enough to keep the round alive');
  const snapshot = h.dispatchHandoffDiagnosticsLocal();
  assert.deepEqual(snapshot.workerUploads.map(row => [row.workerId, row.state]).sort(), [['w1', 'uploaded'], ['w2', 'uploading']]);
  h.endCodeUploadHandoffLocal(intent.uploadId);
  assert.equal(h.dispatchHandoffAllowsWorkerLocal(ROOT, 'w2'), true);
});

test('handoff ownership survives the wait budget and only real evidence releases it', async () => {
  const h = gateHost();
  const intent = h.beginCodeUploadHandoffLocal(ROOT, 'run', ['w1']);
  h.registerDispatchHandoffsLocal({ tickId: 'tick-1', generation: 3, root: ROOT, projectId: 'p',
    dispatches: [{ workerId: 'w1', planId: 'plan', planFile: 'p.yaml', jobIndex: 0, commandId: 'cmd-1', attempt: 0 }] });
  const blocked = await h.awaitDispatchHandoffSafeLocal(intent, 20);
  assert.equal(blocked.safe, false, 'an open handoff is never reported safe');
  assert.equal(blocked.timedOut, true);
  assert.equal(blocked.blocking.length, 1);
  assert.equal(blocked.blocking[0].commandId, 'cmd-1');
  assert.equal(h.dispatchHandoffDiagnosticsLocal().activeHandoffCount, 1, 'the wait timeout must not release ownership');
  // 已开始发送的所有权只能由真实提交或明确未发送证据解除。
  h.advanceDispatchHandoffLocal(ROOT, 'cmd-1', 'code-proof-prepare');
  h.markDispatchHandoffTransmissionLocal(ROOT, 'cmd-1');
  assert.equal(h.dispatchHandoffDiagnosticsLocal().activeHandoffs[0].sent, true);
  h.endDispatchHandoffLocal(ROOT, 'cmd-1', 'committed');
  const released = await h.awaitDispatchHandoffSafeLocal(intent, 20);
  assert.equal(released.safe, true, 'a committed receipt handoff opens the gate');
  assert.equal(h.dispatchHandoffDiagnosticsLocal().recentHandoffs[0].outcome, 'committed');
  // 旧轮迟到续体受原身份/代际围栏：已结束的旧 command 不会被迟到的发送标记重新拉起，
  // 也不会改写新一轮的登记。
  h.beginDistributedTickLocal('tick-new', ROOT, 4);
  h.registerDispatchHandoffsLocal({ tickId: 'tick-new', generation: 4, root: ROOT, projectId: 'p',
    dispatches: [{ workerId: 'w1', planId: 'plan', jobIndex: 0, commandId: 'cmd-new' }] });
  h.markDispatchHandoffTransmissionLocal(ROOT, 'cmd-1');
  const after = h.dispatchHandoffDiagnosticsLocal();
  assert.deepEqual(after.activeHandoffs.map(row => [row.commandId, row.tickId, row.generation]), [['cmd-new', 'tick-new', 4]]);
  assert.equal(after.activeHandoffs[0].sent, false, 'a late old-round marker cannot claim the new round already sent');
  h.endTickHandoffsLocal('tick-new', 'round-ended');
  h.endCodeUploadHandoffLocal(intent.uploadId);
});

test('unsent admission evidence and stale rounds are recorded truthfully, never as committed', async () => {
  const h = gateHost();
  h.registerDispatchHandoffsLocal({ tickId: 'tick-9', generation: 7, root: ROOT, projectId: 'p',
    dispatches: [{ workerId: 'w1', planId: 'plan', jobIndex: 0, commandId: 'cmd-unsent' }, { workerId: 'w2', planId: 'plan', jobIndex: 1, commandId: 'cmd-stale' }] });
  assert.equal(h.endDispatchHandoffLocal(ROOT, 'cmd-unsent', 'unsent-released'), true);
  assert.equal(h.endTickHandoffsLocal('tick-9', 'stale-generation'), 1);
  const recent = h.dispatchHandoffDiagnosticsLocal().recentHandoffs.map(row => [row.commandId, row.outcome, row.sent]);
  assert.deepEqual(recent, [['cmd-stale', 'stale-generation', false], ['cmd-unsent', 'unsent-released', false]]);
  assert.ok(!recent.some(row => row[1] === 'committed'), 'neither a stale round nor an unsent rollback may be recorded as committed');
});

test('an unknown-failed Worker keeps its ownership through later successes and later rounds', async () => {
  const h = gateHost();
  const first = h.beginCodeUploadHandoffLocal(ROOT, 'workers', ['w1', 'w2']);
  h.markCodeUploadWorkerReadyLocal(first, ROOT, 'w2');
  h.markCodeUploadWorkerFailedLocal(first, ROOT, 'w1', 'connection reset');
  h.endCodeUploadHandoffLocal(first.uploadId);
  const kept = h.dispatchHandoffDiagnosticsLocal().workerUploads;
  assert.deepEqual(kept.filter(row => row.workerId === 'w1').map(row => row.state), ['unknown-failed'],
    'another Worker success or the round end must not wash an unknown write into ready');
  const second = h.beginCodeUploadHandoffLocal(ROOT, 'workers', ['w1']);
  assert.equal(h.dispatchHandoffAllowsWorkerLocal(ROOT, 'w1'), false);
  h.markCodeUploadWorkerReadyLocal(second, ROOT, 'w1');
  assert.equal(h.dispatchHandoffDiagnosticsLocal().workerUploads.find(row => row.workerId === 'w1').state, 'uploaded');
  h.endCodeUploadHandoffLocal(second.uploadId);
});

test('the same real write target is exclusive even across different Worker ids, different targets stay free', async () => {
  const h = gateHost({ });
  h.sftpManager = () => ({ resolveTargetEndpoint: (id) => (id === 'a' || id === 'b' ? { host: 'Box.Example', port: 22 } : { host: 'other', port: 22 }) });
  const first = await h.acquireCodeUploadTargetLeaseLocal(target('a', '/work/proj/'), 'sync-1');
  let secondDone = false;
  const second = h.acquireCodeUploadTargetLeaseLocal(target('b', '/work/proj'), 'sync-2').then(token => { secondDone = true; return token; });
  await new Promise(setImmediate);
  assert.equal(secondDone, false, 'Worker ids pointing at the same canonical server and root must not overlap');
  const other = await h.acquireCodeUploadTargetLeaseLocal(target('c', '/work/proj'), 'sync-3');
  assert.equal(first.key, 'box.example:22:/work/proj');
  assert.notEqual(other.key, first.key);
  h.releaseCodeUploadTargetLeaseLocal(first.token);
  const released = await second;
  assert.equal(released.key, first.key);
  h.releaseCodeUploadTargetLeaseLocal(released.token);
  h.releaseCodeUploadTargetLeaseLocal(other.token);
});

test('transfer, verification and proof are recorded separately and never escalated across stages', async () => {
  const h = gateHost();
  const fresh = h.markCodeSyncTargetResultLocal(target('w3', '/work/proj'), 'sync-0', { proof: 'done' });
  assert.equal(fresh.proof, 'pending', 'proof cannot be marked ready before the transfer stage is confirmed');
  assert.equal(fresh.ready, false);
  const row = h.markCodeSyncTargetResultLocal(target('w1', '/work/proj'), 'sync-1', { transfer: 'done' });
  assert.equal(row.ready, false);
  const verified = h.markCodeSyncTargetResultLocal(target('w1', '/work/proj'), 'sync-1', { transfer: 'done', verified: 'done', proof: 'done' });
  assert.equal(verified.ready, true, 'ready only after transport, verification and proof are all done');
  const failed = h.markCodeSyncTargetResultLocal(target('w2', '/work/proj'), 'sync-1', { transfer: 'unknown-failed', error: 'unknown write result' });
  assert.equal(failed.transfer, 'unknown-failed');
  assert.equal(h.markCodeSyncTargetResultLocal(target('w2', '/work/proj'), 'sync-1', { verified: 'done' }).transfer, 'unknown-failed',
    'a later stage must not overwrite an unknown write');
});

test('wait timeout evidence lands on the persistable channel and late old rounds cannot impersonate the new one', async () => {
  const recorded = [];
  const h = gateHost({ });
  h.recordActionError = row => recorded.push(row);
  h.postState = () => {};
  h.distributedQueueStorageDiagnostics = { status: 'stale', reason: 'queue-commit-failed', message: 'disk busy' };
  h.beginDistributedTickLocal('tick-old', ROOT, 1);
  h.setDistributedTickPhaseLocal('tick-old', 'dispatch-admission', { workerId: 'w1', commandId: 'cmd-1', sent: true });
  const intent = h.beginCodeUploadHandoffLocal(ROOT, 'run', ['w1']);
  h.registerDispatchHandoffsLocal({ tickId: 'tick-old', generation: 1, root: ROOT, projectId: 'p',
    dispatches: [{ workerId: 'w1', planId: 'plan', planFile: 'p.yaml', jobIndex: 2, commandId: 'cmd-1' }] });
  h.markDispatchHandoffTransmissionLocal(ROOT, 'cmd-1');
  const wait = await h.awaitDispatchHandoffSafeLocal(intent, 10);
  const message = h.recordDispatchHandoffTimeoutLocal('codeSyncTargets', intent, wait);
  assert.match(message, /^原派发尚未确认结束，代码同步未写入；请刷新任务状态后重试。/);
  assert.match(message, /dispatch-admission/);
  assert.match(message, /已发送/);
  assert.match(message, /queue-commit-failed/);
  assert.equal(recorded.length, 1);
  assert.equal(recorded[0].command, 'codeUploadDispatchHandoff');
  assert.equal(h.dispatchHandoffTimeoutEvidence.blocking[0].commandId, 'cmd-1');
  // 新一轮开始：旧轮迟到写入只影响旧记录，不覆写当前阶段与结局。
  h.endDistributedTickRecordLocal('tick-old', 'completed');
  h.beginDistributedTickLocal('tick-new', ROOT, 2);
  h.setDistributedTickPhaseLocal('tick-new', 'probe-tunnel');
  h.setDistributedTickPhaseLocal('tick-old', 'late-old-write');
  const current = h.distributedTickDiagnosticsLocal().ticks.find(row => row.tickId === 'tick-new');
  assert.equal(current.phase, 'probe-tunnel');
  assert.equal(h.distributedTickDiagnosticsLocal().ticks.length, 1, '有界近期项：旧轮只保留成一条结局，不会被迟到续体改写');
  const oldRound = h.distributedTickDiagnosticsLocal().recent.find(row => row.tickId === 'tick-old');
  assert.equal(oldRound.outcome, 'completed');
  assert.equal(oldRound.phase, 'dispatch-admission');
  h.endCodeUploadHandoffLocal(intent.uploadId);
});

test('the final send boundary re-checks the gate and refuses a send without posting', async () => {
  const posted = [];
  const h = gateHost({ workspaceRoot: () => ROOT, DistributedPlanQueue: Q, PlanExecutionMode: ExecutionMode,
    PlanCodeScopeHost: { supportsPlanCodeScope: () => true, verifyWorkerPlanSource: async () => ({ executionSource: 'proof' }) },
    DistributedSchedulingPolicy: require('../../src/features/DistributedSchedulingPolicy.ts'), errorMessage: error => error.message,
    AgentTmuxPolicy_1: { normalizeRemoteTmuxSessionPrefix: value => value }, vscode: { workspace: { getConfiguration: () => ({ get: () => 'mine' }) } },
    GpuQuotaScheduling: require('../../dist/features/GpuQuotaScheduling') },
    ['sendDistributedJob', 'releaseUnsentDistributedJob']);
  const projectId = Q.canonicalProjectId(ROOT);
  const plan = { id: 'p', projectId, revision: 'r', planFile: 'p.yaml', resultPathPolicy: 'declared', executionMode: 'train_test', codeFingerprint: 'code', jobs: [] };
  const job = { index: 0, attempt: 0, outputDir: 'work/a', lifecycleProtocol: 2, status: 'dispatching', workerId: 'w', gpuId: '0', commandId: 'cmd-1' };
  plan.jobs = [job];
  Object.assign(h, { client: { postWorkerAction: async () => { posted.push(1); return { lifecycleProtocol: 2, status: 'unknown' }; } },
    taskLifecycleProtocol: 2, distributedQueueGeneration: 0, distributedPlanStopEpoch: 0, unifiedDomainState: () => ({ active: false, blocked: '' }),
    lastWorkerProbes: { w: { capabilities: { endpoints: { declaredJobPaths: true, formalJobIdentityEnv: 1, gpuQuotaScheduling: 1, taskShellEnvironment: 1, projectManagedValidation: 1 } } } },
    submissionWorkerProbes: async () => h.lastWorkerProbes, workerActionTargets: () => [{ id: 'w' }], enabledWorkerConfigs: () => [],
    schedulerSettings: () => ({}), lastWorkerTaskSnapshots: new Map([[`${ROOT}\u0000w`, { capabilities: { taskLifecycle: 2 } }]]),
    lastCodeSyncState: {}, postState() {}, recordActionError() {}, loadDistributedQueue: async () => ({ plans: [] }) });
  const intent = h.beginCodeUploadHandoffLocal(ROOT, 'run', ['w']);
  let failure;
  try { await h.sendDistributedJob(plan, job, 'w', '0', 'cmd-1'); } catch (error) { failure = error; }
  assert.equal(posted.length, 0, 'a pending code write must not be raced by a send');
  assert.equal(failure?.dispatchNotSent, true, 'the refusal is provable not-sent evidence, so the durable intent can be rolled back');
  assert.match(failure.message, /代码写入尚未交接完成/);
  assert.equal(h.dispatchHandoffDiagnosticsLocal().activeHandoffCount, 0, 'a refused channel send releases the ownership it took');
  h.markCodeUploadWorkerReadyLocal(intent, ROOT, 'w');
  const receipt = await h.sendDistributedJob(plan, job, 'w', '0', 'cmd-1');
  assert.equal(posted.length, 1);
  assert.equal(receipt.lifecycleProtocol, 2);
  assert.equal(h.dispatchHandoffDiagnosticsLocal().activeHandoffCount, 0);
  h.endCodeUploadHandoffLocal(intent.uploadId);
});

test('the dispatch round re-reads the intent before allocating and registers ownership before the durable admission', () => {
  const tick = source.slice(source.indexOf('async tickDistributedQueueCore('), source.indexOf('async function dispatchReadyManualJobs'));
  assert.ok(tick.length > 1000);
  const yields = tick.indexOf('dispatchHandoffYieldsRoundLocal');
  const realloc = tick.indexOf('const dispatchableWorkers = workers.filter');
  const allocate = tick.indexOf('allocateAvailable(queue, dispatchableWorkers');
  const register = tick.indexOf('registerDispatchHandoffsLocal?.({ tickId, generation, root, projectId, dispatches })');
  const admission = tick.indexOf('{ queueGeneration: generation, dispatchAdmission: true }');
  assert.ok(yields > 0 && yields < allocate, 'the round must yield while every candidate is still blocked');
  assert.ok(realloc > 0 && realloc < allocate, 'the intent must be re-read before any new intent is allocated');
  assert.ok(register > 0 && register < admission, 'ownership starts before the admission intent is persisted');
  const legacyAllocate = tick.indexOf('allocateAvailable(queue, dispatchableLegacyWorkers)');
  const legacyRegister = tick.indexOf('dispatches: allocation.dispatches }');
  const legacyAdmission = tick.indexOf('legacyAdmissionReceipt = await this.saveDistributedQueue');
  assert.ok(legacyAllocate > 0 && legacyRegister > 0 && legacyRegister < legacyAdmission, 'the legacy channel is covered the same way');
  assert.ok(tick.indexOf('dispatchableLegacyWorkers') < legacyAllocate);
  // 回执提交完成才解除所有权；整轮结束与换代都按真实结局回收。
  assert.ok(tick.indexOf('endDispatchHandoffLocal?.(root, dispatch.commandId') > tick.indexOf('try { await receiptCommits; }'));
  const wrapper = source.slice(source.indexOf('async tickDistributedQueue() {'), source.indexOf('async tickDistributedQueueCore('));
  assert.ok(wrapper.includes('endTickHandoffsLocal?.(tickId'), 'the tick lifecycle reclaims uncommitted handoffs with the real outcome');
  assert.ok(wrapper.includes('endDistributedTickRecordLocal?.(tickId'), 'the tick ledger records its end/failure/invalidation');
  const detachStart = source.indexOf('\n    detachStaleDistributedTick(task) {');
  const detach = source.slice(detachStart, source.indexOf('requestDistributedQueueRefresh()', detachStart));
  assert.ok(detach.length > 200 && detach.includes('endTickHandoffsLocal?.(detachedTickId'), 'a fenced-out round cannot keep holding the code write gate');
});

test('the send fence sits directly on the transport boundary for both transports', () => {
  const send = source.slice(source.indexOf('async sendDistributedJob('), source.indexOf('async releaseUnsentDistributedJob('));
  const fences = [...send.matchAll(/assertDispatchHandoffSendAllowedLocal\?\.\(root, workerId\);/g)].map(row => row.index);
  const transmissions = [...send.matchAll(/transmissionStarted = true;/g)].map(row => row.index);
  const marks = [...send.matchAll(/markDispatchHandoffTransmissionLocal\?\.\(root, commandId\);/g)].map(row => row.index);
  assert.equal(fences.length, 2, 'both the legacy lease transport and the protocol-2 direct post re-check the gate');
  assert.equal(transmissions.length, 2);
  assert.equal(marks.length, 2);
  for (let index = 0; index < 2; index += 1) {
    assert.ok(fences[index] < transmissions[index], 'the re-check must happen before the transport boundary');
    assert.ok(marks[index] > transmissions[index], 'the transmission marker follows the real boundary');
  }
  assert.match(send, /finally \{\s*if \(channelHandoffRoot\)/, 'a channel-owned handoff is reclaimed by the sender itself');
});

test('the code upload waits on the handoff gate instead of the whole dispatch round', () => {
  const sync = source.slice(source.indexOf('async syncCodeTargets(targets, scope, options = {})'), source.indexOf('async safeWorkerCodeSyncTargets('));
  assert.ok(!/this\.distributedQueueTickPromise/.test(sync), 'the whole-tick promise is not a safety proof');
  assert.ok(!/distributedQueueWritePromise/.test(sync));
  const registered = sync.indexOf('this.beginCodeUploadHandoffLocal?.');
  assert.ok(registered > 0 && registered < sync.indexOf('await this.boundedPromise'), 'the intent is registered before the first await');
  assert.ok(registered < sync.indexOf('ensureSftpManagerCommand'), 'probe/tunnel waits cannot delay the intent');
  assert.equal((sync.match(/markCodeUploadWorkerReadyLocal\?\./g) || []).length, 3, 'every ready callback marks its own Worker');
  assert.match(sync, /awaitDispatchHandoffSafeLocal\?\.\(codeUploadHandoff, 10_000\)/, 'the wait budget stays 10_000 with handoff semantics');
  const released = sync.indexOf('this.endCodeUploadHandoffLocal?.(codeUploadHandoff?.uploadId)');
  assert.ok(released > sync.indexOf('} finally {'), 'the intent is released in the finally block');
  assert.match(sync, /this\.codeSyncInFlight--;\s*\}/);
});
