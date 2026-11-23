"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),ts=require("typescript"),vm=require("node:vm");
const source=fs.readFileSync(path.resolve(__dirname,"../../src/extension/legacy.ts"),"utf8");
const tree=ts.createSourceFile("legacy.ts",source,ts.ScriptTarget.Latest,true);let method;
function visit(node){if(ts.isMethodDeclaration(node)&&node.name.getText(tree)==="syncCodeTargets")method=node;ts.forEachChild(node,visit);}visit(tree);
class Cancelled extends Error {}
test("code sync retains original context at lease, inventory, write and proof boundaries",async()=>{
 for(const stage of ["lease","inventory","write","proof","normal"]){
  let current=true,uploads=0,inventories=0,releases=0;const target={id:"w",role:"worker",label:"w",remotePath:"/fake"},manifest={"train.py":{sha256:"a"}};
  const flip=()=>{current=false;host.lastCodeSyncState={sentinel:"B"};};
  const Host=vm.runInNewContext(ts.transpileModule("class Host{"+method.getText(tree)+"};Host",{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{
   UiCommandCancelled:Cancelled,isUiCommandCancelled:e=>e instanceof Cancelled,assertRetryRequestCurrent:()=>{},workspaceRoot:()=>"A",
   vscode:{workspace:{getConfiguration:()=>({get:()=>[]})},Uri:{file:x=>x}},ConfigurationSettings_1:{explicitConfigurationValue:()=>[]},
   loadSyncHolds:async()=>({}),buildLocalCodeManifest:async()=>({manifest,stats:{}}),filterHeldFiles:x=>x.manifest,
   PlanCodeScopeHost:{runSourceManifest:x=>x,codeInventoryBatches:()=>[["train.py"]]},isUnderMachineStatePrefixes:()=>false,
   fingerprintFromManifest:()=>"fp",syncRoleStatus:()=>({hubSuccess:"ok",workersSuccess:"ok",workersRunning:"running"}),
   codeSyncConfirmationLabel:()=>"run",mapLimited:async(rows,_n,fn)=>Promise.all(rows.map(fn)),
   inventoryFilesByPath:()=>({}),changedManifestFiles:()=>stage==="proof"?{}:manifest,sftpUploadSucceeded:()=>true,
   resultError:x=>String(x),errorMessage:e=>String(e?.message||e)});
  const host=new Host();Object.assign(host,{context:{globalStorageUri:{fsPath:"storage"}},codeSyncInFlight:0,codeSyncAgentProofs:new Map(),
   lastCodeSyncState:{workerVersions:{}},lastWorkerProbes:{w:{status:"ok"}},projectContextIsCurrent:()=>current,
   boundedPromise:async fn=>fn(),ensureSftpManagerCommand:async()=>{},prepareCodeSyncRootGuards:async()=>({guards:new Map([[target,{prefixes:[]}]]),assertBindingsCurrent:()=>{}}),
   planSubmissionManifestKey:()=>"key",localMachineStateGuard:()=>({prefixes:[]}),localCodeManifestCacheFile:()=>"cache",
   checkRunCodeWithoutUploadLocal:async()=>undefined,safeWorkerCodeSyncTargets:async rows=>rows,confirmRemoteWriteTargets:async()=>{},
   writeSftpManagerServerProfiles:async()=>{},persistProjectCodeSyncState:async()=>{},postState:()=>{},resolveCodeUploadTargetIdentityLocal:()=>({key:"key"}),
   takeoverCodeUploadTargetLocal:async()=>({quiescent:true}),acquireCodeUploadTargetLeaseLocal:async()=>{if(stage==="lease")flip();return {token:"lease",key:"key"};},
   releaseCodeUploadTargetLeaseLocal:()=>{releases++;},codeSyncWarmProofKey:()=>"proof",rememberCodeSyncWarmProof:()=>{},sftpServerOptions:()=>({}),
   verifiedSftpProjectInventory:async()=>{inventories++;if(stage==="inventory")flip();return {};},
   withCodeUploadRoundWriteLocal:async(_id,_key,send)=>{if(stage==="write")flip();return send();},
   simpleSftpApiCall:async()=>{uploads++;return {ok:true,status:"completed"};},
   ensureWorkerCodeSyncProof:async()=>{if(stage==="proof")flip();return {proofId:"p"};},markProjectOnboardingComplete:async()=>{}});
  const work=host.syncCodeTargets([target],"run",{projectContext:{root:"A"},hashCompare:true,assertCurrent:()=>{if(!current)throw new Cancelled("context changed");}});
  if(stage==="normal"){await work;assert.equal(uploads,1);}
  else{await assert.rejects(work,/context changed/);assert.equal(uploads,0);assert.equal(host.lastCodeSyncState.sentinel,"B");}
  assert.equal(releases,1);if(stage==="lease")assert.equal(inventories,0);
 }
});
test("takeover keeps its caller through queued projection and individual cancellations",async()=>{
 const names=new Set(["takeoverCodeUploadTargetLocal","takeoverCodeUploadTargetLockedLocal","verifyCodeUploadTargetQuiescentLocal","cancelCodeUploadTargetWriteLocal"]),methods=[];
 function collect(node){if(ts.isMethodDeclaration(node)&&names.has(node.name.getText(tree)))methods.push(node.getText(tree));ts.forEachChild(node,collect);}collect(tree);
 assert.equal(methods.length,4);
 const Host=vm.runInNewContext(ts.transpileModule("class Host{"+methods.join("\n")+"};Host",{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{setTimeout,errorMessage:e=>String(e.message||e)});
 for(const stage of ["tail","projection","accepted"]){
  let current=true,cancels=0,release;const rows=[{transferId:"one",targetScoped:true},{transferId:"two",targetScoped:true}];
  const host=new Host();host.codeUploadTakeoverTails=new Map();host.codeUploadTargetLeases={held:new Map()};
  host.codeUploadTargetRowsLocal=()=>({rows,blocked:[],protectedRows:[],pendingOperations:0});
  host.codeUploadCurrentRoundTargetKeysLocal=()=>new Set();host.codeUploadRoundWriteFloorLocal=()=>0;
  host.simpleSftpApiCall=async(method,_params,_timeout,_progress,_observation,guard)=>{
   guard?.();if(method==="transfers.list"){if(stage==="projection")current=false;return {ok:true,transfers:[],operations:[],instanceId:"fake",busy:{schemaVersion:1,busy:true}};}
   cancels++;if(stage==="accepted"&&cancels===1)current=false;return {ok:true,cancelled:true,status:"accepted"};
  };
  if(stage==="tail")host.codeUploadTakeoverTails.set("key",new Promise(resolve=>{release=resolve;}));
  const guard=()=>{if(!current)throw new Cancelled("context changed");};
  const work=host.takeoverCodeUploadTargetLocal({id:"w"},"key","sync",guard);
  if(stage==="tail"){current=false;release();}
  let failure;try{await work;}catch(error){failure=error;}assert.match(failure.message,/context changed/);
  assert.equal(cancels,stage==="accepted"?1:0);if(stage==="accepted")assert.match(failure.message,/此前已受理取消：one/);
 }
});
