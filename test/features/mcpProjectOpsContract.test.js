const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
require('../_helpers/registerTsRequire');
const {ProjectGateway}=require('../../src/mcp/ProjectGateway.ts');
const {createProjectAuthorization}=require('../../src/mcp/ProjectAuthorization.ts');

test('MCP project operations retain authorization, receipts and observed failures',async()=>{
 const root=path.resolve(__dirname,'../..'),calls=[],grant=createProjectAuthorization(root);
 const methods={
  'project.prepare':async params=>{calls.push(['prepare',params]);return {ok:true}},
  'project.bootstrap':async params=>{calls.push(['bootstrap',params]);return {status:'started',operationId:'op-boot-1'}},
  'project.bootstrap.operation':async params=>{calls.push(['operation',params]);if(params.operationId==='missing')throw Error('未找到 project.bootstrap 操作');
   return {ok:true,operation:{operationId:params.operationId,status:params.operationId==='failed'?'failed':'succeeded',...(params.operationId==='failed'?{error:'前置检查未通过'}:{})}}},
 };
 const gateway=new ProjectGateway({root:()=>root,workers:()=>[],store:{get:()=>grant},methods:()=>methods});
 grant.permissions=[];await assert.rejects(gateway.call('project_prepare',{}),/AUTHORIZATION_REQUIRED/);
 grant.permissions=['configuration'];await assert.rejects(gateway.call('project_bootstrap',{planFile:'p.yaml'}),/AUTHORIZATION_REQUIRED: sync/);assert.equal(calls.length,0);
 grant.permissions=['agents','configuration','sync'];assert.deepEqual(await gateway.call('project_prepare',{}),{ok:true});
 assert.deepEqual(calls.at(-1),['prepare',{confirm:true,startSessions:true}]);
 assert.deepEqual(await gateway.call('project_bootstrap',{planFile:'p.yaml'}),{status:'started',operationId:'op-boot-1'});
 assert.deepEqual(calls.at(-1),['bootstrap',{planFile:'p.yaml',confirm:true}]);
 assert.equal((await gateway.call('project_bootstrap_operation',{operationId:'op-boot-1'})).operation.status,'succeeded');
 const failed=await gateway.call('project_bootstrap_operation',{operationId:'failed'});assert.equal(failed.ok,true);assert.equal(failed.operation.status,'failed');assert.match(failed.operation.error,/前置检查未通过/);
 await assert.rejects(gateway.call('project_bootstrap_operation',{operationId:'missing'}),/未找到/);
 assert.equal(calls.filter(row=>row[0]==='bootstrap').length,1);
 await assert.rejects(gateway.call('project_bootstrap',{planFile:'p.yaml',confirm:true}),/Unknown/);
});

test('MCP PLAN validation forwards host success and in-band failure',async()=>{
 const root=path.resolve(__dirname,'../..'),calls=[],grant=createProjectAuthorization(root);
 const gateway=new ProjectGateway({root:()=>root,workers:()=>[],store:{get:()=>grant},methods:()=>({
  'plan.validate':async params=>{calls.push(params);const ok=params.planFile.endsWith('/valid.yaml');return {ok,missing:ok?[]:[{step:'validate_plan',reason:'invalid server plan'}],validation:{ok},source:'extension-host'}}
 })});
 for(const [name,ok] of [['valid',true],['invalid',false]]){
  const result=await gateway.call('plan_validate',{planFile:`experiments/plans/${name}.yaml`});
  assert.equal(result.ok,ok);assert.equal(result.validation.ok,ok);assert.equal(result.source,'extension-host');
  assert.equal(result.missing.length,ok?0:1);
 }
 assert.deepEqual(calls,[{planFile:'experiments/plans/valid.yaml',confirm:true},{planFile:'experiments/plans/invalid.yaml',confirm:true}]);
 grant.permissions=[];await assert.rejects(gateway.call('plan_validate',{planFile:'experiments/plans/valid.yaml'}),/AUTHORIZATION_REQUIRED/);
 assert.equal(calls.length,2);
});
