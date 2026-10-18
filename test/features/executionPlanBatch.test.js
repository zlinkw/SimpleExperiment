const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const source=fs.readFileSync(path.resolve(__dirname,'../../src/extension/legacy.ts'),'utf8'),ast=ts.createSourceFile('host.ts',source,ts.ScriptTarget.Latest,true);
function method(name,globals={}){let member;function visit(n){if(ts.isMethodDeclaration(n)&&n.name.getText(ast)===name)member=n;ts.forEachChild(n,visit);}visit(ast);return vm.runInNewContext(ts.transpileModule('class Host{'+member.getText(ast)+'};Host.prototype.'+name,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{
 workspaceRoot:()=>'/project',stringArrayField:(o,k)=>Array.isArray(o[k])?o[k]:[],uniqueStrings:values=>[...new Set(values.filter(Boolean))],operationResultPlanFile:o=>o.planFile,
 samePlanSelection:(a,b)=>a===b,errorMessage:e=>e.message,vscode:{window:{showWarningMessage:async()=> '中止所有 Plan',showInformationMessage(){},showErrorMessage(){}}},...globals});}
test('Plan batch routes exact checked files once through existing per-Plan confirmations, never infers the editor selection',async()=>{
 const run=method('stopAndClearPlansFromUi'),seen=[],host={selectedPlanId:'plans/unrelated.yaml',stopAndClearPlanFromUi:async p=>{seen.push(p);return {status:'completed'};}};
 await assert.rejects(run.call(host,{planFiles:[]}),/勾选/);assert.equal(seen.length,0);
 const result=await run.call(host,{planFiles:['plans/a.yaml','plans/b.yaml','plans/a.yaml']});assert.equal(result.status,'completed');assert.deepEqual(seen.map(p=>p.planFile),['plans/a.yaml','plans/b.yaml']);assert.ok(seen.every(p=>p.confirm===undefined&&p.pathConfirmed===undefined),'batch must not manufacture path approval');
});
test('cancelled, failed or partial Plan cleanup stops the batch without running subsequent Plans',async()=>{
 for(const status of ['cancelled','failed','partial']){const seen=[],host={stopAndClearPlanFromUi:async p=>{seen.push(p.planFile);return {status,message:'not confirmed'};}};
  const result=await method('stopAndClearPlansFromUi').call(host,{planFiles:['plans/a.yaml','plans/b.yaml']});assert.equal(result.status,status);assert.deepEqual(seen,['plans/a.yaml']);assert.match(result.message,/0\/2/);}
});
test('stop all includes distributed/unknown and deferred Plans when local operations are empty',async()=>{
 const seen=[],host={longRunningPlanRunOperations:()=>[],loadDistributedQueue:async()=>({plans:[{planFile:'plans/a.yaml',jobs:[{status:'running'}]},{planFile:'plans/b.yaml',jobs:[{status:'unknown'}]},{planFile:'plans/done.yaml',jobs:[{status:'completed'}]}],deferred:[{planFile:'plans/wait.yaml',status:'pending'}]}),
 stopAndClearPlanFromUi:async p=>{seen.push(p.planFile);return {status:'completed'};},postState(){}};
 await method('stopAllPlansFromUi').call(host);assert.deepEqual(seen,['plans/a.yaml','plans/b.yaml','plans/wait.yaml']);
});
test('batch stops if the project changes between exact Plan actions',async()=>{
 let root='/project';const seen=[],host={stopAndClearPlanFromUi:async p=>{seen.push(p.planFile);root='/other';return {status:'completed'};}};
 const result=await method('stopAndClearPlansFromUi',{workspaceRoot:()=>root}).call(host,{planFiles:['plans/a.yaml','plans/b.yaml']});assert.equal(result.status,'partial');assert.deepEqual(seen,['plans/a.yaml']);
});
test('stop all reports cancellation or failure instead of a completed command and stops the next Plan',async()=>{
 for(const status of ['cancelled','failed']){const seen=[],host={longRunningPlanRunOperations:()=>[],loadDistributedQueue:async()=>({plans:[{planFile:'a',jobs:[{status:'running'}]},{planFile:'b',jobs:[{status:'running'}]}]}),stopAndClearPlanFromUi:async p=>{seen.push(p.planFile);return {status,message:'exact stop not confirmed'};},postState(){}};
 const result=await method('stopAllPlansFromUi').call(host);assert.equal(result.status,status);assert.deepEqual(seen,['a']);}
});
