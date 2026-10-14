const test=require('node:test'),assert=require('node:assert/strict');
const {parseArgv}=require('../../dist/cli/parse');
test('manual dispatch CLI preserves exact workflow, selected jobs, Worker and busy GPU authorization',()=>{
 const p=parseArgv(['task','dispatch','--workflow','original','--jobs','0,2','--worker','gpu-server','--gpu','0','--confirm','--stop-running']);
 assert.deepEqual(p.positionals,['task','dispatch']);assert.equal(p.flags.gpu,'0');assert.equal(p.flags.jobs,'0,2');assert.equal(p.flags.worker,'gpu-server');assert.equal(p.flags.workflow,'original');assert.equal(p.flags.confirm,true);assert.equal(p.flags['stop-running'],true);
});
test('CLI cannot infer job zero from absent or malformed selection',async()=>{
 const api=require('../../dist/cli/api'),format=require('../../dist/cli/format'),{runSimpleCli}=require('../../dist/cli/index');
 const old=[api.optionalApi,api.callApi,format.writeJson];let calls=0;
 api.optionalApi=async()=>undefined;api.callApi=async()=>{calls++;return {status:'submitted'}};format.writeJson=()=>{};
 try{
  for(const extra of [[],['--jobs',''],['--jobs','1,'],['--jobs','false']])await assert.rejects(runSimpleCli(['task','dispatch','--workflow','w','--worker','a','--gpu','0','--confirm',...extra]),/jobs|索引/);
  assert.equal(calls,0);
  await runSimpleCli(['task','dispatch','--workflow','w','--worker','a','--gpu','0','--confirm','--jobs','0,2']);assert.equal(calls,1);
 }finally{[api.optionalApi,api.callApi,format.writeJson]=old;}
});
