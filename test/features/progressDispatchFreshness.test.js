const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
require('../_helpers/registerTsRequire');
const Q=require('../../src/features/DistributedPlanQueue.ts'),P=require('../../src/features/DistributedSchedulingPolicy.ts');
test('automatic queued tasks use another idle GPU while manual placement and capacity remain exact',()=>{
 const path=require('node:path'),{spawnSync}=require('node:child_process');
 const r=spawnSync('python',['-X','utf8',path.join(__dirname,'dispatchGpuPreference.fixture.py'),path.join(__dirname,'../../src/runtime/TmuxTaskLifecycle.ts')],{encoding:'utf8',timeout:10000,windowsHide:true});
 assert.equal(r.status,0,r.stderr||r.stdout);assert.deepEqual(JSON.parse(r.stdout),{ok:true,fallback:'1',manual:'0'});
});
const source=fs.readFileSync('src/extension/legacy.ts','utf8'),ast=ts.createSourceFile('host.ts',source,ts.ScriptTarget.Latest,true);
function method(name,globals={}){let found;function visit(n){if(ts.isMethodDeclaration(n)&&n.name.getText(ast)===name)found=n;ts.forEachChild(n,visit);}visit(ast);assert.ok(found,name);return vm.runInNewContext(ts.transpileModule('class Host{'+found.getText(ast)+'};Host.prototype.'+name,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{AbortController,...globals});}
test('a freshly missing original command keeps its fence input but releases the GPU for other jobs',()=>{
 const job={index:0,lifecycleProtocol:2,status:'unknown',executionState:'missing',workerId:'w',gpuId:'0',commandId:'original',
  startIntent:{workerId:'w',gpuId:'0',commandId:'original'}};
 const q={schemaVersion:1,plans:[{id:'p',jobs:[job]}]};
 assert.equal(Q.jobHasLiveExecution(job),false);
 assert.equal(Q.activeGpuReservations(q).occupiedGpuIds.size,0);
 assert.equal(job.startIntent.commandId,'original');
 assert.equal(Q.jobHasLiveExecution({...job,executionState:'unknown',statusQueryError:'offline'}),true);
 const input=Q.enqueuePlan(Q.emptyDistributedQueue(),{projectId:'project',planFile:'p.yaml',revision:'r',codeFingerprint:'code',executionMode:'train_test',
  jobs:[{index:0,case:'a',seed:42,outputDir:'work/a',collectionResultCsv:'tmp/a.csv'},
   {index:1,case:'b',seed:43,outputDir:'work/b',collectionResultCsv:'tmp/b.csv'}]},'p');
 Object.assign(input.plans[0].jobs[0],job);
 const reservations=Q.activeGpuReservations(input);
 const result=Q.allocateAvailable(input,[{workerId:'w',online:true,idleGpuAdmission:true,declaredJobPaths:true,codeFingerprint:'code',
  idleGpuIds:['0'].filter(id=>!reservations.occupiedGpuIds.has('w:'+id))}],{requireIdleGpuAdmission:true,localIdleOnly:true});
 assert.equal(result.dispatches.length,1);assert.equal(result.dispatches[0].jobIndex,1);assert.equal(result.dispatches[0].gpuId,'0');
 assert.equal(result.queue.plans[0].jobs[0].commandId,'original','a missing original request is never automatically resent');
});

test('finished partial preparation cannot exclude an idle Worker from a later retry',()=>{
 const preparation={root:'project',preparation:{ready:new Set(['fast'])}};
 assert.equal(P.dispatchPreparationAllowsWorker('idle','project',preparation,0),true);
 assert.equal(P.dispatchPreparationAllowsWorker('idle','project',preparation,1),false);
 assert.equal(P.dispatchPreparationAllowsWorker('fast','project',preparation,1),true);
 assert.equal(P.dispatchPreparationAllowsWorker('idle','other',preparation,1),false);
 assert.match(source,/targets = this\.workerActionTargets\(\)\.filter\(target => DistributedSchedulingPolicy\.dispatchPreparationAllowsWorker/);
});
test('an unfinished observation is not a missing window or a failed connection',()=>{
 const at=new Date().toISOString(),job={index:0,lifecycleProtocol:2,status:'running',workerId:'slow',commandId:'c',executionState:'running',lastObservedAt:at};
 const queue={schemaVersion:1,plans:[{id:'p',projectId:'project',jobs:[job]}]};
 const pending={workerId:'slow',pending:true,tasks:[]};
 const merged=Q.mergeDurableWorkerSnapshots(queue,[pending],'project');
 assert.equal(merged.plans[0].jobs[0].status,'running');assert.equal(merged.plans[0].jobs[0].lastObservedAt,at);
 assert.equal(Q.hasFreshDurableSnapshot(pending),false,'pending cannot authorize dispatch');
 const failed=Q.mergeDurableWorkerSnapshots(queue,[{...pending,pending:false,error:'HTTP 503'}],'project');
 assert.equal(failed.plans[0].jobs[0].status,'unknown');
});
test('a slow Worker does not hold up the next observation of a ready Worker',async()=>{
 let release,slow=0,fast=0;const slowPromise=new Promise(resolve=>release=resolve);
 const host={distributedQueueRoot:'project',distributedQueueCache:{plans:[{}]},isRealtimeMode:()=>true,
  workerActionTargets:()=>[{id:'slow'},{id:'fast'}],cachedWorkerTaskSnapshot:()=>undefined,postState(){},
  readWorkerTaskSnapshot:async (id,o)=>{if(o?.executionOnly)return {};if(id==='slow'){slow++;return slowPromise;}fast++;return {};}};
 const fn=method('refreshServerPlanProgress',{workspaceRoot:()=> 'project',DistributedSchedulingPolicy:P,mapLimited:async(rows,limit,work)=>Promise.all(rows.map(work))});
 const first=fn.call(host);await new Promise(resolve=>setImmediate(resolve));
 const second=fn.call(host);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(fast,2);assert.equal(slow,1);release({});await Promise.all([first,second]);
});
test('native snapshot freshness is measured on the local receipt clock',()=>{
 const now=Date.now(),snapshot={workerId:'w',queryComplete:true,capabilities:{schemaVersion:1,durablePlanQueue:true,taskLifecycle:2},
  generatedAt:new Date(now-60000).toISOString(),fetchedAt:new Date(now).toISOString()};
 assert.equal(Q.hasFreshDurableSnapshot(snapshot,now,5000),true);
 assert.equal(Q.hasFreshDurableSnapshot({...snapshot,queryComplete:false},now,5000),false);
 assert.equal(Q.hasFreshDurableSnapshot({...snapshot,error:'timeout'},now,5000),false);
 assert.equal(Q.hasFreshDurableSnapshot(snapshot,now+5001,5000),false);
});
test('metadata writes retain a freshly pulled observation despite remote clock skew',()=>{
 const now=Date.now(),received=new Date(now).toISOString(),remote=new Date(now-60000).toISOString();
 const queue={schemaVersion:1,plans:[{id:'p',projectId:'project',resultPathPolicy:'declared',jobs:[{index:0,lifecycleProtocol:2,status:'unknown',workerId:'w',commandId:'c'}]}]};
 const snapshot={workerId:'w',queryComplete:true,capabilities:{taskLifecycle:2},fetchedAt:received,generatedAt:remote,tasks:[{commandId:'c',projectId:'project',observation:{
  lifecycleProtocol:2,commandId:'c',workerId:'w',projectId:'project',observedAt:remote,tmux:{dead:false,phase:'running'}}}]};
 const live=Q.mergeDurableWorkerSnapshots(queue,[snapshot],'project',now);
 const disk=Q.restoreFormalJobQueue(JSON.parse(Q.serializeDistributedQueue(live)));
 assert.equal(Q.keepCurrentObservations(disk,live,now).plans[0].jobs[0].status,'running');
 assert.equal(live.plans[0].jobs[0].lastObservedAt,received);
 assert.equal(snapshot.tasks[0].observation.observedAt,remote,'raw server timestamp is retained in its observation');
});
test('a pending retry uses the idle Worker omitted by the last completed preparation',()=>{
 const queue=Q.enqueuePlan(Q.emptyDistributedQueue(),{projectId:'project',planFile:'p.yaml',revision:'r',codeFingerprint:'code',executionMode:'train_test',
  jobs:[{index:0,case:'a',seed:42,outputDir:'work/a',collectionResultCsv:'tmp/a.csv'}]},'p');
 queue.plans[0].jobs[0].localQueueOnly=true;
 const preparation={root:'project',preparation:{ready:new Set(['busy'])}};
 const workers=[{workerId:'busy',idleGpuIds:[]},{workerId:'nwpu2',idleGpuIds:['0','1']}]
  .filter(w=>P.dispatchPreparationAllowsWorker(w.workerId,'project',preparation,0))
  .map(w=>({...w,online:true,idleGpuAdmission:true,declaredJobPaths:true,codeFingerprint:'code'}));
 const result=Q.allocateAvailable(queue,workers,{requireIdleGpuAdmission:true,localIdleOnly:true});
 assert.equal(result.dispatches.length,1);assert.equal(result.dispatches[0].workerId,'nwpu2');
});
test('manual UI selections discard an old command, but retain the same command through status updates',()=>{
 const text=fs.readFileSync('src/ui/PanelHtml.legacy.ts','utf8');
 const start=text.indexOf('    function currentManualJobSelection('),end=text.indexOf('    document.addEventListener("change"',start);
 assert.ok(start>0&&end>start);
 const fn=vm.runInNewContext(text.slice(start,end)+';currentManualJobSelection',{asArray:v=>Array.isArray(v)?v:[]});
 const state={distributedPlans:[{id:'p',jobs:[{index:0,status:'unknown',commandId:'same'},{index:1,status:'pending'}]}]};
 assert.equal(fn('p',new Map([[0,'same'],[1,'old']]),state).size,1);
 state.distributedPlans[0].jobs[0].status='running';assert.equal(fn('p',new Map([[0,'same']]),state).get(0),'same');
 state.distributedPlans[0].jobs[0].commandId='new';assert.equal(fn('p',new Map([[0,'same']]),state).size,0);
});
