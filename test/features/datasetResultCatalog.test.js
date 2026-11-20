const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const vm = require('node:vm');
const tables = require('../../dist/results/ProjectResultTables');
let savedRules = {};
const originalLoad = Module._load;
Module._load = function(request, parent, main) {
  if (request === 'vscode') return {Uri: {file: value => ({fsPath: value})}, ConfigurationTarget: {WorkspaceFolder: 2}, ProgressLocation: {Notification: 1}, window: {withProgress: async (_options, work) => work({report() {}}, {isCancellationRequested: false}), showInformationMessage() {}, showWarningMessage: async () => '覆盖已有子表'}, workspace: {workspaceFolders: [], getConfiguration: () => ({get: () => savedRules, update: async (_key, value) => { savedRules = value; }})}};
  return originalLoad.call(this, request, parent, main);
};
const {RealtimeTunnelPanelProvider} = require('../../dist/extension/legacy');
Module._load = originalLoad;

const {scenario,exportsApi}=require('../_helpers/resultCollectionScenario');

test('rebuild button respects selected plans and preserves prior export on project change or write failure', async () => {
  const f = scenario(), a = f.addPlan('experiments/plans/a.yaml', { seeds: [42] }), b = f.addPlan('experiments/plans/b.yaml', { seeds: [43] });
  f.put(a, 0, { dataset: 'A', runId: 'a-run' }); f.put(b, 0, { dataset: 'B', runId: 'b-run' });
  const rebuild = options => RealtimeTunnelPanelProvider.prototype.rebuildProjectResultTablesFromUi.call(f.host, options);
  const all = await rebuild({}); assert.equal(all.current, true); assert.equal(all.completed, 2);
  const prior = JSON.stringify(f.snapshot());
  const selected = await rebuild({ planFiles: [a.planFile] });
  assert.equal(selected.scope, 'selected_plans'); assert.ok(selected.results.every(row => row.planFile === a.planFile));
  assert.equal(JSON.stringify(f.snapshot()), prior);
  f.receive((_params, value) => { f.current(false); return value; });
  await assert.rejects(rebuild({}), /变化|取消/); assert.equal(JSON.stringify(f.snapshot()), prior);
  f.current(true); f.receive((_params, value) => value);
  f.host.resultCsvDirectory = a.planFile;
  await assert.rejects(rebuild({})); assert.equal(JSON.stringify(f.snapshot()), prior);
});

test('active writer, catalog, opening and splitting bind dataset keys and the configured root',async()=>{
  const f=scenario({directory:'artifacts/results'}),p=f.addPlan(undefined,{seeds:[1],cases:['bus','pad','unassigned']});
  p.jobs.forEach((j,index)=>f.put(p,index,{dataset:['BUS','PAD',''][index]}));
  const report=await f.update();assert.equal(report.completed,3);
  const catalog=await f.catalog();assert.deepEqual(catalog.datasets.map(d=>d.datasetKey).sort(),['BUS','PAD','_unassigned']);
  const all=catalog.datasets.flatMap(d=>d.tables);assert.equal(new Set(all.map(t=>t.tableKey)).size,6);
  assert.equal(fs.existsSync(path.join(f.root,'experiments/results')),false);
  const h=Object.assign(Object.create(RealtimeTunnelPanelProvider.prototype),f.host,{
    openWorkspaceFileForProjectContext:async file=>{h.opened=file;},invalidateResultCatalogCache(){}
  });
  await h.openLocalResultTableFromUi({tableKey:'PAD/final',format:'csv',file:'../untrusted'});
  assert.equal(h.opened,'artifacts/results/PAD/final/final.csv');
  await h.openLocalResultTableFromUi({tableKey:'PAD/final',format:'md'});assert.match(h.opened,/PAD\/final\/final.md$/);
  await assert.rejects(h.openLocalResultTableFromUi({tableKey:'../escape'}));
  await assert.rejects(h.openLocalResultTableFromUi({artifactKey:'../escape.csv'}));
  await h.splitProjectResultTableFromUi({tableKey:'PAD/final',splitField:'dataset',splitValues:['PAD'],keepColumns:['dataset','roc_auc_mean']});
  assert.match(fs.readFileSync(path.join(f.root,'artifacts/results/PAD/final/by_dataset/PAD.csv'),'utf8'),/PAD,0.92/);
  assert.equal(fs.existsSync(path.join(f.root,'artifacts/results/BUS/final/by_dataset')),false);
});

