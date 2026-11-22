const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),Module=require('node:module');
require('../_helpers/registerTsRequire');

// The companion source is an explicit, read-only input; no live SFTP discovery is used.
const sourceRoot=process.env.SIMPLE_TEST_SFTP_ROOT;
if(!sourceRoot||!path.isAbsolute(sourceRoot)||path.resolve(sourceRoot)!==sourceRoot)throw Error('SIMPLE_TEST_SFTP_ROOT must name the verified absolute companion source');
const sourcePackage=JSON.parse(fs.readFileSync(path.join(sourceRoot,'package.json'),'utf8'));
if(sourcePackage.version!=='0.2.120'||sourcePackage.name!=='simple-sftp')throw Error('unexpected SimpleSFTP source identity');
const engineSource=fs.readFileSync(path.join(sourceRoot,'cleanup-file-api.js'),'utf8');
const base=fs.mkdtempSync(path.join(os.tmpdir(),'g004-cleanup-engine-'));
const root=path.join(base,'project');fs.mkdirSync(root);
const worker={id:'w1',host:'host1',port:22,user:'user',remotePath:'/synthetic/project'};
const rootIdentity={dev:'42:1',ino:'9'},batch='job-'+'a'.repeat(48);
let receive,posted=[];
const vscode={workspace:{workspaceFolders:[{uri:{fsPath:root}}]},ViewColumn:{Active:1},window:{createWebviewPanel:()=>({
 webview:{onDidReceiveMessage:fn=>{receive=fn;return {dispose(){}}},postMessage:async value=>{posted.push(value)}},onDidDispose(){}})}};
const originalLoad=Module._load;let mcpGateway;
try{Module._load=function(id,...args){return id==='vscode'?vscode:originalLoad.call(this,id,...args)};({mcpGateway}=require('../../src/extension/McpHost.ts'))}finally{Module._load=originalLoad}
const {createProjectAuthorization}=require('../../src/mcp/ProjectAuthorization.ts');

function fixture(){
 const memory=new Map(),actions=[],gone=new Set();let deleteCalls=0,deleteFailure;
 const notFound=()=>Object.assign(Error('missing'),{code:'ENOENT'});
 const memoryFs=new Proxy({mkdir:async()=>{},lstat:async()=>({isSymbolicLink:()=>false,isDirectory:()=>true,mode:0o700}),
  readFile:async file=>{if(!memory.has(file))throw notFound();return memory.get(file)}},
  {get(target,key){if(!(key in target))throw Error('UNEXPECTED_ENGINE_FS:'+String(key));return target[key]}});
 const engineModule={exports:{}};
 const requireEngine=id=>{if(id==='node:crypto')return require('node:crypto');if(id==='node:path')return path;
  if(id==='node:fs/promises')return memoryFs;if(id==='./state-store')return {atomicWriteText:async(file,text)=>memory.set(file,text)};
  throw Error('UNEXPECTED_ENGINE_REQUIRE:'+id)};
 new Function('require','module','exports',engineSource)(requireEngine,engineModule,engineModule.exports);
 const transport=async request=>{
  actions.push(request.action);const remoteRoot=request.node.root;
  if(request.action==='inspect'||request.action==='inventory')return {ok:true,rootIdentity,target:{relativePath:request.target.relativePath,type:request.target.type,absolutePath:`${remoteRoot}/${request.target.relativePath}`,device:'42:1',inode:'100',fingerprint:'f'.repeat(64)}};
  if(request.action==='batch-inspect')return {ok:true,rootIdentity,targets:request.targets.map(t=>({relativePath:t.relativePath,type:t.type,absolutePath:`${remoteRoot}/${t.relativePath}`,archived:false,device:'42:1',inode:'100',missing:gone.has(t.relativePath)||undefined})),metrics:{entryReads:request.targets.length}};
  if(request.action==='delete-fast'){if(deleteFailure)throw deleteFailure;deleteCalls++;for(const row of request.entries)gone.add(row.relativePath);return {ok:true,receipt:{operationId:request.operationId,deleted:request.entries.length,metrics:{unlinked:request.entries.length}}}}
  if(request.action==='batch-verify')return {ok:true,targets:request.entries.map(e=>({relativePath:e.relativePath,type:e.type,status:gone.has(e.relativePath)?'gone':'present'}))};
  if(request.action==='batch-observe')return {ok:true,observationId:request.observationId,rootIdentity:request.rootIdentity||rootIdentity,observations:request.entries.map(e=>({key:e.key,status:gone.has(e.relativePath)?'gone':'present',executors:[],executorsChecked:true}))};
  throw Error('UNEXPECTED_FAKE_TRANSPORT:'+request.action);
 };
 const engine=new engineModule.exports.CleanupFileApi({storageRoot:path.join(base,'legacy'),transport,activity:async()=>{},lease:(_n,_t,work)=>work()});
 const names=['inspect','observeBatch','preview','confirm','execute','status','check','verify','settle'];
 const grant=createProjectAuthorization(root);grant.workers=[{id:worker.id,host:worker.host,port:worker.port,user:worker.user,projectRoot:worker.remotePath}];
 const host={context:{workspaceState:{get:()=>grant}},refreshSharedConnectionSettings(){},workerCodeSyncTargets:()=>[worker],createLocalApiMethods:()=>({}),
  readSimpleSftpCapabilities:async()=>({methods:names.map(x=>'files.cleanup.'+x)}),simpleSftpApiCall:async(method,params)=>{
   const name=method.slice('files.cleanup.'.length);if(!names.includes(name))throw Error('UNEXPECTED_ENGINE_METHOD:'+method);return engine[name](params)}};
 posted=[];receive=undefined;
 return {gateway:mcpGateway(host),engine,actions,gone,memory,get deleteCalls(){return deleteCalls},failDelete:error=>{deleteFailure=error}};
}
const node={location:'worker',workerId:'w1'};
async function preview(f,targets,action='delete'){return f.gateway.call('file_cleanup_preview',{...node,action,targets})}
async function review(f,row){await f.gateway.call('file_cleanup_review',{...node,token:row.token});assert.equal(typeof receive,'function')}
async function confirmPhase(phase){await receive({type:'confirm',phase});assert.equal(posted.at(-1).type,'confirmed');assert.equal(posted.at(-1).phase,phase)}
async function execute(f,row,index=0){return f.gateway.call('file_cleanup_execute',{...node,token:row.token,digest:row.digest,index})}

