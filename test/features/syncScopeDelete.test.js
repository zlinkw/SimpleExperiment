const test = require('node:test');
const assert = require('node:assert/strict');
require('../_helpers/registerTsRequire');
const { deleteConfirmedScopeCopy } = require('../../src/features/SyncScopeDelete.ts');
const node = { id: 'worker', kind: 'remote', host: 'fixture', user: 'user', port: 22, root: '/project' };

test('confirmed tree deletion uses managed cleanup and actively verifies lost execution responses', async () => {
  const calls = []; let checks = 0;
  const rpc = async (method, params) => {
    calls.push([method, params]);
    if (method === 'files.cleanup.inspect') return { ok: true, executorsChecked: true, executors: [] };
    if (method === 'files.cleanup.preview') return { token: 'token', digest: 'digest', targets: [{ absolutePath: '/project/work_dirs/job', type: 'directory' }] };
    if (method === 'files.cleanup.execute') throw Error('response lost');
    if (method === 'files.cleanup.check') return { ok: true, state: ++checks === 1 ? 'executing' : 'completed' };
    return { ok: true };
  };
  await deleteConfirmedScopeCopy(rpc, node, 'work_dirs/job', true, () => {}, { wait: async () => {} });
  assert.deepEqual(calls.filter(([m]) => m === 'files.cleanup.confirm').map(([,p]) => p.phase), [1,2]);
  assert.equal(calls.filter(([m]) => m === 'files.cleanup.execute').length, 1);
  assert.equal(checks, 2);
  assert.ok(!calls.some(([m]) => /transfers|sync.deletePath/.test(m)));
});

test('a response is never proof of deletion; unchanged or unknown filesystem fails', async () => {
  for (const state of ['pending', 'changed', 'partial', 'unknown']) {
    await assert.rejects(deleteConfirmedScopeCopy(async (m) => {
      if (m.endsWith('.inspect')) return { ok: true, executorsChecked: true, executors: [] };
      if (m.endsWith('.preview')) return { token: 't', digest: 'd', targets: [{ absolutePath: '/project/work_dirs/job', type: 'directory' }] };
      if (m.endsWith('.check')) return { ok: true, state, queryError: 'fixture query' };
      return { ok: true, state: 'completed' };
    }, node, 'work_dirs/job', true), /删除未核实|查询失败/);
  }
});

test('a live cleanup window prevents a second executor; missing files require no delete', async () => {
  let starts = 0;
  await assert.rejects(deleteConfirmedScopeCopy(async m => {
    if (m.endsWith('.inspect')) return { ok: true, executorsChecked: true, executors: [{windowId:'@7'}] };
    starts++;
  }, node, 'work_dirs/job', true), /仍在处理/);
  assert.equal(starts, 0);
  await deleteConfirmedScopeCopy(async m => {
    if (m.endsWith('.inspect')) return { ok: true, executorsChecked: true, executors: [] };
    if (m.endsWith('.preview')) return { targets: [{ missing: true }] };
    throw Error('unexpected mutation');
  }, node, 'work_dirs/job', true);
});
