const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
require('../_helpers/registerTsRequire');
const {buildScopeMetadataStatuses,queryScopeMetadata}=require('../../src/features/SyncScopeMetadata.ts');
const {collectLocalScopeMetadata}=require('../../src/features/SyncScopeStatus.ts');
const file=(size,time=1000)=>({size,modifiedAtMs:time});
test('failure envelopes and absent inventories cannot prove a file is missing',async()=>{
 const rows=await queryScopeMetadata([{id:'good',read:async()=>({files:{'dir/a':file(1)}})},{id:'failed',read:async()=>({ok:false,error:'HTTP 503',files:{}})},{id:'empty',read:async()=>({files:{}})}]);
 assert.equal(rows['dir/a'].metadata.failed.status,'unknown');assert.equal(rows['dir/a'].metadata.empty.status,'absent');
 assert.equal(rows.dir.copies.failed.missing,0);assert.equal(rows.dir.copies.failed.unverified,1);
 const partial=buildScopeMetadataStatuses(['good','no-response'],{good:{files:{a:file(1)}}},new Map());
 assert.equal(partial.a.metadata['no-response'].status,'unknown');assert.ok(partial.a.issueSignature,'unknown files remain in the issue view');
});
test('malformed metadata payloads cannot prove absence, including a failed response with an empty file map',async()=>{
 for(const bad of [{files:'empty'},{files:[]},{files:{},unverifiedFiles:[]},{files:{},status:'unknown'},{files:{},complete:false},{files:{},truncated:true},{files:{'C:/escape':file(1)}}]){
  const rows=await queryScopeMetadata([{id:'good',read:async()=>({files:{a:file(1)}})},{id:'bad',read:async()=>bad}]);
  assert.equal(rows.a.metadata.bad.status,'unknown');assert.equal(rows['.'].copies.bad.missing,0);
 }
});
test('all failed queries name unavailable locations even with no discoverable file names',async()=>{
 const rows=await queryScopeMetadata(['nwpu2','nwpu3'].map(id=>({id,read:async()=>{throw Error('HTTP 503');}})));
 assert.equal(rows['.'].state,'unknown');assert.match(rows['.'].detail,/查询未完成或失败：nwpu2、nwpu3/);
 assert.equal(Object.values(rows['.'].copies).reduce((n,c)=>n+c.missing,0),0);
});
test('all ancestors aggregate missing/difference counts outside selected transfer folders without fabricating hashes',()=>{
 const rows=buildScopeMetadataStatuses(['local','w1','w2'],{local:{files:{'data/nested/a':file(2),'data/nested/b':file(4),'data/nested/c':file(5)}},w1:{files:{'data/nested/a':file(3)}},w2:{files:{'data/nested/a':file(2),'data/nested/b':file(4)}}},new Map());
 for(const name of ['.','data','data/nested']){assert.equal(rows[name].copies.w1.missing,2);assert.equal(rows[name].copies.w1.needsSync,1);assert.equal(rows[name].copies.w2.missing,1);assert.match(rows[name].detail,/缺失 2 · 差异 1/);}
 assert.equal(rows['data/nested/a'].versions,undefined);assert.match(rows['data/nested/a'].issueSignature,/metadata/);
 assert.equal(rows['data/nested/b'].metadata.w1.status,'absent');
});
test('pending/failed endpoints stay unknown, partial good results publish before slow Worker, and reconnect recomputes',async()=>{
 let release;const partial=[];
 const result=queryScopeMetadata([{id:'fast',read:async()=>({files:{'a/b/c':file(2)}})},{id:'slow',read:()=>new Promise(resolve=>release=resolve)},{id:'failed',read:async()=>{throw Error('connection refused');}}],undefined,()=>{},rows=>partial.push(rows));
 await new Promise(setImmediate);assert.ok(partial.length);const before=partial.at(-1)['a/b'];assert.equal(before.copies.slow.missing,0);assert.equal(before.copies.slow.unverified,1);assert.equal(before.copies.failed.missing,0);
 release({files:{}});const done=await result;assert.equal(done['a/b'].copies.slow.missing,1);assert.equal(done['a/b'].copies.failed.missing,0);assert.match(done['.'].detail,/connection refused/);
 const reconnected=await queryScopeMetadata(['fast','slow','failed'].map(id=>({id,read:async()=>({files:{'a/b/c':file(2)}})})));
 assert.equal(reconnected['a/b'].state,'same');assert.match(reconnected['a/b'].detail,/内容未比较/);
});
test('unreadable subtrees and cancellation cannot become missing or publish late facts',async()=>{
 const rows=buildScopeMetadataStatuses(['local','remote'],{local:{files:{'a/b':file(1)}},remote:{files:{},unverifiedFiles:{a:'PermissionError'}}},new Map());
 assert.equal(rows.a.copies.remote.missing,0);assert.equal(rows.a.copies.remote.unverified,1);
 const controller=new AbortController();let release;const updates=[];
 const pending=queryScopeMetadata([{id:'late',read:()=>new Promise(resolve=>release=resolve)}],controller.signal,()=>{},rows=>updates.push(rows));
 controller.abort();release({files:{'a/b':file(2)}});await assert.rejects(pending,{name:'AbortError'});assert.equal(updates.length,0);
});
test('real local recursive metadata reads all nested file stat facts without opening contents or writing cache',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'scope-metadata-'));await fs.mkdir(path.join(root,'a','b'),{recursive:true});await fs.writeFile(path.join(root,'a','b','actual.bin'),Buffer.alloc(4096));
 const read=fs.readFile,open=fs.open,write=fs.writeFile;fs.readFile=fs.open=fs.writeFile=()=>assert.fail('metadata browsing cannot read/write contents');
 try{const result=await collectLocalScopeMetadata(root,'.');assert.equal(result.files['a/b/actual.bin'].size,4096);assert.ok(result.files['a/b/actual.bin'].modifiedAtMs>0);assert.deepEqual(result.unverifiedFiles,{});}
 finally{fs.readFile=read;fs.open=open;fs.writeFile=write;}
});
