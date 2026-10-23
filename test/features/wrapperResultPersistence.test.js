const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),test=require('node:test');
const tables=require('../../dist/results/ProjectResultTables'),bundle=require('../../dist/results/WrapperResultBundle');
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
const planFile='experiments/plans/demo.yaml';
const {scenario,exportsApi}=require('../_helpers/resultCollectionScenario');

test('same-named current PLANs keep separate native identities and persist no original metric files',async()=>{
 const f=scenario();for(const [dir,value]of [['comparison',.92],['comparison_tuning',.66]]){const p=f.addPlan(`experiments/plans/${dir}/demo.yaml`,{seeds:[42,43,44]});p.jobs.forEach(j=>f.put(p,j.index,{metric:value,runId:dir+'-'+j.index}));}
 const r=await f.update();assert.equal(r.completed,6);assert.equal(r.included.length,2);assert.equal(f.snapshot().tables.find(t=>t.kind==='final').rows.length,2);
 assert.equal(fs.existsSync(path.join(f.root,'work_dirs')),false);assert.equal(fs.existsSync(path.join(f.root,'tmp/result')),false);
});
test('native final manifests and declared CSVs flow through Host without owner JSON or a registry',async()=>{
 const f=scenario(),p=f.addPlan(undefined,{seeds:[42,43,44]});p.jobs.forEach(j=>f.put(p,j.index));const r=await f.update();assert.equal(r.completed,3);assert.equal(r.artifactsComplete,3);
 assert.ok(f.calls.filter(c=>c.kind==='receive').every(c=>c.params.entries.every(e=>e.remotePath.endsWith('artifact_manifest.json')||p.jobs.some(j=>j.result_csv===e.remotePath))));
 assert.equal(fs.existsSync(path.join(f.root,'simple_cluster/results/project_table_registry.json')),false);
 for(const item of f.snapshot().jobs)for(const source of item.sources)assert.equal(fs.existsSync(path.join(f.root,source.remotePath)),false);
});
for(const [name,workerId,commandId]of [['manual retry','w1','manual-command'],['cross Worker reassignment','w2','moved-command'],['explicit retry after failure','w1','retry-command'],['recall then resubmit','w2','new-command']])test(name+' retains stable declared paths and the new original command identity',async()=>{
 const f=scenario(),p=f.addPlan(undefined,{seeds:[42]});const j=f.put(p,0,{runId:'old-command'});await f.update();f.copies.clear();f.put(p,0,{workerId,runId:commandId,metric:.61});const r=await f.update();
 assert.equal(r.completed,1);assert.equal(r.results[0].runId,commandId);assert.equal(r.results[0].workerId,workerId);assert.equal(r.results[0].sourceFiles[0].path,j.output_dir);assert.ok(!j.output_dir.includes('/attempts/'));
 const before=JSON.stringify(f.snapshot()),reads=f.calls.length;await exportsApi.regenerateLatestResultTables(f.root,'artifacts/results',f.snapshot());assert.equal(f.calls.length,reads);assert.equal(JSON.stringify(f.snapshot()),before);
});
test('ordinary collection reads only the final manifest and declared CSV while retaining all remote wrapper outputs',async()=>{
 const f=scenario(),p=f.addPlan(undefined,{seeds:[42]}),j=f.put(p,0);const files=f.storage.get('w1');files.set(j.output_dir+'/custom.csv',Buffer.from('unknown,NaN\n完整原文,0\n'));files.set(j.output_dir+'/mask.npz',Buffer.from([0,255,2]));const before=new Map(files);
 const r=await f.update();assert.equal(r.completed,1);assert.ok(f.calls.filter(c=>c.kind==='receive').every(c=>c.params.entries.length===2));
 for(const [name,bytes]of before)assert.deepEqual(files.get(name),bytes);assert.equal(fs.existsSync(path.join(f.root,j.output_dir)),false);
 assert.ok(!JSON.stringify(f.snapshot()).includes('完整原文'));
});
test('a train-only native manifest does not invent endpoint statistics',async()=>{
 const f=scenario(),p=f.addPlan(undefined,{seeds:[42],mode:'train'}),j=f.put(p,0);const file=j.output_dir+'/artifact_manifest.json';const manifest=JSON.parse(f.storage.get('w1').get(file));manifest.simpleExperiment.weights=[j.output_dir+'/best.pth'];f.storage.get('w1').set(file,Buffer.from(JSON.stringify(manifest)));
 const r=await f.update();assert.equal(r.completed,1);assert.equal(r.results.length,0);assert.equal(f.snapshot().tables.length,0);assert.ok(f.calls.filter(c=>c.kind==='receive').every(c=>c.params.entries.length===1));
});
test('an incomplete new run cannot borrow the old run’s missing seed',async()=>{
 const f=scenario(),p=f.addPlan(undefined,{seeds:[42,43,44]});p.jobs.forEach(j=>f.put(p,j.index,{runId:'old-'+j.index,metric:.81}));await f.update();f.copies.clear();for(const j of p.jobs.slice(0,2))f.put(p,j.index,{runId:'new-'+j.index});
 const r=await f.update();assert.equal(r.completed,2);assert.equal(r.results.length,2);assert.ok(r.results.every(row=>row.runId.startsWith('new-')));assert.equal(r.jobs[2].state,'missing');
 const final=f.snapshot().tables.find(t=>t.kind==='final');assert.equal(final.rows[0][final.header.indexOf('jobs')],'2/3');assert.equal(final.rows[0][final.header.indexOf('roc_auc_mean')],.92);
});
test('unchanged current results reread original bytes in memory and leave table bytes unchanged',async()=>{
 const f=scenario(),p=f.addPlan(undefined,{seeds:[42]});f.put(p,0);await f.update();const before=f.snapshot().tables.map(t=>[t.relativePath,f.read(t.relativePath)]);f.calls.length=0;await f.update();
 assert.equal(f.calls.filter(c=>c.kind==='receive').length,1);for(const [file,text]of before)assert.equal(f.read(file),text);assert.equal(fs.existsSync(path.join(f.root,'simple_cluster/downloads')),false);
});
test('old SFTP cannot populate raw disk caches or lend the previous successful result',async()=>{
 const f=scenario(),p=f.addPlan(undefined,{seeds:[42]});f.put(p,0);await f.update();const old=f.read('set/final/final.csv');f.host.simpleSftpCapability=async()=>({});const r=await f.update();assert.equal(r.completed,0);assert.equal(r.results.length,0);assert.match(r.jobs[0].error,/SimpleSFTP/);assert.equal(f.read('set/final/final.csv'),old);assert.equal((await f.catalog()).datasets.length,0);
});
test('a table write interruption retains the complete new JSON for explicit regeneration',async()=>{
 const f=scenario(),p=f.addPlan(undefined,{seeds:[42]});f.put(p,0,{metric:.81});await f.update();f.put(p,0,{metric:.61});const rename=fs.promises.rename;let failed=false;
 fs.promises.rename=async(source,target)=>{if(!failed&&target.endsWith('.csv')){failed=true;throw Object.assign(Error('fixture table interruption'),{code:'EIO'});}return rename(source,target);};
 try{await assert.rejects(f.update(),/fixture table interruption/);}finally{fs.promises.rename=rename;}
 const latest=f.snapshot();const final=latest.tables.find(t=>t.kind==='final');assert.equal(final.rows[0][final.header.indexOf('roc_auc_mean')],.61);
 await exportsApi.regenerateLatestResultTables(f.root,'artifacts/results',latest);assert.match(f.read(final.relativePath),/0.61/);
});

