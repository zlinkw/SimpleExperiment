const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),{spawnSync}=require('node:child_process');
require('../_helpers/registerTsRequire');
const {IncrementalLocalMetadata}=require('../../src/features/IncrementalLocalMetadata.ts');
const {ProjectFileIndex}=require('../../src/features/ProjectFileIndex.ts');
const {SyncScopeAgentIndexReader}=require('../../src/features/SyncScopeAgentIndex.ts');
const {queryScopeMetadata}=require('../../src/features/SyncScopeMetadata.ts');
const {SYNC_SCOPE_INDEX_PYTHON}=require('../../src/runtime/SyncScopeIndex.ts');
async function fixture(){const storage=await fs.mkdtemp(path.join(os.tmpdir(),'incremental-metadata-')),root=path.join(storage,'project');await fs.mkdir(path.join(root,'data','deep'),{recursive:true});await fs.mkdir(path.join(root,'empty'));await fs.writeFile(path.join(root,'data','deep','a'),'abc','utf8');return {storage,root,file:path.join(storage,'baseline')};}

test('local warm and restarted indexes reuse directory enumeration but revalidate in-place edits, new paths and removed subtrees',async()=>{
 const {root,file}=await fixture(),reader=new IncrementalLocalMetadata(root,file);
 const cold=await reader.read();assert.equal(cold.files['data/deep/a'].size,3);assert.equal(cold.acceleration.enumeratedDirectories,4);
 const warm=await reader.read();assert.equal(warm.acceleration.enumeratedDirectories,0);assert.equal(warm.acceleration.changedEntries,0);
 const original=await fs.stat(path.join(root,'data/deep/a'));await fs.writeFile(path.join(root,'data/deep/a'),'larger','utf8');await fs.utimes(path.join(root,'data/deep/a'),original.atime,original.mtime);
 const restarted=await new IncrementalLocalMetadata(root,file).read();assert.equal(restarted.acceleration.restored,true);assert.equal(restarted.acceleration.enumeratedDirectories,0);assert.equal(restarted.files['data/deep/a'].size,6,'directory timestamp and restored mtime cannot conceal a changed file');
 await fs.mkdir(path.join(root,'clean_dir'));await fs.rename(path.join(root,'data'),path.join(root,'clean_dir','data'));
 await fs.mkdir(path.join(root,'new'));await fs.writeFile(path.join(root,'new','b'),'x','utf8');
 const removed=await new IncrementalLocalMetadata(root,file).read();assert.equal(removed.acceleration.restored,true);assert.equal(removed.files['data/deep/a'],undefined);assert.equal(removed.directories.data,undefined);assert.equal(removed.files['new/b'].size,1);assert.equal(Object.keys(removed.files).length,1);
 assert.equal((await new IncrementalLocalMetadata(root,file).read()).acceleration.enumeratedDirectories,0);
 const live=new IncrementalLocalMetadata(root,file);await live.read();await fs.rename(path.join(root,'new','b'),path.join(root,'clean_dir','b'));
 assert.equal((await live.read()).files['new/b'],undefined,'individual file removal updates the delta');
 await fs.writeFile(path.join(root,'new','b'),'recreated','utf8');assert.equal((await live.read()).files['new/b'].size,9,'a recreated path never inherits a negative record');
});

test('local lookup failure stays unknown, cannot publish stale missing facts, then recovers; truncated cache rebuilds',async()=>{
 const {root,file}=await fixture(),reader=new IncrementalLocalMetadata(root,file);await reader.read();
 const original=fs.lstat;fs.lstat=async name=>{if(String(name).endsWith(path.join('deep','a')))throw Object.assign(Error('denied'),{code:'EACCES'});return original(name);};
 try{const status=await queryScopeMetadata([{id:'local',read:()=>reader.read()},{id:'worker',read:async()=>({files:{'data/deep/a':{size:3,modifiedAtMs:1}}})}]);assert.equal(status['data/deep/a'].metadata.local.status,'unknown');assert.equal(status['.'].copies.local.missing,0);}finally{fs.lstat=original;}
 assert.equal((await reader.read()).files['data/deep/a'].size,3);
 await fs.appendFile(file,'broken',{encoding:'utf8'});
 const rebuilt=await new IncrementalLocalMetadata(root,file).read();assert.equal(rebuilt.acceleration.restored,false);assert.equal(rebuilt.files['data/deep/a'].size,3);assert.ok(rebuilt.acceleration.enumeratedDirectories>0);
});

