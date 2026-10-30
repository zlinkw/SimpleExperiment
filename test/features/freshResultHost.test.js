const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), fsp = require('node:fs/promises'), os = require('node:os'), path = require('node:path'), Module = require('node:module'), ts = require('typescript');
Module._extensions['.ts'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, file);
const { ResultCollectionHost } = require('../../src/extension/ResultCollectionHost.ts');
const { resultDigest } = require('../../src/results/FreshResults.ts');
const { readLatestResultExport, latestResultCatalog, regenerateLatestResultTables } = require('../../src/results/LatestResultExport.ts');
const { fixture, planFile, planText } = require('../_helpers/freshResultHost');
function files(root) { return fs.readdirSync(root, { withFileTypes: true }).flatMap(row => row.isDirectory() ? files(path.join(root,row.name)).map(item => row.name+'/'+item) : [row.name]); }

test('silent memory reads expire without replacing export bytes; genuine progress extends the read and a fresh query recovers',async()=>{
  const f=fixture();await f.service.update();
  const output=path.join(f.root,'experiments/results/latest-results.json'),before=fs.readFileSync(output,'utf8');
  const progressModule=require('../../src/core/ProgressInactivity.ts'),Original=progressModule.ProgressInactivity,receive=f.host.simpleSftpApiCall;
  let now=0,entered,release,watchdog,reportProgress,attempts=0;const messages=[];
  const ready=new Promise(resolve=>entered=resolve),blocked=new Promise(resolve=>release=resolve);
  progressModule.ProgressInactivity=class extends Original{constructor(idle,onIdle){super(idle,onIdle,()=>now);watchdog=this;}};
  f.host.simpleSftpApiCall=async(method,params,_timeout,onProgress)=>{attempts++;reportProgress=onProgress;entered();await blocked;return receive(method,params);};
  let pending;
  try{
    pending=f.service.update(undefined,{onProgress:value=>messages.push(value.message)});await ready;
    assert.equal(watchdog.idleMs,120000);now=119999;assert.equal(watchdog.check(),false);
    reportProgress({phase:'streaming',processedBytes:16,processedFiles:0});
    now=239998;assert.equal(watchdog.check(),false);reportProgress({phase:'streaming',processedBytes:16,processedFiles:0});
    now=239999;assert.equal(watchdog.check(),true);
    const expired=await pending;assert.equal(expired.current,false);assert.equal(attempts,1);
    assert.equal(fs.readFileSync(output,'utf8'),before);assert.match(expired.missing.join(' '),/RESULT_READ_IDLE/);
    assert.ok(messages.some(message=>message.includes('16 字节')));
    f.host.simpleSftpApiCall=receive;assert.equal((await f.service.update()).current,true);
    const recovered=fs.readFileSync(output,'utf8');release();await new Promise(resolve=>setImmediate(resolve));
    assert.equal(fs.readFileSync(output,'utf8'),recovered);
  }finally{release();watchdog?.dispose();progressModule.ProgressInactivity=Original;if(pending)await pending;}
});

test('cancelling an uncooperative capability read releases the query and ignores its late response',async()=>{
  const f=fixture(),abort=new AbortController(),capability=f.host.simpleSftpCapability;
  let entered,release,reads=0,lateFinished=false;
  const ready=new Promise(resolve=>entered=resolve),blocked=new Promise(resolve=>release=resolve);
  f.host.simpleSftpCapability=async()=>{if(++reads===1){entered();await blocked;lateFinished=true;}return capability();};
  const first=f.service.update(abort.signal).then(()=>assert.fail('cancelled read cannot publish'),error=>assert.equal(error.name,'AbortError'));
  try{
    await ready;abort.abort();await first;
    const report=await f.service.update();
    assert.equal(report.current,true);assert.equal(reads,2);assert.equal(lateFinished,false);
    assert.equal(f.calls.filter(row=>row[0]==='sync.downloadMappedPaths').length,1);
    const output=path.join(f.root,'experiments/results/latest-results.json'),before=fs.readFileSync(output,'utf8');
    release();await new Promise(resolve=>setImmediate(resolve));
    assert.equal(fs.readFileSync(output,'utf8'),before);assert.equal(f.calls.filter(row=>row[0]==='sync.downloadMappedPaths').length,1);
  }finally{release();await first;}
});

