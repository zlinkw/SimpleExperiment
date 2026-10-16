const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
require('../_helpers/registerTsRequire');
const Q=require('../../src/features/DistributedPlanQueue.ts'),W=require('../../src/features/WorkerTaskQuery.ts');
const source=fs.readFileSync(path.resolve(__dirname,'../../src/extension/legacy.ts'),'utf8'),ast=ts.createSourceFile('host.ts',source,ts.ScriptTarget.Latest,true);
function method(name,globals={}){let found;function visit(n){if(ts.isMethodDeclaration(n)&&n.name.getText(ast)===name)found=n;ts.forEachChild(n,visit);}visit(ast);assert.ok(found,name);return vm.runInNewContext(ts.transpileModule('class Host{'+found.getText(ast)+'};Host.prototype.'+name,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{...globals});}
test('changing result selectors never hides a failed window which still exists in actual tmux',()=>{
 const r=require('node:child_process').spawnSync(process.platform==='win32'?'python':'python3',['-B','-X','utf8',path.join(__dirname,'taskProgressStability.fixture.py'),path.resolve(__dirname,'../../src/runtime/TmuxTaskLifecycle.ts')],{encoding:'utf8',timeout:10000,windowsHide:true});
 assert.equal(r.status,0,r.stderr||r.stdout);assert.deepEqual(JSON.parse(r.stdout),{ok:true,stableQueries:4});
});
test('current failed jobs keep being queried, while superseded and unidentified failed history does not',()=>{
 const old={id:'old',projectId:'project',planFile:'p.yaml',enqueuedAt:'2026-10-14T00:00:00Z',jobs:[{index:0,case:'a',seed:42,workerId:'worker',commandId:'old',outputDir:'work/a',status:'failed',lifecycleProtocol:2}]};
 const current={...old,id:'new',enqueuedAt:'2026-10-14T01:00:00Z',jobs:[{...old.jobs[0],commandId:'new'}]};
 assert.deepEqual(W.workerTaskQueries({plans:[old,current,{id:'bad',jobs:[{...old.jobs[0],commandId:'bad'}]}]},'worker').map(row=>row.commandId),['new']);
});
test('query failure and recovery invalidate the projection even when task rows are unchanged',()=>{
 const fn=method('noteWorkerTaskPlanStatus'),host={workerTaskPlanStatusSignatures:new Map(),workerTaskSnapshotRevision:0};
 const snapshot={capabilities:{taskLifecycle:2},queryComplete:true,tasks:[{commandId:'c',status:'failed',observation:{tmux:{dead:true,exitCode:1}}}]};
 fn.call(host,'key',snapshot);const first=host.workerTaskSnapshotRevision;
 fn.call(host,'key',{...snapshot,error:'HTTP 503'});assert.equal(host.workerTaskSnapshotRevision,first+1);
 fn.call(host,'key',snapshot);assert.equal(host.workerTaskSnapshotRevision,first+2);
 fn.call(host,'key',{...snapshot,fetchedAt:'new timestamp'});assert.equal(host.workerTaskSnapshotRevision,first+2,'time alone does not invalidate structural evidence');
 fn.call(host,'key',{...snapshot,tasks:[{...snapshot.tasks[0],observation:{tmux:{dead:true,exitCode:0}}}]});assert.equal(host.workerTaskSnapshotRevision,first+3,'native execution evidence participates even if the legacy status label is unchanged');
});
test('projection expiry is checked even without a new queue or task signature',()=>{
 let now=Date.now(),calls=0;const at=new Date(now).toISOString(),queue={schemaVersion:1,plans:[{id:'p',projectId:'project',jobs:[{index:0,status:'failed',lifecycleProtocol:2,workerId:'worker',commandId:'c'}]}]};
 const snapshot={workerId:'worker',fetchedAt:at,generatedAt:at,capabilities:{taskLifecycle:2},tasks:[{commandId:'c',projectId:'project',observation:{lifecycleProtocol:2,commandId:'c',workerId:'worker',projectId:'project',observedAt:at,tmux:{dead:true,exitCode:1}}}]};
 const globals={workspaceRoot:()=>'/fixture',Date:class extends Date{static now(){return now;}},DistributedPlanQueue:{canonicalProjectId:()=> 'project'},workerTaskSnapshotPayload:x=>x,
  DistributedSchedulingPolicy:{PROGRESS_FRESHNESS_MS:5000,serverAuthoritativeProgress:(q,s,p)=>{calls++;return Q.mergeDurableWorkerSnapshots(q,s,p,now,5000).plans;}}};
 const fn=method('serverPlanProgress',globals),host={distributedQueueRoot:'/fixture',distributedQueueCache:queue,workerTaskSnapshotRevision:0,workerActionTargets:()=>[{id:'worker'}],cachedWorkerTaskSnapshot:()=>snapshot};
 assert.equal(fn.call(host)[0].jobs[0].status,'failed');assert.equal(fn.call(host)[0].jobs[0].status,'failed');assert.equal(calls,1);
 now+=5001;assert.equal(fn.call(host)[0].jobs[0].status,'unknown');assert.equal(calls,2);
});
test('log analysis and completion evidence invalidate cards without changing process or artifact status',()=>{
 const fn=method('noteWorkerTaskPlanStatus'),host={workerTaskPlanStatusSignatures:new Map(),workerTaskSnapshotRevision:0};
 const task={commandId:'c',status:'completed',executionState:'exited',resultState:'complete',exitCode:0,completionState:'unverified'};
 const snapshot={queryComplete:true,tasks:[task]};fn.call(host,'key',snapshot);const first=host.workerTaskSnapshotRevision;
 task.completionState='verified';fn.call(host,'key',snapshot);assert.equal(host.workerTaskSnapshotRevision,first+1);
 task.runtimeDiagnostics={commandId:'c',runId:'c',state:'anomalous',count:1,scanComplete:true};
 task.completionState='review_required';fn.call(host,'key',snapshot);assert.equal(host.workerTaskSnapshotRevision,first+2);
 task.runtimeDiagnostics.count=2;fn.call(host,'key',snapshot);assert.equal(host.workerTaskSnapshotRevision,first+3);
 fn.call(host,'key',{...snapshot,fetchedAt:'later'});assert.equal(host.workerTaskSnapshotRevision,first+3);
});
test('submission-only inventory cannot overwrite the independently queried progress snapshot',async()=>{
 let stored=0;const snapshot={queryComplete:true,capabilities:{taskLifecycle:2},tasks:[]};
 const globals={workspaceRoot:()=>'/fixture',workerTaskSnapshotPayload:x=>x,WorkerTaskQuery:W,WorkerProgressQuery:require('../../src/features/WorkerProgressQuery.ts'),errorMessage:e=>e.message,RequestBudget_1:{RequestBudgetDeniedError:class extends Error{}}};
 const host={client:{getWorkerTasks:async()=>snapshot},loadDistributedQueue:async()=>({plans:[]}),cachedWorkerTaskSnapshot:()=>undefined,storeWorkerTaskSnapshot(){stored++;},postState(){}};
 const result=await method('refreshWorkerTaskSnapshot',globals).call(host,'worker','/fixture','key',{inventoryOnly:true});
 assert.equal(result.queryComplete,true);assert.equal(stored,0);
 host.client.getWorkerTasks=async()=>{throw Error('inventory offline');};
 const failed=await method('refreshWorkerTaskSnapshot',globals).call(host,'worker','/fixture','key',{inventoryOnly:true});
 assert.match(failed.error,/inventory offline/);assert.equal(stored,0);
});

test('slow result verification publishes fresh execution first and cannot erase it on timeout',async()=>{
 let finish,stored=[],calls=[];const slow=new Promise((_,reject)=>{finish=reject;});
 const observation={lifecycleProtocol:2,commandId:'live',projectId:'project',workerId:'worker',observedAt:new Date().toISOString(),tmux:{paneId:'%1',windowId:'@1',dead:false,phase:'starting'}};
 const execution={executionOnly:true,queryComplete:true,capabilities:{taskLifecycle:2},tasks:[{commandId:'live',projectId:'project',observation}]};
 const globals={workspaceRoot:()=>'/fixture',workerTaskSnapshotPayload:x=>x,WorkerTaskQuery:W,WorkerProgressQuery:require('../../src/features/WorkerProgressQuery.ts'),errorMessage:e=>e.message,RequestBudget_1:{RequestBudgetDeniedError:class extends Error{}}};
 const host={client:{getWorkerTasks:async(_,options)=>{calls.push(options);return options.executionOnly?execution:slow;}},loadDistributedQueue:async()=>({plans:[{projectId:'project',jobs:[{lifecycleProtocol:2,workerId:'worker',commandId:'live',outputDir:'work/live',status:'unknown'}]}]}),cachedWorkerTaskSnapshot:()=>undefined,storeWorkerTaskSnapshot(_,value){stored.push(value);},postState(){}};
 const pending=method('refreshWorkerTaskSnapshot',globals).call(host,'worker','/fixture','key');
 for(let i=0;i<5&&calls.length<2;i++)await new Promise(setImmediate);
 assert.equal(stored.length,1,'execution is visible before the slow result query finishes');
 assert.equal(Q.mergeDurableWorkerSnapshots({plans:[{projectId:'project',jobs:[{lifecycleProtocol:2,workerId:'worker',commandId:'live',status:'unknown'}]}]},stored,'project').plans[0].jobs[0].executionState,'starting');
 finish(Object.assign(Error('result query timed out'),{code:'TASK_QUERY_TIMEOUT'}));
 const result=await pending;assert.equal(result.error,undefined);assert.equal(result.executionOnly,true);
 assert.match(result.resultQueryError,/result query timed out/);assert.equal(result.tasks[0].observation.tmux.phase,'starting');
 assert.equal(result.tasks[0].observation.result,undefined,'no stale result is promoted to fresh evidence');
 const {assertLaunchObservations}=W;
 assert.throws(()=>assertLaunchObservations([result],[]),/TASK_QUERY_INCOMPLETE/,'execution-only evidence cannot authorize overwriting outputs or skip cleanup checks');
 host.client.getWorkerTasks=async()=>{throw Error('execution offline');};
 const failed=await method('refreshWorkerTaskSnapshot',globals).call(host,'worker','/fixture','key');assert.match(failed.error,/execution offline/);
});

test('normal complete observations are not flashed to unverified during the execution-first refresh',async()=>{
 let finish,stored=[];const full=new Promise(resolve=>{finish=resolve;});
 const old={queryComplete:true,capabilities:{taskLifecycle:2},tasks:[{commandId:'ended',status:'completed'}]};
 const live={executionOnly:true,queryComplete:true,capabilities:{taskLifecycle:2},tasks:[]};
 const globals={workspaceRoot:()=>'/fixture',workerTaskSnapshotPayload:x=>x,WorkerTaskQuery:W,WorkerProgressQuery:require('../../src/features/WorkerProgressQuery.ts'),errorMessage:e=>e.message,RequestBudget_1:{RequestBudgetDeniedError:class extends Error{}}};
 const host={client:{getWorkerTasks:async(_,options)=>options.executionOnly?live:full},loadDistributedQueue:async()=>({plans:[]}),cachedWorkerTaskSnapshot:()=>old,storeWorkerTaskSnapshot(_,value){stored.push(value);},postState(){}};
 const pending=method('refreshWorkerTaskSnapshot',globals).call(host,'worker','/fixture','key');
 await new Promise(setImmediate);assert.equal(stored.length,0);
 finish(old);const result=await pending;assert.equal(result.tasks[0].status,'completed');assert.equal(stored.length,1);
});

test('native execution inventory stays independent of result files, logs and launch payloads',()=>{
 const r=require('node:child_process').spawnSync(process.platform==='win32'?'python':'python3',['-B','-X','utf8',path.join(__dirname,'slowWorkerExecution.fixture.py'),path.resolve(__dirname,'../../src/runtime/TmuxTaskLifecycle.ts')],{encoding:'utf8',timeout:10000,windowsHide:true});
 assert.equal(r.status,0,r.stderr||r.stdout);
});

test('changing workspace during selected result queries cannot publish or return old project evidence',async()=>{
 let root='/fixture',stored=0;const live={executionOnly:true,queryComplete:true,capabilities:{taskLifecycle:2},tasks:[]};
 const globals={workspaceRoot:()=>root,workerTaskSnapshotPayload:x=>x,WorkerTaskQuery:W,WorkerProgressQuery:{queryWorkerProgress:async()=>{root='/other';return live;}},errorMessage:e=>e.message,RequestBudget_1:{RequestBudgetDeniedError:class extends Error{}}};
 const host={client:{getWorkerTasks:async()=>live},loadDistributedQueue:async()=>({plans:[{projectId:'project',jobs:[{lifecycleProtocol:2,workerId:'worker',commandId:'live',outputDir:'work/live',status:'unknown'}]}]}),cachedWorkerTaskSnapshot:()=>undefined,storeWorkerTaskSnapshot(){stored++;},postState(){}};
 const result=await method('refreshWorkerTaskSnapshot',globals).call(host,'worker','/fixture','key');
 assert.match(result.error,/Workspace changed/);assert.equal(stored,1,'only the initial observation before changing workspace may be stored');
});
