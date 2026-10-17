const test = require('node:test'), assert = require('node:assert/strict');
const path = require('node:path'), {spawnSync} = require('node:child_process');
test('Agent readiness does not wait for historical tasks or prune machine files', () => {
  const result = spawnSync('python', ['-X', 'utf8', path.join(__dirname,'agentStartupFastPath.fixture.py'),
    path.join(__dirname,'../../src/clusterAgentRuntime.legacy.ts')], {encoding:'utf8',timeout:10000,windowsHide:true});
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  assert.match(result.stdout, /without historical/);
});