test('local refresh regenerates the current export without remote reads, raw caches or old registry rows',async()=>{
  const f=scenario(),p=f.addPlan(undefined,{seeds:[42]});f.put(p,0);await f.update();
  const before=JSON.stringify(f.snapshot()),csv=f.snapshot().tables.find(t=>t.kind==='final');
  fs.writeFileSync(path.join(f.root,'artifacts/results',csv.relativePath),'stale');
  fs.writeFileSync(path.join(f.root,'artifacts/results',csv.markdownPath),'stale');
  f.calls.length=0;
  const h=Object.assign(Object.create(RealtimeTunnelPanelProvider.prototype),f.host);
  await h.refreshLocalResultsFromUi();await h.refreshLocalResultsFromUi();
  assert.equal(JSON.stringify(f.snapshot()),before);assert.match(f.read(csv.relativePath),/0.92/);
  assert.equal(f.read(csv.markdownPath),csv.markdown);assert.deepEqual(f.calls,[]);
  assert.equal(fs.existsSync(path.join(f.root,'simple_cluster/results/project_table_registry.json')),false);
});

test('the current export hides old method and dataset tables without deleting their files',async()=>{
  const f=scenario(),p=f.addPlan(undefined,{seeds:[42]});f.put(p,0,{dataset:'old',method:'old-method'});await f.update();
  const old=f.read('old/final/final.csv');f.put(p,0,{dataset:'new',method:'new-method',runId:'new-command',metric:.61});await f.update();
  assert.equal(f.read('old/final/final.csv'),old);
  const catalog=await f.catalog();assert.deepEqual(catalog.datasets.map(d=>d.datasetKey),['new']);
  assert.deepEqual(catalog.datasets[0].tables.map(t=>t.tableKey).sort(),['new/final','new/method/new-method']);
});

test('manual dataset mapping is workspace scoped and applies only to unassigned fresh metrics',async()=>{
  savedRules={};const f=scenario(),p=f.addPlan(undefined,{seeds:[42]});f.put(p,0,{dataset:''});await f.update();
  const h=Object.assign(Object.create(RealtimeTunnelPanelProvider.prototype),f.host);
  h.loadProjectTableRegistry=RealtimeTunnelPanelProvider.prototype.loadProjectTableRegistry;
  const original=f.storage.get('w1').get(p.jobs[0].result_csv);await h.applyPlanDatasetMappingFromUi({mappings:{[p.planFile]:'PAD'}});
  assert.equal(savedRules.planDatasetMapping[p.planFile].datasets[0],'PAD');
  assert.equal((await f.catalog()).unassignedPlans.length,0,'applying the mapping reorganizes the saved export immediately');
  assert.match(f.read('PAD/final/final.csv'),/PAD/);
  f.rules.planDatasetMapping=savedRules.planDatasetMapping;await f.update();
  assert.equal((await f.catalog()).unassignedPlans.length,0);assert.match(f.read('PAD/final/final.csv'),/PAD/);
  assert.deepEqual(f.storage.get('w1').get(p.jobs[0].result_csv),original);
  await assert.rejects(h.applyPlanDatasetMappingFromUi({mappings:{[p.planFile]:'BUS'}}),/不能通过人工映射覆盖/);
});

