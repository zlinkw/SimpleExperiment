const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {waitForCodeSyncProof}=require('../../dist/features/CodeSyncProofWaiter');
const identity={operationId:'same-operation',workerId:'worker',manifestDigest:'a'.repeat(64),scopeSignature:'b'.repeat(64)};
test('real progress outlasts the old total deadline and a lost POST response never triggers a second registration',async()=>{
  let submits=0,reads=0;const started=Date.now();
  const result=await waitForCodeSyncProof({...identity,idleMs:120,pollMs:40,assertCurrent(){},submit:()=>{submits++;return new Promise(()=>{});},
    query:async()=>({...identity,status:++reads===6?'completed':'running',processedFiles:reads,processedBytes:reads*10,totalFiles:6,result:{ok:true}})});
  assert.equal(result.ok,true);assert.equal(submits,1);assert.ok(Date.now()-started>120);
});
test('query failure ends an unchanged file verification as unknown without repeating registration',async()=>{
  let submits=0;
  await assert.rejects(waitForCodeSyncProof({...identity,idleMs:50,pollMs:5,assertCurrent(){},submit:async()=>{submits++;throw Error('lost response');},
    query:async()=>{throw Error('read disconnected');}}),/same-operation.*未重复上传/);
  assert.equal(submits,1);
});
test('slow unchanged filesystem observations remain pending until actual proof completes',async()=>{
 let reads=0,submits=0;const messages=[];
 const result=await waitForCodeSyncProof({...identity,idleMs:30,pollMs:15,assertCurrent(){},progress:text=>messages.push(text),submit:async()=>{submits++;},
  query:async()=>({...identity,status:++reads===7?'completed':'running',processedFiles:1,processedBytes:1,result:{ok:true}})});
 assert.equal(result.ok,true);assert.equal(submits,1);assert.ok(messages.some(text=>text.includes('暂未取得新进展')));
});
test('failed or mismatched active query evidence rejects the original operation',async()=>{
  for(const result of [{...identity,status:'failed',error:'mounted file changed'},{...identity,workerId:'other',status:'completed'}]){
    await assert.rejects(waitForCodeSyncProof({...identity,idleMs:100,pollMs:1,assertCurrent(){},submit:async()=>{},query:async()=>result}),/mounted file changed|身份不一致/);
  }
});
test('actual Host proof registration keeps its original operation ID and verifies the final proof',async()=>{
  const source=fs.readFileSync(path.resolve(__dirname,'../../dist/extension/legacy.js'),'utf8');
  const start=source.indexOf('\n    async ensureWorkerCodeSyncProof('),end=source.indexOf('\n    rememberCodeSyncWarmProof(',start);
  assert.ok(start>0&&end>start);
  const sha=text=>crypto.createHash('sha256').update(text).digest('hex');
  const proto=new Function('CodeSyncProofWaiter_1','workspaceRoot','sha256Text','DistributedPlanQueue','makeOpId','UiCommandCancelled',
    'return new class {'+source.slice(start,end)+'};')({waitForCodeSyncProof},()=>'/fixture',sha,{canonicalProjectId:()=>'/fixture'},()=>'original-code-sync-operation',Error);
  let submitted,posts=0,queries=0;
  const client={postWorkerAction:async(worker,action,body)=>{assert.equal(action,'register-code-sync-proof');submitted=body;posts++;throw Error('POST response lost');},
    getWorkerOperation:async(worker,id)=>{queries++;if(!submitted)throw Error('not found yet');assert.equal(id,submitted.opId);return {operationId:id,workerId:worker,
      manifestDigest:submitted.manifestDigest,scopeSignature:submitted.scopeSignature,status:'completed',processedFiles:1,result:{ok:true,proofId:'c'.repeat(64),manifestDigest:submitted.manifestDigest,
        scopeSignature:submitted.scopeSignature,fileCount:1,runtimeGeneration:'verified-runtime',verifiedAt:'now'}};}};
  const host={client,lastWorkerProbes:{worker:{capabilities:{actionEndpoints:{'register-code-sync-proof':true},endpoints:{codeSyncProofAsync:true}}}},codeSyncAgentProofs:new Map()};
  const proof=await proto.ensureWorkerCodeSyncProof.call(host,{id:'worker'},'/fixture','a'.repeat(64),{'train.py':{size:1,sha256:'a'.repeat(64)}},[],[],[],'cache-key');
  assert.equal(proof.proofId,'c'.repeat(64));assert.equal(posts,1);assert.ok(queries>=1);assert.equal(submitted.async,true);
});
test('extracted real Agent registration returns promptly, exposes real progress and preserves input binding',()=>{
  const proc=spawnSync(process.platform==='win32'?'python':'python3',['-B','-X','utf8',path.resolve(__dirname,'codeSyncProofWaiter.fixture.py')],
    {encoding:'utf8',timeout:10000,windowsHide:true});
  assert.equal(proc.status,0,proc.stderr||proc.stdout||String(proc.error));assert.deepEqual(JSON.parse(proc.stdout),{ok:true,asyncBoundary:true,duplicateStarts:1});
});
