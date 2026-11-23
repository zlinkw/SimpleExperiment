const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
require('../_helpers/registerTsRequire');
const {queryProject}=require('../../src/mcp/ProjectQueries.ts');

test('MCP log and config queries retain local evidence and the requested tail',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'g004-mcp-logs-'));
 const write=(name,body)=>{const p=path.join(root,name);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,body,'utf8')};
 write('experiments/plans/p.yaml','suite: demo\nseed: 42\ndataset: data/train\nmodel: resnet\noptimizer: adam\nbatch_size: 8\nepochs: 20\n');
 write('experiments/runs/run-one/stdout.log','2026-01-02T00:00:00Z WARN first\nWARNING second\nERROR third\n');
 write('simple_cluster/experiment_index.json',JSON.stringify([{global_job_id:'run-one',type:'run',status:'failed',
  plan:'experiments/plans/p.yaml',seed:42,stdout:'experiments/runs/run-one/stdout.log'}]));
 const rpc=async method=>{
  if(method==='tasks.list')return {tasks:[]};if(method==='operations.list')return {records:[]};
  if(method==='state.get')return {value:{workerTunnels:[]}};if(method==='live.output')throw Object.assign(Error('method not found'),{apiCode:-32601});throw Error('unexpected RPC '+method);
 };
 const log=await queryProject(root,rpc,'experiment_log',{id:'run-one'});
 assert.deepEqual(log.map(row=>row.level),['WARNING','WARNING','ERROR']);assert.equal(log[1].message,'WARNING second');
 const tail=await queryProject(root,rpc,'experiment_log',{id:'run-one',lines:1});
 assert.equal(tail.length,1);assert.equal(tail[0].message,'ERROR third');
 const config=await queryProject(root,rpc,'experiment_config',{id:'run-one'});
 assert.match(config.config_path,/plans[\\/]p\.yaml/);assert.match(config.yaml,/resnet/);
 assert.equal(String(config.seed),'42');assert.equal(config.dataset,'data/train');assert.equal(config.model,'resnet');
 assert.equal(config.optimizer,'adam');assert.equal(config.batch_size,'8');assert.equal(config.epoch,'20');
});
