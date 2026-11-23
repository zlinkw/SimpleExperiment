const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
require('../_helpers/registerTsRequire');
const {ProjectGateway}=require('../../src/mcp/ProjectGateway.ts');
const {PROJECT_TOOLS}=require('../../src/mcp/ToolCatalog.ts');

test('MCP action catalog forwards the current host table and never invents unavailable actions',async()=>{
 const root=path.resolve(__dirname,'../..'),calls=[];
 const table={actions:[{command:'refreshResults',safe:true,confirm:false,action:'refresh-results'},
  {command:'runPlan',safe:false,confirm:true,action:'run-plan'}],count:2};
 let available=true;
 const gateway=new ProjectGateway({root:()=>root,workers:()=>[],store:{get:()=>undefined},methods:()=>available?{'actions.list':async params=>{calls.push(params);return table}}:{}});
 assert.deepEqual(await gateway.call('action_catalog',{}),table);assert.deepEqual(calls,[{}]);
 await assert.rejects(gateway.call('action_catalog',{unexpected:true}),/Unknown/);assert.equal(calls.length,1);
 for(const tool of PROJECT_TOOLS.filter(row=>row.method==='invoke')){
  assert.ok(tool.action);assert.equal(Object.hasOwn(tool.inputSchema.properties,'command'),false);
 }
 assert.ok(PROJECT_TOOLS.every(tool=>! /\bCLI\b/i.test(tool.description)));
 await assert.rejects(gateway.call('invoke',{command:'runPlan'}),/MCP_TOOL_UNAVAILABLE/);
 available=false;assert.ok(!(await gateway.catalog()).some(row=>row.name==='action_catalog'));
 await assert.rejects(gateway.call('action_catalog',{}),/MCP_TOOL_UNAVAILABLE/);assert.equal(calls.length,1);
});
