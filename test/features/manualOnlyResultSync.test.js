const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
require('../_helpers/registerTsRequire');
const {resultCollectionHost}=require('../../src/extension/ResultCollectionHost.ts');
const {fixture}=require('../_helpers/freshResultHost');

const root = path.resolve(__dirname, "../..");

function clock() {
  let now = 1_000_000, next = 0;
  const timers = new Map();
  return {
    timers,
    Date: class extends Date { static now() { return now; } },
    setTimeout(callback, ms) { timers.set(++next, { callback, at: now + ms }); return next; },
    clearTimeout(id) { timers.delete(id); },
    advance(ms) {
      const end = now + ms;
      for (;;) {
        const entry = [...timers].filter(([, row]) => row.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!entry) break;
        now = entry[1].at; timers.delete(entry[0]); entry[1].callback();
      }
      now = end;
    },
  };
}

function selectedMethods(names, globals = {}) {
  const source = fs.readFileSync(path.join(root, "src/extension/legacy.ts"), "utf8");
  const ast = ts.createSourceFile("provider.ts", source, ts.ScriptTarget.Latest, true);
  const provider = ast.statements.find((node) => ts.isClassDeclaration(node) && node.name.text === "RealtimeTunnelPanelProvider");
  const selected = new Set(names);
  const members = provider.members.filter((node) => node.name && selected.has(node.name.getText(ast)));
  const code = ts.transpileModule("class Subject {\n" + members.map((node) => node.getText(ast)).join("\n") + "\n}", {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const sandbox = {
    resultCollectionHost,
    workspaceRoot: () => "/project",
    errorMessage: (error) => String(error?.message || error),
    assertRetryRequestCurrent: () => undefined,
    retryRequestSignal: () => undefined,
    completedResultPlanFiles: async () => [],
    vscode: { ProgressLocation: { Notification: 1 }, window: {
      showInformationMessage: async () => {},
      withProgress: async (_options, work) => work({ report() {} }, { isCancellationRequested: false }),
    } },
    ...globals,
  };
  vm.runInNewContext(code + "\nthis.Subject = Subject;", sandbox);
  return new sandbox.Subject();
}

test('current PLAN update invokes a real full-table refresh while scoped API reads stay separate',async()=>{
  const provider=selectedMethods(['syncAllResultArtifactsFromUi'],{stringField:(message,key)=>message[key]});
  const calls=[];provider.resolveSelectedPlanFile=value=>value;
  provider.rebuildProjectResultTablesFromUi=async options=>{calls.push(options);return{exported:true};};
  assert.equal((await provider.syncAllResultArtifactsFromUi({planFile:'experiments/plans/a.yaml'})).exported,true);
  assert.equal(calls.length,1);assert.equal(calls[0].planFiles,undefined);assert.match(calls[0].title,/更新结果总表/);
  provider.resolveSelectedPlanFile=()=>'';
  await assert.rejects(provider.syncAllResultArtifactsFromUi({}),/无法确认/);assert.equal(calls.length,1);
});

test('already cancelled result refresh is a normal receipt and never starts a server query',async()=>{
 const f=fixture(),notices=[];
 const provider=selectedMethods(['rebuildProjectResultTablesFromUi'],{AbortController,vscode:{ProgressLocation:{Notification:1},window:{
  withProgress:async(_options,run)=>run({report(){}},{isCancellationRequested:true,onCancellationRequested:()=>({dispose(){}})}),
  showInformationMessage:text=>notices.push(text),showWarningMessage:()=>assert.fail('cancellation is not a query failure')
 }}});
 const result=await provider.rebuildProjectResultTablesFromUi.call(f.host);
 assert.equal(result.status,'cancelled');assert.equal(f.calls.length,0);assert.match(notices[0],/已取消/);
});

function distributedHost() {
  const calls = [];
  const provider = selectedMethods(["scheduleDistributedPostprocess", "postprocessDistributedResultsForManual", "syncPendingResultMetricsFromUi"]);
  provider.calls = calls;
  provider.distributedPostprocessPromise = undefined;
  provider.loadDistributedQueue = async () => ({ plans: [{ planFile: "experiments/plans/a.yaml" }] });
  provider.syncDistributedJobArtifacts = async (_root, _queue, phase) => {
    calls.push(`artifacts:${phase}`);
    if (phase === "fragments") throw new Error("historical Plan has no fragment inventory");
  };
  provider.rebuildDistributedResults = async (_root, _queue, preview) => {
    calls.push(preview ? "rebuild:preview" : "rebuild:published");
    if (preview) throw new Error("optional preview unavailable");
  };
  provider.recordActionError = (entry) => calls.push(`warning:${entry.command}`);
  provider.postState = () => calls.push("state");
  provider.captureProjectContext = () => ({ root: "/project", generation: 1 });
  provider.projectContextIsCurrent = () => true;
  provider.client = {};
  provider.effectiveConnectionMode = () => "tunnel";
  provider.lastWorkerProbes = {};
  provider.workerCodeSyncTargets = () => [{ id: "worker-a" }];
  provider.refreshDistributedResultSyncProbes = async () => { provider.lastWorkerProbes = { "worker-a": { status: "ok" } }; };
  provider.refreshLocalPlanMetadataForAction = async () => {};
  provider.loadPlanSyncLedger = async () => ({ schemaVersion: 2, entries: {} });
  provider.queuePlanArtifactSyncStatusCheck = force => { assert.equal(force, true); calls.push("sync-check"); };
  provider.rebuildProjectResultTablesFromUi = async options => { calls.push("local-tables"); return options; };
  return provider;
}

test("background Worker mirroring keeps local result parsing and publication manual", async () => {
  const calls = [];
  const provider = selectedMethods(["scheduleDistributedPostprocess", "queuePlanScopedResultParse", "queueCompletedPlanArtifactSync"]);
  provider.distributedPostprocessPromise = undefined;
  provider.syncDistributedJobArtifacts = async () => calls.push("transfer");
  provider.rebuildDistributedResults = async () => calls.push("rebuild");
  provider.runActionCommand = async () => calls.push("parse");
  provider.isRealtimeMode = () => true;
  provider.projectTopologyAssessment = () => ({ mode: "worker_pool" });
  provider.captureProjectContext = () => ({ root: "/project" });
  provider.projectContextIsCurrent = () => true;
  provider.syncCompletedPlanArtifacts = async () => calls.push("worker-mirror");
  provider.queuePlanArtifactSyncStatusCheck = () => {};
  provider.postState = () => {};
  provider.scheduleDistributedPostprocess("/project", true);
  provider.queuePlanScopedResultParse("plan selected", "experiments/plans/a.yaml", "a");
  await provider.queueCompletedPlanArtifactSync({ status: "completed" });
  await provider.distributedPostprocessPromise;
  assert.ok(calls.every(call => call === "worker-mirror"));
});

test("manual result sync directly downloads metrics and publishes local tables without remote rebuild or full mirroring", async () => {
  const provider = distributedHost();
  const result = await provider.syncPendingResultMetricsFromUi({ planFiles: ["experiments/plans/a.yaml"] });
  assert.equal(result.title, undefined, "the current result entry forwards user options without injecting a retired workflow");
  assert.deepEqual(Array.from(result.planFiles), ["experiments/plans/a.yaml"]);
  assert.deepEqual(provider.calls, ["local-tables"]);
});

test("explicit full artifact sync mirrors fragments, checkpoints and logs without remotely rebuilding results", async () => {
  const provider = distributedHost();
  provider.syncDistributedJobArtifacts = async (_root, _queue, phase) => provider.calls.push(`artifacts:${phase}`);
  provider.rebuildDistributedResults = async (_root, _queue, preview) => provider.calls.push(preview ? "rebuild:preview" : "rebuild:published");
  await provider.postprocessDistributedResultsForManual("/project", "full");
  assert.deepEqual(provider.calls, [
    "artifacts:fragments", "artifacts:bulk", "state", "sync-check",
  ]);
});

test("background metrics collection reads verified artifacts in memory without the manual full-transfer route", async () => {
  const f=fixture(),provider=Object.assign(selectedMethods(["syncPendingResultMetricsFromUi"]),f.host);
  provider.rebuildProjectResultTablesFromUi=()=>assert.fail("background query must not enter the manual full-transfer UI");
  const report=await provider.syncPendingResultMetricsFromUi({background:true});
  assert.equal(report.source,"active_query");assert.equal(report.completed,1);
  const transfers=f.calls.filter(row=>row[0]==="sync.downloadMappedPaths");assert.equal(transfers.length,1);
  assert.equal(transfers[0][1].memoryOnly,true);assert.equal(transfers[0][1].metricsOnly,true);
  assert.equal(fs.existsSync(path.join(f.root,"work_dirs")),false,"raw artifacts cannot be downloaded to the local project");
});

test("concurrent manual summary refreshes share one active collection without a duplicate transfer", async () => {
  const f=fixture();let release;f.block(new Promise(resolve=>release=resolve));
  const provider=Object.assign(selectedMethods(["refreshResultsSummary"]),f.host,{
    effectiveConnectionMode:()=>"tunnel",recordActionError:error=>assert.fail(error.message)});
  const first=provider.refreshResultsSummary(),second=provider.refreshResultsSummary();
  await new Promise(setImmediate);assert.equal(f.calls.filter(row=>row[0]==="tasks").length,1);
  release();await Promise.all([first,second]);
  assert.equal(f.calls.filter(row=>row[0]==="tasks").length,2,"one discovery plus one fresh declared-result query");
  assert.equal(f.calls.filter(row=>row[0]==="sync.downloadMappedPaths").length,1);
  assert.equal(provider.resultsSummary.completed,1);
});

test("an explicit refresh after a failed query starts a fresh collection and cannot reuse cached metrics", async () => {
  const f=fixture(),provider=Object.assign(selectedMethods(["refreshResultsSummary"]),f.host,{effectiveConnectionMode:()=>"tunnel"});
  f.offline(true);await provider.refreshResultsSummary();
  assert.equal(provider.resultsSummary.results.length,0);assert.ok(provider.resultsSummary.skipped.length>0);
  const before=f.calls.length;f.offline(false);await provider.refreshResultsSummary();
  assert.equal(provider.resultsSummary.completed,1);assert.equal(provider.resultsSummary.results.length,1);
  assert.ok(f.calls.length>before);assert.equal(f.calls.filter(row=>row[0]==="sync.downloadMappedPaths").length,1);
});
