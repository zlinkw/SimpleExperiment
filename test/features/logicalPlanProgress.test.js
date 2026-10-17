const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),Module=require('node:module'),ts=require('typescript');
Module._extensions['.ts']=(loaded,file)=>loaded._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
const {composeLogicalPlans}=require('../../src/features/LogicalPlanProgress.ts');
const {latestCompletePlansForSyncCheck,assessPlanArtifactSync}=require('../../src/features/PlanArtifactSyncStatus.ts');
const {summarizePlanStatuses}=require('../../src/features/PanelPlanStatusSummary.ts');
function plan(id,indices,time,count=indices.length){return {id,projectId:'project',planFile:'plans/a.yaml',revision:'revision',codeFingerprint:id,
  fullPlanJobCount:6,planJobCount:count,enqueuedAt:time,resultPathPolicy:'declared',jobs:indices.map(index=>({index,case:'case'+index,seed:42,
    commandId:id+'cmd'+index,globalJobId:id+':'+index,workerId:'worker',outputDir:'work/job'+index,collectionResultCsv:'work/job'+index+'/metrics.csv',status:'completed'}))};}
test('five plus one form a read-only six-job view, retaining original IDs and version provenance',()=>{
  const a=plan('old',[0,1,2,3,4],'2026-10-16',6),b=plan('new',[5],'2026-10-17'),before=JSON.stringify([a,b]);
  const view=composeLogicalPlans([b,a])[0];assert.equal(view.jobs.length,6);assert.equal(view.planJobCount,6);
  assert.equal(view.jobs[0].sourcePlanId,'old');assert.equal(view.jobs[5].sourcePlanId,'new');assert.equal(view.mixedVersions,true);
  assert.equal(view.recoveryMissingCount,0);assert.equal(JSON.stringify([a,b]),before);
  assert.equal(latestCompletePlansForSyncCheck({plans:[a,b]}).length,1);
  const hash='a'.repeat(64),inventory={};
  for(const job of view.jobs){job.lifecycleProtocol=2;job.resultPathPolicy='declared';job.artifacts={[job.outputDir+'/artifact_manifest.json']:hash};Object.assign(inventory,job.artifacts);}
  assert.equal(assessPlanArtifactSync(view,['worker','copy'],new Map([['worker',inventory],['copy',inventory]]),['artifact_manifest.json']).status,'synced');
});
test('new full submissions reset the cohort and newest unknown, failed or retired jobs never borrow old success',()=>{
  const a=plan('old',[0,1,2,3,4,5],'2026-10-16',6);
  for(const status of ['unknown','failed','pending']){
    const b=plan('new',[5],'2026-10-17');b.jobs[0].status=status;
    const view=composeLogicalPlans([a,b])[0];assert.equal(view.jobs[5].status,status);assert.equal(latestCompletePlansForSyncCheck({plans:[a,b]}).length,0);
  }
  const fresh=plan('full-rerun',[0],'2026-10-18',6);assert.equal(composeLogicalPlans([a,fresh])[0].jobs.length,1);
});
test('revision, project and declaration conflicts cannot join results',()=>{
  const a=plan('old',[0,1,2,3,4],'2026-10-16',6);
  const b=plan('new',[5],'2026-10-17');b.revision='different';assert.equal(composeLogicalPlans([a,b])[0].jobs.length,1);
  b.revision=a.revision;b.projectId='other';assert.equal(composeLogicalPlans([a,b]).length,2);
  b.projectId=a.projectId;b.jobs[0].index=0;assert.equal(composeLogicalPlans([a,b])[0].recoveryConflict,true);
});
test('host PLAN selector uses the same six-job cohort and does not borrow an older full run',()=>{
  const a=plan('old',[0,1,2,3,4],'2026-10-16',6),b=plan('new',[5],'2026-10-17');
  const summarize=rows=>summarizePlanStatuses({plans:[{file:a.planFile,revision:a.revision,jobCount:6}],distributedPlans:rows})[0];
  assert.equal(summarize([a,b]).completedCount,6);assert.equal(summarize([a,b]).status,'completed');
  b.jobs[0].status='pending';assert.equal(summarize([a,b]).completedCount,5);
  assert.equal(summarize([a,plan('full',[5],'2026-10-18',6)]).completedCount,1);
});
