const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
require('../_helpers/registerTsRequire');
const source=fs.readFileSync(path.resolve(__dirname,'../../src/extension/legacy.ts'),'utf8');
const ast=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true);
function method(name,globals={}){let found;function visit(n){if(ts.isMethodDeclaration(n)&&n.name.getText(ast)===name)found=n;ts.forEachChild(n,visit);}visit(ast);assert.ok(found,name);
 return vm.runInNewContext(ts.transpileModule('class Host{'+found.getText(ast)+'};Host.prototype.'+name,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,globals);}
function deps(){let query;try{query=require('../../src/features/WorkerTaskQuery.ts');}catch{}return {WorkerTaskQuery:query,workspaceRoot:()=>'/fixture',errorMessage:e=>e.message,RequestBudget_1:{RequestBudgetDeniedError:class extends Error{}},workerTaskSnapshotPayload:x=>x,workerTaskLooksRunning:()=>false,PulledTaskControl:require('../../src/features/PulledTaskControl.ts')};}
test('real Python query isolates 99 missing identities and malformed entries without hiding live windows',()=>{
 const p=require('node:child_process').spawnSync(process.platform==='win32'?'python':'python3',['-B','-X','utf8',path.join(__dirname,'planRunQuery.fixture.py'),path.join(__dirname,'../../src/runtime/TmuxTaskLifecycle.ts')],{encoding:'utf8',timeout:10000,windowsHide:true});
 assert.equal(p.status,0,p.stderr||p.stdout);assert.deepEqual(JSON.parse(p.stdout),{ok:true,invalidHistoryIsolated:101,livePreserved:true});
});
test('large active query selections are bounded and retain every command',async()=>{
 const sizes=[],host={client:{getWorkerTasks:async(_,o)=>{sizes.push(o.queries.length);return {queryComplete:true,tasks:[],capabilities:{taskLifecycle:2}};}},
 cachedWorkerTaskSnapshot:()=>undefined,loadDistributedQueue:async()=>({plans:[{id:'p',projectId:'project',jobs:Array.from({length:1201},(_,i)=>({workerId:'worker',commandId:'c'+i,outputDir:'work/'+i,status:'unknown'}))}]}),storeWorkerTaskSnapshot(){},postState(){}};
 const result=await method('refreshWorkerTaskSnapshot',deps()).call(host,'worker','/fixture','key');assert.deepEqual(sizes,[500,500,201]);assert.equal(result.queryComplete,true);
});
test('actual refresh excludes invalid and finished history, preserves current query evidence and raw failures',async()=>{
 const historical={id:'old',jobs:Array.from({length:99},(_,index)=>({workerId:'worker',commandId:'old-'+index,status:'failed',outputDir:'work/old'}))};
 const current={id:'current',projectId:'project',jobs:[{workerId:'worker',commandId:'live',status:'running',outputDir:'work/live'}]};
 let requests=[];const host={client:{getWorkerTasks:async(_id,options)=>{requests.push(options.queries);assert.deepEqual(options.queries.map(q=>q.commandId),['live']);return {queryComplete:true,capabilities:{taskLifecycle:2},tasks:[],queryErrors:[{commandId:'legacy',error:'legacy query skipped'}]};}},
  cachedWorkerTaskSnapshot:()=>undefined,loadDistributedQueue:async()=>({plans:[historical,current]}),storeWorkerTaskSnapshot(){},postState(){}};
 const refresh=method('refreshWorkerTaskSnapshot',deps());
 const result=await refresh.call(host,'worker','/fixture','cache');
 assert.equal(requests.length,1);assert.equal(result.queryComplete,true);assert.equal(result.queryErrors.length,1);assert.equal(result.error,undefined);
 host.client.getWorkerTasks=async()=>{throw Error('HTTP 400 /api/worker/tasks/query: TASK_QUERY_IDENTITY_REQUIRED');};
 const failed=await refresh.call(host,'worker','/fixture','cache');assert.match(failed.error,/HTTP 400.*TASK_QUERY_IDENTITY_REQUIRED/);
});
test('Worker failure is checked before any existing-output replacement in the real submission method',async()=>{
 const finish=method('finishDistributedPlanSubmission',{WorkflowBinding:{bindWorkflowWorkspace:()=>({}),assertWorkflowWorkspace(){}},workspaceRoot:()=>'/fixture',stringField:(x,k)=>x[k]||'',planValidationFromResult:x=>x.validation,isUiCommandCancelled:()=>false,errorMessage:e=>e.message,DistributedPlanQueue:{distributedSubmissionProgress:()=>({status:'succeeded'})}});
 const calls=[],host={planSubmissionOperationId:()=>'',submissionStillCurrent:()=>true,distributedCodeVersionHold:async()=>undefined,
 waitForPlanSubmission:async(_,fn)=>fn(),recordPlanSubmissionTiming(){},recordPlanSubmissionTimingByOperation(){},
 ensureCodeReadyForRun:async()=>calls.push('sync'),runPlanPreflight:async()=>({validation:{jobs:[{index:0,output_dir:'work/job'}]}}),workerActionTargets:()=>[],
 assertPlanSubmissionWorkers:async()=>{calls.push('workers');throw Error('nwpu3 unavailable');},
 confirmDistributedPlanExistingOutputs:async()=>calls.push('delete'),enqueueDistributedPlan:async()=>calls.push('enqueue'),assertExecutionCondaEnvReady(){},reportPlanStage(){},finishPlanSubmissionProgress(){}};
 await assert.rejects(finish.call(host,'runPlan',{}, {},{planFile:'plans/p.yaml'}),/nwpu3 unavailable/);
 assert.deepEqual(calls,['sync','workers']);
});
