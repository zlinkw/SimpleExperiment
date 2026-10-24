const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
// Task ui-plan-gpu-progress-20261024 review item 3/4/5: these tests actually drive the
// notification lifecycle (begin → report → finish) through a controllable withProgress
// mock — late callbacks, fast success/failure/cancel, first-stage visibility, one
// notification per batch, and the real result-based tone — not just card hiding.
const source = fs.readFileSync(require.resolve('../../dist/extension/legacy.js'), 'utf8');
function method(first, next) {
  const start = source.indexOf('    ' + first), end = source.indexOf('    ' + next, start);
  assert.ok(start >= 0 && end > start, first);
  return source.slice(start, end);
}
function fixture() {
  const progressEntries = [], notices = [], warnings = [], logLines = [], posts = [];
  const vscode = {
    ProgressLocation: { Notification: 15 },
    window: {
      withProgress(options, callback) {
        const entry = { options, callback, reports: [], started: false };
        entry.promise = new Promise((resolve, reject) => { entry.resolve = resolve; entry.reject = reject; });
        entry.run = async () => { entry.started = true; await callback({ report: (value) => entry.reports.push(value.message) }); entry.resolve(); };
        progressEntries.push(entry);
        return entry.promise;
      },
      showInformationMessage: async (...args) => { notices.push(args); },
      showWarningMessage: async (...args) => { warnings.push(args); },
      createOutputChannel: (name) => ({ name, appendLine: (line) => logLines.push(line), show() {}, dispose() {} }),
    },
  };
  const sandbox = {
    vscode, console, setTimeout,
    stringField: (record, key) => String((record && record[key]) || ''),
    OPERATION_NOTICE_TITLES: { runPlan: '运行 Plan', runAllPlans: '批量运行 PLAN', validatePlan: '校验 Plan（实验准备）' },
    OPERATION_NOTICE_COMMANDS: new Set(['runPlan', 'reproducePlan', 'validatePlan', 'dryRunPlan', 'runAllPlans']),
    resultStatus: (result) => (result && typeof result === 'object' ? String(result.status || '') : undefined),
  };
  vm.createContext(sandbox);
  vm.runInContext(`this.methods = { ${[
    method('operationNoticeKey(message)', 'ensureOperationLogChannel('),
    method('ensureOperationLogChannel()', 'logOperationFact('),
    method('logOperationFact(text)', 'showOperationLogFromUi('),
    method('showOperationLogFromUi()', 'beginOperationProgressNotice('),
    method('beginOperationProgressNotice(command, message)', 'reportOperationNotice(key, text)'),
    method('reportOperationNotice(key, text)', 'finishOperationProgressNotice(key, tone, text)'),
    method('finishOperationProgressNotice(key, tone, text)', 'submissionNoticeTone(message, result)'),
    method('submissionNoticeTone(message, result)', 'submissionNoticeText(message, result)'),
    method('postUiCommandStatus(clientActionId', 'notifyLocalActionStarted('),
  ].join(',')} };`, sandbox);
  const host = { ...sandbox.methods, operationNoticeSessions: new Map(), context: { subscriptions: [] },
    localOperations: {}, planSubmissionOperationId: () => '', view: { webview: { postMessage: (row) => posts.push(row) } } };
  return { host, progressEntries, notices, warnings, logLines, posts };
}

test('late withProgress callback replays the first stage and converges on an already finished success (no dangling notification)', async () => {
  const f = fixture();
  f.host.beginOperationProgressNotice('runPlan', { clientActionId: 'c1', planFile: 'plans/a.yaml' });
  f.host.reportOperationNotice('c1', '已收到校验并提交运行，正在准备计划与插件接入规则…');
  f.host.finishOperationProgressNotice('c1', 'succeeded', '已提交。');
  assert.equal(f.progressEntries.length, 1, 'one notification per operation');
  const entry = f.progressEntries[0];
  assert.equal(entry.started, false, 'host may delay the callback');
  await entry.run();
  assert.deepEqual(entry.reports, ['已收到校验并提交运行，正在准备计划与插件接入规则…', '已提交。'], 'first stage visible via replay, then the terminal line');
  await entry.promise;
  assert.deepEqual(f.notices[0][1], '查看日志');
  assert.ok(f.logLines.some(line => line.includes('已提交。')));
});

