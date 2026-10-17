const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),Module=require('node:module');
require('../_helpers/registerTsRequire');
const {expandSyncScopeBatchSelection}=require('../../src/features/SyncScopeBatch.ts');
const source=fs.readFileSync(path.resolve(__dirname,'../../src/extension/legacy.ts'),'utf8');
function webview(roots=[]){
 let html,host,dispose;const original=Module._load;Module._load=function(name,...args){return name==='vscode'?{ViewColumn:{Active:1},window:{createWebviewPanel:()=>({onDidDispose(fn){dispose=fn;},webview:{set html(value){html=value;},postMessage:async()=>{},onDidReceiveMessage(fn){host=fn;}}})}}:original.call(this,name,...args);};
 try{delete require.cache[require.resolve('../../src/features/SyncScopeTree.ts')];require('../../src/features/SyncScopeTree.ts').openSyncScopeTree('fixture',roots);}finally{Module._load=original;}
 const element=()=>({children:[],style:{},scrollTop:0,appendChild(c){this.children.push(c);},replaceChildren(...c){this.children=c;}}),nodes=new Map(),sent=[];let receive;
 const ctx=vm.createContext({acquireVsCodeApi:()=>({postMessage:m=>sent.push(m)}),document:{createElement:element,getElementById(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);}},window:{addEventListener:(_,fn)=>receive=fn}});
 vm.runInContext(html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)[1],ctx);
 return {ctx,nodes,sent,send:data=>receive({data}),host,dispose};
}
function method(name,globals){const ast=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true);let member;function visit(n){if(ts.isMethodDeclaration(n)&&n.name.getText(ast)===name)member=n;ts.forEachChild(n,visit);}visit(ast);return vm.runInNewContext(ts.transpileModule('class Host{'+member.getText(ast)+'};Host.prototype.'+name,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,globals);}

