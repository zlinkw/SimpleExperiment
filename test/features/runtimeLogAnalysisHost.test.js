const test=require('node:test'),assert=require('node:assert/strict'),os=require('node:os'),path=require('node:path'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
require('../_helpers/registerTsRequire');
const {analyzeRuntimeLog}=require('../../src/extension/RuntimeLogAnalysisHost.ts');
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
});
