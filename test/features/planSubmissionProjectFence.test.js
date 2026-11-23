const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../../src/extension/legacy.ts'), 'utf8');
const from = source.indexOf('    async resumePlanSubmission(');
const to = source.indexOf('    async confirmPlanRunSubmission(', from);
assert.ok(from >= 0 && to > from);
function fixture(changeAt) {
  let current = true, writes = 0, aborts = 0, releases = 0;
  class Store {
    async load() { if (changeAt === 'load') current = false; return { input: { planFile: 'p.yaml' }, recovery: {} }; }
    async save(_body, options) { if (changeAt === 'publish') current = false; options.assertCurrent(); writes++; }
  }
  class Cancelled extends Error {}
  const box = { PlanRunHost: Store, UiCommandCancelled: Cancelled, releaseRetentionClaim: async root => { assert.equal(root, 'project-a'); releases++; } };
  vm.createContext(box);
  vm.runInContext(ts.transpileModule(`class Host { ${source.slice(from, to)} } this.Host = Host`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, box);
  const host = new box.Host();
  Object.assign(host, { captureProjectContext: () => ({ root: 'project-a' }), projectContextIsCurrent: () => current,
    localOperations: {}, resumedSubmissions: new Set(), distributedSubmissionAborts: new Map([['plan-submit-id', { abort: () => aborts++ }]]),
    runConfirmation: { cancel() {} }, finishPlanSubmissionProgress() {} });
  return { host, get writes() { return writes; }, get aborts() { return aborts; }, get releases() { return releases; } };
}
test('project change during load or publication prevents new cancellation effects', async () => {
  for (const point of ['load', 'publish']) {
    const f = fixture(point);
    await assert.rejects(f.host.cancelPlanRunSubmission('plan-submit-id'), /项目已切换/);
    assert.equal(f.writes, 0); assert.equal(f.aborts, 0); assert.equal(f.releases, 0);
  }
  const f = fixture('load');
  await assert.rejects(f.host.resumePlanSubmission('plan-submit-id'), /项目已切换/);
});
test('same-project cancellation retains its original release target', async () => {
  const f = fixture();
  assert.equal((await f.host.cancelPlanRunSubmission('plan-submit-id')).status, 'cancelled');
  assert.equal(f.writes, 1); assert.equal(f.aborts, 1); assert.equal(f.releases, 1);
});
test('the real receipt writer checks the project immediately before publication', async () => {
  const file = fs.readFileSync(path.join(__dirname, '../../src/extension/PlanRunHost.ts'), 'utf8');
  let current = true, published = 0;
  const fakeRequire = name => {
    if (name === '../state/StateStore') return { atomicWriteText: async (_file, _data, options) => { current = false; await options.beforeRename(); published++; } };
    if (name === '../features/PlanCleanup') return { cleanupRelative: value => value, cleanupDigest: () => 'digest' };
    if (name === '../features/ProjectStatePaths') return { projectStateDir: () => 'fake' };
    if (name.startsWith('node:')) return require(name);
    return {};
  };
  const box = { exports: {}, require: fakeRequire };
  vm.runInNewContext(ts.transpileModule(file, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, box);
  const store = new box.exports.PlanRunHost({}, 'project-a');
  await assert.rejects(store.save({ submissionOperationIdLocal: 'id', planFile: 'p.yaml' },
    { assertCurrent: () => { if (!current) throw Error('project changed'); } }), /project changed/);
  assert.equal(published, 0);
});
