const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const {spawnSync}=require('node:child_process');
const { updateXshellSessionLoginCommand, getLoginCommand } = require('../../dist/tunnel/XshellSessionPatcher');
const { agentTmuxStartupCommand } = require('../../dist/tunnel/AgentTmuxPolicy');
const {isSimpleManagedLoginCommand}=require('../../dist/tunnel/XshellSessionPatcher');

test('custom login is protected until explicit managed-fragment opt-in; updates preserve original bytes', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-login-'));
  const file = path.join(dir, 'custom.xsh');
  const original = "cd '/srv/user project' && exec bash -i";
  await fs.writeFile(file, `[CONNECTION]\r\nRemoteCommand=${original}\r\nHost=host\r\nPort=23456\r\n`, 'utf8');
  const command = agentTmuxStartupCommand({role:'worker', endpointId:'worker-a', installDir:'/srv/agent',workDir:'/srv/user project', condaEnv:'/srv/env',port:23457});
  const blocked = await updateXshellSessionLoginCommand(file, command);
  assert.equal(blocked.skippedReason, 'non_simple_remote_command');
  assert.equal(getLoginCommand(await fs.readFile(file,'utf8')), original);
  const first = await updateXshellSessionLoginCommand(file, command, {managedAgentLogin:true});
  assert.equal(first.changed,true);
  const bytes = await fs.readFile(file);
  const second = await updateXshellSessionLoginCommand(file, command, {managedAgentLogin:true});
  assert.equal(second.changed,false);
  assert.deepEqual(await fs.readFile(file),bytes);
  const changed = await updateXshellSessionLoginCommand(file, command.replace('23457','23458'), {managedAgentLogin:true});
  assert.equal(changed.changed,true);
  const text = await fs.readFile(file,'utf8');
  assert.match(text,/Port=23456/);
  assert.equal((getLoginCommand(text).match(/SIMPLE_EXPERIMENT_LOGIN_V1/g)||[]).length,1);
  const match = getLoginCommand(text).match(/SIMPLE_EXPERIMENT_LOGIN_V1=([A-Za-z0-9+/=]+)/);
  assert.equal(JSON.parse(Buffer.from(match[1],'base64').toString('utf8')).login,original);
  assert.equal(getLoginCommand(await fs.readFile(first.backupPath,'utf8')),original);
});

test('startup is a bounded independent ensure, without process/session killing or inherited port guesses', () => {
  assert.equal(isSimpleManagedLoginCommand('SIMPLE_EXPERIMENT_AGENT_TMUX_V21=1; echo custom login'),false);
  const command = agentTmuxStartupCommand({role:'worker',endpointId:'gpu',installDir:'/srv/agent',workDir:'/srv/project',condaEnv:'/srv/env',port:23001,host:'127.0.0.2'});
  assert.match(command,/lifecycle/);
  assert.match(command,/ensure/);
  assert.match(command,/23001/);
  assert.match(command,/127.0.0.2/);
  assert.match(command,/"tmuxSession":"simple-worker-gpu-agent"/);
  assert.match(command,/"tmuxWindow":"agent"/);
  assert.doesNotMatch(command,/kill-session|kill -9|ps -eo|AGENT_PIDS|rm -f/);
});

