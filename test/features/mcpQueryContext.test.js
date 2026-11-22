const test=require('node:test'),assert=require('node:assert/strict');
require('../_helpers/registerTsRequire');
const {queryProject}=require('../../src/mcp/ProjectQueries.ts');
const neutral=require('../../src/mcp/query/ExecutionContext.ts');
const existing=require('../../src/cli/ExecutionContext.ts');

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
