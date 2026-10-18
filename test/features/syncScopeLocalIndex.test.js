const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
require('../_helpers/registerTsRequire');
const {SyncScopeLocalIndexReader}=require('../../src/features/SyncScopeLocalIndex.ts');
const {queryScopeMetadata}=require('../../src/features/SyncScopeMetadata.ts');

test('local listings and summaries share one fresh scan; absent, empty and unverified paths remain distinct',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'scope-local-index-'));
 await fs.mkdir(path.join(root,'empty'));await fs.mkdir(path.join(root,'data'));await fs.writeFile(path.join(root,'data','a'),'abc');
 const reader=new SyncScopeLocalIndexReader(root),stages=[];const list=reader.list('.','round');
 const summary=reader.read('round',undefined,stage=>stages.push(stage));
 assert.equal(reader.read('round'),summary,'same round reuses the exact pending snapshot');
 assert.deepEqual((await list).map(e=>e.path).sort(),['data','empty']);
 const index=await summary;assert.equal(index.files['data/a'].size,3);assert.ok(stages.length);
 assert.equal((await reader.list('empty','round')).observation.status,'present');assert.equal((await reader.list('missing','round')).observation.status,'absent');
 await fs.writeFile(path.join(root,'new'),'x');assert.equal((await reader.read('round')).files.new,undefined,'old round is never relabelled as fresh');
 assert.equal((await reader.read('next')).files.new.size,1);
});

test('a local scan with no progress ends unknown and a later explicit round can recover',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'scope-local-idle-')),original=fs.opendir;let release;
 fs.opendir=()=>new Promise(resolve=>release=resolve);
 const reader=new SyncScopeLocalIndexReader(root,10),updates=[];
 try{
  const rows=await queryScopeMetadata([{id:'local',read:report=>reader.read('stalled',undefined,report)},{id:'worker',read:async()=>({files:{remote:{size:1,modifiedAtMs:1}}})}],undefined,(_stage,progress)=>updates.push(progress));
  assert.equal(updates.filter(r=>r.endpointId==='local').at(-1).state,'failed');assert.equal(rows.remote.metadata.local.status,'unknown');assert.equal(rows['.'].copies.local.missing,0);
 }finally{fs.opendir=original;if(release)release(await original(root));}
 await new Promise(setImmediate);
 assert.equal((await reader.read('retry')).directories['.'].modifiedAtMs>0,true);
});

test('verified local status publishes before slow diagnostic directory persistence finishes',async()=>{
 const {ProjectFileIndex}=require('../../src/features/ProjectFileIndex.ts');
 const storage=await fs.mkdtemp(path.join(os.tmpdir(),'local-index-persist-')),root=path.join(storage,'project');
 await fs.mkdir(root);await fs.writeFile(path.join(root,'a'),'abc','utf8');
 const index=new ProjectFileIndex({workspace:root,endpointId:'local',projectRoot:root,connection:'fixture'},storage);
 const original=index.persistDirectories;let release,published=false;
 index.persistDirectories=async function(...args){await new Promise(resolve=>release=resolve);return original.apply(this,args);};
 const reader=new SyncScopeLocalIndexReader(root,30000,index),reading=reader.read('round').then(value=>{published=true;return value;});
 const deadline=Date.now()+2000;while(!release){assert.ok(Date.now()<deadline);await new Promise(setImmediate);}
 await new Promise(setImmediate);
 try{assert.equal(published,true,'view status must not wait for thousands of diagnostic shard writes');}
 finally{release();await reading;await index.flush();}
});
