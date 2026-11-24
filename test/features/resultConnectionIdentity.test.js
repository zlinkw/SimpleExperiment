const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
require('../_helpers/registerTsRequire');
const { bindResultClientEndpoints, captureResultConnection, resultConnectionIsCurrent } = require('../../src/extension/ResultCollectionHost.ts');
const { resolveSshTransportIdentity } = require('../../src/tunnel/SshTransportIdentity.ts');

function providerMethods(names, globals = {}) {
  const text = fs.readFileSync(path.join(__dirname, '../../src/extension/legacy.ts'), 'utf8');
  const ast = ts.createSourceFile('legacy.ts', text, ts.ScriptTarget.Latest, true);
  const provider = ast.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'RealtimeTunnelPanelProvider');
  const methods = provider.members.filter(node => names.includes(node.name?.getText(ast)));
  assert.equal(methods.length, names.length);
  const source = ts.transpileModule('class Provider {' + methods.map(node => node.getText(ast)).join('\n') + '}; new Provider()', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return vm.runInNewContext(source, globals);
}

function fixture() {
  const endpoint = { id: 'w', role: 'worker', localHost: 'localhost', localPort: 19001, token: 'fixture', resourceServer: 'server:22', resourceProjectRoot: '/project' };
  const worker = { id: 'w', host: 'server', user: 'worker', port: 22, remotePath: '/project', savedSessionPath: 'session' };
  const host = { client: {}, realtimeEndpoints: () => [endpoint], workerCodeSyncTargets: () => [worker],
    workerActionTargets: () => [{ id: 'w', condaEnv: 'env' }], sftpServerOptions: target => ({ ...target, label: 'display' }) };
  bindResultClientEndpoints(host.client, host.realtimeEndpoints());
  return { host, endpoint, worker };
}

test('same connection client replacement remains current', () => {
  const { host, endpoint } = fixture();
  const snapshot = captureResultConnection(host);
  host.client = {};
  bindResultClientEndpoints(host.client, host.realtimeEndpoints());
  endpoint.displayName = 'renamed'; endpoint.capabilities = { changed: true };
  assert.equal(resultConnectionIsCurrent(host, snapshot), true);
});

test('changed channel, token or transport rejects old identity', () => {
  for (const mutate of [
    ({ endpoint }) => { endpoint.localPort++; },
    ({ endpoint }) => { endpoint.token = 'changed'; },
    ({ worker }) => { worker.savedSessionPath = 'different'; },
    ({ worker }) => { worker.remotePath = '/other'; },
  ]) {
    const f = fixture(), snapshot = captureResultConnection(f.host);
    mutate(f);
    assert.equal(resultConnectionIsCurrent(f.host, snapshot), false);
  }
});

test('new configuration cannot be associated with old or unbound client', () => {
  const f = fixture();
  f.endpoint.localPort++;
  assert.throws(() => captureResultConnection(f.host), /连接配置不一致/);
  f.host.client = {};
  assert.throws(() => captureResultConnection(f.host), /缺少连接身份/);
});

test('invalid configured root or host invalidates old reads without masking other errors', () => {
  const f = fixture(), snapshot = captureResultConnection(f.host);
  const rootMethods = providerMethods(['workerActualWorkRootTarget', 'workerCodeSyncTarget']);
  assert.throws(() => rootMethods.workerActualWorkRootTarget({ id: 'w' }), error => error.code === 'WORKER_PROJECT_ROOT_MISSING');
  rootMethods.workerActualWorkRootTarget = () => ({ id: 'w', remotePath: '/project' });
  rootMethods.agentRuntimeDirs = () => ({ workDir: '' });
  assert.throws(() => rootMethods.workerCodeSyncTarget({ id: 'w' }), error => error.code === 'WORKER_PROJECT_ROOT_MISSING');
  assert.throws(() => resolveSshTransportIdentity({ id: 'w' }), error => error.code === 'SSH_TRANSPORT_HOST_MISSING');
  for (const read of [
    () => rootMethods.workerCodeSyncTarget({ id: 'w' }),
    () => resolveSshTransportIdentity({ id: 'w' }),
  ]) {
    f.host.workerCodeSyncTargets = read;
    assert.equal(resultConnectionIsCurrent(f.host, snapshot), false);
    assert.throws(() => captureResultConnection(f.host));
  }
  f.host.workerCodeSyncTargets = () => { throw new TypeError('broken internal interface'); };
  assert.throws(() => resultConnectionIsCurrent(f.host, snapshot), /broken internal interface/);
});

