const test = require('node:test');
const assert = require('node:assert/strict');
const { registerUpdater, activateWithBusiness, deactivate, getUpdateStatus, CHECK_COMMAND, INSTALL_COMMAND, assertBusinessAllowed } = require('../../dist/updates/Bootstrap');
const { TRANSACTION_KEY } = require('../../dist/updates/UpdateTransaction');
const { SFTP_EXTENSION_ID, EXPERIMENT_EXTENSION_ID } = require('../../dist/features/ExtensionUpdates');
function fixture(client, options = {}) {
  const state = new Map(), calls = [], commands = new Map(), subscriptions = [], versions = { [SFTP_EXTENSION_ID]: '1.0.0', [EXPERIMENT_EXTENSION_ID]: '1.0.0' };
  const context = { subscriptions, globalStorageUri: { fsPath: 'unused' }, globalState: { get: (k, fallback) => state.has(k) ? state.get(k) : fallback, update: async (k, v) => { state.set(k, structuredClone(v)); } } };
  const vscode = { version: '1.100.0', StatusBarAlignment: { Right: 1 }, Uri: { file: fsPath => ({ fsPath }) }, extensions: { getExtension: id => ({ packageJSON: { version: versions[id] } }) },
    commands: { registerCommand: (id, fn) => { commands.set(id, fn); return { dispose() {} }; }, executeCommand: async (id, uri) => { calls.push(id); if (id.endsWith('installExtension')) { if (options.fail === uri.fsPath) throw Error('install failed'); versions[uri.fsPath] = '1.1.0'; } } },
    window: { createStatusBarItem: () => ({ show() {}, dispose() {} }), showInformationMessage: async message => { calls.push('notice:' + message); },
      showWarningMessage: async () => { calls.push('confirm'); return options.deny ? '取消' : '安装并重载'; }, showErrorMessage: async message => { calls.push('error:' + message); } } };
  const components = [SFTP_EXTENSION_ID, EXPERIMENT_EXTENSION_ID].map((id, i) => ({ id, repo: i ? 'zlinkw/SimpleExperiment' : 'zlinkw/SimpleSFTP', label: id, currentVersion: '1.0.0', latestVersion: '1.1.0', updateAvailable: true,
    vsix: { size: 100, url: `https://github.com/zlinkw/${i ? 'SimpleExperiment' : 'SimpleSFTP'}/releases/download/v1.1.0/update.vsix`, digest: 'sha256:' + 'a'.repeat(64) } }));
  const plan = { status: 'update_available', checkedAt: '', message: 'update', sftp: components[0], experiment: components[1] };
  const local = { gate: { begin: async () => calls.push('gate'), end: async () => calls.push('ungate'), wait: async () => calls.push('wait') },
    store: { prepare: async c => { calls.push('prepare:' + c.id); return c.id; }, verify: async file => calls.push('verify:' + file) } };
  const updater = options.noRegister ? undefined : registerUpdater(context, vscode, client || { check: async () => plan }, local);
  return { updater, context, vscode, state, calls, commands, local, plan, versions, dispose: () => subscriptions.forEach(s => s.dispose()) };
}
test('independent commands work without project/panel and one version prompts only once', async () => {
  const f = fixture();
  try { assert.ok(f.commands.has(CHECK_COMMAND)); assert.ok(f.commands.has(INSTALL_COMMAND)); const a = f.updater.check(), b = f.updater.check(); assert.equal(a, b); await a; await f.updater.check(); assert.equal(f.calls.filter(s => s.startsWith('notice:')).length, 1); }
  finally { f.dispose(); }
});
test('business loading failure retains working update commands and clear failure status', async () => {
  const client = { check: async () => { throw Error('offline'); } }, f = fixture(client, { noRegister: true });
  try {
    await activateWithBusiness(f.context, f.vscode, () => { assert.ok(f.commands.has(CHECK_COMMAND)); throw Error('broken panel'); }, client, f.local);
    await assert.rejects(f.commands.get(CHECK_COMMAND)(), /offline/); assert.equal(getUpdateStatus().status, 'error');
    assert.ok(f.calls.some(s => s.includes('独立更新命令仍可用')));
  } finally { f.dispose(); await deactivate(); }
});
test('confirmation precedes side effects; packages prepare together and partial success remains reviewable', async () => {
  const denied = fixture(undefined, { deny: true });
  try { await denied.updater.check(); await denied.updater.install(); assert.ok(!denied.calls.includes('gate')); assert.ok(!denied.state.get(TRANSACTION_KEY)); } finally { denied.dispose(); }
  const f = fixture(undefined, { fail: EXPERIMENT_EXTENSION_ID });
  try {
    await f.updater.check(); await assert.rejects(f.updater.install(), /install failed/);
    assert.ok(f.calls.indexOf('confirm') < f.calls.indexOf('gate'));
    assert.ok(f.calls.indexOf('prepare:' + EXPERIMENT_EXTENSION_ID) < f.calls.indexOf('workbench.extensions.installExtension'));
    assert.equal(f.updater.blocked, true); assert.deepEqual(f.state.get(TRANSACTION_KEY).completed, [SFTP_EXTENSION_ID]);
    await f.updater.check(); assert.equal(getUpdateStatus().status, 'update_available'); assert.match(getUpdateStatus().message, /上次/);
  } finally { f.dispose(); await f.updater.dispose(); }
});
test('main entry and panel/API share the independent updater without changing Worker runtimes', () => {
  const fs = require('node:fs'), p = require('node:path'), root = p.join(__dirname, '../..');
  assert.equal(require('../../package.json').main, './dist/updates/Bootstrap.js');
  const source = fs.readFileSync(p.join(root, 'src/updates/Bootstrap.ts'), 'utf8');
  assert.match(source, /30 \* 60 \* 1000/); assert.ok(source.indexOf('service = registerUpdater') < source.indexOf('business = loadBusiness'));
  const provider = fs.readFileSync(p.join(root, 'src/extension/legacy.ts'), 'utf8');
  assert.match(provider, /if \(updater\) return updater\.check\(manual\)/); assert.match(provider, /if \(updater\) return updater\.install\(\)/);
  assert.match(provider, /getUpdater\(\)\?\.blocked\) return/);
});
test('reload settles an installed batch; incomplete original batch is never automatically installed', async () => {
  const f = fixture();
  try {
    await f.updater.check(); await f.updater.install(); const journal = f.state.get(TRANSACTION_KEY);
    const restart = fixture(); restart.state.set(TRANSACTION_KEY, journal); Object.assign(restart.versions, f.versions);
    try { await restart.updater.check(); assert.equal(restart.updater.blocked, false); assert.equal(restart.state.get(TRANSACTION_KEY), undefined); assert.ok(!restart.calls.includes('workbench.extensions.installExtension')); }
    finally { restart.dispose(); }
    const incomplete = fixture(); incomplete.state.set(TRANSACTION_KEY, { ...journal, status: 'failed', completed: [SFTP_EXTENSION_ID] }); incomplete.versions[SFTP_EXTENSION_ID] = '1.1.0';
    try { await incomplete.updater.check(); assert.equal(incomplete.updater.blocked, true); assert.ok(!incomplete.calls.includes('workbench.extensions.installExtension')); }
    finally { incomplete.dispose(); await incomplete.updater.dispose(); }
  } finally { f.dispose(); await f.updater.dispose(); }
});
test('old SFTP cannot enter an update gate that would abort its existing transfers', async () => {
  const f = fixture(); f.versions[SFTP_EXTENSION_ID] = '0.2.68';
  try { await f.updater.check(); await assert.rejects(f.updater.install(), /0.2.69/); assert.ok(!f.calls.includes('gate')); assert.ok(!f.calls.includes('workbench.extensions.installExtension')); }
  finally { f.dispose(); }
});
