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
