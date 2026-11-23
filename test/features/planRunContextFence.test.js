"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
require("../_helpers/registerTsRequire");
const { replaceRunOutputs } = require("../../src/features/PlanRunReplacement.ts");

const preview = { token:"token", digest:"digest", rows:[{ disposition:"isolate", node:{id:"w",kind:"local"}, absolutePath:"/root/out", destination:"/root/clean/out", type:"directory" }], blockers:[] };
function portsFor(current) {
  let calls=[];
  const ports={assertCurrent:()=>{if(!current.value)throw Error("context changed");}, progress:()=>{},
    preview:async()=>{calls.push("preview");return preview;}, save:async()=>{calls.push("save");}, beforeDelete:async()=>{},
    service:{preflightConfirmed:async()=>{calls.push("preflight");}}, execute:async()=>{calls.push("execute");return {state:"completed"};},
    verify:async()=>{calls.push("verify");}, hold:async()=>{calls.push("hold");}, ask:async()=>"rerun_all"};
  return {ports,calls};
}
test("queued replacement never previews or isolates after context changes", async()=>{
  for(const stage of ["preview","preflight","execute"]){
    const current={value:true}, {ports,calls}=portsFor(current);
    let laneCount=0;
    ports.isolation=async(_kind,work)=>{laneCount++;if(stage==="preview"||stage==="preflight"&&laneCount===1||stage==="execute"&&laneCount===2)current.value=false;return work();};
    const state=stage==="preview"?{}:{flow:"isolate",key:"key",previews:[{index:1,preview}],choice:"rerun_all",selectedIndices:[1],phase:1};
    await assert.rejects(replaceRunOutputs(ports,state,"plan",[{index:1}],[],"key"),/context changed/);
    assert.equal(calls.includes("preview"),false);
    assert.equal(calls.includes("execute"),false);
    assert.equal(calls.includes("hold"),false);
  }
});
test("an already returned isolation receipt is saved before stopping on context change", async()=>{
  const current={value:true}, {ports,calls}=portsFor(current);
  const state={flow:"isolate",key:"key",previews:[{index:1,preview}],choice:"rerun_all",selectedIndices:[1],phase:1};
  ports.execute=async()=>{calls.push("execute");current.value=false;return {state:"completed"};};
  ports.save=async()=>{calls.push("save:"+(state.completed||[]).join(","));};
  await assert.rejects(replaceRunOutputs(ports,state,"plan",[{index:1}],[],"key"),/context changed/);
  assert.ok(calls.includes("save:token"));assert.equal(calls.includes("verify"),false);assert.equal(calls.includes("hold"),false);
});
test("source inspection cannot query a replacement project's Worker", async()=>{
  const fs=require("node:fs"),path=require("node:path"),ts=require("typescript"),vm=require("node:vm");
  const source=fs.readFileSync(path.resolve(__dirname,"../../src/extension/PlanRunHost.ts"),"utf8");
  const tree=ts.createSourceFile("PlanRunHost.ts",source,ts.ScriptTarget.Latest,true);
  let member;function visit(node){if(ts.isMethodDeclaration(node)&&node.name.getText(tree)==="replace")member=node;ts.forEachChild(node,visit);}visit(tree);
  let current=true,queries=0;
  const Host=vm.runInNewContext(ts.transpileModule("class Host{constructor(host,root){this.host=host;this.root=root;}"+member.getText(tree)+"};Host",{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,
   {AbortSignal,cleanupRelative:value=>value,canonicalProjectId:()=>"project",cleanupDigest:()=>"same",
    resolvePlanExecutionSource:async()=>{current=false;return {};},verifyLocalPlanSource:()=>assert.fail("stale source reached local verification")});
  const host={captureProjectContext:()=>({root:"project"}),projectContextIsCurrent:()=>current,planCleanupHost:()=>({}),
    workerActionTargets:()=>{queries++;return [];},effectiveConnectionMode:()=>"mode"};
  await assert.rejects(new Host(host,"project").replace({}, {planFile:"plan"}, {jobs:[]}),/工作区或服务器连接配置已变化/);
  assert.equal(queries,2,"only the original connection binding and its initial check are read");
});
test("late metadata and fingerprint work do not publish into the new project", async()=>{
  const fs=require("node:fs"),path=require("node:path"),ts=require("typescript"),vm=require("node:vm");
  const source=fs.readFileSync(path.resolve(__dirname,"../../src/extension/legacy.ts"),"utf8"),tree=ts.createSourceFile("legacy.ts",source,ts.ScriptTarget.Latest,true);
  const names=new Set(["refreshLocalPlanMetadataForAction","localDistributedCodeFingerprint"]),members=[];
  function visit(node){if(ts.isMethodDeclaration(node)&&names.has(node.name.getText(tree)))members.push(node.getText(tree));ts.forEachChild(node,visit);}visit(tree);
  let root="A",current=true,selectionWrites=0,flipRead=false;
  const Host=vm.runInNewContext(ts.transpileModule("class Host{"+members.join("\n")+"};Host",{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,
   {workspaceRoot:()=>root,planDirSafe:()=>"plans",usableSelectionKey:()=>"",readLocalPlans:async()=>{if(flipRead)current=false;return [];},detectLocalProjectForActionGate:async()=>({}),
    mergeRecentPlans:()=>[],vscode:{workspace:{getConfiguration:()=>({get:()=>[]})},Uri:{file:value=>value}},
    loadSyncHolds:async()=>[],ConfigurationSettings_1:{explicitConfigurationValue:()=>[]},
    buildLocalCodeManifest:async()=>{current=false;return [];}});
  const host=new Host();Object.assign(host,{projectContextGeneration:1,localPlanMetadata:{plans:[],archivedPlans:[],detectedProject:{}},recentPlans:[],
   reconcileProjectPlanSelection:()=>{},persistProjectLocalPlanMetadataState:async()=>{root="B";host.projectContextGeneration=2;host.localPlanMetadataKey="B-key";},
   persistProjectPlanSelectionState:async()=>{selectionWrites++;}});
  await host.refreshLocalPlanMetadataForAction({});
  assert.equal(host.localPlanMetadataKey,"B-key");assert.equal(selectionWrites,0);
  root="A";current=true;flipRead=true;host.projectContextGeneration=1;const oldMetadata=host.localPlanMetadata;
  await assert.rejects(host.refreshLocalPlanMetadataForAction({}, {assertCurrent:()=>{if(!current)throw Error("context changed");}}),/context changed/);
  assert.equal(host.localPlanMetadata,oldMetadata);assert.equal(host.localPlanMetadataKey,"B-key");assert.equal(selectionWrites,0);
  current=true;
  Object.assign(host,{context:{globalStorageUri:{fsPath:"storage"}},localMachineStateGuard:()=>({}),localCodeManifestCacheFile:()=>"cache"});
  await assert.rejects(host.localDistributedCodeFingerprint("A",undefined,()=>{if(!current)throw Error("context changed");}),/context changed/);
  assert.equal(host.pendingPlanSubmissionManifest,undefined);
});