test('automatic dataset matching refreshes only the current project result view', async () => {
  savedRules = { planDatasetMapping: { 'plans/a.yaml': { datasets: ['A'] } } };
  for (const current of [true, false]) {
    const calls = [], context = { root: 'fixture-project' };
    const host = {
      captureProjectContext: () => context,
      projectContextIsCurrent: value => value === context && current,
      readProjectResultCatalog: async (root, mappings) => {
        calls.push({ root, mappings });
        return { autoRecoverableCount: 1, unassignedPlans: [], multiDatasetPlans: [] };
      },
      invalidateResultCatalogCache: reason => calls.push(reason),
      postState: () => calls.push('state'),
    };
    await RealtimeTunnelPanelProvider.prototype.autoMatchPlanDatasetsFromUi.call(host);
    assert.deepEqual(calls[0], { root: context.root, mappings: savedRules.planDatasetMapping });
    assert.deepEqual(calls.slice(1), current ? ['planDatasetMapping', 'state'] : []);
  }
});

test('collected metrics keep Plan and seed groups through tables, catalog and split export', async () => {
  const f = scenario({ workerIds: ['w1'] });
  const plans = [
    f.addPlan('experiments/plans/a.yaml', { seeds: [42, 43], cases: ['same-case'] }),
    f.addPlan('experiments/plans/b.yaml', { seeds: [42, 43], cases: ['same-case'] }),
  ];
  const values = [ [[.2, .4, .6], [.4, .6, .8]], [[.8, .2, .4], [.9, .4, .6]] ];
  for (const [planIndex, plan] of plans.entries()) for (const job of plan.jobs) {
    const csv = 'case,seed,method,dataset,eval_protocol,AP,macro_f1,weighted_f1\n' +
      `${job.case},${job.seed},method,set,clean,${values[planIndex][job.index].join(',')}\n`;
    f.put(plan, job.index, { workerId: 'w1', runId: `p${planIndex}-job${job.index}`, text: csv });
  }
  const report = await f.update();
  assert.equal(report.results.length, 4);
  assert.deepEqual(report.results.map(row => Number(row.dimensions.seed)).sort(), [42, 42, 43, 43]);
  const table = f.snapshot().tables.find(row => row.tableKey === 'set/final');
  assert.ok(table);
  const byPlan = new Map(table.rows.map(row => [row[table.header.indexOf('plan_file')], row]));
  assert.equal(byPlan.size, 2);
  for (const [planIndex, plan] of plans.entries()) {
    const row = byPlan.get(plan.planFile);
    assert.ok(row);
    assert.equal(row[table.header.indexOf('dataset')], 'set');
    assert.equal(row[table.header.indexOf('result_family')], 'method');
    assert.equal(String(row[table.header.indexOf('jobs')]), '2');
    for (const [index, name] of ['ap_mean', 'macro_f1_mean', 'weighted_f1_mean'].entries()) {
      const expected = (values[planIndex][0][index] + values[planIndex][1][index]) / 2;
      assert.ok(Math.abs(row[table.header.indexOf(name)] - expected) < 1e-12, name);
      const sd = Math.abs(values[planIndex][0][index] - values[planIndex][1][index]) / Math.sqrt(2);
      assert.ok(Math.abs(row[table.header.indexOf(name.replace('_mean', '_sd'))] - sd) < 1e-12, name);
    }
  }
  const catalog = await f.catalog();
  assert.ok(catalog.datasets.some(row => row.datasetKey === 'set' && row.tables.some(item => item.tableKey === 'set/final')));
  const csv = f.read(table.relativePath), markdown = f.read(table.markdownPath);
  const parsed = tables.readCsv(csv);
  assert.equal(parsed.rows.length, 2);
  for (const plan of plans) {
    const csvRow = parsed.rows.find(row => row[parsed.header.indexOf('plan_file')] === plan.planFile);
    const jsonRow = byPlan.get(plan.planFile);
    for (const name of ['ap_mean', 'macro_f1_mean', 'weighted_f1_mean']) {
      assert.equal(Number(csvRow[parsed.header.indexOf(name)]), Number(jsonRow[table.header.indexOf(name)]));
      assert.ok(markdown.includes(Number(jsonRow[table.header.indexOf(name)]).toFixed(4)));
    }
  }
  assert.ok(markdown.includes(plans[0].planFile) && markdown.includes(plans[1].planFile));
  const host = Object.assign(Object.create(RealtimeTunnelPanelProvider.prototype), f.host, { invalidateResultCatalogCache() {} });
  await host.splitProjectResultTableFromUi({ tableKey: 'set/final', splitField: 'plan_file',
    splitValues: [plans[0].planFile], keepColumns: ['plan_file', 'ap_mean', 'macro_f1_mean', 'weighted_f1_mean'] });
  const split = tables.readCsv(f.read(`set/final/by_plan_file/${tables.safeTableName(plans[0].planFile)}.csv`));
  assert.equal(split.rows.length, 1);
  assert.equal(split.rows[0][split.header.indexOf('plan_file')], plans[0].planFile);
  for (const name of ['ap_mean', 'macro_f1_mean', 'weighted_f1_mean']) {
    assert.equal(Number(split.rows[0][split.header.indexOf(name)]), Number(byPlan.get(plans[0].planFile)[table.header.indexOf(name)]));
  }
  assert.ok(!JSON.stringify(split.rows).includes(plans[1].planFile));
});

