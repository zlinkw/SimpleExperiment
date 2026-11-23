"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),ts=require("typescript"),vm=require("node:vm");
const source=fs.readFileSync(path.resolve(__dirname,"../../src/core/SimpleSftpProgressWait.ts"),"utf8");
const tree=ts.createSourceFile("SimpleSftpProgressWait.ts",source,ts.ScriptTarget.Latest,true);
const fn=tree.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==="callSftpWithProgress");
test("caller context is checked at discovery and before a not-started retry",async()=>{
 for(const stage of ["discovery","retry","accepted"]){
  let current=true,posts=0,confirmations=0;const sent=[];
  const context={AbortController,AbortSignal,URL,process,setTimeout,clearTimeout,
   assertRetryRequestCurrent:()=>{},retryRequestSignal:()=>undefined,registerRetryStopCheck:()=>()=>{},
   ProgressInactivity:class{update(){return false;}dispose(){}},
   BoundedSseDecoder:class{},fetch:async()=>({ok:false,body:{cancel:async()=>{}}}),
   sftpRequestKey:()=>"request",readSftpJson:async response=>response.payload,
   confirmSftpOperationStopped:async()=>{confirmations++;current=false;},
   postProgressRpc:async(_url,options)=>{posts++;sent.push(JSON.parse(options.body));if(stage==="retry")return {ok:true,payload:{error:{data:{notStarted:true,blockedOperationId:"old",operationInstanceId:"instance"}}}};
    current=false;return {ok:true,payload:{result:{ok:true,state:"accepted"}}};}};
  const call=vm.runInNewContext(ts.transpileModule(fn.getText(tree).replace(/^export\s+/,"")+";callSftpWithProgress",{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
  const discover=async()=>{if(stage==="discovery")current=false;return {endpoint:"http://fixture",headers:{},instanceId:"instance"};};
  const guard=()=>{if(!current)throw Error("context changed");};
  if(stage==="accepted"){const result=await call("upload.workspace",{},discover,undefined,guard);assert.equal(result.state,"accepted");assert.equal(posts,1);}
  else{let failure;try{await call("upload.workspace",{},discover,undefined,guard);}catch(error){failure=error;}
   assert.match(failure.message,/context changed/);assert.equal(failure.sftpNotStarted,true);assert.equal(posts,stage==="discovery"?0:1);}
  assert.equal(confirmations,stage==="retry"?1:0);assert.ok(sent.every(row=>!Object.hasOwn(row.params,"assertCurrent")));
 }
});
test("early retry cancellation and legacy capability wait prove no request was sent",async()=>{
 for(const stage of ["entry","after-discovery","legacy-entry","legacy-capability"]){
  let current=true,checks=0,posts=0;const guard=()=>{if(!current)throw Error("context changed");};
  const context={AbortController,AbortSignal,URL,process,setTimeout,clearTimeout,
   assertRetryRequestCurrent:()=>{checks++;if(stage==="entry"&&checks===1||stage==="after-discovery"&&checks===2||stage==="legacy-entry")throw Error("retry cancelled");},
   retryRequestSignal:()=>undefined,registerRetryStopCheck:()=>()=>{},
   ProgressInactivity:class{update(){return false;}dispose(){}},BoundedSseDecoder:class{},
   fetch:async()=>{posts++;throw Error("unexpected fetch");},postProgressRpc:async()=>{posts++;throw Error("unexpected post");},
   workspaceRoot:()=>"A",sftpFileIndexQuery:()=>undefined,fileOperationIndexPaths:()=>[],errorMessage:e=>String(e.message||e)};
  const call=vm.runInNewContext(ts.transpileModule(fn.getText(tree).replace(/^export\s+/,"")+";callSftpWithProgress",{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
  context.callSftpWithProgress=call;
  let work;
  if(stage.startsWith("legacy")){
   const legacy=fs.readFileSync(path.resolve(__dirname,"../../src/extension/legacy.ts"),"utf8"),sourceTree=ts.createSourceFile("legacy.ts",legacy,ts.ScriptTarget.Latest,true);let method;
   function find(node){if(ts.isMethodDeclaration(node)&&node.name.getText(sourceTree)==="simpleSftpApiCall")method=node;ts.forEachChild(node,find);}find(sourceTree);
   const Host=vm.runInNewContext(ts.transpileModule("class Host{"+method.getText(sourceTree)+"};Host",{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
   const host=new Host();host.simpleSftpCapability=async()=>{current=false;return {endpoint:"http://fixture",headers:{}};};host.invalidateSimpleSftpCapabilityAfterFailure=()=>{};
   work=host.simpleSftpApiCall("transfers.cancel",{},0,undefined,undefined,guard);
  }else work=call("transfers.cancel",{},async()=>({endpoint:"http://fixture",headers:{}}),undefined,guard);
  let failure;try{await work;}catch(error){failure=error;}assert.ok(failure);assert.equal(failure.sftpNotStarted,true);assert.equal(posts,0);
 }
});
test("mutation index work stays with the caller before and after an accepted request",async()=>{
 const legacy=fs.readFileSync(path.resolve(__dirname,"../../src/extension/legacy.ts"),"utf8"),sourceTree=ts.createSourceFile("legacy.ts",legacy,ts.ScriptTarget.Latest,true),names=new Set(["simpleSftpApiCall","refreshProjectFileIndexesBeforeOperation"]),methods=[];
 function find(node){if(ts.isMethodDeclaration(node)&&names.has(node.name.getText(sourceTree)))methods.push(node.getText(sourceTree));ts.forEachChild(node,find);}find(sourceTree);assert.equal(methods.length,2);
 for(const stage of ["before-refresh","accepted","baseline"]){
  let current=true,posts=0,invalidations=0,refreshes=0,indexes=0,queries=0;
  const context={assertRetryRequestCurrent:()=>{},workspaceRoot:()=>current?"A":"B",sftpFileIndexQuery:method=>method==="upload.workspace"?undefined:{},fileOperationIndexPaths:()=>[],
   path,crypto:require("node:crypto"),readLocalFileIndexPaths:async()=>({}),scopeIndexUnsupported:()=>false,
   callSftpWithProgress:async()=>{posts++;if(stage==="accepted")current=false;return {state:"accepted"};}};
  const Host=vm.runInNewContext(ts.transpileModule("class Host{"+methods.join("\n")+"};Host",{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
  const host=new Host();host.client={getWorkerSyncScopeIndex:async()=>{queries++;return {};}};host.assertTransferRootSafety=()=>{};
  host.invalidateSimpleSftpCapabilityAfterFailure=()=>{};host.invalidateProjectFileIndexes=async()=>{invalidations++;};
  host.simpleSftpCapability=async()=>{queries++;return {};};host.projectFileObservationIndex=()=>{indexes++;return {file:"fake",readBaseline:async()=>{current=false;return {};},read:async(_q,load)=>load()};};
  if(stage!=="baseline")host.refreshProjectFileIndexesBeforeOperation=async()=>{refreshes++;if(stage==="before-refresh")current=false;};
  const guard=()=>{if(!current)throw Error("context changed");};
  if(stage==="baseline"){
   await host.refreshProjectFileIndexesBeforeOperation("upload.workspace",{source:{id:"w",remotePath:"/A"},memoryOnly:true},"before-operation",guard);
   assert.equal(queries,0);assert.equal(posts,0);assert.equal(indexes,1);
  }else if(stage==="before-refresh"){
   let failure;try{await host.simpleSftpApiCall("upload.workspace",{},0,undefined,undefined,guard);}catch(error){failure=error;}
   assert.match(failure.message,/context changed/);assert.equal(failure.sftpNotStarted,true);assert.equal(posts,0);assert.equal(invalidations,0);assert.equal(indexes,0);
  }else{
   const result=await host.simpleSftpApiCall("upload.workspace",{},0,undefined,undefined,guard);
   assert.equal(result.state,"accepted");assert.equal(posts,1);assert.equal(invalidations,1);assert.equal(refreshes,1);assert.equal(indexes,0);
  }
 }
});
