const test=require('node:test'),assert=require('node:assert/strict'),os=require('node:os'),path=require('node:path'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
require('../_helpers/registerTsRequire');
const {analyzeRuntimeLog}=require('../../src/extension/RuntimeLogAnalysisHost.ts');
function hostMethod(name,globals={}){
 let text=fs.readFileSync(path.join(__dirname,'../../src/extension/legacy.ts'),'utf8');
 if(process.env.SIMPLE_RETRY_BASELINE==='1'){
  const read=require('node:child_process').spawnSync('git',['show','789c9144037ffd57a658cd7118121e694fcce960:src/extension/legacy.ts'],{encoding:'utf8',maxBuffer:8*1024*1024,timeout:10000,windowsHide:true});
  assert.equal(read.status,0);text=read.stdout;
 }
 const ast=ts.createSourceFile('host.ts',text,ts.ScriptTarget.Latest,true);let member;
 function visit(n){if(ts.isMethodDeclaration(n)&&n.name.getText(ast)===name)member=n;ts.forEachChild(n,visit)}visit(ast);assert.ok(member,name);
 return vm.runInNewContext(ts.transpileModule('class Host{'+member.getText(ast)+'};Host.prototype.'+name,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,
  {PlanCodeScopeHost:{resolvePlanExecutionSource:async()=>undefined},...globals});
}
test('changed original source becomes a scope warning before remote queries or stop fences',async()=>{
 const crypto=require('node:crypto'),scope=require('../../src/extension/PlanCodeScopeHost.ts');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'se-retry-source-'));fs.mkdirSync(path.join(root,'configs'));
 fs.writeFileSync(path.join(root,'plan.yaml'),'plan','utf8');fs.writeFileSync(path.join(root,'configs/base.yaml'),'changed config','utf8');
 const original='original config',revision=crypto.createHash('sha256').update('plan').digest('hex');
 const manifest={'plan.yaml':{size:4,sha256:revision},'configs/base.yaml':{size:Buffer.byteLength(original),sha256:crypto.createHash('sha256').update(original).digest('hex')}};
 const plan={planFile:'plan.yaml',revision,executionSource:{manifest,digest:crypto.createHash('sha256').update(JSON.stringify(Object.keys(manifest).sort().map(key=>[key,manifest[key]]))).digest('hex')}};
 let warnings=0;
 const retry=hostMethod('retryPulledJob',{fs:require('node:fs/promises'),path,crypto,PlanCodeScopeHost:scope,
  PulledTaskControl:{queryTask:()=>assert.fail('must choose first'),stopPulledTask:()=>assert.fail('must not cancel')},
  });
 const result=await retry.call({client:{},retryChangedSourceJobs:async(p,j,r,current,reason)=>{warnings++;assert.match(reason,/PLAN_SOURCE_CHANGED/);return {status:'cancelled'};},saveDistributedQueue:()=>assert.fail('must not requeue')},plan,{},root,()=>true);
 assert.equal(result.status,'cancelled');assert.equal(warnings,1);
});
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'se-explicit-log-review-')),context={root};let calls=0,ids=[];
 const job={index:0,commandId:'old-command',workerId:'w',outputDir:'work/job',status:'completed'},queue={plans:[{id:'wf',jobs:[job]}]},before=JSON.stringify(queue);
 const host={captureProjectContext:()=>context,projectContextIsCurrent:c=>c===context,loadDistributedQueue:async()=>queue,workerCodeSyncTargets:()=>[{id:'w'}],postState(){},
  client:{getWorkerTasks:async(worker,params)=>{calls++;ids.push(params.queries[0].runtimeLogAnalysisId);const q=params.queries[0];return {queryComplete:true,capabilities:{runtimeDiagnostics:1},tasks:[{...q,executionState:'exited',resultState:'complete',exitCode:0,
   runtimeDiagnostics:{schemaVersion:1,commandId:q.commandId,runId:q.commandId,state:'anomalous',count:1,scanComplete:calls>1,bytesRead:calls,totalBytes:2,types:{AttributeError:1},phases:{train:1}}}]};}}};
 return {host,root,queue,before,ids};
}
test('historical analysis is explicit, command-bound, incremental and never edits history or launches work',async()=>{
 const f=fixture(),report=await analyzeRuntimeLog(f.host,f.root,{workflowId:'wf',index:0});
 assert.equal(report.completionState,'review_required');assert.equal(report.exitCode,0);assert.equal(report.historyRewritten,false);
 assert.equal(new Set(f.ids).size,1);assert.equal(f.ids.length,2);assert.equal(JSON.stringify(f.queue),f.before);
});
test('offline, old protocol, wrong target and cancellation never certify clear logs',async()=>{
 const f=fixture();await assert.rejects(analyzeRuntimeLog(f.host,f.root,{commandId:'old-command',workerId:'other',outputDir:'work/job'}),/请选择/);
 f.host.client.getWorkerTasks=async()=>({queryComplete:true,capabilities:{}});
 await assert.rejects(analyzeRuntimeLog(f.host,f.root,{workflowId:'wf',index:0}),/更新/);
 f.host.client.getWorkerTasks=async()=>{throw Error('offline')};
 await assert.rejects(analyzeRuntimeLog(f.host,f.root,{workflowId:'wf',index:0}),/offline/);
 const abort=new AbortController();abort.abort();await assert.rejects(analyzeRuntimeLog(f.host,f.root,{workflowId:'wf',index:0},abort.signal),/abort/i);
 assert.equal(JSON.stringify(f.queue),f.before);
});
test('rendered panel labels and counts never paint an exit-zero anomaly or unverified history as green success',()=>{
 const html=require('../../src/ui/PanelHtml.ts').renderPanelHtml();
 const script=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
 const source=ts.createSourceFile('panel.js',script,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 const names=new Set(['taskRowStatusLabel','taskRowStatusClass','overviewTaskStats','payloadFromButton']);let functions=[];
 function visit(n){if(ts.isFunctionDeclaration(n)&&names.has(n.name?.text))functions.push(n.getText(source));ts.forEachChild(n,visit)}visit(source);
 assert.equal(functions.length,4);
 const rows=[{status:'completed',completionState:'verified'},{status:'completed',completionState:'review_required'},{status:'completed'}];
 const ctx=vm.createContext({rows,overviewTaskStatsCacheRows:null,overviewTaskStatsCacheValue:null,schedulerRowsForState:()=>rows,taskFailureLikeStatus:()=>false,taskStatusLabel:s=>s,statusClass:()=> 'status-completed',RESTORABLE_PLAN_FILE_PAYLOAD_COMMANDS:new Set(),ARTIFACT_SCOPE_COMMANDS:new Set()});
 vm.runInContext(functions.join('\n'),ctx);
 assert.match(ctx.taskRowStatusLabel(rows[1]),/完成但有异常/);assert.match(ctx.taskRowStatusLabel(rows[2]),/日志待核实/);
 assert.equal(ctx.taskRowStatusClass(rows[1]),'status-warning');assert.equal(ctx.taskRowStatusClass(rows[2]),'status-warning');
 assert.equal(ctx.overviewTaskStats({}).completed,1);
 const payload=ctx.payloadFromButton({dataset:{command:'analyzeRuntimeLog',commandId:'original-command',planId:'wf',jobIndex:'0'}});
 assert.equal(payload.commandId,'original-command');assert.equal(payload.planId,'wf');assert.equal(payload.jobIndex,0);
 assert.match(html,/重新分析运行日志/);
 const rerun=ctx.payloadFromButton({dataset:{command:'retryDistributedJob',commandId:'original-command',planId:'wf',jobIndex:'0',runtimeAnomalyRerun:'true'}});
 assert.equal(rerun.commandId,'original-command');assert.equal(rerun.runtimeAnomalyRerun,true);
});
test('analysis feedback describes findings without opening an editor or changing execution',()=>{
 const {runtimeLogAnalysisMessage}=require('../../src/extension/RuntimeLogAnalysisHost.ts');
 assert.equal(typeof runtimeLogAnalysisMessage,'function');
 assert.match(runtimeLogAnalysisMessage({completionState:'verified',exitCode:0,runtimeDiagnostics:{scanComplete:true,count:0}}),/未检出异常/);
 assert.match(runtimeLogAnalysisMessage({completionState:'review_required',exitCode:0,runtimeDiagnostics:{count:4,types:{AttributeError:4},phases:{train:2,test:2}}}),/4.*AttributeError.*train.*test/);
 assert.match(runtimeLogAnalysisMessage({completionState:'unverified',runtimeDiagnostics:{reason:'offline'}}),/offline/);
 const text=fs.readFileSync(path.join(__dirname,'../../src/extension/legacy.ts'),'utf8');
 const handler=text.slice(text.indexOf('case "analyzeRuntimeLog":'),text.indexOf('case "recallFailedJob":',text.indexOf('case "analyzeRuntimeLog":')));
 assert.doesNotMatch(handler,/openTextDocument|showTextDocument|JSON\.stringify/);
});
test('anomalous completed rerun uses exact current command and the existing native confirmation flow',async()=>{
 const job={index:0,lifecycleProtocol:2,status:'completed',workerId:'w',commandId:'c'},plan={id:'wf',resultPathPolicy:'declared',jobs:[job]};let called=0;
 const target={id:'w',host:'server'};
 const h={captureProjectContext:()=>({}),projectContextIsCurrent:()=>true,workerActionTargets:()=>[target],loadDistributedQueue:async()=>({plans:[plan]}),client:{},
  retryPulledJob:async(p,j,r,current,anomalyOnly)=>{called++;assert.equal(p,plan);assert.equal(j,job);assert.equal(anomalyOnly,true);assert.ok(current());
   h.client={};assert.ok(current());target.host='changed';assert.equal(current(),false);target.host='server';}};
 const retry=hostMethod('retryDistributedJobFromUi',{workspaceRoot:()=>'/fixture'});
 await retry.call(h,{planId:'wf',jobIndex:0,commandId:'c',runtimeAnomalyRerun:true});assert.equal(called,1);
 await assert.rejects(retry.call(h,{planId:'wf',jobIndex:0,commandId:'old',runtimeAnomalyRerun:true}),/commandId/);
 await assert.rejects(retry.call(h,{planId:'wf',jobIndex:0,commandId:'c'}),/不能恢复/);
});
test('automatic refresh follows current completed jobs until logs settle, ignoring superseded history',()=>{
 const {progressRefreshWorkerIds}=require('../../src/features/DistributedSchedulingPolicy.ts');
 const job={index:0,case:'a',seed:42,lifecycleProtocol:2,status:'completed',workerId:'w',commandId:'c',outputDir:'work/job'};
 const plan={id:'wf',projectId:'project',planFile:'p.yaml',enqueuedAt:'2026-10-16T00:00:00Z',jobs:[job]};
 const queue={plans:[{...plan,id:'old',enqueuedAt:'2026-10-15T00:00:00Z',jobs:[{...job,workerId:'old',commandId:'old-c'}]},plan]};
 assert.deepEqual(progressRefreshWorkerIds(queue,['w','old'],[]),['w']);
 const evidence={schemaVersion:1,commandId:'c',runId:'c',state:'scanning',count:0,scanComplete:false};
 const snapshots=[{workerId:'w',queryComplete:true,tasks:[{projectId:'project',commandId:'c',runtimeDiagnostics:evidence}]}];
 assert.deepEqual(progressRefreshWorkerIds(queue,['w','old'],snapshots),['w']);
 for(const state of ['clear','anomalous']){
  evidence.state=state;evidence.count=state==='anomalous'?1:0;evidence.scanComplete=true;
  assert.deepEqual(progressRefreshWorkerIds(queue,['w','old'],snapshots),[]);
 }
});
test('native anomaly rerun checks fresh evidence, honors cancelled or skipped replacement and changes only one job',async()=>{
 const crypto=require('node:crypto'),P=require('../../src/features/PulledTaskControl.ts'),events=[];
 const job={index:0,lifecycleProtocol:2,status:'completed',workerId:'w',commandId:'c',outputDir:'work/job',case:'a',seed:42};
 const other={...job,index:1,commandId:'other',status:'running',outputDir:'work/other'};
 const plan={id:'wf',planFile:'plans/p.yaml',revision:crypto.createHash('sha256').update('plan').digest('hex'),executionMode:'train_test',jobs:[job,other]};
 let selected=true,cancel=false,state={execution:'exited',status:'completed',completionState:'review_required'},stored;
 const retry=hostMethod('retryPulledJob',{fs:{readFile:async()=> 'plan'},path,crypto,
  PulledTaskControl:{queryTask:async()=>({state}),stopPulledTask:async(_c,p,j)=>{assert.equal(j.commandId,'c');events.push('fence');},returnPulledJobToLocal:P.returnPulledJobToLocal},
  PlanRunHost:class {async replace(p,body,validation){events.push('confirm');assert.equal(validation.jobs.length,1);assert.equal(validation.jobs[0].output_dir,'work/job');if(cancel)throw Error('REPLACEMENT_CANCELLED');body.assignedExperimentIndices=selected?[0]:[];}},makeOpId:()=> 'rerun'});
 const h={client:{},assertPlanSubmissionWorkers:async()=>events.push('query'),loadDistributedQueue:async()=>({plans:[plan]}),
  saveDistributedQueue:async(_r,q,options)=>{stored=options?.mutateLatest?options.mutateLatest(structuredClone({plans:[plan]})):q;events.push('save');},tickDistributedQueue:async()=>events.push('tick')};
 for(const variant of ['running','clear','cancel','skip','success','missing']){
  events.length=0;stored=undefined;cancel=variant==='cancel';selected=variant!=='skip';
  state={execution:variant==='running'?'running':variant==='missing'?'missing':'exited',status:variant==='missing'?'unknown':'completed',completionState:variant==='clear'?'verified':'review_required'};
  if(['running','clear','cancel'].includes(variant))await assert.rejects(retry.call(h,plan,job,'/fixture',()=>true,true),/运行|异常|CANCELLED/);
  else await retry.call(h,plan,job,'/fixture',()=>true,variant!=='missing');
  if(variant==='success'||variant==='missing'){
   assert.deepEqual(events,['fence','query','confirm','save','tick']);assert.equal(stored.plans[0].jobs[0].status,'pending');
   assert.equal(stored.plans[0].jobs[0].runtimeDiagnostics,undefined);assert.deepEqual(stored.plans[0].jobs[1],other);
  }else{assert.equal(stored,undefined);assert.ok(!events.includes('tick'));
   assert.equal(events.includes('fence'),variant==='cancel'||variant==='skip');}
 }
});
test('actual analysis button returns a visible command message without opening any document',async()=>{
 const text=fs.readFileSync(path.join(__dirname,'../../src/extension/legacy.ts'),'utf8'),ast=ts.createSourceFile('host.ts',text,ts.ScriptTarget.Latest,true);let clause;
 function visit(n){if(ts.isCaseClause(n)&&n.expression.getText(ast)==='"analyzeRuntimeLog"')clause=n;ts.forEachChild(n,visit)}visit(ast);assert.ok(clause);
 const {runtimeLogAnalysisMessage}=require('../../src/extension/RuntimeLogAnalysisHost.ts');let documents=0;
 const handler=vm.runInNewContext(ts.transpileModule('async function run(message){'+clause.statements.map(n=>n.getText(ast)).join('\n')+'};run;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,
  {workspaceRoot:()=>'/fixture',analyzeRuntimeLog:async()=>({completionState:'verified',exitCode:0}),runtimeLogAnalysisMessage,
   vscode:{workspace:{openTextDocument(){documents++;}},window:{showTextDocument(){documents++;}}}});
 const statuses=[],h={postUiCommandStatus:(...args)=>statuses.push(args)};
 const dispatch=hostMethod('withUiCommandStatus',{localCommandReleasesAfterTrigger:()=>false,PLAN_SUBMISSION_COMMANDS:new Set(),OperationOutcome_1:{operationOutcomeFor:()=> 'completed'}});
 await dispatch.call(h,'action','analyzeRuntimeLog',{},()=>handler.call(h,{}));
 assert.equal(documents,0);assert.equal(statuses.at(-1)[1],'completed');assert.match(statuses.at(-1)[3],/完整日志未检出异常/);
});
test('native rerun commits against the latest queue without losing unrelated progress or replacing a new command',async()=>{
 const crypto=require('node:crypto'),P=require('../../src/features/PulledTaskControl.ts');
 const plan={id:'p',planFile:'plans/p.yaml',revision:crypto.createHash('sha256').update('plan').digest('hex'),codeFingerprint:'original',executionMode:'train_test',jobs:[
  {index:0,commandId:'original-command',workerId:'w',status:'completed',outputDir:'work/a'},
  {index:1,commandId:'other',workerId:'w',status:'running',outputDir:'work/b'}]};
 let latest,starts=0;
 const retry=hostMethod('retryPulledJob',{fs:{readFile:async()=> 'plan'},path,crypto,PulledTaskControl:{
  queryTask:async()=>({state:{execution:'exited',status:'completed',completionState:'review_required'}}),stopPulledTask:async()=>{},returnPulledJobToLocal:P.returnPulledJobToLocal},
  PlanRunHost:class{async replace(_p,body){body.assignedExperimentIndices=[0];}},makeOpId:()=> 'rerun'});
 const h={client:{},assertPlanSubmissionWorkers:async()=>{},saveDistributedQueue:async(_root,q,options)=>{assert.equal(q,undefined);latest=options.mutateLatest(latest);},tickDistributedQueue:async()=>{starts++;}};
 latest={plans:[structuredClone(plan)]};latest.plans[0].jobs[1].status='completed';
 await retry.call(h,plan,plan.jobs[0],'/fixture',()=>true,true);
 assert.equal(latest.plans[0].jobs[0].status,'pending');assert.equal(latest.plans[0].jobs[1].status,'completed');assert.equal(starts,1);
 latest={plans:[structuredClone(plan)]};latest.plans[0].jobs[0].commandId='new-command';
 await assert.rejects(retry.call(h,plan,plan.jobs[0],'/fixture',()=>true,true),/身份已变化/);assert.equal(starts,1);assert.equal(latest.plans[0].jobs[0].commandId,'new-command');
});

test('a committed one-job rerun remains queued when the next scheduler tick fails',async()=>{
 const crypto=require('node:crypto'),P=require('../../src/features/PulledTaskControl.ts');
 const job={index:0,workerId:'w',commandId:'old',status:'unknown',lifecycleProtocol:2,outputDir:'work/a'},
  plan={id:'p',planFile:'p.yaml',revision:crypto.createHash('sha256').update('plan').digest('hex'),codeFingerprint:'code',jobs:[job]};
 let latest={plans:[plan]},optionsSeen,errors=[];
 const retry=hostMethod('retryPulledJob',{fs:{readFile:async()=> 'plan'},path,crypto,PulledTaskControl:{
  queryTask:async()=>({state:{execution:'missing',status:'unknown'}}),stopPulledTask:async()=>{},returnPulledJobToLocal:P.returnPulledJobToLocal},
  PlanRunHost:class{async replace(_p,body){body.assignedExperimentIndices=[0];}},makeOpId:()=> 'rerun',errorMessage:e=>e.message});
 const h={client:{},assertPlanSubmissionWorkers:async()=>{},saveDistributedQueue:async(_root,_queue,options)=>{optionsSeen=options;latest=options.mutateLatest(latest);},
  tickDistributedQueue:async()=>{throw Error('另一窗口已更新该项目队列');},postState(){},recordActionError:e=>errors.push(e)};
 const result=await retry.call(h,plan,job,'/fixture',()=>true);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(result.status,'queued');assert.equal(optionsSeen.controlMutation,true);
 assert.equal(latest.plans[0].jobs[0].status,'pending');assert.ok(latest.plans[0].jobs[0].nextCommandId);
 assert.equal(errors.length,1);assert.match(errors[0].message,/已重新排队/);
});

test('the retry command acknowledges local requeue explicitly without claiming the job is running',async()=>{
 const statuses=[],run=hostMethod('withUiCommandStatus',{localCommandReleasesAfterTrigger:()=>false,PLAN_SUBMISSION_COMMANDS:new Set(),
  OperationOutcome_1:{operationOutcomeFor:()=>({})},isUiCommandRemotePending:()=>false,isUiCommandCancelled:()=>false});
 const h={postUiCommandStatus:(_id,status,_command,message)=>statuses.push({status,message})};
 await run.call(h,'click','retryDistributedJob',{},async()=>({status:'queued',source:'local',message:'此 job 已重新进入本机待派队列；实际执行状态由远端查询确认。'}));
 assert.equal(statuses.at(-1).status,'completed');assert.match(statuses.at(-1).message,/本机待派队列/);assert.doesNotMatch(statuses.at(-1).message,/运行中/);
});

function changedSourceFixture(choice, options={}) {
 const crypto=require('node:crypto'),events=[],revision=crypto.createHash('sha256').update('current plan').digest('hex');
 const a={index:5,case:'pad',seed:44,workerId:'h20',commandId:'old-pad',status:'unknown',outputDir:'work/pad',collectionResultCsv:'results/pad.csv'},
  b={index:0,case:'other',seed:42,workerId:'other',commandId:'old-other',status:'completed',outputDir:'work/other',collectionResultCsv:'results/other.csv',verifiedCompletion:{original:true}};
 const plan={id:'original-workflow',projectId:'project',planFile:'p.yaml',revision:'old-revision',codeFingerprint:'old-fingerprint',executionSource:{digest:'old-source'},jobs:[a,b]};
 const before=JSON.stringify(plan),source={digest:'new-source'},selected=choice==='重跑全部 job'?[7,0]:[7];
 let stored={plans:[structuredClone(plan)]},enqueued;
 const jobs=[{index:7,case:'pad',seed:44,output_dir:'work/pad',result_csv:'results/pad.csv'},
  {index:0,case:'other',seed:42,output_dir:'work/other',result_csv:'results/other.csv'}];
 const h={client:{},manualDispatchInFlight:new Set(),captureProjectContext:()=>({root:'/fixture'}),
  localDistributedCodeFingerprint:async()=>options.changedDuringSync&&events.includes('sync')?'changed-again':'new-fingerprint',
  lastCodeSyncState:{fingerprint:'new-fingerprint',workerVersions:{h20:{fingerprint:'new-fingerprint'},other:{fingerprint:options.partialSync?'old-fingerprint':'new-fingerprint'}}},
  workerCodeSyncTargets:()=>[{id:'h20'},{id:'other'}],loadDistributedQueue:async()=>stored,
  refreshLocalPlanMetadataForAction:async()=>events.push('metadata'),stampPlanRevision:body=>body.planRevision=revision,
  assertPlanLocalConfigFiles:async()=>events.push('config'),selectDistributedPlanPrimary:async()=>events.push('primary'),
  ensureCodeReadyForRun:async()=>events.push('sync'),runPlanPreflight:async()=>({validation:{execution_mode:'train_test',result_path_policy:'declared',jobs,existing:[]}}),
  assertPlanSubmissionWorkers:async(_body,v)=>{events.push('workers');assert.deepEqual([...v.validation.jobs.map(j=>j.index)],selected);},
  saveDistributedQueue:async(_root,_queue,opts)=>{stored=opts.mutateLatest(stored);events.push('save');},
  enqueueDistributedPlan:async(body,v,skip)=>{events.push('enqueue');assert.equal(skip,true);assert.equal(body.executionSource,source);assert.equal(body.planRevision,revision);
   assert.deepEqual([...v.validation.jobs.map(j=>j.index)],selected);enqueued={body,v};stored.plans.push({id:body.submissionWorkflowId,jobs:[]});return {enqueued:true};},
  tickDistributedQueue:async()=>{assert.equal(h.manualDispatchInFlight.size,0);events.push('tick');},recordActionError:e=>{throw e;}};
 const run=hostMethod('retryChangedSourceJobs',{fs:{readFile:async()=> 'current plan'},path,crypto,UiCommandCancelled:class extends Error{},
  vscode:{window:{showWarningMessage:async(text,_opts,...buttons)=>{events.push('choose');assert.match(text,/保留其他 job 的旧版本结果/);assert.deepEqual(buttons,['仅重跑当前 job','重跑全部 job']);return choice;}}},
  PulledTaskControl:{queryTask:async(_c,_p,j,_timeout,query)=>{assert.equal(query?.executionOnly,true);events.push('query:'+j.commandId);return {state:{execution:options.running?'running':'missing'}};},
   stopPulledTask:async(_c,p,j)=>{assert.equal(p.id,'original-workflow');events.push('fence:'+j.commandId);}},
  PlanCodeScopeHost:{resolvePlanExecutionSource:async(_h,p)=>{assert.equal(p.executionSource,undefined);assert.equal(p.revision,revision);return source;},
   verifyLocalPlanSource:async()=>events.push('source')},
  planValidationFromResult:r=>r.validation,makeOpId:()=> 'op',errorMessage:e=>e.message,
 selectRerunWorkflowInstance:require('../../src/results/plan-run-intent-selector.ts').selectRerunWorkflowInstance,
  PlanRunHost:class{async replace(p,body,v){events.push('confirm-paths');assert.equal(p.codeFingerprint,'new-fingerprint');
   assert.deepEqual([...v.jobs.map(j=>j.index)],selected);if(options.cancelPaths)throw Error('REPLACEMENT_CANCELLED');
   body.assignedExperimentIndices=selected;body.existingOutputChoice='rerun_all';
   if(options.replacedCommand)stored.plans[0].jobs[0].commandId='different-command';}}});
 return {run:()=>run.call(h,plan,a,'/fixture',()=>true,'PLAN_SOURCE_CHANGED: configs/base.yaml'),h,events,plan,before,get stored(){return stored},get enqueued(){return enqueued}};
}
test('source warning cancellation performs no network, stop, sync, cleanup or queue writes',async()=>{
 const f=changedSourceFixture(undefined);assert.equal((await f.run()).status,'cancelled');assert.deepEqual(f.events,['choose']);assert.equal(JSON.stringify(f.plan),f.before);
});
test('current-only source rerun resolves current declarations and keeps other source/completion identities',async()=>{
 const f=changedSourceFixture('仅重跑当前 job');assert.equal((await f.run()).status,'queued');
 assert.ok(f.enqueued);assert.equal(JSON.stringify(f.plan),f.before);assert.equal(JSON.stringify(f.stored.plans[0]),f.before);
 assert.deepEqual(f.events.filter(e=>e.startsWith('fence:')),['fence:old-pad']);
 assert.ok(f.events.indexOf('fence:old-pad')<f.events.indexOf('sync'),'fence late old submissions before uploading changed inputs');
 assert.ok(f.events.indexOf('sync')<f.events.indexOf('confirm-paths'));assert.ok(f.events.includes('workers'));assert.equal(f.h.manualDispatchInFlight.size,0);
});
test('all-job source rerun requires the explicit all choice and fences each selected original command',async()=>{
 const f=changedSourceFixture('重跑全部 job');await f.run();assert.ok(f.enqueued);
 assert.deepEqual(f.events.filter(e=>e.startsWith('fence:')),['fence:old-pad','fence:old-other']);assert.equal(JSON.stringify(f.plan),f.before);
});
test('running tasks and sources changed during sync prevent deletion and new submission',async()=>{
 for(const opts of [{running:true},{changedDuringSync:true}]){
  const f=changedSourceFixture('仅重跑当前 job',opts);await assert.rejects(f.run(),/运行|确认期间已变化/);
  assert.equal(f.enqueued,undefined);assert.ok(!f.events.includes('confirm-paths'));
  assert.equal(f.events.some(e=>e.startsWith('fence:')),!opts.running);assert.equal(f.h.manualDispatchInFlight.size,0);
 }
});
test('path cancellation and concurrent command replacement never enqueue a source rerun',async()=>{
 for(const opts of [{cancelPaths:true},{replacedCommand:true}]){
  const f=changedSourceFixture('仅重跑当前 job',opts);await assert.rejects(f.run(),/CANCELLED|身份已变化/);
  assert.equal(f.enqueued,undefined);assert.equal(f.h.manualDispatchInFlight.size,0);
 }
});
test('a partially synced Worker set cannot enter replacement or current-source admission',async()=>{
 const f=changedSourceFixture('仅重跑当前 job',{partialSync:true});
 await assert.rejects(f.run(),/全部启用 Worker/);assert.equal(f.enqueued,undefined);
 assert.ok(!f.events.includes('confirm-paths'));assert.equal(f.h.manualDispatchInFlight.size,0);
});
test('repeated confirmation of the same old card and accepted inputs never repeats sync, fences, deletion or enqueue',async()=>{
 const f=changedSourceFixture('仅重跑当前 job');await f.run();const count=f.events.length;
 const repeated=await f.run();assert.equal(repeated.status,'queued');
 assert.deepEqual(f.events.slice(count),['choose']);assert.equal(f.stored.plans.length,2);
});
