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

test('MCP named controls forward scoped parameters and preserve host receipts',async()=>{
 const root=path.resolve(__dirname,'../..'),calls=[],grant=createProjectAuthorization(root);
 const worker={id:'worker-a',host:'fake',port:22,user:'fake',projectRoot:'/fake'};grant.workers=[worker];
 const names=['config.get','config.set','state.reset','state','tmux.capture','gpu.history','panel.diagnostics'];
 const methods=Object.fromEntries(names.map(method=>[method,async params=>{calls.push({method,params});return {ok:true,method,params}}]));
 const gateway=new ProjectGateway({root:()=>root,workers:()=>[worker],store:{get:()=>grant},methods:()=>methods,approve:async()=>true});
 const cases=[
  ['configuration_get',{key:'simpleExperiment.test'},'config.get',{key:'simpleExperiment.test'}],
  ['configuration_set',{key:'simpleExperiment.test',value:{a:[1]},scope:'workspace'},'config.set',{key:'simpleExperiment.test',value:{a:[1]},scope:'workspace',confirm:true}],
  ['state_reset',{key:'selection'},'state.reset',{key:'selection',confirm:true}],
  ['project_state',{detail:'full'},'state',{detail:'full'}],
  ['tmux_capture',{workerId:'worker-a',window:'window:3'},'tmux.capture',{workerId:'worker-a',window:'window:3'}],
  ['gpu_history',{},'gpu.history',{}],['panel_diagnostics',{},'panel.diagnostics',{}],
 ];
 for(const [tool,args,method,params] of cases){const result=await gateway.call(tool,args);assert.equal(result.method,method);assert.deepEqual(result.params,params)}
 assert.equal(calls.length,cases.length);
});

test('MCP PLAN list waits for the real host metadata refresh',async()=>{
 const fs=require('node:fs'),root=path.resolve(__dirname,'../..');
 const source=fs.readFileSync(path.join(root,'src/extension/legacy.ts'),'utf8');
 const start=source.indexOf('"plans.list": async'),end=source.indexOf('"results.list":',start);
 assert.ok(start>=0&&end>start);
 const host={localPlanMetadata:{planDir:'old',plans:['old']},refreshLocalPlanMetadata:async()=>{
  host.localPlanMetadata={planDir:'experiments/plans',plans:[{name:'baseline',path:'experiments/plans/baseline.yaml',status:'ready',validation:'valid'}]};
 }};
 const methods=new Function('return function(){return ({'+source.slice(start,end)+'});};')().call(host);
 const gateway=new ProjectGateway({root:()=>root,workers:()=>[],store:{get:()=>undefined},methods:()=>methods});
 const result=await gateway.call('plan_list',{});
 assert.equal(result.planDir,'experiments/plans');assert.equal(result.source,'local_metadata');
 assert.deepEqual(result.plans,host.localPlanMetadata.plans);assert.deepEqual(result.archivedPlans,[]);
});

test('MCP GPU and task observations retain Worker, GPU zero and command identities',async()=>{
 const root=path.resolve(__dirname,'../..'),calls=[];let fail=false;
 const gpu={gpu:{'worker-a':{gpus:[{index:0,utilizationPercent:0}]},'worker-b':{gpus:[{index:0,utilizationPercent:35}]}}};
 const tasks={workerTasks:[{workerId:'worker-a',gpuId:'0',commandId:'command-a',status:'running'},
  {workerId:'worker-b',gpuId:'0',commandId:'command-b',status:'running'}]};
 const methods={'gpu.list':async()=>{calls.push('gpu');if(fail)throw Error('GPU observation failed');return gpu},
  'tasks.list':async()=>{calls.push('tasks');if(fail)throw Error('task observation failed');return tasks}};
 const gateway=new ProjectGateway({root:()=>root,workers:()=>[],store:{get:()=>undefined},methods:()=>methods});
 assert.deepEqual(await gateway.call('gpu_status',{}),gpu);
 assert.deepEqual(await gateway.call('task_list',{}),tasks);
 assert.equal(gpu.gpu['worker-a'].gpus[0].index,0);assert.equal(gpu.gpu['worker-a'].gpus[0].utilizationPercent,0);
 assert.deepEqual(tasks.workerTasks.map(row=>[row.workerId,row.gpuId,row.commandId]),[['worker-a','0','command-a'],['worker-b','0','command-b']]);
 fail=true;await assert.rejects(gateway.call('gpu_status',{}),/GPU observation failed/);
 await assert.rejects(gateway.call('task_list',{}),/task observation failed/);
 assert.deepEqual(calls,['gpu','tasks','gpu','tasks']);
});
