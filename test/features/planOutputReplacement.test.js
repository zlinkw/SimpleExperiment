const test = require('node:test');
const assert = require('node:assert/strict');
const Queue = require('../../dist/features/DistributedPlanQueue');
require('../_helpers/registerTsRequire');
const { replacePlanOutputs, replacementJobGroups } = require('../../src/features/PlanOutputReplacement.ts');

function fixture(count = 2) {
  const events = [], state = { cancel: 0, block: false, fail: false, revision: false, changed: false };
  const previews = Array.from({ length: count }, (_, index) => {
    const rows = ['directory', 'file'].map((type, n) => ({ nodeId: 'worker', node: { id: 'worker', kind: 'remote', user: 'owner', host: 'host', port: 22, root: '/safe' },
      relativePath: `job${index}/` + (n ? 'metrics.csv' : 'output'), absolutePath: `/safe/job${index}/` + (n ? 'metrics.csv' : 'output'),
      type, disposition: 'delete', evidence: ['exact command ownership'], fingerprint: 'sha', size: 4 }));
    return { token: 'token' + index, digest: 'digest' + index, scope: { planHash: 'revision', candidates: rows }, rows, blockers: [] };
  });
  const groups = previews.map((_, index) => [{ workflowId: 'workflow', index, commandId: 'command' + index, purpose: 'replace_outputs' }]);
  const ports = { planRevision: 'revision', assertCurrent() {}, review: async detail => { events.push('review'); assert.match(detail, /host:22/); assert.match(detail, /\/safe\/job0/); },
    confirm: async (detail, phase) => { events.push('confirm' + phase); assert.match(detail, /不可恢复/); return state.cancel !== phase; },
    service: { preview: async ({ job }) => { events.push('preview' + job.index); const value = structuredClone(previews[job.index]);
      if (state.block) value.rows[0].disposition = 'protected'; if (state.revision) value.scope.planHash = 'changed'; return value; },
      confirm: async ({ phase, token, exactTargets }) => { events.push('approve' + phase + token); assert.equal(exactTargets.length, 2); },
      preflightConfirmed: async token => { events.push('check' + token); if (state.changed) throw Error('PREVIEW_CHANGED'); } },
    execute: async id => { events.push('delete' + id); if (state.fail && id === 'token1') throw Error('permission failed'); return { state: 'completed', pendingNodes: [] }; } };
  return { ports, events, groups, state };
}
test('two exact confirmations cover the complete batch; every operation rechecks before its first deletion', async () => {
  const f = fixture();
  assert.deepEqual(await replacePlanOutputs(f.ports, 'plans/p.yaml', f.groups), ['token0', 'token1']);
  assert.ok(f.events.indexOf('checktoken1') < f.events.indexOf('deletetoken0'));
  assert.equal(f.events.filter(row => row.startsWith('confirm')).length, 2);
  assert.ok(f.events.indexOf('approve2token1') < f.events.indexOf('deletetoken0'));
});
test('cancel, protected directory, revised PLAN and changed preflight never delete or submit', async () => {
  for (const change of [{ cancel: 1 }, { cancel: 2 }, { block: true }, { revision: true }, { changed: true }]) {
    const f = fixture(); Object.assign(f.state, change);
    await assert.rejects(replacePlanOutputs(f.ports, 'plans/p.yaml', f.groups));
    assert.ok(!f.events.some(row => row.startsWith('delete')));
  }
});
test('partial failure retains exact operation IDs and does not claim successful replacement', async () => {
  const f = fixture(); f.state.fail = true;
  await assert.rejects(replacePlanOutputs(f.ports, 'plans/p.yaml', f.groups), error => error.apiData.code === 'OUTPUT_REPLACEMENT_PARTIAL' && error.apiData.operationIds.length === 2);
});
test('exact declarations match historical owned revisions; prefixes and pending cleanup never authorize replacement', () => {
  const declaration = { index: 0, case: 'case', seed: 42, output_dir: 'work/job', result_csv: 'tmp/result/job.csv' };
  const plan = { id: 'workflow', projectId: 'project', planFile: 'plans/p.yaml', resultPathPolicy: 'declared', revision: 'old', jobs: [{
    index: 0, case: 'case', seed: 42, outputDir: 'work/job', collectionResultCsv: 'tmp/result/job.csv', status: 'completed', workerId: 'worker', commandId: 'command', globalJobId: 'workflow:0' }] };
  assert.equal(replacementJobGroups({ plans: [plan] }, 'plans/p.yaml', [declaration], 'project')[0][0].commandId, 'command');
  assert.throws(() => replacementJobGroups({ plans: [plan] }, 'plans/p-prefix.yaml', [declaration], 'project'), /登记/);
  plan.jobs[0].cleanup = { state: 'partial', operationId: 'original-cleanup', pendingNodes: ['worker'] };
  assert.throws(() => replacementJobGroups({ plans: [plan] }, 'plans/p.yaml', [declaration], 'project'), /original-cleanup/);
});

test('capacity preview reaches output review; actual enqueue requires completed retirement and preserves old audit', () => {
  const declaration = {projectId:'project',planFile:'plans/p.yaml',revision:'old',codeFingerprint:'code',executionMode:'train_test',jobs:[
    {index:0,case:'case',seed:42,outputDir:'work/job',collectionResultCsv:'tmp/result/job.csv'}]};
  const original = Queue.enqueuePlan(Queue.emptyDistributedQueue(),declaration,'old');
  original.plans[0].jobs[0].status='completed';
  const before=JSON.stringify(original), current={...declaration,revision:'new'};
  const preview=Queue.previewAvailable(original,current,[{workerId:'worker',online:true,codeFingerprint:'code',declaredJobPaths:true,idleGpuIds:['0']}]);
  assert.deepEqual(preview.outputReviewIndices,[0]); assert.equal(JSON.stringify(original),before);
  assert.throws(()=>Queue.enqueuePlan(original,current,'new'),/FORMAL_JOB_CONFLICT/);
  for (const state of ['partial','deleted']) {
    const queue=structuredClone(original),job=queue.plans[0].jobs[0];
    job.outputRetiredAt='verified';job.cleanup={state,operationId:'cleanup',completedTargets:['worker:/safe/work/job','worker:/safe/tmp/result/job.csv'],pendingNodes:state==='partial'?['offline']:[]};
    if(state==='partial')assert.throws(()=>Queue.enqueuePlan(queue,current,'new'),/FORMAL_JOB_CONFLICT/);
    else {const next=Queue.enqueuePlan(queue,current,'new');assert.equal(next.plans.length,2);assert.deepEqual(next.plans[0],queue.plans[0]);}
  }
  const active=structuredClone(original);active.plans[0].jobs[0].status='running';
  assert.throws(()=>Queue.previewAvailable(active,current,[]),/FORMAL_JOB_CONFLICT/);
  active.plans[0].cleanup={state:'partial',operationId:'cleanup',pendingNodes:['offline']};
  assert.throws(()=>Queue.enqueuePlan(active,current,'new'),/FORMAL_JOB_CONFLICT/);
});
