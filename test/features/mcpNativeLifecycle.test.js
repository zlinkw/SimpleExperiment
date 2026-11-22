const {assert,fs,os,path,test}={assert:require('node:assert/strict'),fs:require('node:fs'),os:require('node:os'),path:require('node:path'),test:require('node:test')};
require('../_helpers/registerTsRequire');
const {queryProject}=require('../../src/mcp/ProjectQueries.ts');
const FAILURE_KEYS=['id','status','health_status','updated_at'];
function writeProject(root,files){for(const [name,body] of Object.entries(files)){const target=path.join(root,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,body,'utf8')}}
async function queryFixture(args,{cwd}){
 const rpc=async method=>{if(method==='tasks.list')return {tasks:[]};if(method==='operations.list')return {records:[]};if(method==='state.get')return {value:{workerTunnels:[]}};throw Error('unexpected RPC '+method)};
 const name='experiment_'+args[1],id=args[2]&&!args[2].startsWith('--')?args[2]:undefined;
 return {stdout:JSON.stringify(await queryProject(cwd,rpc,name,{id,full:args.includes('--full')}))};
}

test("MCP consumes exact native lifecycle facts and keeps completion separate from the current query", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "simple-cli-native-lifecycle-"));
  const planFile = "experiments/plans/a.yaml", verifiedAt = "2026-10-30T00:00:00.000Z", queriedAt = "2026-11-02T00:00:00.000Z";
  writeProject(dir, { "simple_cluster/experiment_index.json": JSON.stringify([
    { global_job_id: "command-a", type: "run", status: "running", worker_id: "worker-a", plan: planFile, outputDir: "work_dirs/a" },
  ]) });
  const fact = { projectId: "project-a", workflowId: "workflow-a", lifecycleProtocol: 2, index: 0, workerId: "worker-a", commandId: "command-a", planFile,
    outputDir: "work_dirs/a", expectedJobCount: 3, status: "completed", executionState: "exited", resultState: "complete", completionState: "verified", successful: true, exitCode: 0,
    lastObservedAt: verifiedAt, queryState: "unknown", verifiedCompletion: { schemaVersion: 1, identity: "bound-proof", exitCode: 0, verifiedAt }, queryError: "本轮连接失败",
    artifactSync: { state: "partial", checkedAt: verifiedAt, error: "worker-b 同步失败" } };
  let nativeFacts = [fact,
    { ...fact, index: 1, commandId: "command-b", outputDir: "work_dirs/b", completionState: "unverified", successful: false, queryState: "observed", verifiedCompletion: undefined, queryError: undefined },
    { ...fact, index: 2, commandId: "", workerId: "", status: "pending", executionState: undefined, completionState: undefined, successful: false, queryState: "local_intent", artifactSync: undefined, verifiedCompletion: undefined, queryError: undefined },
    { ...fact, projectId: "other-project", index: 3, commandId: "foreign-command" }];
  const requests = [];
  const rpc=async method=>{
    requests.push(method);
    if(method==='tasks.list')return {lifecycleProtocol:2,stateSource:'active_query',projectId:'project-a',queriedAt,jobLifecycle:nativeFacts,
      workerTasks:[{workerId:'worker-a',capabilities:{taskLifecycle:2},tasks:[{commandId:'command-a',lifecycleProtocol:2,projectId:'project-a',status:'running',planFile}]}]};
    if(method==='operations.list')return {records:[{id:'workflow-a',type:'run-plan',status:'completed',planFile,startedAt:'2026-10-29T00:00:00.000Z'}]};
    if(method==='state.get')return {value:{workerTunnels:[]}};
    throw Error('unexpected RPC '+method);
  };
  const args={cwd:dir};
  async function runCli(args){const id=args[2]&&!args[2].startsWith('--')?args[2]:undefined;return {code:0,stdout:JSON.stringify(await queryProject(dir,rpc,'experiment_'+args[1],{id,full:args.includes('--full')}))}}
  const listed = await runCli(["experiment", "list", "--json"], args);
  assert.equal(listed.code, 0, listed.stderr);
  const rows = JSON.parse(listed.stdout), completed = rows.find(row => row.native_state?.command_id === "command-a");
  assert.equal(completed?.status, "success", JSON.stringify({ rows, requests }));
  assert.equal(completed.status_source, "native_lifecycle");
  assert.equal(completed.native_state.verified_at, verifiedAt);
  assert.equal(completed.native_state.queried_at, queriedAt);
  assert.equal(completed.native_state.query_error, "本轮连接失败");
  assert.equal(completed.native_state.query_state, "unknown");
  assert.equal(completed.observation_source, "active_query");
  assert.equal(completed.native_state.sync_state, "partial");
  assert.equal(completed.native_state.sync_error, "worker-b 同步失败", "sync failure does not revoke completion");
  assert.equal(rows.find(row => row.native_state?.command_id === "command-b")?.status, "unknown", "exit without log/output verification is not clean success");
  assert.equal(rows.find(row => row.native_state?.index === 2)?.status, "pending");
  assert.equal(rows.some(row => row.native_state?.command_id === "foreign-command"), false);
  const workflow = rows.find(row => row.native_summary);
  assert.equal(workflow?.status, "unknown", "submission completion is not whole-workflow execution success");
  assert.equal(workflow.native_summary.expected_count, 3);
  assert.equal(workflow.native_summary.verified_count, 1);
  assert.equal(workflow.native_summary.query_unknown_count, 1);
  assert.equal(workflow.id, "workflow-a", "the completed submission record was actually consumed");
  const status = await runCli(["experiment", "status", completed.id, "--json"], args);
  assert.equal(status.code, 0, status.stderr);
  assert.deepEqual(JSON.parse(status.stdout).native_state, completed.native_state);
  nativeFacts = [{ ...nativeFacts[2], expectedJobCount: 1 }];
  const pending = await runCli(["experiment", "list", "--json"], args);
  assert.equal(pending.code, 0, pending.stderr);
  assert.equal(JSON.parse(pending.stdout).find(row => row.native_summary)?.status, "pending");
  nativeFacts = [{ ...fact, expectedJobCount: 2 }];
  const missing = await runCli(["experiment", "list", "--json"], args);
  assert.equal(missing.code, 0, missing.stderr);
  assert.equal(JSON.parse(missing.stdout).find(row => row.native_summary)?.native_summary.missing_count, 1);
  assert.equal(JSON.parse(missing.stdout).find(row => row.native_summary)?.status, "unknown");
  nativeFacts = [{ ...fact, expectedJobCount: 1 }];
  const confirmed = await runCli(["experiment", "list", "--json"], args);
  assert.equal(confirmed.code, 0, confirmed.stderr);
  assert.equal(JSON.parse(confirmed.stdout).find(row => row.native_summary)?.status, "success", "a failed recheck does not undo verified workflow completion");
  assert.ok(requests.includes("tasks.list"));
  assert.ok(requests.every(method => ["status", "tasks.list", "operations.list", "state.get"].includes(method)));
});

