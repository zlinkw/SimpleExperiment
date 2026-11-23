const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
require('../_helpers/registerTsRequire');
const {queryProject}=require('../../src/mcp/ProjectQueries.ts');

test('MCP health and inspect use Worker output activity to identify a stalled run',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'g004-mcp-health-')),now=Date.now();
 fs.mkdirSync(path.join(root,'simple_cluster'));
 const updated=new Date(now-1000).toISOString();
 fs.writeFileSync(path.join(root,'simple_cluster','experiment_index.json'),JSON.stringify([{
  global_job_id:'run-stalled',type:'worker_run',status:'running',stage:'train_test',
  started_at:new Date(now-60*60*1000).toISOString(),updated,
  runtimeActivityAt:new Date(now-40*60*1000).toISOString(),progress:{epoch:4,max_epoch:10,percent:40}
 }]),'utf8');
 const rpc=async method=>{
  if(method==='tasks.list')return {tasks:[]};if(method==='operations.list')return {records:[]};
  if(method==='state.get')return {value:{workerTunnels:[]}};if(method==='live.output')throw Object.assign(Error('method not found'),{apiCode:-32601});throw Error('unexpected RPC '+method);
 };
 const health=await queryProject(root,rpc,'experiment_health',{full:true});
 assert.equal(health.health.status,'warning');assert.equal(health.health.reason,'stalled');
 assert.equal(health.alerts.stalled,true);assert.equal(health.alerts.missing_progress,false);
 assert.match(health.alerts.alert_details.find(item=>item.type==='stalled').message,/output has not changed/);
 const overview=await queryProject(root,rpc,'experiment_overview',{full:true});
 assert.deepEqual(overview.alerts.stalled.map(row=>row.id),['run-stalled']);
 const inspect=await queryProject(root,rpc,'experiment_inspect',{id:'run-stalled',full:true});
 assert.deepEqual(inspect.health,{status:'warning',reason:'stalled'});
 assert.equal(inspect.alerts.stalled,true);assert.ok(inspect.diagnosis.stale_seconds>=30*60);
 assert.equal(inspect.status.updated_at,updated);
 const normalHealth=await queryProject(root,rpc,'experiment_health',{});
 assert.equal(normalHealth.health.status,'warning');assert.equal(normalHealth.health.reason,'stalled');
 assert.equal(normalHealth.alerts.stalled,true);assert.equal(normalHealth.alerts.missing_progress,false);
 assert.match(normalHealth.alerts.alert_details.find(item=>item.type==='stalled').message,/output has not changed/);
 assert.deepEqual((await queryProject(root,rpc,'experiment_overview',{})).alerts.stalled.map(row=>row.id),['run-stalled']);
 const normalInspect=await queryProject(root,rpc,'experiment_inspect',{id:'run-stalled'});
 assert.deepEqual(normalInspect.health,{status:'warning',reason:'stalled'});assert.equal(normalInspect.alerts.stalled,true);
 assert.ok(normalInspect.diagnosis.stale_seconds>=30*60);assert.equal(normalInspect.status.updated_at,updated);
});

