const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),Module=require('node:module');
require('../_helpers/registerTsRequire');
const {createProjectAuthorization}=require('../../src/mcp/ProjectAuthorization.ts');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'g004-sftp-gateway-'));
const vscode={workspace:{workspaceFolders:[{uri:{fsPath:root}}]},window:{}};
const original=Module._load;let mcpGateway;
try{Module._load=function(id,...args){return id==='vscode'?vscode:original.call(this,id,...args)};({mcpGateway}=require('../../src/extension/McpHost.ts'))}finally{Module._load=original}
function fixture({failureMethod,responses={}}={}){
 const workers=[{id:'w1',host:'host1',port:22,user:'user',remotePath:'/project/one'},{id:'w2',host:'host2',port:22,user:'user',remotePath:'/project/two'}],calls=[];
 const grant=createProjectAuthorization(root);grant.workers=workers.map(({id,host,port,user,remotePath})=>({id,host,port,user,projectRoot:remotePath}));
 const methods=['status','servers.list','servers.save','sync.projectInventory','sync.projectTree','sync.projectTreeState','sync.planLogPaths','sync.projectFileStats','remote.listDirs','sync.fromRemote','sync.downloadPaths','sync.downloadMappedPaths','sync.serverToServerFpsync','sync.serverToServer','sync.serverToServerBatch','transfers.list','transfers.reconcile','transfers.cancel','files.cleanup.observeBatch','target.update','upload.files','upload.workspace','downloadScope.configure','handoff.markReady'];
 const host={context:{workspaceState:{get:()=>grant}},refreshSharedConnectionSettings(){},workerCodeSyncTargets:()=>workers,createLocalApiMethods:()=>({}),
  readSimpleSftpCapabilities:async()=>({methods}),sftpServerOptions:row=>({...row}),simpleSftpApiCall:async(method,params)=>{calls.push({method,params});if(method===failureMethod)throw Error('远端项目清单无效。');return responses[method]??(method==='transfers.reconcile'?{status:'notFound',settled:false}:method==='transfers.cancel'?{status:'cancelling'}:{ok:true})}};
 return {gateway:mcpGateway(host),calls,grant,workers,host};
}

test('MCP SFTP inventory routes the exact Worker and refuses unscoped hashes',async()=>{
 const f=fixture();await f.gateway.call('sftp_inventory',{workerId:'w1',paths:['work/a'],includeHashes:true});
 let {method,params}=f.calls.at(-1);assert.equal(method,'sync.projectInventory');assert.deepEqual(params.scopePaths,['work/a']);assert.equal(params.metadataOnly,false);assert.equal(params.server.id,'w1');assert.equal(params.localPath,root);
 await f.gateway.call('sftp_inventory',{workerId:'w1'});assert.equal(f.calls.at(-1).params.metadataOnly,true);
 for(const [name,backend] of [['sftp_tree','sync.projectTree'],['sftp_tree_state','sync.projectTreeState']]){
  await f.gateway.call(name,{workerId:'w1',relativePath:'work'});
  assert.equal(f.calls.at(-1).method,backend);assert.equal(f.calls.at(-1).params.relativePath,'work');assert.equal(f.calls.at(-1).params.server.id,'w1');
 }
 const before=f.calls.length;await assert.rejects(f.gateway.call('sftp_inventory',{workerId:'w1',includeHashes:true}),/MCP_HASH_PATHS_REQUIRED/);
 await assert.rejects(f.gateway.call('sftp_tree',{workerId:'missing'}),/MCP_WORKER_UNKNOWN/);assert.equal(f.calls.length,before);
 await f.gateway.call('sftp_plan_logs',{workerId:'w1',planFile:'plans/p.yaml',statePath:'state/p.json'});
 ({method,params}=f.calls.at(-1));assert.equal(method,'sync.planLogPaths');assert.equal(params.planFile,'plans/p.yaml');assert.equal(params.statePath,'state/p.json');
 await f.gateway.call('sftp_file_stats',{workerId:'w1',paths:['work/a']});assert.deepEqual(f.calls.at(-1).params.paths,['work/a']);
 await f.gateway.call('sftp_remote_directories',{workerId:'w1',relativePath:'sub'});assert.equal(f.calls.at(-1).params.remotePath,'/project/one/sub');
 const count=f.calls.length;await assert.rejects(f.gateway.call('sftp_remote_directories',{workerId:'w1',relativePath:'../escape'}),/MCP_PROJECT_DIRECTORY_REQUIRED/);assert.equal(f.calls.length,count);
});

