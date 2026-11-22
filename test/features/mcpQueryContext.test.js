const test=require('node:test'),assert=require('node:assert/strict');
require('../_helpers/registerTsRequire');
const {queryProject}=require('../../src/mcp/ProjectQueries.ts');
const neutral=require('../../src/mcp/query/ExecutionContext.ts');
const existing=require('../../src/cli/ExecutionContext.ts');
const support=require('../../src/mcp/query/Support.ts');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');

test('concurrent MCP project queries keep RPC and structured output isolated',async()=>{
 assert.equal(neutral.businessContext,existing.businessContext);
 const cwd=process.cwd(),calls=[];
 const make=tag=>async method=>{await new Promise(resolve=>setImmediate(resolve));calls.push([tag,method]);
  if(method==='status')return {topology:{workers:[{id:tag,online:true}]}};
  if(method==='gpu.list')return {};if(method==='server.testAll')return {rows:[]};throw Error('unexpected '+method)};
 const [a,b]=await Promise.all([queryProject('C:/one',make('one'),'server_list',{}),queryProject('C:/two',make('two'),'server_list',{})]);
 assert.equal(a[0].id,'one');assert.equal(b[0].id,'two');assert.equal(calls.length,6);assert.equal(process.cwd(),cwd);
 let old;const {serverCommand}=require('../../src/cli/commands/server.ts');
 await neutral.businessContext.run({root:'C:/one',rpc:make('one'),emit:value=>{old=value}},()=>serverCommand('list',[],{json:true}));assert.deepEqual(a,old);
 assert.equal(neutral.businessContext.getStore(),undefined);
});

test('MCP result_parse uses content-selected preset and preserves zero',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'g004-mcp-parse-'));
 fs.writeFileSync(path.join(root,'metrics.csv'),'experiment_id,accuracy,ap\nrun-a,0,0.75\n','utf8');
 const result=await queryProject(root,async()=>{throw Error('unexpected RPC')},'result_parse',{file:'metrics.csv'});
 assert.equal(result.length,1);assert.equal(result[0].metrics.accuracy.value,0);assert.equal(result[0].metrics.AP.value,0.75);
 await assert.rejects(queryProject(root,async()=>{},'result_parse',{file:'metrics.csv',preset:'unknown'}),/unknown result preset/);
});

test('MCP result list, show and export retain the established structured business output',async()=>{
 const old=require('../../src/cli/commands/result.ts');
 const oldMetric=require('../../src/cli/commands/metric.ts');
 const oldCompare=require('../../src/cli/commands/compare.ts');
 const inputs=[{planFile:'plans/p.yaml',workerId:'worker-a',runId:'same',completionState:'verified',aggregationState:'eligible',
   dimensions:{seed:0,dataset:'合成,"A"',fold:'line\n1'},metrics:{AP:0,AUPRC:0.5},sourceFiles:[{path:'result.csv'}]},
  {planFile:'plans/p.yaml',workerId:'worker-a',runId:'same',completionState:'verified',aggregationState:'eligible',
   dimensions:{seed:1,dataset:'other'},metrics:{AP:0.25},sourceFiles:[{path:'result.csv'}]}];
 const rpc=async method=>{assert.equal(method,'results.list');return {source:'active_query',summary:{current:true,observedAt:'2026-01-01',results:inputs}}};
 async function previous(fn){let value;await neutral.businessContext.run({root:'fixture',rpc,emit:x=>{value=x}},fn);return value}
 const rows=await queryProject('fixture',rpc,'result_list',{});assert.deepEqual(rows,await previous(()=>old.resultList({json:true})));
 assert.equal(rows.length,2);assert.notEqual(rows[0].id,rows[1].id);assert.equal(rows[0].value,0);
 assert.deepEqual(await queryProject('fixture',rpc,'result_show',{id:rows[0].id}),await previous(()=>old.resultShow(rows[0].id,{json:true})));
 for(const format of ['json','csv'])assert.deepEqual(await queryProject('fixture',rpc,'result_export',{id:rows[0].id,format}),await previous(()=>old.resultExport(rows[0].id,{json:true,format})));
 assert.deepEqual(await queryProject('fixture',rpc,'metric_list',{}),await previous(()=>oldMetric.metricList({json:true})));
 assert.deepEqual(await queryProject('fixture',rpc,'metric_show',{id:rows[0].id}),await previous(()=>oldMetric.metricShow(rows[0].id,{json:true})));
 assert.deepEqual(await queryProject('fixture',rpc,'result_compare',{left:rows[0].id,right:rows[1].id}),await previous(()=>oldCompare.compareCommand([rows[0].id,rows[1].id],{json:true})));
 await assert.rejects(queryProject('fixture',rpc,'result_compare',{left:'',right:rows[1].id}),/missing first experiment id/);
 await assert.rejects(queryProject('fixture',rpc,'result_show',{id:'same'}),/AMBIGUOUS/);
 await assert.rejects(queryProject('fixture',async()=>({source:'old'}),'result_list',{}),/RESULT_QUERY_UNVERIFIED/);
});

