const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const {spawnSync}=require('node:child_process');
require('../_helpers/registerTsRequire');
const Q=require('../../src/features/DistributedPlanQueue.ts');
const toLinux=file=>'/mnt/'+file[0].toLowerCase()+file.slice(2).replace(/\\/g,'/');
test('real isolated tmux stop ignores revision/cache drift, fences queued commands and preserves other tasks',()=>{
  const runtime=path.resolve(__dirname,'../../dist/runtime/cluster_agent.py'),script=path.join(__dirname,'localStopControl.fixture.py');
  const proc=spawnSync(process.platform==='win32'?'wsl.exe':'python3',process.platform==='win32'
    ? ['--distribution',process.env.SIMPLE_TEST_WSL_DISTRO||'Ubuntu-Codex','--exec','python3',toLinux(script),toLinux(runtime)] : [script,runtime],
    {encoding:'utf8',windowsHide:true,timeout:10000});
  assert.equal(proc.status,0,proc.stderr||proc.stdout);
  assert.deepEqual(JSON.parse(proc.stdout),{ok:true,realTmux:true,cases:8,pidSignals:0,scientificProcesses:0});
});
test('plugin local stop sends one original command request without capability/version or post-stop snapshot gates',async()=>{
  const source=fs.readFileSync(path.join(__dirname,'../../src/extension/legacy.ts'),'utf8');
  const ast=ts.createSourceFile('host.ts',source,ts.ScriptTarget.Latest,true);let method;
  function visit(node){if(ts.isMethodDeclaration(node)&&node.name.getText(ast)==='stopDistributedJobForClear')method=node.getText(ast);ts.forEachChild(node,visit);}visit(ast);
  const Stop=vm.runInNewContext(ts.transpileModule('class Stop {'+method+'};Stop;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,
    {DistributedPlanQueue:Q,workspaceRoot:()=>'/fixture',makeOpId:()=> 'stop-command'});
  const plan={id:'workflow',projectId:'project',resultPathPolicy:'declared',revision:'current',codeFingerprint:'current',jobs:[]};
  const job={index:0,case:'a',seed:42,workerId:'w',commandId:'original',globalJobId:'workflow:0',outputDir:'work/job',collectionResultCsv:'tmp/result/a.csv'};
  const host=new Stop(),calls=[];host.refreshExactPaneStopCapability=()=>assert.fail('stop must not require version probe');
  host.client={getWorkerTasks:()=>assert.fail('no extra snapshot gate'),postWorkerAction:async(worker,action,request)=>{
    calls.push(request);assert.equal(request.targetCommandId,'original');assert.equal(request.opId,request.operationId);
    return {status:'completed',stoppedTasks:[{commandId:'original',workflowId:'workflow',projectId:'project',workerId:'w',stopBoundary:'local_command',paneClosed:true,cacheRetired:true}]};}};
  await host.stopDistributedJobForClear(plan,job,true);assert.equal(calls.length,1);
  assert.equal(calls[0].stopBoundary,'local_command');
  host.client.postWorkerAction=async()=>({status:'failed',message:'TMUX_UNREACHABLE'});
  await assert.rejects(host.stopDistributedJobForClear(plan,job,true),/TMUX_UNREACHABLE/);
  assert.equal(job.commandId,'original');
});
test('local stop tombstones tolerate terminal revision drift; real new activity remains visible and pending stops cannot dispatch',()=>{
  const plan={id:'workflow',projectId:'project',planFile:'plans/p.yaml',revision:'current',codeFingerprint:'current',resultPathPolicy:'declared',
    planJobCount:1,enqueuedAt:new Date().toISOString(),jobs:[{index:0,case:'a',seed:42,workerId:'w',commandId:'original',runKey:'original',globalJobId:'workflow:0',
      outputDir:'work/job',collectionResultCsv:'tmp/result/a.csv',status:'failed',resultPathPolicy:'declared'}]};
  const key=Q.distributedJobControlKey(plan,plan.jobs[0]);
  const cleared=Q.removeConfirmedDistributedPlan({schemaVersion:1,plans:[plan]},plan.planFile,{jobKeys:new Set([key]),localControlJobKeys:new Set([key]),deferredIds:new Set()});
  assert.equal(cleared.clearedJobs[0].stopBoundary,'local_command');
  const task={...plan.jobs[0],workflowId:plan.id,experimentIndex:0,projectId:'project',planFile:plan.planFile,planRevision:'older',codeFingerprint:'older',
    planJobCount:1,enqueuedAt:plan.enqueuedAt,finishedAt:plan.enqueuedAt};
  const snapshot={workerId:'w',capabilities:{durablePlanQueue:true,schemaVersion:1},generatedAt:plan.enqueuedAt,fetchedAt:plan.enqueuedAt,tasks:[task]};
  assert.deepEqual(Q.mergeDurableWorkerSnapshots(cleared,[snapshot],'project').plans,[]);
  task.status='running';assert.equal(Q.mergeDurableWorkerSnapshots(cleared,[snapshot],'project').plans[0].jobs[0].status,'running');
  const pending={...plan,jobs:[{...plan.jobs[0],attempt:0,status:'pending',stopIntent:{commandId:'original',workerId:'w',requestedAt:plan.enqueuedAt,state:'pending'}}]};
  const allocated=Q.allocateAvailable({schemaVersion:1,plans:[pending]},[{workerId:'w',idleGpuIds:['0'],online:true,declaredJobPaths:true}]);
  assert.equal(allocated.dispatches.length,0);
});
