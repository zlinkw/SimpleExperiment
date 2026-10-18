const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
require('../_helpers/registerTsRequire');
const {IncrementalLocalMetadata}=require('../../src/features/IncrementalLocalMetadata.ts');
const {SyncScopeLocalIndexReader}=require('../../src/features/SyncScopeLocalIndex.ts');

test('Windows folder browsing reuses a live native generation; edits, new paths and subtree removal check only changed directories',{skip:process.platform!=='win32'},async()=>{
 const storage=await fs.mkdtemp(path.join(os.tmpdir(),'local-native-delta-')),root=path.join(storage,'project');
 for(let n=0;n<40;n++){await fs.mkdir(path.join(root,'d'+n),{recursive:true});await fs.writeFile(path.join(root,'d'+n,'a'),'abc','utf8');}
 const reader=new SyncScopeLocalIndexReader(root),first=await reader.read('initial');assert.equal(Object.keys(first.files).length,40);
 const warm=await reader.read('expand-d0');assert.equal(warm.acceleration.mode,'native-directory-deltas');assert.ok(warm.acceleration.statCalls<=4,JSON.stringify(warm.acceleration));assert.equal(warm.acceleration.enumeratedDirectories,0);
 await fs.writeFile(path.join(root,'d0','a'),'xyz','utf8');
 const edited=await reader.read('expand-d1');assert.equal(edited.acceleration.mode,'native-directory-deltas');assert.ok(edited.acceleration.statCalls<20);assert.equal(edited.files['d0/a'].size,3);assert.notEqual(edited.files['d0/a'].changedAtMs,first.files['d0/a'].changedAtMs);
 await fs.mkdir(path.join(root,'clean_dir'));await fs.rename(path.join(root,'d0'),path.join(root,'clean_dir','d0'));
 const removed=await reader.read('after-removal');assert.equal(removed.files['d0/a'],undefined);assert.equal(removed.directories.d0,undefined);assert.ok(removed.acceleration.statCalls<20);
 assert.equal((await reader.list('d0','after-removal')).observation.status,'absent');
 await fs.mkdir(path.join(root,'d0'));await fs.writeFile(path.join(root,'d0','new'),'new','utf8');
 assert.equal((await reader.read('recreated')).files['d0/new'].size,3);
});

test('native watcher gaps, reload and reconciliation deadlines require live file validation',{skip:process.platform!=='win32'},async()=>{
 const storage=await fs.mkdtemp(path.join(os.tmpdir(),'local-native-gap-')),root=path.join(storage,'project'),file=path.join(storage,'baseline');await fs.mkdir(root);await fs.writeFile(path.join(root,'a'),'a','utf8');
 const engine=new IncrementalLocalMetadata(root,file);await engine.read();assert.equal((await engine.read()).acceleration.mode,'native-directory-deltas');
 engine.changes.lastReconciled=performance.now()-31000;
 assert.equal((await engine.read()).acceleration.mode,'native-directory-deltas','the UI starts a new browse round after 30 seconds; that must not force a full scan');
 engine.invalidate();const original=fs.lstat;fs.lstat=async name=>{if(String(name)===path.join(root,'a'))throw Object.assign(Error('denied'),{code:'EACCES'});return original(name);};
 try{await assert.rejects(engine.read(),/denied/);}finally{fs.lstat=original;}
 const recovered=await engine.read();assert.equal(recovered.files.a.size,1);assert.equal(recovered.acceleration.mode,'live-stat-reconciliation');
 const restarted=await new IncrementalLocalMetadata(root,file).read();assert.equal(restarted.acceleration.restored,true);assert.equal(restarted.acceleration.mode,'live-stat-reconciliation');assert.ok(restarted.acceleration.statCalls>=3);
 engine.changes.lastReconciled=-Infinity;assert.equal((await engine.read()).acceleration.mode,'live-stat-reconciliation');
 engine.changes.watcher.emit('change','rename',null);
 assert.equal((await engine.read()).acceleration.mode,'live-stat-reconciliation','missing notification names require reconciliation');
 engine.changes.watcher.emit('error',Error('watcher interrupted'));
 assert.equal((await engine.read()).acceleration.mode,'live-stat-reconciliation','closed watchers never retain the old cursor');
});

test('native changed-file lookup errors remain unknown and cannot turn a failed read into absence',{skip:process.platform!=='win32'},async()=>{
 const {queryScopeMetadata}=require('../../src/features/SyncScopeMetadata.ts');
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'local-native-unknown-'));await fs.mkdir(path.join(root,'data'));await fs.writeFile(path.join(root,'data','a'),'old','utf8');
 const engine=new IncrementalLocalMetadata(root);await engine.read();await fs.writeFile(path.join(root,'data','a'),'new','utf8');
 const original=fs.lstat;fs.lstat=async name=>{if(String(name)===path.join(root,'data','a'))throw Object.assign(Error('denied'),{code:'EACCES'});return original(name);};
 try{const result=await queryScopeMetadata([{id:'local',read:()=>engine.read()},{id:'worker',read:async()=>({files:{'data/a':{size:3,modifiedAtMs:1}}})}]);assert.equal(result['data/a'].metadata.local.status,'unknown');assert.equal(result['.'].copies.local.missing,0);}
 finally{fs.lstat=original;}
 assert.equal((await engine.read()).files['data/a'].size,3);
});

test('a failed native watcher setup uses live reconciliation and retries without accepting an old cursor',{skip:process.platform!=='win32'},async()=>{
 const native=require('node:fs'),watch=native.watch,root=await fs.mkdtemp(path.join(os.tmpdir(),'local-native-unavailable-'));
 await fs.writeFile(path.join(root,'a'),'a','utf8');const engine=new IncrementalLocalMetadata(root);
 native.watch=()=>{throw Error('temporarily unavailable');};
 try{assert.equal((await engine.read()).acceleration.mode,'live-stat-reconciliation');}finally{native.watch=watch;}
 assert.equal((await engine.read()).acceleration.mode,'live-stat-reconciliation','a new watcher must establish a fully verified baseline');
 assert.equal((await engine.read()).acceleration.mode,'native-directory-deltas');
});
