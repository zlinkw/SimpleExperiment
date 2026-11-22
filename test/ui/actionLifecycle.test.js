const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { readSource } = require("../_helpers/sourceReader");
require('../_helpers/registerTsRequire');
const { pickExperiment } = require('../../src/cli/commands/experiment.ts');

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing function ${name}`);
  const body = source.indexOf("{", start);
  let depth = 0;
  for (let index = body; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`unterminated function ${name}`);
}

function extractConst(source, name) {
  const start = source.indexOf(`const ${name} =`);
  assert.ok(start >= 0, `missing const ${name}`);
  const end = source.indexOf(";", start);
  assert.ok(end > start, `unterminated const ${name}`);
  return source.slice(start, end + 1);
}

test("local and draft PLAN counts preserve explicitly empty cases", async () => {
  require('../_helpers/registerTsRequire');
  const ts = require('typescript');
  const builder = require('../../src/features/PlanBuilder.ts');
  const declaration = (file, name) => {
    const text = fs.readFileSync(path.resolve(__dirname, '../..', file), 'utf8');
    const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    let found; const visit = node => { if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node.getText(ast); ts.forEachChild(node, visit); }; visit(ast);
    assert.ok(found, name); return found;
  };
  const localCode = ts.transpileModule(declaration('src/extension/legacy.ts', 'parseLocalPlanText') + '\nthis.parse = parseLocalPlanText;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const local = {PlanBuilder_1: builder, path, sha256Text: () => 'revision'}; vm.runInNewContext(localCode, local);
  const plans = [
    ['suite: s\nbase_config: config.yaml\nseeds: [0, 42]\ncases: []\n', 0],
    ['suite: s\nbase_config: config.yaml\nseeds: [0, 42]\n', 2],
    ['suite: s\nbase_config: config.yaml\nseeds: [0, 42]\ncases: [a, b]\n', 4],
  ];
  for (const [yaml, expected] of plans) assert.equal(local.parse('plan.yaml', yaml).jobCount, expected);
  const draftCode = ts.transpileModule(declaration('src/features/DraftPlans.legacy.ts', 'reconcileDraftPlansCore') + '\nthis.reconcile = reconcileDraftPlansCore;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  for (const [yaml, expected] of plans) {
    const sandbox = { walkYamlFiles: async () => ['root/tmp/plan/p.yaml'], DRAFT_PLAN_ROOT: 'tmp/plan', loadMetadata: async () => new Map(),
      path, fs: {stat: async () => ({birthtime:new Date(),mtime:new Date()})}, readSafeWorkspaceText: async () => yaml, MAX_DRAFT_TEXT_BYTES: 1,
      validateDraftReferences: () => ({configRefs:[],issues:[],ok:true}), draftContentHash: () => 'hash', baseRecord: () => ({}),
      normalizeWorkspacePath: x => x, TERMINAL_DRAFT_STATUSES: new Set(), DRAFT_STATUSES: [], parsePlanSummary: builder.parsePlanSummary,
      unique: x => x, promotionTargetFor: () => '', saveMetadata: async () => {}, Date };
    vm.runInNewContext(draftCode, sandbox);
    const result = await sandbox.reconcile('root', []); assert.equal(result.drafts[0].jobCount, expected);
  }
});

test("failure notification links to the full operation log without duplicating logged commands", async () => {
  const ts = require('typescript'), source = fs.readFileSync(path.resolve(__dirname, '../../src/extension/legacy.ts'), 'utf8');
  const ast = ts.createSourceFile('legacy.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const wanted = new Set(['withUiCommandStatus', 'postUiCommandStatus']); const methods = [];
  const visit = node => { if (ts.isMethodDeclaration(node) && wanted.has(node.name.getText(ast))) methods.push(node.getText(ast).replace(/^private /, '')); ts.forEachChild(node, visit); }; visit(ast);
  assert.equal(methods.length, 2);
  const facts = [], alerts = [], shown = [];
  const sandbox = { PLAN_SUBMISSION_COMMANDS:new Set(), OPERATION_NOTICE_COMMANDS:new Set(['validatePlan']),
    OperationOutcome_1:{operationOutcomeFor:()=> 'failed'}, localCommandReleasesAfterTrigger:()=>false, isUiCommandRemotePending:()=>false,
    isUiCommandCancelled:()=>false, errorMessage:e=>e.message, actionErrorSuggestion:()=>'', hostOperationLeaseActionLabel:x=>x,
    compactSensitiveText:s=>s, vscode:{window:{showErrorMessage:async (...args)=>{alerts.push(args);return '查看日志';}}} };
  const code=ts.transpileModule('class Host {'+methods.join('\n')+'}; this.Host=Host;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code,sandbox); const host=new sandbox.Host();
  Object.assign(host,{logOperationFact:x=>facts.push(x),showOperationLogFromUi:()=>shown.push(true),beginSimpleSftpCapabilityLaunch(){},finishPlanSubmissionProgress(){},recordActionError(){},postState(){},reportOperationNotice(){}});
  const message='请选择1至100个拆表值。'+'详情'.repeat(3000);
  await host.withUiCommandStatus('action-1','splitProjectResultTable',{},async()=>{throw new Error(message)}); await new Promise(resolve=>setImmediate(resolve));
  assert.equal(facts.length,1); assert.equal(facts[0],`[action-1] splitProjectResultTable failed：${message}`); assert.equal(alerts.length,1); assert.equal(shown.length,1);
  facts.length=0; host.postUiCommandStatus('action-2','failed','validatePlan','validation error'); assert.equal(facts.length,1);
  facts.length=0; host.postUiCommandStatus('action-3','failed','syncAllResultArtifacts','sync error'); assert.equal(facts.length,1);
  facts.length=0; host.postUiCommandStatus('action-4','completed','splitProjectResultTable','completed'); assert.equal(facts.length,0);
});

test("PLAN registry keeps an explicitly empty case list empty", () => {
  require('../_helpers/registerTsRequire');const plans=require('../../src/features/PlanBuilder.ts');
  const empty=plans.importLegacyPlanYamlToRegistry('empty.yaml','suite: example\nseeds: [0, 42]\ncases: []\n');
  assert.equal(empty.experimentCount,0);assert.equal(empty.plannedExperiments.length,0);
  const implicit=plans.importLegacyPlanYamlToRegistry('implicit.yaml','suite: example\ncommand: python train.py\nseeds: [0, 42]\n');
  assert.equal(implicit.experimentCount,2);assert.equal(implicit.plannedExperiments.length,2);
  const emptyMap=plans.importLegacyPlanYamlToRegistry('map.yaml','suite: example\nexperiments: {}\n');assert.equal(emptyMap.experimentCount,0);
  const nullCases=plans.importLegacyPlanYamlToRegistry('null.yaml','suite: example\ncases: null\nexperiments: []\n');assert.equal(nullCases.experimentCount,1);
  for(const section of ['cases','experiments']) {
    const yaml=`suite: example\ncommand: python train.py\nseeds: [0, 42]\n${section}: # no cases\n# end\n`;
    assert.equal(plans.parsePlanSummary(yaml).cases.length,0);
    const record=plans.importLegacyPlanYamlToRegistry('block.yaml',yaml);assert.equal(record.experimentCount,0);assert.equal(record.plannedExperiments.length,0);
  }
});

