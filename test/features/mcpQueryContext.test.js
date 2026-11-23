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
 await assert.rejects(queryProject(root,async()=>{},'result_parse',{}),/file/i);
 await assert.rejects(queryProject(root,async()=>{},'result_parse',{file:'absent.csv'}),{code:'ENOENT'});
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
 fs.writeFileSync(path.join(root,'accuracy.csv'),'runKey,experimentId,accuracy\nr,a,0.2\nr,b,0.8\n','utf8');
 const higher=await queryProject(root,async()=>{throw Error('unexpected RPC')},'metric_leaderboard',{file:'accuracy.csv',primary:'accuracy'});
 assert.equal(higher.board[0].bestExperimentId,'b');
 const {numericMetrics}=require('../../src/mcp/query/Metrics.ts'),special=numericMetrics({metrics:JSON.parse('{"__proto__":0,"constructor":"2","blank":""}')});
 assert.equal(special.__proto__,0);assert.equal(special.constructor,2);assert.equal(Object.hasOwn(special,'blank'),false);
});

test('MCP leaderboard returns every observed metric column',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'g004-mcp-metrics-'));
 fs.writeFileSync(path.join(root,'metrics.csv'),'runKey,accuracy,loss\na,0.8,\nb,0.9,0.4\n','utf8');
 const result=await queryProject(root,async()=>{throw Error('unexpected RPC')},'metric_leaderboard',{file:'metrics.csv'});
 assert.deepEqual(result.metrics,['accuracy','loss']);assert.equal(result.board[1].mean.loss,0.4);
 await assert.rejects(queryProject(root,async()=>{},'metric_leaderboard',{}),/file/i);
 await assert.rejects(queryProject(root,async()=>{},'metric_leaderboard',{file:'absent.csv'}),{code:'ENOENT'});
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
 let telemetryStatus;
 const rpc=async method=>{
  if(method==='gpu.list')return {gpu:{workerA:{status:telemetryStatus,gpus:[{index:0,utilizationPercent:0,processCount:0},{index:1,processCount:2}]}}};
  if(method==='tasks.list')return {tasks:[]};if(method==='operations.list')return {records:[]};
  if(method==='state.get')return {value:{workerTunnels:[]}};throw Error('unexpected RPC '+method);
 };
 assert.deepEqual(await queryProject(root,rpc,'resource_available',{}),[
  {server:'workerA',gpu:'0',available:'true',reason:'utilization_below_5',utilization:0},
  {server:'workerA',gpu:'1',available:'false',reason:'process_present',utilization:''}
 ]);
 telemetryStatus='stale';
 assert.deepEqual((await queryProject(root,rpc,'resource_available',{})).map(row=>[row.available,row.reason]),
  [['unknown','telemetry_unavailable'],['unknown','telemetry_unavailable']]);
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