test('MCP transfer receipts retain unknown and cancelling states without retrying',async()=>{
 const f=fixture();assert.equal((await f.gateway.call('sftp_transfers',{})).ok,true);
 const unknown=await f.gateway.call('sftp_transfer_reconcile',{operationId:'op-9',operationInstanceId:'instance-1'});
 assert.deepEqual(unknown,{status:'notFound',settled:false});
 assert.equal(f.calls.at(-1).params.operationId,'op-9');assert.equal(f.calls.at(-1).params.operationInstanceId,'instance-1');
 const cancelled=await f.gateway.call('sftp_transfer_cancel',{operationId:'op-9',transferId:'t-1',reason:'test'});
 assert.deepEqual(cancelled,{status:'cancelling'});assert.equal(f.calls.at(-1).method,'transfers.cancel');
 assert.equal(f.calls.at(-1).params.transferId,'t-1');assert.equal(f.calls.at(-1).params.reason,'test');
 assert.deepEqual(f.calls.map(row=>row.method),['transfers.list','transfers.reconcile','transfers.cancel']);
 f.grant.permissions=[];await assert.rejects(f.gateway.call('sftp_transfer_cancel',{operationId:'op-9',transferId:'t-1'}),/AUTHORIZATION_REQUIRED/);
 assert.equal(f.calls.length,3);
});

test('MCP file observation preserves frozen per-target and root identities',async()=>{
 const f=fixture(),target={key:'k1',relativePath:'work_dirs/run1/out',type:'directory',backendToken:'b'.repeat(48),backendIndex:3,
  backendDigest:'digest',device:'42:1',inode:9,isolationRelativePath:'work_dirs/run1/.isolated-out'};
 const schema=require('../../src/mcp/ToolCatalog.ts').PROJECT_TOOLS.find(row=>row.name==='file_cleanup_observe_batch').inputSchema;
 assert.deepEqual(schema.properties.targets.items.properties.inode.type,['string','number']);
 await f.gateway.call('file_cleanup_observe_batch',{location:'worker',workerId:'w1',observationId:'obs-9',rootIdentity:{dev:'42:1',ino:'9'},targets:[target]});
 const call=f.calls.at(-1);assert.equal(call.method,'files.cleanup.observeBatch');assert.deepEqual(call.params.targets,[target]);
 assert.equal(call.params.readConcurrency,1);
 assert.deepEqual(call.params.rootIdentity,{dev:'42:1',ino:'9'});assert.equal(call.params.consumerRoot,root);assert.equal(call.params.node.id,'w1');
 assert.ok(!Object.hasOwn(call.params,'confirm'));
 const before=f.calls.length;
 await assert.rejects(f.gateway.call('file_cleanup_observe_batch',{location:'worker',workerId:'w1',observationId:'obs-9',targets:[{relativePath:'x',type:'file',key:7}]}),/must be string/);
 await assert.rejects(f.gateway.call('file_cleanup_observe_batch',{location:'worker',workerId:'w1',observationId:'obs-9',targets:[{...target,inode:{}}]}),/must be string or number/);
 assert.equal(f.calls.length,before);
});

test('MCP SFTP preserves backend inventory refusal',async()=>{
 const f=fixture({failureMethod:'sync.projectInventory'});
 await assert.rejects(f.gateway.call('sftp_inventory',{workerId:'w1'}),/远端项目清单无效/);
 assert.deepEqual(f.calls.map(row=>row.method),['sync.projectInventory']);
});

test('MCP SFTP status and server list preserve only observed metadata',async()=>{
 const status={ok:true,serverConfigFile:'C:/fixture/servers.json'},servers={ok:true,activeServerId:'s1',servers:[{id:'s1',label:'gpu1'}]};
 const f=fixture({responses:{status,'servers.list':servers}});
 assert.deepEqual(await f.gateway.call('sftp_status',{}),status);assert.deepEqual(await f.gateway.call('sftp_servers',{}),servers);
 const missing=fixture({responses:{status:{ok:true}}});assert.deepEqual(await missing.gateway.call('sftp_status',{}),{ok:true});
});

test('MCP target update requires human approval before forwarding a scoped patch',async()=>{
 const f=fixture(),old=vscode.window.showWarningMessage;let answer;
 vscode.window.showWarningMessage=async()=>answer;
 try{
  await assert.rejects(f.gateway.call('sftp_target_update',{patch:{host:'gpu1'}}),/USER_APPROVAL_REQUIRED/);
  assert.equal(f.calls.length,0);
  answer='确认执行';await f.gateway.call('sftp_target_update',{patch:{host:'gpu1'}});
  assert.equal(f.calls[0].method,'target.update');assert.deepEqual(f.calls[0].params.patch,{host:'gpu1'});
  assert.equal(f.calls[0].params.localPath,root);assert.equal(f.calls[0].params.confirm,true);assert.equal(f.calls[0].params.pathConfirmed,true);
  await assert.rejects(f.gateway.call('sftp_target_update',{patch:{unknown:'x'}}),/Unknown/);
  assert.equal(f.calls.length,1);
 }finally{vscode.window.showWarningMessage=old}
});

