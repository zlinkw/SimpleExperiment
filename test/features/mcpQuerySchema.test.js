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

test("runtime progress and training messages stay consistent", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "simple-cli-runtime-consistency-"));
  writeProject(dir, {
    "experiments/runs/run-1789994720003/stdout.log": [
      "base_config: configs/base.yaml",
      "python -m train --config plan.yaml",
      "cut_lr: 0.1",
      "gate_l2: 0.01",
      "2026-03-01T00:00:00Z INFO epoch 4/10 batch 12 loss 0.31",
    ].join("\n"),
    "simple_cluster/experiment_index.json": JSON.stringify([
      {
        global_job_id: "run-1789994720003",
        type: "run",
        status: "running",
        stage: "run",
        updated: new Date().toISOString(),
        stdout: "experiments/runs/run-1789994720003/stdout.log",
        progress: { epoch: 4, max_epoch: 10, percent: 40, loss: 0.31 },
      },
    ], null, 2),
  });
  const args = { cwd: dir };
  const active = JSON.parse((await queryFixture(["experiment", "active", "--json"], args)).stdout);
  const inspected = JSON.parse((await queryFixture(["experiment", "inspect", "run-1789994720003", "--json"], args)).stdout);
  const monitor = JSON.parse((await queryFixture(["experiment", "monitor", "run-1789994720003", "--json"], args)).stdout);
  assert.notEqual(active.runs[0].progress, null);
  assert.deepEqual(Object.keys(active.runs[0].progress).sort(), ["epoch", "loss", "max_epoch", "percent", "updated_at"]);
  assert.deepEqual(inspected.progress, active.runs[0].progress);
  assert.equal(inspected.diagnosis.latest_message, monitor.latest_message);
  assert.match(inspected.diagnosis.latest_message, /loss 0\.31/);
  assert.doesNotMatch(inspected.diagnosis.latest_message, /yaml|config|python\s+-m|gate_l2/i);
});

test("agent json apis share schema version 1", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "simple-cli-agent-schema-"));
  const updated = new Date().toISOString();
  writeProject(dir, {
    "simple_cluster/experiment_index.json": JSON.stringify([
      { global_job_id: "run-1789994720003", type: "run", status: "running", stage: "run", updated, progress: { epoch: 4, loss: 0.31 } },
    ], null, 2),
  });
  const args = { cwd: dir };
  const active = JSON.parse((await queryFixture(["experiment", "active", "--json"], args)).stdout);
  const health = JSON.parse((await queryFixture(["experiment", "health", "--json"], args)).stdout);
  const overview = JSON.parse((await queryFixture(["experiment", "overview", "--json"], args)).stdout);
  const inspected = JSON.parse((await queryFixture(["experiment", "inspect", "run-1789994720003", "--json"], args)).stdout);
  for (const payload of [active, health, overview, inspected]) assert.equal(payload.schema_version, "1");
  assert.match(active.runs[0].updated_at, /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(Object.keys(health.snapshot).sort(), ["runtime_source", "runtime_version", "snapshot_id", "snapshot_time"]);
  assert.match(String(health.snapshot.snapshot_id), /^\d+$/);
  assert.match(overview.snapshot.snapshot_time, /^\d{4}-\d{2}-\d{2}T/);
  for (const payload of [active, health, overview, inspected]) {
    for (const key of ["snapshot_id", "snapshot_time", "runtime_version"]) assert.equal(key in payload.snapshot, true, key);
  }
  assert.deepEqual(Object.keys(inspected).sort(), ["alerts", "diagnosis", "health", "progress", "schema_version", "snapshot", "status", "summary"]);
  assert.equal("failure_context" in inspected.diagnosis, false);
});

