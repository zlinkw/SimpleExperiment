const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
require('../_helpers/registerTsRequire');
const {PlanCleanup}=require('../../src/features/PlanCleanup.ts');
async function fixture({action='delete',state='paused',missing=['worker'],failed=[],changed=[],token=true,executing=[],executorUnverified=false}={}){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'se-missing-cleanup-')),id='a'.repeat(48),calls=[],indexed=[];
 const nodes=['worker','other'].map(id=>({id,kind:'remote',root:'/fixture/project',host:id+'.invalid',port:2222,user:'fixture'}));
 const rows=nodes.map(node=>({id:node.id,nodeId:node.id,node,relativePath:'work_dirs/job',absolutePath:node.root+'/work_dirs/job',type:'directory',category:'job output',owners:['p'],evidence:['exact'],dependencies:[],
  disposition:action,destination:'clean_dir/work_dirs/job',...(token?{backendToken:'expired-'+node.id,backendIndex:0}:{})}));
 const operation={id,state,preview:{token:id,digest:'frozen',action,confirmations:1,scope:{projectId:'project',planFile:'plans/p.yaml',planKey:'p',nodes,runIds:[],blockers:[],authorizationMode:'confirmed_paths',observationMode:'managed_tmux'},rows,blockers:[],expiresAt:Date.now()+60000},
  targets:Object.fromEntries(rows.map(row=>[row.id,{state:'pending'}])),pendingNodes:nodes.map(node=>node.id),error:'old failure',updatedAt:new Date().toISOString()};
 if(state==='running')operation.executionRequestedAt=new Date().toISOString();
 await fs.writeFile(path.join(root,id+'.json'),JSON.stringify(operation),'utf8');
 const ports={storageRoot:root,collect:async()=>{throw Error('must not recollect or authorize deletion');},restoreGate:async()=>{},currentNode:async id=>({...nodes.find(node=>node.id===id),...(changed.includes(id)?{port:9999}:{})}),
  updateIndexes:async op=>indexed.push(JSON.parse(JSON.stringify(op))),sftp:async(method,params)=>{
   calls.push({method,params});if(method==='files.cleanup.observeBatch'){
    if(failed.includes(params.node.id))throw Error('SSH_QUERY_FAILED');
    if(typeof params.observationId!=='string'||![1,2].includes(params.readConcurrency)||!Array.isArray(params.targets)||params.targets.length>5000)throw Error('INVALID_OBSERVATION_REQUEST');
    const observations=params.targets.map(target=>({key:target.key,relativePath:target.relativePath,type:target.type,target:{missing:missing.includes(params.node.id),type:'directory'},
     ...(executorUnverified?{}:{executorsChecked:true,executors:executing.includes(params.node.id)?[{windowId:'@42'}]:[]})}));
    return {ok:true,observationId:params.observationId,capabilities:{batchCleanupObservation:1,maxTargets:5000},rootIdentity:{path:params.node.root},observations};
   }
   if(method==='files.cleanup.check')throw Error('EXPIRED_TOKEN');
   throw Error('must not mutate: '+method);
  }};
 return {id,root,ports,calls,indexed,operation,service:new PlanCleanup(ports)};
}
test('restart retires an already absent deletion without confirmations, old capabilities or a deletion call',async()=>{
 const f=await fixture({missing:['worker','other']});
 const result=await f.service.status(f.id);assert.equal(result.state,'completed');assert.deepEqual(result.pendingNodes,[]);assert.equal(result.error,undefined);
 assert.ok(Object.values(result.targets).every(row=>row.state==='completed'));assert.equal(f.indexed.length,1);
 assert.ok(f.calls.every(row=>row.method==='files.cleanup.observeBatch'));assert.equal(f.calls.length,2);
 assert.ok(f.calls.every(row=>row.params.readConcurrency===1&&row.params.targets.length===1&&row.params.targets[0].backendToken==='expired-'+row.params.node.id&&row.params.targets[0].backendIndex===0));
 const restarted=new PlanCleanup(f.ports);assert.deepEqual(await restarted.recheckNode('worker'),[]);assert.deepEqual(await restarted.recheckNode('other'),[]);
 const saved=await fs.readFile(path.join(f.root,f.id+'.json'),'utf8');assert.doesNotMatch(saved,/work_dirs\/job|expired-worker|relativePath|fingerprint/);
 assert.equal((await restarted.execute(f.id)).state,'completed');
});
test('reconnection does not request review for an absent node while another server still has files',async()=>{
 const f=await fixture();assert.deepEqual(await f.service.recheckNode('worker'),[]);
 const status=await f.service.status(f.id);assert.notEqual(status.state,'completed');assert.deepEqual(status.pendingNodes,['other']);
 const reports=await f.service.recheckNode('other');assert.equal(reports.length,1);assert.equal(reports[0].targets[0].state,'pending');
 assert.ok(!f.calls.some(row=>row.method==='files.cleanup.check'));
});
test('failed existence checks and changed servers remain unverified and never become successful cleanup',async()=>{
 for(const options of [{missing:['worker','other'],failed:['worker']},{missing:['worker','other'],changed:['worker']}]){
  const f=await fixture(options),reports=await f.service.recheckNode('worker');assert.equal(reports.length,1);assert.equal(reports[0].state,'blocked');
  assert.notEqual((await f.service.status(f.id)).state,'completed');assert.equal(f.indexed.length,0);
 }
});
test('files still present and expired approvals never cause automatic execution or success',async()=>{
 const f=await fixture({missing:[]});const result=await f.service.status(f.id);assert.notEqual(result.state,'completed');assert.equal(f.indexed.length,0);
 assert.ok(f.calls.every(row=>row.method==='files.cleanup.observeBatch'));assert.equal(result.preview.confirmations,1);
});
test('a lost deletion response can finish from actual absence even when the backend capability expired',async()=>{
 const f=await fixture({state:'running',missing:['worker','other']});assert.equal((await f.service.status(f.id)).state,'completed');assert.equal(f.indexed.length,1);
 assert.ok(f.calls.every(row=>row.method==='files.cleanup.observeBatch'));
});
test('an ordinary move keeps its receipt and destination verification rules',async()=>{
 const f=await fixture({action:'move',missing:['worker','other']});assert.equal((await f.service.status(f.id)).state,'paused');assert.equal(f.calls.length,0);assert.equal(f.indexed.length,0);
});
test('an actual cleanup window keeps execution active even after the target disappears; an unavailable query stays unknown',async()=>{
 const live=await fixture({state:'running',missing:['worker','other'],executing:['worker']});
 assert.equal((await live.service.status(live.id)).state,'running');assert.equal(live.indexed.length,0);
 assert.deepEqual(await live.service.recheckNode('worker'),[]);
 const unknown=await fixture({state:'running',missing:['worker','other'],executorUnverified:true});
 assert.equal((await unknown.service.status(unknown.id)).state,'partial');assert.equal(unknown.indexed.length,0);
 assert.ok(unknown.calls.every(row=>row.method==='files.cleanup.observeBatch'));
});
async function hostFixture(root,extra={}){
 const vm=require('node:vm'),ts=require('typescript'),from=require('node:module').createRequire(path.resolve(__dirname,'../../src/extension/PlanCleanupHost.ts')),exports={};let notices=0;
 const source=await fs.readFile(path.resolve(__dirname,'../../src/extension/PlanCleanupHost.ts'),'utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,
  require:name=>name==='vscode'?{workspace:{workspaceFolders:[{uri:{fsPath:root}}]},window:{showWarningMessage(){notices++;return Promise.resolve('稍后');}}}:name==='./PlanCleanupPanel'?{}:from(name)});
 const host=new exports.PlanCleanupHost({context:{globalStorageUri:{fsPath:root}},loadDistributedQueue:async()=>({plans:[],clearedJobs:[]}),saveDistributedQueue:async()=>{},updatePlanSyncLedger:async()=>{},postState(){},...extra},root);
 return {host,get notices(){return notices;}};
}
test('connection does not inspect cleanup history; an explicit review retires confirmed absent targets',async()=>{
 const f=await fixture({missing:['worker','other']}),ui=await hostFixture(f.root);ui.host.service=f.service;
 await ui.host.observeConnections([{id:'worker',streamStatus:'polling'},{id:'other',streamStatus:'polling'}]);
 assert.equal(ui.notices,0);assert.equal(f.calls.length,0);assert.equal(f.indexed.length,0);
 assert.equal((await f.service.status(f.id)).state,'completed');
 assert.deepEqual(await f.service.list(),[]);assert.equal(f.indexed.length,1);
});
test('a failed startup query never announces that an old file still needs deletion',async()=>{
 const f=await fixture({failed:['worker'],missing:['worker','other']}),ui=await hostFixture(f.root);ui.host.service=f.service;
 await ui.host.observeConnections([{id:'worker',streamStatus:'polling'}]);assert.equal(ui.notices,0);assert.equal(f.calls.length,0);
 f.ports.sftp=async(method,params)=>{assert.equal(method,'files.cleanup.observeBatch');return {ok:true,observationId:params.observationId,capabilities:{batchCleanupObservation:1,maxTargets:5000},rootIdentity:{path:params.node.root},observations:params.targets.map(target=>({key:target.key,target:{missing:true,type:'directory'},executorsChecked:true,executors:[]}))};};
 await ui.host.observeConnections([{id:'worker',streamStatus:'disconnected'}]);
 await ui.host.observeConnections([{id:'worker',streamStatus:'polling'}]);assert.equal(ui.notices,0);assert.equal(f.calls.length,0);
 assert.equal((await f.service.status(f.id)).state,'completed');assert.deepEqual(await f.service.list(),[]);
});
test('observed deletion does not require a retired job registry or remote state retirement acknowledgement',async()=>{
 const f=await fixture({missing:['worker','other']}),ui=await hostFixture(f.root);
 const operation=await f.service.status(f.id);operation.preview.scope.observationMode=undefined;
 operation.preview.scope.job={workflowId:'removed-old-workflow',index:5,commandId:'old-command',purpose:'replace_outputs'};
 await ui.host.updateIndexes(operation,false);assert.equal(operation.state,'completed');assert.equal(operation.retirementPendingNodes,undefined);
});
test('an old deletion cannot retire a newer run which reuses the same declared output path',async()=>{
 const f=await fixture({missing:['worker','other']}),job={index:0,commandId:'old-command',outputDir:'work_dirs/job',collectionResultCsv:'tmp/result/job.csv'};
 const queue={plans:[{id:'old-run',planFile:'plans/p.yaml',jobs:[{...job}]},{id:'new-run',planFile:'plans/p.yaml',jobs:[{...job,commandId:'new-command',status:'running'}]}]};
 const ui=await hostFixture(f.root,{loadDistributedQueue:async()=>queue});const operation=await f.service.status(f.id);
 operation.preview.scope.runIds=['old-run'];operation.preview.scope.nativeDeclarations=[{output_dir:job.outputDir,result_csv:job.collectionResultCsv}];
 await ui.host.updateIndexes(operation,false);assert.equal(queue.plans[0].jobs[0].cleanup.state,'deleted');
 assert.equal(queue.plans[1].jobs[0].cleanup,undefined);assert.equal(queue.plans[1].jobs[0].outputRetiredAt,undefined);
});
