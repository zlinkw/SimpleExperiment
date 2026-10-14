const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {spawnSync}=require('node:child_process');
test('native Scheduler enforces memory-ratio slots, queues the fifth job and reconstructs occupancy after restart',()=>{
 const linux=p=>'/mnt/'+p[0].toLowerCase()+p.slice(2).replace(/\\/g,'/');
 const fixture=path.resolve(__dirname,'gpuMemoryAdmission.fixture.py'),runtime=path.resolve(__dirname,'../../dist/runtime/cluster_agent.py');
 const args=process.platform==='win32'?['--distribution',process.env.SIMPLE_TEST_WSL_DISTRO||'Ubuntu-Codex','--exec','python3',linux(fixture),linux(runtime)]:[fixture,runtime];
 const result=spawnSync(process.platform==='win32'?'wsl.exe':'python3',args,{encoding:'utf8',timeout:10000,windowsHide:true});
 assert.equal(result.status,0,result.stderr||result.stdout);
 assert.deepEqual(JSON.parse(result.stdout),{ok:true,sharedJobs:4,queuedJobs:1,restartRecovered:true});
});
