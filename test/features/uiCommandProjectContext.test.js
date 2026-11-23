const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
function fixture() {
  const source = fs.readFileSync(path.join(__dirname, '../../src/extension/legacy.ts'), 'utf8');
  const ast = ts.createSourceFile('legacy.ts', source, ts.ScriptTarget.Latest, true);
  const cls = ast.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === 'RealtimeTunnelPanelProvider');
  const names = ['withUiCommandStatus', 'runActionCommand', 'runAllPlansFromUi', 'beginOperationProgressNotice', 'finishOperationProgressNotice'];
  const methods = cls.members.filter(n => names.includes(n.name?.getText(ast))); assert.equal(methods.length, names.length);
  let generation = 1, prompt = async () => undefined, schedule = fn => fn(), batchWork = async () => undefined;
  const calls = { statuses: [], facts: [], errors: [], submissions: [], notices: [], finished: 0, posts: 0, logsOpened: 0, panelsOpened: 0, reports: [] };
  class Cancelled extends Error {}
  class Pending extends Error {}
  const sandbox = { UiCommandCancelled: Cancelled, PLAN_SUBMISSION_COMMANDS: new Set(['runPlan']), RESULT_PARSE_COMMANDS: new Set(), OPERATION_NOTICE_COMMANDS: new Set(['runPlan']),
    OPERATION_NOTICE_TITLES: { runPlan: '运行计划' }, require: () => ({ assertBusinessAllowed() {} }),
    stringField: (message, key) => message[key] || '', workspaceRoot: () => '/project', normalizePlanSelectionKey: value => value,
    operationResultPlanFile: () => 'plan.yaml', runAllPlans: (...args) => batchWork(...args), setTimeout: fn => { schedule(fn); return 1; }, localCommandReleasesAfterTrigger: () => false,
    resultSyncCommandOutcome: value => value?.resultSync ? value : undefined,
    isUiCommandRemotePending: error => error instanceof Pending, isUiCommandCancelled: error => error instanceof Cancelled,
    errorMessage: error => error.message, actionErrorSuggestion: () => '', hostOperationLeaseActionLabel: value => value,
    compactSensitiveText: value => value, OperationOutcome_1: { operationOutcomeFor: (_error, status) => status },
    vscode: { ProgressLocation: { Notification: 1 }, window: { withProgress: (_options, callback) => callback({ report: value => calls.reports.push(value) }),
      showInformationMessage: (...args) => { calls.notices.push(args); return prompt(...args); },
      showWarningMessage: (...args) => { calls.notices.push(args); return prompt(...args); },
      showErrorMessage: (...args) => { calls.notices.push(args); return prompt(...args); } } } };
  const host = vm.runInNewContext(ts.transpileModule('class Subject {' + methods.map(n => n.getText(ast)).join('\n') + '}; new Subject()', {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, sandbox);
  Object.assign(host, { localOperations: {}, captureProjectContext: () => ({ generation }), projectContextIsCurrent: context => context.generation === generation,
    operationNoticeSessions: new Map(), operationNoticeKey: message => message.clientActionId,
    actionBody: () => ({}), planRetryInFlight: new Set(), beginPlanSubmissionProgress() {}, reportPlanStage() {},
    submissionNoticeTone: () => 'succeeded', submissionNoticeText: () => 'finished',
    beginSimpleSftpCapabilityLaunch() {}, postUiCommandStatus: (_id, status) => calls.statuses.push(status),
    finishPlanSubmissionProgress: () => calls.submissions.push('submission'), recordActionError: value => calls.errors.push(value),
    postState: () => calls.posts++, logOperationFact: value => calls.facts.push(value), showOperationLogFromUi: () => calls.logsOpened++,
    openPanelAt: () => calls.panelsOpened++, planSubmissionOperationId: () => 'original' });
  return { host, calls, Cancelled, Pending, switchProject: () => generation++, prompt: fn => { prompt = fn; }, schedule: fn => { schedule = fn; }, batchWork: fn => { batchWork = fn; } };
}

test('late outcomes keep original facts without publishing current project status', async () => {
  for (const kind of ['completed', 'failed', 'cancelled', 'submitted']) {
    const f = fixture(), gate = deferred(), entered = deferred();
    const pending = f.host.withUiCommandStatus('old', 'splitProjectResultTable', {}, async () => {
      entered.resolve(); await gate.promise;
      if (kind === 'failed') throw new Error('original failure');
      if (kind === 'cancelled') throw new f.Cancelled('original cancellation');
      if (kind === 'submitted') throw new f.Pending('original pending');
    });
    await entered.promise; f.switchProject(); gate.resolve(); await pending;
    assert.deepEqual(f.calls.statuses, ['running']); assert.equal(f.calls.notices.length, 0);
    assert.equal(f.calls.errors.length, 0); assert.equal(f.calls.posts, 0);
    assert.match(f.calls.facts.at(-1), new RegExp('old.*' + kind));
  }
});

test('old artifact progress is closed and logged silently on its original key', async () => {
  const f = fixture(), gate = deferred(), entered = deferred();
  const pending = f.host.withUiCommandStatus('old', 'syncPendingPlanArtifacts', { clientActionId: 'old' }, async () => {
    entered.resolve(); await gate.promise; throw new Error('old failure');
  });
  await entered.promise; f.switchProject(); gate.resolve(); await pending;
  assert.equal(f.host.operationNoticeSessions.size, 0);
  assert.equal(f.calls.notices.length, 0); assert.equal(f.calls.errors.length, 0); assert.equal(f.calls.posts, 0);
  assert.ok(f.calls.facts.some(line => line.includes('old failure')));
});

test('current failures and user cancellation remain visible; delayed log action keeps original context', async () => {
  const f = fixture(), answer = deferred(); f.prompt(() => answer.promise);
  await f.host.withUiCommandStatus('now', 'splitProjectResultTable', {}, async () => { throw new Error('visible failure'); });
  assert.deepEqual(f.calls.statuses, ['running', 'failed']); assert.equal(f.calls.errors.length, 1); assert.equal(f.calls.notices.length, 1);
  f.switchProject(); answer.resolve('查看日志'); await Promise.resolve(); await Promise.resolve(); assert.equal(f.calls.logsOpened, 0);
  const g = fixture(); await g.host.withUiCommandStatus('now', 'splitProjectResultTable', {}, async () => { throw new g.Cancelled('user cancelled'); });
  assert.deepEqual(g.calls.statuses, ['running', 'cancelled']); assert.equal(g.calls.notices.length, 1);
});

test('accepted artifact notice closes normally and its delayed action cannot target a new project', async () => {
  const f = fixture(), answer = deferred(); f.prompt(() => answer.promise);
  await f.host.withUiCommandStatus('now', 'syncPendingPlanArtifacts', { clientActionId: 'now' }, async () => { throw new f.Pending('accepted'); });
  assert.deepEqual(f.calls.statuses, ['running', 'submitted']);
  assert.equal(f.host.operationNoticeSessions.size, 0); assert.equal(f.calls.notices.length, 1);
  f.switchProject(); answer.resolve('打开面板'); await Promise.resolve(); await Promise.resolve();
  assert.equal(f.calls.panelsOpened, 0); assert.equal(f.calls.logsOpened, 0);
});

test('old PLAN with no independent result stays unknown and its inner notice closes without reading the new project', async () => {
  const f = fixture(), entered = deferred(), release = deferred();
  f.host.runActionCommandLeased = async () => { entered.resolve(); await release.promise; };
  const pending = f.host.withUiCommandStatus('old', 'runPlan', { clientActionId: 'old' }, () => f.host.runActionCommand('runPlan', { clientActionId: 'old' }));
  await entered.promise; f.switchProject(); f.host.localOperations.original = { status: 'failed', message: 'new project failure' };
  release.resolve(); await pending;
  assert.equal(f.host.operationNoticeSessions.size, 0); assert.equal(f.calls.notices.length, 0);
  assert.deepEqual(f.calls.statuses, ['running']); assert.equal(f.calls.submissions.length, 0);
  assert.ok(f.calls.facts.some(line => line.includes('unknown')));
  assert.ok(f.calls.facts.every(line => !line.includes('new project failure')));
});

test('an explicit old PLAN failure stays failed even if the new project has a different row', async () => {
  const f = fixture(), gate = deferred(), entered = deferred();
  const pending = f.host.withUiCommandStatus('old', 'runPlan', {}, async () => {
    entered.resolve(); await gate.promise; return { status: 'failed', message: 'original failure' };
  });
  await entered.promise; f.switchProject(); f.host.localOperations.original = { status: 'succeeded' }; gate.resolve(); await pending;
  assert.ok(f.calls.facts.some(line => line.includes('failed') && line.includes('original failure')));
  assert.deepEqual(f.calls.statuses, ['running']); assert.equal(f.calls.notices.length, 0);
});

test('project switch during the PLAN yield closes its own notice without starting the new project', async () => {
  const f = fixture(); let resume, starts = 0;
  f.schedule(fn => { resume = fn; }); f.host.runActionCommandLeased = async () => { starts++; };
  const pending = f.host.withUiCommandStatus('old', 'runPlan', { clientActionId: 'old' }, () => f.host.runActionCommand('runPlan', { clientActionId: 'old' }));
  assert.equal(typeof resume, 'function'); f.switchProject(); resume(); await pending;
  assert.equal(starts, 0); assert.equal(f.host.operationNoticeSessions.size, 0); assert.equal(f.calls.notices.length, 0);
  assert.deepEqual(f.calls.statuses, ['running']); assert.equal(f.calls.submissions.length, 0);
  assert.ok(f.calls.facts.some(line => line.includes('尚未开始')));
});

test('run all plans closes its original notice silently after a project switch', async () => {
  const f = fixture(), entered = deferred(), release = deferred();
  f.batchWork(async () => { entered.resolve(); await release.promise; return { status: 'failed', message: 'original batch failure' }; });
  const pending = f.host.runAllPlansFromUi({ clientActionId: 'batch' });
  await entered.promise; f.switchProject(); release.resolve(); const result = await pending;
  assert.equal(result.status, 'failed'); assert.equal(f.host.operationNoticeSessions.size, 0);
  assert.equal(f.calls.notices.length, 0); assert.ok(f.calls.facts.some(line => line.includes('original batch failure')));
});