test("native success requires zero exit and complete outputs; stop intent binds the Worker", () => {
  const { applyNativeJobLifecycle } = require("../../src/mcp/query/Experiments.ts");
  const fact = { lifecycleProtocol: 2, projectId: "p", workflowId: "w", index: 0, commandId: "c", workerId: "a", planFile: "plans/a.yaml", outputDir: "work_dirs/a",
    status: "completed", completionState: "verified", resultState: "complete", successful: true, exitCode: 0, verifiedCompletion: { verifiedAt: "2026-10-30T00:00:00.000Z" }, stopIntent: { commandId: "c", workerId: "b" } };
  for (const change of [{}, { exitCode: undefined }, { exitCode: 1 }, { resultState: "unverified" }, { stopIntent: { commandId: "c", workerId: "a" } }]) {
    const rows = new Map();
    applyNativeJobLifecycle(rows, { lifecycleProtocol: 2, stateSource: "active_query", projectId: "p", jobLifecycle: [{ ...fact, ...change }] });
    const row = Array.from(rows.values()).find(row => row.native_state);
    const valid = !Object.hasOwn(change, "exitCode") && !Object.hasOwn(change, "resultState");
    assert.equal(row.status, valid ? "success" : "unknown");
    assert.equal(Boolean(row.native_state.verified_at), valid);
    assert.equal(row.native_state.stop_requested, Boolean(change.stopIntent));
  }
});