test('MCP health distinguishes active and successful retries from the failed attempt',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'g004-mcp-retry-'));
 fs.mkdirSync(path.join(root,'simple_cluster'));const index=path.join(root,'simple_cluster','experiment_index.json'),now=Date.now();
 const old={global_job_id:'run0-old',type:'worker_run',plan:'p.yaml',experiment_case:'A',seed:'42',status:'failed',updated:new Date(now-60*60*1000).toISOString()};
 const newer={global_job_id:'run0-new',type:'worker_run',plan:'p.yaml',experiment_case:'A',seed:'42',status:'running',created:new Date(now-5*60*1000).toISOString(),updated:new Date(now).toISOString(),stage:'branch'};
 fs.writeFileSync(index,JSON.stringify([old,newer]),'utf8');
 const rpc=async method=>{
  if(method==='tasks.list')return {tasks:[]};if(method==='operations.list')return {records:[]};
  if(method==='state.get')return {value:{workerTunnels:[]}};if(method==='live.output')throw Object.assign(Error('method not found'),{apiCode:-32601});throw Error('unexpected RPC '+method);
 };
 const query=(name,args={})=>queryProject(root,rpc,'experiment_'+name,{...args,full:true});
 const normal=(name,args={})=>queryProject(root,rpc,'experiment_'+name,args);
 const health=await query('health');assert.deepEqual(health.health,{status:'warning',reason:'failed_recent',alert_level:'warning'});
 assert.equal(health.alerts.recent_failure,true);
 assert.match(health.alerts.alert_details.find(item=>item.type==='recent_failure').message,/1 experiment identity has newer running retries/);
 const overview=await query('overview');assert.equal(overview.alerts.failed_recent[0].id,old.global_job_id);
 assert.deepEqual(overview.health,{status:'warning',reason:'failed_recent'});
 assert.deepEqual((await query('inspect',{id:old.global_job_id})).health,{status:'error',reason:'failed_recent'});
 const normalHealth=await normal('health');assert.deepEqual(normalHealth.health,{status:'warning',reason:'failed_recent',alert_level:'warning'});
 assert.equal(normalHealth.alerts.recent_failure,true);
 assert.match(normalHealth.alerts.alert_details.find(item=>item.type==='recent_failure').message,/1 experiment identity has newer running retries/);
 const normalOverview=await normal('overview');assert.equal(normalOverview.alerts.failed_recent[0].id,old.global_job_id);
 assert.deepEqual(normalOverview.health,{status:'warning',reason:'failed_recent'});
 assert.deepEqual((await normal('inspect',{id:old.global_job_id})).health,{status:'error',reason:'failed_recent'});
 fs.writeFileSync(index,JSON.stringify([old,{...newer,status:'success'}]),'utf8');
 const success=await query('health');assert.deepEqual(success.health,{status:'healthy',reason:'',alert_level:'ok'});assert.equal(success.alerts.recent_failure,false);
 const after=await query('overview');assert.deepEqual(after.alerts.failed_recent,[]);
 assert.equal(after.summary.recent_failures[0].id,old.global_job_id);assert.deepEqual(after.health,{status:'healthy',reason:''});
 assert.equal((await query('summary')).recent_failures[0].id,old.global_job_id);
 const inspect=await query('inspect',{id:old.global_job_id});assert.deepEqual(inspect.health,{status:'error',reason:'failed_recent'});assert.equal(inspect.alerts.recent_failure,true);
 const normalSuccess=await normal('health');assert.deepEqual(normalSuccess.health,{status:'healthy',reason:'',alert_level:'ok'});assert.equal(normalSuccess.alerts.recent_failure,false);
 const normalAfter=await normal('overview');assert.deepEqual(normalAfter.alerts.failed_recent,[]);assert.equal(normalAfter.summary.recent_failures[0].id,old.global_job_id);
 assert.deepEqual(normalAfter.health,{status:'healthy',reason:''});assert.equal((await normal('summary')).recent_failures[0].id,old.global_job_id);
 const normalOld=await normal('inspect',{id:old.global_job_id});assert.deepEqual(normalOld.health,{status:'error',reason:'failed_recent'});assert.equal(normalOld.alerts.recent_failure,true);
});

test("stalled uses Worker output activity before CLI observation time", () => {
  const { isStalled } = require("../../src/mcp/query/Experiments.ts");
  const now = Date.parse("2026-09-24T12:00:00Z");
  assert.equal(isStalled({ status: "running", updated: "2026-09-24T10:00:00Z", raw: { runtimeActivityAt: "2026-09-24T11:45:00Z" } }, now), false);
  assert.equal(isStalled({ status: "running", updated: "2026-09-24T11:59:59Z", raw: { runtimeActivityAt: "2026-09-24T11:20:00Z" } }, now), true);
  assert.equal(isStalled({ status: "success", updated: "2020-01-01T00:00:00Z", raw: { runtimeActivityAt: "2020-01-01T00:00:00Z" } }, now), false);
  assert.equal(isStalled({ status: "running", updated: "2026-09-24T11:20:00Z", raw: {} }, now), true);
});


