const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {spawnSync}=require('node:child_process');
test('real Host launch messages reach Agent and tmux Scheduler; manual and automatic jobs share an explicit card quota with a free-memory gate',async()=>{
 const script=path.resolve(__dirname,'manualTmuxAdmission.fixture.py'),runtime=path.resolve(__dirname,'../../dist/runtime/cluster_agent.py');
 const linux=p=>'/mnt/'+p[0].toLowerCase()+p.slice(2).replace(/\\/g,'/');
 const messages=JSON.stringify(await require('../_helpers/manualLaunchMessage')({gpuJobsPerCard:2,gpuMinFreeMemoryGb:22}));
 const args=process.platform==='win32'?['--distribution',process.env.SIMPLE_TEST_WSL_DISTRO||'Ubuntu-Codex','--exec','python3',linux(script),linux(runtime),messages]:[script,runtime,messages];
 const result=spawnSync(process.platform==='win32'?'wsl.exe':'python3',args,{encoding:'utf8',timeout:10000,windowsHide:true});
 assert.equal(result.status,0,result.stderr||result.stdout);
 assert.deepEqual(JSON.parse(result.stdout),{ok:true,realTmux:true,manualConcurrent:true,autoWithManual:true,exactStopIsolated:true,unknownRequestFenced:true});
});
