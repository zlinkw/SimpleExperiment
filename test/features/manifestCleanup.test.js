const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const {createRequire}=require('node:module');
const {cleanupDigest}=require('../../dist/features/PlanCleanup');
async function fixture(){
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'manifest-cleanup-'));
  const file='experiments/plans/p.yaml';await fs.mkdir(path.join(root,'experiments/plans'),{recursive:true});
  await fs.writeFile(path.join(root,file),'name: p\ncases: [a, b]\nseeds: [42]\n','utf8');
  const modulePath=path.resolve(__dirname,'../../dist/extension/PlanCleanupHost.js'),exports={};
  const localRequire=createRequire(modulePath);
  const vscode={workspace:{workspaceFolders:[{uri:{fsPath:root}}],textDocuments:[]},window:{}};
  vm.runInNewContext(await fs.readFile(modulePath,'utf8'),{exports,require:name=>name==='vscode'?vscode:name==='./PlanCleanupPanel'?{}:localRequire(name),AbortSignal,console});
  const declarations=[0,1].map(index=>({index,case:index?'b':'a',seed:42,output_dir:'work/job'+index,result_csv:'tmp/result/job'+index+'.csv'}));
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
        return {target:{manifests:[{relativePath:declaration.output_dir+'/artifact_manifest.json',sha256:'a'.repeat(64),binding:{
          planFile:file,runId:'no-retained-command-record',outputDir:declaration.output_dir,resultCsv:declaration.result_csv,index:declaration.index,case:declaration.case,seed:42}}]}};
      }
      if(method==='files.cleanup.preview'){
        const targets=params.targets.map(row=>({...row,absolutePath:params.node.root+'/'+row.relativePath,
          fingerprint:'fp-'+row.relativePath,contentFingerprint:'fp-'+row.relativePath.replace(/^clean_dir\/(?:job-[a-f0-9]{48}\/)?/,''),inode:row.relativePath.replace(/^clean_dir\/(?:job-[a-f0-9]{48}\/)?/,''),device:'1',inventory:[],size:1}));
        if(params.action==='restore'&&params.targets.some(row=>sources.has(row.destination)))throw Error('DESTINATION_EXISTS');
        const result={token:cleanupDigest([calls.length,targets]).slice(0,48),digest:cleanupDigest(targets),node:params.node,targets,
          action:params.action,rootIdentity:{path:params.node.root},safety:{gitRepositoryAncestors:true,readOnlyReceiptCheck:true,managedObservation:1,immutableArchiveBatch:true,batchPreviewCapacity:4096}};
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
  const select={workflowId:'selection',commandId:'selection',index:0,purpose:'replace_outputs',manifest:{declarations,replacement:true}};
  const preview=(action='delete')=>adapter.service.preview({planFile:file,action,job:select});
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