test('MCP server save requires approval and preserves activation and profile',async()=>{
 const f=fixture(),old=vscode.window.showWarningMessage;let answer;
 const server={label:'fixture',host:'host1',port:22,username:'user',remotePath:'/project/one'};
 vscode.window.showWarningMessage=async()=>answer;
 try{
  await assert.rejects(f.gateway.call('sftp_server_save',{server,setActive:true}),/USER_APPROVAL_REQUIRED/);
  assert.equal(f.calls.length,0);
  answer='确认执行';await f.gateway.call('sftp_server_save',{server,setActive:true});
  assert.equal(f.calls[0].method,'servers.save');assert.deepEqual(f.calls[0].params.server,server);
  assert.equal(f.calls[0].params.setActive,true);assert.equal(f.calls[0].params.confirm,true);
  await assert.rejects(f.gateway.call('sftp_server_save',{server:{...server,unknown:'x'}}),/Unknown/);
  assert.equal(f.calls.length,1);
 }finally{vscode.window.showWarningMessage=old}
});

test('MCP SFTP transfers preserve both targets and project authorization',async()=>{
 const f=fixture();
 await f.gateway.call('sftp_from_remote',{workerId:'w1'});
 assert.equal(f.calls.at(-1).method,'sync.fromRemote');assert.equal(f.calls.at(-1).params.localPath,root);
 assert.equal(f.calls.at(-1).params.server.id,'w1');assert.equal(f.calls.at(-1).params.confirm,true);assert.equal(f.calls.at(-1).params.pathConfirmed,true);
 await assert.rejects(f.gateway.call('sftp_from_remote',{}),/workerId is required/);
 await f.gateway.call('sftp_download_paths',{workerId:'w1',paths:['work/a']});
 let {method,params}=f.calls.at(-1);assert.equal(method,'sync.downloadPaths');assert.deepEqual(params.paths,['work/a']);assert.equal(params.server.id,'w1');assert.equal(params.confirm,true);assert.equal(params.pathConfirmed,true);
 const entries=[{remotePath:'work/a.csv',localRelativePath:'tmp/a.csv',bytes:3,sha256:'a'.repeat(64)}];
 await f.gateway.call('sftp_download_mapped',{workerId:'w1',entries});params=f.calls.at(-1).params;assert.deepEqual(params.entries,entries);assert.equal(params.memoryOnly,true);assert.equal(params.metricsOnly,true);
 await f.gateway.call('sftp_worker_sync',{sourceWorkerId:'w1',destinationWorkerId:'w2',paths:['work_dirs/run'],compression:'none'});
 params=f.calls.at(-1).params;assert.equal(params.source.id,'w1');assert.equal(params.destination.id,'w2');assert.deepEqual(params.relativePaths,['work_dirs/run']);
 f.grant.workers=f.grant.workers.filter(row=>row.id!=='w2');const before=f.calls.length;
 await assert.rejects(f.gateway.call('sftp_worker_sync',{sourceWorkerId:'w1',destinationWorkerId:'w2',paths:['work_dirs/run']}),/WORKER_NOT_AUTHORIZED/);assert.equal(f.calls.length,before);
 f.grant.permissions=[];await assert.rejects(f.gateway.call('sftp_from_remote',{workerId:'w1'}),/AUTHORIZATION_REQUIRED/);assert.equal(f.calls.length,before);
});

test('MCP transfer tools reject missing and extra fields before business calls',async()=>{
 const f=fixture();
 for(const [name,args] of [
  ['sftp_from_remote',{}],
  ['sftp_download_paths',{workerId:'w1'}],
  ['sftp_download_mapped',{workerId:'w1'}],
  ['sftp_upload_files',{workerId:'w1'}],
  ['sftp_upload_workspace',{}],
  ['sftp_worker_sync',{sourceWorkerId:'w1',paths:['work']}],
  ['sftp_worker_sync',{sourceWorkerId:'w1',destinationWorkerId:'w2'}],
  ['sftp_download_scope',{paths:['work']}],
  ['sftp_handoff',{}],
  ['sftp_handoff',{workerId:'w1',unexpected:true}],
 ]) await assert.rejects(f.gateway.call(name,args));
 assert.equal(f.calls.length,0);
});