test('waiting progress names the slow Worker and never publishes before all Worker checks finish',async()=>{
  const f=fixture(),abort=new AbortController(),read=f.host.client.getWorkerTasks,messages=[],seen=[];
  let entered,release;
  const ready=new Promise(resolve=>entered=resolve),blocked=new Promise(resolve=>release=resolve),worker=f.host.workerCodeSyncTargets()[0];
  f.host.workerCodeSyncTargets=()=>[worker,{...worker,id:'b'}];
  f.host.client.getWorkerTasks=async(id,options)=>{
    seen.push(id);if(id==='b'){entered();await blocked;return{queryComplete:true,capabilities:{resultCollection:1},tasks:[],declaredResults:[]};}
    return read(id,options);
  };
  const pending=f.service.update(abort.signal,{onProgress:row=>messages.push(row.message)}).catch(error=>assert.equal(error.name,'AbortError'));
  try{
    await ready;assert.ok(seen.includes('a')&&seen.includes('b'));
    assert.ok(messages.some(message=>/b · 产物状态 · 第 1\/3 次/.test(message)&&message.includes('单次上限 30 秒')));
    assert.equal(fs.existsSync(path.join(f.root,'experiments/results/latest-results.json')),false);
    abort.abort();await pending;
  }finally{release();await pending;}
});

test('cancellable callers share one verified read and one cancellation leaves the other reader intact',async()=>{
  const f=fixture(),a=new AbortController(),b=new AbortController(),messages=[];
  let release;f.block(new Promise(resolve=>release=resolve));
  let firstCancelled=false;
  const first=f.service.update(a.signal).then(()=>false,error=>{firstCancelled=error.name==='AbortError';return firstCancelled;});
  const second=f.service.update(b.signal,{onProgress:progress=>messages.push(progress.message)});
  try { a.abort();await new Promise(resolve=>setImmediate(resolve));assert.equal(firstCancelled,true); }
  finally { release(); }
  await first;const report=await second;assert.equal(report.current,true);
  assert.equal(f.calls.filter(row=>row[2]?.discovery).length,1);
  assert.equal(report.memoryRequests,1);
  assert.ok(messages.some(message=>message.includes('PLAN')));
  assert.ok(messages.some(message=>message.includes('内存读取指标 · a')));
  assert.ok(messages.some(message=>message.includes('保存本机结果')));
});

test('queued cancellation responds without waiting for the active scope or starting another query',async()=>{
  const f=fixture(),abort=new AbortController();let release,settled=false;
  f.block(new Promise(resolve=>release=resolve));const active=f.service.update();
  const queued=f.service.update(abort.signal,{planFiles:['absent']}).catch(error=>{settled=true;assert.equal(error.name,'AbortError');});
  try { abort.abort();await new Promise(resolve=>setImmediate(resolve));assert.equal(settled,true); }
  finally { release(); }
  await Promise.all([active,queued]);assert.equal(f.calls.filter(row=>row[2]?.discovery).length,1);
});

test('automatic readers share cancellation while a joined manual reader keeps its verified query',async()=>{
  const f=fixture();let release;f.block(new Promise(resolve=>release=resolve));
  let cancelledReaders;
  const first=f.service.refreshAutomatic(),second=f.service.refreshAutomatic(),cancelled=Promise.all([first,second]).then(value=>cancelledReaders=value);
  const manual=f.service.update(new AbortController().signal);
  try { f.host.lowTrafficMode=true;f.service.suspendAutomatic();await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(cancelledReaders,[undefined,undefined]); }
  finally { release(); }
  await cancelled;assert.equal((await manual).current,true);
  assert.equal(f.calls.filter(row=>row[2]?.discovery).length,1);
});

