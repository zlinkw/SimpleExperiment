const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
require('../_helpers/registerTsRequire');
const {PlanRunHost}=require('../../src/extension/PlanRunHost.ts');
test('production confirmations use native modal dialogs and show every full path in both phases',async()=>{
 const source=fs.readFileSync(path.resolve(__dirname,'../../src/extension/legacy.ts'),'utf8'),ast=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true);let method;
 function visit(n){if(ts.isMethodDeclaration(n)&&n.name.getText(ast)==='showNativeRunConfirmation')method=n;ts.forEachChild(n,visit);}visit(ast);
 const calls=[],modal=vm.runInNewContext(ts.transpileModule('class Host{'+method.getText(ast)+'};Host.prototype.showNativeRunConfirmation',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,
  {vscode:{window:{showWarningMessage:async(...args)=>{calls.push(args);return args[2];}}}});
 const targets=Array.from({length:200},(_,i)=>({server:'w'+i,connection:'user@host',type:'directory',path:'/project/'+('目录/'.repeat(40))+i}));
 for(const phase of [1,2])assert.equal(await modal({phase,planFile:'plans/a.yaml',title:'确认完整路径',groups:[{value:'delete_and_run',label:'永久删除并重跑',targets}]}),'delete_and_run');
 assert.equal(calls.length,2);for(const [title,options,button] of calls){assert.equal(options.modal,true);assert.ok(options.detail.includes('plans/a.yaml'));for(const target of targets)assert.ok(options.detail.includes(target.path));assert.equal(button.choice,'delete_and_run');}
});
test('native confirmation queues concurrent callers, freezes full paths and ignores obsolete webview approvals',async()=>{
 const {RunConfirmation}=require('../../src/extension/RunConfirmation.ts'),broker=new RunConfirmation(),calls=[];let release;
 const long='/safe/'+('中文 long directory/'.repeat(80))+'model';
 const host={showNativeRunConfirmation:async payload=>{calls.push(payload);return new Promise(resolve=>release=resolve)},openPanelAt:()=>assert.fail('native confirmation must not open the plugin panel')};
 const payload={operationId:'first',groups:[{value:'delete_and_run',label:'删除',targets:[{path:long,type:'directory',server:'w'}]}]};
 const a=broker.ask(host,payload),b=broker.ask(host,{...payload,operationId:'second'});await new Promise(setImmediate);
 assert.equal(calls.length,1);payload.groups[0].targets[0].path='changed';assert.equal(calls[0].groups[0].targets[0].path,long);
 broker.answer({requestId:'old',choice:'delete_and_run'});release('delete_and_run');assert.equal(await a,'delete_and_run');await new Promise(setImmediate);
 assert.equal(calls.length,2);broker.cancel('second');release('delete_and_run');assert.equal(await b,'cancel');
});
test('recovery persists exact confirmed targets but excludes server credentials and Agent environment',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'se-run-recovery-')),host={context:{globalStorageUri:{fsPath:root}}},store=new PlanRunHost(host,root);
 const body={submissionOperationIdLocal:'plan-submit-one',planFile:'plans/p.yaml',options:{workers:[{token:'secret'}],agentToken:'secret',env:{PASSWORD:'secret'},nested:{password:'secret',normal:1}},runRecovery:{stage:'checking_workers'},
 runReplacement:{phase:2,previews:[{preview:{token:'opaque-cleanup-token',rows:[{absolutePath:'/safe/job'}]}}]}};
 await store.save(body);const saved=await store.load(body.submissionOperationIdLocal);assert.ok(!JSON.stringify(saved).includes('secret'));assert.equal(saved.replacement.phase,2);assert.equal(saved.replacement.previews[0].preview.token,'opaque-cleanup-token');
 await assert.rejects(new PlanRunHost(host,root+'other').load(body.submissionOperationIdLocal),/ENOENT/);
});
test('actual resume entry retains the original operation and prevents double clicks before the first continuation ends',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'se-resume-')),id='plan-submit-original',host={context:{globalStorageUri:{fsPath:root}},localOperations:{},resumedSubmissions:new Set(),distributedSubmissionEpochs:new Map(),distributedSubmissionAborts:new Map(),
 stampPlanRevision:b=>b.planRevision='same',localPlanForActionBody:()=>({}),markLocalOperationsDirty(){},postState(){},recordActionError(){}};
 const store=new PlanRunHost(host,root);await store.save({submissionOperationIdLocal:id,planFile:'plans/p.yaml',planRevision:'same',runRecovery:{},runReplacement:{phase:2}});
 const source=fs.readFileSync(path.resolve(__dirname,'../../src/extension/legacy.ts'),'utf8'),ast=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true);let m;function visit(n){if(ts.isMethodDeclaration(n)&&n.name.getText(ast)==='resumePlanSubmission')m=n;ts.forEachChild(n,visit);}visit(ast);
 const resume=vm.runInNewContext(ts.transpileModule('class Host{'+m.getText(ast)+'};Host.prototype.resumePlanSubmission',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{PlanRunHost,workspaceRoot:()=>root,AbortController,Error,Set,errorMessage:e=>e.message});
 let release,calls=[];host.finishDistributedPlanSubmission=async(_,message,plan,body)=>{calls.push({message,body});await new Promise(r=>release=r);};
 const result=await resume.call(host,id);assert.equal(result.operationId,id);await assert.rejects(resume.call(host,id),/正在处理/);assert.equal(calls.length,1);assert.equal(calls[0].message.clientActionId,'original');assert.equal(calls[0].body.runReplacement.phase,2);release();
});
test('confirmation broker replays only the pending request, ignores stale clicks and cancels the matching submission',async()=>{
 const {RunConfirmation}=require('../../src/extension/RunConfirmation.ts'),broker=new RunConfirmation(),sent=[];
 const host={openPanelAt:async()=>{},view:{webview:{postMessage:m=>sent.push(m)}}},payload={operationId:'one',groups:[{value:'delete_and_run'},{value:'disabled',disabled:true}]};
 const wait=broker.ask(host,payload);await new Promise(r=>setImmediate(r));const id=sent[0].requestId;
 broker.answer({requestId:'old',choice:'delete_and_run'});broker.answer({requestId:id,choice:'disabled'});broker.replay(host);assert.equal(sent.at(-1).requestId,id);
 broker.cancel('other');broker.answer({requestId:id,choice:'delete_and_run'});assert.equal(await wait,'delete_and_run');broker.answer({requestId:id,choice:'delete_and_run'});assert.equal(sent.filter(m=>m.type==='planRunConfirmationClosed').length,1);
 const second=broker.ask(host,{...payload,operationId:'two'});await new Promise(r=>setImmediate(r));broker.cancel('two');assert.equal(await second,'cancel');
});
test('simultaneous requests cannot replace an opening confirmation panel',async()=>{
 const {RunConfirmation}=require('../../src/extension/RunConfirmation.ts'),broker=new RunConfirmation();let release;
 const host={openPanelAt:()=>new Promise(r=>release=r),view:{webview:{postMessage(){}}}},payload={operationId:'one',groups:[{value:'go'}]};
 const first=broker.ask(host,payload);await assert.rejects(broker.ask(host,payload),/已有路径确认/);release();await new Promise(setImmediate);broker.cancel('one');assert.equal(await first,'cancel');
});
test('reload releases the confirmation without cancelling the saved original submission',async()=>{
 const source=fs.readFileSync(path.resolve(__dirname,'../../src/extension/legacy.ts'),'utf8'),ast=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true);let method;
 function visit(n){if(ts.isMethodDeclaration(n)&&n.name.getText(ast)==='submissionStillCurrent')method=n;ts.forEachChild(n,visit);}visit(ast);
 const isCurrent=vm.runInNewContext(ts.transpileModule('class Host{'+method.getText(ast)+'};Host.prototype.submissionStillCurrent',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{workspaceRoot:()=>'/project'});
 const {RunConfirmation}=require('../../src/extension/RunConfirmation.ts'),broker=new RunConfirmation(),controller=new AbortController();
 const host={activationAbortController:controller,planSubmissionOperationId:()=> 'original',localOperations:{original:{status:'running'}},distributedSubmissionEpochs:new Map(),openPanelAt:async()=>{},view:{webview:{postMessage(){}}}};
 assert.equal(isCurrent.call(host,{},0,'/project'),true);
 const pending=broker.ask(host,{operationId:'original',groups:[{value:'go'}]});await new Promise(setImmediate);
 broker.cancel();controller.abort();assert.equal(await pending,'cancel');
 assert.equal(isCurrent.call(host,{},0,'/project'),false);assert.equal(host.localOperations.original.status,'running');
 const recovered={...host,activationAbortController:new AbortController()};assert.equal(isCurrent.call(recovered,{},0,'/project'),true);
 recovered.localOperations.original.status='cancelled';assert.equal(isCurrent.call(recovered,{},0,'/project'),false);
});
