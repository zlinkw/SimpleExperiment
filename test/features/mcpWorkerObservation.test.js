const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
require('../_helpers/registerTsRequire');
const {queryProject}=require('../../src/mcp/ProjectQueries.ts');

test('MCP observes only a running window and reads its configured progress from a synthetic endpoint',async(t)=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'g004-mcp-observation-')),requests=[];
 const server=http.createServer((req,res)=>{
  requests.push(req.url);res.writeHead(200,{'content-type':req.url.startsWith('/api/files/download')?'text/plain':'application/json'});
  if(req.url==='/api/tmux/list')res.end(JSON.stringify({sessions:[{name:'fixture-gpu-0',windows:[
   {name:'run-1790237001150',target:'fixture-gpu-0:1',task:{commandId:'run3-998997-687',status:'running',gpuId:'0',case:'sample',seed:0,planFile:'plans/p.yaml',configPath:'work_dirs/run/job_config.yaml'}},
   {name:'run-1790231236812',target:'fixture-gpu-0:2',task:{commandId:'run0-228782-829',status:'completed'}}
  ]}]}));
  else if(req.url.startsWith('/api/tmux/capture'))res.end(JSON.stringify({text:'Epoch 15: Val Loss = 1.3842'}));
  else if(req.url.startsWith('/api/files/download'))res.end('train:\n  epochs: 300\n');
  else {res.writeHead(404);res.end()}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>{server.closeAllConnections();return new Promise(resolve=>server.close(resolve))});
 const rpc=async method=>{
  if(method==='tasks.list')return {tasks:[]};if(method==='operations.list')return {records:[]};
  if(method==='state.get')return {value:{workerTunnels:[{id:'fixture-worker',localForwardHost:'127.0.0.1',localForwardPort:server.address().port}]}};
  throw Error('unexpected RPC '+method);
 };
 const active=await queryProject(root,rpc,'experiment_active',{full:true});
 assert.equal(active.runs.length,1);assert.equal(active.runs[0].id,'run3-998997-687');
 assert.equal(active.runs[0].progress.epoch,15);assert.equal(active.runs[0].progress.max_epoch,300);assert.equal(active.runs[0].progress.percent,5);
 assert.equal(requests.filter(url=>url.startsWith('/api/tmux/capture')).length,1);
 assert.match(requests.find(url=>url.startsWith('/api/tmux/capture')),/fixture-gpu-0%3A1/);
 assert.equal(requests.filter(url=>url.startsWith('/api/files/download')).length,1);
});
