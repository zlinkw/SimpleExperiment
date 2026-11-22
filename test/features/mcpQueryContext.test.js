const test=require('node:test'),assert=require('node:assert/strict');
require('../_helpers/registerTsRequire');
const {queryProject}=require('../../src/mcp/ProjectQueries.ts');
const neutral=require('../../src/mcp/query/ExecutionContext.ts');
const support=require('../../src/mcp/query/Support.ts');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');

test('concurrent MCP project queries keep RPC and structured output isolated',async()=>{
 const cwd=process.cwd(),calls=[];
 const make=tag=>async method=>{await new Promise(resolve=>setImmediate(resolve));calls.push([tag,method]);
  if(method==='status')return {topology:{workers:[{id:tag,online:true}]}};
  if(method==='gpu.list')return {};if(method==='server.testAll')return {rows:[]};throw Error('unexpected '+method)};
 const [a,b]=await Promise.all([queryProject('C:/one',make('one'),'server_list',{}),queryProject('C:/two',make('two'),'server_list',{})]);
 assert.equal(a[0].id,'one');assert.equal(b[0].id,'two');assert.equal(calls.length,6);assert.equal(process.cwd(),cwd);
 assert.deepEqual(a,[{id:'one',online:'true',ssh:'unknown',gpu:'unknown'}]);
 assert.deepEqual(b,[{id:'two',online:'true',ssh:'unknown',gpu:'unknown'}]);
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
 const inputs=[{planFile:'plans/p.yaml',workerId:'worker-a',runId:'same',completionState:'verified',aggregationState:'eligible',
   dimensions:{seed:0,dataset:'合成,"A"',fold:'line\n1'},metrics:{AP:0,AUPRC:0.5},sourceFiles:[{path:'result.csv'}]},
  {planFile:'plans/p.yaml',workerId:'worker-a',runId:'same',completionState:'verified',aggregationState:'eligible',
   dimensions:{seed:1,dataset:'other'},metrics:{AP:0.25},sourceFiles:[{path:'result.csv'}]}];
 const rpc=async method=>{assert.equal(method,'results.list');return {source:'active_query',summary:{current:true,observedAt:'2026-01-01',results:inputs}}};
 const ids=['result-2454d4fd5b435fb1be93538cf62d922ed23ad0fa9971bc61d22038c2e1930a94','result-852472ca47e43bfd6ac2ce000bda0e90ca557f71037ee47eb85ef85a2bccc8eb'];
 const provenance={source:'active_query',current:true,observedAt:'2026-01-01'};
 const rows=await queryProject('fixture',rpc,'result_list',{});
 assert.deepEqual(rows,ids.map((id,i)=>({id,experimentId:'same',status:'validated',metric:'AP',value:i?0.25:0,updated:'2026-01-01',...provenance})));
 const metrics={AP:0,AUPRC:0.5},dimensions={seed:0,dataset:'合成,"A"',fold:'line\n1'};
 assert.deepEqual(await queryProject('fixture',rpc,'result_show',{id:ids[0]}),{id:ids[0],experimentId:'same',status:'validated',metrics,time:'2026-01-01',config:dimensions,seed:0,checkpoint:null,outputFiles:['result.csv'],...provenance});
 const exportJson={id:ids[0],...provenance,dimensions,metrics,rows:[{groupKey:'合成,"A"',dimensions:{suite:''},count:1,values:{AP:{raw:[0]},AUPRC:{raw:[0.5]}},bestResultId:ids[0]}]};
 const csv=['group,count,AP,AUPRC,bestResultId,dimension:seed,dimension:dataset,dimension:fold',`"合成,""A""",1,0,0.5,${ids[0]},0,"合成,""A""","line\n1"`].join('\n');
 for(const [format,content] of [['json',JSON.stringify(exportJson,null,2)],['csv',csv]])assert.deepEqual(await queryProject('fixture',rpc,'result_export',{id:ids[0],format}),{id:ids[0],...provenance,format,path:'',content});
 assert.deepEqual(await queryProject('fixture',rpc,'metric_list',{}),{metrics:['AP','AUPRC']});
 const metric=await queryProject('fixture',rpc,'metric_show',{id:ids[0]});
 assert.equal(Object.getPrototypeOf(metric),null);assert.deepEqual({...metric},metrics);
 const compared=await queryProject('fixture',rpc,'result_compare',{left:ids[0],right:ids[1]});
 assert.equal(Object.getPrototypeOf(compared.metric_difference),null);
 assert.deepEqual({...compared,metric_difference:{...compared.metric_difference}},{left:ids[0],right:ids[1],metric_difference:{AP:{left:0,right:0.25,delta:0.25}},improvement:['AP'],regression:[],reason:''});
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

test('MCP leaderboard returns every observed metric column',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'g004-mcp-metrics-'));
 fs.writeFileSync(path.join(root,'metrics.csv'),'runKey,accuracy,loss\na,0.8,\nb,0.9,0.4\n','utf8');
 const result=await queryProject(root,async()=>{throw Error('unexpected RPC')},'metric_leaderboard',{file:'metrics.csv'});
 assert.deepEqual(result.metrics,['accuracy','loss']);assert.equal(result.board[1].mean.loss,0.4);
});

