const test = require('node:test');
const assert = require('node:assert/strict');
require('../_helpers/registerTsRequire');
const { ProjectGateway } = require('../../src/mcp/ProjectGateway.ts');
const { createProjectAuthorization } = require('../../src/mcp/ProjectAuthorization.ts');
const { canonicalProjectId } = require('../../src/features/DistributedPlanQueue.ts');
const { stopProjectTask } = require('../../src/extension/TaskControl.ts');

function fixture(change) {
  const root = process.cwd();
  let currentRoot = root;
  let worker = { id: 'worker-a', host: 'example', port: 22, user: 'test', projectRoot: '/project' };
  const grant = createProjectAuthorization(root);
  grant.workers = [{ ...worker }];
  if (change === 'missing') grant.permissions = [];
  const job = { workerId: worker.id, commandId: 'command-1', status: 'running' };
  const plan = { id: 'workflow-1', projectId: canonicalProjectId(root), jobs: [job] };
  let calls = 0;
  const host = {
    captureProjectContext: () => root,
    projectContextIsCurrent: context => context === currentRoot,
    saveDistributedQueue: async (_root, _unused, options) => {
      options.mutateLatest({ plans: [plan] });
      if (change === 'revoke') grant.permissions = [];
      if (change === 'target') worker = { ...worker, host: 'changed' };
      if (change === 'project') currentRoot = root + '-other';
    },
    stopDistributedJobForClear: async () => { calls++; return { status: 'completed' }; },
  };
  const gateway = new ProjectGateway({ root: () => currentRoot, workers: () => [worker], store: { get: () => grant },
    methods: () => ({ 'tasks.stop': params => stopProjectTask(host, root, params) }) });
  return { gateway, job, calls: () => calls };
}

test('task stop rechecks project grant and Worker target after saving intent', async () => {
  for (const change of ['revoke', 'target', 'project']) {
    const f = fixture(change);
    await assert.rejects(f.gateway.call('task_stop', { workerId: 'worker-a', commandId: 'command-1' }),
      /AUTHORIZATION_REQUIRED|WORKER_TARGET_CHANGED|WORKSPACE_CHANGED/);
    assert.equal(f.calls(), 0);
    assert.equal(f.job.stopIntent.state, 'pending');
    assert.equal(f.job.status, 'running');
  }
});

test('missing grant is rejected before recording or sending a stop', async () => {
  const f = fixture('missing');
  await assert.rejects(f.gateway.call('task_stop', { workerId: 'worker-a', commandId: 'command-1' }), /AUTHORIZATION_REQUIRED/);
  assert.equal(f.calls(), 0);
  assert.equal(f.job.stopIntent, undefined);
});

test('current grant permits the exact selected task to stop', async () => {
  const f = fixture();
  const result = await f.gateway.call('task_stop', { workerId: 'worker-a', commandId: 'command-1' });
  assert.equal(f.calls(), 1);
  assert.equal(result.commandId, 'command-1');
  assert.equal(f.job.status, 'cancelled');
});
