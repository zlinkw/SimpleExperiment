const test = require('node:test'), assert = require('node:assert/strict');
require('../_helpers/registerTsRequire');
const { dispatchManualJobs } = require('../../src/features/ManualJobDispatch.ts');

function fixture(change) {
  let queue = { plans: [{ id: 'p', projectId: 'project', revision: 'rev', codeFingerprint: 'source', resultPathPolicy: 'declared',
    jobs: [{ index: 0, status: 'pending', outputDir: 'work/job', command: 'python run.py', workingDirectory: '.', outputs: [] }] }] };
  let ticks = 0;
  const ports = { load: async () => structuredClone(queue), save: async value => { queue = structuredClone(value); },
    assertCurrent() {}, online: () => true, supports: () => true, newCommandId: () => 'new-command',
    prepare: async () => {}, stop: async () => { throw Error('unexpected stop'); },
    review: async () => { if (change) change(queue.plans[0].jobs[0]); return true; },
    send: async () => { throw Error('unexpected send'); }, tick: async () => { ticks++; } };
  return { ports, state: () => queue, ticks: () => ticks };
}

test('manual placement refuses a changed command, working directory or output declaration', async () => {
  for (const change of [job => { job.command = 'python different.py'; },
    job => { job.workingDirectory = 'other'; }, job => { job.outputs = ['report.txt']; }]) {
    const f = fixture(change);
    await assert.rejects(dispatchManualJobs(f.ports, { workflowId: 'p', indices: [0], workerId: 'w', gpuId: '0' }), /身份或声明已变化/);
    assert.equal(f.ticks(), 0);
    assert.equal(f.state().plans[0].jobs[0].commandId, undefined);
  }
  const unchanged = fixture();
  assert.equal((await dispatchManualJobs(unchanged.ports, { workflowId: 'p', indices: [0], workerId: 'w', gpuId: '0' })).status, 'submitted');
  assert.equal(unchanged.ticks(), 1);
});