test('real single/batch deletion call chain never enters the legacy transfer-receipt API',async()=>{
 const remote=method('deleteSyncScopeRemoteCopy',{deleteConfirmedScopeCopy:async(rpc,node,relative,directory)=>{
   assert.equal(node.host,'worker.example');assert.equal(node.root,'/project');assert.equal(relative,'work_dirs/job');assert.equal(directory,true);
 }}),calls=[];
 const host={simpleSftpCapability:async()=>({methodOptions:{'files.cleanup.preview':{confirmedPathMetadata:1}}}),sftpServerOptions:row=>({host:'worker.example',remotePath:'/project',user:'user',port:22}),
   deleteSyncScopeRemoteCopy:async(...args)=>{calls.push(args);await remote.call(host,...args);},
   simpleSftpApiCall:async(name)=>{assert.equal(name,'sync.projectTree');return {ok:true,entries:[{path:'work_dirs/job',directory:true}]};}};
 const remove=method('removeSyncScopeCopies',{safeSyncPath:()=>{},scopeInventoryPathAllowed:()=>true,path,errorMessage:e=>e.message});
 await remove.call(host,'fixture',[{id:'w1'}],'work_dirs/job',['w1'],true);
 assert.equal(calls.length,1);
 assert.doesNotMatch(source,/simpleSftpApiCall\("sync\.deletePath"/);
});
test('deletion rechecks visible selections; absent paths are removed without a target or a tombstone',async()=>{
 const absent=[],old={name:'concatenation',path:'work_dirs/concatenation',directory:true,locations:['w1','w2']};
 const result=await expandSyncScopeBatchSelection([old.path],[],async()=>[],()=>{},[old],{fresh:true,onMissing:p=>absent.push(p)});
 assert.deepEqual(result,[]);assert.deepEqual(absent,[old.path]);
 await assert.rejects(expandSyncScopeBatchSelection([old.path],[],async()=>{throw Error('w2 connection refused');},()=>{},[old],{fresh:true,onMissing:p=>absent.push(p)}),/connection refused/);
});
test('actual union distinguishes empty connected Workers from failed queries',async()=>{
 const list=method('listSyncScopeUnion',{loadSyncHolds:async()=>({}),isSyncHeld:()=>false,errorMessage:e=>e.message});
 const host={context:{globalStorageUri:{fsPath:'fixture'}},sftpServerOptions:t=>t,simpleSftpApiCall:async()=>({ok:true,entries:[]})};
 assert.equal((await list.call(host,'fixture',[{id:'jqg_zlk'}],'work_dirs',false)).length,0);
 host.simpleSftpApiCall=async()=>{throw Error('SSH query timeout');};await assert.rejects(list.call(host,'fixture',[{id:'jqg_zlk'}],'work_dirs',false),/jqg_zlk.*SSH query timeout/);
 let probes=0;host.simpleSftpApiCall=async name=>{if(name==='sync.projectTree')throw Error('SSH query timeout');probes++;return {ok:true,exists:true,empty:true};};
 assert.equal((await list.call(host,'fixture',[{id:'jqg_zlk'}],'work_dirs',false)).length,0);assert.equal(probes,1);
 host.simpleSftpApiCall=async name=>{if(name==='sync.projectTree')throw Error('SSH query timeout');return {ok:true,exists:true,empty:false};};
 await assert.rejects(list.call(host,'fixture',[{id:'jqg_zlk'}],'work_dirs',false),/目录非空/);
});
test('actual Webview removes absent paths from cached children, status filter and selections',()=>{
 let html;const original=Module._load;Module._load=function(name,...args){return name==='vscode'?{ViewColumn:{Active:1},window:{createWebviewPanel:()=>({webview:{set html(value){html=value;},onDidReceiveMessage(){}}})}}:original.call(this,name,...args);};
 try{delete require.cache[require.resolve('../../src/features/SyncScopeTree.ts')];require('../../src/features/SyncScopeTree.ts').openSyncScopeTree('fixture',[]);}finally{Module._load=original;}
 const element=()=>({children:[],style:{},scrollTop:0,appendChild(c){this.children.push(c);},replaceChildren(...c){this.children=c;}}),nodes=new Map(),sent=[];let receive;
 const ctx=vm.createContext({acquireVsCodeApi:()=>({postMessage:m=>sent.push(m)}),document:{createElement:element,getElementById(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);}},window:{addEventListener:(_,fn)=>receive=fn}});
 vm.runInContext(html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)[1],ctx);
 const send=data=>receive({data}),gone='work_dirs/concatenation';
 send({type:'init',roots:[{id:'workers',label:'Workers',selected:[gone]}]});send({type:'children',rootId:'workers',path:'.',entries:[{name:'work_dirs',path:'work_dirs',directory:true}]});
 send({type:'children',rootId:'workers',path:'work_dirs',entries:[{name:'concatenation',path:gone,directory:true}]});
 send({type:'status',rootId:'workers',path:'.',statuses:{[gone]:{state:'different',detail:'old'},[gone+'/old.bin']:{state:'different',detail:'old',issueSignature:'old'}},refreshedAt:'old'});
 vm.runInContext("state().batchSelected.add('work_dirs/concatenation/old.bin');state().expanded.add('work_dirs/concatenation')",ctx);
 send({type:'children',rootId:'workers',path:'work_dirs',entries:[]});
 const result=JSON.parse(vm.runInContext('JSON.stringify({selected:[...state().selected],batch:[...state().batchSelected],statuses:state().statuses,expanded:[...state().expanded]})',ctx));
 assert.deepEqual(result.selected,[]);assert.deepEqual(result.batch,[]);assert.ok(!Object.keys(result.statuses).some(p=>p.startsWith(gone)));assert.ok(!result.expanded.includes(gone));
});

