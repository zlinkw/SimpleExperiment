const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
require('../_helpers/registerTsRequire');
const { ResultCollectionHost } = require('../../src/extension/ResultCollectionHost.ts');
const { fixture } = require('../_helpers/freshResultHost');

function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
function providerMethods(names, globals) {
  const text = fs.readFileSync(path.join(__dirname, '../../src/extension/legacy.ts'), 'utf8');
  const ast = ts.createSourceFile('legacy.ts', text, ts.ScriptTarget.Latest, true);
  const cls = ast.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === 'RealtimeTunnelPanelProvider');
  const selected = cls.members.filter(n => names.includes(n.name?.getText(ast)));
  assert.equal(selected.length, names.length);
  return vm.runInNewContext(ts.transpileModule('class Subject {' + selected.map(n => n.getText(ast)).join('\n') + '}; new Subject()', {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, { captureResultConnection: () => 'fixture', resultConnectionIsCurrent: () => true, ...globals });
}

test('summary refresh keeps old success and failure out of a new project', async () => {
  let generation = 1, pending = deferred(), posts = 0, errors = [];
  const host = providerMethods(['refreshResultsSummary'], { resultCollectionHost: () => ({ update: () => pending.promise }), errorMessage: e => e.message });
  Object.assign(host, { client: {}, effectiveConnectionMode: () => 'online', captureProjectContext: () => ({ generation }),
    projectContextIsCurrent: context => context.generation === generation, postState: () => posts++, recordActionError: error => errors.push(error), lastError: 'new-project-error' });
  let result = host.refreshResultsSummary(); generation++; pending.resolve({ current: true });
  assert.equal((await result).ok, false); assert.equal(host.lastError, 'new-project-error'); assert.equal(posts, 0);
  pending = deferred(); result = host.refreshResultsSummary(); generation++; pending.reject(Error('original read failed'));
  assert.equal((await result).reason, 'original read failed'); assert.equal(posts, 0); assert.equal(errors.length, 0);
  pending = deferred(); result = host.refreshResultsSummary(); pending.reject(Error('current read failed'));
  assert.equal((await result).reason, 'current read failed'); assert.equal(posts, 1); assert.equal(errors[0].message, 'current read failed');
});

test('old automatic completion cannot report in B or lose B completion', async () => {
  let generation = 1, root = '/project', controller = new AbortController(), nextTimer = 0;
  const timers = new Map(), errors = [], started = [];
  const previousSet = global.setTimeout, previousClear = global.clearTimeout;
  global.setTimeout = fn => { const id = ++nextTimer; timers.set(id, fn); return { id, unref() {} }; };
  global.clearTimeout = handle => timers.delete(handle.id);
  try {
    const host = { client: {}, captureProjectContext: () => ({ root, generation, signal: controller.signal }),
      projectContextIsCurrent: c => c.root === root && c.generation === generation,
      recordActionError: e => errors.push(e), effectiveTrafficPolicy: () => ({ displayAutoRefresh: true }) };
    const service = new ResultCollectionHost(host);
    service.collect = async () => { const gate = deferred(); started.push(gate); return gate.promise; };
    service.refreshOnVisible(); assert.equal(started.length, 1);
    controller.abort(); controller = new AbortController(); generation++;
    const directB = service.refreshAutomatic();
    service.refreshOnVisible();
    service.observe({ workerId: 'w', queryComplete: true, capabilities: { resultCollection: 1 },
      tasks: [{ commandId: 'c', observation: { result: { verified: true, runId: 'c', status: 'completed' } } }] });
    started[0].reject(Error('old project failed'));
    await new Promise(setImmediate); assert.equal(errors.length, 0); assert.equal(timers.size, 1);
    const fire = [...timers.values()][0]; timers.clear(); fire();
    await new Promise(setImmediate); assert.equal(started.length, 2);
    started[1].resolve({ current: true }); assert.equal((await directB).current, true); await new Promise(setImmediate);
    assert.equal(errors.length, 0);
    service.observe({ workerId: 'w', queryComplete: true, capabilities: { resultCollection: 1 },
      tasks: [{ commandId: 'd', observation: { result: { verified: true, runId: 'd', status: 'completed' } } }] });
    controller.abort(); controller = new AbortController(); generation++;
    const old = [...timers.values()][0]; timers.clear(); old(); await new Promise(setImmediate);
    assert.equal(started.length, 2, 'same root with a different generation must not start an old timer');
    const observation = { workerId: 'w', queryComplete: true, capabilities: { resultCollection: 1 },
      tasks: [{ commandId: 'e', observation: { result: { verified: true, runId: 'e', status: 'completed' } } }] };
    service.observe(observation); host.client = {}; service.observe(observation);
    assert.equal(timers.size, 1); const currentTimer = [...timers.values()][0]; timers.clear(); currentTimer();
    await new Promise(setImmediate); assert.equal(started.length, 3, 'the new client completion must not be lost');
    started[2].reject(Error('current failure')); await new Promise(setImmediate);
    assert.equal(errors.length, 1); assert.match(errors[0].message, /current failure/);
  } finally { global.setTimeout = previousSet; global.clearTimeout = previousClear; }
});

test('catalog completion after project change does not publish the old result state', async () => {
  const f = fixture(), entered = deferred(), release = deferred();
  let generation = 1, posts = 0;
  f.host.captureProjectContext = () => ({ root: f.root, generation });
  f.host.projectContextIsCurrent = c => c.generation === generation;
  f.host.refreshLocalResultCatalogForProject = async () => { entered.resolve(); await release.promise; };
  f.host.postState = () => posts++;
  const result = f.service.update(); await entered.promise; generation++; release.resolve();
  await assert.rejects(result, /项目\/服务器配置已变化/); assert.equal(posts, 0);
});

test('completed progress notification remains with its initiating project', async () => {
  let generation = 1, notices = 0;
  let progress = deferred();
  const host = providerMethods(['rebuildProjectResultTablesFromUi'], { AbortController,
    vscode: { ProgressLocation: { Notification: 1 }, window: { withProgress: () => progress.promise,
      showInformationMessage: () => notices++, showWarningMessage: () => notices++ } } });
  Object.assign(host, { client: {}, captureProjectContext: () => ({ generation }), projectContextIsCurrent: c => c.generation === generation });
  const result = host.rebuildProjectResultTablesFromUi(); generation++;
  progress.resolve({ current: true, skipped: [], missing: [], completed: 1, expected: 1 });
  assert.equal((await result).current, true); assert.equal(notices, 0);
  progress = deferred(); const cancelled = host.rebuildProjectResultTablesFromUi(); generation++;
  progress.resolve({ cancelled: true }); assert.equal((await cancelled).cancelled, true); assert.equal(notices, 0);
  progress = deferred(); const current = host.rebuildProjectResultTablesFromUi();
  progress.resolve({ current: true, skipped: [], missing: [], completed: 1, expected: 1 });
  await current; assert.equal(notices, 1);
});
