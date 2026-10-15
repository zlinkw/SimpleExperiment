const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),os=require('node:os'),crypto=require('node:crypto');
require('../_helpers/registerTsRequire');
const H=require('../../src/extension/PlanCodeScopeHost.ts'),Q=require('../../src/features/DistributedPlanQueue.ts'),P=require('../../src/features/DistributedSchedulingPolicy.ts');
test('actual Python scope ignores generated files and unrelated plans, but verifies imported source and inherited config',()=>{
 const r=require('node:child_process').spawnSync(process.platform==='win32'?'python':'python3',['-B','-X','utf8',path.join(__dirname,'planCodeScope.fixture.py'),path.resolve('src/runtime/PlanCodeScope.ts')],{encoding:'utf8',timeout:10000,windowsHide:true});
 assert.equal(r.status,0,r.stderr||r.stdout);assert.equal(JSON.parse(r.stdout).files,13);
});
const hash=content=>crypto.createHash('sha256').update(content).digest('hex');
const source=()=>{const manifest={'plans/p.yaml':{size:4,sha256:hash('plan')},'train.py':{size:4,sha256:hash('code')}};return {manifest,digest:hash(JSON.stringify(Object.entries(manifest).map(([k,v])=>[k,v])))};};
function fixture(){const s=source(),plan={id:'p',projectId:'project',revision:hash('plan'),codeFingerprint:'old-global',planFile:'plans/p.yaml',resultPathPolicy:'declared',executionMode:'train_test',jobs:[{index:0,status:'pending',case:'a',seed:42,attempt:0,outputDir:'work/a',collectionResultCsv:'tmp/a.csv'}]};let calls=0;
 const host={workerActionTargets:()=>[{id:'w'}],lastWorkerProbes:{w:{status:'ok',capabilities:{endpoints:{planCodeScope:1}}}},client:{getWorkerPlanCodeScope:async(_,r)=>{calls++;return {ok:true,compatible:true,readOnly:true,...r,executionSource:s};}}};return {host,plan,s,get calls(){return calls}};}
test('fresh per-plan evidence permits idle dispatch despite unrelated whole-project versions',async()=>{
 const f=fixture(),workers=[{workerId:'w',online:true,idleGpuIds:['0'],declaredJobPaths:true,idleGpuAdmission:true,codeFingerprint:'new-global'}],queue={schemaVersion:1,plans:[f.plan]};
 await H.inspectPlanCodeSlots(f.host,queue,workers);assert.equal(f.calls,2);assert.deepEqual(workers[0].compatiblePlans,['p']);
 const a=Q.allocateAvailable(queue,workers,{requireIdleGpuAdmission:true,localIdleOnly:true});assert.equal(a.dispatches.length,1);assert.equal(a.dispatches[0].workerId,'w');assert.equal(a.queue.plans[0].codeFingerprint,'old-global');
 f.plan.schedulingMode='server_prequeue';assert.equal(P.allocateServerPrequeue(queue,workers.map(w=>({...w,weight:1}))).dispatches.length,1);
 await H.verifyWorkerPlanSource(f.host,'w',f.plan);assert.equal(f.calls,3,'the launch boundary queries again instead of reusing a result');
});
test('a rejected or offline source is never authorized by an otherwise matching project fingerprint',async()=>{
 const f=fixture();f.host.client.getWorkerPlanCodeScope=async()=>{throw Error('mounted code changed: train.py');};
 const workers=[{workerId:'w',online:true,idleGpuIds:['0'],declaredJobPaths:true,idleGpuAdmission:true,codeFingerprint:'old-global'}],queue={schemaVersion:1,plans:[f.plan]};
 await H.inspectPlanCodeSlots(f.host,queue,workers);assert.equal(Q.allocateAvailable(queue,workers,{requireIdleGpuAdmission:true}).dispatches.length,0);
 assert.match(Q.allocateAvailable(queue,workers).queue.plans[0].jobs[0].blockReason,/train.py/);
});
test('local confirmation checks only the frozen source paths and rejects real changes',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'simpleex-source-local-'));fs.mkdirSync(path.join(root,'plans'));fs.writeFileSync(path.join(root,'plans/p.yaml'),'plan','utf8');fs.writeFileSync(path.join(root,'train.py'),'code','utf8');
 const s=source();await H.verifyLocalPlanSource(root,s);fs.writeFileSync(path.join(root,'results.csv'),'new results','utf8');await H.verifyLocalPlanSource(root,s);
 fs.writeFileSync(path.join(root,'train.py'),'bad!','utf8');await assert.rejects(H.verifyLocalPlanSource(root,s),/PLAN_SOURCE_CHANGED.*train.py/);
});
test('automatic preparation filters results and cache before hashing while manual transfer input remains intact',()=>{
 const manifest={'train.py':{size:1},'configs/a.yaml':{size:2},'experiments/results/a.json':{size:3},'work_dirs/a/job_config.yaml':{size:4},'utils/__pycache__/a.pyc':{size:5},'models/.cache/x.json':{size:6},'artifacts/model_cache/model.pt':{size:7}};
 const filtered=H.runSourceManifest(manifest);assert.deepEqual(Object.keys(filtered),['train.py','configs/a.yaml','artifacts/model_cache/model.pt']);assert.equal(Object.keys(manifest).length,7);
 const text=fs.readFileSync('src/extension/legacy.ts','utf8');const start=text.indexOf('async function buildLocalCodeManifest('),end=text.indexOf('async function listLocalCodePaths(',start),fn=text.slice(start,end);
 assert.ok(fn.indexOf('options.executionOnly')<fn.indexOf('hashLocalCodeFiles('));
});
test('one slow source query does not hold the idle Worker which has already verified its inputs',async()=>{
 const f=fixture();f.host.workerActionTargets=()=>[{id:'w'},{id:'slow'}];f.host.lastWorkerProbes.slow={status:'ok',capabilities:{endpoints:{planCodeScope:1}}};
 const base=f.host.client.getWorkerPlanCodeScope;let release;
 f.host.client.getWorkerPlanCodeScope=async(id,r)=>id==='slow'&&r.executionSource?await new Promise(resolve=>{release=()=>resolve({ok:true,compatible:true,readOnly:true,...r});}):base(id,r);
 const workers=['w','slow'].map(workerId=>({workerId,online:true,idleGpuIds:['0'],declaredJobPaths:true,idleGpuAdmission:true,codeFingerprint:'new-global'}));
 await H.inspectPlanCodeSlots(f.host,{plans:[f.plan]},workers);assert.deepEqual(workers[0].compatiblePlans,['p']);assert.equal(workers[1].compatiblePlans,undefined);
 assert.equal(Q.allocateAvailable({schemaVersion:1,plans:[f.plan]},workers).dispatches[0].workerId,'w');release();
});
