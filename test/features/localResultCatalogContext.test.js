const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
function fixture() {
  const text = fs.readFileSync(path.join(__dirname, '../../src/extension/legacy.ts'), 'utf8');
  const ast = ts.createSourceFile('legacy.ts', text, ts.ScriptTarget.Latest, true);
  const cls = ast.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === 'RealtimeTunnelPanelProvider');
  const names = ['refreshLocalResultsFromUi', 'refreshLocalResultCatalogForProject'];
  const methods = cls.members.filter(n => names.includes(n.name?.getText(ast)));
  assert.equal(methods.length, names.length);
  let generation = 1, exported = () => Promise.resolve(undefined), regenerate = async () => {};
  const globals = { DEFAULT_RESULT_CSV_DIR: 'experiments/results', Date,
    UiCommandCancelled: class UiCommandCancelled extends Error {}, errorMessage: error => error.message,
    readLatestResultExport: (...args) => exported(...args), regenerateLatestResultTables: (...args) => regenerate(...args),
    pluginProjectAdapterRules: () => ({ planDatasetMapping: {} }) };
  const host = vm.runInNewContext(ts.transpileModule('class Subject {' + methods.map(n => n.getText(ast)).join('\n') + '}; new Subject()', {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, globals);
  const calls = { cancel: 0, read: 0, post: 0, interest: 0 };
  const worker = { identity: 'current-worker' };
  Object.assign(host, { resultCsvDirectory: 'results/A', resultCatalogDirtyGeneration: 4, resultCatalogStatus: 'ready',
    resultCatalogRefreshError: 'current error', resultCatalogRefreshFailedKey: 'current-key', resultCatalogRefreshBackoffUntil: 123,
    resultCatalogRefreshWorker: worker, captureProjectContext: () => ({ root: 'project', generation }),
    projectContextIsCurrent: context => context.generation === generation,
    withProjectResultPublicationLease: async (_root, _dir, work) => work(),
    cancelResultCatalogRefresh: () => calls.cancel++, resultCatalogKey: () => host.resultCsvDirectory + ':' + host.resultCatalogDirtyGeneration,
    hasResultCatalogForRoot: () => false, readProjectResultCatalog: async () => { calls.read++; return { datasets: [] }; },
    compactResultTablesFromCatalog: () => [], postState: () => calls.post++, refreshResultCatalogForCurrentInterest: () => calls.interest++ });
  return { host, calls, worker, switchProject: () => generation++, exported: fn => { exported = fn; }, regenerate: fn => { regenerate = fn; } };
}

test('old empty export cannot start a new project catalog refresh', async () => {
  const f = fixture(), read = deferred(); f.exported(() => read.promise);
  const pending = f.host.refreshLocalResultsFromUi(); f.switchProject(); read.resolve(undefined);
  await assert.rejects(pending, /变化/); assert.equal(f.calls.cancel, 0); assert.equal(f.calls.read, 0);
  assert.equal(f.host.resultCatalogRefreshWorker, f.worker); assert.equal(f.host.resultCatalogDirtyGeneration, 4);
});

test('stale catalog entry cannot cancel or alter the current worker and state', async () => {
  const f = fixture(), context = f.host.captureProjectContext(); f.switchProject();
  await assert.rejects(f.host.refreshLocalResultCatalogForProject(context), /变化/);
  assert.deepEqual(f.calls, { cancel: 0, read: 0, post: 0, interest: 0 });
  assert.equal(f.host.resultCatalogRefreshWorker, f.worker); assert.equal(f.host.resultCatalogStatus, 'ready');
  assert.equal(f.host.resultCatalogRefreshError, 'current error'); assert.equal(f.host.resultCatalogDirtyGeneration, 4);
  assert.equal(f.host.resultCatalogRefreshFailedKey, 'current-key'); assert.equal(f.host.resultCatalogRefreshBackoffUntil, 123);
});

test('current catalog succeeds and a current read failure remains visible', async () => {
  const f = fixture(), context = f.host.captureProjectContext();
  await f.host.refreshLocalResultCatalogForProject(context);
  assert.equal(f.host.resultCatalogStatus, 'ready'); assert.equal(f.calls.post, 1); assert.equal(f.calls.interest, 1);
  f.host.readProjectResultCatalog = async () => { throw Error('read failed'); };
  await assert.rejects(f.host.refreshLocalResultCatalogForProject(context), /read failed/);
  assert.equal(f.host.resultCatalogStatus, 'error'); assert.equal(f.host.resultCatalogRefreshError, 'read failed'); assert.equal(f.calls.post, 2);
});

test('changed result directory stops regeneration and old catalog error publication', async () => {
  const f = fixture(), read = deferred(); let regenerated = false;
  f.exported(() => read.promise); f.regenerate(async () => { regenerated = true; });
  const pending = f.host.refreshLocalResultsFromUi(); f.host.resultCsvDirectory = 'results/B'; read.resolve({ tables: [] });
  await assert.rejects(pending, /变化/); assert.equal(regenerated, false);
  assert.equal(f.calls.cancel, 0); assert.equal(f.calls.read, 0);
  const f2 = fixture(), entered = deferred(), release = deferred();
  f2.exported(async () => ({ tables: [] }));
  f2.regenerate(async (_root, _dir, _exported, isCurrent) => { entered.resolve(); await release.promise; assert.equal(isCurrent(), false); });
  const duringRegeneration = f2.host.refreshLocalResultsFromUi(); await entered.promise;
  f2.host.resultCsvDirectory = 'results/B'; release.resolve();
  await assert.rejects(duringRegeneration, /变化/); assert.equal(f2.calls.cancel, 0); assert.equal(f2.calls.read, 0);
  const catalog = deferred(); f.host.resultCsvDirectory = 'results/A';
  f.host.readProjectResultCatalog = () => catalog.promise;
  const old = f.host.refreshLocalResultCatalogForProject(f.host.captureProjectContext());
  f.host.resultCsvDirectory = 'results/B'; f.host.resultCatalogStatus = 'ready'; f.host.resultCatalogRefreshError = 'B error';
  catalog.resolve({ datasets: [] }); await assert.rejects(old, /变化/);
  assert.equal(f.host.resultCatalogStatus, 'ready'); assert.equal(f.host.resultCatalogRefreshError, 'B error'); assert.equal(f.calls.post, 0);
});