test('partial deletion refreshes attempted parents and retires pre-delete requests including errors',()=>{
 const {ctx,nodes,sent,send}=webview(),gone='work_dirs/job';
 send({type:'init',roots:[{id:'workers',label:'Workers',selected:[gone]}]});
 send({type:'children',rootId:'workers',path:'.',entries:[{name:'work_dirs',path:'work_dirs',directory:true}]});
 send({type:'children',rootId:'workers',path:'work_dirs',entries:[{name:'job',path:gone,directory:true,locations:['w1','w2']}]});
 vm.runInContext("state().pending.add('.');state().refreshRequests.set('.','old');state().listRequests.set('work_dirs','old-list')",ctx);
 send({type:'batchDone',rootId:'workers',completed:[],affected:[gone],errors:['w2 query failed']});
 assert.ok(sent.some(m=>m.type==='list'&&m.path==='work_dirs'),'failed/partially deleted targets must also be re-read');
 const list=sent.findLast(m=>m.type==='list'&&m.path==='work_dirs');
 send({type:'children',id:list.id,rootId:'workers',path:'work_dirs',entries:[]});
 assert.ok(!sent.some(m=>m.type==='refresh'),'file actions reload actual listings without starting a second recursive content comparison');
 send({type:'status',id:'old',rootId:'workers',path:'.',statuses:{[gone]:{state:'different',detail:'stale'}}});
 send({type:'error',id:'old-list',rootId:'workers',path:'work_dirs',requestType:'list',message:'old failure'});
 assert.equal(vm.runInContext("Boolean(state().statuses['work_dirs/job'])",ctx),false);
 assert.match(nodes.get('status').textContent,/w2 query failed/);
});

test('root batch refresh reloads expanded descendants instead of leaving them reading forever',()=>{
 const {ctx,sent,send}=webview();
 send({type:'init',roots:[{id:'workers',label:'Workers',selected:['.']}]});
 send({type:'children',rootId:'workers',path:'.',entries:[{name:'work_dirs',path:'work_dirs',directory:true}]});
 vm.runInContext("state().expanded.add('work_dirs');state().children.set('work_dirs',[])",ctx);
 sent.length=0;
 send({type:'batchDone',rootId:'workers',affected:['.'],completed:[],errors:[]});
 assert.ok(sent.some(m=>m.type==='list'&&m.path==='work_dirs'));
});

test('refresh bounds and coalesces directory requests, skips collapsed and merely selected parents',()=>{
 const {ctx,sent,send}=webview();
 send({type:'init',roots:[{id:'workers',label:'Workers',selected:['not/open/file']}]});
 vm.runInContext("state().children.set('collapsed',[]);state().expanded.add('a');state().expanded.add('b');refreshVisible();refreshVisible()",ctx);
 const lists=()=>sent.filter(m=>m.type==='list');
 assert.equal(lists().length,2);
 assert.deepEqual(lists().map(m=>m.path),['.','a']);
 const first=lists()[0];
 send({...first,type:'children',entries:[]});
 assert.equal(lists().length,3);assert.equal(lists()[2].path,'b');
 assert.ok(!lists().some(m=>m.path==='collapsed'||m.path==='not/open'));
 vm.runInContext("load('b');load('b')",ctx);assert.equal(lists().length,3);
});

test('partial directory evidence preserves selections; strict action enumeration still rejects failed Workers',async()=>{
 const list=method('listSyncScopeUnion',{loadSyncHolds:async()=>({}),isSyncHeld:()=>false,errorMessage:e=>e.message});
 const host={context:{globalStorageUri:{fsPath:'fixture'}},sftpServerOptions:t=>t,simpleSftpApiCall:async(_name,p)=>{
  if(p.source.id==='w2')throw Error('API_CAPACITY_EXCEEDED');
  return {ok:true,entries:[{name:'ok',path:'ok',directory:false}]};
 }};
 const rows=await list.call(host,'fixture',[{id:'w1'},{id:'w2'}],'.',false);
 assert.equal(rows[0].path,'ok');assert.match(rows.queryErrors[0],/w2.*API_CAPACITY_EXCEEDED/);
 await assert.rejects(list.call(host,'fixture',[{id:'w1'},{id:'w2'}],'.',false,true),/w2/);
 const {ctx,send}=webview();send({type:'init',roots:[{id:'workers',label:'Workers',selected:['old']}]});
 send({type:'children',rootId:'workers',path:'.',entries:[{path:'old',name:'old',directory:false,locations:['w2']}]});
 send({type:'children',rootId:'workers',path:'.',entries:rows,queryErrors:rows.queryErrors});
 assert.equal(vm.runInContext("state().selected.has('old')",ctx),true);
 assert.equal(vm.runInContext("state().statuses['.'].state",ctx),'unknown');
 assert.equal(vm.runInContext("state().children.get('.').find(e=>e.path==='old').locations.length",ctx),0);
});

