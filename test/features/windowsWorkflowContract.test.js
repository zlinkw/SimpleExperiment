const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const ts = require('typescript');
const binding = require('../../dist/features/WorkflowWorkspaceBinding');
function hostFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'Win workflow host-')), other = path.join(root, 'other'); fs.mkdirSync(other);
  const source = fs.readFileSync(path.join(__dirname, '../../src/extension/legacy.ts'), 'utf8'), ast = ts.createSourceFile('legacy.ts', source, ts.ScriptTarget.Latest, true);
  const cls = ast.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === 'RealtimeTunnelPanelProvider');
  const method = ['apiWorkflowRun', 'apiWorkflowPlan', 'runApiWorkflowOperation', 'runSubmissionEvidence', 'waitForRunSubmissionEvidence']
    .map(name => cls.members.find(n => n.name?.getText(ast) === name).getText(ast)).join('\n');
  const state = { root, routeSwitch: false, activeSwitch: false, active: false }, calls = [];
  class LocalApiError extends Error { constructor() { super('active'); this.apiData = { blocker: { code: 'ACTIVE_PLAN_RUN_EXISTS' } }; } }
  const Provider = vm.runInNewContext(ts.transpileModule('class Provider {' + method + '}; Provider;', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText,
    { WorkflowBinding: binding, workspaceRoot: () => state.root, makeOpId: () => 'workflow-op', LocalApiError,
      assertSingleProjectWorkspace: () => {}, simpleSftpIntegrationReadiness: () => ({ ready: true }),
      uniqueStrings: values => [...new Set(values)], stringArrayField: (value, key) => value[key] || [],
      operationResultPlanFile: row => row.planFile, samePlanSelection: (a, b) => a === b,
      errorMessage: error => error.message, resultStatus: row => row?.status, isUiCommandRemotePending: () => false, isUiCommandCancelled: () => false,
      ApiWorkflow_1: { selectWorkflowPlan: plans => ({ plan: plans[0], count: plans.length, total: plans.length, needsChoice: false }),
        structuredMissingInventory: () => [], buildWorkflowRoute: () => state.workflowRoute } });
  const p = new Provider(); p.localOperations = {}; p.markLocalOperationsDirty = () => calls.push('dirty'); p.postState = () => calls.push('post');
  p.apiWorkflowPlan = async () => { if (state.routeSwitch) state.root = other; return { ready: true, plan: { planFile: 'a.yaml' }, calls: [{ params: { planFile: 'a.yaml', workspace: root } }] }; };
  p.assertPlanNotAlreadyActive = async () => { if (state.activeSwitch) state.root = other; if (state.active) throw new LocalApiError(); };
  p.runApiWorkflowOperation = async (_id, _route, owner) => { calls.push('operation'); assert.equal(owner.root, root); };
  return { p, state, root, other, calls, proto: Provider.prototype, ast, source };
}
test('actual Host API refuses mismatched/switched workspace and active PLAN before creating an orphan operation', async () => {
  const a = hostFixture(); await assert.rejects(a.p.apiWorkflowRun({ workspace: a.other }), /当前/); assert.deepEqual(a.calls, []);
  for (const mode of ['routeSwitch', 'activeSwitch']) { const f = hostFixture(); f.state[mode] = true; await assert.rejects(f.p.apiWorkflowRun({}), /变化/); assert.deepEqual(Object.keys(f.p.localOperations), []); }
  const f = hostFixture(); f.state.active = true; const out = await f.p.apiWorkflowRun({}); assert.equal(out.started, false); assert.deepEqual(Object.keys(f.p.localOperations), []);
});