test('MCP metric leaderboard preserves the known loss direction',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'g004-mcp-rank-'));fs.writeFileSync(path.join(root,'metrics.csv'),'experimentId,runKey,loss\nfirst,group,0.8\nsecond,group,0.2\n','utf8');
 const result=await queryProject(root,async()=>{throw Error('unexpected RPC')},'metric_leaderboard',{file:'metrics.csv',primary:'loss'});
 assert.equal(result.board[0].bestExperimentId,'second');
 const {numericMetrics}=require('../../src/mcp/query/Metrics.ts'),special=numericMetrics({metrics:JSON.parse('{"__proto__":0,"constructor":"2","blank":""}')});
 assert.equal(special.__proto__,0);assert.equal(special.constructor,2);assert.equal(Object.hasOwn(special,'blank'),false);
});

test('MCP plan build and empty matrix retain their established values',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'g004-mcp-plan-')),rpc=async()=>{throw Error('unexpected RPC')};
 fs.writeFileSync(path.join(root,'plan.yaml'),'suite: demo\ncases: []\nseeds: [0, 1]\n','utf8');
 const old=require('../../src/cli/commands/plan.ts');let previous;
 await neutral.businessContext.run({root,rpc,emit:value=>{previous=value}},()=>old.planMatrix('plan.yaml',{json:true}));
 const matrix=await queryProject(root,rpc,'plan_matrix',{planFile:'plan.yaml'});assert.deepEqual(matrix,previous);assert.equal(matrix.count,0);
 await neutral.businessContext.run({root,rpc,emit:value=>{previous=value}},()=>old.planBuild({json:true,suite:'demo',base:'x.yaml',seeds:'0,1'}));
 assert.deepEqual(await queryProject(root,rpc,'plan_build',{suite:'demo',base:'x.yaml',seeds:[0,1]}),previous);
 await assert.rejects(queryProject(root,rpc,'plan_build',{seeds:[0,0]}),/duplicates/);
});

test('query runtime parsers retain existing training and identity semantics',()=>{
 const old=require('../../src/cli/runtime.ts'),current=require('../../src/mcp/query/Runtime.ts');
 for(const text of ['', 'Epoch 2/5 loss=0.1', 'Epoch [3/10] loss: 0.4'])assert.deepEqual(current.parseTrainingProgress(text),old.parseTrainingProgress(text));
 for(const yaml of ['', 'training:\n  max_epoch: 10\n', 'max_epochs: 0\n'])assert.equal(current.trainingMaxEpochFromYaml(yaml),old.trainingMaxEpochFromYaml(yaml));
});

test('MCP resource availability preserves the prior structured query',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'g004-mcp-resource-'));
 const rpc=async method=>{
  if(method==='gpu.list')return {gpu:{workerA:{gpus:[{index:0,utilizationPercent:0,processCount:0},{index:1,processCount:2}]}}};
  if(method==='tasks.list')return {tasks:[]};if(method==='operations.list')return {records:[]};
  if(method==='state.get')return {value:{workerTunnels:[]}};throw Error('unexpected RPC '+method);
 };
 let previous;const old=require('../../src/cli/commands/resource.ts');
 await neutral.businessContext.run({root,rpc,emit:value=>{previous=value}},()=>old.resourceCommand('available',[],{json:true}));
 assert.deepEqual(await queryProject(root,rpc,'resource_available',{}),previous);
 assert.equal(previous[0].available,'true');assert.equal(previous[1].reason,'process_present');
});

