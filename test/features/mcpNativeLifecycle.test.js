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
