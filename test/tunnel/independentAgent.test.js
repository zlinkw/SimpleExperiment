const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
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
  assert.doesNotMatch(command,/kill-session|kill -9|ps -eo|AGENT_PIDS|rm -f/);
});