test('summary completion follows the original project and connection', async () => {
  const text = fs.readFileSync(path.join(__dirname, '../../src/extension/legacy.ts'), 'utf8');
  const ast = ts.createSourceFile('legacy.ts', text, ts.ScriptTarget.Latest, true);
  const provider = ast.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'RealtimeTunnelPanelProvider');
  const methods = provider.members.filter(node => node.name?.getText(ast) === 'refreshResultsSummary');
  assert.equal(methods.length, 1);
  let resolve, reject, posts = 0, generation = 1, errors = [];
  const source = ts.transpileModule('class Provider {' + methods[0].getText(ast) + '}; new Provider()', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const subject = vm.runInNewContext(source, { captureResultConnection, resultConnectionIsCurrent,
    resultCollectionHost: () => ({ update: () => new Promise((done, fail) => { resolve = done; reject = fail; }) }), errorMessage: error => error.message });
  const f = fixture();
  Object.assign(subject, f.host, { effectiveConnectionMode: () => 'online', captureProjectContext: () => ({ generation }),
    projectContextIsCurrent: context => context.generation === generation, postState: () => posts++, recordActionError: error => errors.push(error) });
  let pending = subject.refreshResultsSummary();
  subject.client = {}; bindResultClientEndpoints(subject.client, subject.realtimeEndpoints()); resolve({ current: true });
  assert.equal((await pending).ok, true); assert.equal(posts, 1);
  pending = subject.refreshResultsSummary(); f.endpoint.localPort++; resolve({ current: true });
  assert.equal((await pending).ok, false); assert.equal(posts, 1);
  f.endpoint.localPort--; pending = subject.refreshResultsSummary(); generation++; resolve({ current: true });
  assert.equal((await pending).ok, false); assert.equal(posts, 1);
  pending = subject.refreshResultsSummary(); subject.workerCodeSyncTargets = () => resolveSshTransportIdentity({ id: 'w' });
  reject(Error('original query failure')); assert.equal((await pending).reason, 'original query failure'); assert.equal(posts, 1);
  const invalid = await subject.refreshResultsSummary();
  assert.equal(invalid.ok, false); assert.match(invalid.reason, /缺少服务器地址/); assert.equal(errors.length, 1); assert.equal(posts, 2);
});

test('manual completion notifies only the same connection', async () => {
  const text = fs.readFileSync(path.join(__dirname, '../../src/extension/legacy.ts'), 'utf8');
  const ast = ts.createSourceFile('legacy.ts', text, ts.ScriptTarget.Latest, true);
  const provider = ast.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'RealtimeTunnelPanelProvider');
  const methods = provider.members.filter(node => node.name?.getText(ast) === 'rebuildProjectResultTablesFromUi');
  assert.equal(methods.length, 1);
  let resolve, notices = 0;
  const source = ts.transpileModule('class Provider {' + methods[0].getText(ast) + '}; new Provider()', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const subject = vm.runInNewContext(source, { captureResultConnection, resultConnectionIsCurrent, AbortController,
    vscode: { ProgressLocation: { Notification: 1 }, window: { withProgress: () => new Promise(done => { resolve = done; }),
      showInformationMessage: () => notices++, showWarningMessage: () => notices++ } } });
  const f = fixture();
  Object.assign(subject, f.host, { captureProjectContext: () => ({ root: '/project' }), projectContextIsCurrent: () => true });
  const report = () => ({ current: true, skipped: [], missing: [], completed: 1, expected: 1 });
  let pending = subject.rebuildProjectResultTablesFromUi();
  subject.client = {}; bindResultClientEndpoints(subject.client, subject.realtimeEndpoints()); resolve(report());
  assert.equal((await pending).current, true); assert.equal(notices, 1);
  pending = subject.rebuildProjectResultTablesFromUi(); f.endpoint.localPort++; resolve(report());
  assert.equal((await pending).current, true); assert.equal(notices, 1);
  f.endpoint.localPort--; pending = subject.rebuildProjectResultTablesFromUi();
  subject.workerCodeSyncTargets = () => resolveSshTransportIdentity({ id: 'w' }); resolve(report());
  assert.equal((await pending).current, true); assert.equal(notices, 1);
});
