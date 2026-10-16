const test=require('node:test'),assert=require('node:assert/strict');
require('../_helpers/registerTsRequire');
const {queryWorkerProgress}=require('../../src/features/WorkerProgressQuery.ts');
test('result observation uses the bounded normal pool, leaving execution/stop emergency slots available',async()=>{
 const fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
 const source=fs.readFileSync('src/tunnel/TunnelClient.legacy.ts','utf8'),ast=ts.createSourceFile('client.ts',source,ts.ScriptTarget.Latest,true);let method;
 function visit(node){if(ts.isMethodDeclaration(node)&&node.name.getText(ast)==='getWorkerTasks')method=node;ts.forEachChild(node,visit);}visit(ast);assert.ok(method);
 const fn=vm.runInNewContext(ts.transpileModule('class C{'+method.getText(ast)+'};C.prototype.getWorkerTasks',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{});
 const purposes=[],host={requestJson:async(_path,purpose,body)=>{purposes.push(purpose);return body;}};
 const body=await fn.call(host,{selectedOnly:true,observationOnly:true,queries:[{commandId:'c'}]});assert.equal(body.observationOnly,true);
 await fn.call(host,{executionOnly:true});assert.deepEqual(purposes,['manual_refresh','job_reconcile']);
});
test('valid synchronized copies remain complete without reading weight contents',()=>{
 const path=require('node:path');const r=require('node:child_process').spawnSync(process.platform==='win32'?'python':'python3',['-B','-X','utf8',path.join(__dirname,'portableManifest.fixture.py'),path.join(__dirname,'../../src/runtime/TmuxTaskLifecycle.ts')],{encoding:'utf8',timeout:10000,windowsHide:true});assert.equal(r.status,0,r.stderr||r.stdout);
});
test('one failed result read cannot discard completed jobs or execution evidence',async()=>{
 const tasks=Array.from({length:6},(_,i)=>({commandId:'c'+i,projectId:'p',workerId:'w',outputDir:'work/'+i,observation:{lifecycleProtocol:2,commandId:'c'+i,projectId:'p',workerId:'w',tmux:{dead:true,exitCode:0,phase:'running'}}}));
 const execution={executionOnly:true,queryComplete:true,fetchedAt:'2026-10-16T00:00:00Z',capabilities:{taskLifecycle:2},tasks},published=[];
 let active=0,max=0;
 const client={getWorkerTasks:async(_,o)=>{assert.equal(o.selectedOnly,true);assert.equal(o.observationOnly,true);assert.equal(o.queries.length,1);max=Math.max(max,++active);await new Promise(setImmediate);active--;const task=o.queries[0];if(task.commandId==='c2')throw Error('result offline');return {queryComplete:true,capabilities:{taskLifecycle:2},cleanupExecutors:[],tasks:[{...task,status:'completed',observation:{...task.observation,result:{runId:task.commandId,present:true,verified:true,artifactsComplete:true,status:'completed'}}}]};}};
 const result=await queryWorkerProgress(client,'w',tasks,execution,{onSnapshot:s=>published.push(s)});
 assert.ok(max<=4);assert.equal(result.tasks.filter(t=>t.status==='completed').length,5);
 assert.equal(result.tasks[2].observation.tmux.exitCode,0);assert.match(result.tasks[2].observation.resultQueryError,/result offline/);
 assert.equal(result.tasks[2].observation.result,undefined);assert.ok(published.length>=5);
 assert.equal(result.executionOnly,true,'partial observations cannot authorize launch/cleanup checks');
 assert.equal(result.fetchedAt,execution.fetchedAt,'result waits must not relabel older execution observations as newly received');
});
test('all selected current results finish without requiring other Workers or synchronization receipts',async()=>{
 const t={commandId:'c',projectId:'p',workerId:'w',outputDir:'work/c'};
 const result=await queryWorkerProgress({getWorkerTasks:async()=>({queryComplete:true,capabilities:{taskLifecycle:2},cleanupExecutors:[],tasks:[{...t,status:'completed',observation:{result:{runId:'c',present:true,verified:true}}}]})},'w',[t],{tasks:[],capabilities:{taskLifecycle:2},queryComplete:true},{onSnapshot(){}});
 assert.equal(result.tasks[0].status,'completed');assert.equal(result.executionOnly,undefined);
});

test('timeout preserves already verified results and rotates past slow jobs on the next round',async()=>{
 const tasks=Array.from({length:8},(_,i)=>({commandId:'c'+i,projectId:'p',workerId:'w',outputDir:'work/'+i}));
 const seen=[];let resolveLate;const blocked=new Promise(resolve=>{resolveLate=resolve;});
 const client={getWorkerTasks:async(_,o)=>{const t=o.queries[0];seen.push(t.commandId);if(t.commandId!=='c1')return blocked;return {queryComplete:true,capabilities:{taskLifecycle:2},cleanupExecutors:[],tasks:[{...t,status:'completed'}]};}};
 const controller=new AbortController(),published=[];
 const pending=queryWorkerProgress(client,'w',tasks,{tasks,capabilities:{taskLifecycle:2},queryComplete:true},{signal:controller.signal,onSnapshot:s=>published.push(s)});
 await new Promise(setImmediate);controller.abort(Object.assign(Error('bounded result wait'),{code:'TASK_QUERY_TIMEOUT'}));
 const result=await pending;assert.equal(result.tasks.find(t=>t.commandId==='c1').status,'completed');
 const length=published.length;resolveLate({queryComplete:true,tasks:[]});await new Promise(setImmediate);assert.equal(published.length,length,'late reads cannot overwrite the next snapshot');
 const old=seen.length,c2=new AbortController();const second=queryWorkerProgress(client,'w',tasks,{tasks,capabilities:{taskLifecycle:2},queryComplete:true},{signal:c2.signal});
 await new Promise(setImmediate);c2.abort(Object.assign(Error('bounded result wait'),{code:'TASK_QUERY_TIMEOUT'}));await second;
 assert.equal(seen[old],'c5','the same slow first jobs cannot starve later results');
});
