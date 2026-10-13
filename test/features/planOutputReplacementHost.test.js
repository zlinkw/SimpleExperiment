const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
require('../_helpers/registerTsRequire');
const {replacementLifecycleJob} = require('../../src/features/PlanOutputReplacement.ts');
const source = fs.readFileSync(path.join(__dirname, '../../src/extension/legacy.ts'), 'utf8');
function fixture(choice, verified = true) {
  const start = source.indexOf('    async confirmDeclaredPlanOutputs('), end = source.indexOf('    async confirmPlanRunSubmission(', start);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'replace-host-')), calls = [];
  const job = { index: 0, case: 'a', seed: 42, outputDir: 'work/a', collectionResultCsv: 'tmp/result/a.csv', status: 'completed', workerId: 'w', commandId: 'c' };
  const plan = { id: 'run', revision: 'revision', codeFingerprint: 'code', planFile: 'experiments/plans/p.yaml', jobs: [job] };
  const host = { projectContextGeneration: 1, lastCodeSyncState: { fingerprint: 'code' }, loadDistributedQueue: async () => ({ plans: [plan] }),
    apiTaskPreflight: async body => { calls.push(body); return {}; }, waitForOperationTerminalResult: async () => ({ payload: { report: { completed: verified } } }) };
  const sandbox = { workspaceRoot: () => root, WorkflowBinding: { bindWorkflowWorkspace() { return {}; }, assertWorkflowContext() {}, assertWorkflowWorkspace() {} },
    AbortController, isUiCommandRemotePending: () => false,
    operationResultPlanFile: body => body.planFile, normalizePlanSelectionKey: x => x, assertRetryRequestCurrent() {},
    vscode: { window: { showWarningMessage: async () => choice } }, UiCommandCancelled: Error };
  const method = vm.runInNewContext('({' + source.slice(start, end) + '}).confirmDeclaredPlanOutputs', sandbox);
  const body = { workspace: root, planFile: plan.planFile, planRevision: 'revision', overwrite: true, options: { overwriteExisting: true } };
  const validation = { existing: [{ index: 0 }], jobs: [
    { index: 0, case: 'a', seed: 42, output_dir: 'work/a', result_csv: 'tmp/result/a.csv' },
    { index: 1, case: 'b', seed: 42, output_dir: 'work/b', result_csv: 'tmp/result/b.csv' }] };
  return { calls, body, host, run: () => method.call(host, {}, body, validation) };
}
test('Windows dialog cancel and keep do not preflight, delete or request a new job', async () => {
  for (const choice of ['取消', undefined, '保留已有产物，不运行']) {
    const f = fixture(choice);
    if (choice === '保留已有产物，不运行') { await f.run(); assert.equal(f.body.existingOutputChoice, 'keep_existing'); }
    else await assert.rejects(f.run(), /未删除/);
    assert.equal(f.calls.length, 0); assert.equal(f.body.overwrite, false); assert.equal(f.body.options.overwriteExisting, false);
  }
});
test('missing-only checks actual completed Worker hashes and forwards only remaining indices to all Scheduler routes', async () => {
  const f = fixture('仅补跑缺失任务'); await f.run();
  assert.equal(f.calls[0].completedOutputVerify, true);
  assert.deepEqual(Array.from(f.body.distributedSkipJobIndices), [0]); assert.deepEqual(Array.from(f.body.assignedExperimentIndices), [1]);
  const bad = fixture('仅补跑缺失任务', false); await assert.rejects(bad.run(), /未被核实/);
  const stale = fixture('仅补跑缺失任务'); stale.body.planRevision = 'new'; await assert.rejects(stale.run(), /未被核实/); assert.equal(stale.calls.length, 0);
});
test('replacement fence persists before deletion and prevents re-mirroring after partial failure', async () => {
  const text = fs.readFileSync(path.join(__dirname, '../../src/extension/PlanCleanupHost.ts'), 'utf8');
  const method = text.slice(text.indexOf('  async execute(id: string)'), text.indexOf('  open(file: string')).replace('id: string', 'id').replace('(plan: any)', '(plan)').replace('(job: any)', '(job)');
  const Host = vm.runInNewContext('class Host {' + method + '} Host', { replacementLifecycleJob, cleanupError: code => { throw Error(code); } });
  const queue = { plans: [{ id: 'run', jobs: [{ index: 0, commandId: 'c', status: 'completed' }, { index: 1, commandId: 'other', status: 'completed' }] }] };
  let saved;
  const instance = new Host(); instance.root = 'fixture'; instance.drainReconnects = async () => {};
  instance.host = { loadDistributedQueue: async () => structuredClone(queue), saveDistributedQueue: async (_, data) => { saved = structuredClone(data); },
    withHostOperationLease: async (_, __, work) => work() };
  instance.service = { status: async () => ({ preview: { scope: { job: { purpose: 'replace_outputs', workflowId: 'run', index: 0, commandId: 'c' }, nodes: [{ id: 'w' }] } } }),
    history: async () => [], preflightConfirmed: async () => {}, execute: async () => { assert.ok(saved.plans[0].jobs[0].outputRetiredAt); throw Error('NETWORK_DISCONNECT'); } };
  await assert.rejects(instance.execute('op'), /NETWORK_DISCONNECT/);
  assert.equal(saved.plans[0].jobs[0].cleanup.operationId, 'op'); assert.equal(saved.plans[0].jobs[0].cleanup.state, 'partial');
  assert.deepEqual(saved.plans[0].jobs[1], queue.plans[0].jobs[1]); assert.equal(instance.executing, false);
});
