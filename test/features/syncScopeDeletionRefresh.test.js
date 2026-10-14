const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),Module=require('node:module');
require('../_helpers/registerTsRequire');
const {expandSyncScopeBatchSelection}=require('../../src/features/SyncScopeBatch.ts');
const source=fs.readFileSync(path.resolve(__dirname,'../../src/extension/legacy.ts'),'utf8');
function method(name,globals){const ast=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true);let member;function visit(n){if(ts.isMethodDeclaration(n)&&n.name.getText(ast)===name)member=n;ts.forEachChild(n,visit);}visit(ast);return vm.runInNewContext(ts.transpileModule('class Host{'+member.getText(ast)+'};Host.prototype.'+name,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,globals);}
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
