const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const vm = require('node:vm');
const ts = require('typescript');
const { requestWorkflowRun } = require('../../dist/cli/WorkflowRun');
const binding = require('../../dist/features/WorkflowWorkspaceBinding');
async function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'Win PLAN 中文 ')), other = path.join(root, 'other'); fs.mkdirSync(other);
  const planFile = 'experiments/plans/计划 A.yaml'; fs.mkdirSync(path.dirname(path.join(root, planFile)), { recursive: true }); fs.writeFileSync(path.join(root, planFile), 'name: fixture\n', 'utf8');
  const calls = [], state = { workspace: root, blocked: false, wrongPlan: false, switch: false, runBlocked: false };
  const server = http.createServer((req, res) => {
    if (req.url === '/api/v1/capabilities') { res.end(JSON.stringify({ schemaVersion: 1, rpc: 'json-rpc-2.0', methods: ['status', 'workflow.plan', 'workflow.run'],
      methodOptions: { 'workflow.plan': { workspaceIdentityRechecked: true }, 'workflow.run': { workspaceIdentityRechecked: true } } })); return; }
    const chunks = []; req.on('data', c => chunks.push(c)); req.on('end', () => {
      const body = JSON.parse(Buffer.concat(chunks)); calls.push(body); let result;
      if (body.method === 'status') result = { workspace: state.workspace };
      if (body.method === 'workflow.plan') { result = { ok: !state.blocked, ready: !state.blocked, plan: { planFile: state.wrongPlan ? 'wrong.yaml' : planFile }, nextAction: 'server.testAll' }; if (state.switch) state.workspace = other; }
      if (body.method === 'workflow.run') result = state.runBlocked ? { ok: false, started: false } : { ok: true, started: true, operationId: 'mock-op', status: 'waiting_confirmation', confirmation: 'vscode_modal' };
      res.end(JSON.stringify({ jsonrpc: '2.0', id: body.id, result }));
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const file = path.join(root, 'api.json'); fs.writeFileSync(file, JSON.stringify({ baseUrl: 'http://127.0.0.1:' + server.address().port, token: 'fixture' }), 'utf8');
  const previous = process.env.SIMPLE_EXPERIMENT_API_FILE; process.env.SIMPLE_EXPERIMENT_API_FILE = file;
  t.after(() => { if (previous === undefined) delete process.env.SIMPLE_EXPERIMENT_API_FILE; else process.env.SIMPLE_EXPERIMENT_API_FILE = previous; server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
  return { root, other, planFile, calls, state };
}
test('compiled Windows CLI verifies the actual workspace and accurately reports a request awaiting approval', async t => {
  const f = await fixture(t), out = await requestWorkflowRun(f.root, f.planFile, {});
  assert.equal(out.code, 0); assert.equal(out.payload.requested, true); assert.equal(out.payload.submitted, false); assert.equal(out.payload.confirmation, 'vscode_modal');
  assert.deepEqual(f.calls.map(c => c.method), ['status', 'workflow.plan', 'status', 'workflow.run']);
  assert.equal(f.calls.at(-1).params.workspace, fs.realpathSync.native(f.root));
});
test('wrong workspace/PLAN, changed workspace, blocked route and seed override cannot request a run', async t => {
  const f = await fixture(t);
  f.state.workspace = f.other; await assert.rejects(requestWorkflowRun(f.root, f.planFile, {}), /differs/); assert.equal(f.calls.length, 1);
  f.state.workspace = f.root; f.state.wrongPlan = true; await assert.rejects(requestWorkflowRun(f.root, f.planFile, {}), /different Plan/);
  f.state.wrongPlan = false; f.state.switch = true; await assert.rejects(requestWorkflowRun(f.root, f.planFile, {}), /differs/);
  f.state.switch = false; f.state.workspace = f.root; f.state.blocked = true; assert.equal((await requestWorkflowRun(f.root, f.planFile, {})).code, 3);
  await assert.rejects(requestWorkflowRun(f.root, f.planFile, { seed: '42' }), /seed/);
  assert.ok(!f.calls.some(c => c.method === 'workflow.run'));
});
test('dry-run/check are read-only route checks; blocked run never reports submitted', async t => {
  const f = await fixture(t); await requestWorkflowRun(f.root, f.planFile, { dryRun: true }); await requestWorkflowRun(f.root, f.planFile, { check: true });
  assert.ok(!f.calls.some(c => c.method === 'workflow.run'));
  f.state.runBlocked = true; const out = await requestWorkflowRun(f.root, f.planFile, {}); assert.equal(out.code, 3); assert.equal(out.payload.requested, false); assert.equal(out.payload.submitted, false);
});
function hostFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'Win workflow host-')), other = path.join(root, 'other'); fs.mkdirSync(other);
  const source = fs.readFileSync(path.join(__dirname, '../../src/extension/legacy.ts'), 'utf8'), ast = ts.createSourceFile('legacy.ts', source, ts.ScriptTarget.Latest, true);
  const cls = ast.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === 'RealtimeTunnelPanelProvider');
  const method = cls.members.find(n => n.name?.getText(ast) === 'apiWorkflowRun').getText(ast);
  const state = { root, routeSwitch: false, activeSwitch: false, active: false }, calls = [];
  class LocalApiError extends Error { constructor() { super('active'); this.apiData = { blocker: { code: 'ACTIVE_PLAN_RUN_EXISTS' } }; } }
  const Provider = vm.runInNewContext(ts.transpileModule('class Provider {' + method + '}; Provider;', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText,
    { WorkflowBinding: binding, workspaceRoot: () => state.root, makeOpId: () => 'workflow-op', LocalApiError });
  const p = new Provider(); p.localOperations = {}; p.markLocalOperationsDirty = () => calls.push('dirty'); p.postState = () => calls.push('post');
  p.apiWorkflowPlan = async () => { if (state.routeSwitch) state.root = other; return { ready: true, plan: { planFile: 'a.yaml' }, calls: [{ params: { planFile: 'a.yaml', workspace: root } }] }; };
  p.assertPlanNotAlreadyActive = async () => { if (state.activeSwitch) state.root = other; if (state.active) throw new LocalApiError(); };
  p.runApiWorkflowOperation = async (_id, _route, owner) => { calls.push('operation'); assert.equal(owner.root, root); };
  return { p, state, root, other, calls };
}
test('actual Host API refuses mismatched/switched workspace and active PLAN before creating an orphan operation', async () => {
  const a = hostFixture(); await assert.rejects(a.p.apiWorkflowRun({ workspace: a.other }), /当前/); assert.deepEqual(a.calls, []);
  for (const mode of ['routeSwitch', 'activeSwitch']) { const f = hostFixture(); f.state[mode] = true; await assert.rejects(f.p.apiWorkflowRun({}), /变化/); assert.deepEqual(Object.keys(f.p.localOperations), []); }
  const f = hostFixture(); f.state.active = true; const out = await f.p.apiWorkflowRun({}); assert.equal(out.started, false); assert.deepEqual(Object.keys(f.p.localOperations), []);
});
