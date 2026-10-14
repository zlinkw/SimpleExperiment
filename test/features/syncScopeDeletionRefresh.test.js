const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),Module=require('node:module');
require('../_helpers/registerTsRequire');
const {expandSyncScopeBatchSelection}=require('../../src/features/SyncScopeBatch.ts');
const source=fs.readFileSync(path.resolve(__dirname,'../../src/extension/legacy.ts'),'utf8');
function webview(){
 let html;const original=Module._load;Module._load=function(name,...args){return name==='vscode'?{ViewColumn:{Active:1},window:{createWebviewPanel:()=>({webview:{set html(value){html=value;},onDidReceiveMessage(){}}})}}:original.call(this,name,...args);};
 try{delete require.cache[require.resolve('../../src/features/SyncScopeTree.ts')];require('../../src/features/SyncScopeTree.ts').openSyncScopeTree('fixture',[]);}finally{Module._load=original;}
 const element=()=>({children:[],style:{},scrollTop:0,appendChild(c){this.children.push(c);},replaceChildren(...c){this.children=c;}}),nodes=new Map(),sent=[];let receive;
 const ctx=vm.createContext({acquireVsCodeApi:()=>({postMessage:m=>sent.push(m)}),document:{createElement:element,getElementById(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);}},window:{addEventListener:(_,fn)=>receive=fn}});
 vm.runInContext(html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)[1],ctx);
 return {ctx,nodes,sent,send:data=>receive({data})};
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
 assert.ok(sent.some(m=>m.type==='refresh'),'stale pending request must not stall refresh');
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
