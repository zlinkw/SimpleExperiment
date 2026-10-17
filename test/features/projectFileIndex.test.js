const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
require('../_helpers/registerTsRequire');
const {ProjectFileIndex,normalizeFileIndexResult,sftpFileIndexQuery}=require('../../src/features/ProjectFileIndex.ts');
const fixture=async(connection='one')=>{const storage=await fs.mkdtemp(path.join(os.tmpdir(),'project-file-index-'));return {storage,identity:{workspace:storage,endpointId:'worker',projectRoot:'/project',connection}};};
const payload=(n=1)=>({ok:true,files:{'data/a':{size:n,modifiedAtMs:1000,sha256:'a'.repeat(64)}}});
const until=async ready=>{const end=Date.now()+3000;while(!ready()){assert.ok(Date.now()<end,'read did not start');await new Promise(resolve=>setImmediate(resolve));}};

test('same explicit round reuses current evidence; another purpose, round, timeout or restart always reads again',async()=>{
 const {storage,identity}=await fixture();let now=1000,calls=0;const index=new ProjectFileIndex(identity,storage,()=>now),load=async()=>{calls++;return payload(calls);};
 const query={method:'sync.projectInventory',recursive:true,round:'run-1',binding:{runId:'command-1'}};
 assert.equal((await index.read(query,load)).files['data/a'].size,1);await index.read(query,load);assert.equal(calls,1);
 await index.read({...query,metadataOnly:true},load);assert.equal(calls,2,'metadata cannot substitute for content');
 await index.read({...query,round:'run-2'},load);assert.equal(calls,3);
 now+=2001;await index.read(query,load);assert.equal(calls,4);
 const disk=JSON.parse(await fs.readFile(index.file,'utf8'));assert.equal(disk.schemaVersion,1);assert.equal(disk.identity.projectRoot,'/project');assert.equal(JSON.parse(await fs.readFile(index.directoryFile('data'),'utf8')).entries['data/a'].sha256,'a'.repeat(64));assert.equal(disk.observations.at(-1).binding.runId,'command-1');
 const restarted=new ProjectFileIndex({...identity,connection:'new-process'},storage,()=>now);assert.equal(restarted.file,index.file);assert.deepEqual(restarted.snapshot().entries,{});await restarted.read(query,load);assert.equal(calls,5,'disk history cannot authorize a new confirmation');
});

test('complete same-scope reads confirm removal, partial/failure stays unknown and other scopes never imply absence',async()=>{
 const {storage,identity}=await fixture(),index=new ProjectFileIndex(identity,storage);
 const q={method:'sync.projectInventory',recursive:true};await index.read(q,async()=>payload());
 await index.read({...q,relativePath:'elsewhere'},async()=>({files:{}}));assert.equal(index.snapshot().entries['data/a'].presence,'present');
 await index.read(q,async()=>({files:{},complete:false}));assert.equal(index.snapshot().entries['data/a'].presence,'unknown');
 await index.read(q,async()=>({files:{}}));assert.equal(index.snapshot().entries['data/a'].presence,'absent');
 await assert.rejects(index.read(q,async()=>{throw Error('offline');}),/offline/);assert.equal(index.snapshot().entries['data/a'].validity,'historical-only');
 for(const bad of [{ok:false,error:'offline',files:{}},{files:[]},{files:'bad'}])assert.equal(normalizeFileIndexResult(bad,'now','id').state,'failed');
});

test('mutation invalidates in-flight and cached reads; connection replacement cannot restore the old file',async()=>{
 const {storage,identity}=await fixture(),index=new ProjectFileIndex(identity,storage);let release;
 const pending=index.read({method:'metadata',round:'old'},()=>new Promise(resolve=>release=resolve));
 await until(()=>release);
 await index.invalidate('upload started');release(payload());await assert.rejects(pending,/INVALIDATED/);assert.deepEqual(index.snapshot().entries,{});
 let oldRelease;const old=index.read({method:'metadata'},()=>new Promise(resolve=>oldRelease=resolve));
 await until(()=>oldRelease);
 const replacement=new ProjectFileIndex({...identity,connection:'two'},storage);await replacement.read({method:'metadata'},async()=>payload(9));oldRelease(payload(1));await assert.rejects(old,/CONNECTION_REPLACED/);
 assert.equal(JSON.parse(await fs.readFile(replacement.directoryFile('data'),'utf8')).entries['data/a'].size,9);
});