test('MCP local artifacts cannot inspect files outside the current project',async()=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'g004-artifact-boundary-'));
 const root=path.join(base,'project'),outside=path.join(base,'outside');fs.mkdirSync(root);fs.mkdirSync(outside);
 fs.writeFileSync(path.join(outside,'secret.txt'),'synthetic external fixture','utf8');
 fs.writeFileSync(path.join(root,'zero.txt'),'','utf8');fs.mkdirSync(path.join(root,'simple_cluster'));
 fs.mkdirSync(path.join(root,'output'));fs.symlinkSync(outside,path.join(root,'link'),'junction');
 let results=[],workerTasks=[];const index=rows=>fs.writeFileSync(path.join(root,'simple_cluster','experiment_index.json'),JSON.stringify(rows),'utf8');
 const rpc=async method=>{if(method==='tasks.list')return {tasks:[],workerTasks};if(method==='operations.list')return {records:[]};
  if(method==='state.get')return {value:{workerTunnels:[]}};if(method==='results.list')return {source:'active_query',summary:{current:true,results}};
  throw Error('unexpected RPC '+method)};
 index([{id:'local:run',type:'workflow',outputDir:'output'}]);
 assert.equal((await queryProject(root,rpc,'artifact_inspect',{id:'zero.txt'})).size,0);
 assert.equal((await queryProject(root,rpc,'artifact_inspect',{id:path.join(root,'zero.txt')})).size,0);
 fs.writeFileSync(path.join(root,'output','empty.txt'),'','utf8');
 fs.writeFileSync(path.join(root,'output','artifact_manifest.json'),JSON.stringify({files:[{path:'empty.txt',size:0}]}),'utf8');
 assert.equal((await queryProject(root,rpc,'artifact_inspect',{id:'local:run:empty.txt'})).size,0);
 const historyDir=path.join(root,'experiments','runs','local-history');fs.mkdirSync(historyDir,{recursive:true});
 fs.writeFileSync(path.join(historyDir,'empty.txt'),'','utf8');
 fs.writeFileSync(path.join(historyDir,'artifact_manifest.json'),JSON.stringify({files:[{path:'empty.txt',size:0}]}),'utf8');
 assert.equal((await queryProject(root,rpc,'artifact_inspect',{id:'local-history:empty.txt'})).size,0);
 for(const id of [path.join(outside,'secret.txt'),'../outside/secret.txt','link/secret.txt'])
  await assert.rejects(queryProject(root,rpc,'artifact_inspect',{id}),/ARTIFACT_PATH_OUTSIDE_PROJECT/);
 fs.writeFileSync(path.join(root,'output','artifact_manifest.json'),JSON.stringify({files:[{path:'../../outside/secret.txt'}]}),'utf8');
 await assert.rejects(queryProject(root,rpc,'artifact_list',{id:'local:run'}),/ARTIFACT_PATH_OUTSIDE_PROJECT/);
 fs.writeFileSync(path.join(root,'output','artifact_manifest.json'),JSON.stringify({files:[]}), 'utf8');
 fs.symlinkSync(outside,path.join(root,'output','nested-link'),'junction');
 await assert.rejects(queryProject(root,rpc,'artifact_list',{id:'local:run'}),/ARTIFACT_PATH_OUTSIDE_PROJECT/);
 index([{id:'local:run',type:'workflow',outputDir:'link'}]);
 await assert.rejects(queryProject(root,rpc,'artifact_list',{id:'local:run'}),/ARTIFACT_PATH_OUTSIDE_PROJECT/);
 index([{id:'remote-fact',type:'workflow'}]);
 results=[{workflowId:'remote-fact',sourceFiles:[{path:path.join(outside,'secret.txt'),size:8}]}];
 const remote=await queryProject(root,rpc,'artifact_inspect',{id:'remote-fact:'+path.join(outside,'secret.txt')});
 assert.equal(remote.size,'8');assert.equal(remote.hash,'');assert.equal(remote.mtime,'');
 fs.writeFileSync(path.join(root,'same-name.txt'),'local content is different','utf8');
 results=[{workflowId:'remote-fact',sourceFiles:[{path:'same-name.txt',size:7,endpoint:'worker'}]}];
 const relativeRemote=await queryProject(root,rpc,'artifact_inspect',{id:'remote-fact:same-name.txt'});
 assert.equal(relativeRemote.size,'7');assert.equal(relativeRemote.hash,'');assert.equal(relativeRemote.mtime,'');
 results=[{workflowId:'remote-fact',sourceFiles:[{path:'same-name.txt',size:7}]}];
 assert.equal((await queryProject(root,rpc,'artifact_inspect',{id:'remote-fact:same-name.txt'})).hash,'');
 results=[{workflowId:'remote-fact',sourceFiles:[{path:'same-name.txt',size:7,endpoint:'local'}]}];
 assert.equal((await queryProject(root,rpc,'artifact_inspect',{id:'remote-fact:same-name.txt'})).size,26);
 index([{id:'legacy-run',type:'worker_run',worker_id:'worker',run_id:'legacy-run',outputDir:path.join(outside,'remote-run')}]);
 results=[{runId:'legacy-run',sourceFiles:[{path:'remote-run/metrics.csv',size:5,endpoint:'worker'}]}];
 const legacy=await queryProject(root,rpc,'artifact_list',{id:'legacy-run'});
 assert.deepEqual(legacy,[{id:'legacy-run:remote-run/metrics.csv',path:'remote-run/metrics.csv',size:'5'}]);
 results=[];
 await assert.rejects(queryProject(root,rpc,'artifact_list',{id:'legacy-run'}),error=>{
  assert.match(error.message,/ARTIFACT_LOCATION_UNVERIFIED/);
  assert.deepEqual(JSON.parse(error.detail),{id:'legacy-run',declaredPath:path.join(outside,'remote-run')});return true;
 });
 workerTasks=[{workerId:'worker',tasks:[{commandId:'history-run',status:'completed',outputDir:'output'}]}];
 results=[{runId:'history-run',sourceFiles:[{path:'output/empty.txt',size:9,endpoint:'worker'}]}];
 const history=await queryProject(root,rpc,'artifact_inspect',{id:'history-run:output/empty.txt'});
 assert.equal(history.size,'9');assert.equal(history.hash,'');assert.equal(history.mtime,'');
});