test('MCP plan build and empty matrix retain their established values',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'g004-mcp-plan-')),rpc=async()=>{throw Error('unexpected RPC')};
 fs.writeFileSync(path.join(root,'plan.yaml'),'suite: demo\ncases: []\nseeds: [0, 1]\n','utf8');
 const matrix=await queryProject(root,rpc,'plan_matrix',{planFile:'plan.yaml'});
 assert.deepEqual(matrix,{count:0,suite:'demo',cases:0,seeds:2,filteredCount:0});
 const yaml=['suite: "demo"','mode: train_test','base_config: "x.yaml"','paper:',
  '  result_csv: "{output_dir}/metrics_summary.csv"','runner:',
  '  train_command: "python train.py --config {config} --seed {seed} --output-dir {output_dir}"',
  '  test_command: "python test.py --config {config} --seed {seed} --output-dir {output_dir} --result-csv {result_csv}"',
  'naming:','  sweep_dir: "work_dirs/multirun/{suite}"','  job_name: "{index}_{case}_seed{seed}"',
  '  experiment_name: "{suite}/{case}/seed_{seed}"','seeds:','  - "0"','  - "1"','cases:',
  '  - case: "demo__baseline"','    outputDir: "work_dirs/multirun/{suite}/{case}_seed{seed}"',
  '    expectedResults:','      - "work_dirs/multirun/{suite}/{case}_seed{seed}/metrics_summary.csv"','    overrides:',''].join('\n');
 assert.deepEqual(await queryProject(root,rpc,'plan_build',{suite:'demo',base:'x.yaml',seeds:[0,1]}),{suite:'demo',baseConfig:'x.yaml',seeds:['0','1'],yaml});
 await assert.rejects(queryProject(root,rpc,'plan_build',{seeds:[0,0]}),/duplicates/);
});

test('query runtime parsers retain existing training and identity semantics',()=>{
 const current=require('../../src/mcp/query/Runtime.ts');
 for(const text of ['', 'Epoch 2/5 loss=0.1', 'Epoch [3/10] loss: 0.4'])assert.equal(current.parseTrainingProgress(text),null);
 for(const yaml of ['', 'training:\n  max_epoch: 10\n', 'max_epochs: 0\n'])assert.equal(current.trainingMaxEpochFromYaml(yaml),null);
});

test('MCP resource availability preserves the prior structured query',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'g004-mcp-resource-'));
 const rpc=async method=>{
  if(method==='gpu.list')return {gpu:{workerA:{gpus:[{index:0,utilizationPercent:0,processCount:0},{index:1,processCount:2}]}}};
  if(method==='tasks.list')return {tasks:[]};if(method==='operations.list')return {records:[]};
  if(method==='state.get')return {value:{workerTunnels:[]}};throw Error('unexpected RPC '+method);
 };
 assert.deepEqual(await queryProject(root,rpc,'resource_available',{}),[
  {server:'workerA',gpu:'0',available:'true',reason:'utilization_below_5',utilization:0},
  {server:'workerA',gpu:'1',available:'false',reason:'process_present',utilization:''}
 ]);
 await assert.rejects(queryProject(root,async method=>{
  if(method==='tasks.list')throw support.businessError('task query rejected');
  return rpc(method);
 },'resource_available',{}),/task query rejected/);
});

