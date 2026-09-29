const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const vm = require('node:vm');
const tables = require('../../dist/results/ProjectResultTables');
const originalLoad = Module._load;
Module._load = function(request, parent, main) {
  if (request === 'vscode') return {window: {showInformationMessage() {}, showWarningMessage: async () => '覆盖已有子表'}, workspace: {workspaceFolders: []}};
  return originalLoad.call(this, request, parent, main);
};
const {RealtimeTunnelPanelProvider} = require('../../dist/extension/legacy');
Module._load = originalLoad;

test('production writer, catalog, open and split obey dataset keys and configured root', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dataset-catalog-'));
  const registry = tables.emptyTableRegistry();
  registry.plans['experiments/plans/demo.yaml'] = {revision: 'r1', expectedSeeds: 1, records: ['BUS', 'PAD', ''].map(dataset => ({planFile: 'experiments/plans/demo.yaml', workerId: 'w1', case: 'same', seed: '1', method: 'corim', dataset, rate: '', endpoint: 'clean', metrics: {accuracy: .8}}))};
  const host = Object.assign(Object.create(RealtimeTunnelPanelProvider.prototype), {
    resultCsvDirectory: 'artifacts/results', captureProjectContext: () => ({root}),
    projectContextIsCurrent: () => true,
    openWorkspaceFileForProjectContext: async relative => {host.opened = relative;},
  });
  await host.writeProjectTableRegistry(root, registry);
  for (const dataset of ['BUS', 'PAD', '_unassigned']) {
    const final = path.join(root, 'artifacts/results', dataset, 'final/final.csv');
    const parsed = tables.readCsv(fs.readFileSync(final, 'utf8'));
    assert.deepEqual([...new Set(parsed.rows.map(row => row[parsed.header.indexOf('dataset')]))], [dataset === '_unassigned' ? '' : dataset]);
    assert.ok(fs.existsSync(final.replace('.csv', '.md')));
    assert.ok(fs.existsSync(path.join(root, 'artifacts/results', dataset, 'methods/corim/corim.csv')));
  }
  assert.equal(fs.existsSync(path.join(root, 'experiments/results')), false);
  const planKey = tables.planDirectoryKey('experiments/plans/demo.yaml');
  const artifact = `artifacts/results/BUS/plans/${planKey}/raw/w1/metrics.csv`;
  fs.mkdirSync(path.dirname(path.join(root, artifact)), {recursive: true});
  fs.writeFileSync(path.join(root, artifact), 'dataset,value\nBUS,.8\n', 'utf8');
  const catalog = tables.resultCatalog(root, host.resultCsvDirectory);
  assert.equal(catalog.datasets.length, 3);
  const all = catalog.datasets.flatMap(row => row.tables);
  assert.equal(new Set(all.map(row => row.tableKey)).size, 6);
  assert.equal(catalog.datasets.find(row => row.dataset === 'BUS').plans[0].planFile, 'experiments/plans/demo.yaml');
  await host.openLocalResultTableFromUi({tableKey: 'PAD/final', format: 'csv', file: '../untrusted'});
  assert.equal(host.opened, 'artifacts/results/PAD/final/final.csv');
  await host.openLocalResultTableFromUi({artifactKey: artifact});
  assert.equal(host.opened, artifact);
  await assert.rejects(host.openLocalResultTableFromUi({tableKey: '../escape'}));
  await assert.rejects(host.openLocalResultTableFromUi({artifactKey: '../escape.csv'}));
  await host.splitProjectResultTableFromUi({tableKey: 'PAD/final', splitField: 'dataset', splitValues: ['PAD'], keepColumns: ['dataset', 'accuracy_mean']});
  assert.equal(fs.readFileSync(path.join(root, 'artifacts/results/PAD/final/by_dataset/PAD.csv'), 'utf8').includes('PAD,0.8'), true);
  assert.equal(fs.existsSync(path.join(root, 'artifacts/results/BUS/final/by_dataset')), false);
  const before = fs.readFileSync(path.join(root, 'artifacts/results/BUS/final/final.csv'), 'utf8');
  registry.plans['experiments/plans/demo.yaml'].records.push({...registry.plans['experiments/plans/demo.yaml'].records[1], metrics: {AUC: .6, roc_auc: .7}});
  await assert.rejects(host.writeProjectTableRegistry(root, registry), /冲突/);
  assert.equal(fs.readFileSync(path.join(root, 'artifacts/results/BUS/final/final.csv'), 'utf8'), before);

  const source = require('../_helpers/sourceReader').readSource('src/ui/PanelHtml.ts');
  const start = source.indexOf('    function renderProjectResultTables(state)');
  const end = source.indexOf('\n    function ', start + 20);
  const escape = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const render = vm.runInNewContext(source.slice(start, end) + '; renderProjectResultTables', {detailsOpenAttr: () => "", asArray: value => Array.isArray(value) ? value : [], esc: escape, escAttr: escape, resultSplitTableKey: '', resultSplitFieldName: '', resultSplitSearchQuery: '', resultSplitSelectedColumns: null, resultSplitSelectedValues: null});
  const html = render({resultOutputConfig: {tables: all, catalog}});
  assert.match(html, /data-details-key="dataset-BUS"/);
  assert.match(html, /data-details-key="dataset-PAD"/);
  assert.match(html, /data-table-key="PAD\/final"/);
  assert.match(html, /未识别数据集/);
  assert.match(html, /artifacts\/results\/PAD\/final\/final.csv/);
  assert.doesNotMatch(html, /全项目总表|experiments\/results/);
});

test('legacy flat tables remain read-only and separate from new datasets', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dataset-legacy-'));
  const legacy = path.join(root, 'artifacts/results/final/final.csv');
  fs.mkdirSync(path.dirname(legacy), {recursive: true});
  fs.writeFileSync(legacy, 'dataset,value\nBUS,.5\nPAD,.6\n', 'utf8');
  assert.equal(tables.resultCatalog(root, 'artifacts/results').legacyTables.length, 1);
  const newFile = path.join(root, 'artifacts/results/BUS/final/final.csv');
  fs.mkdirSync(path.dirname(newFile), {recursive: true});
  fs.writeFileSync(newFile, 'dataset,value\nBUS,.5\n', 'utf8');
  assert.equal(tables.resultCatalog(root, 'artifacts/results').legacyTables.length, 0);
  assert.equal(fs.readFileSync(legacy, 'utf8'), 'dataset,value\nBUS,.5\nPAD,.6\n');
});