test('strict manual mode suppresses tab and completion reads while explicit refresh remains available',async()=>{
  const f=fixture();f.host.lowTrafficMode=true;
  f.service.refreshOnVisible();f.service.observe({queryComplete:true,capabilities:{resultCollection:1},tasks:[]});
  await f.service.refreshAutomatic();assert.equal(f.calls.length,0);
  const report=await f.service.update();assert.equal(report.current,true);assert.ok(f.calls.length>0);
  f.host.lowTrafficMode=false;let started;
  const entered=new Promise(resolve=>started=resolve),original=f.host.client.getWorkerTasks;
  f.host.client.getWorkerTasks=async(...args)=>{started();await new Promise(resolve=>args[1].signal.addEventListener('abort',resolve,{once:true}));return original(...args);};
  const pending=f.service.refreshAutomatic();await entered;
  f.host.lowTrafficMode=true;f.service.suspendAutomatic();assert.equal(await pending,undefined,'intentional automatic cancellation is not an outage');
});

test('selected PLAN queries restrict server reads and preserve the full export and display summary',async()=>{
  const f=fixture();await f.service.update();const summary=f.host.resultsSummary;
  const exportFile=path.join(f.root,'experiments/results/latest-results.json'),before=fs.readFileSync(exportFile,'utf8');
  const current=f.host.currentResultPlanInputs;f.host.currentResultPlanInputs=async()=>[...await current(),{planFile:'experiments/plans/other.yaml',revision:'other',mode:'test',seeds:[42],jobCount:1}];
  f.calls.length=0;const report=await f.service.update(undefined,{planFiles:['demo']});
  assert.equal(report.scope,'selected_plans');assert.equal(report.current,true);assert.equal(report.exported,false);
  assert.equal(report.discovered,1);assert.equal(f.host.resultsSummary,summary);
  assert.equal(fs.readFileSync(exportFile,'utf8'),before);
  assert.ok(f.calls.filter(row=>row[0]==='tasks').every(row=>!row[2].discovery||row[2].discovery.planFile===planFile));
  assert.ok(f.calls.filter(row=>row[0]==='tasks').flatMap(row=>row[2].declarations||[]).every(row=>row.planFile===planFile));
  await assert.rejects(f.service.update(undefined,{planFiles:['absent']}),/不存在或不唯一/);
});

test('repeated declaration errors group by Worker and reason and keep job and PLAN units distinct',async()=>{
  const f=fixture(),other='experiments/plans/other.yaml';
  fs.writeFileSync(path.join(f.root,other),planText,'utf8');
  const input=(await f.host.currentResultPlanInputs())[0];
  f.host.currentResultPlanInputs=async()=>[input,{...input,planFile:other}];
  const messages=[];f.offline(true);const report=await f.service.update(undefined,{onProgress:row=>messages.push(row.message)});
  const group=report.issueGroups.find(row=>row.workerId==='a'&&row.message==='offline');
  assert.deepEqual(group.affected,[planFile,other]);
  assert.equal(report.counts.plans,2);assert.equal(report.counts.unknownJobs,4);
  assert.equal(report.counts.unverifiedPlans,2);assert.equal(report.counts.completeJobs,0);
  assert.equal(report.current,false);
  assert.ok(messages.some(message=>message==='已处理 PLAN 声明 2/2；已核实 0；待核实 2'));
});

test('manual result collection recovers transient discovery, file observation and memory read failures',async()=>{
  const f=fixture(),read=f.host.client.getWorkerTasks,receive=f.host.simpleSftpApiCall;
  const failed=new Set(),messages=[];let attempts=0;
  f.host.client.getWorkerTasks=async(...args)=>{
    const stage=args[1].discovery?'declarations':'observations';
    if(!failed.has(stage)){failed.add(stage);throw TypeError('fetch failed');}
    return read(...args);
  };
  f.host.simpleSftpApiCall=async(...args)=>{if(++attempts===1)throw Object.assign(Error('socket hang up'),{code:'ECONNRESET'});return receive(...args);};
  const report=await f.service.update(undefined,{onProgress:row=>messages.push(row.message)});assert.equal(report.completed,1);assert.equal(report.current,true);
  assert.equal(attempts,2);assert.equal(failed.size,2);
  assert.ok(messages.some(message=>message.includes('第 2/3 次')));
});