test('late overlapping observations cannot replace newer entry facts and failed envelopes are never reused',async()=>{
 const {storage,identity}=await fixture(),index=new ProjectFileIndex(identity,storage);let release;
 const old=index.read({method:'metadata',round:'old'},()=>new Promise(resolve=>release=resolve));await until(()=>release);await index.read({method:'metadata',round:'new'},async()=>payload(2));release(payload(1));await old;
 assert.equal(index.snapshot().entries['data/a'].size,2);
 let calls=0;const query={method:'metadata',round:'retry'};const bad=async()=>{calls++;return {ok:false,error:'offline',files:{}};};await index.read(query,bad);await index.read(query,bad);assert.equal(calls,2);
 assert.equal(sftpFileIndexQuery('files.cleanup.execute',{}),undefined);assert.equal(sftpFileIndexQuery('sync.projectFileStats',{paths:['a']}).metadataOnly,true);
});

test('an unrelated job output change cannot reject a live PLAN input check',async()=>{
 const {storage,identity}=await fixture(),index=new ProjectFileIndex(identity,storage);let release;
 const check=index.read({method:'plan.source',paths:['configs/model.yaml']},()=>new Promise(resolve=>release=resolve));
 await until(()=>release);
 await index.invalidate('job completed',['work_dirs/job']);release({files:{'configs/model.yaml':{size:1,sha256:'a'.repeat(64)}}});
 await check;assert.equal(index.snapshot().entries['configs/model.yaml'].presence,'present');
});