test("aggregate workflow failures do not duplicate their worker failures", () => {
  const { classifyRecentFailures, buildHealthSummary } = require("../../src/mcp/query/Experiments.ts");
  const now = Date.parse("2026-09-23T11:00:00Z");
  const workflow = { id: "wf-1", type: "workflow", status: "failed", status_source: "aggregate", plan: "p.yaml", updated: "2026-09-23T10:00:00Z" };
  const worker = { id: "worker-1", type: "worker_run", parent_id: "wf-1", status: "failed", plan: "p.yaml", updated: "2026-09-23T10:05:00Z" };
  assert.deepEqual(classifyRecentFailures([workflow, worker], now).unresolved, [worker]);
  assert.deepEqual(buildHealthSummary([workflow, worker], now), { status: "error", reason: "failed_recent" });
  assert.deepEqual(classifyRecentFailures([workflow], now).unresolved, [workflow]);
  assert.deepEqual(buildHealthSummary([workflow], now), { status: "error", reason: "failed_recent" });
});


test("independent scheduler workflow failures remain in recent failures", () => {
  const { classifyRecentFailures, buildHealthSummary } = require("../../src/mcp/query/Experiments.ts");
  const now = Date.parse("2026-09-23T11:00:00Z");
  for (const status_source of ["scheduler", "unknown"]) {
    const workflow = { id: "wf-scheduler-failed", type: "workflow", status: "failed", status_source, plan: "p.yaml", updated: "2026-09-23T10:00:00Z" };
    assert.deepEqual(classifyRecentFailures([workflow], now).unresolved, [workflow]);
    assert.deepEqual(buildHealthSummary([workflow], now), { status: "error", reason: "failed_recent" });
  }
});


test("recent worker failures use only the latest matching attempt", () => {
  const { classifyRecentFailures, buildHealthSummary, recentFailureRecoveryState } = require("../../src/mcp/query/Experiments.ts");
  const now = Date.parse("2026-09-23T11:00:00Z");
  const failure = { id: "old", type: "worker_run", plan: "plans\\p.yaml", experiment_case: "A", seed: "42", status: "failed", updated: "2026-09-23T10:00:00Z" };
  const retry = { id: "new", type: "worker_run", plan: "plans/p.yaml", experiment_case: "A", seed: "42", status: "running", created: "2026-09-23T10:05:00Z", updated: "2026-09-23T10:06:00Z" };
  const classify = (rows) => classifyRecentFailures(rows, now);
  assert.equal(recentFailureRecoveryState(failure, [failure, retry], now), "running_retry");
  assert.deepEqual(classify([failure, retry]).unresolved, []);
  assert.deepEqual(classify([failure, retry]).running_retry, [failure]);
  assert.deepEqual(buildHealthSummary([failure, retry], now), { status: "warning", reason: "failed_recent" });
  const success = { ...retry, status: "success" };
  assert.deepEqual(classify([failure, success]).resolved, [failure]);
  assert.deepEqual(buildHealthSummary([failure, success], now), { status: "healthy", reason: "" });
  const failedAgain = { ...retry, id: "newest", status: "failed", created: "2026-09-23T10:10:00Z", updated: "2026-09-23T10:11:00Z" };
  assert.equal(recentFailureRecoveryState(failure, [failure, success, failedAgain], now), "unresolved");
  assert.equal(classify([failure, success, failedAgain]).unresolved.length, 2);
  for (const changed of [{ seed: "43" }, { experiment_case: "B" }, { plan: "plans/other.yaml" }]) {
    assert.equal(recentFailureRecoveryState(failure, [failure, { ...retry, ...changed }], now), "unresolved");
  }
  for (const missing of [{ experiment_case: "" }, { seed: "" }]) {
    assert.equal(recentFailureRecoveryState({ ...failure, ...missing }, [{ ...failure, ...missing }, retry], now), "unresolved");
  }
});