test('fast failure and fast cancellation finish a not-yet-started notification with the warning tone', async () => {
  for (const [tone, expectWarning] of [['failed', true], ['cancelled', true]]) {
    const f = fixture();
    f.host.beginOperationProgressNotice('runPlan', { clientActionId: 'c2' });
    f.host.finishOperationProgressNotice('c2', tone, '出错了');
    await f.progressEntries[0].run();
    await f.progressEntries[0].promise;
    assert.equal(f.warnings.length, expectWarning ? 1 : 0, tone + ' uses the warning prompt');
    assert.equal(f.notices.length, 0, tone + ' must not claim success');
  }
});

test('in-order operation streams every stage live and resolves when finished', async () => {
  const f = fixture();
  f.host.beginOperationProgressNotice('validatePlan', { clientActionId: 'c3' });
  const entry = f.progressEntries[0];
  const running = entry.run();
  f.host.reportOperationNotice('c3', '正在校验计划');
  f.host.finishOperationProgressNotice('c3', 'succeeded', '校验通过');
  await running;
  assert.deepEqual(entry.reports, ['正在校验计划', '校验通过']);
  assert.equal(f.host.operationNoticeSessions.size, 0);
});

test('a host-side withProgress rejection leaves no unhandled rejection and later operations still work', async () => {
  const unhandled = [];
  const listener = (reason) => unhandled.push(reason);
  process.on('unhandledRejection', listener);
  try {
    const f = fixture();
    f.host.beginOperationProgressNotice('runPlan', { clientActionId: 'c4' });
    f.progressEntries[0].reject(new Error('host disposed'));
    f.host.finishOperationProgressNotice('c4', 'succeeded', '已完成');
    f.host.beginOperationProgressNotice('runPlan', { clientActionId: 'c5' });
    f.host.finishOperationProgressNotice('c5', 'succeeded', '又完成');
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.deepEqual(unhandled, []);
    assert.equal(f.progressEntries.length, 2);
  } finally { process.off('unhandledRejection', listener); }
});

test('a batch produces exactly one notification and child stages route into the parent session', async () => {
  const f = fixture();
  f.host.beginOperationProgressNotice('runAllPlans', { parentClientActionId: 'batch-1' });
  for (const plan of ['plans/a.yaml', 'plans/b.yaml']) f.host.reportOperationNotice('batch-1', `提交 ${plan}`);
  assert.equal(f.progressEntries.length, 1, 'per-plan submissions must not open their own notification');
  f.host.finishOperationProgressNotice('batch-1', 'succeeded', '批量完成');
  await f.progressEntries[0].run();
  assert.deepEqual(f.progressEntries[0].reports, ['提交 plans/a.yaml', '提交 plans/b.yaml', '批量完成']);
});

test('notice tone follows real result facts when no plan-submit row exists', async () => {
  const f = fixture();
  assert.equal(f.host.submissionNoticeTone({ clientActionId: 'v1' }, { status: 'failed', message: '校验失败' }), 'failed', 'a failed validation result stays failed');
  assert.equal(f.host.submissionNoticeTone({ clientActionId: 'v2' }, { status: 'cancelled' }), 'cancelled', 'a cancelled dry-run stays cancelled');
  assert.equal(f.host.submissionNoticeTone({ clientActionId: 'v3' }, { ok: false, error: '预演失败' }), 'failed');
  assert.equal(f.host.submissionNoticeTone({ clientActionId: 'v4' }, { status: 'completed' }), 'succeeded');
  assert.equal(f.host.submissionNoticeTone({ clientActionId: 'v5' }, undefined), 'succeeded', 'a plain return without a row is success');
  f.host.planSubmissionOperationId = () => 'plan-submit-x';
  f.host.localOperations['plan-submit-x'] = { status: 'failed', message: '提交失败' };
  assert.equal(f.host.submissionNoticeTone({ clientActionId: 'v6' }, { status: 'completed' }), 'failed', 'a failed submission row outranks the wrapper return');
});

