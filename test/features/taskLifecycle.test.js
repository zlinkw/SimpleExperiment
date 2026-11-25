const test = require('node:test'), assert = require('node:assert/strict');
require('../_helpers/registerTsRequire');
const { taskLifecycle, observationMatches } = require('../../src/features/TaskLifecycle.ts');
const base = { lifecycleProtocol:2, commandId:'c', projectId:'p', workerId:'w', observedAt:new Date().toISOString() };

test('declared command exit and confirmed output remain separate and ignore scientific log wording', () => {
  const generic = {...base, executionContract:'declared-command-v1', runtimeDiagnostics:{commandId:'c',state:'anomalous',count:1}};
  assert.equal(taskLifecycle({...generic,tmux:{windowId:'@1',paneId:'%1',dead:true,exitCode:0}}).status,'completed');
  assert.equal(taskLifecycle({...generic,tmux:{windowId:'@1',paneId:'%1',dead:true,exitCode:3}}).status,'failed');
  assert.equal(taskLifecycle({...generic,tmux:{windowId:'@1',paneId:'%1',dead:true,exitCode:null}}).status,'unknown');
  assert.equal(taskLifecycle({...generic,tmux:{windowId:'@1',paneId:'%1',dead:false,phase:'running'}}).status,'running');
  assert.equal(taskLifecycle({...generic,executionQueryError:'offline',tmux:{windowId:'@1',paneId:'%1',dead:true,exitCode:0}}).status,'unknown');
  const {nextVerifiedCompletion,verifiedCompletionProjection} = require('../../src/features/VerifiedCompletion.ts');
  const plan={projectId:'p',id:'plan'}, job={index:0,workerId:'w',commandId:'c',outputDir:'out',command:'echo done'};
  const observation={...generic,tmux:{windowId:'@1',paneId:'%1',dead:true,exitCode:0}};
  assert.equal(taskLifecycle(observation).completionState,'unverified');
  assert.equal(nextVerifiedCompletion(plan,job,observation,taskLifecycle(observation),Date.now()),undefined);
  const result={runId:'c',status:'completed',present:true,verified:true,identityMatches:true,artifactsComplete:true};
  assert.equal(taskLifecycle({...observation,result:{...result,identityMatches:undefined}}).completionState,'unverified');
  const complete={...observation,result};
  assert.equal(taskLifecycle({...complete,tmux:{dead:true,exitCode:0}}).completionState,'unverified');
  job.verifiedCompletion=nextVerifiedCompletion(plan,job,complete,taskLifecycle(complete),Date.now());
  assert.equal(verifiedCompletionProjection(plan,job).status,'completed');
  assert.equal(verifiedCompletionProjection(plan,job).resultState,'complete');
  assert.equal(verifiedCompletionProjection(plan,job).runtimeDiagnostics,undefined);
  assert.deepEqual(verifiedCompletionProjection(plan,{...job,outputs:['other']}),{});
  const old=job.verifiedCompletion;
  assert.equal(nextVerifiedCompletion(plan,job,{...complete,resultQueryError:'offline'},taskLifecycle({...complete,resultQueryError:'offline'}),Date.now()),old);
  const later=new Date(Date.parse(old.verifiedAt)+1000).toISOString();
  const missing={...observation,artifactIssue:'missing',evidence:{artifacts:{networkStartedAt:later}}};
  assert.equal(taskLifecycle(missing).result,'incomplete');assert.match(taskLifecycle(missing).message,/missing/);
  assert.equal(nextVerifiedCompletion(plan,job,missing,taskLifecycle(missing),Date.now()),undefined);
  const {freshTaskObservation} = require('../../src/features/WorkerProgressEvidence.ts');
  const current = freshTaskObservation({fetchedAt:base.observedAt},{observation:{...observation,resultQueryError:'old',runtimeQueryError:'old'}},observation,Date.parse(base.observedAt),1000);
  assert.equal(current.resultQueryError,'old');
  assert.equal(current.runtimeQueryError,undefined);
  const missingArtifactLane=freshTaskObservation({fetchedAt:base.observedAt},{observation:{...complete,evidence:{execution:{networkStartedAt:base.observedAt,receivedAt:base.observedAt}}}},complete,Date.parse(base.observedAt),1000);
  assert.match(missingArtifactLane.resultQueryError,/尚未取得产物观察/);
  assert.equal(taskLifecycle(missingArtifactLane).completionState,'unverified');
});
test('declared command progress does not query research result or log semantics', async () => {
  const {queryWorkerProgress} = require('../../src/features/WorkerProgressQuery.ts');
  const task={...base,outputDir:'out',observation:{...base,executionContract:'declared-command-v1',tmux:{dead:true,exitCode:0}}};
  const result=await queryWorkerProgress({getWorkerTasks:()=>{throw Error('unexpected metadata query');}},'w',[task],
    {workerId:'w',queryComplete:true,capabilities:{taskLifecycle:2},tasks:[task],fetchedAt:base.observedAt});
  assert.equal(result.resultQueryError,undefined);
  assert.equal(result.runtimeQueryError,undefined);
  assert.equal(result.tasks[0].observation.executionContract,'declared-command-v1');
});
test('queue retains the resolved command without research mode or seed', () => {
  const queue = require('../../src/features/DistributedPlanQueue.ts');
  const initial = queue.enqueuePlan(queue.emptyDistributedQueue(),
    {projectId:'p',planFile:'plan.yaml',revision:'r',codeFingerprint:'code',jobs:[{index:0,case:'analysis',
      outputDir:'work/run',command:'python analyze.py',workingDirectory:'.',outputs:[]}]},'flow');
  const job=JSON.parse(queue.serializeDistributedQueue(initial)).plans[0].jobs[0];
  assert.equal(job.command,'python analyze.py');
  assert.equal(job.workingDirectory,'.');
  assert.deepEqual(job.outputs,[]);
  assert.equal(job.seed,undefined);
  const bound={...initial.plans[0].jobs[0],commandId:'cmd',workerId:'w'};
  assert.equal(queue.stopIdentityMatchesJob(initial.plans[0],bound,{targetCommandId:'cmd',projectId:'p',workerId:'w'}),true);
  assert.equal(queue.stopIdentityMatchesJob(initial.plans[0],bound,{targetCommandId:'cmd',projectId:'other',workerId:'w'}),false);
});
test('a declared Worker override constrains automatic allocation', () => {
  const queue=require('../../src/features/DistributedPlanQueue.ts');
  const current=queue.enqueuePlan(queue.emptyDistributedQueue(),{projectId:'p',planFile:'plan.yaml',revision:'r',codeFingerprint:'code',jobs:[{
    index:0,case:'analysis',outputDir:'work/run',command:'echo ok',workingDirectory:'.',outputs:[],automaticWorkerId:'w2',environment:'/env/a',
  }]},'flow');
  const workers=['w1','w2'].map(workerId=>({workerId,online:true,idleGpuIds:['0'],declaredJobPaths:true,codeFingerprint:'code'}));
  const result=queue.allocateAvailable(current,workers);
  assert.equal(result.dispatches[0].workerId,'w2');assert.equal(result.queue.plans[0].jobs[0].environment,'/env/a');
});
test('a declared GPU override selects only the requested available device', () => {
  const queue=require('../../src/features/DistributedPlanQueue.ts');
  const current=queue.enqueuePlan(queue.emptyDistributedQueue(),{projectId:'p',planFile:'plan.yaml',revision:'r',codeFingerprint:'code',jobs:[{
    index:0,case:'analysis',outputDir:'work/run',command:'echo ok',workingDirectory:'.',outputs:[],requestedGpuId:'1',
  }]},'flow');
  const worker={workerId:'w',online:true,idleGpuIds:['0','1'],declaredJobPaths:true,codeFingerprint:'code'};
  assert.equal(queue.allocateAvailable(current,[worker]).dispatches[0].gpuId,'1');
  assert.equal(queue.allocateAvailable(current,[{...worker,idleGpuIds:['0']}]).dispatches.length,0);
  const budget={sortPlans:plans=>plans,choose:(_plan,_job,_workers,slots)=>{
    assert.deepEqual(slots.get('w'),['1']);return{workerId:'w',gpuId:'1'};},reserve:()=>{}};
  assert.equal(queue.allocateAvailable(current,[worker],{memoryBudget:budget}).dispatches[0].gpuId,'1');
});
test('live declared commands recover from the exact Worker window without seed or CSV', () => {
  const queue = require('../../src/features/DistributedPlanQueue.ts');
  const now=Date.now(), observedAt=new Date(now).toISOString();
  const task={commandId:'cmd',projectId:'p',workerId:'w',workflowId:'flow',globalJobId:'flow:0',planFile:'plan.yaml',
    planRevision:'r',codeFingerprint:'code',experimentIndex:0,case:'analysis',outputDir:'work/run',
    command:'python analyze.py',workingDirectory:'.',outputs:[],resultPathPolicy:'declared',planJobCount:1,
    observation:{lifecycleProtocol:2,executionContract:'declared-command-v1',commandId:'cmd',projectId:'p',workerId:'w',observedAt,
      tmux:{windowId:'@1',paneId:'%1',dead:false,phase:'running'}}};
  const snapshot={workerId:'w',generatedAt:observedAt,fetchedAt:observedAt,capabilities:{taskLifecycle:2},tasks:[task]};
  const recovered=queue.mergeDurableWorkerSnapshots(queue.emptyDistributedQueue(),[snapshot],'p',now);
  const job=recovered.plans[0].jobs[0];
  assert.equal(job.command,'python analyze.py');assert.equal(job.seed,undefined);assert.equal(job.status,'running');
  job.status='completed';job.trustedTerminalStatus='completed';
  assert.equal(queue.distributedPlanRecoveryMissingCount(recovered.plans[0]),0);
  assert.equal(queue.mergeDurableWorkerSnapshots(queue.emptyDistributedQueue(),[{...snapshot,tasks:[{...task,outputs:undefined}]}],'p',now).plans.length,0);
});