test("native lifecycle never borrows metadata from another Worker, workflow or output", () => {
  const { applyNativeJobLifecycle } = require("../../src/mcp/query/Experiments.ts");
  const fact = { lifecycleProtocol: 2, projectId: "project-a", workflowId: "workflow-a", index: 0, commandId: "command-a", workerId: "worker-a", planFile: "plans/a.yaml", outputDir: "work_dirs/a", status: "running", executionState: "running" };
  for (const mismatch of [
    { worker_id: "worker-b" }, { parent_id: "workflow-b" }, { plan: "plans/b.yaml" }, { raw: { outputDir: "work_dirs/b" } },
    { raw: { projectId: "project-b" } }, { raw: { index: 1 } }, { raw: { commandId: "old-command" } }, { raw: { collectionResultCsv: "work_dirs/other/metrics.csv" } },
  ]) {
    const previous = { id: "command-a", run_id: "command-a", worker_id: "worker-a", parent_id: "workflow-a", plan: "plans/a.yaml", raw: { outputDir: "work_dirs/a" }, progress: { epoch: 999 }, ...mismatch };
    const rows = new Map([[previous.id, previous]]);
    applyNativeJobLifecycle(rows, { lifecycleProtocol: 2, stateSource: "active_query", projectId: "project-a", jobLifecycle: [fact] });
    assert.strictEqual(rows.get(previous.id), previous, JSON.stringify(mismatch));
    const native = Array.from(rows.values()).find(row => row.native_state);
    assert.equal(native.native_state.command_id, fact.commandId);
    assert.equal(native.worker_id, fact.workerId);
    assert.equal(native.progress, null, "foreign progress was not reused");
    assert.equal(native.native_state.output_dir, fact.outputDir);
  }
  const rows = new Map();
  applyNativeJobLifecycle(rows, { lifecycleProtocol: 2, stateSource: "history", projectId: "project-a", jobLifecycle: [fact] });
  assert.equal(rows.size, 0, "historical receipts cannot pose as this round's active query");
  applyNativeJobLifecycle(rows, { lifecycleProtocol: 2, stateSource: "active_query", projectId: "project-a", jobLifecycle: [{ ...fact, projectId: "project-b" }] });
  assert.equal(rows.size, 0);
});

