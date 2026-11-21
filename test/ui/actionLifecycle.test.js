const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { readSource } = require("../_helpers/sourceReader");

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

test("flow updates report persistence failure instead of claiming success", async () => {
  const ts=require('typescript'), source=fs.readFileSync(path.resolve(__dirname,'../../src/extension/legacy.ts'),'utf8');
  const ast=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS); let method;
  const visit=node=>{if(ts.isMethodDeclaration(node)&&node.name.getText(ast)==='apiFlowUpdate')method=node.getText(ast);ts.forEachChild(node,visit)};visit(ast);
  assert.ok(method); const sandbox={ApiWorkflow_1:{advanceFlowStep:(_state,step,patch)=>({step,...patch}),nextFlowStep:()=> 'next'}};
  vm.runInNewContext(ts.transpileModule('class Host {'+method+'}; this.Host=Host;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
  const host=new sandbox.Host();host.apiFlowState={};host.postState=()=>{};host.persistProjectFlowState=async()=>{throw new Error('save failed')};
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
  const h=new sandbox.Host();h.apiFlowState=workflow.defaultFlowState();h.persistProjectFlowState=async()=>true;h.postState=()=>{};
  await h.apiFlowUpdate({step:'select_servers',blocked:true});let r=await h.apiFlowUpdate({step:'select_servers',completed:true});
  assert.equal(r.flow.steps.select_servers.blocked,false);assert.equal(r.flow.steps.select_servers.completed,true);assert.equal(r.nextStep,'select_mode');
  r=await h.apiFlowUpdate({step:'select_servers',completed:false});assert.equal(r.flow.steps.select_servers.completed,false);assert.equal(r.nextStep,'select_servers');
  const readback=await h.apiFlowGet();assert.equal(readback.flow.steps.select_servers.completed,false);assert.equal(readback.nextStep,'select_servers');
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
  const h=new sandbox.Host();h.requireDraftRecord=async()=>({draftPlanPath:'tmp/plan/one.yaml',status:'draft'});
  h.withDraftMetadataLease=async(_root,work)=>work();h.refreshDraftPlans=async()=>{h.draftPlanState={drafts:[{draftPlanPath:'tmp/plan/one.yaml',status:'draft'}],error:''}};
  const result=await h.apiDraftReview({draftPlanPath:'tmp/plan/one.yaml'});assert.equal(result.status,'draft');
});

test("draft lookup does not use stale records after a refresh failure", async () => {
  const ts=require('typescript'),source=fs.readFileSync(path.resolve(__dirname,'../../src/extension/legacy.ts'),'utf8');
  const ast=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);let method;
  const visit=node=>{if(ts.isMethodDeclaration(node)&&node.name.getText(ast)==='requireDraftRecord')method=node.getText(ast);ts.forEachChild(node,visit)};visit(ast);
  const sandbox={sameProjectRelativePath:(a,b)=>a===b};
  vm.runInNewContext(ts.transpileModule('class Host {'+method+'};this.Host=Host;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
  const host=new sandbox.Host();host.draftPlanState={drafts:[{draftPlanPath:'tmp/plan/a.yaml'}],error:''};
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
  const host=new sandbox.Host();host.requireDraftRecord=async file=>({draftPlanPath:file});host.withDraftMetadataLease=async(_root,fn)=>fn();host.refreshDraftPlans=async()=>{};
  const result=await host.apiDraftReject({draftPlanPath:'tmp/plan/a.yaml',reviewedBy:'reviewer'});
  assert.equal(result.draftPlanPath,'tmp/plan/a.yaml');assert.equal(records['tmp/plan/a.yaml'].status,'rejected');assert.equal(records['tmp/plan/a.yaml'].reviewedBy,'reviewer');assert.equal(records['tmp/plan/b.yaml'].status,'draft');
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