const quote = value => "'" + value.replace(/'/g, "'\\''") + "'";
const shellPath = file => process.platform === 'win32' ? '/mnt/' + file[0].toLowerCase() + file.slice(2).replace(/\\/g,'/') : file;
function runShell(file) {
  const proc=spawnSync(process.platform==='win32'?'wsl.exe':'bash',process.platform==='win32'
    ? ['--distribution',process.env.SIMPLE_TEST_WSL_DISTRO||'Ubuntu-Codex','--exec','/bin/bash',shellPath(file)] : [file],
    {encoding:'utf8',timeout:10000,windowsHide:true});
  assert.equal(proc.status,0,proc.stderr||proc.stdout);
  return proc;
}
test('actual login shell suppresses lifecycle JSON and diagnostics, preserving original login on success and failure',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'agent quiet 登录 ')), runtime=path.join(root,'simple_cluster/runtime');
  await fs.mkdir(runtime,{recursive:true});
  const probe=path.join(runtime,'cluster_agent.py'), receipt={ok:true,status:'running',reused:true,tmuxWindow:{session:'zlk-worker-fixture-agent',windowName:'agent'}};
  // Lightweight emitter reaches the real shell redirection boundary; no Agent, GPU, server or tmux launch.
  await fs.writeFile(probe,'import json, sys\nprint('+JSON.stringify(JSON.stringify(receipt))+')\nprint("LIFECYCLE_DIAGNOSTIC",file=sys.stderr)\nsys.exit(0 if "--config" in sys.argv else 7)\n','utf8');
  const original='cd '+quote(shellPath(root))+" && printf '%s\\n' 'ORIGINAL_LOGIN' '登录保留'";
  const file=path.join(root,'worker.xsh');
  await fs.writeFile(file,'[CONNECTION]\r\nRemoteCommand='+original+'\r\nPort=23456\r\n','utf8');
  const command=agentTmuxStartupCommand({role:'worker',endpointId:'fixture',sessionPrefix:'zlk',installDir:shellPath(root),workDir:shellPath(root),port:23457});
  for(const startup of [command,command.replace('--config','--failed-config')]) {
    await updateXshellSessionLoginCommand(file,startup,{managedAgentLogin:true});
    const login=getLoginCommand(await fs.readFile(file,'utf8')), script=path.join(root,'login.sh');
    await fs.writeFile(script,login+'\n','utf8');
    const result=runShell(script);
    assert.equal(result.stdout,'ORIGINAL_LOGIN\n登录保留\n');
    assert.equal(result.stderr,'');
    assert.ok(login.endsWith('; '+original));
  }
  // The same emitter still returns a structured receipt when invoked by the API transport.
  const apiScript=path.join(root,'api.sh');
  await fs.writeFile(apiScript,'python3 '+quote(shellPath(probe))+' --config fixture\n','utf8');
  const api=runShell(apiScript);
  assert.deepEqual(JSON.parse(api.stdout),receipt);
  assert.match(api.stderr,/LIFECYCLE_DIAGNOSTIC/);
});

test('upgrading an existing V1 managed login replaces the receipt wrapper once and retains original login/forward bytes',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'agent-login-migration-')),file=path.join(root,'old.xsh');
  const original="cd '/srv/user project' && exec bash -i", payload=Buffer.from(JSON.stringify({schemaVersion:1,login:original}),'utf8').toString('base64');
  const command=agentTmuxStartupCommand({role:'worker',endpointId:'fixture',installDir:'/srv/agent',workDir:'/srv/user project',port:23457});
  const old='SIMPLE_EXPERIMENT_LOGIN_V1='+payload+'; ('+command+") || printf '%s\\n' 'SimpleExperiment Agent preparation failed; original login preserved' >&2; "+original;
  await fs.writeFile(file,'[CONNECTION]\r\nRemoteCommand='+old+'\r\nForward=127.0.0.2:23457;127.0.0.1:23458\r\n','utf8');
  const first=await updateXshellSessionLoginCommand(file,command,{managedAgentLogin:true});
  assert.equal(first.changed,true);
  const bytes=await fs.readFile(file), login=getLoginCommand(bytes.toString('utf8'));
  assert.ok(login.endsWith('; '+original));
  assert.doesNotMatch(login,/preparation failed|printf/);
  assert.equal((await updateXshellSessionLoginCommand(file,command,{managedAgentLogin:true})).changed,false);
  assert.deepEqual(await fs.readFile(file),bytes);
  assert.match(bytes.toString('utf8'),/Forward=127.0.0.2:23457;127.0.0.1:23458/);
});