test('host reload restores the remote cursor only after a live refresh; failures and changed endpoint bindings never publish it',async()=>{
 const {root,storage}=await fixture(),identity={workspace:root,endpointId:'worker',projectRoot:'/project',connection:'first',endpointBinding:'host-1'},index=new ProjectFileIndex(identity,storage);
 const reply=(q,g,reset,entries)=>({ok:true,status:'ready',instanceId:'agent',requestId:q.requestId,generation:g,reset,entries,nextCursor:null});
 const first=new SyncScopeAgentIndexReader(async q=>reply(q,1,true,[{p:'.',d:true,m:1},{p:'a',d:false,m:1,s:3}]),undefined,index);
 await first.inventory('first');first.dispose();
 const restarted=new ProjectFileIndex({...identity,connection:'second'},storage);let calls=0;
 const second=new SyncScopeAgentIndexReader(async q=>{calls++;assert.equal(q.afterGeneration,1);assert.equal(q.instanceId,'agent');return reply(q,2,false,[{p:'a',x:true},{p:'b',d:false,m:2,s:4}]);},undefined,restarted);
 const actual=await second.inventory('fresh');assert.equal(calls,1);assert.equal(actual.files.a,undefined);assert.equal(actual.files.b.size,4);
 const offline=new SyncScopeAgentIndexReader(async()=>{throw Error('offline');},undefined,restarted);await assert.rejects(offline.inventory('offline'),/offline/);
 const changed=new ProjectFileIndex({...identity,connection:'third',endpointBinding:'host-2'},storage);
 assert.equal(await changed.readBaseline(),undefined,'same server label cannot reuse another machine cursor');
});

test('only changed directory ancestors recompute; fresh PLAN and artifact checks never use a persisted metadata baseline',async()=>{
 const {root,storage}=await fixture(),index=new ProjectFileIndex({workspace:root,endpointId:'local',projectRoot:root,connection:'one'},storage);
 const data={files:{'one/deep/a':{size:1,modifiedAtMs:1},'two/deep/b':{size:2,modifiedAtMs:1}},directories:{'.':{},one:{},'one/deep':{},two:{},'two/deep':{}}};
 await index.read({method:'local.metadata',metadataOnly:true,recursive:true},async()=>data);
 await index.read({method:'sync.projectFileStats',metadataOnly:true,paths:['one/deep/a']},async()=>({files:{'one/deep/a':{size:3,modifiedAtMs:2}}}));
 let header=JSON.parse(await fs.readFile(index.file,'utf8'));assert.equal(header.directorySummariesRecomputed,3);assert.equal(header.directoryFilesWritten,3);
 await index.read({method:'sync.projectFileStats',metadataOnly:true,paths:['one/deep/a']},async()=>({files:{'one/deep/a':{size:3,modifiedAtMs:2}}}));
 header=JSON.parse(await fs.readFile(index.file,'utf8'));assert.equal(header.directorySummariesRecomputed,0);
 await index.read({method:'sync.projectFileStats',metadataOnly:true,paths:['one']},async()=>({files:{one:{size:4,modifiedAtMs:3}}}));
 assert.equal(index.snapshot().entries['one/deep/a'].presence,'absent','a confirmed file replacing a directory invalidates all old descendants');
 assert.equal(JSON.parse(await fs.readFile(index.directoryFile('.'),'utf8')).summary.files,2);
 await index.writeBaseline({files:{a:{size:1,sha256:'old'}}});
 for(const method of ['plan.source','local.code-manifest','sync.projectInventory']){let calls=0;const query={method,recursive:true,metadataOnly:false};
  await index.read(query,async()=>{calls++;return {files:{a:{size:1,sha256:'a'.repeat(64)}}};});
  await assert.rejects(index.read(query,async()=>{calls++;throw Error('actual source unavailable');}),/actual source unavailable/);assert.equal(calls,2);
 }
});