test('MCP remote artifacts retain the precise run and reject unverified or foreign files',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'g004-mcp-remote-artifact-')),requests=[];
 const planFile='experiments/plans/a.yaml';let current=true,unverified=false,outside=false;
 const facts=['a','b'].map((name,index)=>({lifecycleProtocol:2,projectId:'p',workflowId:'workflow',index,workerId:'worker',commandId:'command-'+name,
  planFile,outputDir:'work_dirs/'+name,status:'completed',executionState:'exited',resultState:'complete',completionState:'verified',successful:true,exitCode:0}));
 const rpc=async(method,params)=>{
  if(method==='tasks.list')return {lifecycleProtocol:2,stateSource:'active_query',projectId:'p',jobLifecycle:facts,workerTasks:[]};
  if(method==='operations.list')return {records:[]};
  if(method==='state.get')return {value:{workerTunnels:[]}};
  if(method==='mcp.call'){
   requests.push(params);assert.equal(params.tool,'sftp_inventory');assert.equal(params.arguments.workerId,'worker');
   if(!current)throw Error('inventory unavailable');
   const dir=params.arguments.paths[0],file=dir.endsWith('.csv')?dir:dir+'/nested/metrics.csv';
   return {ok:true,files:{[outside?'work_dirs/other/metrics.csv':file]:{size:53,modifiedAtMs:1700000000000,...(params.arguments.includeHashes?{sha256:'a'.repeat(64)}:{})}},...(unverified?{unverifiedFiles:{'work_dirs/a/model.pt':'permission denied'}}:{})};
  }
  throw Error('unexpected API: '+method);
 };
 const listed=await queryProject(root,rpc,'artifact_list',{id:'command-a'});
 assert.deepEqual(listed,[{id:'command-a:work_dirs/a/nested/metrics.csv',path:'work_dirs/a/nested/metrics.csv',size:'53',workerId:'worker',mtime:'2023-11-14T22:13:20.000Z'}]);
 const detail=await queryProject(root,rpc,'artifact_inspect',{id:listed[0].id});
 assert.equal(detail.file,'work_dirs/a/nested/metrics.csv');assert.equal(detail.hash,'a'.repeat(64));assert.equal(detail.workerId,'worker');
 assert.equal((await queryProject(root,rpc,'artifact_list',{id:'workflow'})).length,2);
 unverified=true;await assert.rejects(queryProject(root,rpc,'artifact_list',{id:'command-a'}),/ARTIFACT_QUERY_UNVERIFIED/);unverified=false;
 outside=true;await assert.rejects(queryProject(root,rpc,'artifact_list',{id:'command-a'}),/ARTIFACT_PATH_OUTSIDE_RUN/);outside=false;
 current=false;await assert.rejects(queryProject(root,rpc,'artifact_list',{id:'command-a'}),/inventory unavailable/);
 assert.ok(requests.some(row=>row.arguments.includeHashes===true));
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

