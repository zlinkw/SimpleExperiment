const assert=require('node:assert/strict'),test=require('node:test'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
require('../_helpers/registerTsRequire');
const {fixture,planFile,planText}=require('../_helpers/freshResultHost');
const Tables=require('../../src/results/ProjectResultTables.ts');
const {resultDigest}=require('../../src/results/FreshResults.ts');
const source=fs.readFileSync(path.join(__dirname,'../../src/extension/legacy.ts'),'utf8');
const ast=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true);
const parser=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='parseDownloadedMetricCsv').getText(ast);
const parse=new Function('ProjectResultTables',parser+';return parseDownloadedMetricCsv;')(Tables);
function setup(){
  const f=fixture(),declarations=[42,43].map((seed,index)=>({index,case:'alpha',seed,output_dir:'work_dirs/alpha'+seed,result_csv:'work_dirs/alpha'+seed+'/metrics.csv',planHash:resultDigest(planText)}));
  for(const job of declarations)f.raw[job.output_dir+'/artifact_manifest.json']=JSON.stringify({simpleExperiment:{runId:'command-'+job.index,status:'completed',mode:'test',job:{index:job.index,case:job.case,seed:job.seed},outputDir:job.output_dir,resultCsv:job.result_csv,weights:[]}});
  f.host.client.getWorkerTasks=async(_id,options)=>options.discovery?{queryComplete:true,capabilities:{resultCollection:1},declaredJobs:declarations}:
    {queryComplete:true,capabilities:{resultCollection:1},tasks:[],declaredResults:declarations.map(job=>({index:job.index,outputDir:job.output_dir,completed:true,runId:'command-'+job.index,
      runtimeDiagnostics:{schemaVersion:1,commandId:'command-'+job.index,runId:'command-'+job.index,state:'clear',count:0,scanComplete:true},
      files:[job.output_dir+'/artifact_manifest.json',job.result_csv].map(remotePath=>({remotePath,bytes:Buffer.byteLength(f.raw[remotePath]),sha256:resultDigest(f.raw[remotePath])}))}))};
  f.host.parseFreshResultMetric=(text,job)=>parse(text,{},job);
  function values(conflict=false){for(const job of declarations){const first=job.index===0;
    f.raw[job.result_csv]=Tables.writeCsv(['case','seed','method','dataset','metric','value'],(first?[['AUC',.6],['roc_auc',conflict ? .7 : .6],['ECE',.1],['ece',.1]]:[['auc',.8],['ECE',.3]])
      .map(([metric,value])=>[job.case,job.seed,'demo','set',metric,value]));}}
  values();return {...f,values};
}
test('active collection publishes canonical seed means, sample SD and Markdown without raw cache files',async()=>{
  const f=setup(),report=await f.service.update();assert.equal(report.completed,2);
  const output=path.join(f.root,'experiments/results/set/final');
  const csv=fs.readFileSync(path.join(output,'final.csv'),'utf8'),markdown=fs.readFileSync(path.join(output,'final.md'),'utf8');
  const parsed=Tables.readCsv(csv);
  for(const name of ['roc_auc_mean','ece_mean'])assert.equal(parsed.header.filter(column=>column===name).length,1);
  assert.equal(parsed.rows[0][parsed.header.indexOf('roc_auc_mean')],'0.7');
  assert.equal(parsed.rows[0][parsed.header.indexOf('ece_mean')],'0.2');
  for(const name of ['roc_auc_sd','ece_sd'])assert.ok(Math.abs(Number(parsed.rows[0][parsed.header.indexOf(name)])-Math.sqrt(.02))<1e-12);
  assert.match(markdown,/0\.7000 ± 0\.1414/);
  assert.equal(fs.existsSync(path.join(f.root,'simple_cluster/results/project_table_registry.json')),false);
  assert.ok(report.results.every(row=>row.runId&&row.workerId&&row.planFile===planFile));
  const aliases=new Set(report.results.flatMap(row=>Object.keys(row.metrics)));
  assert.deepEqual([...aliases].sort(),['AUC','ECE'],'fresh parser uses the same canonical names as table aggregation');
});

test('configured aliases apply to long and wide CSV without conflating AP and AUPRC',()=>{
  const job={case:'x',seed:42};
  assert.equal(parse('metric,value\ncustom_score,0.8',{},job,{custom_score:'AUC'})[0].metrics.AUC.value,.8);
  const row=parse('score,AP,AUPRC\n0.8,0.4,0.5',{},job,{score:'AUC'})[0];
  assert.deepEqual(row.metrics,{AUC:{value:.8},AP:{value:.4},AUPRC:{value:.5}});
  assert.throws(()=>parse('score,AUC\n0.8,0.9',{},job,{score:'AUC'}),/冲突/);
  assert.equal(parse('AP\n0.4',{},job,{AP:'AUPRC'})[0].metrics.AUPRC.value,.4);
});
test('same-seed alias conflict stays explicit and excludes that seed from the current partial export',async()=>{
  const f=setup();await f.service.update();f.values(true);
  const report=await f.service.update();
  assert.equal(report.completed,1);assert.equal(report.expected,2);
  assert.equal(report.jobs[0].state,'unknown');assert.match(report.jobs[0].error,/冲突/);
  assert.ok(report.results.every(row=>String(row.dimensions.seed)==='43'),'conflicting seed must never enter a published mean');
  const parsed=Tables.readCsv(fs.readFileSync(path.join(f.root,'experiments/results/set/final/final.csv'),'utf8'));
  assert.equal(parsed.rows[0][parsed.header.indexOf('roc_auc_mean')],'0.8','the prior cached 0.7 mean cannot represent this query');
  const saved=JSON.parse(fs.readFileSync(path.join(f.root,'experiments/results/latest-results.json'),'utf8'));
  assert.equal(saved.source,'active_query');assert.equal(saved.jobs[0].state,'unknown');
  assert.ok(saved.jobs[0].error.includes('冲突'));
});