test('full validation/dry-run feedback lands in the same operation log channel, out-of-scope commands stay out', async () => {
  const f = fixture();
  f.host.postUiCommandStatus('c9', 'failed', 'validatePlan', '校验失败：GPU 不足');
  f.host.postUiCommandStatus('c9', 'completed', 'dryRunPlan', '预演完成');
  f.host.postUiCommandStatus('c9', 'failed', 'fetchTmuxList', '范围外命令');
  assert.ok(f.logLines.some(line => line.includes('[c9] validatePlan failed：校验失败：GPU 不足')));
  assert.ok(f.logLines.some(line => line.includes('[c9] dryRunPlan completed：预演完成')));
  assert.ok(!f.logLines.some(line => line.includes('范围外命令')));
  assert.equal(f.posts.length, 3, 'webview routing itself is unchanged');
});

test('a validation status longer than 400 characters is preserved in full in the log', async () => {
  const f = fixture();
  const longText = '校验阶段明细：' + '检查任务状态；'.repeat(120);
  f.host.postUiCommandStatus('c10', 'failed', 'validatePlan', longText);
  assert.ok(longText.length > 400);
  assert.ok(f.logLines.some(line => line.includes(longText)), 'the operation log keeps the complete feedback, not a 400-char slice');
});

test('in-progress validation and dry-run feedback advances the live notification, not only the log', async () => {
  const f = fixture();
  f.host.beginOperationProgressNotice('validatePlan', { clientActionId: 'c11' });
  const entry = f.progressEntries[0];
  const running = entry.run();
  f.host.postUiCommandStatus('c11', 'running', 'validatePlan', '正在校验计划：检查 GPU 空闲');
  assert.deepEqual(entry.reports, ['running：正在校验计划：检查 GPU 空闲'], 'the notification body updates while validation is in flight');
  f.host.postUiCommandStatus('c11', 'failed', 'validatePlan', '校验失败：GPU 不足');
  assert.ok(entry.reports.includes('failed：校验失败：GPU 不足'), 'the failed status also advances the live notification');
  f.host.finishOperationProgressNotice('c11', 'failed', '校验失败：GPU 不足');
  await running;
  const g = fixture();
  g.host.beginOperationProgressNotice('dryRunPlan', { clientActionId: 'c12' });
  g.host.postUiCommandStatus('c12', 'running', 'dryRunPlan', '正在预演：解析计划');
  g.host.finishOperationProgressNotice('c12', 'succeeded', '预演完成');
  await g.progressEntries[0].run();
  assert.ok(g.progressEntries[0].reports.includes('running：正在预演：解析计划'), 'a late callback also replays the buffered dry-run stage');
});

test('more than eight buffered stages roll: the newest stages and the terminal line survive for a late callback', async () => {
  const f = fixture();
  f.host.beginOperationProgressNotice('runPlan', { clientActionId: 'c13' });
  for (let index = 1; index <= 12; index++) f.host.reportOperationNotice('c13', `阶段 ${index}`);
  f.host.finishOperationProgressNotice('c13', 'succeeded', '最终结果已提交');
  await f.progressEntries[0].run();
  const replayed = f.progressEntries[0].reports;
  assert.equal(replayed.length, 8, 'replay stays bounded');
  assert.equal(replayed[replayed.length - 1], '最终结果已提交', 'the terminal result is never dropped by the roll');
  assert.ok(replayed.includes('阶段 12') && replayed.includes('阶段 6'), 'the newest window of stages survives');
  assert.ok(!replayed.includes('阶段 1') && !replayed.includes('阶段 5'), 'older rolled stages rely on the full log channel instead');
});
