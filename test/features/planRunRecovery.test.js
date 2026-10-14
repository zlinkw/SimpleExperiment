const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
require('../_helpers/registerTsRequire');
const {PlanRunHost}=require('../../src/extension/PlanRunHost.ts');
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
