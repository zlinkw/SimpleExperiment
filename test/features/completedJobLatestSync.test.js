const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
require('../_helpers/registerTsRequire');
const {CompletedJobSyncHost}=require('../../src/extension/CompletedJobSyncHost.ts'),{canonicalProjectId}=require('../../src/features/DistributedPlanQueue.ts');
const {buildScopeStatuses,scopeInventoryPathAllowed}=require('../../src/features/SyncScopeStatus.ts');
const {planLatestWorkerMerge}=require('../../src/features/SyncLatestMerge.ts'),{runSyncScopeBatch}=require('../../src/features/SyncScopeBatch.ts');
test('completed-job result verification does not inspect unrelated panes while broad discovery stays complete',()=>{
 const {spawnSync}=require('node:child_process');
 const result=spawnSync('python',['-X','utf8',path.join(__dirname,'selectedTaskQuery.fixture.py'),path.join(__dirname,'../../src/runtime/TmuxTaskLifecycle.ts')],{encoding:'utf8',timeout:10000,windowsHide:true});
 assert.equal(result.status,0,result.stderr||result.stdout);
 assert.deepEqual(JSON.parse(result.stdout),{ok:true,selected:1,discovered:180});
});
const source=fs.readFileSync(path.resolve(__dirname,'../../src/extension/legacy.ts'),'utf8'),ast=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true);let member;function visit(n){if(ts.isMethodDeclaration(n)&&n.name.getText(ast)==='mergeLatestWorkerVersions')member=n;ts.forEachChild(n,visit);}visit(ast);
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'se-job-latest-')),targets=['a','b','c'].map(id=>({id,host:id+'.invalid',port:2222,user:'u',remotePath:'/safe/project'}));
 const jobs=[0,1].map(index=>({index,case:'case'+index,seed:42,attempt:0,status:index?'running':'completed',lifecycleProtocol:2,workerId:'a',commandId:'command'+index,outputDir:'work_dirs/p/job'+index,collectionResultCsv:'tmp/result/job'+index+'.csv',actualExecutionMode:'train_test'}));
 const plan={id:'plan',projectId:canonicalProjectId(root),planFile:'plans/p.yaml',enqueuedAt:'2026-10-14T00:00:00Z',executionMode:'train_test',jobs},queue={plans:[plan]},inventory={a:{},b:{},c:{}},transfers=[],queries=[],errors=[];
 for(const file of ['work_dirs/p/job0/model.pth','work_dirs/p/job0/artifact_manifest.json','tmp/result/job0.csv'])inventory.a[file]={sha256:'a'.repeat(64),size:3,modifiedAtMs:1};
 inventory.b['work_dirs/p/job0/model.pth']={sha256:'b'.repeat(64),size:3,modifiedAtMs:999};
 const config={get:(_k,fallback)=>fallback};let lost=false;
 const h={context:{globalStorageUri:{fsPath:root}},workerCodeSyncTargets:()=>targets,enabledWorkerConfigs:()=>targets,loadDistributedQueue:async()=>structuredClone(queue),
 client:{getWorkerTasks:async(id,options)=>{queries.push(options.queries[0].commandId);const j=options.queries[0];return {queryComplete:true,capabilities:{taskLifecycle:2},tasks:[{commandId:j.commandId,observation:{lifecycleProtocol:2,projectId:j.projectId,workerId:id,commandId:j.commandId,result:{runId:j.commandId,status:'completed',present:true,verified:true}}}]};}},
 sftpServerOptions:row=>row,recordActionError:r=>errors.push(r),assertSshTransportIdentities:async()=>{},
 refreshSyncScopeStatus:async(_root,_targets,_mode,scopes)=>buildScopeStatuses({local:{},workers:Object.fromEntries(Object.entries(inventory).map(([id,files])=>[id,Object.fromEntries(Object.entries(files).filter(([file])=>scopes.some(scope=>file===scope||file.startsWith(scope+'/'))))]))},'server-server',scopes,new Set(),{entries:{}}),
 verifiedSftpProjectInventory:async({source,scopePaths})=>({files:Object.fromEntries(Object.entries(inventory[source.id]).filter(([file])=>scopePaths.some(scope=>file===scope||file.startsWith(scope+'/'))))}),
 simpleSftpApiCall:async(method,p)=>{assert.equal(method,'sync.serverToServerFpsync');assert.equal(p.directory,undefined);assert.equal(p.manualRetain,undefined);assert.equal(p.destination.id==='local',false);transfers.push(p);for(const file of p.relativePaths)inventory[p.destination.id][file]=structuredClone(inventory[p.source.id][file]);if(lost){lost=false;throw Error('transport response lost');}},
 patchDistributedJob:async(_root,_id,index,_attempt,patch)=>{const j=jobs[index];if(j.commandId!==patch.expectedCommandId)return;const {expectedCommandId,replaceMirroredWorkerIds,...fields}=patch;Object.assign(j,fields);}};
 h.mergeLatestWorkerVersions=vm.runInNewContext(ts.transpileModule('class Host{'+member.getText(ast)+'};Host.prototype.mergeLatestWorkerVersions',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,
 {vscode:{workspace:{getConfiguration:()=>config},Uri:{file:x=>x}},scopeInventoryPathAllowed,planLatestWorkerMerge,runSyncScopeBatch,loadSyncHolds:async()=>({}),isLocalCodeOwnedPath:()=>false,safeSyncPath:require('../../src/features/SyncResolution.ts').safeSyncPath,path,workerFpsyncTaskLabel:()=>'',UiCommandCancelled:Error});
 return {h,root,queue,jobs,inventory,transfers,queries,errors,setLost:()=>lost=true,run:(scope=['.'])=>new CompletedJobSyncHost(h,root,()=>true).run(scope)};
}
test('first completed job merges latest files to every Worker while its sibling is running; old timestamps never win',async()=>{
 const f=fixture();await f.run();assert.equal(f.transfers.length,2);assert.ok(f.transfers.every(p=>p.relativePaths.every(file=>file.includes('job0'))));
 assert.equal(f.inventory.b['work_dirs/p/job0/model.pth'].sha256,'a'.repeat(64));assert.equal(f.jobs[0].latestArtifactSync.state,'synced');assert.equal(f.jobs[1].latestArtifactSync,undefined);
 const queries=f.queries.length;await f.run();assert.equal(f.transfers.length,2);assert.equal(f.queries.length,queries);assert.deepEqual(f.errors,[]);
});
test('source verification failure is distinguished from a transfer failure and repeated diagnostics are coalesced',async()=>{
 const f=fixture();f.h.client.getWorkerTasks=async(_,options)=>{assert.equal(options.selectedOnly,true);assert.notEqual(options.executionOnly,true);throw Error('任务状态查询超时');};
 await f.run();assert.equal(f.transfers.length,0);assert.equal(f.jobs[0].status,'completed');
 assert.match(f.jobs[0].artifactError,/来源任务核实未完成/);assert.equal(f.errors.length,1);
 f.jobs[0].latestArtifactSync.retryAfter='';await f.run();assert.equal(f.errors.length,1);
});
test('checkbox scope limits transfers; excluded jobs do not expand scope, a changed selection permits their results',async()=>{
 const f=fixture();await f.run(['work_dirs']);assert.ok(f.transfers.every(p=>p.relativePaths.every(file=>file.startsWith('work_dirs/'))));assert.equal(f.inventory.b['tmp/result/job0.csv'],undefined);
 const excluded=fixture();await excluded.run(['models']);assert.equal(excluded.transfers.length,0);assert.equal(excluded.jobs[0].latestArtifactSync.state,'excluded');
 await excluded.run(['.']);assert.equal(excluded.transfers.length,2);
});
test('lost transfer response keeps training completed and retries only remaining content after an active query',async()=>{
 const f=fixture();f.setLost();await f.run();assert.equal(f.jobs[0].status,'completed');assert.equal(f.jobs[0].latestArtifactSync.state,'partial');
 f.jobs[0].latestArtifactSync.retryAfter='';await f.run();assert.equal(f.jobs[0].latestArtifactSync.state,'synced');assert.equal(f.transfers.length,2,'the already copied destination needs no repeated transfer');
});

