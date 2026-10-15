const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const linux=p=>'/mnt/'+p[0].toLowerCase()+p.slice(2).replace(/\\/g,'/');
test('Scheduler startup uses configured prefix despite an older shared tmux server environment',()=>{
  const script=path.resolve(__dirname,'tmuxSchedulerPrefix.fixture.py'),runtime=path.resolve(__dirname,'../../dist/runtime/cluster_agent.py');
  const args=process.platform==='win32'?['--distribution',process.env.SIMPLE_TEST_WSL_DISTRO||'Ubuntu-Codex','--exec','python3',linux(script),linux(runtime)]:[script,runtime];
  const result=spawnSync(process.platform==='win32'?'wsl.exe':'python3',args,{encoding:'utf8',timeout:10000,windowsHide:true});
  assert.equal(result.status,0,result.stderr||result.stdout);
  assert.deepEqual(JSON.parse(result.stdout),{ok:true,configuredPrefix:true,unchangedOtherUser:true});
});
test('real tmux queue/runner boundary survives caller loss, closes exact tasks and queries results without state files',()=>{
  const script=path.resolve(__dirname,'tmuxTaskLifecycle.fixture.py'),runtime=path.resolve(__dirname,'../../dist/runtime/cluster_agent.py');
  const args=process.platform==='win32'?['--distribution',process.env.SIMPLE_TEST_WSL_DISTRO||'Ubuntu-Codex','--exec','python3',linux(script),linux(runtime)]:[script,runtime];
  const result=spawnSync(process.platform==='win32'?'wsl.exe':'python3',args,{encoding:'utf8',timeout:10000,windowsHide:true});
  assert.equal(result.status,0,result.stderr||result.stdout);
  assert.deepEqual(JSON.parse(result.stdout),{ok:true,realTmux:true,callbacks:0,stateFilesRead:0});
});
test('closing a legacy pane during a live inventory does not block the next stop query',()=>{
  const script=path.resolve(__dirname,'tmuxStopRace.fixture.py'),runtime=path.resolve(__dirname,'../../dist/runtime/cluster_agent.py');
  const args=process.platform==='win32'?['--distribution',process.env.SIMPLE_TEST_WSL_DISTRO||'Ubuntu-Codex','--exec','python3',linux(script),linux(runtime)]:[script,runtime];
  const result=spawnSync(process.platform==='win32'?'wsl.exe':'python3',args,{encoding:'utf8',timeout:10000,windowsHide:true});
  assert.equal(result.status,0,result.stderr||result.stdout);
  assert.deepEqual(JSON.parse(result.stdout),{ok:true,realTmux:true,stateFilesRead:0});
});
