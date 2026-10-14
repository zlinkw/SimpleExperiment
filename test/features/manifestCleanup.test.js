const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const {createRequire}=require('node:module');
const {cleanupDigest}=require('../../dist/features/PlanCleanup');
async function fixture({retiredWithoutCsv=false}={}){
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'manifest-cleanup-'));
  const file='experiments/plans/p.yaml';await fs.mkdir(path.join(root,'experiments/plans'),{recursive:true});
  await fs.writeFile(path.join(root,file),'name: p\ncases: [a, b]\nseeds: [42]\n','utf8');
  const modulePath=path.resolve(__dirname,'../../dist/extension/PlanCleanupHost.js'),exports={};
  const localRequire=createRequire(modulePath);
  const vscode={workspace:{workspaceFolders:[{uri:{fsPath:root}}],textDocuments:[]},window:{}};
  vm.runInNewContext(await fs.readFile(modulePath,'utf8'),{exports,require:name=>name==='vscode'?vscode:name==='./PlanCleanupPanel'?{}:localRequire(name),AbortSignal,console});
  const output='work_dirs/quality_composition/all_low_quality_min_integer_gap/final/concatenation/5_concatenation_pad_p100_seed44';
  const declarations=retiredWithoutCsv?[{index:5,case:'concatenation_pad_p100',seed:44,output_dir:output,result_csv:output+'/test_results/job_metrics.csv'}]
    :[0,1].map(index=>({index,case:index?'b':'a',seed:42,output_dir:'work/job'+index,result_csv:'tmp/result/job'+index+'.csv'}));
  const sources=new Set(declarations.flatMap(row=>[row.output_dir,row.result_csv])),calls=[],backends=new Map();let mutations=0,queryFail=false,changed=false;
  const host={taskLifecycleProtocol:2,context:{globalStorageUri:{fsPath:path.join(root,'plugin')}},setupConfig:{workerTunnels:[{id:'worker'}]},
    workerCodeSyncTarget:()=>({host:'fixture',port:2222,user:'fixture',remotePath:'/fixture/project'}),
    client:{getWorkerTasks:async(_id,options)=>{assert.equal(options.discovery.planFile,file);return {declaredJobs:declarations}}},
    loadDistributedQueue:async()=>({plans:[],clearedJobs:[]}),saveDistributedQueue:async()=>{},updatePlanSyncLedger:async()=>{},postState:()=>{},
    simpleSftpApiCall:async(method,params)=>{
      calls.push({method,params});
      if(method==='files.cleanup.inspect'){
        if(params.node.kind==='local'||!sources.has(params.target.relativePath))return {target:{missing:true}};
        const declaration=declarations.find(row=>row.output_dir===params.target.relativePath);
        return {target:{manifests:retiredWithoutCsv?[
          {relativePath:declaration.output_dir+'/artifact_manifest.json',sha256:'a'.repeat(64),binding:{outputDir:declaration.output_dir},planHints:[file]},
          {relativePath:declaration.output_dir+'/formal_job_owner.json',sha256:'b'.repeat(64),binding:{runId:'retired-command',outputDir:declaration.output_dir,
            resultCsv:declaration.result_csv,index:declaration.index,case:declaration.case,seed:declaration.seed},planHints:[file]},
        ]:[{relativePath:declaration.output_dir+'/artifact_manifest.json',sha256:'a'.repeat(64),binding:{
          planFile:file,runId:'no-retained-command-record',outputDir:declaration.output_dir,resultCsv:declaration.result_csv,index:declaration.index,case:declaration.case,seed:42}}]}};
      }
      if(method==='files.cleanup.preview'){
        const targets=params.targets.map(row=>({...row,absolutePath:params.node.root+'/'+row.relativePath,
          fingerprint:'fp-'+row.relativePath,contentFingerprint:'fp-'+row.relativePath.replace(/^clean_dir\/(?:job-[a-f0-9]{48}\/)?/,''),inode:row.relativePath.replace(/^clean_dir\/(?:job-[a-f0-9]{48}\/)?/,''),device:'1',inventory:[],size:1}));
        if(params.action==='restore'&&params.targets.some(row=>sources.has(row.destination)))throw Error('DESTINATION_EXISTS');
        const result={token:cleanupDigest([calls.length,targets]).slice(0,48),digest:cleanupDigest(targets),node:params.node,targets,
          action:params.action,rootIdentity:{path:params.node.root},safety:{gitRepositoryAncestors:true,readOnlyReceiptCheck:true,managedObservation:1,confirmedPathDeletion:1,immutableArchiveBatch:true,batchPreviewCapacity:4096}};
        backends.set(result.token,result);return result;
      }
      const backend=backends.get(params.token);assert.ok(backend,method);
      if(method==='files.cleanup.status')return backend;
      if(method==='files.cleanup.confirm')return {ok:true};
      const target=backend.targets[params.index];
      if(method==='files.cleanup.check'){
        if(queryFail)throw Error('offline');
        return {state:changed?'changed':sources.has(target.relativePath)?'pending':'completed',verifiedBy:'actual_filesystem'};
      }
      if(method==='files.cleanup.verify'){if(sources.has(target.relativePath))throw Error('SOURCE_RECREATED_OR_CHANGED');return {ok:true};}
      if(method==='files.cleanup.execute'){
        assert.equal(params.digest,backend.digest);mutations++;sources.delete(target.relativePath);if(backend.action!=='delete')sources.add(target.destination);
        return new Promise(()=>{}); // No receipt, callback, event, or saved Worker task exists.
      }
      assert.fail(method);
    }};
  const adapter=new exports.PlanCleanupHost(host,root);
  const select={workflowId:'selection',commandId:'selection',index:retiredWithoutCsv?5:0,purpose:'replace_outputs',...(!retiredWithoutCsv?{manifest:{declarations,replacement:true}}:{})};
  if(retiredWithoutCsv){
    const queuePath=require('../../dist/features/DistributedPlanQueue').distributedQueuePath(host.context.globalStorageUri.fsPath,root);
    await fs.mkdir(path.dirname(queuePath),{recursive:true});
    await fs.writeFile(queuePath,JSON.stringify({schemaVersion:1,plans:[],clearedJobs:[{workflowId:select.workflowId,commandId:select.commandId,
      experimentIndex:5,case:'concatenation_pad_p100',seed:44,planFile:file,outputDir:output,resultPathPolicy:'declared'}]}),'utf8');
  }
  const preview=(action='delete',wholePlan=false,pathOnly=false)=>adapter.service.preview({planFile:file,action,...(!wholePlan?{job:select}:{}),...(pathOnly?{authorizationMode:'confirmed_paths'}:{})});
  const confirm=async p=>{for(const phase of p.action==='delete'?[1,2]:[1])await adapter.service.confirm({token:p.token,digest:p.digest,phase,confirm:true,
    exactTargets:p.rows.filter(row=>row.disposition===p.action).map(row=>row.node.id+':'+row.absolutePath)});};
  return {adapter,host,sources,declarations,calls,preview,confirm,fail:value=>queryFail=value,change:()=>changed=true,get mutations(){return mutations}};
}
test('PLAN and real manifests authorize exact multi-job replacement without retained job/receipt state',async()=>{
  const f=await fixture(),p=await f.preview();assert.deepEqual(Array.from(p.blockers),[]);assert.equal(p.rows.filter(row=>row.disposition==='delete').length,4);
  assert.equal(f.mutations,0);await assert.rejects(f.adapter.execute(p.token));
  await f.confirm(p);const result=await f.adapter.execute(p.token);assert.equal(result.state,'completed');assert.equal(f.mutations,4);
  assert.equal((await f.adapter.service.status(p.token)).state,'completed');await f.adapter.execute(p.token);assert.equal(f.mutations,4);
  assert.ok(f.calls.filter(row=>row.method==='files.cleanup.inspect').every(row=>row.params.manifestOnly));
  f.fail(true);assert.equal((await f.adapter.service.status(p.token)).state,'partial');f.fail(false);
  assert.equal((await f.adapter.service.status(p.token)).state,'completed');f.change();assert.equal((await f.adapter.service.status(p.token)).state,'partial');
});
test('native move/restore uses frozen targets after manifests disappear; restore never overwrites a new job',async()=>{
  const f=await fixture(),p=await f.preview('move');await f.confirm(p);assert.equal((await f.adapter.execute(p.token)).state,'completed');
  f.sources.add('work/job0');await assert.rejects(f.adapter.service.restorePreview(p.token),/SOURCE_RECREATED|DESTINATION_EXISTS/);f.sources.delete('work/job0');
  const restore=await f.adapter.service.restorePreview(p.token);await f.confirm(restore);assert.equal((await f.adapter.execute(restore.token)).state,'completed');
  assert.ok(f.sources.has('work/job0'));assert.ok(f.sources.has('tmp/result/job1.csv'));assert.equal(f.mutations,8);
});
test('changed declaration invalidates confirmations; unrelated task history never changes the preview',async()=>{
  const f=await fixture(),p=await f.preview();f.declarations[0].output_dir='work/new';
  // Frozen declaration set is revalidated against the on-disk PLAN/config hash, not mutable queue history.
  const root=f.host.context.globalStorageUri.fsPath.replace(/[\\/]plugin$/,'');
  await fs.appendFile(path.join(root,'experiments/plans/p.yaml'),'# changed\n','utf8');
  await assert.rejects(f.confirm(p),/PREVIEW_CHANGED/);assert.equal(f.mutations,0);
});

