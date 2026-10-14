const test=require('node:test'),assert=require('node:assert/strict');require('../_helpers/registerTsRequire');
const {newestJobOutputs,jobArtifactScopes,latestJobSyncKey}=require('../../src/features/LatestJobArtifacts.ts');
const job=(index,status='completed')=>({index,case:'case'+index,seed:42,status,lifecycleProtocol:2,workerId:'a',commandId:'c'+index,outputDir:'work_dirs/p/job'+index,collectionResultCsv:'tmp/result/p/job'+index+'.csv'});
test('each newest job is available immediately; a partial rerun never restores its previous results',()=>{
 const old={id:'old',projectId:'project',planFile:'p.yaml',enqueuedAt:'2026-10-14T01:00:00Z',jobs:[job(0),job(1)]};
 const next={...old,id:'new',enqueuedAt:'2026-10-14T02:00:00Z',jobs:[{...job(0,'running'),commandId:'new'}]};
 const rows=newestJobOutputs({plans:[old,next]});assert.deepEqual(rows.map(r=>[r.plan.id,r.job.index]),[['new',0],['old',1]]);
 next.cleanup={};assert.deepEqual(newestJobOutputs({plans:[old,next]}).map(r=>r.job.index),[1]);
});
test('job scope honors exact checkbox intersection, excludes other jobs and train-only CSV',()=>{
 const j=job(0);assert.deepEqual(jobArtifactScopes(j,['.']),['tmp/result/p/job0.csv','work_dirs/p/job0']);
 assert.deepEqual(jobArtifactScopes(j,['work_dirs/p/job0/weights','work_dirs/p/job1','tmp/result']),['tmp/result/p/job0.csv','work_dirs/p/job0/weights']);
 assert.deepEqual(jobArtifactScopes({...j,actualExecutionMode:'train'},['.']),['work_dirs/p/job0']);
 assert.deepEqual(jobArtifactScopes(j,['models']),[]);assert.throws(()=>jobArtifactScopes(j,['../wrong']),/不安全/);
 const p={id:'p',projectId:'project'},t=[{id:'a',host:'h',remotePath:'/safe'}];
 assert.notEqual(latestJobSyncKey(p,j,['.'],t),latestJobSyncKey(p,{...j,commandId:'next'},['.'],t));
 assert.notEqual(latestJobSyncKey(p,j,['.'],t),latestJobSyncKey(p,j,['.'],[{...t[0],remotePath:'/new'}]));
});
test('artifact metadata cannot erase a current completion or revive a stale observation',()=>{
 const {keepCurrentObservations}=require('../../src/features/DistributedPlanQueue.ts'),now=Date.now();
 const live={schemaVersion:1,plans:[{id:'p',projectId:'project',jobs:[{...job(0),lastObservedAt:new Date(now).toISOString()}]}]},disk=structuredClone(live);disk.plans[0].jobs[0].status='unknown';
 assert.equal(keepCurrentObservations(structuredClone(disk),live,now).plans[0].jobs[0].status,'completed');
 assert.equal(keepCurrentObservations(structuredClone(disk),live,now+31000).plans[0].jobs[0].status,'unknown');
 disk.plans[0].jobs[0].commandId='different';assert.equal(keepCurrentObservations(disk,live,now).plans[0].jobs[0].status,'unknown');
});
