const test=require('node:test'), assert=require('node:assert/strict');
const progressModule=require('../../dist/core/ProgressInactivity');
const Original=progressModule.ProgressInactivity;
let now=0, waits=[];
progressModule.ProgressInactivity=class extends Original {
  constructor(_idle,onIdle){super(120,onIdle,()=>now);waits.push(this);}
};
const {callSftpWithProgress}=require('../../dist/core/SimpleSftpProgressWait');

async function fixture(run) {
  const original=global.fetch; let stream, operationId, finish, cancels=0;
  const discover=async()=>({endpoint:new URL('http://127.0.0.1:1'),headers:{}});
  global.fetch=async(url,options)=>{
    if(String(url).includes('/events')) return new Response(new ReadableStream({start(c){stream=c;options.signal.addEventListener('abort',()=>c.close(),{once:true});}}));
    const request=JSON.parse(options.body);
    if(request.method==='transfers.list') return Response.json({result:{transfers:[]}});
    if(request.method==='transfers.cancel') {cancels++;return Response.json({result:{ok:true}});}
    operationId=request.params._operationId;
    return new Promise((resolve,reject)=>{finish=()=>resolve(Response.json({result:{ok:true,fileCount:1}})); options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true});});
  };
  now=0;waits=[];
  const work=callSftpWithProgress('upload.files',{},discover);
  await new Promise(setImmediate);
  const emit=(data)=>stream.enqueue(new TextEncoder().encode('data: '+JSON.stringify({id:'transfer',operationId,...data})+'\n\n'));
  try {await run({work,finish,emit,get cancels(){return cancels;}});}
  finally {for(const wait of waits)wait.dispose();global.fetch=original;}
}
test('file RPC may exceed old duration while genuine event progress continues',async()=>{
  await fixture(async f=>{
    for(let i=1;i<=20;i++){now+=100;f.emit({phase:'transferring',processedBytes:i});await new Promise(setImmediate);assert.equal(waits[0].check(),false);}
    f.finish();assert.deepEqual(await f.work,{ok:true,fileCount:1});
  });
});
test('repeated events expire; cancellation reaches known transfers and discards late result',async()=>{
  await fixture(async f=>{
    f.emit({phase:'transferring',processedBytes:1});await new Promise(setImmediate);
    now=100;f.emit({phase:'transferring',processedBytes:1});await new Promise(setImmediate);
    now=121;assert.equal(waits[0].check(),true);
    await assert.rejects(f.work,/执行结果待确认/);
    await new Promise(setImmediate);assert.equal(f.cancels,1);
    f.finish();
  });
});

test('oversized RPC responses are bounded and their stream is cancelled', async () => {
  const original = global.fetch;
  let cancelled = false;
  global.fetch = async (url) => {
    if (String(url).includes('/events')) return new Response(null, { status: 204 });
    return new Response(new ReadableStream({ cancel() { cancelled = true; } }), {
      headers: { 'content-length': String(33 * 1024 * 1024) },
    });
  };
  try {
    await assert.rejects(callSftpWithProgress('upload.files', {}, async () => ({ endpoint: new URL('http://127.0.0.1:1'), headers: {} })), /byte limit/);
    await new Promise(setImmediate);
    assert.equal(cancelled, true);
  } finally { global.fetch = original; }
});

test('oversized SSE frames release their reader and do not interrupt the actual transfer', async () => {
  const original = global.fetch;
  let cancelled = false;
  global.fetch = async (url) => {
    if (String(url).includes('/events')) return new Response(new ReadableStream({
      start(c) { c.enqueue(new Uint8Array(1024 * 1024 + 1).fill(97)); },
      cancel() { cancelled = true; },
    }));
    await new Promise(setImmediate);
    return Response.json({ result: { ok: true } });
  };
  try {
    assert.deepEqual(await callSftpWithProgress('upload.files', {}, async () => ({ endpoint: new URL('http://127.0.0.1:1'), headers: {} })), { ok: true });
    assert.equal(cancelled, true);
  } finally { global.fetch = original; }
});
