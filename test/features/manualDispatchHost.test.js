const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
function fixture(){
 const file=path.resolve('dist/extension/ManualDispatchHost.js'),loaded=new Module(file,module);loaded.filename=file;loaded.paths=Module._nodeModulePaths(path.dirname(file));
 const requireBase=loaded.require.bind(loaded);loaded.require=id=>id==='vscode'?{workspace:{workspaceFolders:[{uri:{fsPath:'project'}}]}}:requireBase(id);loaded._compile(fs.readFileSync(file,'utf8'),file);
 let sync=0,queries=0;const h={client:{getGpu:async()=>({w:[{index:0,utilizationPercent:100,excluded:true}]}),getWorkerTasks:async()=>{queries++;return {capabilities:{taskLifecycle:2}}}},enabledWorkerConfigs:()=>[{id:'w'},{id:'b'}],
  assertExecutionWorkersReady(){},assertExecutionAgentProjectsReady(){},workerActionTargets:()=>[],ensureCodeReadyForRun:async()=>sync++,captureProjectContext:()=>({}),
  lastCodeSyncState:{fingerprint:'hash'},lastWorkerTaskSnapshots:new Map()};
 return {host:new loaded.exports.ManualDispatchHost(h,'project'),get sync(){return sync},get queries(){return queries}};
}
test('actual manual Host accepts a busy excluded visible GPU, preserves sync and queries every Worker',async()=>{
 const f=fixture();await f.host.ports().prepare({codeFingerprint:'hash',jobs:[{manualDispatch:{workerId:'w',gpuId:'0',stage:'preparing'}}]});
 assert.equal(f.sync,1);assert.equal(f.queries,2);
});
test('unknown Worker and invisible GPU fail before sync, stopping or deletion',async()=>{
 const f=fixture();await assert.rejects(f.host.dispatch({confirm:true,workflowId:'p',indices:[0],workerId:'missing',gpuId:'0'}),/未启用|不存在/);
 await assert.rejects(f.host.ports().prepare({jobs:[{manualDispatch:{workerId:'w',gpuId:'99',stage:'preparing'}}]}),/GPU 不可见/);assert.equal(f.sync,0);assert.equal(f.queries,0);
});
