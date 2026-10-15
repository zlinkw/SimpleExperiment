const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawnSync}=require('node:child_process');
require('../_helpers/registerTsRequire');
test('real foreground CPU commands expose callback exceptions through Scheduler manifest, Agent pull and client lifecycle',()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'simpleex-runtime-anomaly-'));
 const agent=path.join(folder,'agent.py'),scheduler=path.join(folder,'scheduler.py');
 fs.writeFileSync(agent,require('../../src/clusterAgentRuntime.legacy.ts').CLUSTER_AGENT_RUNTIME,'utf8');
 fs.writeFileSync(scheduler,require('../../src/clusterSchedulerRuntime.legacy.ts').CLUSTER_SCHEDULER_RUNTIME,'utf8');
 const linux=p=>'/mnt/'+p[0].toLowerCase()+p.slice(2).replace(/\\/g,'/'),script=path.resolve(__dirname,'runtimeAnomalyLifecycle.fixture.py');
 const args=process.platform==='win32'?['--distribution',process.env.SIMPLE_TEST_WSL_DISTRO||'Ubuntu-Codex','--exec','python3','-B','-X','utf8',linux(script),linux(agent),linux(scheduler)]:['-B','-X','utf8',script,agent,scheduler];
 const proc=spawnSync(process.platform==='win32'?'wsl.exe':'python3',args,{encoding:'utf8',timeout:10000,windowsHide:true});
 assert.equal(proc.status,0,proc.stderr||proc.stdout);
 const {taskLifecycle}=require('../../src/features/TaskLifecycle.ts');
 const values=JSON.parse(proc.stdout);assert.equal(values.length,6);
 for(const row of values){const state=taskLifecycle(row.observation);assert.equal(state.status,row.expectedStatus);assert.equal(state.completionState,row.expectedCompletion);assert.equal(state.exitCode,row.exitCode);}
});