test("agent json schema version 1 stays frozen", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "simple-cli-schema-frozen-"));
  const failedDir = fs.mkdtempSync(path.join(os.tmpdir(), "simple-cli-schema-failed-"));
  const updated = new Date().toISOString();
  writeProject(dir, {
    "simple_cluster/experiment_index.json": JSON.stringify([
      { global_job_id: "run-1789994720003", type: "run", status: "running", stage: "run", case: "case-a", seed: "7", updated, progress: { epoch: 4, loss: 0.31 } },
    ], null, 2),
  });
  writeProject(failedDir, {
    "experiments/runs/run-bad/stdout.log": "2026-03-01T00:00:00Z ERROR CUDA out of memory\n",
    "simple_cluster/experiment_index.json": JSON.stringify([
      { global_job_id: "run-bad", type: "run", status: "failed", stage: "run", worker_id: "worker-a", updated, stdout: "experiments/runs/run-bad/stdout.log" },
    ], null, 2),
  });
  const running = { cwd: dir };
  const active = JSON.parse((await queryFixture(["experiment", "active", "--json"], running)).stdout);
  const health = JSON.parse((await queryFixture(["experiment", "health", "--json"], running)).stdout);
  const overview = JSON.parse((await queryFixture(["experiment", "overview", "--json"], running)).stdout);
  const inspected = JSON.parse((await queryFixture(["experiment", "inspect", "run-1789994720003", "--json"], running)).stdout);
  for (const payload of [active, health, overview, inspected]) assert.equal(payload.schema_version, "1");
  assert.deepEqual(Object.keys(active).sort(), ["active_count", "runs", "schema_version", "snapshot", "workflows"]);
  assert.deepEqual(Object.keys(health).sort(), ["alerts", "health", "schema_version", "snapshot"]);
  assert.deepEqual(Object.keys(overview).sort(), ["active", "alerts", "health", "schema_version", "snapshot", "summary"]);
  assert.deepEqual(Object.keys(inspected).sort(), ["alerts", "diagnosis", "health", "progress", "schema_version", "snapshot", "status", "summary"]);
  for (const payload of [active, health, overview, inspected]) {
    assert.deepEqual(Object.keys(payload.snapshot).sort(), ["runtime_source", "runtime_version", "snapshot_id", "snapshot_time"]);
  }
  assert.deepEqual(Object.keys(health.health).sort(), ["alert_level", "reason", "status"]);
  assert.equal(health.health.alert_level, "ok");
  assert.deepEqual(Object.keys(overview.health).sort(), ["reason", "status"]);
  assert.equal("alert_level" in inspected.health, false);
  assert.equal("failure_context" in inspected.diagnosis, false);
  assert.deepEqual(Object.keys(active.runs[0]).sort(), ["experiment_case", "gpu", "id", "progress", "seed", "stage", "updated_at", "worker"]);
  const failed = JSON.parse((await queryFixture(["experiment", "inspect", "run-bad", "--json"], { cwd: failedDir })).stdout);
  assert.equal(failed.schema_version, "1");
  assert.deepEqual(Object.keys(failed.diagnosis.failure_context).sort(), ["last_error", "stage", "worker"]);
  assert.match(failed.diagnosis.failure_context.last_error, /out of memory/i);
  assert.ok(failed.diagnosis.failure_context.last_error.length <= 300);
  assert.equal(failed.diagnosis.failure_context.stage, "run");
  assert.deepEqual(failed.diagnosis.failure_context.worker, { id: "worker-a" });
});

test('MCP experiment references preserve aliases and missing identity detail',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g004-mcp-reference-'));
 writeProject(dir,{'simple_cluster/experiment_index.json':JSON.stringify([
  {global_job_id:'exp-1',run_id:'run-9001',runtimeRunId:'run-stale-alias',id:'raw-1',case:'case-a',tmux:'simple:run-9001',type:'run',status:'running',stage:'run',updated:new Date().toISOString()},
  {global_job_id:'exp-2',type:'run',status:'success',stage:'run',updated:'2026-01-01T00:00:00Z'}
 ])});
 const rpc=async method=>{if(method==='tasks.list')return {tasks:[]};if(method==='operations.list')return {records:[]};if(method==='state.get')return {value:{workerTunnels:[]}};throw Error('unexpected RPC '+method)};
 for(const id of ['exp-1','run-9001','run-stale-alias','case-a','raw-1','simple:run-9001']){
  const result=await queryProject(dir,rpc,'experiment_inspect',{id});assert.equal(result.summary.id,'exp-1',id);
 }
 for(const name of ['status','monitor','diagnose'])assert.equal((await queryProject(dir,rpc,'experiment_'+name,{id:'run-9001'})).id,'exp-1',name);
 await assert.rejects(queryProject(dir,rpc,'experiment_inspect',{id:'does-not-exist'}),error=>{
  assert.equal(error.code,'BUSINESS');const detail=JSON.parse(error.detail);
  assert.equal(detail.requested,'does-not-exist');assert.deepEqual(detail.candidates,['exp-1','exp-2']);assert.ok(detail.candidates.length<=5);return true;
 });
 const active=await queryProject(dir,rpc,'experiment_active',{});
 assert.ok(active.runs.length>0);
 for(const run of active.runs)assert.equal((await queryProject(dir,rpc,'experiment_inspect',{id:run.id})).summary.id,run.id);
 await assert.rejects(queryProject(dir,rpc,'experiment_inspect',{id:'run-000'}),error=>{
  const detail=JSON.parse(error.detail);assert.equal(detail.requested,'run-000');
  assert.deepEqual(detail.searched_sources,['current_rows','runtime_history','experiment_index','runtime_observation']);assert.ok(detail.candidates.length<=5);return true;
 });
});
