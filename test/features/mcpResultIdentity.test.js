const test=require('node:test'),assert=require('node:assert/strict');
require('../_helpers/registerTsRequire');
const {queryProject}=require('../../src/mcp/ProjectQueries.ts');

test('MCP result selection preserves distinct runs, zero metrics and exact exported dimensions',async()=>{
 const inputs=[{planFile:'plans/p.yaml',workerId:'worker-a',runId:'same',completionState:'verified',aggregationState:'eligible',
  dimensions:{seed:0,dataset:'合成,"A"'},metrics:{AP:0,AUPRC:0.5},sourceFiles:[{path:'result.csv'}]},
 {planFile:'plans/p.yaml',workerId:'worker-a',runId:'same',completionState:'verified',aggregationState:'eligible',
  dimensions:{seed:1,dataset:'other'},metrics:{AP:0.25,AUPRC:0.75},sourceFiles:[{path:'result.csv'}]}];
 const rpc=async method=>{assert.equal(method,'results.list');return {source:'active_query',summary:{current:true,observedAt:'2026-01-01',results:inputs}}};
 const query=(name,args={})=>queryProject('fixture',rpc,name,args);
 const rows=await query('result_list');assert.equal(rows.length,2);assert.notEqual(rows[0].id,rows[1].id);assert.equal(rows[0].value,0);
 const metrics=await query('metric_show',{id:rows[0].id});assert.equal(metrics.AP,0);assert.equal(metrics.AUPRC,0.5);
 const show=await query('result_show',{id:rows[0].id});assert.equal(show.seed,0);assert.equal(show.metrics.AP,0);
 const comparison=await query('result_compare',{left:rows[0].id,right:rows[1].id});
 assert.deepEqual(comparison.metric_difference.AP,{left:0,right:0.25,delta:0.25});
 const json=await query('result_export',{id:rows[0].id,format:'json'});const payload=JSON.parse(json.content);
 assert.equal(payload.id,rows[0].id);assert.equal(payload.dimensions.seed,0);assert.equal(payload.dimensions.dataset,'合成,"A"');assert.equal(payload.metrics.AP,0);
 const csv=await query('result_export',{id:rows[0].id,format:'csv'});assert.match(csv.content,/"合成,""A"""/);
 await assert.rejects(query('metric_show',{id:'same'}),/AMBIGUOUS/);
 await assert.rejects(query('result_show',{id:'missing'}),/not found/i);
 await assert.rejects(queryProject('fixture',async()=>({source:'history'}),'result_list',{}),/RESULT_QUERY_UNVERIFIED/);
});
