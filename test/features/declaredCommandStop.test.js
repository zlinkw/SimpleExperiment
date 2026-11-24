const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript');

test('stopping a task records user stop without scientific judgments', async () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../../src/extension/legacy.ts'), 'utf8');
  const tree = ts.createSourceFile('legacy.ts', source, ts.ScriptTarget.Latest, true);
  let method;
  function visit(node) {
    if (ts.isMethodDeclaration(node) && node.name.getText(tree) === 'ensureManualStopReason') method = node;
    ts.forEachChild(node, visit);
  }
  visit(tree);
  assert.ok(method);
  const code = ts.transpileModule('class Subject {' + method.getText(tree) + '}', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const stop = new Function(code + '; return Subject.prototype.ensureManualStopReason;')();
  const body = { manualStopType: 'manual_stop_converged', options: { retained: true } };
  await stop('stopExperiment', body, {});
  assert.equal(body.stopReason, 'scheduler_aborted');
  assert.equal(body.manualStopType, 'scheduler_aborted');
  assert.deepEqual(body.options, { retained: true, manualStopType: 'scheduler_aborted', stopReason: 'scheduler_aborted', stopSource: 'user' });
  const other = {};
  await stop('runPlan', other, {});
  assert.deepEqual(other, {});
});
