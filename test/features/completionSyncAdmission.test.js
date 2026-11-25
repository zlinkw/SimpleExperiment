const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
require('../_helpers/registerTsRequire');
const { CompletedJobSyncHost } = require('../../src/extension/CompletedJobSyncHost.ts');
const { canonicalProjectId } = require('../../src/features/DistributedPlanQueue.ts');
const { completionIdentity, hasVerifiedCompletion } = require('../../src/features/VerifiedCompletion.ts');
function fixture() {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'completion-sync-')), job={index:0,attempt:0,case:'a',seed:1,status:'completed',completionState:'verified',lifecycleProtocol:2,workerId:'a',commandId:'c',outputDir:'work/a'};
 const plan={id:'p',planFile:'p.yaml',projectId:canonicalProjectId(root),jobs:[job]}, queue={plans:[plan]}, events=[];
 job.verifiedCompletion={schemaVersion:1,identity:completionIdentity(plan,job),verifiedAt:'2026-01-01T00:00:00Z',exitCode:0};
 const h={context:{globalStorageUri:{fsPath:root}},workerCodeSyncTargets:()=>[{id:'a'},{id:'b'}],loadDistributedQueue:async()=>structuredClone(queue),
  mergeLatestWorkerVersions:async(_r,_t,_s,_d,_l,options)=>{events.push('merge');await options.assertCurrent();return {files:{},errors:[]};},
  patchDistributedJob:async(_r,_p,_i,_a,fields)=>{events.push('patch');return !!job.verifiedCompletion && fields.expectedCompletionIdentity===completionIdentity(plan,job);},recordActionError:()=>{}};
 return {root,job,plan,h,events,run:()=>new CompletedJobSyncHost(h,root,()=>true).run(['.'])};
}
test('only exact verified completion enters artifact synchronization',async()=>{
 for (const change of [f=>f.job.completionState='unverified',f=>f.job.verifiedCompletion.identity='old']) {const f=fixture();change(f);assert.deepEqual(await f.run(),{synced:0,excluded:0,errors:[]});assert.deepEqual(f.events,[]);}
 const f=fixture();assert.equal((await f.run()).synced,1);assert.deepEqual(f.events,['merge','patch']);
});
test('withdrawn confirmation prevents the next copy and success receipt',async()=>{
 const f=fixture();f.h.mergeLatestWorkerVersions=async(_r,_t,_s,_d,_l,options)=>{f.events.push('first');delete f.job.verifiedCompletion;await options.assertCurrent();f.events.push('second');return {files:{},errors:[]};};
 const result=await f.run();assert.equal(result.synced,0);assert.ok(result.errors.length);assert.deepEqual(f.events,['first','patch']);
});
test('queue receipt mutation checks the current completion identity and proof',async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../../src/extension/legacy.ts'),'utf8'), tree=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true);let member;
 function visit(n){if(ts.isMethodDeclaration(n)&&n.name.getText(tree)==='patchDistributedJob')member=n;ts.forEachChild(n,visit);}visit(tree);
 const method=vm.runInNewContext(ts.transpileModule('class Host {'+member.getText(tree)+'};Host.prototype.patchDistributedJob',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{completionIdentity,hasVerifiedCompletion});
 const f=fixture(),expected=completionIdentity(f.plan,f.job),h={saveDistributedQueue:async(_root,_unused,options)=>options.mutateLatest({plans:[f.plan]})};
 f.job.workerId='b';assert.equal(await method.call(h,f.root,'p',0,0,{expectedCommandId:'c',expectedCompletionIdentity:expected,requireVerifiedCompletion:true,artifactError:'old'}),false);
 f.job.workerId='a';f.job.completionState='unverified';assert.equal(await method.call(h,f.root,'p',0,0,{expectedCommandId:'c',expectedCompletionIdentity:expected,requireVerifiedCompletion:true,artifactError:'old'}),false);
 f.job.completionState='verified';delete f.job.verifiedCompletion;assert.equal(await method.call(h,f.root,'p',0,0,{expectedCommandId:'c',expectedCompletionIdentity:expected,requireVerifiedCompletion:true,artifactError:'old'}),false);
 f.job.verifiedCompletion={schemaVersion:1,identity:expected,verifiedAt:'2026-01-01T00:00:00Z',exitCode:0};assert.equal(await method.call(h,f.root,'p',0,0,{expectedCommandId:'c',expectedCompletionIdentity:expected,requireVerifiedCompletion:true,artifactError:'new'}),true);
});

test('declared result outside selected scope is not marked fully mirrored',async()=>{
 const f=fixture();Object.assign(f.job,{command:'run',outputs:[],collectionResultCsv:'results/a.csv',actualExecutionMode:'train'});
 f.job.verifiedCompletion.identity=completionIdentity(f.plan,f.job);let receipt;
 f.h.patchDistributedJob=async(_r,_p,_i,_a,fields)=>{receipt=fields;return true;};
 const result=await new CompletedJobSyncHost(f.h,f.root,()=>true).run(['work/a']);
 assert.equal(result.synced,1);assert.deepEqual(receipt.mirroredWorkerIds,[]);assert.equal(receipt.replaceMirroredWorkerIds,true);
});
