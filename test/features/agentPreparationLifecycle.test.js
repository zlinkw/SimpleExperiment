const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const manifest=require('../../dist/runtime/RuntimeManifest');
const scope=require('../../dist/features/AgentRuntimeScope');
const source=fs.readFileSync(path.join(__dirname,'../../src/extension/legacy.ts'),'utf8');
const tree=ts.createSourceFile('provider.ts',source,ts.ScriptTarget.Latest,true);
const cls=tree.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='RealtimeTunnelPanelProvider');
const names=['deployLatestAgentRuntime','apiAgentLifecycle','agentLifecycleForTarget','agentLifecycleServer','writeXshellAgentStartupCommands'];
const code=ts.transpileModule(`${tree.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='mapLimited').getText(tree)}
class Host {${cls.members.filter(n=>names.includes(n.name?.getText(tree))).map(n=>n.getText(tree)).join('\n')}};Host;`,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
function fixture(state='absent', inspection, options={}) {
 let currentState=state;
 const calls=[];
 const target={id:'container',label:'container',host:'configured-host',port:23094,remotePath:'/srv/agent/simple_cluster/runtime',localForwardPort:23069};
 let host;
 const Host=vm.runInNewContext(code,{require:specifier=>require(path.resolve(__dirname,'../../dist/extension',specifier)),console:{log(){},warn(){}},fs:fs.promises,path,__dirname:path.resolve(__dirname,'../../dist/extension'),
  AgentRuntimeScope_1:scope,RuntimeManifest_1:manifest,SIMPLE_SFTP_EXTENSION_ID:'simple-local.simple-sftp',
  AbortSignal, tunnelHttpOrigin:(host,port)=>`http://${host}:${port}`,
  fetch:async()=>{if(options.closedTunnel)throw new TypeError('fetch failed');return {ok:true,json:async()=>({schedulerRuntime:{protocol:1,status:state==='healthy-stale-scheduler'?'update_required':'absent'}})};},
  AgentTmuxPolicy_1:require('../../dist/tunnel/AgentTmuxPolicy'),
  SshTransportIdentity_1:{...require('../../dist/tunnel/SshTransportIdentity'),inspectOpenSshAlias:async()=>inspection},
  sftpUploadFilesSucceeded:row=>row.ok===true,stringFromRecord:()=>'',errorMessage:e=>e.message,effectiveWorkerCondaEnv:row=>row.condaEnv,
  stringArrayField:(params,key)=>params[key]||[],confirmationRequired:data=>Object.assign(new Error('CONFIRM_REQUIRED'),{apiData:data}),UiCommandCancelled:class extends Error{},
  vscode:{window:{showWarningMessage:async()=>undefined},extensions:{getExtension:()=>({packageJSON:{version:'0.2.78'}})},commands:{executeCommand:async(name,params)=>{
   calls.push({name,params});
   if(name==='simpleSftp.uploadFiles')return {ok:true};
   if(params.action==='inspect') {
     if(currentState.startsWith('legacy'))return {ok:false,code:'AGENT_LEGACY_STATE_UNVERIFIED',evidence:{migration:{digest:'a'.repeat(64),activeTasks:state==='legacy-busy'?['running-job','queued-job']:[],contract:{projectDir:'/srv/project',installDir:'/srv/agent',stateDir:'/srv/agent/state/projects/project.id'}}}};
     if(state==='foreign')return {ok:false,code:'AGENT_STATE_OWNER_CONFLICT'};
     const filehashes={};for(const name of ['cluster_agent.py','cluster_scheduler.py'])filehashes[name]=manifest.sha256Text(fs.readFileSync(path.join(__dirname,'../../dist/runtime',name),'utf8'));
     return {ok:true,status:state.startsWith('healthy')||state==='busy'?'running':state==='unhealthy'?'unhealthy':'absent',activeTasks:state==='busy'?['running-job','queued-job']:[],runningVersion:state==='busy'?'old-version':manifest.CURRENT_RUNTIME_VERSION,files:filehashes,
       ...(options.proven?{identity:{runtimeFiles:filehashes},schedulerRuntime:{protocol:1,status:'current'}}:{})};
   }
   if(params.action==='migrate'){currentState='absent';return {ok:true,status:'migrated'};}
   return {ok:true,status:'running',runningVersion:manifest.CURRENT_RUNTIME_VERSION,reused:params.action==='ensure'&&state.startsWith('healthy'),
     ...(options.missingEvidence?{}:{schedulerRuntime:{protocol:1,status:state==='healthy-stale-scheduler'?'update_required':'absent'}})};
  }}}});
 host=new Host();Object.assign(host,{context:{extension:{packageJSON:{version:manifest.CURRENT_RUNTIME_VERSION}}},setupConfig:{workerTunnels:[{id:'container',agentProjectDir:'/srv',agentInstallDir:'/srv/agent',condaEnv:'/srv/env',remoteAgentHost:'127.0.0.2',remoteAgentPort:23065}],remoteTmuxSessionPrefix:'user'},
  prepareSftpTargets:async()=>{},sftpSharedTargets:()=>[target],agentRuntimeUploadTargets:()=>[target],agentRuntimeDirs:()=>({workDir:'/srv/project',installDir:'/srv/agent'}),sftpServerOptions:()=>({host:'configured-host',port:23094,user:'user'}),tunnelConfig:{},
  confirmRemoteWriteTargets:async()=>{},writeSftpManagerServerProfiles:async()=>{},verifyDeployedAgentRuntime:async()=>({fatal:[],warnings:[]})});
 return {host,calls};
}
test('real deployment entry checks ownership before upload and preserves dynamic endpoint/Conda',async()=>{
 const {host,calls}=fixture();
 await host.deployLatestAgentRuntime(false,true,['container'],true);
 assert.deepEqual(calls.map(c=>c.name==='simpleSftp.uploadFiles'?'upload':c.params.action),['inspect','upload','ensure']);
 const request=calls.at(-1).params;
 assert.equal(request.port,23065);assert.equal(request.host,'127.0.0.2');assert.equal(request.condaEnv,'/srv/env');
 assert.equal(request.projectDir,'/srv/project');assert.equal(request.server.port,23094);
 assert.equal(request.tmuxSession,'user-worker-container-agent');assert.equal(request.tmuxWindow,'agent');
});
test('legacy preparation requires exact migration approval before any upload; confirmed migration preserves the staged order',async()=>{
 const unconfirmed=fixture('legacy');
 await assert.rejects(()=>unconfirmed.host.deployLatestAgentRuntime(false,true,['container'],true),/CONFIRM_REQUIRED/);
 assert.deepEqual(unconfirmed.calls.map(c=>c.params.action),['inspect']);
 const confirmed=fixture('legacy');
 await confirmed.host.deployLatestAgentRuntime(false,true,['container'],true,{migrationDigests:{container:'a'.repeat(64)}});
 assert.deepEqual(confirmed.calls.map(c=>c.name==='simpleSftp.uploadFiles'?'upload':c.params.action),['inspect','migrate','inspect','upload','ensure']);
 assert.equal(confirmed.calls[1].params.migrationDigest,'a'.repeat(64));
 const cancelled=fixture('legacy');
 await assert.rejects(()=>cancelled.host.deployLatestAgentRuntime(false,true,['container'],true,{promptLegacyMigration:true}),/旧 Agent 归属迁移已取消/);
 assert.deepEqual(cancelled.calls.map(c=>c.params.action),['inspect']);
});
test('healthy preparation reuses service without uploading or restarting; foreign state blocks every write',async()=>{
 const healthy=fixture('healthy');await healthy.host.deployLatestAgentRuntime(false,true,['container'],true);
 assert.deepEqual(healthy.calls.map(c=>c.params.action),['inspect','ensure']);
 const foreign=fixture('foreign');await assert.rejects(()=>foreign.host.deployLatestAgentRuntime(false,true,['container'],true),/AGENT_STATE_OWNER_CONFLICT/);
 assert.equal(foreign.calls.length,1);
});

test('fresh full running-byte and Scheduler proof removes the redundant ensure SSH round trip',async()=>{
 const f=fixture('healthy',undefined,{proven:true}),stages=[];
 const result=await f.host.deployLatestAgentRuntime(false,true,['container'],true,{reportStage:s=>stages.push(s)});
 assert.deepEqual(f.calls.map(c=>c.params.action),['inspect']);
 assert.equal(result.timings.length,3);assert.ok(result.timings.every(t=>t.durationMs>=0&&t.serverId==='container'));
 assert.equal(stages.length,3);
});

test('deployment overlaps distinct servers, serializes one server, drains failures before any write',async()=>{
 const f=fixture(),base=f.host.agentRuntimeUploadTargets()[0];
 const targets=[{...base,id:'a',host:'one'},{...base,id:'b',host:'one'},{...base,id:'c',host:'two'}];
 f.host.agentRuntimeUploadTargets=()=>targets;
 let active=0,max=0,done=0;const hosts=new Set();
 f.host.agentLifecycleForTarget=async(target,action)=>{
  assert.equal(action,'inspect');assert.ok(!hosts.has(target.host));hosts.add(target.host);active++;max=Math.max(max,active);
  await new Promise(resolve=>setTimeout(resolve,15));active--;hosts.delete(target.host);done++;
  throw Error(target.id+': read failed');
 };
 await assert.rejects(f.host.deployLatestAgentRuntime(false,true,[],true),/read failed/);
 assert.equal(done,3);assert.equal(active,0);assert.equal(max,2);assert.equal(f.calls.length,0);
});
test('deploying the latest Agent again automatically restarts a stale independent Scheduler through Agent startup',async()=>{
 const f=fixture('healthy-stale-scheduler');
 await f.host.deployLatestAgentRuntime(false,true,['container'],true);
 assert.deepEqual(f.calls.map(c=>c.params.action),['inspect','ensure','restart']);
 assert.ok(f.calls.at(-1).params.confirm);
});
test('deployment before opening local tunnels reuses healthy Agent and reconciles old Scheduler through the deployment channel',async()=>{
 for(const state of ['healthy','healthy-stale-scheduler']){
  const f=fixture(state,undefined,{closedTunnel:true});
  await f.host.deployLatestAgentRuntime(false,true,['container'],true);
  assert.deepEqual(f.calls.map(c=>c.params.action),state==='healthy'?['inspect','ensure']:['inspect','ensure','restart']);
 }
 const unsupported=fixture('healthy',undefined,{closedTunnel:true,missingEvidence:true});
 await assert.rejects(()=>unsupported.host.deployLatestAgentRuntime(false,true,['container'],true),/SCHEDULER_RUNTIME_UNVERIFIED/);
 assert.deepEqual(unsupported.calls.map(c=>c.params.action),['inspect','ensure']);
});
test('active tasks do not block real preparation, upgrade or legacy migration API preview',async()=>{
 const busy=fixture('busy');await busy.host.deployLatestAgentRuntime(false,true,['container'],true);
 assert.deepEqual(busy.calls.map(c=>c.name==='simpleSftp.uploadFiles'?'upload':c.params.action),['inspect','upload','restart']);
 const legacy=fixture('legacy-busy');
 await assert.rejects(()=>legacy.host.apiAgentLifecycle({action:'migrate',serverIds:['container']}),e=>e.message==='CONFIRM_REQUIRED'&&e.apiData.preview.targets[0].activeTasks.length===2);
 await legacy.host.deployLatestAgentRuntime(false,true,['container'],true,{migrationDigests:{container:'a'.repeat(64)}});
 assert.deepEqual(legacy.calls.slice(1).map(c=>c.name==='simpleSftp.uploadFiles'?'upload':c.params.action),['inspect','migrate','inspect','upload','ensure']);
 const unhealthy=fixture('unhealthy');await unhealthy.host.deployLatestAgentRuntime(false,true,['container'],true);
 assert.equal(unhealthy.calls.at(-1).params.action,'restart');
});
test('legacy Xshell session names without an OpenSSH HostName mapping preserve the configured direct transport',async()=>{
 const {host}=fixture('absent',{ok:true,alias:'old-session',hostname:'old-session',user:'desktop-user',port:'22'});
 Object.assign(host.setupConfig.workerTunnels[0],{workerHost:'configured-host',workerUser:'user',workerSshPort:23094,sshConfigAlias:'old-session'});
 const server=await host.agentLifecycleServer(host.agentRuntimeUploadTargets()[0]);
 assert.equal(server.host,'configured-host');assert.equal(server.user,'user');assert.equal(server.port,23094);
});
test('a real OpenSSH alias must match host, user and SSH port before use',async()=>{
 const matching=fixture('absent',{ok:true,alias:'container-ssh',hostname:'configured-host',user:'user',port:'23094'});
 Object.assign(matching.host.setupConfig.workerTunnels[0],{workerHost:'configured-host',workerUser:'user',workerSshPort:23094,sshConfigAlias:'container-ssh'});
 assert.equal((await matching.host.agentLifecycleServer(matching.host.agentRuntimeUploadTargets()[0])).host,'container-ssh');
 for(const changed of [{hostname:'foreign-host'},{user:'other-user'},{port:'22'},{ok:false}]){
  const f=fixture('absent',{ok:true,alias:'container-ssh',hostname:'configured-host',user:'user',port:'23094',...changed});
  Object.assign(f.host.setupConfig.workerTunnels[0],{workerHost:'configured-host',workerUser:'user',workerSshPort:23094,sshConfigAlias:'container-ssh'});
  await assert.rejects(()=>f.host.agentLifecycleServer(f.host.agentRuntimeUploadTargets()[0]),/AGENT_SSH_ALIAS_MISMATCH/);
  assert.equal(f.calls.length,0);
 }
});