// Historical arbitrary-format inspection remains lossless and isolated from
// current aggregation. These use the actual bundle validators, not old writers.
function preparedReview(fault=''){
 const job={runId:'A',index:0,attempt:1,case:'one',seed:42,workerId:'owner',commandId:'old-cmd',outputDir:'work_dirs/review/attempts/A'};job.checkpointPath=job.outputDir+'/best.pth';
 const names=['artifact_manifest.json','endpoint.csv','four.csv','custom.json','custom.csv','mask.npz'];
 const texts=[JSON.stringify({output_dir:job.outputDir,metrics_summary:'endpoint.csv',outputs:names.slice(1)}),
 `case,seed,method,dataset,metric,value,checkpoint_path,job_dir,run_id\none,42,m,set,AUC,0.9,${job.checkpointPath},${job.outputDir},A\n`,
 'state,metric,value,p0_value,delta_p100_minus_p0,sample_count,checkpoint_path,job_dir,seed,method,dataset,undefined_reason,p0_undefined_reason,extra_column\n'+['both','image_missing','text_missing','both_missing'].map(state=>`${state},AUC,0.9,0.7,0.2,210,${job.checkpointPath},${job.outputDir},42,m,set,,,保留原文`).join('\n')+'\n',
 JSON.stringify({arbitrary:{list:[1,null,'完整保留']}}),'case,state,label,score,unknown_field\npatient-case,custom-state,lesion,NaN,不能计算\n',Buffer.from([0,255,2,4,9])];
 const inputs=names.map((name,index)=>{const data=texts[index],binary=Buffer.isBuffer(data);return {remotePath:job.outputDir+'/'+name,text:binary?data.toString('base64'):data,encoding:binary?'base64':undefined,sha256:sha(data),bytes:Buffer.byteLength(data)};});
 const required=inputs.map(f=>f.remotePath);
 if(fault==='missing-four')inputs.splice(2,1);if(fault==='missing-custom')inputs.splice(3,1);
 if(fault==='hash-mismatch')inputs[2].text+='tampered';
 if(fault==='wrong-checkpoint'){inputs[2].text=inputs[2].text.replaceAll('best.pth','other.pth');inputs[2].bytes=Buffer.byteLength(inputs[2].text);inputs[2].sha256=sha(inputs[2].text);}
 return {job,inputs,required,run:()=>bundle.prepareWrapperJob(job,inputs,job.outputDir+'/endpoint.csv',required,file=>'private-review/'+file)};
}
for(const fault of ['missing-four','missing-custom','hash-mismatch','wrong-checkpoint'])test('historical wrapper inspection rejects '+fault+' before publishing a bundle',()=>{
 const f=preparedReview(fault);assert.throws(f.run,/缺失|SHA256|checkpoint|检查点/);
});
test('arbitrary wrapper review preserves four states, unknown columns, JSON, binary hashes and original text',()=>{
 const f=preparedReview(),prepared=f.run(),publication=bundle.prepareWrapperPublication('A',[{case:'one',seed:42}],[prepared]);
 const summary=bundle.wrapperSummaryFiles('private-review',planFile,publication,[prepared]);assert.equal(summary.length,1);assert.match(summary[0].contents,/summary-only/);assert.match(summary[0].contents,/extra_column/);assert.doesNotMatch(summary[0].contents,/不能计算/);
 const merged=bundle.wrapperMergedFiles('private-review',planFile,publication,[prepared]);assert.ok(merged.some(file=>String(file.contents).includes('不能计算')));assert.ok(merged.some(file=>String(file.contents).includes('完整保留')));assert.ok(merged.some(file=>String(file.contents).includes('保留原文')));
 assert.equal(prepared.evidence.sources.find(file=>file.kind==='four.csv').sha256,sha(f.inputs[2].text));assert.equal(prepared.evidence.sources.find(file=>file.kind==='mask.npz').bytes,5);
});
test('a partial historical wrapper can be reviewed but cannot replace a complete formal publication',()=>{
 const f=preparedReview(),p=f.run(),expected=[{case:'one',seed:42},{case:'one',seed:43}];assert.throws(()=>bundle.prepareWrapperPublication('A',expected,[p]),/不完整/);assert.equal(bundle.prepareWrapperPublication('A',expected,[p],true).status,'preview');
});
test('changed historical bytes under the same writer cannot overwrite recorded source fingerprints',()=>{
 const f=preparedReview(),p=f.run(),publication=bundle.prepareWrapperPublication('A',[{case:'one',seed:42}],[p]);const prior=JSON.parse(JSON.stringify(publication));publication.jobs[0].sources[0].sha256='f'.repeat(64);assert.throws(()=>bundle.assertWrapperSourceHistory(prior,publication),/原始指标已变化/);
});