test('ready workflow preflight has no blocker and blocked preflight retains its actual reason', async () => {
  const f = hostFixture(), p = f.p;
  Object.assign(p, { apiWorkflowPlan: f.proto.apiWorkflowPlan, projectContextGeneration: 1, localPlanMetadata: { plans: [{ planFile: 'a.yaml' }] },
    reconcileStalePlanRunOperations: async () => {}, refreshLocalPlanMetadata: async () => {}, projectTopologyAssessment: () => ({}), setupConfig: {},
    apiPlanValidate: async () => ({ missing: [] }), apiPublicTopology: value => value, longRunningPlanRunOperations: () => [],
    buildPlanRuntimeEvidenceState: () => ({ schedulerStates: [], operations: {} }) });
  f.state.workflowRoute = { ready: true, phase: 'run', nextAction: 'workflow.run', missing: [] };
  assert.equal((await p.apiWorkflowPlan({})).blocker, null);
  f.state.workflowRoute = { ready: false, phase: 'validate_plan', nextAction: 'plan.validate', missing: [{ reason: 'invalid plan' }] };
  assert.equal((await p.apiWorkflowPlan({})).blocker.code, 'VALIDATION_REQUIRED');
});

test('workflow request finishes against its current same-project records and the exact child request', async () => {
  for (const mode of ['same-project', 'workspace-changed', 'generation-changed', 'cleared']) {
    const f = hostFixture(), p = f.p, id = 'workflow-request', childId = 'plan-submit-' + id;
    p.projectContextGeneration = 1;
    p.localOperations[id] = { operationId: id, type: 'workflow-run', status: 'running', planFile: 'a.yaml', submissionOperationId: childId };
    p.runSubmissionEvidence = f.proto.runSubmissionEvidence;
    p.waitForRunSubmissionEvidence = async options => { f.calls.push(options); return null; };
    p.runActionCommand = async () => {
      p.localOperations = { ...p.localOperations, [childId]: { operationId: childId, type: 'run-plan', status: 'succeeded', localSubmissionProgress: true, planFile: 'a.yaml' },
        unrelated: { operationId: 'unrelated', type: 'run-plan', status: 'running', planFile: 'other.yaml' } };
      if (mode === 'workspace-changed') { f.state.root = f.other; p.localOperations = { 'other-project': { status: 'running' } }; }
      if (mode === 'generation-changed') { p.projectContextGeneration++; p.localOperations = { 'other-generation': { status: 'running' } }; }
      if (mode === 'cleared') delete p.localOperations[id];
    };
    await f.proto.runApiWorkflowOperation.call(p, id, { calls: [{ params: {} }] }, binding.bindWorkflowWorkspace(f.root, f.root));
    if (mode === 'same-project') {
      assert.equal(p.localOperations[id].status, 'succeeded');
      assert.equal(p.localOperations[id].submissionOperationId, childId);
      assert.equal(p.localOperations[id].receiptProvesExperimentCompletion, false);
    } else assert.equal(p.localOperations[id], undefined, 'stale or explicitly cleared requests must not be recreated');
  }
});

test('operation merge settles only the exact completed local child without presenting an experiment completion', () => {
  const f = hostFixture(), node = f.ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'mergeOperationRecords');
  const merge = vm.runInNewContext(ts.transpileModule(node.getText(f.ast) + '; mergeOperationRecords;', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText,
    { RunOperations_1: { mergeReconciledRunOperation: (old, next) => ({ ...old, ...next }) }, operationTerminal: row => ['completed', 'succeeded', 'failed', 'cancelled'].includes(row?.status) });
  for (const status of ['succeeded', 'failed', 'cancelled']) {
    const records = { parent: { operationId: 'parent', type: 'workflow-run', status: 'running', planFile: 'a.yaml', submissionOperationId: 'plan-submit-parent' },
      'plan-submit-parent': { operationId: 'plan-submit-parent', type: 'run-plan', localSubmissionProgress: true, status, planFile: 'a.yaml', finishedAt: '2026-11-11T00:00:00Z' } };
    const merged = merge(records);
    assert.equal(merged.parent.status, status);
    assert.equal(merged.parent.localSubmissionProgress, true);
    assert.equal(merged.parent.receiptProvesExperimentCompletion, false);
    assert.equal(records.parent.status, 'running');
    records['plan-submit-parent'].planFile = 'different.yaml';
    assert.equal(merge(records).parent.status, 'running');
  }
});