test('actual retired job shape without result CSV is reviewed from its manifest in both job and whole-PLAN pages',async()=>{
  for(const wholePlan of [false,true]){
    const f=await fixture({retiredWithoutCsv:true}),p=await f.preview('delete',wholePlan);
    assert.deepEqual(Array.from(p.blockers),[]);
    const outputs=p.rows.filter(row=>row.relativePath===f.declarations[0].output_dir&&row.node.kind==='remote');
    assert.equal(outputs.length,1);assert.equal(outputs[0].disposition,'delete');
    assert.ok(outputs[0].evidence.some(text=>text.includes('formal_job_owner.json')));
    assert.ok(f.calls.some(row=>row.method==='files.cleanup.inspect'&&row.params.manifestOnly));
    assert.equal(f.mutations,0);
    await f.confirm(p);assert.equal(f.mutations,0);
  }
});

test('missing CSV does not authorize a directory without matching manifest ownership',async()=>{
  const f=await fixture({retiredWithoutCsv:true}),original=f.host.simpleSftpApiCall;
  f.host.simpleSftpApiCall=async(method,params)=>{
    const result=await original(method,params);
    if(method==='files.cleanup.inspect'&&result.target.manifests)result.target.manifests=result.target.manifests.slice(0,1);
    return result;
  };
  const p=await f.preview();assert.ok(p.blockers.some(row=>row.code==='OWNERSHIP_UNVERIFIED'));
  await assert.rejects(f.confirm(p));assert.equal(f.mutations,0);
});