test('TSV merge preserves commas, quotes and multiline cells; JSONL run mismatches are rejected', () => {
  const job = { runId: 'A', index: 0, attempt: 1, case: 'one', seed: 42, workerId: 'owner', outputDir: 'work_dirs/a/attempts/A', commandId: 'cmd' };
  const remotePath = job.outputDir + '/custom.tsv', text = 'label\tnote\nlesion,benign\t"first\nsecond,third"\n';
  const prepared = bundle.prepareWrapperJob(job, [{ remotePath, text, sha256: sha(text), bytes: Buffer.byteLength(text) }], '', [remotePath], file => 'experiments/results/' + file);
  const pub = bundle.prepareWrapperPublication('A', [{ case: 'one', seed: 42 }], [prepared]);
  const merged = bundle.wrapperMergedFiles('experiments/results', planFile, pub, [prepared]);
  const csv = tables.readCsv(merged[0].contents);
  assert.equal(csv.rows[0][csv.header.indexOf('label')], 'lesion,benign');
  assert.equal(csv.rows[0][csv.header.indexOf('note')], 'first\nsecond,third');
  const bad = '{"run_id":"B","job_dir":"work_dirs/a/attempts/A"}\n';
  assert.throws(() => bundle.prepareWrapperJob(job, [{ remotePath: job.outputDir + '/rows.jsonl', text: bad, sha256: sha(bad) }], '', [], file => file), /身份不匹配/);
});

