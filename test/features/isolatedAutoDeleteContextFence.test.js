"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
require("../_helpers/registerTsRequire");
const {PlanCleanup}=require("../../src/features/PlanCleanup.ts");
function fixture(count=2){
 let current=true,record,calls=[],flipAfterFirst=false,flipAtParent=false;
 const node=i=>({id:"w"+i,kind:"remote",root:"/root",host:"fake",port:22,user:"u"});
 const rows=Array.from({length:count},(_,i)=>({id:"r"+i,node:node(i),disposition:"isolate",backendToken:"token"+i,backendDigest:"digest"+i,
  backendIndex:0,relativePath:"out/"+i,destination:"clean/"+i,type:"directory",isolationReceipt:{renamed:true,sourceMissingAtMove:true,registered:true}}));
 record={id:"operation",preview:{action:"isolate",autoDeleteCapability:1,rows},targets:Object.fromEntries(rows.map(row=>[row.id,{state:"completed"}]))};
 const parents=rows.map(row=>({token:"parent-"+row.node.id,digest:"parent-digest",node:row.node,sourceIsolationTokens:[row.backendToken],confirmations:2,confirmationPaths:[],targets:[],confirmationTargets:[]}));
 const service=new PlanCleanup({storageRoot:"unused",sftp:async(method,params,guard)=>{guard?.();calls.push({method,token:params.token});
  if(method==="files.cleanup.isolatedMaintenanceDelete"){if(flipAfterFirst&&calls.length===1)current=false;return {state:"accepted",operationId:"accepted"};}
  return {state:"completed",receipt:{emptyDirectoriesRemoved:0}};},currentNode:async id=>{if(flipAtParent)current=false;return rows.find(row=>row.node.id===id).node;}});
 service.status=async()=>structuredClone(record);service.save=async value=>{record=structuredClone(value);};
 return {service,parents,calls,guard:()=>{if(!current)throw Error("context changed");},setCurrent:value=>{current=value;},
  flipAfterFirst:()=>{flipAfterFirst=true;},flipAtParent:()=>{flipAtParent=true;},clearParentFlip:()=>{flipAtParent=false;},get record(){return record;}};
}
test("accepted groups persist while unsent groups remain available under their original token",async()=>{
 const f=fixture();f.flipAfterFirst();
 await assert.rejects(f.service.autoDeleteIsolated("operation",f.parents,f.guard),/已有 1 组后台清理已受理，其余组未发送/);
 assert.equal(f.calls.length,1);assert.equal(f.record.autoDeleteGroups[0].state,"accepted");assert.equal(f.record.autoDeleteState,undefined);
 f.setCurrent(true);const outcome=await f.service.autoDeleteIsolated("operation",f.parents,f.guard);
 assert.equal(outcome.state,"accepted");assert.equal(f.calls.filter(call=>call.method==="files.cleanup.isolatedMaintenanceDelete").length,2);
 assert.deepEqual(f.calls.filter(call=>call.method==="files.cleanup.isolatedMaintenanceDelete").map(call=>call.token),["token0","token1"]);
});
test("context changes during parent lookup stop its unsent execution without sealing the original request",async()=>{
 const f=fixture(1);f.flipAtParent();
 const first=await f.service.autoDeleteIsolated("operation",f.parents,f.guard);
 assert.equal(first.state,"unknown");assert.match(first.message,/未发送的空目录批次已暂停/);
 assert.equal(f.calls.length,1);assert.equal(f.record.autoDeleteState,undefined);assert.equal(f.record.autoDeleteGroups[0].state,"accepted");
 f.clearParentFlip();f.setCurrent(true);const second=await f.service.autoDeleteIsolated("operation",f.parents,f.guard);
 assert.equal(second.state,"accepted");assert.deepEqual(f.calls.map(call=>call.method),["files.cleanup.isolatedMaintenanceDelete","files.cleanup.execute"]);
});
