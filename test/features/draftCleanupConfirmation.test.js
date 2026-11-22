const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
require('../_helpers/registerTsRequire');
let listener,html,posted,disposed;
const panel={webview:{set html(value){html=value},get html(){return html},onDidReceiveMessage(fn){listener=fn},postMessage(msg){posted.push(msg);return Promise.resolve(true)}},onDidDispose(){},dispose(){disposed=true}};
const vscode={ViewColumn:{Active:1},window:{createWebviewPanel:()=>panel,showInformationMessage:()=>{}}};
const load=Module._load;let confirmSyncScopePaths;
try{Module._load=function(id,...args){return id==='vscode'?vscode:load.call(this,id,...args)};({confirmSyncScopePaths}=require('../../src/features/SyncScopeConfirmation.ts'))}finally{Module._load=load}
const root=path.resolve('synthetic-draft-project');
const src=fs.readFileSync(path.resolve('src/extension/legacy.ts'),'utf8');
const start=src.indexOf('    async cleanupDraftsFromUi(message) {'),end=src.indexOf('    async savePlanFromUi(message)',start);
assert.ok(start>=0&&end>start);
const expression=src.slice(start,end).trim().replace('async cleanupDraftsFromUi(message)', 'async function(message)');
function fixture(){
 posted=[];listener=undefined;html='';disposed=false;const moved=[];
 const drafts={cleanupApprovedDrafts:async(project,records,paths)=>{moved.push({project,records,paths});return {moved:paths}}};
 const cleanup=new Function('workspaceRoot','stringArrayField','confirmSyncScopePaths','UiCommandCancelled','DraftPlans_1','path','vscode',`return (${expression})`)(()=>root,(row,key)=>Array.isArray(row[key])?row[key]:[],confirmSyncScopePaths,class UiCommandCancelled extends Error{},drafts,path,vscode);
 const host={draftPlanState:{cleanupCandidates:[{path:'tmp/plan/old-a.yaml',reason:'rejected'},{path:'tmp/plan/old-b.yaml',reason:'stale'}],drafts:[{draftPlanPath:'tmp/plan/old-a.yaml'}]},refreshDraftPlans:async()=>{},withHostOperationLease:async(_action,_label,work)=>work()};
 return {host,cleanup,moved};
}

test('draft UI cleanup displays exact paths twice before the mocked move',async()=>{
 assert.match(src,/case "cleanupDrafts":\s*await this\.cleanupDraftsFromUi\(message\)/);
 assert.match(fs.readFileSync(path.resolve('src/ui/PanelHtml.legacy.ts'),'utf8'),/data-command="cleanupDrafts"/);
 const f=fixture(),pending=f.cleanup.call(f.host,{paths:['tmp/plan/old-a.yaml']});
 await Promise.resolve();assert.ok(listener);assert.ok(html.includes(path.resolve(root,'tmp/plan/old-a.yaml')));assert.ok(!html.includes('old-b.yaml'));
 listener({type:'confirm'});await Promise.resolve();assert.equal(f.moved.length,0);
 listener({type:'reviewed'});assert.deepEqual(posted,[{type:'secondStage'}]);assert.equal(f.moved.length,0);
 listener({type:'confirm'});await pending;assert.equal(disposed,true);assert.deepEqual(f.moved.map(row=>row.paths),[['tmp/plan/old-a.yaml']]);
});

test('draft UI cancellation before the second confirmation never calls the move',async()=>{
 const f=fixture(),pending=f.cleanup.call(f.host,{});await Promise.resolve();listener({type:'reviewed'});listener({type:'cancel'});
 await assert.rejects(pending,/草稿清理已取消/);assert.equal(f.moved.length,0);assert.equal(disposed,true);
});

test('draft API retains exact confirmation factors and refuses changed candidate paths',async()=>{
 const candidates=[{path:'tmp/plan/old-a.yaml',reason:'rejected'},{path:'tmp/plan/old-b.yaml',reason:'stale'}],moves=[];
 const drafts={listCleanupCandidates:async()=>candidates,cleanupApprovedDrafts:async(_root,_records,paths)=>{moves.push(paths);return {moved:paths}}};
 const method=(name,next,deps)=>{const a=src.indexOf(`    async ${name}(`),b=src.indexOf(`    async ${next}(`,a);assert.ok(a>=0&&b>a);
  const code=src.slice(a,b).trim().replace(`async ${name}(`,'async function(');return new Function(...Object.keys(deps),`return (${code})`)(...Object.values(deps))};
 const stringArrayField=(row,key)=>Array.isArray(row[key])?[...new Set(row[key].filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim()))]:[];
 const confirm=preview=>Object.assign(Error('CONFIRM_REQUIRED'),{preview});
 const deps={workspaceRoot:()=>root,stringArrayField,confirmationRequired:confirm,DraftPlans_1:drafts,path};
 const host={draftPlanState:{drafts:[]},refreshDraftPlans:async()=>{},withHostOperationLease:async(_action,_label,work)=>work()};
 host.draftCleanupConfirmationTargets=method('draftCleanupConfirmationTargets','syncDraftFilesForRun',deps);
 const cleanup=method('apiDraftCleanup','draftCleanupConfirmationTargets',deps).bind(host);
 const paths=candidates.map(row=>row.path),confirmedPaths=paths.map(item=>path.resolve(root,item));
 await assert.rejects(cleanup({paths}),e=>e.message==='CONFIRM_REQUIRED'&&e.preview.targets.length===2);
 await assert.rejects(cleanup({paths,confirm:true}),/CONFIRM_REQUIRED/);
 await assert.rejects(cleanup({paths,confirm:true,pathConfirmed:true,confirmedPaths:[confirmedPaths[0],path.resolve(root,'renamed')]}),/CONFIRM_REQUIRED/);
 assert.equal(moves.length,0);
 assert.equal((await cleanup({paths,confirm:true,pathConfirmed:true,confirmedPaths})).ok,true);assert.deepEqual(moves,[paths]);
 await assert.rejects(cleanup({paths:['tmp/plan/missing.yaml'],confirm:true,pathConfirmed:true,confirmedPaths}),/路径已变化/);
 assert.equal(moves.length,1);
});