test('auxiliary diagnostic seed is preserved; canonical and anchored job seeds remain strict', () => {
  const job = { runId: 'A', index: 1, attempt: 1, case: 'one', seed: 43, workerId: 'owner', outputDir: 'work_dirs/a/attempts/A', commandId: 'cmd' };
  const file = (name, text) => ({ remotePath: job.outputDir + '/' + name, text, sha256: sha(text), bytes: Buffer.byteLength(text) });
  const diagnostic = file('undefined_metrics.csv', 'case,run_id,seed,metric,value\n,,42,target_accuracy_change,NaN\n');
  const prepared = bundle.prepareWrapperJob(job, [diagnostic], '', [], name => name);
  assert.equal(prepared.records[0].rows[0].seed, '42');
  const pub = bundle.prepareWrapperPublication('A', [{ case: 'one', seed: 43 }], [prepared]);
  assert.match(bundle.wrapperMergedFiles('experiments/results', planFile, pub, [prepared])[0].contents, /NaN,A,1,one,43,owner/);
  assert.throws(() => bundle.prepareWrapperJob(job, [diagnostic], diagnostic.remotePath, [], name => name), /期望 43，实际 42/);
  const anchored = file('diagnostic.json', JSON.stringify({ seed: 42, job_dir: job.outputDir }));
  assert.throws(() => bundle.prepareWrapperJob(job, [anchored], '', [], name => name), /身份不匹配/);
  assert.equal(bundle.isWrapperResultFile(job.outputDir + '/code_backup/results.csv'), false);
});

test('local reuse checks current SHA256 even when size and mtime match', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'simple-wrapper-reuse-'));
  const text = 'seed,metric,value\n42,AUC,0.8\n', relative = 'results/metric.csv';
  fs.mkdirSync(path.join(root, 'results'));
  const target = path.join(root, relative); fs.writeFileSync(target, text);
  const entry = { remotePath: 'work_dirs/a/metric.csv', localRelativePath: relative, sha256: sha(text), bytes: Buffer.byteLength(text) };
  assert.equal((await bundle.readVerifiedLocalResult(root, entry)).text, text);
  const before = fs.statSync(target); fs.writeFileSync(target, text.replace('0.8', '0.9')); fs.utimesSync(target, before.atime, before.mtime);
  assert.equal(await bundle.readVerifiedLocalResult(root, entry), undefined);
  await assert.rejects(bundle.readVerifiedLocalResult(root, { ...entry, localRelativePath: '../metric.csv' }), /路径不安全/);
});


test('wrapper declaration rejects out-of-job paths and retains unknown JSON without coercion', () => {
  assert.throws(() => bundle.declaredWrapperResults('{"outputs":["../../other.csv"]}', 'work_dirs/a/attempts/A'), /不安全/);
  assert.throws(() => bundle.declaredWrapperResults('{"outputs":["/other/a.csv"]}', 'work_dirs/a/attempts/A'), /不属于/);
  assert.deepEqual(bundle.declaredWrapperResults('{"outputs":["extra.parquet","test/custom.tsv"],"checkpoint_path":"best.pth"}', 'work_dirs/a/attempts/A'),
    ['work_dirs/a/attempts/A/extra.parquet', 'work_dirs/a/attempts/A/test/custom.tsv']);
});