test('log diagnostics do not change an ended job with complete artifacts', () => {
  const runtimeDiagnostics={schemaVersion:1,commandId:'c',runId:'c',state:'anomalous',count:1,scanComplete:true};
  const result={runId:'c',status:'completed',present:true,verified:true,identityMatches:true,artifactsComplete:true,exitCode:0};
  const observed=taskLifecycle({...base,result,runtimeDiagnostics,tmux:{windowId:'@1',paneId:'%1',dead:true,exitCode:0}});
  assert.equal(observed.status,'completed');assert.equal(observed.exitCode,0);
  assert.equal(observed.execution,'exited');assert.equal(observed.result,'complete');
  assert.equal(taskLifecycle({...base,result,runtimeDiagnostics:{...runtimeDiagnostics,scanComplete:false},tmux:{windowId:'@1',paneId:'%1',dead:true,exitCode:0}}).status,'completed');
  assert.equal(taskLifecycle({...base,result,runtimeDiagnostics:{...runtimeDiagnostics,commandId:'old'},tmux:{windowId:'@1',paneId:'%1',dead:true,exitCode:0}}).status,'completed');
  assert.equal(taskLifecycle({...base,result,runtimeDiagnostics,tmux:{windowId:'@1',paneId:'%1',dead:false,phase:'running'}}).status,'running');
});
test('admitted and starting windows are not running until the task command begins', () => {
  for (const phase of ['queued','bound','admitted','starting'])
    assert.equal(taskLifecycle({...base, tmux:{windowId:'@1',paneId:'%1',dead:false,phase}}).status,'queued', phase);
  assert.equal(taskLifecycle({...base, tmux:{windowId:'@1',paneId:'%1',dead:false}}).status,'unknown');
});
test('pull evidence advances without an acceptance event; ended shell is not success', () => {
  assert.equal(taskLifecycle({...base, tmux:{windowId:'@1',paneId:'%1',dead:false, phase:'queued'}}).status,'queued');
  assert.equal(taskLifecycle({...base, tmux:{windowId:'@1',paneId:'%1',dead:false, phase:'running'}}).status,'running');
  assert.equal(taskLifecycle({...base, tmux:{windowId:'@1',paneId:'%1',dead:true,exitCode:0}}).execution,'exited');
  assert.equal(taskLifecycle({...base, tmux:{windowId:'@1',paneId:'%1',dead:true,exitCode:0}}).status,'completed');
  assert.equal(taskLifecycle({...base, tmux:{windowId:'@1',paneId:'%1',dead:true,exitCode:3}}).status,'failed');
});
test('closed window recovers from result; failures and foreign results are not hidden', () => {
  const result={runId:'c',status:'completed',present:true,verified:true};
  assert.equal(taskLifecycle({...base,result}).status,'unknown');
  assert.equal(taskLifecycle({...base,result,tmux:{windowId:'@1',paneId:'%1',dead:true,exitCode:1}}).status,'failed');
  assert.equal(taskLifecycle({...base,result:{...result,runId:'old'}}).result,'conflict');
  assert.equal(taskLifecycle({...base,result:{...result,present:false}}).status,'unknown');
  assert.equal(taskLifecycle({...base,queryError:'offline',result}).execution,'unknown');
  assert.equal(taskLifecycle(base).status,'unknown');
});
test('unknown exit codes use this run manifest without inventing an execution failure', () => {
  const result={runId:'c',status:'completed',present:true,verified:true,identityMatches:true,artifactsComplete:true};
  for (const exitCode of [undefined,null]) {
    const tmux={windowId:'@102',paneId:'%102',dead:true,phase:'running',exitCode};
    const observed=taskLifecycle({...base,tmux,result});
    assert.equal(observed.execution,'exited'); assert.equal(observed.result,'complete'); assert.equal(observed.status,'unknown');
    assert.equal(observed.completionState,'unverified'); assert.equal(observed.exitCode,exitCode);
    for (const evidence of [undefined,{...result,runId:'old'},{...result,present:false},{...result,verified:false},{...result,status:'failed'}]) {
      const value=taskLifecycle({...base,tmux,result:evidence});
      assert.equal(value.execution,'exited');
      assert.equal(value.status,'unknown');
    }
    assert.equal(taskLifecycle({...base,tmux,result,queryError:'offline'}).status,'unknown');
  }
  for (const exitCode of [1,7,-9])
    assert.equal(taskLifecycle({...base,result,tmux:{windowId:'@1',paneId:'%1',dead:true,exitCode}}).status,'failed');
});
test('process exit and result completeness are independent of log wording',()=>{
  const result={runId:'c',status:'completed',present:true,verified:true,identityMatches:true,artifactsComplete:true};
  const clear={schemaVersion:1,commandId:'c',runId:'c',state:'clear',count:0,scanComplete:true};
  const anomaly={...clear,state:'anomalous',count:1,types:{AttributeError:1},phases:{train:1}};
  const clean=taskLifecycle({...base,result,runtimeDiagnostics:clear,tmux:{windowId:'@1',paneId:'%1',dead:true,exitCode:0}});
  assert.equal(clean.completionState,'verified');assert.equal(clean.status,'completed');
  const review=taskLifecycle({...base,result,runtimeDiagnostics:anomaly,tmux:{windowId:'@1',paneId:'%1',dead:true,exitCode:0}});
  assert.equal(review.completionState,'verified');assert.equal(review.exitCode,0);assert.equal(review.result,'complete');
  assert.equal(review.runtimeDiagnostics.phases.train,1);
  assert.equal(taskLifecycle({...base,result:{...result,status:'failed',artifactsComplete:true},tmux:{windowId:'@1',paneId:'%1',dead:true,exitCode:0}}).completionState,'unverified');
  assert.equal(taskLifecycle({...base,result,runtimeDiagnostics:{...clear,commandId:'old'},tmux:{windowId:'@1',paneId:'%1',dead:true,exitCode:0}}).completionState,'verified');
  assert.equal(taskLifecycle({...base,result:{...result,exitCode:0},runtimeDiagnostics:clear}).completionState,'unverified');
  assert.equal(taskLifecycle({...base,result:{...result,exitCode:7},runtimeDiagnostics:clear}).status,'failed');
  assert.equal(taskLifecycle({...base,result:{...result,exitCode:7},runtimeDiagnostics:clear,tmux:{windowId:'@1',paneId:'%1',dead:true,exitCode:null}}).status,'failed');
  const failed=taskLifecycle({...base,result:{...result,status:'failed',artifactsComplete:true,exitCode:7},runtimeDiagnostics:anomaly});
  assert.equal(failed.status,'failed');assert.equal(failed.result,'complete');assert.equal(failed.completionState,'unverified');
});
test('queue refresh corrects the old Worker failure label using current tmux and manifest evidence', () => {
  const Q=require('../../src/features/DistributedPlanQueue.ts');
  const queue={schemaVersion:1,plans:[{id:'wf',projectId:'p',revision:'current',jobs:[{index:0,workerId:'w',commandId:'c',status:'failed'}]}]};
  const snapshot={workerId:'w',fetchedAt:base.observedAt,generatedAt:base.observedAt,capabilities:{taskLifecycle:2},tasks:[{
    commandId:'c',projectId:'p',status:'failed',observation:{...base,tmux:{windowId:'@102',paneId:'%102',dead:true,exitCode:null},
      result:{runId:'c',status:'completed',present:true,verified:true}}}]};
  assert.equal(Q.mergeDurableWorkerSnapshots(queue,[snapshot],'p').plans[0].jobs[0].status,'unknown');
  snapshot.tasks[0].observation.tmux.exitCode=7;
  assert.equal(Q.mergeDurableWorkerSnapshots(queue,[snapshot],'p').plans[0].jobs[0].status,'failed');
});
test('live control matching ignores old revision but never another project or command', () => {
  assert.equal(observationMatches(base,base),true);
  assert.equal(observationMatches(base,{...base,projectId:'other'}),false);
  assert.equal(observationMatches(base,{...base,commandId:'other'}),false);
});
test('execution and results remain independent for live, missing, unreadable and conflicting evidence', () => {
  const result={runId:'c',status:'completed',present:true,verified:true,identityMatches:true,artifactsComplete:true};
  const live=taskLifecycle({...base,result,tmux:{windowId:'@1',paneId:'%1',dead:false,phase:'unrecognized'}});
  assert.equal(live.execution,'unknown');assert.equal(live.result,'complete');assert.equal(live.status,'unknown');
  const absent=taskLifecycle({...base,result:null,tmux:{windowId:'@1',paneId:'%1',dead:true,exitCode:0}});
  assert.equal(absent.result,'incomplete');assert.equal(absent.status,'completed');
  assert.equal(taskLifecycle({...base,result:null,queryError:'offline'}).result,'unverified');
  const unreadable=taskLifecycle({...base,result,resultQueryError:'read failed',tmux:{windowId:'@1',paneId:'%1',dead:true,exitCode:0}});
  assert.equal(unreadable.result,'unverified');assert.equal(unreadable.status,'completed');
  assert.equal(taskLifecycle({...base,result:{...result,identityMatches:false}}).result,'conflict');
});
test('legacy completion needs current identity and complete artifacts', () => {
  const tmux={windowId:'@1',paneId:'%1',dead:true,exitCode:0};
  const result={runId:'c',status:'completed',present:true,verified:true,identityMatches:true,artifactsComplete:true};
  for (const partial of [{...result,artifactsComplete:false}, {...result,artifactsComplete:undefined}, {...result,identityMatches:undefined}]) {
    const state=taskLifecycle({...base,tmux,result:partial});
    assert.equal(state.status,'completed'); assert.notEqual(state.result,'complete'); assert.equal(state.completionState,'unverified');
  }
  assert.equal(taskLifecycle({...base,tmux,result,artifactIssue:'missing'}).completionState,'unverified');
  assert.equal(taskLifecycle({...base,tmux,result}).completionState,'verified');
});
test('mismatched live observations cannot preserve an old completed card', () => {
  const Q=require('../../src/features/DistributedPlanQueue.ts');
  const queue={schemaVersion:1,plans:[{id:'wf',projectId:'p',jobs:[{index:0,workerId:'w',commandId:'c',lifecycleProtocol:2,
    status:'completed',executionState:'exited',resultState:'complete'}]}]};
  const snapshot={workerId:'w',fetchedAt:base.observedAt,generatedAt:base.observedAt,capabilities:{taskLifecycle:2},tasks:[{
    commandId:'c',projectId:'p',observation:{...base,workerId:'other',result:{runId:'c',status:'completed',present:true,verified:true}}}]};
  const job=Q.mergeDurableWorkerSnapshots(queue,[snapshot],'p').plans[0].jobs[0];
  assert.equal(job.status,'unknown');assert.equal(job.executionState,'unknown');assert.equal(job.resultState,'unverified');
});
test('real manifest queries and client projection agree for every task mode and changed filesystem evidence', () => {
  const path=require('node:path'),{spawnSync}=require('node:child_process');
  const proc=spawnSync(process.platform==='win32'?'python':'python3',['-B','-X','utf8',
    path.join(__dirname,'taskManifestEvidence.fixture.py'),path.join(__dirname,'../../src/runtime/TmuxTaskLifecycle.ts')],
    {encoding:'utf8',timeout:10000,windowsHide:true});
  assert.equal(proc.status,0,proc.stderr||proc.stdout);
  const cases=JSON.parse(proc.stdout);
  for(const item of cases){const state=taskLifecycle(item.observation);
    assert.deepEqual({executionState:state.execution,resultState:state.result,status:state.status},item.expected,item.name);}
  assert.ok(cases.length>=14);
});
test('the real queue merge consumes pulled evidence without a durable receipt or a matching old revision', () => {
  const Q=require('../../src/features/DistributedPlanQueue.ts');
  const queue={schemaVersion:1,plans:[{id:'wf',projectId:'p',revision:'current',jobs:[{index:0,workerId:'w',commandId:'c',status:'dispatching'}]}]};
  const snapshot={workerId:'w',fetchedAt:base.observedAt,generatedAt:base.observedAt,capabilities:{taskLifecycle:2},
    tasks:[{commandId:'c',projectId:'p',planRevision:'old',observation:{...base,tmux:{windowId:'@1',paneId:'%1',dead:false,phase:'running'}}}]};
  assert.equal(Q.mergeDurableWorkerSnapshots(queue,[snapshot],'p').plans[0].jobs[0].status,'running');
  snapshot.tasks[0].observation.queryError='query failed';
  assert.equal(Q.mergeDurableWorkerSnapshots(queue,[snapshot],'p').plans[0].jobs[0].status,'unknown');
  assert.equal(queue.plans[0].jobs[0].status,'dispatching');
});
test('live windows rebuild missing local cards; old cached snapshots cannot revive native execution',()=>{
  const Q=require('../../src/features/DistributedPlanQueue.ts'),now=new Date().toISOString();
  const task={workflowId:'wf',globalJobId:'wf:0',experimentIndex:0,commandId:'c',projectId:'p',workerId:'w',planFile:'experiments/plans/p.yaml',
    planRevision:'a'.repeat(64),codeFingerprint:'b'.repeat(64),case:'a',seed:42,outputDir:'work/job',collectionResultCsv:'tmp/result/job.csv',resultPathPolicy:'declared',
    observation:{...base,observedAt:now,tmux:{windowId:'@2',paneId:'%3',dead:false,phase:'running'}}};
  const live={workerId:'w',fetchedAt:now,generatedAt:now,capabilities:{taskLifecycle:2},tasks:[task]};
  const recovered=Q.mergeDurableWorkerSnapshots(Q.emptyDistributedQueue(),[live],'p');
  assert.equal(recovered.plans[0].jobs[0].status,'running');
  const legacy={...live,capabilities:{durablePlanQueue:true,schemaVersion:1}};
  assert.equal(Q.mergeDurableWorkerSnapshots(recovered,[legacy],'p').plans[0].jobs[0].status,'unknown');
  assert.equal(Q.mergeDurableWorkerSnapshots(Q.emptyDistributedQueue(),[{...live,error:'offline'}],'p').plans.length,0);
  const corrupted=JSON.parse(JSON.stringify(recovered));corrupted.plans[0].jobs[0].status='running';
  assert.equal(Q.restoreFormalJobQueue(corrupted).plans[0].jobs[0].status,'unknown');
  const missing=Q.mergeDurableWorkerSnapshots(recovered,[{...live,tasks:[{...task,observation:{...task.observation,tmux:undefined}}]}],'p');
  assert.equal(Q.workerCodeVersionAvailable(missing,'w','new-code'),true);
});
