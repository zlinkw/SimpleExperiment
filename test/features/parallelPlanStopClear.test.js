const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
require('../_helpers/registerTsRequire');
const Batch=require('../../src/extension/PlanStopClearBatchHost.ts'),Queue=require('../../src/features/DistributedPlanQueue.ts'),Planner=require('../../src/features/PlanStopClear.ts');
const source=fs.readFileSync(path.resolve(__dirname,'../../src/extension/legacy.ts'),'utf8'),ast=ts.createSourceFile('host.ts',source,ts.ScriptTarget.Latest,true);
const names=new Set(['stopAllPlansFromUi','stopAndClearPlansFromUi','stopAndClearPlanFromUi','clearEndedPlanHistoryFromUi','performKillTmuxWindow']);let members=[];
function visit(n){if(ts.isMethodDeclaration(n)&&names.has(n.name.getText(ast)))members.push(n.getText(ast));ts.forEachChild(n,visit);}visit(ast);
const code=ts.transpileModule('class Host{'+members.join('\n')+'};Host;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const defer=()=>{let resolve;const promise=new Promise(done=>resolve=done);return {promise,resolve};};
function fixture(count=3,{history=false,local=false}={}){
 let root='/project',queue=Queue.emptyDistributedQueue(),writeTail=Promise.resolve(),writes=0,active=0,max=0,mode='confirm',hook;
 const paths=Array.from({length:count},(_,i)=>'plans/'+i+'.yaml'),dialogs=[],stops=[],feedback={},state=new Map(),operations={};
 for(const [i,file]of paths.entries()){
  queue=Queue.enqueuePlan(queue,{projectId:Queue.canonicalProjectId(root),planFile:file,revision:'r',codeFingerprint:'c',jobs:[{index:0,case:'case'+i,seed:i,outputDir:'work_dirs/'+i}]},'p'+i);
  const plan=queue.plans.at(-1);Object.assign(plan.jobs[0],{status:history?'completed':'running',lifecycleProtocol:2,workerId:'w',commandId:'cmd'+i});
  if(local)operations['op'+i]={operationId:'op'+i,type:'run-plan',planFile:file,status:'running',workerId:'w',tmuxTarget:'s:'+i};
 }
 const sandbox={...Planner,...Batch,TmuxWindowIdentity:require('../../src/features/TmuxWindowIdentity.ts'),DistributedPlanQueue:Queue,workspaceRoot:()=>root,stringField:(row,key)=>String(row[key]||''),stringArrayField:(row,key)=>Array.isArray(row[key])?row[key]:[],uniqueStrings:v=>[...new Set(v)],samePlanSelection:Planner.planEvidenceMatchesFile,
  operationTerminal:row=>['completed','failed','cancelled'].includes(row.status),operationResultPlanFile:row=>row.planFile,errorMessage:e=>e.message,
  normalizePlanSelectionKey:v=>v,keys:{executionHistoryHiddenOperationIds:'hidden',executionHistoryCutoffs:'cutoffs'},endedPlanOperationIds:()=>[],
  vscode:{window:{showWarningMessage:async(text,options,action)=>{if(options?.modal){dialogs.push(text);await hook?.();return mode==='confirm'?action:undefined;}},showInformationMessage(){},showErrorMessage(){}}}};
 const Host=vm.runInNewContext(code,sandbox),host=new Host();
 Object.assign(host,{projectContextGeneration:1,distributedQueueGeneration:0,distributedPlanStopEpoch:0,distributedLaunchInFlight:new Set(),localOperations:operations,
  loadDistributedQueue:async()=>structuredClone(queue),buildPlanRuntimeEvidenceState:()=>({operations}),isRealtimeMode:()=>true,runOperationWorkerId:row=>row.workerId,
  context:{workspaceState:{get:(key,fallback)=>state.get(key)??fallback,update:async(key,value)=>{await new Promise(setImmediate);state.set(key,value);}}},
  saveDistributedQueue:async(_root,next,options={})=>{
   const work=writeTail.then(async()=>{await new Promise(setImmediate);if(options.stopBatchEpoch!==undefined)assert.equal(host.distributedPlanStopEpoch,options.stopBatchEpoch);
    const changed=options.mutateLatest?options.mutateLatest(structuredClone(queue)):next;assert.ok(changed);queue=structuredClone(changed);writes++;
    if(options.controlMutation&&options.stopBatchEpoch===undefined)host.distributedQueueGeneration++;
   });writeTail=work.catch(()=>{});host.distributedQueueWritePromise=work;await work;
  },
  client:{getWorkerTasks:async()=>({tasks:[]})},recoverPlanOperationsForStopClear:async()=>({recovered:[],nativeTargets:[],conflicts:[],failures:[],inventoryComplete:true}),
  readTmuxListAfterKill:async()=>({sessions:[{name:'s',windows:paths.map((_,i)=>({index:i,windowId:'@'+i,name:'task'+i,panes:[{id:'%'+i}]}))}]}),
  revokePlanSubmissions(){},detachStaleDistributedTick(){},planStopClearWaitMs:()=>1000,boundedPromise:work=>work(),markLocalOperationsDirty(){},postState(){},
  publishPlanStopClear:(file,input)=>{feedback[file]=input;},finishPlanStopClear:(file,input)=>{feedback[file]=input;return Planner.planStopClearUiResult(Planner.planStopClearFeedback({planFile:file,...input}));},
  retireLocalOperationState:async ids=>{for(const id of ids)delete operations[id];},longRunningPlanRunOperations:()=>Object.values(operations),
 });
 const stop=async label=>{active++;max=Math.max(max,active);stops.push(label);try {await host.onStop?.(label);return {localStopConfirmed:[label],stoppedTasks:[]};}finally{active--;}};
 host.stopDistributedJobForClear=async(plan,job)=>stop(job.commandId);host.stopExperimentRouted=async row=>stop(row.operationId);host.performKillTmuxWindow=async()=>{};
 return {host,paths,dialogs,feedback,state,operations,stops,queue:()=>queue,writes:()=>writes,max:()=>max,
  setMode:v=>mode=v,onConfirm:fn=>hook=fn,mutate:fn=>fn(queue),switchProject:()=>{root='/other';host.projectContextGeneration++;},run:(files=paths)=>host.stopAndClearPlansFromUi({planFiles:files})};
}
test('actual Plan batch confirms once, overlaps remote stops and preserves every concurrent queue/history delta',async()=>{
 const f=fixture(8,{local:true}),ready=defer(),release=defer();f.host.onStop=async()=>{if(f.stops.length===4)ready.resolve();await release.promise;};
 const pending=f.run();await ready.promise;assert.equal(f.dialogs.length,1);assert.equal(f.max(),4);assert.equal(f.host.distributedPlanStopEpoch,1);
 for(const file of f.paths)assert.ok(f.dialogs[0].includes(file));release.resolve();const result=await pending;
 assert.equal(result.status,'completed',result.message);assert.equal(result.results.length,8);assert.equal(f.queue().plans.length,0);assert.equal(f.queue().clearedJobs.length,8);
 assert.equal(f.state.get('hidden').length,8);assert.equal(Object.keys(f.state.get('cutoffs')).length,8);assert.equal(f.host.distributedPlanStopEpoch,0);assert.equal(f.host.planStopClearBatchLease,undefined);
});
test('cancelled aggregate confirmation has zero stops and writes, resets cards, and message fields cannot bypass it',async()=>{
 const f=fixture();f.setMode('cancel');const result=await f.run();assert.equal(result.status,'cancelled');assert.equal(f.dialogs.length,1);assert.equal(f.writes(),0);assert.equal(f.stops.length,0);
 assert.ok(f.paths.every(file=>f.feedback[file].outcome==='cancelled'));assert.equal(f.queue().plans.length,3);
});
test('a target replacement during aggregate confirmation aborts the full batch before mutation',async()=>{
 const f=fixture();f.onConfirm(()=>f.mutate(queue=>queue.plans[0].jobs[0].commandId='replacement'));const result=await f.run();assert.equal(result.status,'failed');assert.equal(f.stops.length,0);assert.equal(f.writes(),0);
});
test('one failed remote stop retains only its Plan and does not cancel other approved independent targets',async()=>{
 const f=fixture(4);f.host.onStop=async label=>{if(label==='cmd1')throw Error('offline');};const result=await f.run();assert.equal(result.status,'partial',result.message);assert.equal(f.dialogs.length,1);
 assert.deepEqual(f.queue().plans.map(plan=>plan.id),['p1']);assert.equal(f.queue().plans[0].jobs[0].stopIntent.commandId,'cmd1');assert.equal(f.queue().clearedJobs.length,3);assert.equal(f.feedback[f.paths[1]].outcome,'failed');
});
test('new unrelated Plans are preserved, while new jobs within an approved Plan never enter the frozen target set',async()=>{
 const f=fixture(2);let injected=false;f.host.onStop=async label=>{if(!injected){injected=true;f.mutate(queue=>queue.plans.push({id:'unrelated',planFile:'plans/other.yaml',jobs:[{index:0,status:'pending',outputDir:'other'}]}));}};
 assert.equal((await f.run()).status,'completed');assert.deepEqual(f.queue().plans.map(plan=>plan.id),['unrelated']);
 const changed=fixture(1);changed.host.onStop=async()=>changed.mutate(queue=>queue.plans[0].jobs.push({index:1,status:'pending',outputDir:'new'}));
 assert.equal((await changed.run()).status,'failed');assert.deepEqual(changed.stops,['cmd0']);assert.equal(changed.queue().plans[0].jobs.length,2);
});
test('history-only Plans use the same single confirmation and parallel safe merges without remote stops',async()=>{
 const f=fixture(5,{history:true});const result=await f.run();assert.equal(result.status,'completed',result.message);assert.equal(f.dialogs.length,1);assert.equal(f.stops.length,0);assert.equal(f.queue().plans.length,0);assert.equal(f.queue().clearedJobs.length,5);
});
test('project switching and a duplicate batch cannot extend a frozen batch or manufacture an internal approval',async()=>{
 const f=fixture(6),ready=defer(),release=defer();f.host.onStop=async()=>{if(f.stops.length===4)ready.resolve();await release.promise;};const pending=f.run();await ready.promise;
 await assert.rejects(f.run(),/已有/);await assert.rejects(f.host.stopAndClearPlanFromUi({planFile:f.paths[0],prepare:true,lease:{}}),/已有/);
 f.switchProject();release.resolve();const result=await pending;assert.notEqual(result.status,'completed');assert.equal(f.stops.length,4);assert.equal(f.queue().plans.length,6);
});
test('stop-all routes local, distributed unknown and deferred selections into one batch instead of per-Plan prompts',async()=>{
 const f=fixture(2);f.mutate(queue=>{queue.plans[1].jobs[0].status='unknown';queue.deferred=[{id:'d',planFile:'plans/deferred.yaml',status:'pending'}];});
 const result=await f.host.stopAllPlansFromUi();assert.equal(result.status,'completed',result.message);assert.equal(f.dialogs.length,1);assert.equal(f.queue().plans.length,0);assert.equal(f.queue().deferred.length,0);
});
test('a single-Plan dialog opened before the batch cannot steal its shared stop fence after confirmation',async()=>{
 const f=fixture(1),first=defer(),singleDialog=defer(),started=defer(),release=defer();let confirmations=0;
 f.onConfirm(async()=>{if(++confirmations===1){singleDialog.resolve();await first.promise;}});
 f.host.onStop=async()=>{started.resolve();await release.promise;};
 const single=f.host.stopAndClearPlanFromUi({planFile:f.paths[0]});await singleDialog.promise;
 const batch=f.run();await started.promise;first.resolve();assert.equal((await single).status,'failed');assert.equal(f.host.distributedPlanStopEpoch,1);assert.equal(f.stops.length,1);
 release.resolve();assert.equal((await batch).status,'completed');
});
test('parallel legacy-window cleanup keeps the approved window IDs when tmux renumbers sibling indexes',async()=>{
 const f=fixture(3,{local:true}),closed=[];let windows=f.paths.map((_,i)=>({index:i,windowId:'@'+i,name:'task'+i,panes:[{id:'%'+i}]}));
 f.host.readTmuxListAfterKill=async()=>({ok:true,sessions:[{name:'s',windows:structuredClone(windows)}]});
 f.onConfirm(()=>{windows=windows.reverse().map((win,index)=>({...win,index}));});
 f.host.stopExperimentRouted=async()=>({});f.host.performKillTmuxWindow=Object.getPrototypeOf(f.host).performKillTmuxWindow;
 f.host.tmuxKillSessionFromTarget=target=>target.split(':')[0];f.host.isTmuxKillTransportFailure=()=>false;
 f.host.requestKillTmuxWindow=async(worker,body)=>{assert.equal(worker,'w');assert.ok(body.paneIds.includes('%'+body.windowId.slice(1)));closed.push(body.windowId);
  windows=windows.filter(win=>win.windowId!==body.windowId).map((win,index)=>({...win,index}));return {ok:true,verified:true,windowId:body.windowId};};
 const result=await f.run();assert.equal(result.status,'completed',result.message);assert.deepEqual(closed.sort(),['@0','@1','@2']);assert.equal(f.dialogs.length,1);
 assert.match(f.dialogs[0],/s:0 · @0 · %0/);
});
test('a history query started before the batch cannot acquire a new stop fence while that batch is active',async()=>{
 const f=fixture(1,{history:true}),first=defer(),second=defer(),firstReady=defer(),secondReady=defer();let calls=0;
 f.host.client.getWorkerTasks=async()=>{if(++calls===1){firstReady.resolve();await first.promise;}else{secondReady.resolve();await second.promise;}return {tasks:[]};};
 const single=f.host.stopAndClearPlanFromUi({planFile:f.paths[0],clearMode:'history'});await firstReady.promise;
 const batch=f.run();await secondReady.promise;first.resolve();const singleResult=await single;
 assert.equal(singleResult.status,'failed');assert.equal(f.host.distributedPlanStopEpoch,1);second.resolve();assert.equal((await batch).status,'completed');
});
