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
  if(method==='state.get')return {value:{workerTunnels:[]}};throw Error('unexpected RPC '+method);
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
});

test('MCP health distinguishes active and successful retries from the failed attempt',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'g004-mcp-retry-'));
 fs.mkdirSync(path.join(root,'simple_cluster'));const index=path.join(root,'simple_cluster','experiment_index.json'),now=Date.now();
 const old={global_job_id:'run0-old',type:'worker_run',plan:'p.yaml',experiment_case:'A',seed:'42',status:'failed',updated:new Date(now-60*60*1000).toISOString()};
 const newer={global_job_id:'run0-new',type:'worker_run',plan:'p.yaml',experiment_case:'A',seed:'42',status:'running',created:new Date(now-5*60*1000).toISOString(),updated:new Date(now).toISOString(),stage:'branch'};
 fs.writeFileSync(index,JSON.stringify([old,newer]),'utf8');
 const rpc=async method=>{
  if(method==='tasks.list')return {tasks:[]};if(method==='operations.list')return {records:[]};
  if(method==='state.get')return {value:{workerTunnels:[]}};throw Error('unexpected RPC '+method);
 };
 const query=(name,args={})=>queryProject(root,rpc,'experiment_'+name,{...args,full:true});
 const health=await query('health');assert.deepEqual(health.health,{status:'warning',reason:'failed_recent',alert_level:'warning'});
 assert.equal(health.alerts.recent_failure,true);
 assert.match(health.alerts.alert_details.find(item=>item.type==='recent_failure').message,/1 experiment identity has newer running retries/);
 const overview=await query('overview');assert.equal(overview.alerts.failed_recent[0].id,old.global_job_id);
 assert.deepEqual(overview.health,{status:'warning',reason:'failed_recent'});
 assert.deepEqual((await query('inspect',{id:old.global_job_id})).health,{status:'error',reason:'failed_recent'});
 fs.writeFileSync(index,JSON.stringify([old,{...newer,status:'success'}]),'utf8');
 const success=await query('health');assert.deepEqual(success.health,{status:'healthy',reason:'',alert_level:'ok'});assert.equal(success.alerts.recent_failure,false);
 const after=await query('overview');assert.deepEqual(after.alerts.failed_recent,[]);
 assert.equal(after.summary.recent_failures[0].id,old.global_job_id);assert.deepEqual(after.health,{status:'healthy',reason:''});
 assert.equal((await query('summary')).recent_failures[0].id,old.global_job_id);
 const inspect=await query('inspect',{id:old.global_job_id});assert.deepEqual(inspect.health,{status:'error',reason:'failed_recent'});assert.equal(inspect.alerts.recent_failure,true);
});