test('artifact transfer and code upload have independent activity while exact artifact paths remain protected',async()=>{
 const f=fixture();
 f.h.codeSyncInFlight=1;
 let release,started;
 const active=new Promise(resolve=>{started=resolve;});
 const transfer=f.h.simpleSftpApiCall;
 f.h.simpleSftpApiCall=async(...args)=>{started();await new Promise(resolve=>{release=resolve;});f.h.simpleSftpApiCall=transfer;return transfer(...args);};
 const mirror=f.run();await active;
 assert.equal(f.h.syncScopeMutationInFlight,undefined,'artifact copy must not take the project code mutation gate');
 assert.equal(f.h.codeSyncInFlight,1);
 assert.equal(f.h.activeArtifactSyncScopes.size,1);
 const ts=require('typescript'),ast=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true);let member;
 function visit(n){if(ts.isMethodDeclaration(n)&&n.name.getText(ast)==='assertArtifactSyncPathsIdle')member=n;ts.forEachChild(n,visit);}visit(ast);
 const check=vm.runInNewContext(ts.transpileModule('class H{'+member.getText(ast)+'};H.prototype.assertArtifactSyncPathsIdle',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText);
 assert.doesNotThrow(()=>check.call(f.h,f.root,['work_dirs/another-job']));
 assert.throws(()=>check.call(f.h,f.root,['work_dirs/p/job0']),/精确产物路径仍在同步/);
 assert.throws(()=>check.call(f.h,f.root,['work_dirs']),/精确产物路径仍在同步/);
 release();await mirror;
 assert.equal(f.h.activeArtifactSyncScopes.size,0);
 assert.equal(f.jobs[0].latestArtifactSync.state,'synced');
});
