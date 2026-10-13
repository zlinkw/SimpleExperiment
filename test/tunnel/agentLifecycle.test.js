const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

test('real auxiliary process starts, reuses, restarts and stops without killing platform or adopting CPU state',()=>{
  const fixture=path.join(__dirname,'agentLifecycle.fixture.py');
  const mounted=fixture.replace(/\\/g,'/').replace(/^([A-Za-z]):/,(_,d)=>'/mnt/'+d.toLowerCase());
  const proc=spawnSync(process.platform==='win32'?'wsl.exe':'python3',process.platform==='win32'?['--distribution',process.env.SIMPLE_TEST_WSL_DISTRO||'Ubuntu-Codex','--exec','/usr/bin/python3','-B',mounted]:['-B',fixture],{encoding:'utf8',windowsHide:true,timeout:10000});
  assert.equal(proc.status,0,proc.stderr||proc.stdout||String(proc.error));
  const report=JSON.parse(proc.stdout.trim());
  assert.ok(Object.values(report).every(value=>value===true));
});

test('Agent and transport share the exact lifecycle protocol and serve claims ownership before state writers',()=>{
  const {AGENT_LIFECYCLE_PYTHON}=require('../../dist/runtime/AgentLifecycle');
  const vendor=fs.readFileSync(path.resolve(__dirname,'../../../simple-sftp/agent-lifecycle.py'),'utf8').replace(/\r\n/g,'\n');
  assert.equal(AGENT_LIFECYCLE_PYTHON,vendor.slice(0,vendor.indexOf('\nif __name__ == "__main__":')).trimEnd()+'\n');
  const source=fs.readFileSync(path.resolve(__dirname,'../../src/clusterAgentRuntime.legacy.ts'),'utf8');
  const serve=source.slice(source.indexOf('def serve_http(args):'),source.indexOf('class BoundedThreadingHTTPServer'));
  assert.ok(serve.indexOf('lifecycle_service_guard')<serve.indexOf('prune_agent_state'));
  const transport=require('../../../simple-sftp/agent-lifecycle');
  assert.throws(()=>transport.agentPayload({action:'kill',projectDir:'/srv/p',installDir:'/srv/a'}),/AGENT_ACTION_INVALID/);
  assert.throws(()=>transport.agentPayload({action:'inspect',projectDir:'/srv/../p',installDir:'/srv/a'}),/AGENT_PATH_INVALID/);
});
