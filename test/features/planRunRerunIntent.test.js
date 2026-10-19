const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
require('../_helpers/registerTsRequire');
const selector=require('../../src/results/plan-run-intent-selector.ts');
const freshness=require('../../src/results/PlanRunFreshness.ts');
const {summarizePlanStatuses}=require('../../src/features/PanelPlanStatusSummary.ts');
const {PlanRunHost}=require('../../src/extension/PlanRunHost.ts');

const statusRow=(status,over={})=>({status,...over});
const scope=crypto.createHash('sha256').update('scope-fixture').digest('hex');
const base=selector.rerunWorkflowBaseId(scope);

test('empty queue opens the legacy-compatible base rerun instance',()=>{
 const decision=selector.selectRerunWorkflowInstance({plans:[]},scope);
 assert.equal(decision.workflowId,base);assert.equal(decision.activeRunId,'');assert.equal(decision.familyRunCount,0);
 // ordinal 0 与旧确定性 id 公式逐字节一致：同哈希盐序列化、同前缀，旧完成批次仍被识别为同范围族。
 const salt=JSON.stringify(['wf-1',[[0,'cmd-0']],false,'rev-1','fp-1']);
 const legacyId='distributed-plan-rerun-'+crypto.createHash('sha256').update(salt).digest('hex');
 assert.equal(selector.rerunWorkflowBaseId(crypto.createHash('sha256').update(salt).digest('hex')),legacyId);
 assert.equal(selector.selectRerunWorkflowInstance({plans:[{id:legacyId,jobs:[statusRow('completed')]}]},
  crypto.createHash('sha256').update(salt).digest('hex')).workflowId,legacyId+'-r1');
});

test('terminal family opens a fresh instance for each new human rerun',()=>{
 let queue={plans:[{id:base,jobs:[statusRow('completed'),statusRow('failed')]}]};
 const first=selector.selectRerunWorkflowInstance(queue,scope);
 assert.equal(first.workflowId,base+'-r1');assert.equal(first.activeRunId,'');assert.equal(first.familyRunCount,1);
 queue={plans:[...queue.plans,{id:first.workflowId,jobs:[statusRow('completed'),statusRow('cancelled')]}]};
 const second=selector.selectRerunWorkflowInstance(queue,scope);
 assert.equal(second.workflowId,base+'-r2');assert.equal(second.activeRunId,'');assert.equal(second.familyRunCount,2);
 // 旧批次历史保持完整：族内全部实例仍在队列中，不清空、不复用已终结 id。
 assert.equal(queue.plans.length,2);
});

test('unterminated family run keeps one stable blocking id across repeated resolutions',()=>{
 const queue={plans:[{id:base,jobs:[statusRow('completed')]},{id:base+'-r1',jobs:[statusRow('running'),statusRow('queued')]}]};
 for(let attempt=0;attempt<3;attempt+=1){
  const decision=selector.selectRerunWorkflowInstance(queue,scope);
  assert.equal(decision.activeRunId,base+'-r1','同意图的网络重试/崩溃恢复必须观察到同一未终结批次');
  assert.equal(decision.workflowId,base+'-r2','未终结时预解析的下一实例保持恒等，不双派');
 }
 for(const status of ['unknown','pending','']){
  const active={plans:[{id:base+'-r1',jobs:[statusRow(status)]}]};
  assert.equal(selector.selectRerunWorkflowInstance(active,scope).activeRunId,base+'-r1',status||'missing');
 }
 assert.equal(selector.selectRerunWorkflowInstance({plans:[{id:base+'-r1',jobs:[{}]}]},scope).activeRunId,base+'-r1','缺状态保守视为未终结');
 assert.equal(selector.selectRerunWorkflowInstance({plans:[{id:base,jobs:[]}]},scope).activeRunId,base,'空 job 列表无法证明终结，维持挡块');
});

test('cleanup rows and foreign ids never join the rerun family',()=>{
 const decision=selector.selectRerunWorkflowInstance({plans:[
  {id:'distributed-plan-'+scope,cleanup:true,jobs:[statusRow('queued')]},
  {id:base+'-notes',jobs:[statusRow('completed')]},
  {id:base+'-r1x',jobs:[statusRow('running')]},
  {id:base+'-r01',jobs:[statusRow('completed')]},
 ]},scope);
 assert.equal(decision.workflowId,base);assert.equal(decision.activeRunId,'');assert.equal(decision.familyRunCount,0);
});

function cohortFixtures(){
 const job=(planId,index,status)=>({index,case:'case'+index,seed:42,attempt:1,commandId:planId+'-cmd-'+index,globalJobId:planId+':'+index,
  workerId:'worker',outputDir:'work/job'+index,collectionResultCsv:'work/job'+index+'/metrics.csv',status});
 const old={id:'run-old',projectId:'project',planFile:'plans/a.yaml',revision:'revision',codeFingerprint:'fp-old',
  fullPlanJobCount:4,planJobCount:4,enqueuedAt:'2026-10-16T00:00:00Z',resultPathPolicy:'declared',
  jobs:[0,1,2,3].map(index=>job('run-old',index,'completed'))};
 const partial={id:'run-new',projectId:'project',planFile:'plans/a.yaml',revision:'revision',codeFingerprint:'fp-new',
  fullPlanJobCount:4,planJobCount:2,enqueuedAt:'2026-10-17T00:00:00Z',resultPathPolicy:'declared',
  jobs:[0,1].map(index=>job('run-new',index,'running'))};
 return{old,partial};
}
const summarize=(rows,distributed)=>summarizePlanStatuses({plans:rows,distributedPlans:distributed})[0];

