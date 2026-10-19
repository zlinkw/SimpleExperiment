const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
require('../_helpers/registerTsRequire');
const source=fs.readFileSync(path.resolve(__dirname,'../../src/extension/legacy.ts'),'utf8');
const ast=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true);
function method(name,globals={}){let found;function visit(n){if(ts.isMethodDeclaration(n)&&n.name.getText(ast)===name)found=n;ts.forEachChild(n,visit);}visit(ast);assert.ok(found,name);
 return vm.runInNewContext(ts.transpileModule('class Host{'+found.getText(ast)+'};Host.prototype.'+name,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,globals);}
function deps(){let query;try{query=require('../../src/features/WorkerTaskQuery.ts');}catch{}return {WorkerProgressQuery:require('../../src/features/WorkerProgressQuery.ts'),WorkerTaskQuery:query,workspaceRoot:()=>'/fixture',errorMessage:e=>e.message,RequestBudget_1:{RequestBudgetDeniedError:class extends Error{}},workerTaskSnapshotPayload:x=>x,workerTaskLooksRunning:()=>false,PulledTaskControl:require('../../src/features/PulledTaskControl.ts')};}
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
test('closed native windows keep querying only current completed manifests, never every historical run',()=>{
 const {workerTaskQueries}=deps().WorkerTaskQuery;
 const old={id:'old',projectId:'project',planFile:'p.yaml',enqueuedAt:'2026-10-14T00:00:00Z',jobs:[{index:0,case:'a',seed:42,workerId:'worker',commandId:'old',outputDir:'work/a',status:'completed',lifecycleProtocol:2}]};
 const current={...old,id:'new',enqueuedAt:'2026-10-14T01:00:00Z',jobs:[{...old.jobs[0],commandId:'new'}]};
 assert.deepEqual(workerTaskQueries({plans:[old,current]},'worker').map(row=>row.commandId),['new']);
});
test('Worker failure is checked before any existing-output replacement in the real submission method',async()=>{
 const finish=method('finishDistributedPlanSubmission',{WorkerPreparation:require('../../src/features/WorkerPreparation.ts').WorkerPreparation,PlanRunHost:require('../../src/extension/PlanRunHost.ts').PlanRunHost,WorkflowBinding:{bindWorkflowWorkspace:()=>({}),assertWorkflowWorkspace(){}},workspaceRoot:()=>'/fixture',stringField:(x,k)=>x[k]||'',planValidationFromResult:x=>x.validation,isUiCommandCancelled:()=>false,errorMessage:e=>e.message,DistributedPlanQueue:{distributedSubmissionProgress:()=>({status:'succeeded'})}});
 const calls=[],host={planSubmissionOperationId:()=>'',submissionStillCurrent:()=>true,distributedCodeVersionHold:async()=>undefined,
 waitForPlanSubmission:async(_,fn)=>fn(),recordPlanSubmissionTiming(){},recordPlanSubmissionTimingByOperation(){},
 ensureCodeReadyForRun:async(_c,_b,_p,ready)=>{calls.push('sync');ready('fixture');},stampWorkerPoolManualTarget(){},runPlanPreflight:async()=>({validation:{jobs:[{index:0,output_dir:'work/job'}]}}),workerActionTargets:()=>[],enabledWorkerConfigs:()=>[],localOperations:{},localDistributedCodeFingerprint:async()=>'code',planValidationCacheKey:()=>'',planSchedulerWorkerId:()=>'',
 assertPlanSubmissionWorkers:async()=>{calls.push('workers');throw Error('nwpu3 unavailable');},
 confirmDistributedPlanExistingOutputs:async()=>calls.push('delete'),enqueueDistributedPlan:async()=>calls.push('enqueue'),assertExecutionCondaEnvReady(){},reportPlanStage(){},legacySourceFreezeWorkerNames(){return [];},finishPlanSubmissionProgress(){}};
 await assert.rejects(finish.call(host,'runPlan',{}, {},{planFile:'plans/p.yaml'}),/nwpu3 unavailable/);
 assert.deepEqual(calls,['sync','workers']);
});

test('the real UI action passes its local submission context into the real distributed submission',async()=>{
 const root=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'se-action-submit-')),calls=[],body={planFile:'plans/p.yaml'},plan={planFile:body.planFile};
 const globals={WorkerPreparation:require('../../src/features/WorkerPreparation.ts').WorkerPreparation,PlanRunHost:require('../../src/extension/PlanRunHost.ts').PlanRunHost,workspaceRoot:()=>root,
  WorkflowBinding:{bindWorkflowWorkspace:()=>({root}),assertWorkflowContext(){},assertPlanSeedContract(){},assertWorkflowWorkspace(){}},
  PLAN_SUBMISSION_COMMANDS:new Set(['runPlan','reproducePlan']),PLAN_PREFLIGHT_COMMANDS:new Set(),actionCommandMap:{runPlan:'run-plan',reproducePlan:'reproduce-plan'},directWorkerActionMap:{},
  assertSingleProjectWorkspace(){},pluginProjectAdapterRules:()=>({}),operationResultPlanFile:b=>b.planFile,projectOutputGateReason:()=>'',LENIENT_RUN:false,
  stringField:(x,k)=>x[k]||'',stringArrayField:()=>[],uniqueStrings:x=>x,usableSelectionKey:()=>'',preparePlanSafeRetry:async()=>false,makeOpId:()=> 'provenance',
  isUiCommandCancelled:()=>false,errorMessage:e=>e.message,setTimeout};
 const host={context:{globalStorageUri:{fsPath:root}},projectContextGeneration:1,localPlanMetadata:{detectedProject:{}},localOperations:{},
  actionBody:()=>body,resolveWorkerEndpointId:()=>'',assertRetryPlanContext(){},refreshLocalPlanMetadataForAction:async()=>{},stampPlanRevision(){},ensureManualStopReason:async()=>{},
  assertPlanTopologyReady(){},assertPlanLocalConfigFiles:async()=>{},localPlanForActionBody:()=>plan,distributedPlanEligible:()=>true,
  selectDistributedPlanPrimary:async()=>{},assertExecutionWorkersReady(){},assertExecutionAgentProjectsReady(){},assertPlanNotAlreadyActive:async()=>{},
  ensureSimpleSftpReadyForSetup:async()=>true,confirmPlanRunSubmission:async()=>{},recordRunGitProvenance:async()=>({}),
  planSubmissionOperationId:()=> 'plan-submit-original',submissionStillCurrent:()=>true,distributedCodeVersionHold:async()=>undefined,
  waitForPlanSubmission:async(_,fn)=>fn(),recordPlanSubmissionTiming(){},recordPlanSubmissionTimingByOperation(){},
  ensureCodeReadyForRun:async(_c,_b,_p,ready)=>{calls.push('sync');ready('fixture');},stampWorkerPoolManualTarget(){},workerActionTargets:()=>[],runPlanPreflight:async()=>({validation:{jobs:[]}}),enabledWorkerConfigs:()=>[],
  localDistributedCodeFingerprint:async()=>'code',planValidationCacheKey:()=>'',planSchedulerWorkerId:()=>'',
  assertPlanSubmissionWorkers:async()=>{calls.push('workers');throw Error('fixture Worker unavailable');},reportPlanStage(){},legacySourceFreezeWorkerNames(){return [];},finishPlanSubmissionProgress(){},
  confirmDistributedPlanExistingOutputs:async()=>calls.push('delete'),enqueueDistributedPlan:async()=>calls.push('enqueue')};
 host.finishDistributedPlanSubmission=method('finishDistributedPlanSubmission',{...globals});
 await assert.rejects(method('runActionCommandCore',{...globals}).call(host,'runPlan',{clientActionId:'original'}),/fixture Worker unavailable/);
 assert.deepEqual(calls,['sync','workers']);
 for(const field of ['submissionOperationIdLocal','reportPlanStageLocal']){const descriptor=Object.getOwnPropertyDescriptor(body,field);assert.equal(descriptor.enumerable,false);assert.equal(descriptor.writable,true);}
 assert.equal(body.submissionOperationIdLocal,'plan-submit-original');
 const saved=await new globals.PlanRunHost(host,root).load('plan-submit-original');assert.equal(saved.recovery.lastError,'fixture Worker unavailable');
});
