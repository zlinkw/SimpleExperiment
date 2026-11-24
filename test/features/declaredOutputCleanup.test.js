const test = require('node:test'), assert = require('node:assert/strict');
require('../_helpers/registerTsRequire');
const { discoverManifestCandidates } = require('../../src/features/ManifestCleanup.ts');

test('confirmed review discovers external declared files and directories even when the job directory is absent', async () => {
  const calls = [], node = { id: 'worker', kind: 'remote', root: '/project' };
  const types = { 'reports/result.csv': 'file', 'models/run': 'directory' };
  const host = { simpleSftpApiCall: async (_method, { target }) => {
    calls.push(target.relativePath);
    const type = types[target.relativePath];
    if (!type) return { target: { missing: true } };
    if (type !== target.type) throw Object.assign(new Error('type changed'), { apiData: { code: 'TYPE_CHANGED' } });
    return { target: { missing: false, type } };
  } };
  const row = { index: 0, case: 'analysis', output_dir: 'work/run', outputs: ['reports/result.csv', 'models/run', 'models/run/child'] };
  const result = await discoverManifestCandidates(host, '/project', 'plan.yaml', [node], { plans: [] }, [row], true);
  assert.deepEqual(result.blockers, []);
  assert.deepEqual(result.candidates.map(({ relativePath, type }) => [relativePath, type]).sort(), [['models/run', 'directory'], ['reports/result.csv', 'file']]);
  assert.ok(!calls.includes('models/run/child'));
});

test('unknown paths and an external ancestor of the job output block review', async () => {
  const node = { id: 'worker', kind: 'remote', root: '/project' };
  const host = { simpleSftpApiCall: async (_method, { target }) => {
    if (target.relativePath === 'unknown') throw Error('offline');
    return { target: { missing: true } };
  } };
  const row = { index: 0, case: 'analysis', output_dir: 'work/run', outputs: ['work', 'unknown'] };
  const result = await discoverManifestCandidates(host, '/project', 'plan.yaml', [node], { plans: [] }, [row], true);
  assert.deepEqual(result.blockers.map(row => row.code).sort(), ['NODE_UNREACHABLE', 'UNSAFE_DECLARED_PATH']);
});