test('local hashing and complete Worker inventory start together; partial failure stays unknown',async()=>{
 let release,started=0;
 const local=new Promise(resolve=>release=resolve);
 const refresh=method('refreshSyncScopeStatus',{collectLocalScopeInventory:()=>local,loadSyncHolds:async()=>({}),
  buildScopeStatuses:(data,_mode,_selected,_unused,_ledger,offline)=>{
   assert.equal(data.local['file'].sha256,'local');assert.equal(data.workers.w1.file.sha256,'remote');assert.ok(offline.has('w2'));
   return {'.':{state:'unknown',detail:'w2 未核实'}};
  }});
 const host={localScopeHashCacheFile:()=>'',enabledWorkerConfigs:()=>[{id:'w1'},{id:'w2'}],sftpServerOptions:t=>t,
  simpleSftpApiCall:async(name,p)=>{started++;assert.equal(name,'sync.projectInventory');assert.equal(p.recursive,true);assert.deepEqual([...p.scopePaths],['.']);if(p.source.id==='w2')throw Error('network failed');return {files:{file:{sha256:'remote'}}};},
  loadPlanSyncLedger:async()=>({}),context:{globalStorageUri:{fsPath:'fixture'}}};
 const pending=refresh.call(host,'fixture',[{id:'w1'},{id:'w2'}],'local-server',['.']);
 assert.equal(started,2,'remote reads must not wait for slow local hashing');release({file:{sha256:'local'}});
 assert.equal((await pending)['.'].state,'unknown');
});

test('closing the page cancels only its read requests; saving retires stale refresh responses',async()=>{
 let captured;
 const f=webview([{id:'workers',selected:[],list:async(_path,signal)=>{
  captured=signal;return new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('fixture read cancelled')),{once:true}));
 }}]);
 const read=f.host({type:'list',id:'read',rootId:'workers',path:'.'});
 assert.equal(captured.aborted,false);f.dispose();await read;assert.equal(captured.aborted,true);
 f.send({type:'init',roots:[{id:'workers',selected:[]}]});
 vm.runInContext("state().refreshRequests.set('.','old');state().pending.add('.')",f.ctx);
 f.send({type:'saved',rootId:'workers'});
 f.send({type:'status',rootId:'workers',id:'old',path:'.',statuses:{bad:{state:'same'}}});
 assert.equal(vm.runInContext("Boolean(state().statuses.bad)",f.ctx),false);
 assert.equal(vm.runInContext("state().pending.size",f.ctx),0);
});

test('read progress is correlated and cannot replace a completed or superseded refresh; recovered listings clear old connection errors',()=>{
 const {ctx,nodes,send}=webview();send({type:'init',roots:[{id:'workers',selected:[]}]});
 vm.runInContext("state().refreshRequests.set('.','now');state().pending.add('.')",ctx);
 send({type:'readProgress',rootId:'workers',path:'.',id:'now',stage:'H20 正在核验 14 个文件'});
 assert.match(nodes.get('status').textContent,/14/);
 send({type:'readProgress',rootId:'workers',path:'.',id:'old',stage:'stale'});assert.doesNotMatch(nodes.get('status').textContent,/stale/);
 send({type:'status',rootId:'workers',path:'.',id:'now',statuses:{},refreshedAt:'done'});
 send({type:'readProgress',rootId:'workers',path:'.',id:'now',stage:'late'});assert.doesNotMatch(nodes.get('status').textContent,/late/);
 send({type:'error',rootId:'workers',path:'.',requestType:'list',message:'HTTP 503'});
 send({type:'children',rootId:'workers',path:'.',entries:[]});
 assert.doesNotMatch(nodes.get('status').textContent,/503/);assert.equal(vm.runInContext("state().statuses['.'].state",ctx),'unknown');
});