test('MCP experiment config and logs preserve declared history details',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'g004-mcp-config-log-'));
 for(const dir of ['experiments/plans','experiments/runs/run-plan-1','simple_cluster'])fs.mkdirSync(path.join(root,dir),{recursive:true});
 fs.writeFileSync(path.join(root,'experiments/plans/bus.yaml'),'suite: bus\nseeds: [42, 43]\ndataset: data/train\nmodel: resnet\noptimizer: adam\nbatch_size: 8\nepochs: 20\n','utf8');
 fs.writeFileSync(path.join(root,'experiments/runs/run-plan-1/stdout.log'),'2026-01-02T00:00:00Z INFO training started\n2026-01-02T01:00:00Z ERROR CUDA out of memory\n','utf8');
 fs.writeFileSync(path.join(root,'simple_cluster/experiment_index.json'),JSON.stringify([{global_job_id:'run-plan-1',type:'run-plan',case:'workflow',status:'failed',plan:'experiments/plans/bus.yaml',seed:42,stdout:'experiments/runs/run-plan-1/stdout.log'}]),'utf8');
 const rpc=async method=>{if(method==='tasks.list')return {tasks:[]};if(method==='operations.list')return {records:[]};if(method==='state.get')return {value:{workerTunnels:[]}};if(method==='live.output')return {};throw Error('unexpected RPC '+method)};
 const config=await queryProject(root,rpc,'experiment_config',{id:'run-plan-1',full:true});
 assert.match(config.config_path,/bus\.yaml/);assert.match(config.yaml,/resnet/);assert.equal(String(config.seed),'42');
 assert.equal(config.dataset,'data/train');assert.equal(config.model,'resnet');assert.equal(config.optimizer,'adam');assert.equal(config.batch_size,'8');assert.equal(config.epoch,'20');
 const logs=await queryProject(root,rpc,'experiment_log',{id:'run-plan-1'});
 assert.ok(logs.some(row=>row.level==='INFO'));assert.ok(logs.some(row=>row.level==='ERROR'));assert.ok(logs.every(row=>['timestamp','level','message'].every(key=>key in row)));
 const diagnosis=await queryProject(root,rpc,'experiment_diagnose',{id:'run-plan-1',full:true});
 assert.equal(diagnosis.status,'failed');assert.ok(diagnosis.evidence.some(line=>/out of memory/i.test(line)));
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

test('MCP experiment list preserves filtering, limit and canonical terminal aliases',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'g004-mcp-list-')),dir=path.join(root,'simple_cluster');fs.mkdirSync(dir);
 const rpc=async method=>{if(method==='tasks.list')return {tasks:[]};if(method==='operations.list')return {records:[]};if(method==='state.get')return {value:{workerTunnels:[]}};if(method==='live.output')return {};throw Error('unexpected RPC '+method)};
 fs.writeFileSync(path.join(dir,'experiment_index.json'),JSON.stringify([
  {global_job_id:'exp-ok',case:'baseline',status:'completed',started_at:'2026-01-01T00:00:00Z',finished_at:'2026-01-01T01:00:00Z'},
  {global_job_id:'exp-bad',case:'ablation',status:'failed',started_at:'2026-01-02T00:00:00Z',finished_at:'2026-01-02T01:00:00Z'}]),'utf8');
 const rows=await queryProject(root,rpc,'experiment_list',{full:true});assert.equal(rows.length,2);
 for(const row of rows)for(const key of ['id','name','status','created','updated'])assert.ok(key in row,key);
 assert.equal((await queryProject(root,rpc,'experiment_list',{status:'failed',full:true})).length,1);
 assert.equal((await queryProject(root,rpc,'experiment_list',{limit:1})).length,1);
 const detail=await queryProject(root,rpc,'experiment_status',{id:'exp-bad',full:true});assert.equal(detail.status,'failed');
 for(const key of ['stage','node','recentLogs','error','outputDir'])assert.ok(key in detail,key);
 fs.writeFileSync(path.join(dir,'experiment_index.json'),JSON.stringify([
  {global_job_id:'wf-interrupted',type:'workflow',status:'interrupted'},
  {global_job_id:'wf-completed-errors',type:'workflow',status:'completed_with_errors'},
  {global_job_id:'run-normal',type:'worker_run',status:'normal_completed'},
  {global_job_id:'run-manual-stop',type:'worker_run',status:'manual_interrupted_completed'}]),'utf8');
 const terminal=await queryProject(root,rpc,'experiment_list',{full:true}),statuses=Object.fromEntries(terminal.map(row=>[row.id,row.status]));
 assert.equal(statuses['wf-interrupted'],'cancelled');assert.equal(statuses['wf-completed-errors'],'failed');assert.equal(statuses['run-normal'],'success');assert.equal(statuses['run-manual-stop'],'cancelled');
 const cancelled=await queryProject(root,rpc,'experiment_list',{status:'cancelled'});assert.deepEqual(cancelled.map(row=>row.id).sort(),['run-manual-stop','wf-interrupted']);
 const unknown=await queryProject(root,rpc,'experiment_list',{status:'unknown'});assert.equal(unknown.some(row=>['wf-interrupted','run-manual-stop'].includes(row.id)),false);
 const inspected=await queryProject(root,rpc,'experiment_inspect',{id:'wf-interrupted'});assert.equal(inspected.summary.status,'cancelled');
});

