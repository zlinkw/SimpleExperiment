const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
require('../_helpers/registerTsRequire');
const { ProjectGateway } = require('../../src/mcp/ProjectGateway.ts');
const { createProjectAuthorization } = require('../../src/mcp/ProjectAuthorization.ts');

function fixture() {
  const root = path.resolve(__dirname, '../..'), calls = [];
  let grant = createProjectAuthorization(root);
  const methods = Object.fromEntries(['drafts.list', 'drafts.cleanupCandidates', 'drafts.validate', 'drafts.promotionPreview', 'drafts.review', 'drafts.reject'].map(method => [method, async params => {
    calls.push({ method, params });
    if (method === 'drafts.list') return { enabled: true, drafts: [{ draftPlanPath: 'tmp/plan/old-a.yaml' }] };
    if (method === 'drafts.cleanupCandidates') return { candidates: [{ path: 'tmp/plan/old-a.yaml' }, { path: 'tmp/plan/old-b.yaml' }] };
    if (method === 'drafts.validate') return params.draftPlanPath.endsWith('broken.yaml')
      ? { ok: false, status: 'invalid', configRefs: ['configs/missing.yaml'], issues: ['缺少 config 引用：configs/missing.yaml'] }
      : { ok: true, status: 'validated', draftPlanPath: params.draftPlanPath };
    if (method === 'drafts.promotionPreview') {
      if (params.draftPlanPath.endsWith('running.yaml')) throw Error('Debug 未成功结束，禁止转正：running');
      return { source: 'tmp/plan/done.yaml', targetPlan: 'experiments/plans/done.yaml' };
    }
    return { ok: true, status: method === 'drafts.review' ? 'ready_for_review' : 'rejected', reviewedBy: params.reviewedBy || 'local-user' };
  }]));
  const gateway = new ProjectGateway({ root: () => root, workers: () => [], store: { get: () => grant }, methods: () => methods });
  return { gateway, calls, revoke: () => { grant = undefined; } };
}

test('draft reads preserve candidate, validation and promotion results', async () => {
  const { gateway, calls } = fixture();
  assert.equal((await gateway.call('draft_list', {})).enabled, true);
  assert.deepEqual(calls.at(-1), { method: 'drafts.list', params: {} });
  const candidates = await gateway.call('draft_cleanup_candidates', {});
  assert.deepEqual(candidates.candidates.map(row => row.path), ['tmp/plan/old-a.yaml', 'tmp/plan/old-b.yaml']);
  assert.deepEqual(calls.at(-1), { method: 'drafts.cleanupCandidates', params: {} });
  const validated = await gateway.call('draft_validate', { draftPlanPath: 'tmp/plan/old-a.yaml' });
  assert.equal(validated.status, 'validated');
  assert.deepEqual(calls.at(-1).params, { draftPlanPath: 'tmp/plan/old-a.yaml' });
  const invalid = await gateway.call('draft_validate', { draftPlanPath: 'tmp/plan/broken.yaml' });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.status, 'invalid');
  assert.deepEqual(invalid.issues, ['缺少 config 引用：configs/missing.yaml']);
  assert.deepEqual(invalid.configRefs, ['configs/missing.yaml']);
  await assert.rejects(gateway.call('draft_promotion_preview', { draftPlanPath: 'tmp/plan/running.yaml' }), /Debug 未成功结束，禁止转正/);
  assert.deepEqual(await gateway.call('draft_promotion_preview', { draftPlanPath: 'tmp/plan/done.yaml' }), { source: 'tmp/plan/done.yaml', targetPlan: 'experiments/plans/done.yaml' });
  assert.equal(calls.at(-1).method, 'drafts.promotionPreview');
  const before = calls.length;
  await assert.rejects(gateway.call('draft_validate', {}), /draftPlanPath is required/);
  await assert.rejects(gateway.call('draft_list', { unexpected: true }), /Unknown/);
  assert.equal(calls.length, before);
});

test('draft review and reject use exact inputs and require the current project grant', async () => {
  const f = fixture();
  const reviewed = await f.gateway.call('draft_review', { draftPlanPath: 'tmp/plan/old-a.yaml', reviewedBy: 'zhang' });
  assert.equal(reviewed.status, 'ready_for_review');
  assert.deepEqual(f.calls.at(-1), { method: 'drafts.review', params: { draftPlanPath: 'tmp/plan/old-a.yaml', reviewedBy: 'zhang', confirm: true } });
  const rejected = await f.gateway.call('draft_reject', { draftPlanPath: 'tmp/plan/old-b.yaml' });
  assert.equal(rejected.reviewedBy, 'local-user');
  assert.deepEqual(f.calls.at(-1), { method: 'drafts.reject', params: { draftPlanPath: 'tmp/plan/old-b.yaml', confirm: true } });
  f.revoke();
  await assert.rejects(f.gateway.call('draft_review', { draftPlanPath: 'tmp/plan/old-a.yaml' }), /AUTHORIZATION_REQUIRED/);
  assert.equal(f.calls.length, 2);
});
