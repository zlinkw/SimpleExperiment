const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),Module=require('node:module');
require('../_helpers/registerTsRequire');
const {createProjectAuthorization}=require('../../src/mcp/ProjectAuthorization.ts');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'g004-sftp-gateway-'));
const vscode={workspace:{workspaceFolders:[{uri:{fsPath:root}}]},window:{}};
const original=Module._load;let mcpGateway;
try{Module._load=function(id,...args){return id==='vscode'?vscode:original.call(this,id,...args)};({mcpGateway}=require('../../src/extension/McpHost.ts'))}finally{Module._load=original}
function fixture(){
 const workers=[{id:'w1',host:'host1',port:22,user:'user',remotePath:'/project/one'},{id:'w2',host:'host2',port:22,user:'user',remotePath:'/project/two'}],calls=[];
 const grant=createProjectAuthorization(root);grant.workers=workers.map(({id,host,port,user,remotePath})=>({id,host,port,user,projectRoot:remotePath}));
 const methods=['sync.projectInventory','sync.projectTree','sync.projectTreeState','sync.planLogPaths','sync.projectFileStats','remote.listDirs','sync.fromRemote','sync.downloadPaths','sync.downloadMappedPaths','sync.serverToServerFpsync','transfers.list','transfers.reconcile','transfers.cancel','files.cleanup.observeBatch'];
 const host={context:{workspaceState:{get:()=>grant}},refreshSharedConnectionSettings(){},workerCodeSyncTargets:()=>workers,createLocalApiMethods:()=>({}),
  readSimpleSftpCapabilities:async()=>({methods}),sftpServerOptions:row=>({...row}),simpleSftpApiCall:async(method,params)=>{calls.push({method,params});return method==='transfers.reconcile'?{status:'notFound',settled:false}:method==='transfers.cancel'?{status:'cancelling'}:{ok:true}}};
 return {gateway:mcpGateway(host),calls,grant,workers};
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
 await f.gateway.call('file_cleanup_observe_batch',{location:'worker',workerId:'w1',observationId:'obs-9',rootIdentity:{dev:'42:1',ino:'9'},targets:[target]});
 const call=f.calls.at(-1);assert.equal(call.method,'files.cleanup.observeBatch');assert.deepEqual(call.params.targets,[target]);
 assert.deepEqual(call.params.rootIdentity,{dev:'42:1',ino:'9'});assert.equal(call.params.consumerRoot,root);assert.equal(call.params.node.id,'w1');
 assert.ok(!Object.hasOwn(call.params,'confirm'));
 const before=f.calls.length;
 await assert.rejects(f.gateway.call('file_cleanup_observe_batch',{location:'worker',workerId:'w1',observationId:'obs-9',targets:[{relativePath:'x',type:'file',key:7}]}),/must be string/);
 await assert.rejects(f.gateway.call('file_cleanup_observe_batch',{location:'worker',workerId:'w1',observationId:'obs-9',targets:[{...target,inode:{}}]}),/OBSERVATION_IDENTITY_INVALID/);
 assert.equal(f.calls.length,before);
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
