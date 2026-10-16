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
test('different GPU overrides are independent, survive normalization, and clear back to server defaults',()=>{
 const raw={gpuJobsPerCard:6,gpuMinFreeMemoryGb:22,gpuCardOverrides:{'0':{gpuJobsPerCard:2,gpuMinFreeMemoryGb:35},'1':{gpuJobsPerCard:3,gpuMinFreeMemoryGb:22},'2':{gpuJobsPerCard:0},'9':{gpuJobsPerCard:100}}};
 const saved=Q.quotaOverrides(raw),cfg=Q.quotaSettings({},saved),rows=[gpu('0',140,106),gpu('1',140,118),gpu('2',140,100)];
 assert.deepEqual(Q.quotaPlacement(rows,new Map([['1',1]]),cfg),{slots:['1','1'],limits:{'0':2,'1':3,'2':0},weight:5});
 const cleared=Q.quotaOverrides({...raw,'gpuCardOverrides.0.gpuJobsPerCard':'','gpuCardOverrides.0.gpuMinFreeMemoryGb':''});
 assert.equal(cleared.gpuCardOverrides['0'],undefined);assert.equal(cleared.gpuCardOverrides['9'].gpuJobsPerCard,100);
 assert.equal(Q.cardSettings(Q.quotaSettings({},cleared),'0').gpuJobsPerCard,6);
 assert.throws(()=>Q.quotaOverrides({...raw,'gpuCardOverrides.1.gpuJobsPerCard':1.5}),/GPU_CARD_SETTINGS_INVALID/);
 const {normalizeXshellWorkerTunnelConfig}=require('../../src/tunnel/XshellTunnelSetup.legacy.ts');
 assert.deepEqual(normalizeXshellWorkerTunnelConfig({...raw,id:'w'},0).gpuCardOverrides,saved.gpuCardOverrides);
});
test('policy update carries per-card settings and never silently sends them to a legacy Agent',async()=>{
 const {syncGpuQuotaPolicies}=require('../../src/extension/GpuQuotaPolicyHost.ts');let calls=[];
 const h={workerActionTargets:()=>[{id:'w'}],enabledWorkerConfigs:()=>[{id:'w',gpuCardOverrides:{'0':{gpuJobsPerCard:2},'1':{gpuMinFreeMemoryGb:30}}}],schedulerSettings:()=>({}),
  lastWorkerProbes:{w:{capabilities:{endpoints:{gpuQuotaScheduling:1}}}},client:{postWorkerAction:async(_,action,body)=>calls.push(body)}};
 await syncGpuQuotaPolicies(h,'root');assert.equal(calls.length,0);
 h.lastWorkerProbes.w.capabilities.endpoints.gpuCardQuotaScheduling=1;
 await syncGpuQuotaPolicies(h,'root');assert.deepEqual(calls[0].gpuCardOverrides,{'0':{gpuJobsPerCard:2},'1':{gpuMinFreeMemoryGb:30}});
});
test('actual automatic and manual Host submissions retain all independent card overrides',async()=>{
 const cards={'0':{gpuJobsPerCard:2,gpuMinFreeMemoryGb:24},'1':{gpuJobsPerCard:5,gpuMinFreeMemoryGb:30}};
 const messages=await require('../_helpers/manualLaunchMessage')({gpuJobsPerCard:6,gpuMinFreeMemoryGb:22},{gpuCardOverrides:cards,gpuMaxConcurrentCards:2});
 for(const message of messages){assert.deepEqual(message.options.gpuCardOverrides,cards);assert.equal(message.options.gpuMaxConcurrentCards,2);}
});
test('server card ceiling takes priority over individual slots and follows active cards, not first N indices',()=>{
 const rows=[gpu('0',140,106),gpu('1',140,106),gpu('2',140,106)],cfg=Q.quotaSettings({}, {gpuJobsPerCard:6,gpuMaxConcurrentCards:1});
 assert.deepEqual(Q.quotaPlacement(rows,new Map([['2',2]]),cfg).slots,['2','2','2','2']);
 assert.deepEqual(Q.quotaPlacement(rows,new Map([['1',6]]),cfg).slots,[]);
 assert.deepEqual(Q.quotaPlacement(rows,new Map([['1',1],['2',1]]),cfg).slots,[],'lowered ceiling blocks all new starts without stopping existing jobs');
 assert.deepEqual(Q.quotaPlacement(rows,new Map(),{...cfg,gpuMaxConcurrentCards:0}).slots,[]);
 const freeLater=[gpu('0',140,130),...rows.slice(1)];
 assert.deepEqual(Q.quotaPlacement(freeLater,new Map(),cfg).slots,Array(6).fill('1'));
 assert.equal(Q.quotaPlacement(rows,new Map(),cfg).weight,6);
 assert.equal(Q.quotaOverrides({gpuMaxConcurrentCards:2}).gpuMaxConcurrentCards,2);
 assert.equal(Q.quotaOverrides({gpuMaxConcurrentCards:''}).gpuMaxConcurrentCards,undefined);
 assert.throws(()=>Q.quotaSettings({}, {gpuMaxConcurrentCards:1.5}),/GPU_CARD_LIMIT_INVALID/);
});
test('real native controller counts manual and automatic jobs toward one server card ceiling',()=>{
 const path=require('node:path'),{spawnSync}=require('node:child_process');
 const linux=p=>'/mnt/'+p[0].toLowerCase()+p.slice(2).replace(/\\/g,'/');
 const fixture=path.resolve(__dirname,'gpuCardLimit.fixture.py'),runtime=path.resolve(__dirname,'../../dist/runtime/cluster_agent.py');
 const args=process.platform==='win32'?['--distribution',process.env.SIMPLE_TEST_WSL_DISTRO||'Ubuntu-Codex','--exec','python3',linux(fixture),linux(runtime)]:[fixture,runtime];
 const result=spawnSync(process.platform==='win32'?'wsl.exe':'python3',args,{encoding:'utf8',timeout:10000,windowsHide:true});
 assert.equal(result.status,0,result.stderr||result.stdout||result.error?.message);
 assert.deepEqual(JSON.parse(result.stdout),{ok:true,concurrentCards:1,jobsOnCard:2,pausedWithoutStopping:true});
});
