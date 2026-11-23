const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
function fixture() {
  const source = fs.readFileSync(path.join(__dirname, '../../src/extension/legacy.ts'), 'utf8');
  const ast = ts.createSourceFile('legacy.ts', source, ts.ScriptTarget.Latest, true);
  const cls = ast.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === 'RealtimeTunnelPanelProvider');
  const methods = cls.members.filter(n => n.name?.getText(ast) === 'runCheckStaticCore');
  assert.equal(methods.length, 1);
  let root = '/project/A', refresh = async () => {}, stat = async () => ({ isFile: () => true }), pick = '打开报告';
  const calls = { checks: 0, stats: 0, posts: 0, notices: 0, opened: 0, copied: 0 };
  const sandbox = { path, __dirname: '/extension/dist/extension', CHECK_STATIC_REPORT_REL_PATH: 'simple_cluster/check_reports/check-static-latest.md',
    workspaceRoot: () => root, safeWorkspaceChildPath: (base, rel) => path.join(base, rel),
    fsNode: { statSync: () => ({ isFile: () => true }) }, fs: { stat: (...args) => { calls.stats++; return stat(...args); } },
    runProjectStaticCheck: async () => { calls.checks++; return { overall: 'passed', plans: 2 }; },
    vscode: { window: { showInformationMessage: async () => { calls.notices++; return pick; } } } };
  const host = vm.runInNewContext(ts.transpileModule('class Subject {' + methods[0].getText(ast) + '}; new Subject()', {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, sandbox);
  Object.assign(host, { context: { extensionPath: '/extension' }, refreshCheckStaticReports: (...args) => refresh(...args),
    postState: () => calls.posts++, openLastCheckStaticReportFromUi: async () => calls.opened++, copyLastCheckStaticReportFromUi: async () => calls.copied++ });
  const controller = new AbortController();
  return { host, calls, controller, switchProject: () => { root = '/project/B'; controller.abort(); }, refresh: fn => { refresh = fn; },
    stat: fn => { stat = fn; }, pick: value => { pick = value; } };
}

test('completed static check reports and opens its original report', async () => {
  const f = fixture(); await f.host.runCheckStaticCore(f.controller.signal);
  assert.deepEqual(f.calls, { checks: 1, stats: 1, posts: 1, notices: 1, opened: 1, copied: 0 });
});

test('project switch while the report list refreshes suppresses late UI work', async () => {
  const f = fixture(), entered = deferred(), release = deferred();
  f.refresh(async () => { entered.resolve(); await release.promise; });
  const pending = f.host.runCheckStaticCore(f.controller.signal); await entered.promise; f.switchProject(); release.resolve(); await pending;
  assert.deepEqual(f.calls, { checks: 1, stats: 0, posts: 0, notices: 0, opened: 0, copied: 0 });
});

test('project switch while the report is checked suppresses late UI work and errors', async () => {
  for (const fail of [false, true]) {
    const f = fixture(), entered = deferred(), release = deferred();
    f.stat(async () => { entered.resolve(); await release.promise; if (fail) throw Object.assign(Error('late EIO'), { code: 'EIO' }); return { isFile: () => true }; });
    const pending = f.host.runCheckStaticCore(f.controller.signal); await entered.promise; f.switchProject(); release.resolve(); await pending;
    assert.deepEqual(f.calls, { checks: 1, stats: 1, posts: 0, notices: 0, opened: 0, copied: 0 });
  }
});

test('missing report is distinguished from permission and IO errors', async () => {
  for (const code of ['ENOENT', 'EACCES', 'EIO']) {
    const f = fixture(); f.stat(async () => { throw Object.assign(Error('original ' + code), { code }); });
    await assert.rejects(f.host.runCheckStaticCore(f.controller.signal), code === 'ENOENT' ? /未生成报告/ : new RegExp('original ' + code));
    assert.equal(f.calls.posts, 0); assert.equal(f.calls.notices, 0);
  }
});
