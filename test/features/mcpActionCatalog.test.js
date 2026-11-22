const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
require('../_helpers/registerTsRequire');
const {ProjectGateway}=require('../../src/mcp/ProjectGateway.ts');

test('MCP action catalog forwards the current host table and never invents unavailable actions',async()=>{
 const root=path.resolve(__dirname,'../..'),calls=[];
 const table={actions:[{command:'refreshResults',safe:true,confirm:false,action:'refresh-results'},
  {command:'runPlan',safe:false,confirm:true,action:'run-plan'},{command:'promoteDraft',safe:false,confirm:true,action:''}],count:3};
 let available=true;
 const gateway=new ProjectGateway({root:()=>root,workers:()=>[],store:{get:()=>undefined},methods:()=>available?{'actions.list':async params=>{calls.push(params);return table}}:{}});
 assert.deepEqual(await gateway.call('action_catalog',{}),table);assert.deepEqual(calls,[{}]);
 await assert.rejects(gateway.call('action_catalog',{unexpected:true}),/Unknown/);assert.equal(calls.length,1);
 available=false;assert.ok(!(await gateway.catalog()).some(row=>row.name==='action_catalog'));
 await assert.rejects(gateway.call('action_catalog',{}),/MCP_TOOL_UNAVAILABLE/);assert.equal(calls.length,1);
});
