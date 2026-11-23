const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
require('../_helpers/registerTsRequire');
const { ProjectGateway } = require('../../src/mcp/ProjectGateway.ts');
const { createProjectAuthorization } = require('../../src/mcp/ProjectAuthorization.ts');
const { mcpInvocation } = require('../../src/mcp/Invocation.ts');
const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'src/extension/legacy.ts'), 'utf8');
const ast = ts.createSourceFile('legacy.ts', source, ts.ScriptTarget.Latest, true);
const cls = ast.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === 'RealtimeTunnelPanelProvider');
const member = cls.members.find(n => n.name?.getText(ast) === 'apiTaskPreflight').getText(ast);
const code = ts.transpileModule('class Provider {' + member + '}; Provider;', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

function fixture() {
  const state = { root };
  const Provider = vm.runInNewContext(code, { workspaceRoot: () => state.root, makeOpId: () => 'formal-preflight-op-1', mcpInvocation,
    stringField: (params, key) => String(params[key] || ''), DistributedPlanQueue: { canonicalProjectId: () => 'project' } });
  const row = { workerId: 'worker', projectId: 'project', commandId: 'cmd-7', status: 'failed', neverStarted: true, neverStartedEvidence: 'formal_preflight_rejected' };
  const posts = [], reads = [], host = new Provider(), signal = new AbortController().signal;
  host.client = { postWorkerAction: async (...args) => { posts.push(args); return { operationId: 'formal-preflight-op-1', status: 'submitted' }; },
    getWorkerOperation: async (...args) => { reads.push(args); return { payload: { action: 'preflight-worker-task' }, status: 'running' }; } };
  host.workerActionTargets = () => [{ id: 'worker' }];
  host.refreshDistributedResultSyncProbes = async () => {};
  host.missingWorkerActionCapabilities = () => [];
  host.lastWorkerProbes = { worker: { capabilities: { endpoints: { executionShellPreflight: 1, taskShellEnvironment: 1 } } } };
  host.readWorkerTaskSnapshot = async () => ({ tasks: [row] });
  const worker = { id: 'worker', host: 'fake', port: 22, user: 'fake', projectRoot: '/fake' };
  const grant = createProjectAuthorization(root); grant.workers = [worker];
  const methods = Object.fromEntries([['tasks.preflight','start'], ['tasks.preflight.status','status'], ['tasks.preflight.cancel','cancel']]
    .map(([method, action]) => [method, params => host.apiTaskPreflight(params, action, signal)]));
  return { gateway: new ProjectGateway({ root: () => state.root, workers: () => [worker], store: { get: () => grant }, methods: () => methods }), posts, reads, host, row, state, worker, grant };
}

test('MCP preflight preserves exact task identity and existing capability refusals', async () => {
  const f = fixture();
  await assert.rejects(f.gateway.call('task_preflight', { commandId: 'cmd-7' }), /workerId is required/);
  await assert.rejects(f.gateway.call('task_preflight', { workerId: 'worker' }), /commandId is required/);
  await assert.rejects(f.gateway.call('task_preflight', { workerId: 'worker', commandId: 'cmd-7', environmentOnly: 'true' }), /must be boolean/);
  assert.equal(f.posts.length, 0);
  const receipt = await f.gateway.call('task_preflight', { workerId: 'worker', commandId: 'cmd-7' });
  assert.equal(receipt.status, 'submitted');
  assert.equal(f.posts[0][1], 'preflight-worker-task');
  assert.equal(f.posts[0][2].targetCommandId, 'cmd-7');
  assert.equal(f.posts[0][2].expectedIdentity, f.row);
  await f.gateway.call('task_preflight', { workerId: 'worker', commandId: 'cmd-7', environmentOnly: true });
  assert.equal(f.posts[1][2].environmentOnly, true);
  await assert.rejects(f.gateway.call('task_preflight', { workerId: 'worker', commandId: 'cmd-7', completedOutputVerify: true }), /completedOutputPreflight/);
  f.row.neverStarted = false;
  await assert.rejects(f.gateway.call('task_preflight', { workerId: 'worker', commandId: 'cmd-7' }), /REQUIRES_NEVER_STARTED/);
  assert.equal(f.posts.length, 2);
});

test('MCP preflight cancellation rechecks project, grant and worker after the operation lookup', async () => {
  const args = { workerId: 'worker', operationId: 'formal-preflight-op-1' };
  for (const change of [
    f => { f.grant.permissions = []; },
    f => { f.worker.host = 'changed'; },
    f => { f.state.root = path.join(root, 'other-project'); },
    f => { f.host.client = {}; },
    f => { f.host.workerActionTargets = () => []; },
  ]) {
    const f = fixture();
    f.host.client.getWorkerOperation = async () => { change(f); return { action: 'preflight-worker-task' }; };
    await assert.rejects(f.gateway.call('task_preflight_cancel', args), /MCP_AUTHORIZATION_REQUIRED|MCP_WORKER_TARGET_CHANGED|FORMAL_JOB_PREFLIGHT_PROJECT_CHANGED|FORMAL_JOB_PREFLIGHT_WORKER_REQUIRED/);
    assert.equal(f.posts.length, 0);
  }
});

test('MCP preflight status and cancellation validate operation identity', async () => {
  const f = fixture(), args = { workerId: 'worker', operationId: 'formal-preflight-op-1' };
  assert.equal((await f.gateway.call('task_preflight_status', args)).status, 'running');
  await f.gateway.call('task_preflight_cancel', args);
  assert.equal(f.posts[0][2].targetPreflightOperationId, args.operationId);
  for (const operationId of ['op-1', 'preflight-1', 'formal-preflight-', 'formal-preflight_OP_1'])
    await assert.rejects(f.gateway.call('task_preflight_status', { workerId: 'worker', operationId }), /OPERATION_REQUIRED/);
  assert.equal(f.reads.length, 2);
  f.host.client.getWorkerOperation = async () => ({ payload: { action: 'run-plan' } });
  await assert.rejects(f.gateway.call('task_preflight_cancel', args), /OPERATION_MISMATCH/);
  assert.equal(f.posts.length, 1);
});
