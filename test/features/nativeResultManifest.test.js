const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {verifyNativeResult}=require('../../dist/results/NativeResultManifest');
const {prepareWrapperJob}=require('../../dist/results/WrapperResultBundle');
const hash=text=>crypto.createHash('sha256').update(text).digest('hex');
test('declared generic artifacts survive producer, Worker observation and desktop verification without a checkpoint',()=>{
  const path=require('node:path'),{spawnSync}=require('node:child_process');
  const run=spawnSync(process.env.PYTHON||'python',['-B','-X','utf8',path.join(__dirname,'nativeDeclaredArtifacts.fixture.py')],{encoding:'utf8',timeout:10000,windowsHide:true});
  assert.equal(run.status,0,run.stderr||run.stdout||String(run.error));
  const result=JSON.parse(run.stdout),report=result.manifest.simpleExperiment,text=JSON.stringify(result.manifest);
  const job={commandId:report.runId,index:report.job.index,case:report.job.case,seed:report.job.seed,outputDir:report.outputDir};
  assert.equal(verifyNativeResult(text,hash(text),job,'train').declaredArtifacts.length,4);
  assert.equal(result.missingRejected,true);assert.equal(result.changedRejected,true);
  report.declaredArtifacts[0].path='../escape';const bad=JSON.stringify(result.manifest);
  assert.throws(()=>verifyNativeResult(bad,hash(bad),job,'train'),/ARTIFACT_INVALID/);
});
test('native final manifest binds current run/mode/paths and supports in-memory collection without owner state',()=>{
  const job={lifecycleProtocol:2,runId:'workflow',globalJobId:'workflow:0',attempt:0,index:0,case:'a',seed:42,workerId:'w',
    commandId:'command',resultPathPolicy:'declared',outputDir:'work/job',collectionResultCsv:'tmp/result/job.csv'};
  const report={schemaVersion:1,runId:job.commandId,status:'completed',mode:'train_test',outputDir:job.outputDir,resultCsv:job.collectionResultCsv,
    job:{index:0,case:'a',seed:42},weights:['work/job/model.pth']};
  const text=JSON.stringify({simpleExperiment:report}),csv='case,seed,metric,value\na,42,acc,1\n';
  assert.equal(verifyNativeResult(text,hash(text),job).runId,'command');
  const file=(remotePath,text)=>({remotePath,text,sha256:hash(text)});
  const prepared=prepareWrapperJob(job,[file('work/job/artifact_manifest.json',text),file(job.collectionResultCsv,csv)],job.collectionResultCsv,
    ['work/job/artifact_manifest.json',job.collectionResultCsv],x=>x);
  assert.equal(prepared.evidence.job.lifecycleProtocol,2);
  assert.throws(()=>verifyNativeResult(text,hash(text),{...job,commandId:'old-command'}),/JOB_MISMATCH/);
  assert.throws(()=>verifyNativeResult(text,hash(text),{...job,collectionResultCsv:'other.csv'}),/JOB_MISMATCH/);
  assert.throws(()=>verifyNativeResult(text,hash(text),job,'test'),/JOB_MISMATCH/);
  assert.throws(()=>verifyNativeResult(text+' ',hash(text),job),/SHA256/);
});