test('real SFTP entry shares only an explicit read round, strips internal hints and invalidates around actual mutations',async()=>{
 const ts=require('typescript'),vm=require('node:vm'),source=await fs.readFile(path.resolve(__dirname,'../../src/extension/legacy.ts'),'utf8');
 const ast=ts.createSourceFile('host.ts',source,ts.ScriptTarget.Latest,true);let method;function visit(n){if(ts.isMethodDeclaration(n)&&n.name.getText(ast)==='simpleSftpApiCall')method=n;ts.forEachChild(n,visit);}visit(ast);
 const {storage,identity}=await fixture(),index=new ProjectFileIndex(identity,storage);let calls=0;const invalidations=[];
 const run=vm.runInNewContext(ts.transpileModule('class Host{'+method.getText(ast)+'};Host.prototype.simpleSftpApiCall',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,
  {assertRetryRequestCurrent(){},sftpFileIndexQuery,vscode:{workspace:{getConfiguration:()=>({get:()=> 'simple'})}},AgentTmuxPolicy_1:require('../../src/tunnel/AgentTmuxPolicy.ts'),
   callSftpWithProgress:async(name,params,discover)=>{calls++;await discover(name);assert.equal(params.fileIndexRound,undefined);return payload();}});
 const h={simpleSftpCapability:async()=>({}),projectFileObservationIndex:()=>index,invalidateProjectFileIndexes:async reason=>{invalidations.push(reason);await index.invalidate(reason);}};
 const params={source:{id:'worker',remotePath:'/project'},metadataOnly:true,recursive:true,fileIndexRound:'one'};
 await run.call(h,'sync.projectInventory',params);await run.call(h,'sync.projectInventory',params);assert.equal(calls,1);
 await run.call(h,'sync.serverToServerFpsync',{});assert.equal(invalidations.length,2);
 await run.call(h,'sync.projectInventory',params);assert.equal(calls,3);
});

test('directory files contain only direct children and child summaries; unchanged content skips every shard rewrite',async()=>{
 const {storage,identity}=await fixture(),index=new ProjectFileIndex(identity,storage);
 const q={method:'local.metadata',recursive:true,metadataOnly:true};const data={files:{'a/b/file':{size:4,modifiedAtMs:1000}},directories:{'.':{modifiedAtMs:1},a:{modifiedAtMs:1},'a/b':{modifiedAtMs:1}}};
 await index.read(q,async()=>data);const root=JSON.parse(await fs.readFile(index.directoryFile('.'),'utf8')),a=JSON.parse(await fs.readFile(index.directoryFile('a'),'utf8'));
 assert.equal(root.entries['a/b/file'],undefined);assert.equal(a.entries['a/b/file'],undefined);assert.ok(a.entries['a/b']);assert.equal(root.summary.files,1);assert.equal(root.children.a.summary.bytes,4);
 const before=(await fs.stat(index.directoryFile('a/b'))).mtimeMs;await index.read(q,async()=>data);
 const header=JSON.parse(await fs.readFile(index.file,'utf8'));assert.equal(header.directoryFilesWritten,0);assert.equal((await fs.stat(index.directoryFile('a/b'))).mtimeMs,before);
 assert.match(root.freshness,/live-observation-required/);assert.equal(header.entries,undefined,'root header never duplicates every descendant');
});

test('query persists reading before touching the filesystem; explicit missing stats never become a pending absence',async()=>{
 const {storage,identity}=await fixture(),index=new ProjectFileIndex(identity,storage);
 const q={method:'sync.projectFileStats',paths:['data/a'],metadataOnly:true};await index.read(q,async()=>payload());
 await index.read(q,async()=>{
  const disk=JSON.parse(await fs.readFile(index.file,'utf8'));assert.equal(disk.observations.at(-1).state,'reading');
  assert.equal(index.snapshot().entries['data/a'].validity,'historical-only');return {ok:true,files:{},missing:['data/a']};
 });
 assert.equal(index.snapshot().entries['data/a'].presence,'absent');
});

test('actual operation preflight batches exact scopes, includes both servers and local destination, and records a failed refresh without authorizing or blocking deletion',async()=>{
 const {fileOperationIndexPaths,readLocalFileIndexPaths}=require('../../src/features/ProjectFileIndex.ts');
 const ts=require('typescript'),vm=require('node:vm'),source=await fs.readFile(path.resolve(__dirname,'../../src/extension/legacy.ts'),'utf8');
 const ast=ts.createSourceFile('host.ts',source,ts.ScriptTarget.Latest,true);let method;function visit(n){if(ts.isMethodDeclaration(n)&&n.name.getText(ast)==='refreshProjectFileIndexesBeforeOperation')method=n;ts.forEachChild(n,visit);}visit(ast);
 const {storage,identity}=await fixture();await fs.mkdir(path.join(storage,'data'));await fs.writeFile(path.join(storage,'data/a'),'abc','utf8');
 const indexes=new Map(),calls=[];let fail=false;
 const run=vm.runInNewContext(ts.transpileModule('class Host{'+method.getText(ast)+'};Host.prototype.refreshProjectFileIndexesBeforeOperation',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,
  {workspaceRoot:()=>storage,path,fileOperationIndexPaths,readLocalFileIndexPaths,sftpFileIndexQuery,
   callSftpWithProgress:async(name,params,discover)=>{await discover(name);calls.push({name,params});if(fail)throw Error('offline');return payload();}});
 const host={simpleSftpCapability:async()=>({methodOptions:{'sync.projectInventory':{metadataOnly:1}}}),projectFileObservationIndex:node=>{
  const id=node?.id||'local';if(!indexes.has(id))indexes.set(id,new ProjectFileIndex({...identity,endpointId:id},storage));return indexes.get(id);
 }};
 const params={source:{id:'one'},destination:{id:'two'},relativePaths:['data/a']};
 await run.call(host,'sync.serverToServerFpsync',params);assert.equal(calls.length,2);
 for(const {name,params:request}of calls){assert.equal(name,'sync.projectInventory');assert.deepEqual(Array.from(request.scopePaths),['data/a']);assert.equal(request.metadataOnly,true);}
 assert.equal(indexes.get('local').snapshot().entries['data/a'].size,3);
 calls.length=0;await run.call(host,'upload.workspace',{server:{id:'one'}});assert.equal(calls[0].name,'sync.projectTree');assert.equal(calls[0].params.recursive,undefined,'unspecified scope is shallow');
 fail=true;await run.call(host,'upload.workspace',{server:{id:'one'},manifest:{'data/a':{size:3}}});
 assert.equal(indexes.get('one').snapshot().observations.at(-1).state,'failed');
 calls.length=0;await run.call(host,'files.cleanup.execute',{token:'not-persisted'});assert.equal(calls.length,0,'token-only execution uses existing live inspection and frozen authorization');
 assert.deepEqual(fileOperationIndexPaths({entries:[{remotePath:'data/a',localRelativePath:'data/b'}]},true),['data/b']);
});
