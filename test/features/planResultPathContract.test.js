const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const test = require('node:test');
const { spawnSync } = require('node:child_process');

test('portable formal PLAN + tmp/result isolates concurrent jobs and rejects inconsistent command targets', () => {
  const proc = spawnSync(process.platform === 'win32' ? 'python' : 'python3', ['-B', '-X', 'utf8', path.join(__dirname, 'planResultPathContract.fixture.py'), '--generic'], { cwd: path.join(__dirname, '../..'), encoding: 'utf8', timeout: 10000, windowsHide: true });
  assert.equal(proc.status, 0, proc.stderr || proc.stdout);
  assert.equal(JSON.parse(proc.stdout.trim()).ok, true);
});

// The former MultiModal integration case was retired by the user on 2026-10-22:
// its experiment and PLAN were deleted. The portable contract above remains mandatory.

test('structural cache keys reject old PLAN revision, code or project hook contents', () => {
  const source = fs.readFileSync(path.join(__dirname, '../../src/extension/legacy.ts'), 'utf8');
  const start = source.indexOf('    planValidationCacheKey(body, workerId) {');
  const end = source.indexOf('    cachedPlanValidation(key)', start);
  assert.ok(start > 0 && end > start);
  const owner = Function('workspaceRoot', 'normalizePlanSelectionKey', 'pluginProjectAdapterRules', 'crypto',
    'return {' + source.slice(start, end) + '}')(() => '/project', x => x, () => ({ resultPathValidator: 'experiments/quality_paths.py' }), crypto);
  Object.assign(owner, {lastWorkerProbes: {worker: {agentVersion: 'fixture'}}, projectTopologyAssessment: () => ({mode: 'worker_pool'}),
    enabledWorkerConfigs: () => [{id: 'worker'}], lastCodeSyncState: {fingerprint: 'current-code'}});
  const request = {planFile: 'experiments/plans/quality_composition/late_fusion.yaml', planRevision: 'current'};
  const current = owner.planValidationCacheKey(request, 'worker');
  assert.ok(current);
  assert.notEqual(owner.planValidationCacheKey({...request, planRevision: 'stale'}, 'worker'), current);
  owner.lastCodeSyncState.fingerprint = 'changed-hook';
  assert.notEqual(owner.planValidationCacheKey(request, 'worker'), current);
  assert.equal(owner.planValidationCacheKey({...request, planRevision: ''}, 'worker'), '');
});
