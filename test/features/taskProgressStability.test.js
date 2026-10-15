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
test('submission-only inventory cannot overwrite the independently queried progress snapshot',async()=>{
 let stored=0;const snapshot={queryComplete:true,capabilities:{taskLifecycle:2},tasks:[]};
 const globals={workspaceRoot:()=>'/fixture',workerTaskSnapshotPayload:x=>x,WorkerTaskQuery:W,errorMessage:e=>e.message,RequestBudget_1:{RequestBudgetDeniedError:class extends Error{}}};
 const host={client:{getWorkerTasks:async()=>snapshot},loadDistributedQueue:async()=>({plans:[]}),cachedWorkerTaskSnapshot:()=>undefined,storeWorkerTaskSnapshot(){stored++;},postState(){}};
 const result=await method('refreshWorkerTaskSnapshot',globals).call(host,'worker','/fixture','key',{inventoryOnly:true});
 assert.equal(result.queryComplete,true);assert.equal(stored,0);
 host.client.getWorkerTasks=async()=>{throw Error('inventory offline');};
 const failed=await method('refreshWorkerTaskSnapshot',globals).call(host,'worker','/fixture','key',{inventoryOnly:true});
 assert.match(failed.error,/inventory offline/);assert.equal(stored,0);
});