test('local dataset mapping merges aggregate schemas and preserves review, provenance and source evidence without querying',async()=>{
  const f=scenario(),a=f.addPlan('experiments/plans/unassigned.yaml',{seeds:[42,43]}),b=f.addPlan('experiments/plans/labelled.yaml',{seeds:[42]});
  f.put(a,0,{dataset:'',metric:.7});f.put(a,1,{dataset:'',metric:.9});
  f.put(b,0,{dataset:'PAD',text:'case,seed,method,dataset,split,metric,value\nalpha,42,method,PAD,test,accuracy,0.5\n'});
  const review=f.addPlan('experiments/plans/review.yaml',{seeds:[42]});f.put(review,0,{dataset:'',outcome:'failed',exitCode:7});
  await f.update();const before=f.snapshot();f.calls.length=0;
  await exportsApi.mapLatestResultDatasets(f.root,'artifacts/results',{[a.planFile]:'PAD',[review.planFile]:'PAD'});
  const after=f.snapshot();assert.deepEqual(after.jobs,before.jobs);assert.equal(after.observedAt,before.observedAt);assert.deepEqual(f.calls,[]);
  const final=after.tables.find(t=>t.tableKey==='PAD/final');assert.equal(final.rows.length,2);
  const row=final.rows.find(r=>r[final.header.indexOf('plan_file')]===a.planFile);
  assert.equal(row[final.header.indexOf('roc_auc_mean')],.8);assert.ok(Math.abs(row[final.header.indexOf('roc_auc_sd')] - Math.sqrt(.02))<1e-12);
  assert.equal(row[final.header.indexOf('split')],'');assert.equal(row[final.header.indexOf('accuracy_mean')],'');
  assert.match(final.markdown,/0.8000 ± 0.1414/);assert.ok(after.tables.find(t=>t.tableKey==='review/PAD/final').markdown.startsWith('> 待复核结果'));
  assert.equal((await f.catalog()).unassignedPlans.length,0);
  await assert.rejects(exportsApi.mapLatestResultDatasets(f.root,'artifacts/results',{[b.planFile]:'BUS'}),/不能通过人工映射覆盖/);
  assert.deepEqual(f.snapshot(),after);
});

test('a Plan with any trusted dataset is excluded from manual mapping and dataset directory collisions reject before publishing',async()=>{
  const f=scenario(),p=f.addPlan(undefined,{seeds:[42],cases:['known','blank']});
  f.put(p,0,{dataset:'known'});f.put(p,1,{dataset:''});await f.update();
  assert.equal((await f.catalog()).unassignedPlans.length,0);
  const a=f.addPlan('experiments/plans/a.yaml',{seeds:[42]}),b=f.addPlan('experiments/plans/b.yaml',{seeds:[42]});
  f.put(a,0,{dataset:''});f.put(b,0,{dataset:'A B'});await f.update();const before=f.snapshot();
  await assert.rejects(exportsApi.mapLatestResultDatasets(f.root,'artifacts/results',{[a.planFile]:'A_B'}),/同一目录/);
  assert.deepEqual(f.snapshot(),before);
  savedRules={};const h=Object.assign(Object.create(RealtimeTunnelPanelProvider.prototype),f.host);
  await assert.rejects(h.applyPlanDatasetMappingFromUi({mappings:{[a.planFile]:'A_B'}}),/同一目录/);
  assert.deepEqual(savedRules,{},'a rejected dataset collision must not persist a conflicting mapping');
  assert.deepEqual(f.snapshot(),before);
});