test('partial rerun summary splits this-run progress from carried-forward completions',()=>{
 const {old,partial}=cohortFixtures();
 const s=summarize([{file:'plans/a.yaml',revision:'revision',jobCount:4}],[old,partial]);
 // 合并计数语义保持不变（回归钉），拆分只作附加数据通道。
 assert.equal(s.completedCount,2);assert.equal(s.totalCount,4);assert.equal(s.status,'running');
 assert.equal(s.currentRunId,'run-new');assert.equal(s.currentRunTotalCount,2);assert.equal(s.currentRunCompletedCount,0);
 assert.equal(s.carriedForwardCompletedCount,2);assert.deepEqual(s.carriedForwardSourceRunIds,['run-old']);
 // 补跑完成后：本次 2/2、沿用 2，旧完成既不算本次也不算重复。
 for(const job of partial.jobs)job.status='completed';
 const done=summarize([{file:'plans/a.yaml',revision:'revision',jobCount:4}],[old,partial]);
 assert.equal(done.completedCount,4);assert.equal(done.status,'completed');
 assert.equal(done.currentRunCompletedCount,2);assert.equal(done.carriedForwardCompletedCount,2);
 // 单一完整提交：全部计入本次，无沿用来源。
 const single=summarize([{file:'plans/a.yaml',revision:'revision',jobCount:4}],[old]);
 assert.equal(single.currentRunId,'run-old');assert.equal(single.currentRunTotalCount,4);assert.equal(single.currentRunCompletedCount,4);
 assert.equal(single.carriedForwardCompletedCount,0);assert.equal(single.carriedForwardSourceRunIds,undefined);
});

test('partial rerun never replaces the formal history endpoint and never becomes preview authority',()=>{
 const {old,partial}=cohortFixtures();
 const queue={plans:[old,partial]};
 const identity=freshness.selectLatestCompletePlanRunIdentity(queue,'plans/a.yaml','revision');
 assert.equal(identity.runId,'run-old','正式历史仍绑定旧完整卡');
 assert.equal(freshness.selectLatestPlanRunPreview(queue,'plans/a.yaml','revision'),undefined,'不完整的新卡只能 preview 排除，不得冒充正式端点');
});

test('hold retirement normalizes empty CSV and fails explicitly on real mismatches',()=>{
 const queue={plans:[{id:'p1',jobs:[
  {outputDir:'work_dirs/a',collectionResultCsv:undefined,status:'completed'},
  {outputDir:'work_dirs/b',collectionResultCsv:'results/b.csv',status:'completed'},
  {outputDir:'work_dirs\\c',collectionResultCsv:'r.csv',status:'completed'},
 ]}]};
 const before=JSON.stringify(queue);
 const matched=PlanRunHost.normalizeHoldTargets([{output_dir:'work_dirs/a',result_csv:''},
  {output_dir:'work_dirs/b',result_csv:'results/b.csv'},{output_dir:'work_dirs/c',result_csv:'r.csv'}],queue);
 assert.deepEqual(matched.missing,[]);
 for(const job of matched.queue.plans[0].jobs){assert.ok(job.outputRetiredAt);assert.equal(job.artifacts,undefined);assert.deepEqual(job.mirroredWorkerIds,[]);}
 assert.equal(JSON.stringify(queue),before,'归一化不改动调用方队列');
 const reverse=PlanRunHost.normalizeHoldTargets([{output_dir:'work_dirs/a'}],queue);
 assert.deepEqual(reverse.missing,[]);assert.ok(reverse.queue.plans[0].jobs[0].outputRetiredAt,'声明 undefined 与勾选 "" 等价');
 const bad=PlanRunHost.normalizeHoldTargets([{output_dir:'work_dirs/a',result_csv:'other.csv'},{output_dir:'work_dirs/ghost',result_csv:''}],queue);
 assert.equal(bad.missing.length,2,'真实不匹配必须显式列项');
 for(const job of bad.queue.plans[0].jobs)assert.equal(job.outputRetiredAt,undefined,'不匹配时不得静默漏标');
});

test('hold wiring routes through the normalizer and aborts the queue write on missing targets',()=>{
 const source=fs.readFileSync(path.resolve(__dirname,'../../src/extension/PlanRunHost.ts'),'utf8');
 assert.match(source,/const next = PlanRunHost\.normalizeHoldTargets\(selected, queue\);/);
 assert.match(source,/if \(next\.missing\.length\) throw Error\("HOLD_TARGET_NOT_FOUND/);
 assert.ok(!/selected\.some\(row => row\.output_dir === job\.outputDir/.test(source),'旧的精确相等 hold 匹配必须移除');
});

test('legacy rerun intent and resume wiring are pinned in the submission path',()=>{
 const source=fs.readFileSync(path.resolve(__dirname,'../../src/extension/legacy.ts'),'utf8');
 assert.match(source,/import { selectRerunWorkflowInstance } from "\.\.\/results\/plan-run-intent-selector";/);
 assert.match(source,/const rerunDecision = selectRerunWorkflowInstance\(await this\.loadDistributedQueue\(root\), rerunScopeKey\);/);
 assert.match(source,/if \(rerunDecision\.activeRunId\)/);
 assert.match(source,/已恢复原提交，未启动新批次；继续主动查询原任务。"\); return;/);
 assert.ok(!source.includes('该范围已创建重跑批次'),'永久重复挡块文案必须移除');
 assert.ok(!source.includes('原提交已在队列中'),'resume 不再把队列命中表述为旧文案');
});
