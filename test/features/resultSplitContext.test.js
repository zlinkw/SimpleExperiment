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
  const methods = cls.members.filter(n => n.name?.getText(ast) === 'splitProjectResultTableFromUi');
  assert.equal(methods.length, 1);
  let root = '/project/A', generation = 1, stat = async () => { throw Object.assign(new Error('missing'), { code: 'ENOENT' }); },
    answer = '覆盖已有子表', writer = async (target, data, options) => { await options.beforeRename(); published.push([target, data]); };
  const published = [], calls = { warnings: 0, notices: 0, invalidations: 0, catalogDirectory: '' };
  class UiCommandCancelled extends Error {}
  const sandbox = { path, UiCommandCancelled, DEFAULT_RESULT_CSV_DIR: 'artifacts/results',
    safeWorkspaceChildPath: (base, rel) => path.join(base, rel), safeResultOutputPath: async (base, rel) => path.join(base, rel),
    fs: { readFile: async () => 'fixture', stat: (...args) => stat(...args) },
    ProjectResultTables: { splitCsvByValues: () => ({ first: 'one', second: 'two' }), safeTableName: String },
    atomicWriteText: (...args) => writer(...args), vscode: { window: {
      showWarningMessage: async () => { calls.warnings++; return answer; }, showInformationMessage: () => { calls.notices++; },
    } } };
  const host = vm.runInNewContext(ts.transpileModule('class Subject {' + methods[0].getText(ast) + '}; new Subject()', {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, sandbox);
  Object.assign(host, { resultCsvDirectory: 'artifacts/results', captureProjectContext: () => ({ root, generation }),
    projectContextIsCurrent: c => c.root === root && c.generation === generation,
    readProjectResultTableCatalog: async (_root, directory) => { calls.catalogDirectory = directory; return [{ tableKey: 'table', path: 'artifacts/results/table.csv', header: ['dataset'], values: { dataset: ['first', 'second'] } }]; },
    invalidateResultCatalogCache: () => { calls.invalidations++; } });
  const message = { tableKey: 'table', splitField: 'dataset', splitValues: ['first', 'second'], keepColumns: ['dataset'] };
  return { host, message, calls, published, UiCommandCancelled, stat: fn => { stat = fn; }, answer: value => { answer = value; },
    writer: fn => { writer = fn; }, switchProject: () => { root = '/project/B'; generation++; }, changeDirectory: () => { host.resultCsvDirectory = 'other'; } };
}

test('split uses the captured result directory and publishes normally after confirmation', async () => {
  const f = fixture(); f.stat(async () => ({})); await f.host.splitProjectResultTableFromUi(f.message);
  assert.equal(f.calls.catalogDirectory, 'artifacts/results'); assert.equal(f.calls.warnings, 1);
  assert.equal(f.published.length, 2); assert.equal(f.calls.invalidations, 1); assert.equal(f.calls.notices, 1);
});

test('declined overwrite and stat permission or IO failures do not publish', async () => {
  const f = fixture(); f.stat(async () => ({})); f.answer(undefined);
  await assert.rejects(f.host.splitProjectResultTableFromUi(f.message), f.UiCommandCancelled);
  assert.equal(f.published.length, 0); assert.equal(f.calls.notices, 0);
  for (const code of ['EACCES', 'EIO']) {
    const g = fixture(), error = Object.assign(new Error('original ' + code), { code });
    g.stat(async () => { throw error; });
    await assert.rejects(g.host.splitProjectResultTableFromUi(g.message), value => value === error);
    assert.equal(g.published.length, 0); assert.equal(g.calls.warnings, 0);
  }
});

test('switch during first publication stops remaining targets and leaves current state alone', async () => {
  const f = fixture(), entered = deferred(), release = deferred();
  f.writer(async (target, data, options) => { await options.beforeRename(); f.published.push([target, data]); entered.resolve(); await release.promise; });
  const pending = f.host.splitProjectResultTableFromUi(f.message); await entered.promise; f.switchProject(); release.resolve();
  await assert.rejects(pending, f.UiCommandCancelled);
  assert.equal(f.published.length, 1); assert.equal(f.calls.invalidations, 0); assert.equal(f.calls.notices, 0);
});

test('directory change before rename rejects the old publication and later targets', async () => {
  const f = fixture(), entered = deferred(), release = deferred();
  f.writer(async (target, data, options) => { entered.resolve(); await release.promise; await options.beforeRename(); f.published.push([target, data]); });
  const pending = f.host.splitProjectResultTableFromUi(f.message); await entered.promise; f.changeDirectory(); release.resolve();
  await assert.rejects(pending, f.UiCommandCancelled);
  assert.equal(f.published.length, 0); assert.equal(f.calls.invalidations, 0); assert.equal(f.calls.notices, 0);
});