test('persistent result transport failures are bounded, preserve the published table and never retry identity errors',async()=>{
  const f=fixture();await f.service.update();
  const target=path.join(f.root,'experiments/results/latest-results.json'),before=fs.readFileSync(target,'utf8');
  let attempts=0;f.host.simpleSftpApiCall=async()=>{attempts++;throw TypeError('fetch failed');};
  const report=await f.service.update();assert.equal(attempts,3);assert.equal(report.current,false);
  assert.equal(fs.readFileSync(target,'utf8'),before);assert.match(report.missing.join(' '),/连接|fetch failed/);
  attempts=0;f.host.simpleSftpApiCall=async()=>{attempts++;throw Error('SFTP_WORKSPACE_MISMATCH');};
  await f.service.update();assert.equal(attempts,1);
});

test('project changes during a failed read stop result retries and prevent stale publication',async()=>{
  const f=fixture();let active=true,attempts=0;
  f.host.projectContextIsCurrent=()=>active;
  f.host.simpleSftpApiCall=async()=>{attempts++;active=false;throw TypeError('fetch failed');};
  await assert.rejects(f.service.update(),/变化|取消/);assert.equal(attempts,1);
  assert.equal(fs.existsSync(path.join(f.root,'experiments/results/latest-results.json')),false);
});
test('artifact-only aggregation retains verified metrics independently of task console diagnostics',async()=>{
  const f=fixture();await f.service.update();
  f.raw['work_dirs/alpha42/metrics.csv']='0';const original=JSON.stringify(f.raw),read=f.host.client.getWorkerTasks;
  f.host.client.getWorkerTasks=async(...args)=>{const value=await read(...args);for(const job of value.declaredResults||[])job.runtimeDiagnostics={schemaVersion:1,commandId:'command',runId:'command',state:'anomalous',count:1,scanComplete:true,types:{AttributeError:1},phases:{train:1}};return value;};
  const report=await f.service.update();assert.equal(report.completed,1);assert.equal(report.artifactsComplete,1);assert.equal(report.reviewRequired,0);
  assert.equal(report.results[0].metrics.auc,0);assert.equal(report.results[0].completionState,'review_required');
  const latest=await readLatestResultExport(f.root,'experiments/results');
  assert.ok(latest.tables.length);assert.ok(latest.tables.every(table=>!table.relativePath.startsWith('review/')));
  const catalog=await latestResultCatalog(f.root,'experiments/results');assert.ok(catalog.datasets.flatMap(row=>row.tables).every(table=>!table.tableKey.startsWith('review/')));
  assert.equal(JSON.stringify(f.raw),original);
});
test('production collection uses only live declarations and native files; saves one final JSON and CSV/Markdown; deletion replaces rows', async () => {
  const f = fixture(); let report = await f.service.update();
  assert.equal(report.current, true); assert.equal(report.completed, 1);
  const exported = await readLatestResultExport(f.root, 'experiments/results'); assert.equal(exported.tables.length, 2);
  assert.equal('records' in exported, false); assert.equal('plans' in exported, false);
  const outputs = files(f.root); assert.equal(outputs.filter(file => file.endsWith('.json')).length, 1);
  assert.ok(outputs.includes('experiments/results/latest-results.json')); assert.ok(!outputs.some(file => /registry|publication|provenance|backup|writing|raw\//.test(file)));
  f.gone(true); report = await f.service.update(); assert.equal(report.completed, 0); assert.equal(report.jobs[0].state, 'missing');
  assert.equal((await readLatestResultExport(f.root, 'experiments/results')).tables.length, 0);
  assert.equal((await latestResultCatalog(f.root, 'experiments/results')).datasets.length, 0, 'old CSV directories cannot reappear in the catalog');
});
test('unobserved catalog declarations do not inflate the aggregation denominator, while known missing runs remain visible',async()=>{
  const f=fixture(),other='experiments/plans/unobserved.yaml',getInputs=f.host.currentResultPlanInputs,read=f.host.client.getWorkerTasks;
  fs.writeFileSync(path.join(f.root,other),planText,'utf8');
  f.host.currentResultPlanInputs=async()=>[...(await getInputs()),{...(await getInputs())[0],planFile:other}];
  f.host.client.getWorkerTasks=async(id,options)=>{
    const value=await read(id,options);
    if(options.discovery?.planFile===other)value.declaredJobs=value.declaredJobs.map(row=>({...row,output_dir:'work_dirs/unobserved',result_csv:'work_dirs/unobserved/metrics.csv'}));
    if(!options.discovery)value.declaredResults.push({index:0,outputDir:'work_dirs/unobserved',completed:false,resultState:'missing'});
    return value;
  };
  let report=await f.service.update();assert.equal(report.completed,1);assert.equal(report.expected,1);assert.equal(report.catalogExpected,2);
  assert.equal(report.unobservedDeclarations,1);assert.equal(report.missing.length,0);
  f.host.distributedQueueCache={plans:[{id:'known',projectId:f.root,planFile:other,jobs:[]}]};
  report=await f.service.update();assert.equal(report.expected,2);assert.equal(report.missing.length,1);
});
test('offline preserves export bytes but never reuses its rows as current results; returning connection retries', async () => {
  const f = fixture(); await f.service.update(); const file = path.join(f.root,'experiments/results/latest-results.json'), before = fs.readFileSync(file,'utf8');
  f.offline(true); const stale = await f.service.update(); assert.equal(stale.current,false); assert.equal(stale.results.length,0); assert.equal(fs.readFileSync(file,'utf8'),before);
  f.offline(false); assert.equal((await f.service.update()).current,true);
});
test('legacy Worker rejects direct collection before downloading, not by falling back to old status files', async () => {
  const f = fixture(); f.protocol(0); const report = await f.service.update();
  assert.equal(report.current,false); assert.equal(report.results.length,0); assert.match(report.skipped.join(' '),/更新/);
  assert.equal(f.calls.filter(call => call[0] === 'sync.downloadMappedPaths').length,0);
});
test('reload rebuilds from real files with no discovery state on disk, and duplicate requests share work', async () => {
  const f = fixture(); let unblock; f.block(new Promise(resolve => { unblock = resolve; }));
  const first = f.service.update(), second = f.service.update(); unblock(); await Promise.all([first,second]);
  f.block(undefined); const prior = f.calls.length; await new ResultCollectionHost(f.host).update();
  assert.ok(f.calls.slice(prior).some(call => call[2]?.discovery));
  assert.equal(files(f.root).filter(file => file.endsWith('.json')).length,1);
});
test('JSON commits atomically before independent tables; a table write interruption needs regeneration, not transaction recovery', async () => {
  const f = fixture(); await f.service.update(); f.raw['work_dirs/alpha42/metrics.csv'] = '0.7';
  const rename = fsp.rename; let interrupted = false;
  fsp.rename = async (source,dest) => { if (!interrupted && dest.endsWith('.csv')) { interrupted = true; throw Object.assign(Error('interrupted'),{code:'EIO'}); } return rename(source,dest); };
  try { await assert.rejects(f.service.update(),/interrupted/); } finally { fsp.rename = rename; }
  const latest = await readLatestResultExport(f.root,'experiments/results');
  assert.equal(latest.tables[0].rows[0][latest.tables[0].header.indexOf('roc_auc_mean')],.7);
  await regenerateLatestResultTables(f.root,'experiments/results',latest);
  assert.match(fs.readFileSync(path.join(f.root,'experiments/results',latest.tables[0].relativePath),'utf8'),/0.7/);
  assert.ok(!files(f.root).some(file => /registry|publication|backup/.test(file)));
});
test('real local plan edits during a request block publication', async () => {
  const f = fixture(); const receive = f.host.simpleSftpApiCall;
  f.host.simpleSftpApiCall = async (...args) => { const result = await receive(...args); fs.writeFileSync(path.join(f.root,planFile),planText+'# changed\n','utf8'); return result; };
  await assert.rejects(f.service.update(),/PLAN 已变化/);
  assert.equal(fs.existsSync(path.join(f.root,'experiments/results/latest-results.json')),false);
});
test('a newer submission during memory reads prevents late publication of the old run',async()=>{
  const f=fixture(),read=f.host.simpleSftpApiCall;
  f.host.distributedQueueCache={plans:[{id:'workflow',projectId:f.root,planFile,revision:'original',codeFingerprint:'a'.repeat(64),
    enqueuedAt:'2026-10-17',jobs:[{index:0,case:'alpha',seed:42,outputDir:'work_dirs/alpha42',collectionResultCsv:'work_dirs/alpha42/metrics.csv',commandId:'command',workerId:'a'}]}]};
  f.host.simpleSftpApiCall=async(...args)=>{const value=await read(...args);f.host.distributedQueueCache.plans[0].jobs[0].commandId='new-command';return value;};
  await assert.rejects(f.service.update(),/取消|变化/);
  assert.equal(fs.existsSync(path.join(f.root,'experiments/results/latest-results.json')),false);
});

test('normal dispatch of another job during memory reads keeps verified result publication current',async()=>{
  for(const scoped of [false,true]){
    const f=fixture(),read=f.host.simpleSftpApiCall;
    f.host.distributedQueueCache={plans:[{id:'workflow',projectId:f.root,planFile,revision:'original',codeFingerprint:'a'.repeat(64),
      jobs:[{index:0,case:'alpha',seed:42,outputDir:'work_dirs/alpha42',collectionResultCsv:'work_dirs/alpha42/metrics.csv',commandId:'command',workerId:'a'},
        {index:1,case:'beta',seed:43,outputDir:'work_dirs/beta43',collectionResultCsv:'work_dirs/beta43/metrics.csv',status:'pending'}]}]};
    f.host.simpleSftpApiCall=async(...args)=>{const value=await read(...args);Object.assign(f.host.distributedQueueCache.plans[0].jobs[1],{status:'running',commandId:'other-command',workerId:'a'});return value;};
    const report=await f.service.update(undefined,scoped?{planFiles:[planFile]}:{});
    assert.equal(report.current,true);assert.equal(report.results.length,1);assert.equal(report.results[0].runId,'command');
    assert.equal(report.exported,!scoped);assert.equal(fs.existsSync(path.join(f.root,'experiments/results/latest-results.json')),!scoped);
  }
});
test('cancellation during a memory read publishes nothing and a later fresh query succeeds', async () => {
  const f = fixture(), controller = new AbortController(), receive = f.host.simpleSftpApiCall;
  f.host.simpleSftpApiCall = async (...args) => { const value = await receive(...args); controller.abort(); return value; };
  await assert.rejects(f.service.update(controller.signal), /取消/);
  assert.equal(fs.existsSync(path.join(f.root,'experiments/results/latest-results.json')),false);
  f.host.simpleSftpApiCall = receive;
  assert.equal((await f.service.update()).current,true);
});
test('independent callers serialize final output without persistent operation leases', async () => {
  const f = fixture();
  const reports = await Promise.all([f.service.update(),new ResultCollectionHost(f.host).update()]);
  assert.ok(reports.every(report => report.current));
  const exported = await readLatestResultExport(f.root,'experiments/results');
  assert.equal(exported.tables.length,2);
  assert.ok(!files(f.root).some(file => /lease|registry|publication|backup|writing/.test(file)));
});
test('a real occupied kernel writer blocks publication without a lock file and releases cleanly', async () => {
  const net = require('node:net'), f = fixture();
  let canonical = path.join(fs.realpathSync(f.root),'experiments/results');
  if (process.platform === 'win32') canonical = canonical.toLowerCase();
  const digest = resultDigest(canonical), server = net.createServer(socket => socket.destroy());
  const address = process.platform === 'win32' ? {path:'\\\\.\\pipe\\simpleex-results-'+digest}
    : {host:'127.0.0.1',port:49152+parseInt(digest.slice(0,4),16)%16384,exclusive:true};
  await new Promise((resolve,reject) => {server.once('error',reject);server.listen(address,resolve);});
  try {
    await assert.rejects(f.service.update(),/其他窗口更新/);
    assert.equal(fs.existsSync(path.join(f.root,'experiments/results/latest-results.json')),false);
  } finally { await new Promise(resolve => server.close(resolve)); }
  assert.equal((await f.service.update()).current,true);
});