test('directory listing preserves actual per-location file facts without content inventory',async()=>{
 const list=method('listSyncScopeUnion',{loadSyncHolds:async()=>({}),isSyncHeld:()=>false,errorMessage:e=>e.message,
  listLocalSyncScope:async()=>Object.assign([{name:'local.py',path:'local.py',directory:false,size:13,modifiedAtMs:1700000000000}],{observation:{status:'present',directory:true}})});
 const host={context:{globalStorageUri:{fsPath:'fixture'}},sftpServerOptions:t=>t,simpleSftpApiCall:async(name,p)=>{
  assert.equal(name,'sync.projectTree');if(p.source.id==='slow')throw Error('read unavailable');
  return {ok:true,exists:true,entries:p.source.id==='w1'?[{path:'a.py',name:'a.py',directory:false,size:12,modifiedAtMs:1700000000000}]:[]};
 }};
 const rows=await list.call(host,'fixture',[{id:'w1'},{id:'w2'},{id:'slow'}],'.',false);
 assert.equal(rows[0].observations.w1.size,12);assert.equal(rows[0].observations.w1.modifiedAtMs,1700000000000);
 assert.equal(rows[0].observations.w2.status,'not-listed');assert.equal(rows[0].observations.slow.status,'unknown');
 assert.equal(rows.observations.w1.status,'present');
 host.simpleSftpApiCall=async()=>{throw Error('disconnected');};
 const local=await list.call(host,'fixture',[{id:'w1'},{id:'w2'}],'.',true);
 assert.equal(local[0].observations.local.size,13);assert.equal(local[0].observations.w1.status,'unknown');assert.equal(local[0].observations.w2.status,'unknown');
});

test('actual listed files show facts and permit choosing a source immediately, with no separate verification action',()=>{
 const {ctx,nodes,sent,send}=webview();send({type:'init',roots:[{id:'local',label:'Local',selected:['.']}]});
 const observations={local:{status:'present',directory:false,size:12,modifiedAtMs:1700000000000},w1:{status:'present',directory:false,size:10,modifiedAtMs:1700000001000},w2:{status:'unknown',error:'read unavailable'}};
 send({type:'children',rootId:'local',path:'.',entries:[{path:'a.py',name:'a.py',directory:false,locations:['local','w1'],observations}],observations:{local:{status:'present',directory:true},w1:{status:'present',directory:true}}});
 let file=nodes.get('tree').children[1];assert.match(file.children.find(n=>String(n.className).startsWith('badge')).textContent,/12 B/);
 file.children.find(n=>n.textContent==='版本与操作').onclick();
 const copies=nodes.get('tree').children[2].children;
 assert.match(copies[0].textContent,/本机.*存在.*12 B/);assert.doesNotMatch(copies[0].textContent,/尚未校验|待核验/);
 const retain=copies[0].children.find(n=>n.textContent==='以此版同步到其他位置');assert.equal(retain.disabled,false);
 assert.equal(copies.find(n=>n.textContent.startsWith('w2')).children.length,0);
 retain.onclick();assert.equal(sent.at(-1).type,'retain');assert.equal(sent.at(-1).endpointId,'local');
 assert.ok(!sent.some(m=>m.type==='refresh'));
 send({type:'error',rootId:'local',path:'.',requestType:'list',message:'new read failed'});
 assert.match(nodes.get('tree').children[1].children.find(n=>String(n.className).startsWith('badge')).textContent,/查询失败/);
 assert.doesNotMatch(nodes.get('tree').children[1].children.find(n=>String(n.className).startsWith('badge')).textContent,/12 B/);
});

test('real local directory reader returns stat facts without reading file contents',async()=>{
 const root=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'scope-list-facts-'));
 fs.writeFileSync(path.join(root,'a.py'),'print(42)\n','utf8');fs.mkdirSync(path.join(root,'empty'));
 const ast=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true);const fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='listLocalSyncScope');
 const read=vm.runInNewContext(ts.transpileModule(fn.getText(ast)+';listLocalSyncScope',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,
  {fs:{lstat:fs.promises.lstat,readdir:fs.promises.readdir},path,errorMessage:e=>e.message,blockedExplicitCodePath:()=>false,scopeInventoryPathAllowed:()=>true,
   mapLimited:async(rows,limit,work)=>{assert.equal(limit,8);return Promise.all(rows.map(work));}});
 const entries=await read(root,'.'),actual=fs.statSync(path.join(root,'a.py'));
 assert.equal(entries.find(e=>e.name==='a.py').size,actual.size);assert.equal(entries.find(e=>e.name==='a.py').modifiedAtMs,actual.mtimeMs);
 assert.equal(entries.observation.status,'present');assert.equal(entries.find(e=>e.name==='empty').directory,true);
});
