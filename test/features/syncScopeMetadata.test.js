const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
require('../_helpers/registerTsRequire');
const {buildScopeMetadataStatuses,queryScopeMetadata}=require('../../src/features/SyncScopeMetadata.ts');
const {collectLocalScopeMetadata,collectLocalScopeInventory,buildScopeStatuses}=require('../../src/features/SyncScopeStatus.ts');
const {planLatestWorkerMerge}=require('../../src/features/SyncLatestMerge.ts');
const file=(size,time=1000)=>({size,modifiedAtMs:time});

test('timestamp-only changes are pending content comparison, never a difference or an indexing failure',async()=>{
 const rows=await queryScopeMetadata(['local','w1','w2'].map((id,i)=>({id,read:async()=>({files:{'dir/a':file(12,1000+i*1000)}})})));
 assert.equal(rows['dir/a'].state,'unknown');assert.match(rows['dir/a'].detail,/仅修改时间不同.*内容待比较/);
 assert.equal(rows['dir/a'].versions,undefined,'metadata does not invent a content digest');
 for(const name of ['.','dir']){assert.equal(rows[name].state,'unknown');assert.match(rows[name].detail,/差异 0.*未知 0.*待比较内容 1/);assert.equal(rows[name].unverified,false);
  for(const copy of Object.values(rows[name].copies)){assert.equal(copy.needsSync,0);assert.equal(copy.unverified,0);assert.equal(copy.missing,0);}}
 assert.equal(rows['dir/a'].metadata.w1.status,'present');
});

test('size differences, actual absence and failed reads remain distinct from timestamp-only hints',()=>{
 const rows=buildScopeMetadataStatuses(['local','w1','w2'],{local:{files:{'dir/a':file(12,1000),'dir/b':file(12,1000)}},w1:{files:{'dir/a':file(13,2000)}},w2:{files:{'dir/a':file(12,3000),'dir/b':file(12,3000)}}},new Map());
 assert.equal(rows['dir/a'].state,'different');assert.match(rows['dir/a'].detail,/文件大小不同/);assert.equal(rows['dir/b'].state,'different');assert.match(rows['dir/b'].detail,/确认缺失：w1/);
 const failed=buildScopeMetadataStatuses(['local','w1'],{local:{files:{a:file(12)}}},new Map([['w1','offline']]));
 assert.equal(failed.a.state,'unknown');assert.match(failed.a.detail,/查询失败/);assert.equal(failed['.'].unverified,true);assert.equal(failed['.'].copies.w1.missing,0);
});

test('actual equal bytes at different times become identical after hashing; equal sizes with different bytes stay different',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'scope-content-time-')),roots={};
 for(const [i,id]of ['local','w1','w2'].entries()){roots[id]=path.join(root,id);await fs.mkdir(path.join(roots[id],'dir'),{recursive:true});const name=path.join(roots[id],'dir','a');await fs.writeFile(name,'same','utf8');await fs.utimes(name,1700000000+i*100,1700000000+i*100);}
 const inventories={};for(const [id,dir]of Object.entries(roots))inventories[id]=await collectLocalScopeMetadata(dir,'.');
 const metadata=buildScopeMetadataStatuses(Object.keys(roots),inventories,new Map());assert.equal(metadata['dir/a'].state,'unknown');assert.match(metadata.dir.detail,/差异 0/);
 const contents={};for(const [id,dir]of Object.entries(roots))contents[id]=await collectLocalScopeInventory(dir,'.');
 const input={local:contents.local,workers:{w1:contents.w1,w2:contents.w2}},ledger={schemaVersion:2,entries:{}};
 for(const mode of ['local-server','server-server']){const statuses=buildScopeStatuses(input,mode,['.'],new Set(),ledger);assert.equal(statuses['dir/a'].state,'same');assert.equal(statuses.dir.state,'same');assert.equal(statuses.dir.copies.w2.needsSync,0);if(mode==='server-server')assert.deepEqual(planLatestWorkerMerge(statuses,['w1','w2']),{items:[],skipped:[],skippedPaths:[]});}
 await fs.writeFile(path.join(roots.w2,'dir','a'),'diff','utf8');await fs.utimes(path.join(roots.w2,'dir','a'),1700001000,1700001000);input.workers.w2=await collectLocalScopeInventory(roots.w2,'.');
 for(const mode of ['local-server','server-server']){const statuses=buildScopeStatuses(input,mode,['.'],new Set(),ledger);assert.equal(statuses['dir/a'].state,'different');assert.equal(statuses.dir.state,'different');}
});
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
 assert.equal(rows['.'].state,'unknown');assert.match(rows['.'].detail,/查询失败：nwpu2、nwpu3/);assert.doesNotMatch(rows['.'].detail,/索引未完成/);
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

test('per-location progress retains completed, partial and failed states while another endpoint reads',async()=>{
 let release;const progress=[];
 const pending=queryScopeMetadata([
  {id:'fast',read:async report=>{report('索引接收中');return {files:{a:file(1)}};}},
  {id:'partial',read:async()=>({files:{},unverifiedFiles:{private:'PermissionError'}})},
  {id:'failed',read:async()=>{throw Error('offline');}},
  {id:'slow',read:()=>new Promise(resolve=>release=resolve)},
 ],undefined,(_stage,row)=>progress.push(row));
 await new Promise(setImmediate);
 const latest=id=>progress.filter(row=>row.endpointId===id).at(-1);
 assert.equal(latest('fast').state,'complete');assert.equal(latest('fast').files,1);
 assert.equal(latest('partial').state,'partial');assert.equal(latest('failed').state,'failed');assert.equal(latest('slow').state,'reading');
 release({files:{}});await pending;assert.equal(latest('slow').state,'complete');assert.equal(latest('slow').files,0);
});

test('local metadata reuses guarded walk stats and reports progress without a second ancestor walk',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'scope-metadata-speed-'));
 await fs.mkdir(path.join(root,'deep','nested'),{recursive:true});
 for(let i=0;i<130;i++)await fs.writeFile(path.join(root,'deep','nested',`f${i}`),'x');
 const original=fs.lstat;let calls=0;const progress=[];
 fs.lstat=async(...args)=>{calls++;return original(...args);};
 try{const result=await collectLocalScopeMetadata(root,'.',undefined,stage=>progress.push(stage));assert.equal(Object.keys(result.files).length,130);assert.ok(progress.some(stage=>stage.includes('目录项')));assert.ok(calls<150,`expected one guarded traversal, got ${calls} stats`);}
 finally{fs.lstat=original;}
});
