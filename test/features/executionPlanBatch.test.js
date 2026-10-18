const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const source=fs.readFileSync(path.resolve(__dirname,'../../src/extension/legacy.ts'),'utf8'),ast=ts.createSourceFile('host.ts',source,ts.ScriptTarget.Latest,true);
function method(name,globals={}){let member;function visit(n){if(ts.isMethodDeclaration(n)&&n.name.getText(ast)===name)member=n;ts.forEachChild(n,visit);}visit(ast);return vm.runInNewContext(ts.transpileModule('class Host{'+member.getText(ast)+'};Host.prototype.'+name,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{
 workspaceRoot:()=>'/project',stringArrayField:(o,k)=>Array.isArray(o[k])?o[k]:[],uniqueStrings:values=>[...new Set(values.filter(Boolean))],operationResultPlanFile:o=>o.planFile,
 samePlanSelection:(a,b)=>a===b,errorMessage:e=>e.message,vscode:{window:{showWarningMessage:async()=> '中止所有 Plan',showInformationMessage(){},showErrorMessage(){}}},...globals});}
test('checked Plan selection deduplicates aliases, never falls back to the editor, and routes one aggregate confirmation',async()=>{
 let captured,confirmCount=0;
 const run=method('stopAndClearPlansFromUi',{runPlanStopClearBatch:async(host,files,root,confirm)=>{captured={host,files,root};await confirm('full preview');return {status:'completed'};},vscode:{window:{showWarningMessage:async(preview,options,action)=>{confirmCount++;assert.equal(preview,'full preview');return action;}}}});
 const host={selectedPlanId:'plans/unrelated.yaml'};await run.call(host,{planFiles:['plans/a.yaml','plans/b.yaml','plans/a.yaml']});
 assert.deepEqual([...captured.files],['plans/a.yaml','plans/b.yaml']);assert.equal(captured.root,'/project');assert.equal(captured.host,host);assert.equal(confirmCount,1);
 await run.call(host,{planFiles:[]});assert.deepEqual([...captured.files],[]);
});
test('stop-all gathers local, distributed unknown and deferred paths and invokes one batch entry',async()=>{
 let selected;const host={longRunningPlanRunOperations:()=>[{planFile:'plans/local.yaml'}],loadDistributedQueue:async()=>({plans:[{planFile:'plans/a.yaml',jobs:[{status:'running'}]},{planFile:'plans/b.yaml',jobs:[{status:'unknown'}]},{planFile:'plans/done.yaml',jobs:[{status:'completed'}]}],deferred:[{planFile:'plans/wait.yaml',status:'pending'}]}),stopAndClearPlansFromUi:async body=>{selected=body.planFiles;return {status:'completed'};}};
 const result=await method('stopAllPlansFromUi').call(host);assert.equal(result.status,'completed');assert.deepEqual([...selected],['plans/local.yaml','plans/a.yaml','plans/b.yaml','plans/wait.yaml']);
});
