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
const names=['deployLatestAgentRuntime','agentLifecycleForTarget','agentLifecycleServer','writeXshellAgentStartupCommands'];
const code=ts.transpileModule(`class Host {${cls.members.filter(n=>names.includes(n.name?.getText(tree))).map(n=>n.getText(tree)).join('\n')}};Host;`,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
function fixture(state='absent', inspection) {
 let currentState=state;
 const calls=[];
 const target={id:'container',label:'container',host:'configured-host',port:23094,remotePath:'/srv/agent/simple_cluster/runtime',localForwardPort:23069};
 let host;
 const Host=vm.runInNewContext(code,{require:specifier=>require(path.resolve(__dirname,'../../dist/extension',specifier)),console:{log(){},warn(){}},fs:fs.promises,path,__dirname:path.resolve(__dirname,'../../dist/extension'),
  AgentRuntimeScope_1:scope,RuntimeManifest_1:manifest,SIMPLE_SFTP_EXTENSION_ID:'simple-local.simple-sftp',
  SshTransportIdentity_1:{...require('../../dist/tunnel/SshTransportIdentity'),inspectOpenSshAlias:async()=>inspection},
  sftpUploadFilesSucceeded:row=>row.ok===true,stringFromRecord:()=>'',errorMessage:e=>e.message,effectiveWorkerCondaEnv:row=>row.condaEnv,
  confirmationRequired:data=>Object.assign(new Error('CONFIRM_REQUIRED'),{apiData:data}),UiCommandCancelled:class extends Error{},
  vscode:{window:{showWarningMessage:async()=>undefined},extensions:{getExtension:()=>({packageJSON:{version:'0.2.72'}})},commands:{executeCommand:async(name,params)=>{
   calls.push({name,params});
   if(name==='simpleSftp.uploadFiles')return {ok:true};
   if(params.action==='inspect') {
     if(currentState==='legacy')return {ok:false,code:'AGENT_LEGACY_STATE_UNVERIFIED',evidence:{migration:{digest:'a'.repeat(64),activeTasks:[],contract:{projectDir:'/srv/project',installDir:'/srv/agent',stateDir:'/srv/agent/state/projects/project.id'}}}};
     if(state==='foreign')return {ok:false,code:'AGENT_STATE_OWNER_CONFLICT'};
     const filehashes={};for(const name of ['cluster_agent.py','cluster_scheduler.py'])filehashes[name]=manifest.sha256Text(fs.readFileSync(path.join(__dirname,'../../dist/runtime',name),'utf8'));
     return {ok:true,status:state==='healthy'?'running':'absent',runningVersion:manifest.CURRENT_RUNTIME_VERSION,files:filehashes};
   }
   if(params.action==='migrate'){currentState='absent';return {ok:true,status:'migrated'};}
   return {ok:true,status:'running',runningVersion:manifest.CURRENT_RUNTIME_VERSION};
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
