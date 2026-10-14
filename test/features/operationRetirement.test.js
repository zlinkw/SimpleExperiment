const test=require('node:test'),assert=require('node:assert/strict');
require('../_helpers/registerTsRequire');
const {withoutRetiredOperations,endedPlanOperationIds}=require('../../src/features/OperationRetirement.ts');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const {spawnSync}=require('node:child_process');
test('real Agent control-state functions retire exact rows and prevent late task/queue/claim/GPU state resurrection',()=>{
  const result=spawnSync('python',['-B','-X','utf8',path.join(__dirname,'operationRetirement.fixture.py'),path.join(__dirname,'../../dist/runtime/cluster_agent.py')],
    {encoding:'utf8',windowsHide:true,timeout:10000});
  assert.equal(result.status,0,result.stderr||result.stdout||result.error?.message);
  const {retiredTask,...proof}=JSON.parse(result.stdout);
  assert.deepEqual(proof,{ok:true,lateWriterFenced:true,researchWrites:0});
  const Q=require('../../src/features/DistributedPlanQueue.ts');
  const plan={id:'workflow',projectId:'project',planFile:'plans/p.yaml',revision:'a'.repeat(64),codeFingerprint:'b'.repeat(64),planJobCount:1,resultPathPolicy:'declared',executionMode:'train_test'};
  const job={index:0,case:'case',seed:42,workerId:'w',commandId:'old',runKey:'old',gpuId:'0',outputDir:'work/old',globalJobId:'workflow:0',collectionResultCsv:'tmp/result/old.csv'};
  assert.equal(Q.remoteTaskMatchesJob(plan,job,retiredTask),true,'trimmed audit must still satisfy the real cleanup identity matcher');
});
function hostMethods(names,globals={}){
  const source=fs.readFileSync(path.join(__dirname,'../../src/extension/legacy.ts'),'utf8'),ast=ts.createSourceFile('host.ts',source,ts.ScriptTarget.Latest,true),methods=[];
  function visit(node){if(ts.isMethodDeclaration(node)&&names.includes(node.name.getText(ast)))methods.push(node.getText(ast));else ts.forEachChild(node,visit);}visit(ast);
  assert.equal(methods.length,names.length);
  return vm.runInNewContext(ts.transpileModule('class Host {'+methods.join('\n')+'};Host;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,globals);
}
test('actual local retirement destroys persisted progress payloads and blocks late callbacks/reload replay',async()=>{
  const {canonicalProjectId}=require('../../src/features/DistributedPlanQueue.ts'),os=require('node:os');
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'retired-progress-')),file=path.join(directory,'operations.json'),ledger={};
  const Host=hostMethods(['retiredOperationIds','retireLocalOperationState','retireLocalOperationStateOwned','markLocalOperationsDirty','clearLocalOperationCachesForOp'],
    {workspaceRoot:()=>'/project',DistributedPlanQueue:{canonicalProjectId},keys:{retiredOperationIds:'ids'},withoutRetiredOperations,uniqueStrings:values=>[...new Set(values)]});
  const host=new Host();host.context={workspaceState:{get:(key,fallback)=>ledger[key]||fallback,update:async(key,value)=>{ledger[key]=structuredClone(value)}}};
  host.localOperations={old:{status:'running',logTail:'discard-me'},current:{status:'running'}};host.panelDisposed=true;host.localOperationsRevision=0;
  host.lastSnapshot={operations:{old:{status:'running'},current:{status:'running'}}};host.lastRealtimeState={operations:[{operationId:'old'},{operationId:'current'}]};
  const stopped=[];host.clearOperationStatusProbe=id=>stopped.push(id);host.clearOperationWatchdog=id=>stopped.push(id);
  host.persistProjectLocalOperationsState=async()=>fs.writeFileSync(file,JSON.stringify(host.localOperations),'utf8');
  await host.retireLocalOperationState(['old']);
  assert.equal(fs.readFileSync(file,'utf8').includes('discard-me'),false);assert.equal(host.lastSnapshot.operations.old,undefined);
  assert.equal(host.lastRealtimeState.operations.length,1);assert.equal(stopped.length,2);
  host.localOperations.old={status:'running',logTail:'late-replay'};host.markLocalOperationsDirty();await host.persistProjectLocalOperationsState();
  assert.equal(fs.readFileSync(file,'utf8').includes('late-replay'),false);assert.ok(host.localOperations.current);
  const reloaded=new Host();reloaded.context=host.context;
  assert.ok(reloaded.retiredOperationIds().has('old'));
  await Promise.all([host.retireLocalOperationState(['later-A']),host.retireLocalOperationState(['later-B'])]);
  assert.ok(host.retiredOperationIds().has('later-A')&&host.retiredOperationIds().has('later-B'));
});
test('actual replacement Host keeps metadata failure pending, retries one stable request and preserves concurrent queue updates',async()=>{
  const {cleanupDigest}=require('../../src/features/PlanCleanup.ts');
  const Host=hostMethods(['retireReplacedJobState'],{workspaceRoot:()=>'/project',cleanupDigest,errorMessage:error=>error.message});
  const host=new Host(),calls=[];let fail=true;
  let queue={plans:[{id:'run',projectId:'project',jobs:[{commandId:'old',workerId:'w',outputDir:'work/old',cleanup:{state:'deleted'}}]}]};
  host.loadDistributedQueue=async()=>structuredClone(queue);host.saveDistributedQueue=async(_,next)=>{queue=structuredClone(next)};
  host.withRemoteActionResource=async(_,__,___,work)=>work();host.recordActionError=()=>{};
  host.retireLocalOperationState=async ids=>calls.push({retired:Array.from(ids)});
  host.planCleanupHost=()=>({service:{ports:{currentNode:async()=>({id:'w',kind:'remote'})}}});
  host.client={postWorkerAction:async(worker,action,request)=>{
    assert.equal(queue.plans[0].jobs[0].cleanup.state,'partial');calls.push(structuredClone(request));
    queue.plans.push({id:'concurrent',jobs:[]});if(fail)throw Error('connection lost');
    return {stateRetired:true,retiredOperationIds:['old','stale-cleanup']};
  }};
  const operation={id:'cleanup',preview:{scope:{planFile:'plans/p.yaml',job:{workflowId:'run',commandId:'old'},nodes:[{id:'w',kind:'remote'}]}}};
  await assert.rejects(host.retireReplacedJobState(operation),/STATE_RETIREMENT_PENDING/);
  assert.equal(queue.plans[0].jobs[0].cleanup.state,'partial');assert.equal(queue.plans[1].id,'concurrent');
  fail=false;await host.retireReplacedJobState(operation);
  assert.equal(calls[0].operationId,calls[1].operationId);assert.equal(calls[0].targetCommandIds[0],'old');
  assert.equal(queue.plans[0].jobs[0].cleanup.state,'deleted');assert.equal(queue.plans.length,3);
  assert.deepEqual(calls[2].retired,['old','old','stale-cleanup']);
});
test('retirement removes old payloads across all replay sources; current submission, other PLAN and unknown/live state stay',()=>{
  const records={old:{operationId:'old',planFile:'plans/p.yaml',status:'failed',logTail:'heavy old payload'},
    live:{operationId:'live',planFile:'plans/p.yaml',status:'running'},
    unknown:{operationId:'unknown',planFile:'plans/p.yaml',status:'outcome_pending'},
    current:{operationId:'current',planFile:'plans/p.yaml',status:'completed'},
    other:{operationId:'other',planFile:'plans/other.yaml',status:'failed'}};
  assert.deepEqual(endedPlanOperationIds(records,'plans/p.yaml',new Set(['current'])),['old']);
  const retired=new Set(['old']);
  for(const replay of [records,{...records,old:{...records.old,status:'running'}},{alias:records.old}]){
    const filtered=withoutRetiredOperations(replay,retired);
    assert.ok(!Object.values(filtered).some(row=>row.operationId==='old'));
    assert.equal(JSON.stringify(filtered).includes('heavy old payload'),false);
  }
  assert.ok(withoutRetiredOperations(records,retired).live);
});
test('retired ownership is requested by exact command; ordinary task refresh avoids historical payload and selectors do not coalesce',async()=>{
  function method(file){const source=fs.readFileSync(path.join(__dirname,'../../src/tunnel',file),'utf8'),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);let result;
    function visit(node){if(ts.isMethodDeclaration(node)&&node.name.getText(ast)==='getWorkerTasks')result=node.getText(ast);else ts.forEachChild(node,visit);}visit(ast);
    return vm.runInNewContext(ts.transpileModule('class Client{'+result+'};Client;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText);}
  const Http=method('TunnelClient.legacy.ts'),client=new Http(),urls=[];
  client.requestJson=async url=>{urls.push(url);return {}};
  await client.getWorkerTasks();await client.getWorkerTasks({retiredCommandIds:['b','a','b']});
  assert.deepEqual(urls,['/api/worker/tasks','/api/worker/tasks?retiredCommandIds=a%2Cb']);
  assert.throws(()=>client.getWorkerTasks({retiredCommandIds:['../bad']}),/INVALID_RETIRED_COMMAND_SELECTION/);
  const Realtime=method('RealtimeTunnelClient.legacy.ts'),realtime=new Realtime(),keys=[];
  realtime.coalescedRead=async(key,_,read)=>{keys.push(key);return read()};realtime.http=client;
  await realtime.getWorkerTasks();await realtime.getWorkerTasks({retiredCommandIds:['a']});
  assert.notEqual(keys[0],keys[1]);
});