test('MCP artifact queries retain paths, identities and failures',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'g004-mcp-artifact-'));
 fs.writeFileSync(path.join(root,'sample.txt'),'artifact data','utf8');
 fs.mkdirSync(path.join(root,'simple_cluster'));
 fs.mkdirSync(path.join(root,'output'));
 fs.writeFileSync(path.join(root,'output','result.txt'),'result','utf8');
 fs.mkdirSync(path.join(root,'empty'));
 fs.writeFileSync(path.join(root,'simple_cluster','experiment_index.json'),JSON.stringify([
  {id:'local-run',type:'workflow',outputDir:'output'},
  {id:'worker:1',type:'workflow',outputDir:'output'},
  {id:'worker:2',type:'workflow',outputDir:'empty'}
 ]),'utf8');
 const rpc=async method=>{
  if(method==='tasks.list')return {tasks:[{id:'run-a',status:'running',name:'trial'}]};
  if(method==='operations.list')return {records:[]};if(method==='state.get')return {value:{workerTunnels:[]}};
  if(method==='results.list')return {source:'active_query',summary:{current:true,results:[]}};
  throw Error('unexpected RPC '+method);
 };
 assert.deepEqual(await queryProject(root,rpc,'artifact_list',{id:'run-a'}),[]);
 const listed=await queryProject(root,rpc,'artifact_list',{id:'local-run'});
 assert.deepEqual(listed,[{id:'local-run:result.txt',path:'output/result.txt',size:'6'}]);
 assert.deepEqual(await queryProject(root,rpc,'artifact_inspect',{id:'sample.txt'}),{
  id:'sample.txt',file:'sample.txt',size:13,mtime:fs.statSync(path.join(root,'sample.txt')).mtime.toISOString(),
  hash:'18eec0cf867e893de3351c2efc679c3b79ceed8a9037eec96db06a50bfd718d3'
 });
 await assert.rejects(queryProject(root,rpc,'artifact_inspect',{id:'missing'}),/not found/i);
 assert.equal((await queryProject(root,rpc,'artifact_inspect',{id:'worker:1:result.txt'})).file,'output/result.txt');
 await assert.rejects(queryProject(root,rpc,'artifact_inspect',{id:'worker:2:result.txt'}),/not found/i);
});

test('query compact output preserves the existing structured view',()=>{
 const current=require('../../src/mcp/query/Compact.ts');
 const payload={id:'x',status:'running',zero:0,raw:{secret:'fixture'},rows:[{id:'a',status:'failed',recentLogs:['x']}]};
 assert.deepEqual(current.compactJsonValue(payload),{id:'x',status:'running',zero:0,rows:[{id:'a',status:'failed'}]});
});

test('MCP experiment views retain real query behavior with project-bound RPC',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'g004-mcp-experiment-'));
 const baselines=require('../fixtures/g004-mcp-experiment-baseline.json');
 const rpc=async method=>{
  if(method==='tasks.list')return {tasks:[{id:'run-a',status:'running',name:'trial',startedAt:'2026-01-01'}]};
  if(method==='operations.list')return {records:[]};if(method==='state.get')return {value:{workerTunnels:[]}};
  if(method==='results.list')return {source:'active_query',summary:{current:true,results:[]}};
  if(method==='live.output')return {text:'INFO synthetic log'};
  throw Error('unexpected RPC '+method);
 };
 assert.deepEqual(await queryProject(root,rpc,'experiment_list',{full:true}),baselines.list);
 assert.deepEqual(await queryProject(root,rpc,'experiment_summary',{full:true}),baselines.summary);
 assert.deepEqual(await queryProject(root,rpc,'experiment_results',{id:'run-a',full:true}),baselines.results);
 assert.deepEqual(await queryProject(root,rpc,'experiment_list',{}),baselines.listCompact);
 assert.deepEqual(await queryProject(root,rpc,'experiment_log',{id:'run-a'}),baselines.log);
 assert.deepEqual(await queryProject(root,rpc,'experiment_log',{id:'run-a',lines:1}),baselines.logTail);
 await assert.rejects(queryProject(root,rpc,'experiment_log',{id:'missing'}),/not found/i);
 const normalized=value=>JSON.parse(JSON.stringify(value,(key,item)=>['snapshot_id','snapshot_time'].includes(key)?undefined:item));
 for(const name of ['active','tree','status','overview','health','inspect','monitor','diagnose','config']){
  const actual=await queryProject(root,rpc,'experiment_'+name,{id:'run-a',full:true});
  assert.deepEqual(normalized(actual),baselines[name],name);
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
