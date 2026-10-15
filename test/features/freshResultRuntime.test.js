const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path'), { spawnSync } = require('node:child_process');
test('real filesystem: collection reads only final manifest/metrics, tolerates copied inode changes and isolates bad declarations', () => {
  const result = spawnSync('python', ['-X','utf8',path.join(__dirname,'freshResultRuntime.fixture.py'),path.join(__dirname,'../../dist/runtime/cluster_agent.py')], {
    encoding:'utf8',timeout:10000,windowsHide:true,env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}
  });
  assert.equal(result.status,0,result.stderr || result.stdout);
  assert.deepEqual(JSON.parse(result.stdout), {ok:true,stateFiles:0,weightReads:0,mixedQueriesIsolated:true});
});