test("actual tasks.list reports a cold Worker query failure without revoking its saved completion", async () => {
  const ts = require("typescript"), vm = require("node:vm");
  const Q = require("../../src/features/DistributedPlanQueue.ts"), V = require("../../src/features/VerifiedCompletion.ts");
  const source = fs.readFileSync(path.join(__dirname, "../../src/extension/legacy.ts"), "utf8"), ast = ts.createSourceFile("host.ts", source, ts.ScriptTarget.Latest, true);
  let arrow;
  function visit(node) { if (ts.isPropertyAssignment(node) && node.name.getText(ast) === '"tasks.list"' && ts.isArrowFunction(node.initializer)) arrow = node.initializer; ts.forEachChild(node, visit); }
  visit(ast); assert.ok(arrow);
  const code = ts.transpileModule("function make(){return " + arrow.getText(ast) + ";} make;", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const make = vm.runInNewContext(code, { DistributedPlanQueue: Q, DistributedSchedulingPolicy: { PROGRESS_FRESHNESS_MS: 5000 }, UiCommandCancelled: Error });
  const projectRoot = path.join(os.tmpdir(), "native-query-project"), projectId = Q.canonicalProjectId(projectRoot), verifiedAt = "2026-10-30T00:00:00.000Z";
  const job = { index: 0, workerId: "worker-a", commandId: "command-a", lifecycleProtocol: 2, outputDir: "work_dirs/a", status: "completed", completionState: "verified", exitCode: 0 };
  const plan = { id: "workflow-a", projectId, planFile: "plans/a.yaml", jobs: [job] };
  job.verifiedCompletion = { schemaVersion: 1, identity: V.completionIdentity(plan, job), verifiedAt, exitCode: 0 };
  let current = true, queueReads = 0, queries = 0;
  const host = { captureProjectContext: () => ({ root: projectRoot }), projectContextIsCurrent: () => current, buildState: () => ({}),
    enabledWorkerConfigs: () => [{ id: "worker-a" }], readWorkerTaskSnapshot: async () => { queries++; return { workerId: "worker-a", tasks: [], error: "cold connection failed" }; },
    loadDistributedQueue: async selectedRoot => { assert.equal(selectedRoot, projectRoot); queueReads++; return { schemaVersion: 1, plans: [plan] }; } };
  const call = target => make.call(target)({}, null, { signal: new AbortController().signal });
  const cold = await call(host), fact = cold.jobLifecycle[0];
  assert.equal(fact.status, "completed"); assert.equal(fact.successful, true);
  assert.equal(fact.verifiedCompletion.verifiedAt, verifiedAt);
  assert.equal(fact.queryState, "unknown", "missing capabilities do not prove this round observed the completed job");
  assert.match(fact.queryError, /cold connection failed/);
  const before = queries, noTarget = await call({ ...host, enabledWorkerConfigs: () => [] });
  assert.equal(queries, before); assert.equal(noTarget.jobLifecycle[0].queryState, "not_queried");
  assert.equal(noTarget.jobLifecycle[0].successful, true);
  const at = new Date().toISOString();
  const observed = await call({ ...host, readWorkerTaskSnapshot: async () => ({ workerId: "worker-a", capabilities: { taskLifecycle: 2 }, queryComplete: true,
    controlIncomplete: true, diagnosticsPending: true, fetchedAt: at, generatedAt: at,
    tasks: [{ projectId, commandId: job.commandId, outputDir: job.outputDir, observation: { projectId, commandId: job.commandId, workerId: job.workerId, lifecycleProtocol: 2, observedAt: at,
      tmux: { windowId: "@1", paneId: "%1", dead: true, exitCode: 0 }, result: { runId: job.commandId, status: "completed", present: true, verified: true, artifactsComplete: true, exitCode: 0 },
      runtimeDiagnostics: { schemaVersion: 1, commandId: job.commandId, runId: job.commandId, state: "clear", count: 0, scanComplete: true } } }] }) });
  assert.equal(observed.jobLifecycle[0].queryState, "observed"); assert.equal(observed.jobLifecycle[0].queryError, "");
  assert.equal(observed.jobLifecycle[0].verifiedCompletion.verifiedAt, verifiedAt, "a new query does not refresh the original proof time");
  const completeSnapshot = observed.workerTasks[0];
  const partial = await call({ ...host, readWorkerTaskSnapshot: async () => ({ ...completeSnapshot, queryComplete: false }) });
  assert.equal(partial.jobLifecycle[0].queryState, "unknown", "an incomplete Worker query still stays unknown");
  const ownFailure = await call({ ...host, readWorkerTaskSnapshot: async () => ({ ...completeSnapshot,
    tasks: completeSnapshot.tasks.map(task => ({ ...task, observation: { ...task.observation, executionQueryError: 'this task query failed' } })) }) });
  assert.equal(ownFailure.jobLifecycle[0].queryState, "unknown");
  assert.match(ownFailure.jobLifecycle[0].queryError, /this task query failed/);
  const previousReads = queueReads;
  await assert.rejects(call({ ...host, readWorkerTaskSnapshot: async () => { current = false; return { workerId: "worker-a", tasks: [] }; } }), /项目已切换/);
  assert.equal(queueReads, previousReads, "a changed workspace never reads the new project's queue");
});