test('result catalog stays within dataset, plan, table and artifact response limits at stress scale', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dataset-catalog-stress-'));
  // Preserve the private stress fixture as audit evidence.
  const resultRoot = path.join(root, 'experiments/results/benchmark/plans');
  const registryPlans = {};
  for (let plan = 0; plan < 100; plan++) {
    const planFile = `experiments/plans/benchmark/plan-${String(plan).padStart(3, '0')}.yaml`;
    const raw = path.join(resultRoot, tables.planDirectoryKey(planFile), 'raw');
    registryPlans[planFile] = { revision: 'fixture', expectedSeeds: 1, records: [] };
    fs.mkdirSync(raw, { recursive: true });
    for (let artifact = 0; artifact < 20; artifact++) fs.writeFileSync(path.join(raw, `metric-${String(artifact).padStart(2, '0')}.json`), '{"v":1}', 'utf8');
  }
  const registryPath = path.join(root, 'simple_cluster/results/project_table_registry.json');
  fs.mkdirSync(path.dirname(registryPath), { recursive: true });
  fs.writeFileSync(registryPath, JSON.stringify({ schemaVersion: 1, plans: registryPlans }), 'utf8');
  const catalog = tables.resultCatalog(root, 'experiments/results');
  const plans = catalog.datasets.flatMap(dataset => dataset.plans || []);
  const artifacts = plans.flatMap(plan => plan.artifacts || []);
  assert.ok(catalog.datasets.length <= catalog.catalogLimits.datasets);
  assert.ok(plans.length <= catalog.catalogLimits.plans);
  assert.ok(artifacts.length <= catalog.catalogLimits.artifacts);
  assert.equal(plans.length, 100);
  assert.equal(artifacts.length, 2000);
});


test('legacy artifact CSV metadata repairs an unmatched Plan key and keeps multi-dataset Plans out of unresolved', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dataset-artifact-metadata-'));
  const planFile = 'experiments/plans/comparison/corim.yaml';
  const registry = tables.emptyTableRegistry();
  registry.plans[planFile] = {revision: 'r1', expectedSeeds: 1, records: ['BUS', 'PAD'].map(dataset => ({planFile, workerId: 'w1', case: 'same', seed: '1', method: 'corim', dataset, rate: '', endpoint: 'clean', metrics: {accuracy: .8}}))};
  fs.mkdirSync(path.join(root, 'simple_cluster/results'), {recursive: true});
  fs.writeFileSync(path.join(root, 'simple_cluster/results/project_table_registry.json'), JSON.stringify(registry), 'utf8');
  const oldFile = path.join(root, 'experiments/results/_shared/plans/old-plan-hash/detail/w1/project_seed_mean_std.csv');
  fs.mkdirSync(path.dirname(oldFile), {recursive: true});
  fs.writeFileSync(oldFile, 'plan_file,dataset\n' + planFile + ',BUS\n' + planFile + ',PAD\n', 'utf8');
  const catalog = tables.resultCatalog(root, 'experiments/results');
  assert.equal(catalog.unassignedPlans.length, 0);
  assert.equal(catalog.multiDatasetPlans.length, 1);
  const shared = catalog.datasets.find(row => row.datasetKey === '_shared');
  assert.equal(shared.plans[0].planFile, planFile);
  assert.deepEqual(shared.plans[0].datasets, ['BUS', 'PAD']);
  assert.equal(shared.plans[0].artifacts.length, 1);
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
