const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
require('../_helpers/registerTsRequire');
const {runSelectedPlans}=require('../../src/extension/SelectedPlanBatchHost.ts');
const {preparePlanSafeRetry}=require('../../src/features/PlanSafeRetry.ts');
function fixture(){
 const calls=[],context={root:'/fixture'},host={client:{},localOperations:{},localPlanMetadata:{plans:['a','b','c'].map(name=>({planFile:'plans/'+name+'.yaml'}))},
  captureProjectContext:()=>context,projectContextIsCurrent:c=>c===context&&!host.changed,refreshLocalPlanMetadataForAction:async()=>{},
  workerActionTargets:()=>[{id:'w',host:'host',user:'u',port:22,project_dir:'/project'}],planSubmissionOperationId:m=>'plan-submit-'+m.clientActionId,
  runActionCommand:async(command,m)=>{calls.push({command,...m});host.localOperations[host.planSubmissionOperationId(m)]={status:'succeeded',message:'queue saved'};},
  finishPlanSubmissionProgress(m,status,message){host.localOperations[host.planSubmissionOperationId(m)]={status,message};}};
 return {host,calls};
}
test('five new PLAN submissions check every Worker window without waiting for unrelated result or log analysis',async()=>{
 const f=fixture(),reads=[];
 const files=['a','b','c','d','e'].map(name=>'plans/'+name+'.yaml');
 f.host.localPlanMetadata.plans=files.map(planFile=>({planFile}));
 Object.assign(f.host,{taskLifecycleProtocol:2,loadDistributedQueue:async()=>({schemaVersion:1,plans:[]}),
  workerActionTargets:()=>[{id:'fast'},{id:'many-finished-jobs'}],client:{getWorkerTasks:async(worker,options)=>{
   reads.push(worker);assert.equal(options.executionOnly,true);
   return {queryComplete:true,executionOnly:true,capabilities:{taskLifecycle:2},tasks:[]};
  }}});
 const submit=f.host.runActionCommand;
 f.host.runActionCommand=async(command,message)=>{
  await preparePlanSafeRetry(f.host,message.planFile,()=>assert.fail('no live tasks to stop'),()=>Error('cancelled'));
  await submit(command,message);
 };
 const report=await runSelectedPlans(f.host,{planFiles:files});
 assert.equal(report.status,'completed');assert.deepEqual(f.calls.map(row=>row.planFile),files);
 assert.equal(reads.length,10);assert.equal(reads.filter(id=>id==='many-finished-jobs').length,5);
});
test('the fourth PLAN can retire six missing original inputs without pulling unrelated logs or replaying the first three PLANs',async()=>{
 const f=fixture(),files=['a','b','c','tmdc'].map(name=>'plans/'+name+'.yaml'),cancelled=new Set(),posts=[];
 f.host.localPlanMetadata.plans=files.map(planFile=>({planFile}));
 let queue={schemaVersion:1,plans:[{id:'old-tmdc',planFile:files[3],jobs:Array.from({length:6},(_,index)=>({index,workerId:index<3?'w1':'w2',
  commandId:'old-'+index,status:'unknown',lifecycleProtocol:2,outputDir:'work/tmdc/'+index}))},
  {id:'other-live',planFile:'plans/other.yaml',jobs:[{index:0,status:'running',commandId:'other',workerId:'w1'}]}]};
 Object.assign(f.host,{taskLifecycleProtocol:2,distributedQueueGeneration:0,distributedPlanStopEpoch:0,
  workerActionTargets:()=>[{id:'w1'},{id:'w2'}],loadDistributedQueue:async()=>structuredClone(queue),
  saveDistributedQueue:async(_,value,options)=>{queue=options.mutateLatest(queue);},detachStaleDistributedTick(){},postState(){},client:{
   postWorkerAction:async(_,action,request)=>{assert.equal(action,'stop-worker-task');posts.push(request.targetCommandId);cancelled.add(request.targetCommandId);return new Promise(()=>{});},
   getWorkerTasks:async(worker,options)=>{
    if(!options.executionOnly)throw Error('任务状态查询超时：unrelated historical analysis');
    return {queryComplete:true,capabilities:{taskLifecycle:2},tasks:options.queries.map(query=>({observation:{...query,observedAt:'now',cancelled:cancelled.has(query.commandId)}}))};
   }}});
 const run=f.host.runActionCommand;
 f.host.runActionCommand=async(command,message)=>{
  await preparePlanSafeRetry(f.host,message.planFile,()=>assert.fail('no active windows to stop'),()=>Error('cancelled'));
  await run(command,message);
 };
 const result=await runSelectedPlans(f.host,{planFiles:files});
 assert.equal(result.status,'completed');assert.deepEqual(f.calls.map(row=>row.planFile),files);
 assert.deepEqual([...new Set(posts)].sort(),Array.from({length:6},(_,i)=>'old-'+i));assert.equal(posts.length,6);
 assert.deepEqual(queue.plans.map(row=>row.id),['other-live']);assert.equal(queue.plans[0].jobs[0].commandId,'other');
});
test('only explicitly selected canonical files use the ordinary single-plan workflow, with unique operation identities',async()=>{
 const {host,calls}=fixture();const report=await runSelectedPlans(host,{planFiles:['plans/c.yaml','plans/a.yaml','plans/c.yaml']});
 assert.equal(report.status,'completed');assert.deepEqual(calls.map(x=>x.planFile),['plans/c.yaml','plans/a.yaml']);
 assert.ok(calls.every(x=>x.command==='runPlan'&&x.planId===x.planFile&&x.selectedPlanId===x.planFile&&x.debugMode===false));
 assert.equal(new Set(calls.map(x=>x.clientActionId)).size,2);assert.equal(report.rows.length,2);assert.deepEqual(report.remaining,[]);
});
test('empty selection, removed files and invalid paths never fall back to all plans or start a partial batch',async()=>{
 for(const planFiles of [[],undefined,['plans/a.yaml','plans/gone.yaml'],['../outside.yaml'],['/absolute.yaml'],['plans/*.yaml'],[null]]){
  const f=fixture();await assert.rejects(runSelectedPlans(f.host,{planFiles}));assert.equal(f.calls.length,0);
 }
});
test('failure, cancellation, missing outcome and lost receipt stop later plans without repeating accepted inputs',async()=>{
 for(const kind of ['failed','cancelled','unknown','lost']){
  const f=fixture();f.host.runActionCommand=async(command,m)=>{
   f.calls.push(m);const operation=f.host.planSubmissionOperationId(m);
   if(f.calls.length===1){f.host.localOperations[operation]={status:'queued',message:'local queue accepted'};return;}
   if(kind==='lost')throw Object.assign(Error('original request outcome unknown'),{code:'REMOTE_OUTCOME_UNKNOWN',outcomeUnknown:true});
   if(kind!=='unknown')f.host.localOperations[operation]={status:kind,message:'fixture '+kind};
  };
  const r=await runSelectedPlans(f.host,{planFiles:['plans/a.yaml','plans/b.yaml','plans/c.yaml']});
  assert.equal(r.status,kind==='cancelled'?'cancelled':'failed');assert.deepEqual(f.calls.map(x=>x.planFile),['plans/a.yaml','plans/b.yaml']);
  assert.deepEqual(r.remaining,['plans/c.yaml']);assert.equal(r.rows[0].status,'queued');
  if(kind==='lost'){assert.equal(r.rows[1].status,'unknown');assert.equal(f.host.localOperations[r.rows[1].operationId],undefined);}
 }
});
test('duplicate clicks share no new submission, and stable endpoint client rebuilds do not cancel a batch',async()=>{
 const f=fixture();let release,entered;const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r),run=f.host.runActionCommand;
 f.host.runActionCommand=async(c,m)=>{entered();await gate;f.host.client={};await run(c,m);};
 const first=runSelectedPlans(f.host,{planFiles:['plans/a.yaml','plans/b.yaml']});await started;
 await assert.rejects(runSelectedPlans(f.host,{planFiles:['plans/c.yaml']}),/已有一批/);release();assert.equal((await first).status,'completed');
 assert.deepEqual(f.calls.map(x=>x.planFile),['plans/a.yaml','plans/b.yaml']);
});
test('workspace or endpoint changes stop the remaining batch and release its in-memory lock',async()=>{
 for(const kind of ['workspace','endpoint']){
  const f=fixture(),run=f.host.runActionCommand;
  f.host.runActionCommand=async(c,m)=>{await run(c,m);if(kind==='workspace')f.host.changed=true;else f.host.workerActionTargets=()=>[{id:'other'}];};
  const report=await runSelectedPlans(f.host,{planFiles:['plans/a.yaml','plans/b.yaml']});assert.equal(report.status,'failed');assert.equal(f.calls.length,1);
  f.host.changed=false;f.host.runActionCommand=run;assert.equal((await runSelectedPlans(f.host,{planFiles:['plans/c.yaml']})).status,'completed');
 }
});
test('rendered batch selection survives filtering, exposes hidden selections, and never changes single-plan input',()=>{
 const html=require('../../src/ui/PanelHtml.ts').renderPanelHtml(),script=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
 const tree=ts.createSourceFile('panel.js',script,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 const names=new Set(['planFileOf','collectPlanFileDefaultOrder','selectedPlanBatchFiles','renderPlanBatchPicker','payloadFromButton','planButtonDisableReason']);let functions=[];
 function visit(n){if(ts.isFunctionDeclaration(n)&&names.has(n.name?.text))functions.push(n.getText(tree));ts.forEachChild(n,visit)}visit(tree);assert.equal(functions.length,names.size);
 const elements={planBatchFiles:{innerHTML:'',querySelectorAll:()=>[]},planBatchCount:{},planFileInput:{value:'plans/a.yaml'}};
 const state={workspace:{root:'/project'},plans:['a','b','c'].map(x=>({file:'plans/'+x+'.yaml'}))};
 const ctx=vm.createContext({lastState:state,el:id=>elements[id],document:{activeElement:null},esc:String,escAttr:String,planSelectorOptionLabel:file=>file,
  RESTORABLE_PLAN_FILE_PAYLOAD_COMMANDS:new Set(),ARTIFACT_SCOPE_COMMANDS:new Set(),disableReason:()=>'',resolveButtonPlanFile:()=>''});
 vm.runInContext('let planBatchSelection=new Set(),planBatchWorkspace="",planBatchVisibleFiles=[];'+functions.join('\n'),ctx);
 assert.match(ctx.planButtonDisableReason(state,'runAllPlans',{dataset:{planBatchRun:'selected'}}),/勾选/);
 vm.runInContext('planBatchSelection.add("plans/b.yaml")',ctx);
 const entries=state.plans.map(p=>({file:p.file,summary:{}}));ctx.renderPlanBatchPicker(state,entries,[entries[2]]);
 assert.match(elements.planBatchFiles.innerHTML,/plans\/c.yaml/);assert.match(elements.planBatchFiles.innerHTML,/plans\/b.yaml" checked/);
 assert.match(elements.planBatchCount.textContent,/已选 1.*筛选外 1/);
 const payload=ctx.payloadFromButton({dataset:{command:'runAllPlans',planBatchRun:'selected'}});
 assert.deepEqual(JSON.parse(JSON.stringify(payload.planFiles)),['plans/b.yaml']);assert.equal(payload.selectionOnly,true);
 assert.equal(elements.planFileInput.value,'plans/a.yaml');assert.equal(ctx.planButtonDisableReason(state,'runAllPlans',{dataset:{planBatchRun:'selected'}}),'');
 const handlers={};for(const id of ['planBatchFiles','planBatchSelectVisible','planBatchClear']){
  elements[id] ||= {};elements[id].addEventListener=(event,fn)=>handlers[id+':'+event]=fn;
 }
 ctx.refreshPlanSelectorView=()=>ctx.renderPlanBatchPicker(state,entries,[entries[2]]);ctx.refreshPlanActionButtons=()=>{};
 const listeners=[];function collect(n){if(ts.isExpressionStatement(n)&&/^el\("planBatch(?:Files|SelectVisible|Clear)"\)\.addEventListener/.test(n.getText(tree)))listeners.push(n.getText(tree));ts.forEachChild(n,collect)}collect(tree);
 assert.equal(listeners.length,3);vm.runInContext(listeners.join('\n'),ctx);
 handlers['planBatchSelectVisible:click']();assert.deepEqual(JSON.parse(JSON.stringify(ctx.selectedPlanBatchFiles(state))),['plans/b.yaml','plans/c.yaml']);
 handlers['planBatchFiles:change']({target:{dataset:{planBatchFile:'plans/b.yaml'},checked:false}});
 assert.deepEqual(JSON.parse(JSON.stringify(ctx.selectedPlanBatchFiles(state))),['plans/c.yaml']);
 handlers['planBatchClear:click']();assert.deepEqual(JSON.parse(JSON.stringify(ctx.selectedPlanBatchFiles(state))),[]);
 vm.runInContext('planBatchSelection.add("plans/b.yaml")',ctx);
 assert.deepEqual(JSON.parse(JSON.stringify(ctx.selectedPlanBatchFiles({...state,plans:[state.plans[0]]}))),[]);
 vm.runInContext('planBatchSelection.add("plans/a.yaml")',ctx);
 assert.deepEqual(JSON.parse(JSON.stringify(ctx.selectedPlanBatchFiles({...state,workspace:{root:'/other'}}))),[]);
 assert.match(html,/全选筛选结果/);assert.match(html,/运行所选计划/);assert.match(html,/运行全部计划/);
});
test('the real run-all handler routes explicit subsets, including empty arrays, without widening scope',async()=>{
 const text=fs.readFileSync(path.join(__dirname,'../../src/extension/legacy.ts'),'utf8'),ast=ts.createSourceFile('host.ts',text,ts.ScriptTarget.Latest,true);let clause;
 function visit(n){if(ts.isCaseClause(n)&&n.expression.getText(ast)==='"runAllPlans"')clause=n;ts.forEachChild(n,visit)}visit(ast);
 const block=clause.statements.filter(n=>!ts.isBreakStatement(n)).map(n=>n.getText(ast)).join('\n');
 const handler=vm.runInNewContext(ts.transpileModule('async function run(message){'+block+'};run;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{runSelectedPlans});
 const f=fixture();let all=0;f.host.runAllPlansFromUi=async()=>all++;
 await assert.rejects(handler.call(f.host,{planFiles:[]}));assert.equal(all,0);
 await handler.call(f.host,{planFiles:['plans/b.yaml']});assert.deepEqual(f.calls.map(x=>x.planFile),['plans/b.yaml']);assert.equal(all,0);
 await handler.call(f.host,{});assert.equal(all,1);
});
test('the real command wrapper preserves batch success, cancellation and partial-failure messages',async()=>{
 const text=fs.readFileSync(path.join(__dirname,'../../src/extension/legacy.ts'),'utf8'),ast=ts.createSourceFile('host.ts',text,ts.ScriptTarget.Latest,true);let method;
 function visit(n){if(ts.isMethodDeclaration(n)&&n.name.getText(ast)==='withUiCommandStatus')method=n;ts.forEachChild(n,visit)}visit(ast);
 const fn=vm.runInNewContext(ts.transpileModule('class Host{'+method.getText(ast)+'};Host.prototype.withUiCommandStatus;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,
  {localCommandReleasesAfterTrigger:()=>false,PLAN_SUBMISSION_COMMANDS:new Set(),OperationOutcome_1:{operationOutcomeFor:()=>({})},isResultSyncCommand:()=>false,
   hostOperationLeaseActionLabel:()=>'',actionErrorSuggestion:()=>'',compactSensitiveText:s=>s,vscode:{window:{showInformationMessage(){},showErrorMessage:async()=>{}}}});
 for(const status of ['completed','failed','cancelled']){
  const sent=[],h={postUiCommandStatus:(...args)=>sent.push(args),finishPlanSubmissionProgress(){},recordActionError(){},postState(){}};
  await fn.call(h,'batch','runAllPlans',{},async()=>({selectionOnly:true,status,message:'batch '+status}));
  assert.equal(sent.at(-1)[1],status);assert.equal(sent.at(-1)[3],'batch '+status);
 }
});
