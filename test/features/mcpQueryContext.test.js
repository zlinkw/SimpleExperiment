const test=require('node:test'),assert=require('node:assert/strict');
require('../_helpers/registerTsRequire');
const {queryProject}=require('../../src/mcp/ProjectQueries.ts');
const neutral=require('../../src/mcp/query/ExecutionContext.ts');
const existing=require('../../src/cli/ExecutionContext.ts');
const support=require('../../src/mcp/query/Support.ts');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');

test('concurrent MCP project queries keep RPC and structured output isolated',async()=>{
 assert.equal(neutral.businessContext,existing.businessContext);
 const cwd=process.cwd(),calls=[];
 const make=tag=>async method=>{await new Promise(resolve=>setImmediate(resolve));calls.push([tag,method]);
  if(method==='status')return {topology:{workers:[{id:tag,online:true}]}};
  if(method==='gpu.list')return {};if(method==='server.testAll')return {rows:[]};throw Error('unexpected '+method)};
 const [a,b]=await Promise.all([queryProject('C:/one',make('one'),'server_list',{}),queryProject('C:/two',make('two'),'server_list',{})]);
 assert.equal(a[0].id,'one');assert.equal(b[0].id,'two');assert.equal(calls.length,6);assert.equal(process.cwd(),cwd);
 assert.equal(neutral.businessContext.getStore(),undefined);
});

test('MCP result_parse uses content-selected preset and preserves zero',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'g004-mcp-parse-'));
 fs.writeFileSync(path.join(root,'metrics.csv'),'experiment_id,accuracy,ap\nrun-a,0,0.75\n','utf8');
 const result=await queryProject(root,async()=>{throw Error('unexpected RPC')},'result_parse',{file:'metrics.csv'});
 assert.equal(result.length,1);assert.equal(result[0].metrics.accuracy.value,0);assert.equal(result[0].metrics.AP.value,0.75);
 await assert.rejects(queryProject(root,async()=>{},'result_parse',{file:'metrics.csv',preset:'unknown'}),/unknown result preset/);
});

test('neutral query support requires context and preserves optional RPC semantics',async()=>{
 assert.throws(()=>support.emit({}),/MCP_QUERY_CONTEXT_REQUIRED/);
 assert.throws(()=>support.callApi('status'),/MCP_QUERY_CONTEXT_REQUIRED/);
 let output;await neutral.businessContext.run({root:'fixture',emit:value=>{output=value},rpc:async method=>{
  if(method==='missing')throw Object.assign(Error('missing'),{apiCode:-32601});
  if(method==='denied')throw support.businessError('denied');return {zero:0};
 }},async()=>{assert.equal(await support.optionalApi('missing'),null);await assert.rejects(support.optionalApi('denied'),/denied/);support.emit(await support.callApi('status'))});
 assert.deepEqual(output,{zero:0});
});