test('engine rejects unarchived plain delete and limits move to one review',async()=>{
 const f=fixture(),remoteNode={id:'w1',kind:'remote',root:worker.remotePath,host:worker.host,port:worker.port,user:worker.user};
 await assert.rejects(f.engine.preview({node:remoteNode,consumerRoot:root,action:'delete',targets:[{relativePath:'tmp/a.csv',type:'file'}]}),/UNSAFE_DESTINATION/);
 const row=await preview(f,[{relativePath:'tmp/m.csv',type:'file',destination:`clean_dir/${batch}/tmp/m.csv`,archiveBatch:batch}],'move');
 await review(f,row);await confirmPhase(1);await receive({type:'confirm',phase:2});assert.equal(posted.at(-1).type,'error');
 assert.equal(f.deleteCalls,0);
});

test('confirmed paths require two reviews and execute exactly once',async()=>{
 const f=fixture(),archived=`clean_dir/${batch}/old-run`;
 const row=await preview(f,[{relativePath:archived,type:'directory',destination:archived},{relativePath:'data/drop.csv',type:'file'}]);
 assert.equal(row.authorizationMode,'confirmed_paths');
 await assert.rejects(f.engine.confirm({token:row.token,digest:row.digest,phase:1,confirm:true,exactTargets:['/wrong'],consumerRoot:root}),/CONFIRM_REQUIRED/);
 await review(f,row);await confirmPhase(1);await assert.rejects(execute(f,row),/CONFIRM_REQUIRED/);await confirmPhase(2);
 await execute(f,row);assert.equal(f.deleteCalls,1);assert.deepEqual(f.gone,new Set([archived,'data/drop.csv']));
 assert.equal((await execute(f,row,1)).alreadyCompleted,true);assert.equal(f.deleteCalls,1);
 const status=await f.gateway.call('file_cleanup_status',{...node,token:row.token});assert.deepEqual(status.states,['completed','completed']);
});

test('uncertain batch receipt is not retried before verification',async()=>{
 const f=fixture(),row=await preview(f,[{relativePath:'data/a.csv',type:'file'},{relativePath:'data/b.csv',type:'file'}]);
 await review(f,row);await confirmPhase(1);await confirmPhase(2);
 f.failDelete(Object.assign(Error('ENTRY_IDENTITY_CHANGED'),{code:'ENTRY_IDENTITY_CHANGED',mutationStarted:true}));
 await assert.rejects(execute(f,row),/ENTRY_IDENTITY_CHANGED/);await assert.rejects(execute(f,row),/DELETE_RECEIPT_UNCERTAIN/);
 assert.equal(f.actions.filter(x=>x==='delete-fast').length,1);assert.equal(f.deleteCalls,0);
 await assert.rejects(f.gateway.call('file_cleanup_verify',{...node,token:row.token,index:0}),/CLEANUP_NOT_VERIFIED/);
});

test('observations bind frozen target and root identities',async()=>{
 const f=fixture(),row=await preview(f,[{relativePath:'data/x.csv',type:'file'}]);
 const target={key:'k1',relativePath:'data/x.csv',type:'file',backendToken:row.token,backendIndex:0};
 const observe=(target,identity)=>f.gateway.call('file_cleanup_observe_batch',{...node,observationId:'obs-1',targets:[target],rootIdentity:identity});
 assert.doesNotMatch(JSON.stringify(await observe(target,rootIdentity)),/TOKEN_/);
 assert.match(JSON.stringify(await observe({...target,relativePath:'data/other.csv'},rootIdentity)),/TOKEN_TARGET_MISMATCH/);
 assert.match(JSON.stringify(await observe(target,{dev:'99:9',ino:'1'})),/TOKEN_NODE_MISMATCH/);
});
