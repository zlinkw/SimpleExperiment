const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
require('../_helpers/registerTsRequire');
const {ProjectGateway}=require('../../src/mcp/ProjectGateway.ts');
const {createProjectAuthorization}=require('../../src/mcp/ProjectAuthorization.ts');
const {mcpInvocation}=require('../../src/mcp/Invocation.ts');
const root=path.resolve(__dirname,'../..'),digest='a'.repeat(64);
const workers=[{id:'n1',host:'host1',port:22,user:'user',projectRoot:'/project1'},{id:'n2',host:'host2',port:22,user:'user',projectRoot:'/project2'}];
const src=fs.readFileSync(path.resolve('src/extension/legacy.ts'),'utf8');
const start=src.indexOf('    async apiAgentLifecycle(params = {}) {'),end=src.indexOf('    async agentLifecycleServer(',start);assert.ok(start>=0&&end>start);
const expression=src.slice(start,end).trim().replace('async apiAgentLifecycle(params = {})','async function(params = {})');
function fixture(){
 const calls=[];let grant=createProjectAuthorization(root);grant.workers=workers;
 const context={root},deps={stringArrayField:(obj,key)=>Array.isArray(obj[key])?[...new Set(obj[key].filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim()))]:[],
  AgentRuntimeScope_1:{selectAgentRuntimeTargets:(targets,ids)=>ids.map(id=>{const row=targets.find(t=>t.id===id);if(!row)throw Error('unknown target');return row})},
  mcpInvocation,isDeepStrictEqual:require('node:util').isDeepStrictEqual,confirmationRequired:preview=>Object.assign(Error('CONFIRM_REQUIRED'),{apiCode:2001,apiData:preview}),
  normalizeRemoteWriteTargets:x=>x,AgentTmuxPolicy_1:{defaultAgentTmuxSessionName:()=>'',defaultAgentTmuxWindowName:()=>''},path,__dirname:root,
  fs:{readFile:async()=>''},RuntimeManifest_1:{CURRENT_RUNTIME_VERSION:'fixture',sha256Text:()=>''}};
 const method=new Function(...Object.keys(deps),`return (${expression})`)(...Object.values(deps));
 const host={setupConfig:{workerTunnels:workers,remoteTmuxSessionPrefix:'fixture',condaEnv:'fixture'},tunnelConfig:{},
  agentRuntimeUploadTargets:()=>workers,captureProjectContext:()=>context,projectContextIsCurrent:c=>c===context,
  agentLifecycleForTarget:async(target,action,_manifest,confirmed,echo)=>{calls.push({id:target.id,action,confirmed,echo});return action==='inspect'?{status:'legacy',legacyMigration:{digest}}:{status:'migrated'}}};
 const gateway=new ProjectGateway({root:()=>root,workers:()=>workers,store:{get:()=>grant},methods:()=>({'agents.lifecycle':method.bind(host)})});
 return {gateway,calls,revoke:()=>{grant.permissions=[]}};
}

test('MCP Agent inspect and authorized mutation preserve explicit target identity',async()=>{
 const f=fixture();const inspected=await f.gateway.call('agent_inspect',{serverIds:['n1','n2']});assert.equal(inspected.results.length,2);
 assert.deepEqual(f.calls.map(x=>[x.id,x.action]),[['n1','inspect'],['n2','inspect']]);
 await f.gateway.call('agent_stop',{serverIds:['n1']});assert.deepEqual(f.calls.at(-1),{id:'n1',action:'stop',confirmed:true,echo:undefined});
 f.revoke();await assert.rejects(f.gateway.call('agent_stop',{serverIds:['n1']}),/AUTHORIZATION_REQUIRED/);assert.equal(f.calls.length,3);
});

test('MCP migration demands the exact digest before the mock mutation',async()=>{
 const f=fixture();
 for(const migrationDigests of [undefined,{n1:'b'.repeat(64)}]){
  await assert.rejects(f.gateway.call('agent_migrate',{serverIds:['n1'],...(migrationDigests?{migrationDigests}:{})}),e=>e.apiCode===2001&&e.apiData.params.migrationDigests.n1===digest);
 }
 assert.ok(f.calls.every(x=>x.action==='inspect'));
 const result=await f.gateway.call('agent_migrate',{serverIds:['n1'],migrationDigests:{n1:digest}});
 assert.equal(result.results[0].status,'migrated');assert.deepEqual(f.calls.at(-1),{id:'n1',action:'migrate',confirmed:true,echo:digest});
 await assert.rejects(f.gateway.call('agent_migrate',{serverIds:['n1'],confirm:true}),/Unknown/);
});