test('unsafe nonempty result paths name the actual invalid field and remain blocked',async()=>{
  const f=await fixture();f.declarations[0].result_csv='../outside.csv';
  const p=await f.preview();
  assert.ok(p.blockers.some(row=>row.code==='UNSAFE_DECLARED_PATH'&&row.detail.includes('result_csv')&&row.detail.includes('../outside.csv')));
  await assert.rejects(f.confirm(p));assert.equal(f.mutations,0);
});

test('path-confirmed deletion in both pages is independent of missing ownership, old state and later PLAN changes',async()=>{
  for(const wholePlan of [false,true]){
    const f=await fixture({retiredWithoutCsv:true}),original=f.host.simpleSftpApiCall;
    f.host.simpleSftpApiCall=async(method,params)=>{
      const result=await original(method,params);
      if(method==='files.cleanup.inspect'&&result.target.manifests)result.target.manifests=[];
      return result;
    };
    const p=await f.preview('delete',wholePlan,true);
    assert.deepEqual(Array.from(p.blockers),[]);assert.equal(p.scope.authorizationMode,'confirmed_paths');
    assert.ok(p.rows.some(row=>row.disposition==='delete'&&row.relativePath===f.declarations[0].output_dir));
    const root=f.host.context.globalStorageUri.fsPath.replace(/[\\/]plugin$/,'');
    await fs.appendFile(path.join(root,'experiments/plans/p.yaml'),'# newer PLAN does not redefine the frozen approved paths\n','utf8');
    await f.confirm(p);assert.equal(f.mutations,0);
    assert.ok(f.calls.filter(row=>row.method==='files.cleanup.preview').every(row=>row.params.authorizationMode==='confirmed_paths'));
  }
});

test('explicit typed paths do not require PLAN, job history or collect callbacks to exist',async()=>{
  const f=await fixture({retiredWithoutCsv:true}),p=await f.preview('delete',false,true);
  f.adapter.service.ports.collect=async()=>assert.fail('explicit paths must not reload PLAN or historical state');
  const params={planFile:p.scope.planFile,action:'delete',authorizationMode:'confirmed_paths',job:p.scope.job,
    exactPaths:p.rows.filter(row=>row.disposition==='delete').map(row=>({nodeId:row.nodeId,relativePath:row.relativePath,type:row.type}))};
  const direct=await f.adapter.service.preview(params);assert.deepEqual(Array.from(direct.blockers),[]);
  await f.confirm(direct);assert.equal(f.mutations,0);
  await assert.rejects(f.adapter.service.preview({...params,exactPaths:[{nodeId:'worker',relativePath:'../outside',type:'directory'}]}),/UNSAFE_PATH/);
});

test('stale conflicting manifest result paths cannot hide an explicitly reviewed output directory',async()=>{
  for(const unsafe of [false,true]){
    const f=await fixture({retiredWithoutCsv:true}),original=f.host.simpleSftpApiCall;
    f.host.simpleSftpApiCall=async(method,params)=>{
      const result=await original(method,params);
      if(method==='files.cleanup.inspect'&&result.target.manifests?.length){
        result.target.manifests.push({...result.target.manifests[1],binding:{...result.target.manifests[1].binding,
          resultCsv:unsafe?'../outside.csv':'tmp/result/old-other-result.csv'}});
      }
      return result;
    };
    const p=await f.preview('delete',false,true);
    assert.deepEqual(Array.from(p.blockers),[]);
    assert.ok(p.rows.some(row=>row.disposition==='delete'&&row.relativePath===f.declarations[0].output_dir));
    assert.ok(!p.rows.some(row=>row.relativePath==='tmp/result/old-other-result.csv'||row.relativePath==='../outside.csv'));
    await f.confirm(p);assert.equal(f.mutations,0);
  }
});
