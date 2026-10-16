const test=require('node:test'),assert=require('node:assert/strict');
require('../_helpers/registerTsRequire');
const Q=require('../../src/features/GpuQuotaScheduling.ts');
test('native admission follows the same quota and free-memory rule',()=>{
 const path=require('node:path'),{spawnSync}=require('node:child_process');
 const r=spawnSync('python',['-X','utf8',path.join(__dirname,'gpuQuotaAdmission.fixture.py'),path.join(__dirname,'../../src/runtime/TmuxTaskLifecycle.ts'),path.join(__dirname,'../../dist/runtime/cluster_agent.py')],{encoding:'utf8',timeout:10000,windowsHide:true});
 assert.equal(r.status,0,r.stderr||r.stdout);assert.deepEqual(JSON.parse(r.stdout),{ok:true,quota:6,minimumFreeGb:22});
});
const gpu=(id,total,used)=>({index:id,memoryTotalMb:total*1024,memoryUsedMb:used*1024,utilizationPercent:100,processCount:5,processes:[{user:'other'}]});
test('per-card quotas use total remaining memory only, including cards with external processes',()=>{
 const rows=[gpu('0',140,106),gpu('1',140,118),gpu('2',140,119)];
 const cfg=Q.quotaSettings({gpuJobsPerCard:6,gpuMinFreeMemoryGb:22});
 const out=Q.quotaPlacement(rows,new Map([['0',2],['1',6]]),cfg);
 assert.deepEqual(out.slots,['0','0','0','0']);assert.deepEqual(out.limits,{'0':6,'1':6,'2':6});
 assert.equal(Q.quotaPlacement([{index:'x',utilizationPercent:0}],new Map(),cfg).slots.length,0);
 assert.equal(Q.quotaPlacement([gpu('0',140,118)],new Map(),cfg).slots.length,6,'22 GiB boundary is inclusive; no per-job memory estimate');
});
test('explicit new values retire old gates; migration preserves the old H20 quota before first save',()=>{
 const legacy={gpuMemoryRatioEnabled:true,gpuMemoryPerJobGb:24,gpuMemoryTolerancePercent:3,gpuIdleUtilThreshold:0,maxConcurrentGpus:1};
 assert.equal(Q.quotaSettings({},legacy,[gpu('0',140.4,106)]).gpuJobsPerCard,6);
 assert.deepEqual(Q.quotaSettings({}, {...legacy,gpuJobsPerCard:3,gpuMinFreeMemoryGb:22},[gpu('0',140.4,106)]),{gpuJobsPerCard:3,gpuMinFreeMemoryGb:22});
 assert.deepEqual(Q.quotaPlacement([gpu('0',24,0),gpu('1',24,0)],new Map(),Q.quotaSettings()).slots,['0','1']);
 const cleared=Q.quotaOverrides({...legacy,gpuJobsPerCard:'',gpuMinFreeMemoryGb:''});
 assert.equal(Q.quotaSettings({gpuJobsPerCard:2},{...legacy,...cleared},[gpu('0',140.4,106)]).gpuJobsPerCard,2,'clearing a migrated quota restores inheritance instead of reviving the old ratio');
});
test('native local allocation fills each detected card quota without a legacy idle gate',()=>{
 const D=require('../../src/features/DistributedPlanQueue.ts');
 const queue=D.enqueuePlan(D.emptyDistributedQueue(),{projectId:'p',planFile:'plans/p.yaml',revision:'r',codeFingerprint:'code',executionMode:'train_test',
  jobs:Array.from({length:18},(_,index)=>({index,case:'c',seed:index,outputDir:'work/'+index,collectionResultCsv:'result/'+index+'.csv'}))},'plan');
 const rows=[0,1,2].map(id=>gpu(String(id),140,106));
 const placement=Q.quotaPlacement(rows,new Map(),Q.quotaSettings({gpuJobsPerCard:6}));
 const result=D.allocateAvailable(queue,[{workerId:'h20',online:true,idleGpuAdmission:true,declaredJobPaths:true,codeFingerprint:'code',idleGpuIds:['0','1','2'],gpuSlots:placement.slots}],{requireIdleGpuAdmission:true,localIdleOnly:true});
 assert.equal(result.dispatches.length,18);for(const id of ['0','1','2'])assert.equal(result.dispatches.filter(row=>row.gpuId===id).length,6);
});
test('current quota changes update native queue metadata without starting or recalling jobs',async()=>{
 const {syncGpuQuotaPolicies}=require('../../src/extension/GpuQuotaPolicyHost.ts');let calls=[],limit=6;
 const h={workerActionTargets:()=>[{id:'w',project_dir:'/project'}],enabledWorkerConfigs:()=>[{id:'w',gpuJobsPerCard:limit}],
  schedulerSettings:()=>({gpuMinFreeMemoryGb:22}),lastWorkerProbes:{w:{capabilities:{endpoints:{gpuQuotaScheduling:1}}}},
  client:{postWorkerAction:async(id,action,body)=>calls.push({id,action,body})}};
 await syncGpuQuotaPolicies(h,'local');await syncGpuQuotaPolicies(h,'local');assert.equal(calls.length,1);
 assert.equal(calls[0].action,'configure-gpu-quota');assert.equal(calls[0].body.gpuJobsPerCard,6);
 limit=3;await syncGpuQuotaPolicies(h,'local');assert.equal(calls.length,2);assert.equal(calls[1].body.gpuJobsPerCard,3);
 assert.ok(calls.every(row=>!row.body.commandId&&!row.body.targetCommandId));
});
test('overlapping quota saves are serialized and the newest configuration wins',async()=>{
 const {syncGpuQuotaPolicies}=require('../../src/extension/GpuQuotaPolicyHost.ts');let limit=6,release,started;
 const ready=new Promise(resolve=>{started=resolve;}),hold=new Promise(resolve=>{release=resolve;}),values=[];
 const h={workerActionTargets:()=>[{id:'w'}],enabledWorkerConfigs:()=>[{id:'w',gpuJobsPerCard:limit}],schedulerSettings:()=>({}),
  lastWorkerProbes:{w:{capabilities:{endpoints:{gpuQuotaScheduling:1}}}},client:{postWorkerAction:async(_,action,body)=>{values.push(body.gpuJobsPerCard);if(values.length===1){started();await hold;}}}};
 const first=syncGpuQuotaPolicies(h,'root');await ready;limit=3;const second=syncGpuQuotaPolicies(h,'root');limit=6;const third=syncGpuQuotaPolicies(h,'root');
 release();await Promise.all([first,second,third]);assert.deepEqual(values,[6,6]);
});