test('real isolated Worker baseline persists transactionally, reconciles reload and deletion, and gaps force fresh validation',async()=>{
 const {root,storage}=await fixture(),probe=path.join(storage,'check.py');
 const checks=String.raw`
root=sys.argv[1]; cache=os.path.join(sys.argv[2],'metadata.sqlite3')
engine=IncrementalScopeMetadata(root,cache)
first=engine(root,lambda n:None,lambda:False)
assert first['data/deep/a']['s']==3
second=engine(root,lambda n:None,lambda:False)
assert engine.metrics['enumeratedDirectories']==0
assert second['.']['n']==1 and second['.']['b']==3
old=os.stat(os.path.join(root,'data','deep','a'))
with open(os.path.join(root,'data','deep','a'),'w',encoding='utf-8') as out: out.write('longer')
os.utime(os.path.join(root,'data','deep','a'),ns=(old.st_atime_ns,old.st_mtime_ns))
restarted=IncrementalScopeMetadata(root,cache)
current=restarted(root,lambda n:None,lambda:False)
assert restarted.metrics['restored'] and current['data/deep/a']['s']==6
os.makedirs(os.path.join(root,'clean_dir'))
os.rename(os.path.join(root,'data'),os.path.join(root,'clean_dir','data'))
removed=restarted(root,lambda n:None,lambda:False)
assert 'data' not in removed and 'data/deep/a' not in removed and removed['.']['n']==0
assert restarted.metrics['changedEntries']>0
restarted.gap=True
assert restarted(root,lambda n:None,lambda:False)['.']['n']==0
assert restarted.metrics['mode']=='live-stat-reconciliation'
again=IncrementalScopeMetadata(root,cache)
assert again(root,lambda n:None,lambda:False)['.']['n']==0 and again.metrics['restored']
print(json.dumps({'reload':True,'deleteDelta':True,'gapReconcile':True,'native':engine.native}))
`;
 await fs.writeFile(probe,'import os,sys,json,time,threading,uuid,re,stat\n'+SYNC_SCOPE_INDEX_PYTHON+'\n'+checks,'utf8');
 const result=spawnSync(process.platform==='win32'?'python':'python3',['-B','-X','utf8',probe,root,storage],{encoding:'utf8',timeout:10000,windowsHide:true});
 assert.equal(result.status,0,result.stderr||result.stdout);const value=JSON.parse(result.stdout);assert.equal(value.reload,true);assert.equal(value.deleteDelta,true);assert.equal(value.gapReconcile,true);
});

test('native Linux inotify validates no-change, same-size edits and deletion with directory deltas', {skip:process.platform==='win32'&&!process.env.SIMPLEEX_TEST_WSL_DISTRO},async()=>{
 const storage=await fs.mkdtemp(path.join(os.tmpdir(),'incremental-native-')),probe=path.join(storage,'native.py');
 const checks=String.raw`
root=tempfile.mkdtemp(prefix='simpleex-native-index-'); cache=os.path.join(tempfile.mkdtemp(prefix='simpleex-native-cache-'),'index.sqlite3')
os.makedirs(os.path.join(root,'data'))
with open(os.path.join(root,'data','a'),'w',encoding='utf-8') as out: out.write('abc')
engine=IncrementalScopeMetadata(root,cache)
engine(root,lambda n:None,lambda:False)
assert engine.native, 'local Linux fixture must exercise the real inotify path'
warm=engine(root,lambda n:None,lambda:False)
assert engine.metrics['mode']=='native-directory-deltas' and engine.metrics['enumeratedDirectories']==0
assert engine.metrics['statCalls'] <= 4
with open(os.path.join(root,'data','a'),'w',encoding='utf-8') as out: out.write('xyz')
updated=engine(root,lambda n:None,lambda:False)
assert engine.metrics['mode']=='native-directory-deltas' and engine.metrics['enumeratedDirectories']==1
assert updated['data/a']['u'] != warm['data/a']['u']
os.makedirs(os.path.join(root,'clean_dir')); os.rename(os.path.join(root,'data','a'),os.path.join(root,'clean_dir','a'))
single=engine(root,lambda n:None,lambda:False)
assert 'data/a' not in single and single['.']['n']==0
with open(os.path.join(root,'data','a'),'w',encoding='utf-8') as out: out.write('recreated')
assert engine(root,lambda n:None,lambda:False)['data/a']['s']==9
os.rename(os.path.join(root,'data'),os.path.join(root,'clean_dir','data'))
deleted=engine(root,lambda n:None,lambda:False)
assert 'data/a' not in deleted and deleted['.']['n']==0
# Unknown/dropped notifications cannot reuse a completed generation.
engine.gap=True; engine(root,lambda n:None,lambda:False)
assert engine.metrics['mode']=='live-stat-reconciliation'
print(json.dumps({'native':True,'warmDirectoryReads':0,'editedDirectoryReads':1,'deleted':True}))
`;
 await fs.writeFile(probe,'import os,sys,json,time,threading,uuid,re,stat,tempfile\n'+SYNC_SCOPE_INDEX_PYTHON+'\n'+checks,'utf8');
 const win=process.platform==='win32',mapped=win?'/mnt/'+probe[0].toLowerCase()+probe.slice(2).replaceAll('\\','/'):probe;
 const result=spawnSync(win?'wsl.exe':'python3',win?['-d',process.env.SIMPLEEX_TEST_WSL_DISTRO,'--','python3','-B','-X','utf8',mapped]:['-B','-X','utf8',probe],{encoding:'utf8',timeout:10000,windowsHide:true});
 assert.equal(result.status,0,result.stderr||result.stdout);assert.equal(JSON.parse(result.stdout).native,true);
});
