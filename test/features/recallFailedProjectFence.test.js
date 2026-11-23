const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '../../src/extension/legacy.ts'), 'utf8');
const start = source.indexOf('case "recallFailedJob":');
const end = source.indexOf('case "markJobUnavailable":', start);
assert.ok(start >= 0 && end > start);
const dispatch = new Function('FailedJobRecovery', 'vscode', 'makeOpId',
  'return async function(message) { switch (message.command) { ' + source.slice(start, end) + ' } };')(
  { recallFailedJobFromUi: async () => 'historical' }, {}, () => 'unused');

test('failed job dispatch preserves the project across queue loading', async () => {
  for (const protocol of [1, 2]) {
    let current = true, release, calls = 0;
    const queueReady = new Promise(resolve => { release = resolve; });
    const host = {
      captureProjectContext: () => ({ root: '/project-a' }),
      projectContextIsCurrent: () => current,
      loadDistributedQueue: async root => { assert.equal(root, '/project-a'); return queueReady; },
      retryDistributedJobFromUi: async () => { calls++; return 'retried'; },
    };
    const message = { command: 'recallFailedJob', planId: 'plan', jobIndex: 0, commandId: 'command' };
    const pending = dispatch.call(host, message);
    current = false;
    release({ plans: [{ id: 'plan', jobs: [{ index: 0, lifecycleProtocol: protocol }] }] });
    await assert.rejects(pending, /项目已切换/);
    assert.equal(calls, 0);
  }
  const host = {
    captureProjectContext: () => ({ root: '/project-a' }),
    projectContextIsCurrent: () => true,
    loadDistributedQueue: async () => ({ plans: [{ id: 'plan', jobs: [{ index: 0, lifecycleProtocol: 2 }] }] }),
    retryDistributedJobFromUi: async message => message.commandId,
  };
  assert.equal(await dispatch.call(host, { command: 'recallFailedJob', planId: 'plan', jobIndex: 0, commandId: 'command' }), 'command');
});