test('MCP Worker directory and batch variants retain targets and authorization',async()=>{
 const f=fixture();
 await f.gateway.call('sftp_worker_directory',{sourceWorkerId:'w1',destinationWorkerId:'w2',relativePath:'work_dirs/run'});
 let call=f.calls.at(-1);assert.equal(call.method,'sync.serverToServer');assert.equal(call.params.directory,true);
 assert.equal(call.params.relativePath,'work_dirs/run');assert.equal(call.params.source.id,'w1');assert.equal(call.params.destination.id,'w2');
 assert.equal(call.params.confirm,true);assert.equal(call.params.pathConfirmed,true);
 await f.gateway.call('sftp_worker_batch',{sourceWorkerId:'w1',destinationWorkerId:'w2',relativePaths:['work_dirs/run/a']});
 call=f.calls.at(-1);assert.equal(call.method,'sync.serverToServerBatch');assert.deepEqual(call.params.relativePaths,['work_dirs/run/a']);
 assert.equal(call.params.source.id,'w1');assert.equal(call.params.destination.id,'w2');
 assert.equal(call.params.confirm,true);assert.equal(call.params.pathConfirmed,true);
 f.grant.workers=f.grant.workers.filter(row=>row.id!=='w2');const before=f.calls.length;
 for(const [name,args] of [['sftp_worker_directory',{relativePath:'work_dirs/run'}],['sftp_worker_batch',{relativePaths:['work_dirs/run/a']}]])
  await assert.rejects(f.gateway.call(name,{sourceWorkerId:'w1',destinationWorkerId:'w2',...args}),/WORKER_NOT_AUTHORIZED/);
 assert.equal(f.calls.length,before);
});

test('MCP file uploads bind exact workspace paths',async()=>{
 const f=fixture(),file=path.join(root,'fixture-upload.txt');fs.writeFileSync(file,'fixture','utf8');
 await f.gateway.call('sftp_upload_files',{workerId:'w1',files:['fixture-upload.txt']});
 let call=f.calls.at(-1);assert.equal(call.method,'upload.files');
 assert.deepEqual(call.params.files,[{localPath:file,remoteName:'fixture-upload.txt'}]);
 assert.equal(call.params.server.id,'w1');assert.equal(call.params.localBase,root);
 const before=f.calls.length;
 await assert.rejects(f.gateway.call('sftp_upload_files',{workerId:'w1',files:['../outside']}),/MCP_PROJECT_FILE_REQUIRED/);
 assert.equal(f.calls.length,before);
});

test('MCP workspace upload forwards the scoped manifest without pruning',async()=>{
 const f=fixture(),manifest={'model.py':{size:7}},builds=[];
 f.host.buildDistributedJobCodeManifest=async(...args)=>{builds.push(args);return manifest};
 await f.gateway.call('sftp_upload_workspace',{workerId:'w1'});
 const call=f.calls.at(-1);assert.equal(call.method,'upload.workspace');
 assert.deepEqual(builds,[[root,false]]);assert.deepEqual(call.params.manifest,manifest);
 assert.equal(call.params.server.id,'w1');assert.equal(call.params.pruneManagedFiles,false);assert.equal(call.params.transientManifest,true);
 f.grant.permissions=[];await assert.rejects(f.gateway.call('sftp_upload_workspace',{workerId:'w1'}),/AUTHORIZATION_REQUIRED/);
 assert.equal(f.calls.length,1);
});

test('MCP scope and handoff remain bound to the authorized Worker',async()=>{
 const f=fixture();
 await f.gateway.call('sftp_download_scope',{workerId:'w1',paths:['experiments/results'],extensions:['.csv'],maxFileSizeMB:64});
 let call=f.calls.at(-1);assert.equal(call.method,'downloadScope.configure');
 assert.deepEqual(call.params.paths,['experiments/results']);assert.deepEqual(call.params.extensions,['.csv']);
 assert.equal(call.params.maxFileSizeMB,64);assert.equal(call.params.server.id,'w1');assert.equal(call.params.localPath,root);
 assert.equal(call.params.confirm,true);assert.equal(call.params.pathConfirmed,true);
 await f.gateway.call('sftp_handoff',{workerId:'w1'});call=f.calls.at(-1);
 assert.equal(call.method,'handoff.markReady');assert.equal(call.params.server.id,'w1');assert.equal(call.params.localPath,root);
 f.grant.permissions=[];await assert.rejects(f.gateway.call('sftp_handoff',{workerId:'w1'}),/AUTHORIZATION_REQUIRED/);
 assert.equal(f.calls.length,2);
});