test('query compact output preserves the existing structured view',()=>{
 const old=require('../../src/cli/format.ts'),current=require('../../src/mcp/query/Compact.ts');
 const payload={id:'x',status:'running',zero:0,raw:{secret:'fixture'},rows:[{id:'a',status:'failed',recentLogs:['x']}]};
 assert.deepEqual(current.compactJsonValue(payload),old.compactJsonValue(payload));
});

test('MCP experiment views retain real query behavior with project-bound RPC',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'g004-mcp-experiment-')),old=require('../../src/cli/commands/experiment.ts');
 const rpc=async method=>{
  if(method==='tasks.list')return {tasks:[{id:'run-a',status:'running',name:'trial',startedAt:'2026-01-01'}]};
  if(method==='operations.list')return {records:[]};if(method==='state.get')return {value:{workerTunnels:[]}};
  if(method==='results.list')return {source:'active_query',summary:{current:true,results:[]}};
  if(method==='live.output')return {text:'INFO synthetic log'};
  throw Error('unexpected RPC '+method);
 };
 async function previous(fn){let value;await neutral.businessContext.run({root,rpc,emit:x=>{value=x}},fn);return value}
 const flags={json:true,full:true,compactJson:false};
 assert.deepEqual(await queryProject(root,rpc,'experiment_list',{full:true}),await previous(()=>old.experimentList(flags)));
 assert.deepEqual(await queryProject(root,rpc,'experiment_summary',{full:true}),await previous(()=>old.experimentSummary(flags)));
 assert.deepEqual(await queryProject(root,rpc,'experiment_results',{id:'run-a',full:true}),await previous(()=>old.experimentResults('run-a',flags)));
 assert.deepEqual(await queryProject(root,rpc,'experiment_list',{}),await previous(()=>old.experimentList({json:true,full:false})));
 const oldLogs=require('../../src/cli/commands/log.ts');
 assert.deepEqual(await queryProject(root,rpc,'experiment_log',{id:'run-a'}),await previous(()=>oldLogs.logShow('run-a',flags)));
 assert.deepEqual(await queryProject(root,rpc,'experiment_log',{id:'run-a',lines:1}),await previous(()=>oldLogs.logTail('run-a',{...flags,lines:1})));
 await assert.rejects(queryProject(root,rpc,'experiment_log',{id:'missing'}),/not found/i);
 const normalized=value=>JSON.parse(JSON.stringify(value,(key,item)=>['snapshot_id','snapshot_time'].includes(key)?undefined:item));
 for(const [name,fn,needsId] of [['active','experimentActive',false],['tree','experimentTree',false],['status','experimentStatus',true],['overview','experimentOverview',false],['health','experimentHealth',false],['inspect','experimentInspect',true],['monitor','experimentMonitor',true],['diagnose','experimentDiagnose',true],['config','experimentConfig',true]]){
  const actual=await queryProject(root,rpc,'experiment_'+name,{id:'run-a',full:true});
  const expected=await previous(()=>needsId?old[fn]('run-a',flags):old[fn](flags));assert.deepEqual(normalized(actual),normalized(expected),name);
 }
 await assert.rejects(queryProject(root,rpc,'experiment_results',{id:'missing'}),/not found/i);
});

test('neutral query support requires context and preserves optional RPC semantics',async()=>{
 assert.throws(()=>support.emit({}),/MCP_QUERY_CONTEXT_REQUIRED/);
 assert.throws(()=>support.callApi('status'),/MCP_QUERY_CONTEXT_REQUIRED/);
 let output;await neutral.businessContext.run({root:'fixture',emit:value=>{output=value},rpc:async method=>{
  if(method==='missing')throw Object.assign(Error('missing'),{apiCode:-32601});
  if(method==='denied')throw support.businessError('denied');return {zero:0};
 }},async()=>{assert.equal(await support.optionalApi('missing'),null);await assert.rejects(support.optionalApi('denied'),/denied/);support.emit(await support.callApi('status'))});
 assert.deepEqual(output,{zero:0});
 const data=require('../../src/mcp/query/ProjectData.ts');assert.throws(()=>data.projectRoot(),/MCP_QUERY_CONTEXT_REQUIRED/);
 await neutral.businessContext.run({root:'C:/synthetic',emit(){},rpc:async()=>{}},async()=>assert.equal(data.resolveProjectPath('plans'),path.resolve('C:/synthetic','plans')));
});
