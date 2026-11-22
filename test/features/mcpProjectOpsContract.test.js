const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
require('../_helpers/registerTsRequire');
const {ProjectGateway}=require('../../src/mcp/ProjectGateway.ts');
const {createProjectAuthorization}=require('../../src/mcp/ProjectAuthorization.ts');

test('MCP optional observations expose real host refusals and connection errors',async()=>{
 const fs=require('node:fs'),os=require('node:os');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'g004-query-error-'));
 const grant=createProjectAuthorization(root);let failing='',failure;
 const names=['tasks.list','operations.list','state.get','gpu.list','status','server.testAll','results.list'];
 const methods=Object.fromEntries(names.map(name=>[name,async()=>{
  if(name===failing)throw failure;
  if(name==='tasks.list')return {tasks:[]};if(name==='operations.list')return {records:[]};
  if(name==='state.get')return {value:{workerTunnels:[]}};if(name==='gpu.list')return {};
  if(name==='status')return {topology:{workers:[]}};if(name==='server.testAll')return {rows:[]};
  return {source:'active_query',summary:{current:true,results:[]}};
 }]));
 const gateway=new ProjectGateway({root:()=>root,workers:()=>[],store:{get:()=>grant},methods:()=>methods});
 for(const [tool,args,method,error] of [
  ['experiment_list',{},'tasks.list',Error('host permission denied')],
  ['experiment_list',{},'operations.list',Object.assign(Error('project cancelled'),{apiCode:-32000})],
  ['resource_available',{},'gpu.list',Error('connection reset')],
  ['server_list',{},'status',Object.assign(Error('host refused'),{apiCode:-32001})],
  ['artifact_list',{id:'missing'},'results.list',Error('result observation failed')],
 ]){failing=method;failure=error;await assert.rejects(gateway.call(tool,args),new RegExp(error.message));}
 failing='operations.list';failure=Object.assign(Error('method not found'),{apiCode:-32601});
 assert.ok(Array.isArray(await gateway.call('experiment_list',{})));
 delete methods['operations.list'];
 assert.ok(Array.isArray(await gateway.call('experiment_list',{})));
});

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

test('MCP PLAN delete previews use the same confirmed-path mode as the human review',async()=>{
 const root=path.resolve(__dirname,'../..'),calls=[];
 const gateway=new ProjectGateway({root:()=>root,workers:()=>[],store:{get:()=>undefined},methods:()=>({
  'plans.cleanup.preview':async params=>{calls.push(params);return {token:'preview-only'}}
 })});
 assert.deepEqual(await gateway.call('cleanup_preview',{planFile:'plans/p.yaml',action:'delete'}),{token:'preview-only'});
 assert.deepEqual(calls[0],{planFile:'plans/p.yaml',action:'delete',authorizationMode:'confirmed_paths'});
 await gateway.call('cleanup_preview',{planFile:'plans/p.yaml',action:'move'});
 assert.deepEqual(calls[1],{planFile:'plans/p.yaml',action:'move'});
 await assert.rejects(gateway.call('cleanup_preview',{planFile:'plans/p.yaml',action:'delete',confirm:true}),/Unknown/);
 assert.equal(calls.length,2);
});

test('MCP transport marks an in-band backend failure as an error',async()=>{
 const {Client}=require('@modelcontextprotocol/sdk/client/index.js');
 const {InMemoryTransport}=require('@modelcontextprotocol/sdk/inMemory.js');
 const {createProjectMcpServer}=require('../../src/mcp/Server.ts');
 const root=path.resolve(__dirname,'../..');let failTransport=false;
 const gateway=new ProjectGateway({root:()=>root,workers:()=>[],store:{get:()=>undefined},methods:()=>({}),
  sftp:{methods:async()=>['status','files.cleanup.observeBatch'],call:async()=>{if(failTransport)throw Error('transport unavailable');return {ok:false,error:'backend refused'}}}});
 const server=createProjectMcpServer('fixture',async(method,params)=>method==='mcp.catalog'?gateway.catalog():gateway.call(params.tool,params.arguments));
 const client=new Client({name:'mcp-error-test',version:'1.0.0'}),[a,b]=InMemoryTransport.createLinkedPair();
 try{
  await server.connect(a);await client.connect(b);
  const catalog=await client.listTools();
  const observe=catalog.tools.find(tool=>tool.name==='file_cleanup_observe_batch');
  assert.deepEqual(observe.inputSchema.properties.targets.items.properties.device.type,['string','number']);
  const rejected=await client.callTool({name:'sftp_status',arguments:{}});
  assert.equal(rejected.isError,true);assert.deepEqual(rejected.structuredContent,{ok:false,error:'backend refused'});
  failTransport=true;const disconnected=await client.callTool({name:'sftp_status',arguments:{}});
  assert.equal(disconnected.isError,true);assert.match(disconnected.structuredContent.error,/transport unavailable/);
 }finally{await client.close();await server.close()}
});
