const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{spawnSync}=require('node:child_process');
test('actual Agent Hub API and old cross-server Scheduler entry cannot start',()=>{
 const result=spawnSync(process.platform==='win32'?'python':'python3',['-B','-X','utf8',path.join(__dirname,'hubRetirement.fixture.py'),path.resolve('dist/runtime/cluster_agent.py'),path.resolve('dist/runtime/cluster_scheduler.py')],{encoding:'utf8',timeout:10000,windowsHide:true});
 assert.equal(result.status,0,result.stderr||result.stdout);assert.deepEqual(JSON.parse(result.stdout),{hubApiRejected:true,globalSchedulerRejected:true});
});
