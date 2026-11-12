const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const {spawnSync} = require('node:child_process');

test('dataset inspection distinguishes absent and empty data from checked samples', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'se-dataset-completeness-'));
  const root = path.join(temp, 'project'), script = path.join(temp, 'check.py');
  fs.mkdirSync(path.join(root, 'datasets'), {recursive:true});
  fs.writeFileSync(path.join(root, 'datasets', 'empty.csv'), 'case_id,patient_id,split,label\n', 'utf8');
  fs.writeFileSync(path.join(root, 'datasets', 'valid.csv'), 'case_id,patient_id,split,label\na,p1,train,0\nb,p2,test,1\n', 'utf8');
  fs.writeFileSync(path.join(root, 'datasets', 'overlap.csv'), 'case_id,patient_id,split,label\na,p1,train,0\nb,p1,test,1\n', 'utf8');
  fs.writeFileSync(script, [
    'import sys, json, os',
    `sys.path.insert(0, ${JSON.stringify(path.resolve(__dirname, '../_helpers'))})`,
    'from extractRuntimeFunctions import extract_runtime_functions',
    `agent = extract_runtime_functions(${JSON.stringify(path.resolve(__dirname, '../../dist/runtime/cluster_agent.py'))}, ['inspect_dataset_action'])`,
    `root = ${JSON.stringify(root)}`,
    "reports = {name: agent.inspect_dataset_action(root, {'selectedFiles':['datasets/' + name + '.csv']}) for name in ['missing','empty','valid','overlap']}",
    'print(json.dumps(reports))',
  ].join('\n'), 'utf8');
  const result = spawnSync(process.env.PYTHON || 'python', ['-X','utf8','-B',script], {encoding:'utf8',timeout:10000,windowsHide:true});
  assert.equal(result.status,0,result.stderr || result.stdout);
  const reports = JSON.parse(result.stdout.trim());
  for(const name of ['missing','empty']) {
    assert.equal(reports[name].totalRows,0);
    assert.equal(reports[name].leakage.status,'not_checked');
    assert.equal(reports[name].leakage.checked,false);
  }
  assert.equal(reports.valid.totalRows,2);
  assert.equal(reports.valid.leakage.status,'ok');
  assert.equal(reports.valid.leakage.checked,true);
  assert.equal(reports.overlap.leakage.status,'failed');
  assert.ok(reports.overlap.leakage.issues.some(row=>row.type==='patient_overlap'));
});