test('MCP active result identities survive order changes and never fall back to history',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'g004-result-identity-')),history=path.join(root,'simple_cluster','results');fs.mkdirSync(history,{recursive:true});
 fs.writeFileSync(path.join(history,'result_registry.json'),JSON.stringify({records:[{resultId:'stale',experimentId:'old',metrics:{auc:{value:1}},sourceFiles:[]}]}),'utf8');
 const make=(workerId,runId,seed,protocol)=>({planFile:'plans/p.yaml',workerId,runId,workflowId:'p',revision:'r',codeFingerprint:'hash',dimensions:{case:'baseline',seed,eval_protocol:protocol,dataset:'bus'},metrics:{auc:0.8+seed/100},sourceFiles:[{path:'work/'+runId}],completionState:'verified',aggregationState:'eligible'});
 let records=[make('a','run-0',0,'clean'),make('a','run-0',1,'clean'),make('a','run-0',0,'shift'),make('b','run-0',0,'clean')],current=true;
 const rpc=async method=>{assert.equal(method,'results.list');return {source:'active_query',results:records.slice(0,1),summary:{current,observedAt:'2026-10-30T00:00:00Z',results:records}}};
 const rows=await queryProject(root,rpc,'result_list',{});assert.equal(rows.length,4);assert.equal(new Set(rows.map(row=>row.id)).size,4);assert.ok(rows.every(row=>row.current&&row.source==='active_query'));
 records.reverse();assert.deepEqual((await queryProject(root,rpc,'result_list',{})).map(row=>row.id).sort(),rows.map(row=>row.id).sort());
 const id=rows[0].id;await assert.rejects(queryProject(root,rpc,'metric_show',{id:'run-0'}),/AMBIGUOUS/);
 await assert.rejects(queryProject(root,rpc,'result_compare',{left:'run-0',right:id}),/AMBIGUOUS/);
 await assert.rejects(queryProject(root,rpc,'result_compare',{left:id,right:'run-0'}),/AMBIGUOUS/);
 assert.equal((await queryProject(root,rpc,'metric_show',{id})).auc,0.8);
 const compared=await queryProject(root,rpc,'result_compare',{left:id,right:rows[1].id});assert.equal(compared.left,id);
 const detail=await queryProject(root,rpc,'result_show',{id});assert.equal(detail.seed,0);assert.equal(detail.metrics.auc,0.8);assert.equal(detail.current,true);
 const exported=await queryProject(root,rpc,'result_export',{id,format:'json'});assert.equal(exported.current,true);assert.equal(JSON.parse(exported.content).metrics.auc,0.8);assert.equal(JSON.parse(exported.content).rows.length,1);
 records=[make('a','unique-command',0,'clean')];assert.equal((await queryProject(root,rpc,'result_show',{id:'unique-command'})).experimentId,'unique-command');
 assert.equal((await queryProject(root,rpc,'metric_show',{id:'unique-command'})).auc,0.8);
 await assert.rejects(queryProject(root,rpc,'metric_show',{id:'missing'}),/result not found: missing/);
 assert.match((await queryProject(root,rpc,'result_compare',{left:'missing',right:'unique-command'})).reason,/no results recorded for missing/);
 current=false;await assert.rejects(queryProject(root,rpc,'result_export',{id,format:'json'}),/RESULT_QUERY_UNVERIFIED/);
 await assert.rejects(queryProject(root,async()=>{throw Error('connection reset')},'result_list',{}),/connection reset/);
});

test('MCP active results exclude diagnostic-only log rows',async()=>{
 const record={resultId:'worker-result-1',experimentId:'suite/baseline/seed_7',runKey:'run',status:'parsed',metrics:{accuracy:{value:0.91}},dimensions:{seed:7},primaryMetric:'accuracy',sourceFiles:[{path:'experiments/results/demo.csv',type:'csv',endpoint:'worker'}]};
 const calls=[];const rpc=async method=>{calls.push(method);assert.equal(method,'results.list');return {source:'active_query',summary:{current:true,observedAt:'2026-10-30T00:00:00Z'},results:[record,{...record,resultId:'worker-stderr-row0',sourceFiles:[{path:'work_dirs/demo/stderr.log',type:'text',endpoint:'worker'}]}]}};
 const rows=await queryProject('fixture',rpc,'result_list',{});assert.equal(rows.length,1);assert.equal(rows[0].experimentId,'suite/baseline/seed_7');assert.equal(rows[0].value,0.91);assert.equal(rows[0].source,'active_query');assert.equal(rows[0].current,true);assert.deepEqual(calls,['results.list']);
});
