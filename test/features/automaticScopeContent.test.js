const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),ts=require('typescript'),{spawnSync}=require('node:child_process');
require('../_helpers/registerTsRequire');
const {AutomaticScopeContent}=require('../../src/features/AutomaticScopeContent.ts');
const {SyncScopeAgentIndexReader}=require('../../src/features/SyncScopeAgentIndex.ts');
const {buildScopeStatuses,hashLocalScopeNames}=require('../../src/features/SyncScopeStatus.ts');
const {queryScopeMetadata}=require('../../src/features/SyncScopeMetadata.ts');
const {syncScopeIssueSignature}=require('../../src/features/SyncScopeBatch.ts');
const fact=(inode,time=1000,sha='a')=>({size:4,modifiedAtMs:time,changedAtMs:time+1,device:'1',inode:String(inode),sha256:sha.repeat(64)});
const metadata=value=>Object.fromEntries(Object.entries(value).map(([name,{sha256,...row}])=>[name,row]));
const source=fs.readFileSync(path.resolve(__dirname,'../../src/extension/legacy.ts'),'utf8'),ast=ts.createSourceFile('host.ts',source,ts.ScriptTarget.Latest,true);
let member;function visit(n){if(ts.isMethodDeclaration(n)&&n.name.getText(ast)==='refreshSyncScopeMetadata')member=n;ts.forEachChild(n,visit);}visit(ast);
function fixture(){const values={w1:{'nested/a':fact(1),'nested/b':fact(2)},w2:{'nested/a':fact(3,2000),'nested/b':fact(4,1000,'b')}},calls=[],progress=[],published=[];let fail='',hold;
 const run=vm.runInNewContext(ts.transpileModule('class Host{'+member.getText(ast)+'};Host.prototype.refreshSyncScopeMetadata',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{queryScopeMetadata,buildScopeStatuses,syncScopeIssueSignature,hashLocalScopeNames,loadSyncHolds:async()=>({}),Set,Map,Date});
 const targets=[{id:'w1'},{id:'w2'}],host={context:{globalStorageUri:{fsPath:'unused'}},enabledWorkerConfigs:()=>targets,loadPlanSyncLedger:async()=>({schemaVersion:2,entries:{}}),
 sftpServerOptions:row=>({...row,host:row.id+'.invalid',remotePath:'/safe/'+row.id}),simpleSftpCapability:async()=>({methodOptions:{'sync.projectInventory':{contentIdentity:1}}}),
 simpleSftpApiCall:()=>assert.fail('automatic metadata must reuse the page index'),verifiedSftpProjectInventory:async options=>{calls.push(options);if(hold)await hold;if(fail===options.source.id)throw Error('offline');return {files:Object.fromEntries(options.scopePaths.filter(p=>values[options.source.id][p]).map(p=>[p,{...values[options.source.id][p]}]))};}};
 const verifier=new AutomaticScopeContent();
 return {values,calls,progress,published,host,targets,setFail:value=>fail=value,setHold:value=>hold=value,
 read:(signal,selectedVerifier=verifier)=>run.call(host,'root',targets,false,'.',signal,(_stage,row)=>{if(row)progress.push(row);},rows=>published.push(rows),async id=>({files:metadata(values[id]),unverifiedFiles:{}}),undefined,selectedVerifier)};
}

test('production summary publishes index completion before automatic hashes and needs no compare click',async()=>{
 const f=fixture();let release;f.setHold(new Promise(resolve=>release=resolve));const pending=f.read();await new Promise(setImmediate);
 assert.equal(f.progress.filter(row=>row.state==='complete').length,2);assert.ok(f.published.length);assert.equal(f.published.at(-1)['nested/a'].state,'unknown');assert.equal(f.calls.length,2);
 release();const rows=await pending;assert.equal(rows['nested/a'].state,'same','equal bytes ignore different timestamps');assert.equal(rows['nested/b'].state,'different','equal size and time cannot hide different bytes');
 for(const call of f.calls){assert.equal(call.relativePath,'.');assert.deepEqual([...call.scopePaths],['nested/a','nested/b']);assert.equal(call.recursive,true);}
 assert.equal(rows['nested/a'].basis,'content');assert.equal(rows['nested/a'].metadata.w1.status,'present');
});

test('fresh index identities reuse hashes and only changed/recreated files are requested; deletion drops saved positives',async()=>{
 const f=fixture();await f.read();f.calls.length=0;await f.read();assert.equal(f.calls.length,0);
 f.values.w2['nested/a']={...fact(3,2000,'c'),contentRevision:'agent:2'};await f.read();assert.equal(f.calls.length,1);assert.equal(f.calls[0].source.id,'w2');assert.deepEqual([...f.calls[0].scopePaths],['nested/a']);
 f.calls.length=0;delete f.values.w1['nested/a'];const deleted=await f.read();assert.equal(deleted['nested/a'].metadata.w1.status,'absent');assert.equal(deleted['nested/a'].state,'different');assert.equal(f.calls.length,0);
 f.values.w1['nested/a']=fact(99,1000);await f.read();assert.equal(f.calls.length,1);assert.deepEqual([...f.calls[0].scopePaths],['nested/a']);
});

test('failed content reads remain unknown and never become missing, while a later fresh query recovers',async()=>{
 const f=fixture();f.setFail('w2');const rows=await f.read();assert.equal(rows['nested/a'].state,'unknown');assert.equal(rows['nested/a'].metadata.w2.status,'present');assert.match(rows['nested/a'].detail,/offline/);
 assert.equal(rows.nested.copies.w2.missing,0);f.calls.length=0;f.setFail('');assert.equal((await f.read())['nested/a'].state,'same');assert.deepEqual(f.calls.map(c=>c.source.id),['w2']);
});

test('cancellation suppresses late hash publication and a fresh view re-enters producer caches',async()=>{
 const f=fixture();let release;f.setHold(new Promise(resolve=>release=resolve));const controller=new AbortController(),pending=f.read(controller.signal);await new Promise(setImmediate);controller.abort();const before=f.published.length;release();await assert.rejects(pending,{name:'AbortError'});assert.equal(f.published.length,before);
 f.setHold(undefined);f.calls.length=0;await f.read(undefined,new AutomaticScopeContent());assert.equal(f.calls.length,2);
});

test('identity changes between metadata and hashing reject the result instead of caching a different file',async()=>{
 const automatic=new AutomaticScopeContent(),expected=fact(1),values={w1:{files:{a:metadata({a:expected}).a}}};let output;
 await automatic.verify([{id:'w1',binding:'root',hash:async()=>({files:{a:{...expected,inode:'99'}}})}],values,new Map(),undefined,row=>output=row);
 assert.equal(output.workers.w1.a,undefined);assert.match(output.unverified.w1.a,/发生变化/);
});

test('remote requests remain exact and bounded even with long nested names',async()=>{
 const names=Array.from({length:700},(_,i)=>'deep/'+String(i)+'/'+('x'.repeat(500))),files=Object.fromEntries(names.map((n,i)=>[n,fact(i+1)])),calls=[];
 await new AutomaticScopeContent().verify([{id:'w1',binding:'long',hash:async paths=>{calls.push(paths);assert.ok(Buffer.byteLength(JSON.stringify(paths))<=64*1024);return {files:Object.fromEntries(paths.map(p=>[p,files[p]]))};}}],{w1:{files:metadata(files)}},new Map(),undefined,()=>{});
 assert.deepEqual(calls.flat(),names);assert.ok(calls.length>3);assert.ok(calls.every(paths=>paths.length<=256));
});

test('Agent deltas replace the verification revision even when millisecond timestamps collide',async()=>{
 let generation=0;const entry={p:'a',d:false,s:4,m:1000,c:1001,v:'1',i:'1'};
 const reader=new SyncScopeAgentIndexReader(async q=>{if(q.op==='release')return {ok:true};generation++;return {ok:true,status:'ready',requestId:q.requestId,instanceId:'agent',generation,reset:generation===1,
  entries:generation===1?[{p:'.',d:true,m:1},entry]:generation===3?[entry]:[],nextCursor:null,projectRoot:'/project',requestedProjectRoot:'/project'};});
 try {const first=await reader.inventory('one'),same=await reader.inventory('two'),changed=await reader.inventory('three');assert.equal(first.files.a.contentRevision,same.files.a.contentRevision);assert.notEqual(first.files.a.contentRevision,changed.files.a.contentRevision);}
 finally{reader.dispose();}
});

test('local persistent hash cache survives a new process and rereads only changed bytes',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'auto-content-cache-')),cache=path.join(root,'state','hashes.json');fs.mkdirSync(path.join(root,'data'));for(const name of ['a','b'])fs.writeFileSync(path.join(root,'data',name),'same','utf8');
 const runner=path.join(root,'probe.js');fs.writeFileSync(runner,`require(${JSON.stringify(path.resolve(__dirname,'../_helpers/registerTsRequire.js'))});const fs=require('node:fs/promises');const {hashLocalScopeNames}=require(${JSON.stringify(path.resolve(__dirname,'../../src/features/SyncScopeStatus.ts'))});let opened=0;const original=fs.open;fs.open=async(...args)=>{if(String(args[0]).includes('data'+require('node:path').sep))opened++;return original(...args);};hashLocalScopeNames(process.argv[2],['data/a','data/b'],undefined,process.argv[3],{concurrency:2}).then(files=>process.stdout.write(JSON.stringify({opened,files}))).catch(e=>{console.error(e);process.exitCode=1;});`,'utf8');
 const run=()=>{const child=spawnSync(process.execPath,[runner,root,cache],{encoding:'utf8',timeout:10000,windowsHide:true});assert.equal(child.status,0,child.stderr||child.error?.message);return JSON.parse(child.stdout);};
 assert.equal(run().opened,2);const warm=run();assert.equal(warm.opened,0);assert.ok(warm.files['data/a'].inode);fs.writeFileSync(path.join(root,'data','a'),'diff','utf8');assert.equal(run().opened,1);
});