test("draft promotion preview schema describes the actual targets and conflicts", async () => {
  const ts=require('typescript'),root=path.resolve(__dirname,'../..'),source=fs.readFileSync(path.join(root,'src/features/DraftPlans.legacy.ts'),'utf8');
  const ast=ts.createSourceFile('draft.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);let method;
  const visit=node=>{if(ts.isFunctionDeclaration(node)&&node.name?.getText(ast)==='buildPromotionPreview')method=node.getText(ast);ts.forEachChild(node,visit)};visit(ast);
  const files={'tmp/plan/a.yaml':'config: tmp/config/a.yaml','tmp/config/a.yaml':'value: 1','experiments/plans/a.yaml':'old'};
  const sandbox={normalizeWorkspacePath:x=>x,isDraftPlanPath:x=>x.startsWith('tmp/plan/'),isDraftConfigPath:x=>x.startsWith('tmp/config/'),readFileIfExists:async(_root,file)=>files[file],
    extractDraftConfigRefs:()=>[{path:'tmp/config/a.yaml'}],unique:items=>[...new Set(items)],promotionTargetFor:x=>x.replace('tmp/plan/','experiments/plans/').replace('tmp/config/','configs/'),
    sha256Text:()=> 'hash',draftContentHash:()=> 'content',diffLines:()=>[]};
  vm.runInNewContext(ts.transpileModule(method.replace(/^export /,'')+';this.preview=buildPromotionPreview;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
  const preview=await sandbox.preview('/project','tmp/plan/a.yaml',{debugRunId:'r',debugStatus:'completed'});
  const module={exports:{}},schemaSource=fs.readFileSync(path.join(root,'src/mcp/ToolResults.ts'),'utf8');
  vm.runInNewContext(ts.transpileModule(schemaSource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{module,exports:module.exports});
  const schema=module.exports.toolOutputSchema('draft_promotion_preview').anyOf[0];assert.equal(preview.targets.length,2);assert.equal(preview.conflicts.length,1);
  assert.equal(schema.properties.targets.type,'array');assert.equal(schema.properties.conflicts.type,'array');assert.equal(schema.properties.debugStatus.type,'string');
});

test("draft debug preview reports read errors and accurate truncation", async () => {
  const ts=require('typescript'),source=fs.readFileSync(path.resolve(__dirname,'../../src/extension/legacy.ts'),'utf8');
  const ast=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);let method;
  const visit=node=>{if(ts.isMethodDeclaration(node)&&node.name.getText(ast)==='draftMetricsSummary')method=node.getText(ast);ts.forEachChild(node,visit)};visit(ast);
  let content='',failure;const sandbox={workspaceRoot:()=>'/project',path,crypto:require('node:crypto'),fs:{readFile:async()=>{if(failure)throw failure;return content}}};
  vm.runInNewContext(ts.transpileModule('class Host {'+method+'};this.Host=Host;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
  const h=new sandbox.Host(),record={draftPlanPath:'tmp/plan/a.yaml',lastDebugRunId:'run1'};
  failure=Object.assign(new Error('access denied'),{code:'EACCES'});await assert.rejects(h.draftMetricsSummary(record),/access denied/);
  failure=Object.assign(new Error('missing'),{code:'ENOENT'});assert.equal((await h.draftMetricsSummary(record)).source,'remote_debug_bundle');
  failure=undefined;content=Array.from({length:101},(_,i)=>String(i)).join('\n');let r=await h.draftMetricsSummary(record);assert.equal(r.previewLines.length,101);assert.equal(r.truncated,false);
  content+='\nextra';r=await h.draftMetricsSummary(record);assert.equal(r.previewLines.length,101);assert.equal(r.truncated,true);
});

test("flow updates report persistence failure instead of claiming success", async () => {
  const ts=require('typescript'), source=fs.readFileSync(path.resolve(__dirname,'../../src/extension/legacy.ts'),'utf8');
  const ast=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS); let method;
  const visit=node=>{if(ts.isMethodDeclaration(node)&&node.name.getText(ast)==='apiFlowUpdate')method=node.getText(ast);ts.forEachChild(node,visit)};visit(ast);
  assert.ok(method); const sandbox={ApiWorkflow_1:{advanceFlowStep:(_state,step,patch)=>({step,...patch}),nextFlowStep:()=> 'next'}};
  vm.runInNewContext(ts.transpileModule('class Host {'+method+'}; this.Host=Host;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
  const host=new sandbox.Host();host.apiFlowState={};host.captureProjectContext=()=>({});host.projectContextIsCurrent=()=>true;host.postState=()=>{};host.persistProjectFlowState=async()=>{throw new Error('save failed')};
  await assert.rejects(host.apiFlowUpdate({step:'prepare',completed:true}),/save failed/);
  host.persistProjectFlowState=async()=>true; const result=await host.apiFlowUpdate({step:'prepare',completed:true});
  assert.equal(result.ok,true);assert.equal(result.flow.step,'prepare');assert.equal(result.flow.completed,true);
});

test("flow updates can unblock and complete the same step", async () => {
  require('../_helpers/registerTsRequire'); const workflow=require('../../src/features/ApiWorkflow.ts');
  const ts=require('typescript'),source=fs.readFileSync(path.resolve(__dirname,'../../src/extension/legacy.ts'),'utf8');
  const ast=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS), methods=[];
  const visit=node=>{if(ts.isMethodDeclaration(node)&&['apiFlowUpdate','apiFlowGet'].includes(node.name.getText(ast)))methods.push(node.getText(ast));ts.forEachChild(node,visit)};visit(ast);
  const sandbox={ApiWorkflow_1:workflow};vm.runInNewContext(ts.transpileModule('class Host {'+methods.join('\n')+'}; this.Host=Host;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
  const h=new sandbox.Host();h.apiFlowState=workflow.defaultFlowState();h.captureProjectContext=()=>({});h.projectContextIsCurrent=()=>true;h.persistProjectFlowState=async()=>true;h.postState=()=>{};
  await h.apiFlowUpdate({step:'select_servers',blocked:true});let r=await h.apiFlowUpdate({step:'select_servers',completed:true});
  assert.equal(r.flow.steps.select_servers.blocked,false);assert.equal(r.flow.steps.select_servers.completed,true);assert.equal(r.nextStep,'select_mode');
  r=await h.apiFlowUpdate({step:'select_servers',completed:false});assert.equal(r.flow.steps.select_servers.completed,false);assert.equal(r.nextStep,'select_servers');
  const readback=await h.apiFlowGet();assert.equal(readback.flow.steps.select_servers.completed,false);assert.equal(readback.nextStep,'select_servers');
});

test("flow update does not return another project's state after a workspace switch", async () => {
  require('../_helpers/registerTsRequire');const workflow=require('../../src/features/ApiWorkflow.ts');
  const ts=require('typescript'),source=fs.readFileSync(path.resolve(__dirname,'../../src/extension/legacy.ts'),'utf8');
  const ast=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),names=['apiFlowUpdate','persistProjectFlowState','projectStatePersistenceQueue','queueProjectStatePersistence','captureProjectContext','projectContextIsCurrent'],methods=[];
  const visit=node=>{if(ts.isMethodDeclaration(node)&&names.includes(node.name.getText(ast)))methods.push(node.getText(ast));ts.forEachChild(node,visit)};visit(ast);assert.equal(methods.length,names.length);
  let root='/project-a',release,started,failWrite=false;const written=[];let startedWrite=new Promise(resolve=>{started=resolve});
  const sandbox={ApiWorkflow_1:workflow,path,workspaceRoot:()=>root,PROJECT_PERSISTENCE_PATHS:{apiFlowState:'state/flow.json'},
    writeProjectFlowState:async(project,state)=>{written.push({project,state});started();await new Promise(resolve=>{release=resolve});if(failWrite)throw new Error('write failed')}};
  vm.runInNewContext(ts.transpileModule('class Host {'+methods.join('\n')+'};this.Host=Host;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
  const h=new sandbox.Host();h.apiFlowState=workflow.defaultFlowState();h.projectContextGeneration=1;h.projectContextAbortController={signal:{}};h.projectStatePersistenceQueues=new Map();h.postState=()=>{};
  h.withPluginStateFileLease=async(_root,_file,_key,_label,fn)=>fn();
  const pending=h.apiFlowUpdate({step:'select_servers',completed:true});await startedWrite;
  root='/project-b';h.projectContextGeneration=2;h.apiFlowState=workflow.defaultFlowState();release();
  await assert.rejects(pending,/项目已切换.*原项目/);assert.equal(written.length,1);assert.equal(written[0].project,'/project-a');assert.equal(written[0].state.steps.select_servers.completed,true);
  root='/project-a';h.projectContextGeneration=3;h.apiFlowState=workflow.defaultFlowState();failWrite=true;startedWrite=new Promise(resolve=>{started=resolve});
  const failed=h.apiFlowUpdate({step:'select_servers',completed:true});await startedWrite;
  root='/project-b';h.projectContextGeneration=4;h.apiFlowState=workflow.defaultFlowState();release();
  await assert.rejects(failed,/项目已切换.*原项目/);assert.equal(written[1].project,'/project-a');
});

test("state writes do not reload or report a different project after switching", async () => {
  const ts=require('typescript'),source=fs.readFileSync(path.resolve(__dirname,'../../src/extension/legacy.ts'),'utf8');
  const ast=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),methods=[];
  const visit=node=>{if(ts.isMethodDeclaration(node)&&['apiStateSet','apiStateReset'].includes(node.name.getText(ast)))methods.push(node.getText(ast));ts.forEachChild(node,visit)};visit(ast);
  let root='A',release,started;const writes=[];let waiting;
  const sandbox={API_STATE_KEYS:{tunnelConfig:{writable:true,store:'workspace'}},keys:{tunnelConfig:'tunnelConfig'},workspaceRoot:()=>root,
    stringField:(p,k)=>p[k]||'',normalizeApiStateValue:(_k,v)=>v,redactApiStateValue:(_k,v)=>v,
    saveProjectConnectionValues:async(_context,project,value)=>{writes.push({project,value});started();await new Promise(resolve=>{release=resolve})}};
  vm.runInNewContext(ts.transpileModule('class Host {'+methods.join('\n')+'};this.Host=Host;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
  for(const method of ['apiStateSet','apiStateReset']) {
    root='A';waiting=new Promise(resolve=>{started=resolve});const h=new sandbox.Host();let reloads=0;h.context={};h.captureProjectContext=()=>({root});h.projectContextIsCurrent=c=>c.root===root;
    h.loadTunnelConfig=()=>{reloads++;return {project:root}};h.loadSetupConfig=()=>({});h.resetClient=()=>{};h.postState=()=>{};h.apiStateValue=()=>({project:root});
    const pending=h[method]({key:'tunnelConfig',confirm:true,value:{x:1}});await waiting;root='B';release();
    await assert.rejects(pending,/项目已切换.*原项目/);assert.equal(reloads,0);assert.equal(writes.at(-1).project,'A');
  }
});

test("configuration set does not report the new project's value after switching", async () => {
  const ts=require('typescript'),source=fs.readFileSync(path.resolve(__dirname,'../../src/extension/legacy.ts'),'utf8');
  const ast=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);let method;
  const visit=node=>{if(ts.isMethodDeclaration(node)&&node.name.getText(ast)==='apiConfigSet')method=node.getText(ast);ts.forEachChild(node,visit)};visit(ast);
  let root='A',release,started;const waiting=new Promise(resolve=>{started=resolve}),writes=[];
  const sandbox={stringField:(p,k)=>p[k]||'',validateApiConfigValue:()=>{},API_CONFIG_NAMESPACE:'simpleExperiment',API_CONFIG_PREFIX:'simpleExperiment.',API_SECRET_CONFIG_KEYS:new Set(),
    vscode:{Uri:{file:r=>r},ConfigurationTarget:{WorkspaceFolder:3,Workspace:2},workspace:{get workspaceFolders(){return [{uri:root}]},getConfiguration:(_n,project)=>({project,update:async(_key,value)=>{writes.push({project,value});started();await new Promise(resolve=>{release=resolve})}})}}};
  vm.runInNewContext(ts.transpileModule('class Host {'+method+'};this.Host=Host;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
  const h=new sandbox.Host();h.apiConfigDefinition=()=>({schema:{}});h.apiConfigUpdateTarget=()=>3;h.apiConfigValue=config=>config.project;h.postState=()=>{};h.captureProjectContext=()=>({root});h.projectContextIsCurrent=c=>c.root===root;
  const pending=h.apiConfigSet({key:'simpleExperiment.example',scope:'workspaceFolder',value:'x',confirm:true});await waiting;root='B';release();
  await assert.rejects(pending,/项目已切换.*原项目/);assert.equal(writes[0].project,'A');
});

test("draft validation returns the exact draft identity required by its MCP schema", async () => {
  const ts=require('typescript'),source=fs.readFileSync(path.resolve(__dirname,'../../src/extension/legacy.ts'),'utf8');
  const ast=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);let method;
  const visit=node=>{if(ts.isMethodDeclaration(node)&&node.name.getText(ast)==='apiDraftValidate')method=node.getText(ast);ts.forEachChild(node,visit)};visit(ast);
  const sandbox={stringField:(p,k)=>p[k]||'',workspaceRoot:()=>'/project',safeWorkspaceChildPath:(root,p)=>root+'/'+p,
    fs:{readFile:async()=> 'draft'},DraftPlans_1:{validateDraftReferences:()=>({ok:true,status:'validated',configRefs:[],issues:[]})}};
  vm.runInNewContext(ts.transpileModule('class Host {'+method+'}; this.Host=Host;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
  const h=new sandbox.Host();h.requireDraftRecord=async()=>({draftPlanPath:'tmp/plan/one.yaml'});
  const result=await h.apiDraftValidate({draftPlanPath:'tmp/plan/one.yaml'});assert.equal(result.draftPlanPath,'tmp/plan/one.yaml');
});

test("draft review reports the actual state after review", async () => {
  const ts=require('typescript'),source=fs.readFileSync(path.resolve(__dirname,'../../src/extension/legacy.ts'),'utf8');
  const ast=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);let method;
  const visit=node=>{if(ts.isMethodDeclaration(node)&&node.name.getText(ast)==='apiDraftReview')method=node.getText(ast);ts.forEachChild(node,visit)};visit(ast);
  const sandbox={stringField:(p,k)=>p[k]||'',workspaceRoot:()=>'/project',sameProjectRelativePath:(a,b)=>a===b,DraftPlans_1:{markDraftReviewed:async()=>{}}};
  vm.runInNewContext(ts.transpileModule('class Host {'+method+'}; this.Host=Host;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
  const h=new sandbox.Host();h.captureProjectContext=()=>({});h.projectContextIsCurrent=()=>true;h.requireDraftRecord=async()=>({draftPlanPath:'tmp/plan/one.yaml',status:'draft'});
  h.withDraftMetadataLease=async(_root,work)=>work();h.refreshDraftPlans=async()=>{h.draftPlanState={drafts:[{draftPlanPath:'tmp/plan/one.yaml',status:'draft'}],error:''}};
  const result=await h.apiDraftReview({draftPlanPath:'tmp/plan/one.yaml'});assert.equal(result.status,'draft');
});

test("draft lookup does not use stale records after a refresh failure", async () => {
  const ts=require('typescript'),source=fs.readFileSync(path.resolve(__dirname,'../../src/extension/legacy.ts'),'utf8');
  const ast=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);let method;
  const visit=node=>{if(ts.isMethodDeclaration(node)&&node.name.getText(ast)==='requireDraftRecord')method=node.getText(ast);ts.forEachChild(node,visit)};visit(ast);
  const sandbox={sameProjectRelativePath:(a,b)=>a===b};
  vm.runInNewContext(ts.transpileModule('class Host {'+method+'};this.Host=Host;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
  const host=new sandbox.Host();host.captureProjectContext=()=>({});host.projectContextIsCurrent=()=>true;host.draftPlanState={drafts:[{draftPlanPath:'tmp/plan/a.yaml'}],error:''};
  host.refreshDraftPlans=async()=>{host.draftPlanState.error='metadata read failed'};
  await assert.rejects(host.requireDraftRecord('tmp/plan/a.yaml'),/metadata read failed/);
});

test("draft rejection updates only the requested draft and preserves its identity", async () => {
  const ts=require('typescript'),root=path.resolve(__dirname,'../..');
  const hostSource=fs.readFileSync(path.join(root,'src/extension/legacy.ts'),'utf8'),draftSource=fs.readFileSync(path.join(root,'src/features/DraftPlans.legacy.ts'),'utf8');
  const extract=(source,name,kind)=>{const ast=ts.createSourceFile('source.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);let found;
    const visit=node=>{if(kind(node)&&node.name?.getText(ast)===name)found=node.getText(ast);ts.forEachChild(node,visit)};visit(ast);return found};
  const hostMethod=extract(hostSource,'apiDraftReject',ts.isMethodDeclaration),reject=extract(draftSource,'rejectDraft',ts.isFunctionDeclaration);
  const records={'tmp/plan/a.yaml':{status:'draft'},'tmp/plan/b.yaml':{status:'draft'}};
  const sandbox={workspaceRoot:()=>'/project',stringField:(p,k)=>p[k]||'',normalizeWorkspacePath:x=>x,
    updateDraftMetadata:async(_root,file,change)=>{records[file]=change(records[file])}};
  vm.runInNewContext(ts.transpileModule(reject.replace(/^export /,'')+';this.rejectDraft=rejectDraft;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
  sandbox.DraftPlans_1={rejectDraft:sandbox.rejectDraft};
  vm.runInNewContext(ts.transpileModule('class Host {'+hostMethod+'};this.Host=Host;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
  const host=new sandbox.Host();host.captureProjectContext=()=>({});host.projectContextIsCurrent=()=>true;host.requireDraftRecord=async file=>({draftPlanPath:file});host.withDraftMetadataLease=async(_root,fn)=>fn();host.refreshDraftPlans=async()=>{};
  const result=await host.apiDraftReject({draftPlanPath:'tmp/plan/a.yaml',reviewedBy:'reviewer'});
  assert.equal(result.draftPlanPath,'tmp/plan/a.yaml');assert.equal(records['tmp/plan/a.yaml'].status,'rejected');assert.equal(records['tmp/plan/a.yaml'].reviewedBy,'reviewer');assert.equal(records['tmp/plan/b.yaml'].status,'draft');
});

test("draft actions refuse another project after a workspace switch during lookup", async () => {
  const ts=require('typescript'),source=fs.readFileSync(path.resolve(__dirname,'../../src/extension/legacy.ts'),'utf8');
  const ast=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),names=['requireDraftRecord','apiDraftValidate','apiDraftPromotionPreview','apiDraftReject','apiDraftReview'],methods=[];
  const visit=node=>{if(ts.isMethodDeclaration(node)&&names.includes(node.name.getText(ast)))methods.push(node.getText(ast));ts.forEachChild(node,visit)};visit(ast);
  let root='A',release,started;const mutations=[];
  const sandbox={workspaceRoot:()=>root,stringField:(p,k)=>p[k]||'',sameProjectRelativePath:(a,b)=>a===b,safeWorkspaceChildPath:(r,p)=>r+'/'+p,
    fs:{readFile:async()=>''},DraftPlans_1:{validateDraftReferences:()=>({ok:true}),rejectDraft:async(r)=>mutations.push(r),markDraftReviewed:async(r)=>mutations.push(r),buildPromotionPreview:async(r)=>({root:r})}};
  vm.runInNewContext(ts.transpileModule('class Host {'+methods.join('\n')+'};this.Host=Host;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
  for(const name of names.slice(1)){
    root='A';const waiting=new Promise(resolve=>{started=resolve}),h=new sandbox.Host();h.captureProjectContext=()=>({root});h.projectContextIsCurrent=c=>c.root===root;
    h.draftPlanState={error:'',drafts:[]};h.refreshDraftPlans=async()=>{started();await new Promise(resolve=>{release=resolve});h.draftPlanState={error:'',drafts:[{draftPlanPath:'tmp/plan/a.yaml',status:'debug_completed',lastDebugStatus:'completed'}]}};
    h.withDraftMetadataLease=async(_root,fn)=>fn();h.draftMetricsSummary=async()=>({});
    const pending=h[name]({draftPlanPath:'tmp/plan/a.yaml'});await waiting;root='B';release();await assert.rejects(pending,/项目已切换/);
  }
  assert.equal(mutations.length,0);
});

test("draft review and rejection report a switch after writing the original project", async () => {
  const ts=require('typescript'),source=fs.readFileSync(path.resolve(__dirname,'../../src/extension/legacy.ts'),'utf8');
  const ast=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),methods=[];
  const visit=node=>{if(ts.isMethodDeclaration(node)&&['apiDraftReject','apiDraftReview'].includes(node.name.getText(ast)))methods.push(node.getText(ast));ts.forEachChild(node,visit)};visit(ast);
  let root='A',release,started;const writes=[];const write=async project=>{writes.push(project);started();await new Promise(resolve=>{release=resolve})};
  const sandbox={workspaceRoot:()=>root,stringField:(p,k)=>p[k]||'',DraftPlans_1:{rejectDraft:write,markDraftReviewed:write}};
  vm.runInNewContext(ts.transpileModule('class Host {'+methods.join('\n')+'};this.Host=Host;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
  for(const name of ['apiDraftReject','apiDraftReview']){
    root='A';const waiting=new Promise(resolve=>{started=resolve}),h=new sandbox.Host();let refreshed=false;
    h.requireDraftRecord=async()=>({draftPlanPath:'tmp/plan/a.yaml'});h.captureProjectContext=()=>({root});h.projectContextIsCurrent=c=>c.root===root;
    h.withDraftMetadataLease=async(_root,fn)=>fn();h.refreshDraftPlans=async()=>{refreshed=true};
    const pending=h[name]({draftPlanPath:'tmp/plan/a.yaml'});await waiting;root='B';release();
    await assert.rejects(pending,/项目已切换.*已写入原项目/);assert.equal(refreshed,false);assert.equal(writes.at(-1),'A');
  }
});

test("PLAN filtering can include the separate archive without selecting it", async () => {
  require('../_helpers/registerTsRequire');const workflow=require('../../src/features/ApiWorkflow.ts');
  const ts=require('typescript'),source=fs.readFileSync(path.resolve(__dirname,'../../src/extension/legacy.ts'),'utf8');
  const ast=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);let method;
  const visit=node=>{if(ts.isMethodDeclaration(node)&&node.name.getText(ast)==='apiPlansFilter')method=node.getText(ast);ts.forEachChild(node,visit)};visit(ast);
  const sandbox={ApiWorkflow_1:workflow};vm.runInNewContext(ts.transpileModule('class Host {'+method+'}; this.Host=Host;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
  const h=new sandbox.Host();h.localPlanMetadata={planDir:'plans',plans:[{planFile:'plans/a.yaml',status:'ready'}],archivedPlans:[{planFile:'plans/_archived/b.yaml',status:'archived'}]};
  let r=await h.apiPlansFilter({query:'b.yaml',archived:true});assert.equal(r.count,1);assert.equal(r.plans[0].archived,true);
  r=await h.apiPlansFilter({query:'b.yaml'});assert.equal(r.count,0);assert.equal(h.localPlanMetadata.archivedPlans[0].archived,undefined);
});

test("MCP PLAN filter exposes supported identity and choice parameters", () => {
  const ts=require('typescript'),source=fs.readFileSync(path.resolve(__dirname,'../../src/mcp/ToolCatalog.ts'),'utf8');
  const resultsSource=fs.readFileSync(path.resolve(__dirname,'../../src/mcp/ToolResults.ts'),'utf8'),results={exports:{}};
  vm.runInNewContext(ts.transpileModule(resultsSource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{module:results,exports:results.exports});
  const module={exports:{}},sandbox={module,exports:module.exports,require:()=>results.exports};
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,sandbox);
  const schema=module.exports.PROJECT_TOOLS.find(item=>item.name==='plan_filter').inputSchema;
  assert.equal(schema.additionalProperties,false);assert.equal(schema.properties.planId.type,'string');assert.equal(schema.properties.limit.type,'integer');assert.equal(schema.properties.needsChoice.type,'boolean');
  const output=module.exports.PROJECT_TOOLS.find(item=>item.name==='plan_filter').outputSchema;
  assert.equal(output.anyOf[0].properties.needsChoice.type,'boolean');
});

test("MCP project state returns consistent summary and full state without a grant", async () => {
  require('../_helpers/registerTsRequire');const {ProjectGateway}=require('../../src/mcp/ProjectGateway.ts');
  const state={workspace:{root:'/project'},extensionVersion:'v',topology:{mode:'offline'},health:{ok:true},selection:{plan:'a'},other:'full'};
  const gateway=new ProjectGateway({root:()=>'/project',workers:()=>[],store:{get:()=>undefined},methods:()=>({state:async()=>state})});
  const summary=await gateway.call('project_state',{}),full=await gateway.call('project_state',{detail:'full'});
  assert.equal(summary.workspace,state.workspace);assert.equal(summary.selection,state.selection);assert.equal(summary.other,undefined);
  assert.equal(summary.detail,'summary');assert.equal(full.other,'full');assert.equal(full.selection,state.selection);
});

test("state API rejects read-only keys and cancellation before writing", async () => {
  const ts=require('typescript'),source=fs.readFileSync(path.resolve(__dirname,'../../src/extension/legacy.ts'),'utf8');
  const ast=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);const methods=[];let declaration;
  const visit=node=>{if(ts.isMethodDeclaration(node)&&['apiStateValue','apiStateList','apiStateGet','apiStateSet'].includes(node.name.getText(ast)))methods.push(node.getText(ast));
    if(ts.isVariableStatement(node)&&node.declarationList.declarations.some(d=>d.name.getText(ast)==='API_STATE_KEYS'))declaration=node.getText(ast);ts.forEachChild(node,visit)};visit(ast);
  const values=new Map(),writes=[];const store={get:k=>values.get(k),update:async(k,v)=>{writes.push([k,v]);values.set(k,v)}};
  const sandbox={keys:new Proxy({}, {get:(_target,key)=>String(key)}),workspaceRoot:()=>'/project',readProjectConnectionValue:()=>undefined,stringField:(p,k)=>p[k]||'',redactApiStateValue:(_k,v)=>v,
    normalizeApiStateValue:(_k,v)=>v,confirmationRequired:()=>new Error('CONFIRM_REQUIRED')};
  vm.runInNewContext(ts.transpileModule(declaration+'\nclass Host {'+methods.join('\n')+'}; this.Host=Host;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
  const h=new sandbox.Host();h.context={workspaceState:store,globalState:store};h.captureProjectContext=()=>({root:'/project'});h.projectContextIsCurrent=()=>true;h.postState=()=>{};
  await assert.rejects(h.apiStateSet({key:'offlineBundle',value:{},confirm:true}),/只读/);
  await assert.rejects(h.apiStateSet({key:'uiProjectActions',value:['one']}),/CONFIRM_REQUIRED/);assert.equal(writes.length,0);
  await h.apiStateSet({key:'uiProjectActions',value:['one'],confirm:true});assert.deepEqual((await h.apiStateGet({key:'uiProjectActions'})).value,['one']);
  const listed=await h.apiStateList();assert.equal(listed.keys.find(x=>x.key==='offlineBundle').writable,false);
});

test("MCP operations list applies filters before pagination and preserves request identity", async () => {
  require('../_helpers/registerTsRequire');const {ProjectGateway}=require('../../src/mcp/ProjectGateway.ts');
  const ts=require('typescript'),source=fs.readFileSync(path.resolve(__dirname,'../../src/extension/legacy.ts'),'utf8');
  const ast=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);let arrow;
  const visit=node=>{if(ts.isPropertyAssignment(node)&&node.name.getText(ast)==='"operations.list"')arrow=node.initializer.getText(ast);ts.forEachChild(node,visit)};visit(ast);assert.ok(arrow);
  const sandbox={stringField:(p,k)=>p[k]||'',usableSelectionKey:x=>x,operationStatusToken:x=>String(x||'').toLowerCase(),
    operationResultPlanFile:x=>x.planFile||'',samePlanSelection:(a,b)=>a===b,operationTime:x=>Date.parse(x.startedAt)};
  vm.runInNewContext(ts.transpileModule('class Host { make(){return '+arrow+'} };this.Host=Host;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
  const h=new sandbox.Host();h.effectiveConnectionMode=()=> 'offline_import';h.buildPlanRuntimeEvidenceState=()=>({operations:{
    first:{type:'mcp-call',status:'running',planFile:'a',startedAt:'2026-01-01'},
    second:{type:'mcp-call',status:'running',planFile:'a',startedAt:'2026-01-02'},
    third:{type:'mcp-call',status:'failed',planFile:'a',startedAt:'2026-01-03'}}});
  const gateway=new ProjectGateway({root:()=>'/project',workers:()=>[],store:{get:()=>undefined},methods:()=>({'operations.list':h.make()})});
  const r=await gateway.call('operation_list',{status:'running',offset:1,limit:1});assert.equal(r.total,2);assert.equal(r.offset,1);assert.equal(r.limit,1);assert.equal(r.operations[0].operationId,'first');
});

test("retired draft promotion returns an explicit error", async () => {
  const ts=require('typescript'),source=fs.readFileSync(path.resolve(__dirname,'../../src/extension/legacy.ts'),'utf8');
  const ast=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);let method;
  const visit=node=>{if(ts.isMethodDeclaration(node)&&node.name.getText(ast)==='apiDraftPromote')method=node.getText(ast);ts.forEachChild(node,visit)};visit(ast);
  const sandbox={};vm.runInNewContext(ts.transpileModule('class Host {'+method+'}; this.Host=Host;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
  await assert.rejects(new sandbox.Host().apiDraftPromote({}),/DRAFT_PROMOTION_RETIRED/);
});

test("action catalog and invoke reject an unexposed command", async () => {
  const ts=require('typescript'),source=fs.readFileSync(path.resolve(__dirname,'../../src/extension/legacy.ts'),'utf8');
  const ast=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);let arrow,method;
  const visit=node=>{if(ts.isPropertyAssignment(node)&&node.name.getText(ast)==='"actions.list"')arrow=node.initializer.getText(ast);
    if(ts.isMethodDeclaration(node)&&node.name.getText(ast)==='invokeApi')method=node.getText(ast);ts.forEachChild(node,visit)};visit(ast);
  const sandbox={API_EXECUTABLE_COMMANDS:new Set(['openPlan','runPlan']),uiActionCommands:new Set(['runPlan']),API_CONFIRM_COMMANDS:new Set(['runPlan']),
    actionCommandMap:{runPlan:'plan/run'},stringField:(p,k)=>p[k]||''};
  vm.runInNewContext(ts.transpileModule('class Host {'+method+' makeCatalog(){return '+arrow+'} };this.Host=Host;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
  const host=new sandbox.Host(),catalog=await host.makeCatalog()();assert.equal(catalog.count,2);assert.equal(catalog.actions.find(x=>x.command==='runPlan').confirm,true);
  await assert.rejects(host.invokeApi({command:'invented'}),/not exposed/);
});

test("API selection commands reach local handlers while remote confirmation remains required", async () => {
  const ts=require('typescript'),source=fs.readFileSync(path.resolve(__dirname,'../../src/extension/legacy.ts'),'utf8');
  const ast=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS), methods={}, declarations={};
  const wanted=new Set(['uiActionCommands','SAFE_WEBVIEW_COMMANDS','API_INTERNAL_COMMANDS','API_EXECUTABLE_COMMANDS']);
  const visit=node=>{if(ts.isMethodDeclaration(node)&&['invokeApi','handleMessageCore'].includes(node.name.getText(ast)))methods[node.name.getText(ast)]=node.getText(ast);
    if(ts.isVariableStatement(node)) for(const d of node.declarationList.declarations) if(wanted.has(d.name.getText(ast))) declarations[d.name.getText(ast)]=node.getText(ast);
    ts.forEachChild(node,visit)};visit(ast);
  for(const key of wanted) assert.ok(declarations[key],key);
  const sandbox={PLAN_PREFLIGHT_COMMANDS:new Set(),API_PARAMETERIZED_CONNECTION_COMMANDS:new Set(),API_CONFIRM_COMMANDS:new Set(['runPlan']),
    stringField:(p,k)=>p[k]||'',booleanField:(p,k)=>Boolean(p[k]),confirmationRequired:()=>new Error('CONFIRM_REQUIRED')};
  const code=[...wanted].map(key=>declarations[key]).join('\n')+'\nclass Host {'+methods.invokeApi+'\n'+methods.handleMessageCore+'};this.Host=Host;';
  vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
  const host=new sandbox.Host(), selected=[], remote=[];
  host.extensionRuntimeVersionState=()=>({reloadRequired:false});host.panelLifecycleState='ready';
  host.selectPlanFromUi=m=>selected.push(['plan',m.planFile]);host.selectExperimentFromUi=m=>selected.push(['experiment',m.runKey]);
  host.withSafeTransferRetry=async(_command,_message,fn)=>fn();host.runActionCommand=async(command,message)=>remote.push([command,message.confirm]);
  await host.invokeApi({command:'selectPlan',planFile:'plans/a.yaml'});
  await host.invokeApi({command:'selectExperiment',runKey:'run-a'});
  assert.deepEqual(selected,[['plan','plans/a.yaml'],['experiment','run-a']]);
  await assert.rejects(host.invokeApi({}),/invoke.command is required/);
  await assert.rejects(host.invokeApi({command:'invented'}),/not exposed/);
  await assert.rejects(host.invokeApi({command:'runPlan'}),/CONFIRM_REQUIRED/);assert.equal(remote.length,0);
  await host.invokeApi({command:'runPlan',confirm:true});assert.deepEqual(remote,[['runPlan',true]]);
});

test("project authorization grants the project without binding Workers", async () => {
  const ts=require('typescript'),Module=require('node:module');
  const root=path.resolve(__dirname,'../..'), sourceFile=path.join(root,'src/extension/McpHost.ts');
  const {ProjectGateway}=require('../../src/mcp/ProjectGateway.ts');
  const {createProjectAuthorization,PERMISSIONS}=require('../../src/mcp/ProjectAuthorization.ts');
  const worker={id:'worker-a',host:'example.invalid',port:22,user:'fixture',projectRoot:'/fixture'};
  let currentRoot=root, workers=[], scenario='local', step=0, grant, writes=0;
  const vscode={workspace:{workspaceFolders:[{uri:{get fsPath(){return currentRoot}}}]},window:{
    showQuickPick:async items=>{step++;assert.equal(items.length,2);
      if(scenario==='cancel')return undefined;
      if(scenario==='switch')currentRoot=path.join(root,'test');
      return {value:'grant'};},showInformationMessage(){}}};
  const host={context:{workspaceState:{get:()=>grant,update:async(_key,value)=>{grant=value;writes++}}},
    refreshSharedConnectionSettings(){},workerCodeSyncTargets:()=>workers.map(row=>({...row,remotePath:row.projectRoot}))};
  const exported={},nativeRequire=Module.createRequire(sourceFile);
  const code=ts.transpileModule(fs.readFileSync(sourceFile,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  new Function('require','exports',code)(name=>name==='vscode'?vscode:name==='./SftpCleanupReview'?{}:nativeRequire(name),exported);
  await exported.manageAiAuthorization(host);
  assert.equal(writes,1);assert.equal(step,1);assert.equal(Object.hasOwn(grant,'workers'),false);assert.deepEqual(grant.permissions,PERMISSIONS);
  const calls=[],methods={'config.set':async params=>{calls.push(params);return {ok:true}},'project.prepare':async()=>{throw Error('unexpected remote call')}};
  const gateway=new ProjectGateway({root:()=>currentRoot,workers:()=>workers,store:host.context.workspaceState,methods:()=>methods});
  await gateway.call('configuration_set',{key:'simpleExperiment.showAdvancedCommands',value:true,scope:'workspace'});assert.equal(calls.length,1);
  currentRoot=path.join(root,'test');await assert.rejects(gateway.call('configuration_set',{key:'simpleExperiment.showAdvancedCommands',value:true,scope:'workspace'}),/AUTHORIZATION_REQUIRED/);
  currentRoot=root;await assert.rejects(gateway.call('project_prepare',{}),/unexpected remote call/);
  scenario='cancel';step=0;await exported.manageAiAuthorization(host);assert.equal(writes,1);
  scenario='switch';step=0;await assert.rejects(exported.manageAiAuthorization(host),/WORKSPACE_CHANGED/);assert.equal(writes,1);
  currentRoot=root;scenario='worker';step=0;workers=[worker];await exported.manageAiAuthorization(host);
  assert.equal(step,1);assert.equal(writes,2);assert.equal(Object.hasOwn(grant,'workers'),false);assert.deepEqual(grant.permissions,PERMISSIONS);
  await gateway.call('configuration_set',{key:'simpleExperiment.showAdvancedCommands',value:true,scope:'workspace'});assert.equal(calls.length,2);
  grant={...createProjectAuthorization(root),permissions:['configuration'],workers:[worker]};
  workers=[{...worker,host:'changed.invalid'}];
  await assert.rejects(gateway.call('configuration_set',{key:'simpleExperiment.showAdvancedCommands',value:true,scope:'workspace'}),/WORKER_NOT_AUTHORIZED/);
  workers=[worker];await assert.rejects(gateway.call('project_prepare',{}),/AUTHORIZATION_REQUIRED/);
  assert.equal(calls.length,2);
});

test("configured disabled Worker can be enabled through the configuration tool", async () => {
  const ts=require('typescript'),Module=require('node:module');
  const root=path.resolve(__dirname,'../..'), legacy=fs.readFileSync(path.join(root,'src/extension/legacy.ts'),'utf8');
  const ast=ts.createSourceFile('legacy.ts',legacy,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),methods={};let route;
  const visit=node=>{if(ts.isMethodDeclaration(node)&&['saveWorkerConfigFromUi','saveWorkerConfigCore'].includes(node.name.getText(ast)))methods[node.name.getText(ast)]=node.getText(ast);
    if(ts.isPropertyAssignment(node)&&node.name.getText(ast)==='"workers.configure"')route=node.initializer.getText(ast);ts.forEachChild(node,visit)};visit(ast);
  const unchanged=(_patch,_key,value)=>value;
  const sandbox={stringField:(row,key)=>row[key]||'',recordField:(row,key)=>row[key]||{},confirmationRequired:()=>Error('CONFIRM_REQUIRED'),
    preservedOptionalStringPatch:unchanged,preservedStringPatch:unchanged,clearableOptionalStringPatch:unchanged,
    sessionScopedOptionalStringPatch:unchanged,forwardIndexPatch:unchanged,numberPatch:unchanged,autoOrNumberRangePatch:unchanged,optionalNumberRangePatch:unchanged,
    boolishPatch:(patch,key,value)=>patch[key]===undefined?value:patch[key],assertActualWorkRoot(){},normalizeRemoteWorkRoot:x=>x,
    sessionPathChanged:()=>false,GpuMemoryScheduling:{memorySchedulingOverrides:()=>({})},GpuQuotaScheduling:{quotaOverrides:()=>({})},
    XshellTunnelSetup_1:{normalizeXshellSetupConfig:x=>x},mcpInvocation:require('../../src/mcp/Invocation.ts').mcpInvocation};
  const compiled=ts.transpileModule('class Host {'+Object.values(methods).join('\n')+'\nmakeMethods(){return {"workers.configure":'+route+'}}};this.Host=Host;',
    {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(compiled,sandbox);const host=new sandbox.Host();let grant;
  const {createProjectAuthorization}=require('../../src/mcp/ProjectAuthorization.ts');grant=createProjectAuthorization(root);
  host.setupConfig={workerTunnels:[{id:'off',enabled:false,workerHost:'fixture.invalid',workerUser:'fixture',agentProjectDir:'/fixture'}]};
  host.context={workspaceState:{get:()=>grant}};host.refreshSharedConnectionSettings=()=>{};
  host.workerCodeSyncTargets=()=>host.setupConfig.workerTunnels.filter(x=>x.enabled!==false).map(x=>({id:x.id,host:x.workerHost,user:x.workerUser,port:22,remotePath:x.agentProjectDir}));
  host.ensureXshellSessionLoaded=async()=>{};host.withImportedXshellFields=x=>x;host.applySetupDraft=async x=>{host.setupConfig=x};
  const local=host.makeMethods();host.createLocalApiMethods=()=>({...local,'agents.lifecycle':async()=>{throw Error('unexpected remote action')}});
  const vscode={workspace:{workspaceFolders:[{uri:{fsPath:root}}]}},sourceFile=path.join(root,'src/extension/McpHost.ts'),exported={};
  const nativeRequire=Module.createRequire(sourceFile),code=ts.transpileModule(fs.readFileSync(sourceFile,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  new Function('require','exports',code)(name=>name==='vscode'?vscode:name==='./SftpCleanupReview'?{}:nativeRequire(name),exported);
  const gateway=exported.mcpGateway(host);
  await assert.rejects(gateway.call('agent_restart',{serverIds:['off']}),/WORKER_UNKNOWN/);
  await assert.rejects(gateway.call('worker_configure',{workerId:'unknown',patch:{enabled:true}}),/WORKER_UNKNOWN/);
  host.ensureXshellSessionLoaded=async()=>{host.setupConfig.workerTunnels[0].workerHost='changed.invalid'};
  await assert.rejects(gateway.call('worker_configure',{workerId:'off',patch:{enabled:true}}),/WORKER_TARGET_CHANGED/);
  assert.equal(host.setupConfig.workerTunnels[0].enabled,false);
  host.setupConfig.workerTunnels[0].workerHost='fixture.invalid';host.ensureXshellSessionLoaded=async()=>{};
  const result=await gateway.call('worker_configure',{workerId:'off',patch:{enabled:true}});
  assert.equal(result.ok,true);assert.equal(result.worker.enabled,true);assert.equal(host.setupConfig.workerTunnels[0].enabled,true);
});

test("PLAN list returns formal and archived metadata separately", async () => {
  const ts=require('typescript'),source=fs.readFileSync(path.resolve(__dirname,'../../src/extension/legacy.ts'),'utf8');
  const ast=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);let arrow;
  const visit=node=>{if(ts.isPropertyAssignment(node)&&node.name.getText(ast)==='"plans.list"')arrow=node.initializer.getText(ast);ts.forEachChild(node,visit)};visit(ast);
  const sandbox={};vm.runInNewContext(ts.transpileModule('class Host { make(){return '+arrow+'} };this.Host=Host;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
  const h=new sandbox.Host();h.refreshLocalPlanMetadata=async()=>{h.localPlanMetadata={plans:[{planFile:'live'}],archivedPlans:[{planFile:'archive'}]}};
  const r=await h.make()();assert.equal(r.plans[0].planFile,'live');assert.equal(r.archivedPlans[0].planFile,'archive');assert.equal(r.source,'local_metadata');
});

test("PLAN save surfaces write failure after preserving the prior content", async () => {
  const source=fs.readFileSync(path.resolve(__dirname,'../../src/extension/legacy.ts'),'utf8');
  const start=source.indexOf('async function writeWorkspaceTextWithBackup('),end=source.indexOf('// Backups are plugin-owned',start);assert.ok(start>=0&&end>start);
  const root=path.resolve('fixture-project'),calls=[];let previous='old';const sandbox={path,workspaceRoot:()=>root,
    fs:{mkdir:async()=>{},readFile:async()=>previous,writeFile:async(_file,text)=>{calls.push(text)}},
    nextWorkspaceBackupSlot:async()=>path.join(root,'history.bak'),atomicWriteText:async()=>{throw new Error('write failed')}};
  vm.runInNewContext(source.slice(start,end)+';this.save=writeWorkspaceTextWithBackup;',sandbox);
  await assert.rejects(sandbox.save(path.join(root,'plan.yaml'),'new'),/write failed/);assert.equal(previous,'old');assert.deepEqual(calls,['old']);
});

test("opening a PLAN propagates failure without changing selection", async () => {
  const ts=require('typescript'),source=fs.readFileSync(path.resolve(__dirname,'../../src/extension/legacy.ts'),'utf8');
  const ast=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);let method;
  const visit=node=>{if(ts.isMethodDeclaration(node)&&node.name.getText(ast)==='openWorkspacePlanFromUi')method=node.getText(ast);ts.forEachChild(node,visit)};visit(ast);
  const sandbox={workspaceRoot:()=>'/project',stringField:(p,k)=>p[k]||'',openWorkspaceFile:async()=>{throw new Error('open failed')},path};
  vm.runInNewContext(ts.transpileModule('class Host {'+method+'};this.Host=Host;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
  const host=new sandbox.Host();host.projectContextGeneration=1;let selected=false;host.selectPlanFromUi=()=>{selected=true};
  await assert.rejects(host.openWorkspacePlanFromUi({file:'experiments/plans/a.yaml'}),/open failed/);assert.equal(selected,false);
});

test("result table reconstruction failure prevents opening stale output", async () => {
  const ts=require('typescript'),source=fs.readFileSync(path.resolve(__dirname,'../../src/extension/legacy.ts'),'utf8');
  const ast=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);let method;
  const visit=node=>{if(ts.isMethodDeclaration(node)&&node.name.getText(ast)==='openLocalResultTableFromUi')method=node.getText(ast);ts.forEachChild(node,visit)};visit(ast);
  const sandbox={pluginProjectAdapterRules:()=>({}),DEFAULT_RESULT_CSV_DIR:'results',readLatestResultExport:async()=>({tables:[{tableKey:'a'}]}),
    regenerateLatestResultTables:async()=>{throw new Error('rebuild failed')}};
  vm.runInNewContext(ts.transpileModule('class Host {'+method+'};this.Host=Host;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
  const host=new sandbox.Host();host.captureProjectContext=()=>({root:'/project'});host.readProjectResultCatalog=async()=>({datasets:[{tables:[{tableKey:'a',path:'a.csv'}]}]});
  host.withProjectResultPublicationLease=async(_root,_dir,fn)=>fn();let opened=false;host.openWorkspaceFileForProjectContext=async()=>{opened=true};
  await assert.rejects(host.openLocalResultTableFromUi({tableKey:'a'}),/rebuild failed/);assert.equal(opened,false);
});

test("offline worker action fails before any endpoint request", async () => {
  const ts=require('typescript'),source=fs.readFileSync(path.resolve(__dirname,'../../src/extension/legacy.ts'),'utf8');
  const ast=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);let method;
  const visit=node=>{if(ts.isMethodDeclaration(node)&&node.name.getText(ast)==='postWorkerTunnelAction')method=node.getText(ast);ts.forEachChild(node,visit)};visit(ast);
  const sandbox={};vm.runInNewContext(ts.transpileModule('class Host {'+method+'};this.Host=Host;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
  const host=new sandbox.Host();host.assertActionAuthorityCurrent=()=>{};host.resolveWorkerEndpointId=id=>id;host.isRealtimeMode=()=>false;
  let endpointRead=false,error;host.workerAgentUrl=()=>{endpointRead=true};host.recordActionError=e=>{error=e};host.postState=()=>{};
  await assert.rejects(host.postWorkerTunnelAction('worker','query',{}),/offline_import/);assert.equal(endpointRead,false);assert.match(error.message,/offline_import/);
});

test("local artifact IDs distinguish same-named files in different directories", async () => {
  const ts=require('typescript'),source=fs.readFileSync(path.resolve(__dirname,'../../src/cli/commands/artifact.ts'),'utf8');
  const ast=ts.createSourceFile('artifact.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),names=['listArtifacts','findArtifact'],methods=[];
  const visit=node=>{if(ts.isFunctionDeclaration(node)&&names.includes(node.name?.getText(ast)))methods.push(node.getText(ast));ts.forEachChild(node,visit)};visit(ast);
  const root=path.resolve('artifact-fixture'),output=path.join(root,'run');let files=[{path:'a/metrics.csv',size:1},{path:'b/metrics.csv',size:2}];
  const sandbox={path,pickExperiment,fs:{statSync:()=>({size:5})},loadExperiments:async()=>[{id:'run1',raw:{outputDir:output}}],fileExists:()=>true,projectRoot:()=>root,
    resolveProjectPath:p=>path.join(root,p),readJsonFile:()=>({files}),optionalApi:async()=>undefined,asRecord:x=>x||{},businessError:(message)=>new Error(message)};
  vm.runInNewContext(ts.transpileModule(methods.join('\n')+';this.list=listArtifacts;this.find=findArtifact;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
  const rows=await sandbox.list('run1');assert.notEqual(rows[0].id,rows[1].id);
  assert.equal((await sandbox.find(rows[1].id)).path,rows[1].path);await assert.rejects(sandbox.find('run1:metrics.csv'),/AMBIGUOUS/);
  files=[files[0]];assert.equal((await sandbox.find('run1:metrics.csv')).path,rows[0].path);
});

test("artifact list and detail preserve colon-bearing historical experiment identity", async () => {
  const ts=require('typescript'),root=path.resolve('artifact-fixture'),output=path.join(root,'run');
  const source=fs.readFileSync(path.resolve(__dirname,'../../src/cli/commands/artifact.ts'),'utf8'),experimentSource=fs.readFileSync(path.resolve(__dirname,'../../src/cli/commands/experiment.ts'),'utf8');
  const functions=(text,names)=>{const ast=ts.createSourceFile('source.ts',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),found=[];const visit=node=>{if(ts.isFunctionDeclaration(node)&&names.includes(node.name?.getText(ast)))found.push(node.getText(ast));ts.forEachChild(node,visit)};visit(ast);return found.join('\n')};
  const sandbox={path,pickExperiment,EXPERIMENT_INDEX_REL:'index.json',projectRoot:()=>root,resolveProjectPath:p=>path.join(root,p),asRecord:x=>x||{},
    readJsonFile:file=>file.endsWith('index.json')?[{global_job_id:'workflow:3',hub_job_dir:output,case:'case-a'}]:{files:[{path:'a/metrics.csv',size:1}]},
    firstString:(obj,keys)=>String(keys.map(key=>obj[key]).find(value=>value!==undefined)||''),blankRuntime:x=>x,normalizeStatus:x=>x,progressValue:()=>undefined,gpuValue:()=>undefined,
    fs:{statSync:()=>({size:1})},fileExists:()=>true,optionalApi:async()=>undefined,businessError:message=>new Error(message)};
  const code=functions(experimentSource,['loadLocalExperiments'])+'\n'+functions(source,['listArtifacts','findArtifact'])+'\nthis.loadExperiments=async()=>loadLocalExperiments();this.list=listArtifacts;this.find=findArtifact;';
  vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
  const rows=await sandbox.list('workflow:3');assert.equal(rows[0].id,'workflow:3:a/metrics.csv');
  const found=await sandbox.find(rows[0].id);assert.ok(found);assert.equal(found.path,rows[0].path);
});

test("result artifact IDs can be resolved through their owning experiment", async () => {
  const ts=require('typescript'),source=fs.readFileSync(path.resolve(__dirname,'../../src/cli/commands/artifact.ts'),'utf8');
  const ast=ts.createSourceFile('artifact.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),names=['listArtifacts','findArtifact'],methods=[];
  const visit=node=>{if(ts.isFunctionDeclaration(node)&&names.includes(node.name?.getText(ast)))methods.push(node.getText(ast));ts.forEachChild(node,visit)};visit(ast);
  const sandbox={path,pickExperiment,fs:{statSync:()=>({size:5})},loadExperiments:async()=>[{id:'run1',plan:'plan1'}],fileExists:()=>false,projectRoot:()=>path.resolve('fixture'),resolveProjectPath:p=>path.resolve('fixture',p),
    optionalApi:async(_method,params)=>params.planFile==='plan1'?{results:[{resultId:'result1',sourceFiles:[{path:'nested/metrics.csv',size:0}]}]}:undefined,
    asRecord:x=>x||{},businessError:message=>new Error(message)};
  vm.runInNewContext(ts.transpileModule(methods.join('\n')+';this.list=listArtifacts;this.find=findArtifact;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
  const rows=await sandbox.list('run1');assert.equal(rows.length,1);assert.equal(rows[0].size,'0');const found=await sandbox.find(rows[0].id);assert.ok(found);assert.equal(found.path,'nested/metrics.csv');
});

test("native worker artifact IDs retain exact worker and path", async () => {
  const ts=require('typescript'),source=fs.readFileSync(path.resolve(__dirname,'../../src/cli/commands/artifact.ts'),'utf8');
  const ast=ts.createSourceFile('artifact.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),names=['listArtifacts','findArtifact'],methods=[];
  const visit=node=>{if(ts.isFunctionDeclaration(node)&&names.includes(node.name?.getText(ast)))methods.push(node.getText(ast));ts.forEachChild(node,visit)};visit(ast);
  const sandbox={path,pickExperiment,loadExperiments:async()=>[{id:'workflow:3',type:'worker_run',worker_id:'worker',native_state:{output_dir:'work/run'}}],
    workerInventory:async()=>({'work/run/a/metrics.csv':{size:7,modifiedAtMs:1700000000000}}),businessError:message=>new Error(message)};
  vm.runInNewContext(ts.transpileModule(methods.join('\n')+';this.list=listArtifacts;this.find=findArtifact;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
  const rows=await sandbox.list('workflow:3'),found=await sandbox.find(rows[0].id);assert.equal(found.workerId,'worker');assert.equal(found.path,'work/run/a/metrics.csv');
});

test("result parsing recognizes uppercase JSON file extensions", () => {
  require('../_helpers/registerTsRequire');const results=require('../../src/features/Results.ts');
  const ts=require('typescript'),source=fs.readFileSync(path.resolve(__dirname,'../../src/cli/commands/result.ts'),'utf8');
  const ast=ts.createSourceFile('result.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);let method;
  const visit=node=>{if(ts.isFunctionDeclaration(node)&&node.name?.getText(ast)==='resultParse')method=node.getText(ast);ts.forEachChild(node,visit)};visit(ast);
  let parsedType,output;const sandbox={path,fs:{existsSync:()=>true,readFileSync:()=>'{"experiment_id":"e","metrics":{"accuracy":0.9}}'},builtInResultPresets:results.builtInResultPresets,
    parseResultFile:(content,file,preset)=>{parsedType=file.type;return results.parseResultFile(content,file,preset)},writeJson:value=>{output=value}};
  vm.runInNewContext(ts.transpileModule(method.replace(/^export /,'')+';this.parse=resultParse;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
  assert.equal(sandbox.parse({file:'metrics.JSON'}),0);assert.equal(parsedType,'json');assert.equal(output[0].metrics.accuracy.value,0.9);
});

test("webview terminal uiCommandStatus clears button loading by client action", () => {
  const root = path.resolve(__dirname, "..", "..");
  const source = readSource("src/ui/PanelHtml.ts");
  const handler = source.match(/function handleUiCommandStatus[\s\S]*?function clearCompletedPendingButtons/)?.[0] || "";
  assert.match(handler, /clientActionId/);
  assert.match(handler, /isTerminalUiStatus\(data\.status\)/);
  assert.match(handler, /delete pendingActionsById\[clientActionId\]/);
  assert.match(handler, /clearPendingActionTimeout\(clientActionId\)/);
  assert.match(handler, /clearButtonsForPending\(clientActionId, pendingKey, data\.command\)/);
  assert.match(handler, /!item && !isTerminalUiStatus\(data\.status\)/);
});

test("webview command watchdog is scoped to client action id", () => {
  const root = path.resolve(__dirname, "..", "..");
  const source = readSource("src/ui/PanelHtml.ts");
  const clickHandler = source.match(/const pendingKey = pendingKeyForButton\(button, command, payload\);[\s\S]*?vscode\.postMessage\(Object\.assign\(\{ command \}, payload\)\)/)?.[0] || "";
  const clearBlock = source.match(/function clearPendingActionTimeout[\s\S]*?function clearButtonsForPending/)?.[0] || "";
  assert.match(source, /let pendingActionTimeouts = \{\}/);
  assert.match(clickHandler, /pendingActionTimeouts\[clientActionId\] = setTimeout/);
  assert.match(clickHandler, /const item = pendingActionsById\[clientActionId\]/);
  assert.doesNotMatch(clickHandler, /pendingActionsById\[clientActionId\] \|\| pendingActions\[pendingKey\]/);
  assert.match(clearBlock, /clearTimeout\(timer\)/);
  assert.match(clearBlock, /delete pendingActionTimeouts\[clientActionId\]/);
});

test("extension action operations use stable ids and watchdog terminal states", () => {
  const root = path.resolve(__dirname, "..", "..");
  const source = readSource("src/extension.ts");
  assert.match(source, /operationId\?: string/);
  assert.match(source, /request\.operationId = request\.opId/);
  assert.match(source, /scheduleOperationWatchdog\(request\.opId, action, workerId\)/);
  assert.match(source, /status: "outcome_pending", outcomePending: true/);
  assert.match(source, /operationTerminalStatus/);
  assert.match(source, /"stalled"/);
  assert.match(source, /"unsupported"/);
});

test("extension compacts operation payload without dropping active operations", () => {
  const root = path.resolve(__dirname, "..", "..");
  const source = readSource("src/extension.ts");
  const runtimeEvidence = source.match(/private buildPlanRuntimeEvidenceState\(\)[\s\S]*?return \{ connectionMode, realtimeState, snapshot, offlineSnapshot, schedulerStates, operations \};/)?.[0] || "";
  const compact = source.match(/function compactOperationRecords[\s\S]*?function operationTerminal/)?.[0] || "";

  assert.match(source, /const LOCAL_OPERATION_RECORD_LIMIT = 120/);
  assert.match(source, /const STATE_OPERATION_RECORD_LIMIT = 120/);
  assert.match(source, /const TERMINAL_OPERATION_RECORD_LIMIT = 80/);
  assert.doesNotMatch(runtimeEvidence, /queueProjectLocalOperationsStatePersistence\(|persistProjectLocalOperationsState\(/);
  assert.match(runtimeEvidence, /const mergedOperations = compactOperationRecords\(/);
  assert.match(runtimeEvidence, /const operations = withoutRetiredOperations\(mergedOperations, this\.retiredOperationIds\(\)\)/);
  assert.match(compact, /entries\.length <= limit\)\s*return record && typeof record === "object" \? record : \{\}/);
  assert.match(compact, /if \(!operationTerminal\(entry\[1\]\)\)\s*active\.push\(entry\)/);
  assert.match(compact, /operationFailureTerminalStatus\(operationStatusOf\(entry\[1\]\)\)/);
  assert.match(compact, /const sortedEntries = sortOperationEntries\(entries\)/);
  assert.match(compact, /for \(const entry of sortedEntries\)/);
  assert.match(compact, /active\.forEach\(add\)/);
  assert.match(compact, /terminal\.slice\(0, terminalLimit\)\.forEach\(add\)/);
  assert.equal((compact.match(/sortOperationEntries\(/g) || []).length, 2);
});

test("local operation persistence is dirty-gated, single-flight, and project-scoped", () => {
  const root = path.resolve(__dirname, "..", "..");
  const source = readSource("src/extension.ts");
  const queue = source.match(/private queueProjectLocalOperationsStatePersistence\(\)[\s\S]*?async persistProjectLocalOperationsState/)?.[0] || "";

  assert.match(queue, /this\.localOperationsPersistPromise \|\| !this\.localOperationsDirty/);
  assert.match(queue, /const projectContext = this\.captureProjectContext\(\)/);
  assert.match(queue, /while \(this\.localOperationsDirty && this\.projectContextIsCurrent\(projectContext\)\)/);
  assert.match(queue, /this\.localOperationsDirty = false;[\s\S]*?await this\.withPluginStateFileLease\(projectContext\.root, file, "project-state-local-operations", "保存本地操作记录", \(\) => writeProjectLocalOperationsState\(projectContext\.root, operations\)\)/);
  assert.match(queue, /if \(this\.projectContextIsCurrent\(projectContext\)\)\s*this\.localOperationsDirty = true/);
  assert.match(queue, /this\.localOperationsPersistPromise === persistence/);
  assert.match(queue, /!failed \|\| !this\.projectContextIsCurrent\(projectContext\)/);
});

test("local toolbar commands wait for extension terminal status", async () => {
  const root = path.resolve(__dirname, "..", "..");
  const source = readSource("src/extension.ts");
  assert.match(source, /function localCommandReleasesAfterTrigger/);
  assert.match(source, /const LOCAL_COMMAND_RELEASES_AFTER_TRIGGER = new Set\(\["startAllConnections", "testAll", "snapshot"\]\)/);
  assert.match(source, /return LOCAL_COMMAND_RELEASES_AFTER_TRIGGER\.has/);
  assert.match(source, /已触发本地 VS Code 操作/);
  const start = source.indexOf("    private async withUiCommandStatus(");
  const end = source.indexOf("    uiCommandWatchdogMs(", start);
  assert.ok(start >= 0 && end > start);
  const emitted = require("typescript").transpileModule(
    "(" + source.slice(start, end).replace("private async withUiCommandStatus", "async function") + ");",
    { compilerOptions: { target: require("typescript").ScriptTarget.ES2022 } },
  ).outputText;
  const context = vm.createContext({
    PLAN_SUBMISSION_COMMANDS: new Set(["runPlan", "runAllPlans", "reproducePlan"]),
    OperationOutcome_1: require("../../dist/core/OperationOutcome.js"),
  });
  vm.runInContext(extractConst(source, "LOCAL_COMMAND_RELEASES_AFTER_TRIGGER") + "\n" + extractFunction(source, "localCommandReleasesAfterTrigger"), context);
  const run = vm.runInContext(emitted, context);
  const statuses = [];
  const host = { postUiCommandStatus: (_id, status) => statuses.push(status), beginSimpleSftpCapabilityLaunch: () => undefined };
  let finish;
  const pending = run.call(host, "tmux-click", "fetchTmuxList", {}, () => new Promise((resolve) => { finish = resolve; }));
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(statuses, ["running"]);
  finish({});
  await pending;
  assert.deepEqual(statuses, ["running", "completed"]);
});

test("webview repeated render does not preserve disabled state for loading buttons", () => {
  const root = path.resolve(__dirname, "..", "..");
  const source = readSource("src/ui/PanelHtml.ts");
  assert.match(source, /const alreadyLoading = button\.classList\.contains\("is-loading"\)/);
  assert.match(source, /if \(!alreadyLoading\) button\.dataset\.wasDisabled/);
  assert.match(source, /delete button\.dataset\.clientActionId/);
});

test("webview command lifecycle reuses fixed status and command sets", () => {
  const root = path.resolve(__dirname, "..", "..");
  const source = readSource("src/ui/PanelHtml.ts");
  const sandbox = {
    COMMANDS_WITHOUT_LOADING: new Set(["selectPlan", "selectExperiment", "selectLogRunKey", "openPlan", "status"]),
    TERMINAL_UI_STATUSES: new Set(["completed", "submitted", "failed", "cancelled", "stalled"]),
    SUBMITTED_RUN_COMMANDS: new Set(["runPlan", "reproducePlan", "runAllPlans"]),
    CONFIG_SAVE_COMMANDS: new Set(["saveTopologyMode", "saveHubConfig", "saveWorkerConfig", "saveSchedulerConfig", "saveProjectAdapterRules"]),
  };
  vm.createContext(sandbox);
  vm.runInContext([
    extractFunction(source, "commandNeedsLoading"),
    extractFunction(source, "isTerminalUiStatus"),
    extractFunction(source, "submittedCommandTarget"),
    extractFunction(source, "isConfigSaveCommand"),
    "this.api = { commandNeedsLoading, isTerminalUiStatus, submittedCommandTarget, isConfigSaveCommand };",
  ].join("\n"), sandbox);

  assert.equal(sandbox.api.commandNeedsLoading("status"), false);
  assert.equal(sandbox.api.commandNeedsLoading("runPlan"), true);
  assert.equal(sandbox.api.isTerminalUiStatus("STALLED"), true);
  assert.equal(sandbox.api.isTerminalUiStatus("running"), false);
  assert.equal(sandbox.api.submittedCommandTarget("runAllPlans", "submitted"), null);
  assert.equal(sandbox.api.submittedCommandTarget("restoreArchivedPlan", "completed"), null);
  assert.equal(sandbox.api.submittedCommandTarget("runPlan", "running"), null);
  assert.equal(sandbox.api.isConfigSaveCommand("saveSchedulerConfig"), true);
  assert.equal(sandbox.api.isConfigSaveCommand("runPlan"), false);

  assert.match(source, /const COMMANDS_WITHOUT_LOADING = new Set\(/);
  assert.match(source, /const TERMINAL_UI_STATUSES = new Set\(/);
  assert.match(source, /const SUBMITTED_RUN_COMMANDS = new Set\(/);
  assert.match(source, /const CONFIG_SAVE_COMMANDS = new Set\(/);
  assert.match(source, /COMMANDS_WITHOUT_LOADING\??\.has\(String\(command \|\| ""\)\)/);
  assert.match(source, /TERMINAL_UI_STATUSES\??\.has\(String\(status \|\| ""\)\.toLowerCase\(\)\)/);
  assert.doesNotMatch(source, /navigateToResourceTarget\(submittedTarget\./);
  assert.match(source, /CONFIG_SAVE_COMMANDS\??\.has\(String\(command \|\| ""\)\)/);
});

test("pending action scope selectors reuse fixed keys and data attributes", () => {
  const root = path.resolve(__dirname, "..", "..");
  const source = readSource("src/ui/PanelHtml.ts");
  const sandbox = { cssEscape: (value) => String(value) };
  vm.createContext(sandbox);
  vm.runInContext([
    extractConst(source, "PENDING_SCOPE_KEYS"),
    extractConst(source, "PENDING_SCOPE_DATA_ATTRIBUTES"),
    extractFunction(source, "pendingScopeKeys"),
    extractFunction(source, "pendingActionIsScoped"),
    extractFunction(source, "buttonHasPendingScope"),
    extractFunction(source, "pendingActionSelector"),
    extractFunction(source, "dataAttributeName"),
    "this.api = { pendingScopeKeys, pendingActionIsScoped, buttonHasPendingScope, pendingActionSelector, dataAttributeName };",
  ].join("\n"), sandbox);

  const keys = sandbox.api.pendingScopeKeys();
  assert.equal(sandbox.api.pendingScopeKeys(), keys);
  assert.equal(sandbox.api.pendingActionIsScoped({ planFile: "demo.yaml" }), true);
  assert.equal(sandbox.api.buttonHasPendingScope({ dataset: { configScope: "scheduler" } }), true);
  assert.equal(sandbox.api.pendingActionSelector({ command: "runPlan", runKey: "run-1", planFile: "demo.yaml" }), 'button[data-command="runPlan"][data-run-key="run-1"][data-plan-file="demo.yaml"]');
  assert.equal(sandbox.api.dataAttributeName("runKey"), "data-run-key");
  assert.equal(sandbox.api.dataAttributeName("clientActionId"), "data-client-action-id");
  assert.equal(sandbox.api.dataAttributeName("toString"), "data-to-string");
  assert.match(source, /const PENDING_SCOPE_KEYS = Object\.freeze\(\[/);
  assert.match(source, /const PENDING_SCOPE_DATA_ATTRIBUTES = Object\.freeze\(\{/);
  assert.doesNotMatch(extractFunction(source, "pendingScopeKeys"), /return \[/);
});
