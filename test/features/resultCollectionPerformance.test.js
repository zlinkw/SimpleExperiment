const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), fsp = require('node:fs/promises'), path = require('node:path');
const Module = require('node:module'), ts = require('typescript'), cp = require('node:child_process');
const baseline = process.env.SIMPLE_RESULT_BASELINE === '1';
Module._extensions['.ts'] = (mod, file) => {
  let source = fs.readFileSync(file, 'utf8');
  if (baseline && /[\\/](FreshResults|LatestResultExport|ResultCollectionHost)\.ts$/.test(file)) {
    const read = cp.spawnSync('git', ['show', '789c9144037ffd57a658cd7118121e694fcce960:' + path.relative(process.cwd(), file).replaceAll('\\', '/')], {encoding:'utf8',timeout:10000,windowsHide:true});
    assert.equal(read.status, 0); source = read.stdout;
  }
  mod._compile(ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText, file);
};
const { fixture, planFile, planText } = require('../_helpers/freshResultHost');
const { resultDigest } = require('../../src/results/FreshResults.ts');
const { readLatestResultExport, regenerateLatestResultTables } = require('../../src/results/LatestResultExport.ts');

function manyJobs(count = 48) {
  const f = fixture(), jobs = [];
  for (let index=0; index<count; index++) {
    const output_dir='work_dirs/job'+index, result_csv=output_dir+'/metrics.csv';
    jobs.push({index,case:'alpha',seed:42,output_dir,result_csv,planHash:resultDigest(planText)});
    f.raw[output_dir+'/artifact_manifest.json']=JSON.stringify({simpleExperiment:{runId:'cmd'+index,status:'completed',mode:'test',job:{index,case:'alpha',seed:42},outputDir:output_dir,resultCsv:result_csv,weights:[]}});
    f.raw[result_csv]='0';
  }
  const worker=f.host.workerCodeSyncTargets()[0];
  let discovery=0, observations=0;
  f.host.client.getWorkerTasks=async(id, options)=>{
    if(options.discovery){discovery++;return{queryComplete:true,capabilities:{resultCollection:1},declaredJobs:jobs};}
    observations++;
    return{queryComplete:true,capabilities:{resultCollection:1},tasks:[],declaredResults:jobs.map(job=>({index:job.index,outputDir:job.output_dir,completed:true,runId:'cmd'+job.index,exitCode:0,
      runtimeDiagnostics:{schemaVersion:1,commandId:'cmd'+job.index,runId:'cmd'+job.index,state:'clear',count:0,scanComplete:true},
      files:[job.output_dir+'/artifact_manifest.json',job.result_csv].map(remotePath=>({remotePath,bytes:Buffer.byteLength(f.raw[remotePath]),sha256:resultDigest(f.raw[remotePath])}))}))};
  };
  return {...f,jobs,worker,counts:()=>({discovery,observations})};
}
test('48 jobs keep exact fresh proofs with three bounded memory transfers instead of 48 SSH streams',async t=>{
  const f=manyJobs(),receive=f.host.simpleSftpApiCall;
  f.host.simpleSftpApiCall=async(...args)=>{await new Promise(resolve=>setTimeout(resolve,20));return receive(...args);};
  const started=performance.now(),report=await f.service.update();
  t.diagnostic(JSON.stringify({baseline,elapsedMs:Math.round(performance.now()-started),transfers:f.calls.filter(call=>call[0]==='sync.downloadMappedPaths').length}));
  assert.equal(report.completed,48);assert.equal(report.results.length,48);
  const transfers=f.calls.filter(call=>call[0]==='sync.downloadMappedPaths');
  assert.equal(transfers.length,3);
  assert.deepEqual(report.jobs.map(job=>job.commandId),f.jobs.map(job=>'cmd'+job.index));
  assert.ok(transfers.every(([,params])=>params.entries.reduce((sum,file)=>sum+file.bytes,0)<=4*1024*1024));
  assert.equal(report.memoryFiles,96);assert.equal(report.queryTiming.totalMs>=0,true);
});
test('a broken file in a combined read cannot discard the other jobs or conceal a failed source',async()=>{
  const f=manyJobs(16),receive=f.host.simpleSftpApiCall;
  f.host.simpleSftpApiCall=async(method,params)=>{
    if(params.entries.some(file=>file.remotePath==='work_dirs/job7/metrics.csv'))throw Error('changed file');
    return receive(method,params);
  };
  const report=await f.service.update();assert.equal(report.completed,15);
  assert.equal(report.jobs[7].state,'unknown');assert.match(report.jobs[7].error,/changed file/);
  assert.ok(report.jobs.every((job,index)=>index===7||job.state==='complete'));
});
test('offline discovery is bounded per refresh while every enabled Worker still gets full file observations',async()=>{
  const f=manyJobs(1),read=f.host.client.getWorkerTasks;let failures=0;const observed=[];
  f.host.workerCodeSyncTargets=()=>[{...f.worker,id:'slow'},f.worker];
  const inputs=Array.from({length:12},(_,index)=>({planFile:'experiments/plans/p'+index+'.yaml',revision:resultDigest(planText),mode:'test',seeds:[42]}));
  for(const input of inputs)fs.writeFileSync(path.join(f.root,input.planFile),planText,'utf8');
  f.host.currentResultPlanInputs=async()=>inputs;
  f.host.client.getWorkerTasks=async(id,options)=>{
    if(!options.discovery)observed.push([id,options.declarations.length]);
    if(id==='slow'){if(options.discovery)failures++;throw Error('fetch failed');}
    return read(id,options);
  };
  await f.service.update();assert.ok(failures<=4,'offline Worker was retried for each PLAN: '+failures);
  assert.deepEqual(observed,[['slow',12],['a',12]]);
});
test('declaration mismatch on one PLAN does not quarantine a healthy Worker for other PLANs',async()=>{
  const f=manyJobs(1),read=f.host.client.getWorkerTasks;let calls=0;
  const second='experiments/plans/second.yaml';fs.writeFileSync(path.join(f.root,second),planText,'utf8');
  const input=(await f.host.currentResultPlanInputs())[0];f.host.currentResultPlanInputs=async()=>[input,{...input,planFile:second}];
  f.host.client.getWorkerTasks=async(id,options)=>{const response=await read(id,options);if(options.discovery){calls++;if(options.discovery.planFile===planFile)response.declaredJobs=[];}return response;};
  const report=await f.service.update();assert.equal(calls,2);assert.deepEqual(report.plans,[second]);
});
test('PLAN-specific HTTP errors cannot quarantine the server for later declaration batches',async()=>{
  const f=manyJobs(1),read=f.host.client.getWorkerTasks;
  const inputs=Array.from({length:8},(_,index)=>({planFile:'experiments/plans/p'+index+'.yaml',revision:resultDigest(planText),mode:'test',seeds:[42]}));
  for(const input of inputs)fs.writeFileSync(path.join(f.root,input.planFile),planText,'utf8');
  f.host.currentResultPlanInputs=async()=>inputs;
  f.host.client.getWorkerTasks=async(id,options)=>{if(options.discovery?.planFile===inputs[0].planFile)throw Error('Worker Agent HTTP 400: PLAN_DECLARATIONS_QUERY_FAILED');return read(id,options);};
  const report=await f.service.update();assert.equal(report.plans.length,7);assert.ok(report.plans.includes(inputs[7].planFile));
});
test('actual endpoint replacement during reads rejects late publication',async()=>{
  const f=fixture(),receive=f.host.simpleSftpApiCall;
  f.host.simpleSftpApiCall=async(...args)=>{const value=await receive(...args);const workers=f.host.workerCodeSyncTargets();f.host.workerCodeSyncTargets=()=>workers.map(w=>({...w,port:w.port+1}));return value;};
  await assert.rejects(f.service.update(),/变化/);
  assert.equal(fs.existsSync(path.join(f.root,'experiments/results/latest-results.json')),false);
});
test('health rebuilding a client for identical targets does not invalidate current file verification',async()=>{
  const f=fixture(),read=f.host.client.getWorkerTasks;let requests=0;
  f.host.client.getWorkerTasks=async(...args)=>{if(requests++)throw Error('client disposed');const value=await read(...args);f.host.client={getWorkerTasks:read};return value;};
  const report=await f.service.update();assert.equal(report.completed,1);assert.equal(report.current,true);
});
test('unchanged bytes cannot bypass the hardlink protection in local rebuild',async()=>{
  const f=fixture();await f.service.update();const value=await readLatestResultExport(f.root,'experiments/results');
  const target=path.join(f.root,'experiments/results',value.tables[0].relativePath);
  fs.linkSync(target,path.join(f.root,'outside-table.csv'));
  await assert.rejects(regenerateLatestResultTables(f.root,'experiments/results',value),/RESULT_EXPORT_PATH_UNSAFE/);
});
test('local rebuild compares actual bytes: no unchanged flushes; exactly one damaged table is repaired',async()=>{
  const f=fixture();await f.service.update();const value=await readLatestResultExport(f.root,'experiments/results');
  const rename=fsp.rename;let writes=0;
  fsp.rename=async(...args)=>{writes++;return rename(...args);};
  try{
    await regenerateLatestResultTables(f.root,'experiments/results',value);assert.equal(writes,0);
    const target=path.join(f.root,'experiments/results',value.tables[0].relativePath);
    fs.writeFileSync(target,'damaged','utf8');
    await regenerateLatestResultTables(f.root,'experiments/results',value);assert.equal(writes,1);
    assert.notEqual(fs.readFileSync(target,'utf8'),'damaged');
    assert.equal(f.calls.filter(call=>call[0]==='tasks').length,2,'local rebuild must not contact any server');
  }finally{fsp.rename=rename;}
});
test('51 unchanged tables matching the current catalog scale avoid all 102 durable rewrites',async t=>{
  const f=fixture();await f.service.update();const value=await readLatestResultExport(f.root,'experiments/results');
  value.tables=Array.from({length:51},(_,index)=>({...value.tables[0],tableKey:'t'+index,relativePath:'tables/t'+index+'.csv',markdownPath:'tables/t'+index+'.md'}));
  fs.writeFileSync(path.join(f.root,'experiments/results/latest-results.json'),JSON.stringify(value),'utf8');
  await regenerateLatestResultTables(f.root,'experiments/results',value);
  const rename=fsp.rename;let writes=0;fsp.rename=async(...args)=>{writes++;return rename(...args);};
  const started=performance.now();
  try{await regenerateLatestResultTables(f.root,'experiments/results',value);}finally{fsp.rename=rename;}
  t.diagnostic(JSON.stringify({baseline,elapsedMs:Math.round(performance.now()-started),durableRewrites:writes}));
  assert.equal(writes,0);
});
test('new completion during collection schedules a followup without extending the current manual refresh',async()=>{
  const f=fixture(),receive=f.host.simpleSftpApiCall;let observed=false;
  f.host.simpleSftpApiCall=async(...args)=>{
    if(!observed){observed=true;f.service.observe({workerId:'a',queryComplete:true,capabilities:{resultCollection:1},tasks:[{commandId:'new',observation:{result:{verified:true,runId:'new',status:'completed'},tmux:{dead:true}}}]});}
    return receive(...args);
  };
  await f.service.update();f.host.panelDisposed=true;
  assert.equal(f.calls.filter(call=>call[0]==='sync.downloadMappedPaths').length,1);
});
