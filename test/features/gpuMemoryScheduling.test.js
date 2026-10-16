const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../../dist/features/GpuMemoryScheduling');
const cfg=M.memorySchedulingSettings();
const gpu=(gb,used=0,index=0)=>({index,memoryTotalMb:gb*1024,memoryUsedMb:used*1024});
test('24/48/80/96 GiB capacities, reporting tolerance and explicit caps share one arithmetic rule',()=>{
 for(const [gb,cap] of [[24,1],[48,2],[80,3],[96,4],[95,4],[47.5,2],[480,20]])assert.equal(M.gpuMemoryJobLimit(gpu(gb),cfg),cap);
 assert.equal(M.gpuMemoryJobLimit(gpu(95),M.memorySchedulingSettings({gpuMemoryTolerancePercent:0})),3);
 assert.equal(M.gpuMemoryJobLimit(gpu(96),M.memorySchedulingSettings({}, {gpuMemoryMaxJobsPerGpu:2})),2);
 assert.equal(M.gpuMemoryJobLimit(gpu(96),M.memorySchedulingSettings({gpuMemoryRatioEnabled:false})),1);
});
test('settings previews reuse actual GPU capacity arithmetic, inherit the single number and do not invent offline cards',()=>{
 const workers=[{id:'h20'},{id:'override',gpuMemoryPerJobGb:12},{id:'offline'},{id:'limited',gpuMemoryMaxJobsPerGpu:2}];
 const telemetry={h20:{status:'ok',gpus:[gpu(96)]},override:{status:'ok',gpus:[gpu(48)]},offline:{status:'offline',gpus:[gpu(96)]},limited:{status:'ok',gpus:[gpu(96)]}};
 const result=M.gpuMemorySchedulingPreview({},workers,telemetry);
 assert.deepEqual(result.global.examples.map(row=>row.jobs),[1,2,3,4]);
 assert.equal(result.workers.h20.perJobGb,24);assert.equal(result.workers.h20.cards[0].jobs,4);
 assert.equal(result.workers.override.perJobGb,12);assert.equal(result.workers.override.cards[0].jobs,4);
 assert.deepEqual(result.workers.offline.cards,[]);assert.equal(result.workers.limited.cards[0].jobs,2);assert.equal(result.workers.limited.customLimits,true);
 assert.equal(M.gpuMemorySchedulingPreview({gpuMemoryPerJobGb:48},[workers[0]],telemetry).workers.h20.cards[0].jobs,2);
 assert.equal(M.gpuMemorySchedulingPreview({gpuMemoryReserveGb:24},[workers[0]],telemetry).workers.h20.cards[0].jobs,3);
});
test('busy owned cards offer remaining slots, low memory pauses growth and unknown cards stay exclusive',()=>{
 assert.deepEqual(M.gpuMemoryPlacement([gpu(96,20)],new Map([['0',1]]),[],cfg).slots,['0','0','0']);
 assert.deepEqual(M.gpuMemoryPlacement([gpu(96,80)],new Map([['0',1]]),[],cfg).slots,[]);
 assert.deepEqual(M.gpuMemoryPlacement([gpu(96,20)],new Map(),[],cfg).slots,[],'foreign busy cards are not opened');
 assert.deepEqual(M.gpuMemoryPlacement([{index:0}],new Map(),['0'],cfg).slots,['0']);
 assert.deepEqual(M.gpuMemoryPlacement([{index:0}],new Map([['0',1]]),[],cfg).slots,[]);
 assert.deepEqual(M.gpuMemoryPlacement([gpu(96)],new Map(),['0'],M.memorySchedulingSettings({gpuMemoryReserveGb:24})).slots,['0','0','0']);
 assert.deepEqual(M.gpuMemoryPlacement([gpu(96)],new Map([['0',3]]),[],M.memorySchedulingSettings({gpuMemoryReserveGb:24})).slots,[],
  'startup tasks retain their memory shares across telemetry polls');
});
test('local allocator preserves repeated GPU slots and counts sent commands before any telemetry allocation',()=>{
 const Q=require('../../dist/features/DistributedPlanQueue');
 const plan={id:'p',planFile:'plans/p.yaml',revision:'r',resultPathPolicy:'declared',codeFingerprint:'hash',enqueuedAt:new Date().toISOString(),
  jobs:Array.from({length:5},(_,index)=>({index,case:'c',seed:index,status:'pending',outputDir:'work/'+index}))};
 const workers=[{workerId:'w',online:true,codeFingerprint:'hash',declaredJobPaths:true,idleGpuAdmission:true,idleGpuIds:['0'],gpuSlots:['0','0','0','0']}];
 const result=Q.allocateAvailable({schemaVersion:1,plans:[plan]},workers);
 assert.equal(result.dispatches.length,4);assert.ok(result.dispatches.every(row=>row.gpuId==='0'));
 assert.equal(Q.activeGpuReservations(result.queue).activeByWorker.get('w'),4);
});
test('Worker overrides survive normalization, including zero/false and clearing to inheritance',()=>{
 const normalize=require('../../dist/tunnel/XshellTunnelSetup.legacy').normalizeXshellWorkerTunnelConfig;
 const worker=normalize({id:'h20',gpuMemoryRatioEnabled:false,gpuMemoryPerJobGb:12,gpuMemoryMaxJobsPerGpu:0,gpuMemoryReserveGb:2,gpuMemoryTolerancePercent:0});
 assert.equal(worker.gpuMemoryRatioEnabled,false);assert.equal(worker.gpuMemoryPerJobGb,12);assert.equal(worker.gpuMemoryMaxJobsPerGpu,0);
 assert.equal(worker.gpuMemoryTolerancePercent,0);
 const cleared=normalize({...worker,gpuMemoryRatioEnabled:'',gpuMemoryPerJobGb:''});
 assert.equal(cleared.gpuMemoryRatioEnabled,undefined);assert.equal(cleared.gpuMemoryPerJobGb,undefined);
 assert.equal(M.memorySchedulingSettings({gpuMemoryPerJobGb:24},cleared).gpuMemoryPerJobGb,24);
});
test('real Host messages carry per-card quota and free-memory gate for automatic and manual placement',async()=>{
 const messages=await require('../_helpers/manualLaunchMessage')({gpuJobsPerCard:6,gpuMinFreeMemoryGb:22});
 for(const message of messages){assert.equal(message.options.gpuJobsPerCard,6);assert.equal(message.options.gpuMinFreeMemoryGb,22);assert.equal(message.options.gpuQuotaScheduling,1);assert.equal(message.options.gpuMemoryPerJobGb,undefined);}
 assert.equal(messages[1].dispatchPolicy,'manual');assert.equal(messages[1].gpuId,'0');assert.equal(messages[1].requireIdleGpu,false);
});
test('prequeue weighting assigns four times as much work to a 96 GiB card without moving existing assignments',()=>{
 const P=require('../../dist/features/DistributedSchedulingPolicy');
 const plan={id:'p',planFile:'plans/p.yaml',revision:'r',resultPathPolicy:'declared',schedulingMode:'server_prequeue',codeFingerprint:'hash',jobs:Array.from({length:10},(_,index)=>({index,case:'c',seed:index,status:'pending',outputDir:'work/'+index}))};
 const workers=[['h20',96],['ordinary',24]].map(([workerId,gb])=>({workerId,online:true,declaredJobPaths:true,codeFingerprint:'hash',weight:M.gpuMemoryPlacement([gpu(gb)],new Map(),['0'],cfg).weight}));
 const result=P.allocateServerPrequeue({schemaVersion:1,plans:[plan]},workers);
 assert.equal(result.dispatches.filter(row=>row.workerId==='h20').length,8);assert.equal(result.dispatches.filter(row=>row.workerId==='ordinary').length,2);
});
test('settings save persists the two quota parameters through the actual Host handler',async()=>{
 const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
 const source=fs.readFileSync(require('node:path').resolve(__dirname,'../../src/extension/legacy.ts'),'utf8');
 const tree=ts.createSourceFile('host.ts',source,ts.ScriptTarget.Latest,true),cls=tree.statements.find(node=>ts.isClassDeclaration(node)&&node.name?.text==='RealtimeTunnelPanelProvider');
 const method=cls.members.find(node=>node.name?.getText(tree)==='saveSchedulerConfigFromUi').getText(tree);
 const updates=new Map(),context=vm.createContext({GpuQuotaScheduling:require('../../dist/features/GpuQuotaScheduling'),GpuMemoryScheduling:M,recordField:(message,key)=>message[key],numberRangePatch:(patch,key,fallback)=>patch[key]??fallback,
  DistributedSchedulingPolicy:{schedulingMode:value=>value},vscode:{ConfigurationTarget:{Global:1},workspace:{getConfiguration:()=>({update:async(key,value)=>updates.set(key,value)})},window:{showInformationMessage(){}}}});
 vm.runInContext(ts.transpileModule('class Host{'+method+'}this.Host=Host;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
 const host=new context.Host();Object.assign(host,{schedulerSettings:()=>cfg,startAvailabilityPushLoop(){},postState(){}});
 await host.saveSchedulerConfigFromUi({patch:{gpuJobsPerCard:6,gpuMinFreeMemoryGb:22}});
 assert.equal(updates.get('scheduler.gpuJobsPerCard'),6);assert.equal(updates.get('scheduler.gpuMinFreeMemoryGb'),22);
 assert.equal(updates.has('scheduler.gpuMemoryPerJobGb'),false);
});
test('the rendered settings form restores global values, explicit Worker overrides and empty inheritance',()=>{
 const vm=require('node:vm'),ts=require('typescript');
 const html=require('../../dist/ui/PanelHtml').renderPanelHtml();
 const script=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(match=>match[1]).join('\n');
 const tree=ts.createSourceFile('panel.js',script,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 let renderer;function find(node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='renderServerCardsV2')renderer=node.getText(tree);else ts.forEachChild(node,find);}find(tree);
 assert.ok(renderer);const fields=new Map(),output=new Map();
 const context={serverStatusIndexesForState:()=>({conflicts:[],workerStatus:new Map(),assignmentById:new Map(),conflictById:new Map()}),
  sessionForPath:()=>({}),asArray:value=>value,esc:String,escAttr:String,configDefault:(value,fallback)=>value??fallback,
  configInput:(scope,key,_label,value)=>{fields.set(scope+'.'+key,value);return '';},
  configSelect:(scope,key,_label,value)=>{fields.set(scope+'.'+key,value);return '';},
  treeAnchorId:(_group,id)=>id,formatTunnelAddress:()=>'',tunnelHost:value=>value,detailsOpenAttr:()=>'',
  configHelp:()=>'',helpBadge:()=>'',sessionStatusCell:()=>'',configSessionSelect:()=>'',configPortPair:()=>'',
  renderServerDestinationPreview:()=>'',renderSchedulerDependencyStatus:()=>'',renderSchedulerGlossary:()=>'',
  renderXshellSessionBudgetNote:()=>'',renderServerChainOverview:()=>'',setHtmlIfChanged:(id,value)=>output.set(id,value)};
 vm.runInNewContext(renderer+';renderServerCardsV2(state);',{...context,state:{schedulerConfig:{gpuJobsPerCard:2,gpuMinFreeMemoryGb:22,gpuMemoryRatioEnabled:false,gpuMemoryPerJobGb:12,gpuMemoryMaxJobsPerGpu:0,gpuMemoryReserveGb:2,gpuMemoryTolerancePercent:0},
  setup:{workerTunnels:[{id:'h20',gpuJobsPerCard:6,gpuMinFreeMemoryGb:24,gpuMemoryRatioEnabled:true,gpuMemoryPerJobGb:24,gpuMemoryMaxJobsPerGpu:0,gpuMemoryReserveGb:0,gpuMemoryTolerancePercent:0},{id:'inherit'}]}}});
 assert.equal(fields.get('scheduler.gpuJobsPerCard'),2);assert.equal(fields.get('scheduler.gpuMinFreeMemoryGb'),22);
 assert.equal(fields.get('worker:h20.gpuJobsPerCard'),6);assert.equal(fields.get('worker:h20.gpuMinFreeMemoryGb'),24);
 assert.equal(fields.get('worker:inherit.gpuJobsPerCard'),'');assert.equal(fields.get('worker:inherit.gpuMinFreeMemoryGb'),'');
 assert.equal(fields.has('scheduler.gpuMemoryPerJobGb'),false);assert.equal(fields.has('worker:h20.gpuIdleUtilThreshold'),false);
 assert.match(output.get('serverSettingsCards'),/保存策略/);assert.match(output.get('serverSettingsCards'),/保存服务器/);
});
