const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
require('../_helpers/registerTsRequire');
const { cleanupRelative } = require('../../src/features/PlanCleanup.ts');

function guide(inputs) {
  const source = fs.readFileSync(path.resolve(__dirname, '../../src/extension/legacy.ts'), 'utf8');
  const tree = ts.createSourceFile('legacy.ts', source, ts.ScriptTarget.Latest, true);
  let method;
  function visit(node) { if (ts.isMethodDeclaration(node) && node.name.getText(tree) === 'generatePlanGuideFromUi') method = node; ts.forEachChild(node, visit); }
  visit(tree); assert.ok(method);
  const compiled = ts.transpileModule('class Subject {' + method.getText(tree) + '}', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const root = path.resolve('fixture-project'), writes = [], prompts = [], opened = [];
  class Cancelled extends Error {}
  const fn = new Function('path', 'fs', 'planDirSafe', 'nextAvailableFile', 'safePlanToken', 'inputRequired', 'UiCommandCancelled',
    'cleanupRelative', 'atomicWriteText', 'errorMessage', 'openWorkspaceFile', compiled + '; return Subject.prototype.generatePlanGuideFromUi;')(
    path, { mkdir: async () => {} }, () => 'experiments/plans', async dir => path.join(dir, 'guided_plan.yaml'),
    value => value, async title => { prompts.push(title); return inputs.shift(); }, Cancelled, cleanupRelative,
    async (file, text, options) => { await options.beforeRename(); writes.push({ file, text, noReplace: options.noReplace }); },
    String, async file => opened.push(file));
  const host = { captureProjectContext: () => ({ root }), projectContextIsCurrent: () => true,
    refreshLocalPlanMetadata: async () => {}, refreshExperimentTracesProjectionForCurrentInterest() {},
    persistProjectPlanSelectionState: async () => {}, postState() {} };
  return { fn, host, writes, prompts, opened, root };
}

test('guided PLAN stores the actual command and independent output without research requirements', async () => {
  const f = guide(['实验 A', 'python run.py --choice "one"', 'work_dirs/run-a']);
  await f.fn.call(f.host);
  assert.deepEqual(f.prompts, ['实验名称', '实际执行命令', '独立输出目录']);
  assert.equal(f.writes.length, 1);
  const lines = f.writes[0].text.split('\n');
  const field = name => JSON.parse(lines.find(line => line.startsWith(name + ': ')).slice(name.length + 2));
  assert.equal(field('plan_id'), 'guided_plan');
  assert.equal(field('name'), '实验 A');
  assert.equal(field('command'), 'python run.py --choice "one"');
  assert.equal(field('output_dir'), 'work_dirs/run-a');
  assert.doesNotMatch(f.writes[0].text, /train_test|result_csv|checkpoint|base_config/);
  assert.equal(f.writes[0].noReplace, true);
  assert.equal(f.host.selectedPlanId, 'experiments/plans/guided_plan.yaml');
  assert.deepEqual(f.opened, ['experiments/plans/guided_plan.yaml']);
});

test('cancelled command or unsafe output creates no PLAN', async () => {
  const cancelled = guide(['A', undefined]);
  await assert.rejects(cancelled.fn.call(cancelled.host), /取消/);
  assert.equal(cancelled.writes.length, 0);
  const unsafe = guide(['A', 'python run.py', '../other']);
  await assert.rejects(unsafe.fn.call(unsafe.host), /UNSAFE_PATH/);
  assert.equal(unsafe.writes.length, 0);
});

test('changing projects during the command prompt does not write to the original project', async () => {
  const f = guide(['A', 'python run.py', 'work_dirs/run-a']);
  let checks = 0;
  f.host.projectContextIsCurrent = () => ++checks < 4;
  await f.fn.call(f.host);
  assert.equal(f.writes.length, 0);
});
