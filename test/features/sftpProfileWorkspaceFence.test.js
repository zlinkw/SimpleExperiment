const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../../src/extension/legacy.ts'), 'utf8');
function method(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  assert.ok(a >= 0 && b > a);
  return source.slice(a, b);
}
// Locate the next class method after the complete workflow, not an inner async callback.
const completeStart = source.indexOf('    async completeQuickSetupAfterWorkspace(');
const completeEnd = source.indexOf('\n    async ', completeStart + 12);
const complete = source.slice(completeStart, completeEnd);
const quick = method('    async quickSetup(showAgentCompletion = true)', '    async completeQuickSetupAfterWorkspace(');
const profiles = method('    async writeSftpManagerServerProfiles(targetIds)', '    sftpSharedTargets()');

function fixture(readFile) {
  let current = true, rename = 0, mkdir = 0;
  const fakeFs = { readFile, mkdir: async () => { mkdir++; } };
  const box = { fs: fakeFs, path, process: { env: { APPDATA: '/fake' } }, os: { homedir: () => '/fake' },
    firstNonEmpty: (...args) => args.find(Boolean) || '', workspaceRoot: () => '/a', assertSingleProjectWorkspace() {},
    atomicWriteText: async (_file, _text, options) => { await options.beforeRename(); rename++; },
    vscode: { window: { showInformationMessage: async () => '稍后', showWarningMessage: async () => {} } },
    serverSetupMissingItems: () => [], executionEnvironmentLabel: () => 'env' };
  vm.createContext(box);
  const js = ts.transpileModule(`class Host { ${quick}\n${complete}\n${profiles} } this.Host = Host;`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInContext(js, box);
  const host = new box.Host();
  Object.assign(host, { captureProjectContext: () => '/a', projectContextIsCurrent: () => current,
    assertTopologyActualWorkRoots() {}, sftpSharedTargets: () => [{ id: 'w', host: 'host', user: 'u', remotePath: '/root' }],
    setupConfig: { condaEnv: 'env' }, ensureSimpleSftpReadyForSetup: async () => true, enabledWorkerConfigs: () => [{ id: 'w' }],
    projectTopologyAssessment: () => ({}), currentAgentPreparationBlockers: () => [], postState() {} });
  return { host, box, change: () => { current = false; }, get rename() { return rename; }, get mkdir() { return mkdir; } };
}

test('profile read errors and malformed data do not overwrite shared configuration', async () => {
  for (const read of [async () => { throw Object.assign(Error('denied'), { code: 'EACCES' }); }, async () => '{bad', async () => '{"servers":{}}']) {
    const f = fixture(read);
    await assert.rejects(f.host.writeSftpManagerServerProfiles());
    assert.equal(f.rename, 0); assert.equal(f.mkdir, 0);
  }
  const f = fixture(async () => { throw Object.assign(Error('missing'), { code: 'ENOENT' }); });
  assert.equal((await f.host.writeSftpManagerServerProfiles()).targetCount, 1); assert.equal(f.rename, 1);
});

test('workspace change after profile read or before publication stops the write', async () => {
  let f = fixture(async () => { f.change(); return '{"servers":[]}'; });
  await assert.rejects(f.host.writeSftpManagerServerProfiles(), /项目已切换/); assert.equal(f.mkdir, 0); assert.equal(f.rename, 0);
  f = fixture(async () => '{"servers":[]}');
  f.box.atomicWriteText = async (_file, _text, options) => { f.change(); await options.beforeRename(); };
  await assert.rejects(f.host.writeSftpManagerServerProfiles(), /项目已切换/); assert.equal(f.rename, 0);
});

test('quick setup does not start a later action after its prompt changes project', async () => {
  const f = fixture(async () => '{"servers":[]}'); let effects = 0;
  f.box.vscode.window.showInformationMessage = async () => { f.change(); return '准备 Agent 并启动'; };
  f.host.prepareAgentsForFirstRun = async () => { effects++; };
  await assert.rejects(f.host.completeQuickSetupAfterWorkspace(), /项目已切换/);
  assert.equal(f.rename, 1); assert.equal(effects, 0);
});

test('quick setup stops if the project changes during initial readiness', async () => {
  const f = fixture(async () => '{"servers":[]}'); let continued = 0;
  f.host.ensureSimpleSftpReadyForSetup = async () => { f.change(); return true; };
  f.host.completeQuickSetupAfterWorkspace = async () => { continued++; };
  await assert.rejects(f.host.quickSetup(), /项目已切换/);
  assert.equal(continued, 0); assert.equal(f.rename, 0);
});
