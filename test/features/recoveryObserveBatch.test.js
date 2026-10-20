const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
require('../_helpers/registerTsRequire');
const {PlanCleanup}=require('../../src/features/PlanCleanup.ts');
const FAST={confirmedPathDeletion:1,entryIdentityBind:1,batchedFastDelete:1,directoryTreeIsolateDelete:1,isolationRenameNoReplace:1,fastDeleteBatchLimit:5000,registeredIsolationDeletion:1};
const err=(code,message)=>Object.assign(new Error(message||code),{apiData:{code}});
const node=(id,port)=>({id,kind:'remote',root:'/fixture/project',host:id+'.invalid',port:port??2222,user:'fixture'});

/** Contract double for files.cleanup.observeBatch (recovery-observe-v110-contract.md v1); mutation and per-row RPCs always throw. */
function makeEngine({present=new Set(),residue=new Set(),missingRow=new Set(),duplicate=false,extra=false,
  mode=null,failNodes=new Set(),executingNodes=new Set(),unverified=false,hold=null}={}){
  const calls=[];let counters=0,inflight=0,peak=0,tokenCounter=0;
  const rpc=async(method,params)=>{
    calls.push({method,params});
    if(method==='files.cleanup.observeBatch'){
      counters++;inflight++;peak=Math.max(peak,inflight);
      try{
        if(hold)await hold;
        if(failNodes.has(params.node.id))throw err('SSH_QUERY_FAILED');
        if(mode==='unknownAction')throw err('UNKNOWN_ACTION');
        if(mode==='updateRequired')throw err('UPDATE_REQUIRED');
        if(typeof params.observationId!=='string'||![1,2].includes(params.readConcurrency)||!Array.isArray(params.targets)||params.targets.length===0||params.targets.length>5000)throw err('INVALID_OBSERVATION_REQUEST');
        const observations=params.targets.filter(target=>!missingRow.has(target.key)).map(target=>{
          const base={key:target.key,relativePath:target.relativePath,type:target.type};
          if(residue.has(target.key))return {...base,target:{missing:true,type:target.type},state:'unknown',isolationStatus:'present',executorsChecked:true,executors:[]};
          if(present.has(target.key)||present.has(target.relativePath))return {...base,target:{missing:false,type:target.type},state:'pending',executorsChecked:true,executors:executingNodes.has(target.key)?[{windowId:'@7'}]:[]};
          return {...base,target:{missing:true,type:target.type},state:'completed',...(target.isolationRelativePath?{isolationStatus:'gone'}:{}),executorsChecked:true,executors:executingNodes.has(target.key)?[{windowId:'@7'}]:[]};
        });
        if(unverified)for(const row of observations)delete row.executorsChecked;
        if(duplicate&&observations.length)observations.push(JSON.parse(JSON.stringify(observations[0])));
        if(extra)observations.push({key:'intruder-key',target:{missing:false}});
        const response={ok:true,observationId:params.observationId,capabilities:{batchCleanupObservation:1,maxTargets:5000},rootIdentity:{path:params.node.root},observations};
        if(mode==='legacy')delete response.capabilities.batchCleanupObservation;
        return response;
      } finally { inflight--; }
    }
    if(method==='files.cleanup.preview'){
      const targets=params.targets.map((target,index)=>present.has(target.key)||present.has(target.relativePath)
        ?{...target,absolutePath:params.node.root+'/'+target.relativePath,device:42,inode:200+index}
        :{...target,absolutePath:params.node.root+'/'+target.relativePath,missing:true});
      return {token:'ptok'+(++tokenCounter),digest:'pd'+tokenCounter,safety:{...FAST},rootIdentity:{path:params.node.root},targets,confirmations:0,node:params.node};
    }
    if(['files.cleanup.inspect','files.cleanup.check','files.cleanup.verify','files.cleanup.settle','files.cleanup.confirm','files.cleanup.execute','files.cleanup.status'].includes(method))
      throw new Error('recovery observation must not touch '+method);
    throw new Error('unexpected method '+method);
  };
  const of=m=>calls.filter(row=>row.method===m);
  return {rpc,calls,of,get peak(){return peak;},get observeCount(){return counters;}};
}

async function residueFixture(engineOptions={},rowsSpec){
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'v110-observe-')),id='b'.repeat(48);
  const engine=makeEngine(engineOptions);
  const specs=rowsSpec||[{node:node('worker'),total:1200,dirs:4,completed:1000}];
  const rows=[];
  for(const spec of specs)for(let index=0;index<spec.total;index++){
    const key=spec.node.id+'-'+index,relativePath='work_dirs/p/'+(index<spec.dirs?'d'+index:'f'+index);
    rows.push({id:key,nodeId:spec.node.id,node:spec.node,relativePath,absolutePath:spec.node.root+'/'+relativePath,
      type:index<spec.dirs?'directory':'file',category:'专用产物',owners:['p'],evidence:['exact registered target'],dependencies:[],
      disposition:'delete',destination:'',backendToken:'tok-'+spec.node.id,backendIndex:index,
      ...(index<spec.dirs?{isolationName:'__iso_'+relativePath.replace(/[^\w]/g,'_')}:{})});
  }
  const operation={id,state:'partial',executionRequestedAt:new Date().toISOString(),
    preview:{token:id,digest:'frozen',action:'delete',confirmations:2,
      scope:{projectId:'project',planFile:'plans/p.yaml',planKey:'p',nodes:[...new Set(specs.map(spec=>spec.node))],runIds:[],blockers:[],authorizationMode:'confirmed_paths',observationMode:'managed_tmux'},
      rows,blockers:[],expiresAt:Date.now()+60000},
    targets:Object.fromEntries(rows.map(row=>{
      const spec=specs.find(one=>row.id.startsWith(one.node.id+'-')),completed=Number(row.id.split('-').pop())<(spec.completed??0);
      return [row.id,completed?{state:'completed',receipt:{source:'active_query',verifiedBy:'path_absence',rootIdentity:{path:'/fixture/project'}}}:{state:'pending'}];
    })),
    pendingNodes:[],updatedAt:new Date().toISOString()};
  await fs.writeFile(path.join(root,id+'.json'),JSON.stringify(operation),'utf8');
  const ports={storageRoot:root,sftp:engine.rpc,collect:async()=>{throw err('MUST_NOT_RECOLLECT');},restoreGate:async()=>{},updateIndexes:async()=>{}};
  return {id,root,engine,ports,rows,service:new PlanCleanup(ports),file:()=>fs.readFile(path.join(root,id+'.json'),'utf8')};
}

test('a 1200-row partial deletion recovers with one batched observation and no per-row RPC',async()=>{
  const f=await residueFixture({present:new Set(['worker-6']),residue:new Set(['worker-1000','worker-1001'])});
  const result=await f.service.status(f.id);
  assert.equal(f.engine.observeCount,1);assert.equal(f.engine.calls.length,1);
  assert.equal(f.engine.calls[0].params.readConcurrency,2);assert.equal(f.engine.calls[0].params.targets.length,1200);
  assert.equal(f.engine.of('files.cleanup.inspect').length,0);assert.equal(f.engine.of('files.cleanup.check').length,0);
  assert.equal(result.state,'partial');
  assert.equal(result.targets['worker-0'].state,'completed');
  assert.equal(result.targets['worker-0'].receipt.verifiedBy,'isolation_tree_removed'); // directory row whose isolation tree is gone
  assert.equal(result.targets['worker-5'].receipt.verifiedBy,'path_absence'); // file row
  assert.equal(result.targets['worker-1000'].state,'pending');assert.equal(result.targets['worker-1000'].error,'ISOLATION_RESIDUE_PRESENT'); // residue is counter-evidence, never completed
  assert.equal(result.targets['worker-6'].error,'SOURCE_RECREATED_OR_CHANGED'); // previously confirmed, now present again
  assert.match(String(result.error),/隔离名仍存在/);
  const reports=await f.service.recheckNode('worker');
  assert.equal(reports.length,1);assert.equal(reports[0].state,'blocked');
  assert.ok(reports[0].targets.some(row=>row.state==='absent_unverified'&&row.code==='DELETE_RECEIPT_UNCERTAIN'));
  assert.equal(f.engine.observeCount,2); // the whole recheck round (status, direct probes, fresh status) costs exactly one new batch
  assert.ok(f.engine.calls.every(row=>row.method==='files.cleanup.observeBatch'));
});

test('confirmed completions survive an unknown round; upgrade never falls back per row',async()=>{
  for(const options of [{failNodes:new Set(['worker'])},{mode:'legacy'},{mode:'unknownAction'},{mode:'updateRequired'}]){
    const f=await residueFixture(options);
    const result=await f.service.status(f.id);
    assert.notEqual(result.state,'completed');
    assert.equal(result.targets['worker-0'].state,'completed'); // confirmed fact kept against an unknown round
    assert.equal(result.targets['worker-1002'].state,'pending');
    assert.equal(f.engine.of('files.cleanup.inspect').length+f.engine.of('files.cleanup.check').length,0);
    if(options.mode)assert.equal(result.targets['worker-1002'].error,'SFTP_BATCH_OBSERVATION_UPGRADE_REQUIRED');
    else assert.equal(result.targets['worker-1002'].error,'SSH_QUERY_FAILED');
  }
});

test('oversized rounds split into bounded batches keeping directory isolation pairs together',async()=>{
  const f=await residueFixture({},[{node:node('worker'),total:6200,dirs:0,completed:6000}]);
  await f.service.status(f.id);
  assert.equal(f.engine.observeCount,2);
  assert.deepEqual(f.engine.calls.map(row=>row.params.targets.length),[5000,1200]);
  assert.equal(f.engine.peak,1);
  const g=await residueFixture({},[{node:node('other'),total:5000,dirs:1,completed:4000}]);
  await g.service.status(g.id);
  assert.equal(g.engine.observeCount,2);
  assert.deepEqual(g.engine.calls.map(row=>row.params.targets.length),[4999,1]);
  assert.ok(g.engine.calls[0].params.targets[0].isolationRelativePath); // the directory travels with its isolation entry, never split
});

test('independent nodes each get their own grouped request and the round never exceeds two reads',async()=>{
  const f=await residueFixture({hold:new Promise(resolve=>setTimeout(resolve,10))},
    [{node:node('w1'),total:600,dirs:0,completed:500},{node:node('w2'),total:600,dirs:0,completed:500}]);
  const result=await f.service.status(f.id);
  assert.equal(f.engine.observeCount,2);assert.ok(f.engine.peak<=2);
  assert.deepEqual(f.engine.calls.map(row=>row.params.readConcurrency),[1,1]);
  assert.equal(new Set(f.engine.calls.map(row=>row.params.observationId)).size,1); // one round identity shared across groups
  assert.equal(result.targets['w1-0'].state,'completed');assert.equal(result.targets['w2-0'].state,'completed');
});

test('observations missing, duplicated or foreign keys stay unknown, never fabricated completion',async()=>{
  const missing=await residueFixture({missingRow:new Set(['worker-1005'])});
  const missingResult=await missing.service.status(missing.id);
  assert.equal(missingResult.targets['worker-1005'].state,'pending');
  assert.equal(missingResult.targets['worker-1005'].error,'OBSERVATION_MISSING');
  const dup=await residueFixture({duplicate:true},[{node:node('worker'),total:10,dirs:0,completed:0}]);
  const dupResult=await dup.service.status(dup.id);
  assert.equal(dupResult.targets['worker-0'].state,'pending'); // duplicated key is refused, not trusted twice
  assert.equal(dupResult.targets['worker-1'].state,'completed');
  const extra=await residueFixture({extra:true},[{node:node('worker'),total:10,dirs:0,completed:0}]);
  const extraResult=await extra.service.status(extra.id);
  assert.equal(extraResult.targets['worker-9'].state,'completed'); // foreign keys ignored
  assert.equal(extraResult.state,'completed');
});

test('executors decide honestly: live means executing, unverified is unknown, settled closes',async()=>{
  const live=await residueFixture({executingNodes:new Set(['worker-1002']),present:new Set(['worker-1002'])});
  const liveResult=await live.service.status(live.id);
  assert.equal(liveResult.targets['worker-1002'].state,'executing');assert.equal(liveResult.state,'running');
  const unverified=await residueFixture({unverified:true});
  const unverifiedResult=await unverified.service.status(unverified.id);
  assert.equal(unverifiedResult.targets['worker-0'].state,'completed'); // unknown rounds never revoke confirmations
  assert.equal(unverifiedResult.targets['worker-1002'].error,'CLEANUP_EXECUTOR_QUERY_UNVERIFIED');
});

test('targets without backend tokens observe by exact path in the same batch',async()=>{
  const f=await residueFixture({},[{node:node('worker'),total:10,dirs:0,completed:5}]);
  const stored=JSON.parse(await f.file());
  delete stored.preview.rows[7].backendToken;delete stored.preview.rows[7].backendIndex;
  await fs.writeFile(path.join(f.root,f.id+'.json'),JSON.stringify(stored),'utf8');
  await f.service.status(f.id);
  assert.equal(f.engine.observeCount,1);
  const target=f.engine.calls[0].params.targets.find(row=>row.key==='worker-7');
  assert.equal(target.backendToken,undefined);assert.equal(target.relativePath,'work_dirs/p/f7');
});

test('a changed server identity blocks that group without any batched request and without mutation',async()=>{
  const f=await residueFixture({},[{node:node('w1'),total:20,dirs:0,completed:10},{node:node('w2'),total:20,dirs:0,completed:10}]);
  f.ports.currentNode=async id=>id==='w1'?node('w1',9999):node('w2');
  const result=await f.service.status(f.id);
  assert.equal(result.targets['w1-0'].state,'completed'); // confirmed completion kept
  assert.equal(result.targets['w1-15'].error,'SERVER_IDENTITY_CHANGED');
  assert.equal(f.engine.observeCount,1); // only the unchanged node was observed
  assert.equal(f.engine.calls[0].params.node.id,'w2');
});

test('rounds never cache across calls, concurrent same-operation status shares one request, and a late old round cannot overwrite',async()=>{
  const f=await residueFixture();
  await f.service.status(f.id);await f.service.status(f.id);
  assert.equal(f.engine.observeCount,2); // fresh round re-reads the real filesystem
  assert.notEqual(f.engine.calls[0].params.observationId,f.engine.calls[1].params.observationId);
  let release;const hold=new Promise(resolve=>{release=resolve;});
  const g=await residueFixture({hold});
  const pending=g.service.status(g.id);
  await new Promise(resolve=>setTimeout(resolve,5));
  assert.equal(g.engine.observeCount,1);
  const first=g.service.status(g.id); // concurrent observer shares the in-flight round request
  await new Promise(resolve=>setTimeout(resolve,5));assert.equal(g.engine.observeCount,1);
  const stored=JSON.parse(await g.file());stored.error='newer-round-note';
  await fs.writeFile(path.join(g.root,g.id+'.json'),JSON.stringify(stored),'utf8'); // a newer round persisted meanwhile
  release();
  const settled=await Promise.all([pending,first]);
  assert.equal(settled[0].error,'newer-round-note'); // the late old result returns the newer persisted state and is not written back
  assert.doesNotMatch(await g.file(),/ISOLATION_RESIDUE_PRESENT/);
});

test('continuePreview over a partial round shares one observation and the continuation preview stays batched',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'v110-observe-cont-'));
  const engine=makeEngine({present:new Set(['worker-1','work_dirs/p/f1']),residue:new Set(['worker-2'])});
  const worker=node('worker'),id='c'.repeat(48);
  const rows=[0,1,2].map(index=>({id:'worker-'+index,nodeId:'worker',node:worker,relativePath:'work_dirs/p/f'+index,absolutePath:worker.root+'/work_dirs/p/f'+index,
    type:'file',category:'专用产物',owners:['p'],evidence:['exact registered target'],dependencies:[],disposition:'delete',destination:'',backendToken:'tok-worker',backendIndex:index}));
  const operation={id,state:'partial',executionRequestedAt:new Date().toISOString(),
    preview:{token:id,digest:'frozen',action:'delete',confirmations:2,
      scope:{projectId:'project',planFile:'plans/p.yaml',planKey:'p',planHash:'plan-hash',revision:'revision',nativeDeclarations:[],nodes:[worker],runIds:[],blockers:[],authorizationMode:'confirmed_paths',observationMode:'managed_tmux'},
      rows,blockers:[],expiresAt:Date.now()+60000},
    targets:{'worker-0':{state:'completed',receipt:{source:'active_query',verifiedBy:'path_absence',rootIdentity:{path:worker.root}}},
      'worker-1':{state:'pending'},'worker-2':{state:'pending'}},
    pendingNodes:[],updatedAt:new Date().toISOString()};
  await fs.writeFile(path.join(root,id+'.json'),JSON.stringify(operation),'utf8');
  const scope={projectId:'project',planKey:'p',planFile:'plans/p.yaml',planHash:'plan-hash',runIds:[],revision:'revision',nodes:[worker],
    candidates:[{nodeId:'worker',relativePath:'work_dirs/p/f1',type:'file',category:'专用产物',owners:['p'],evidence:['exact registered target'],dependencies:[]}],blockers:[]};
  const service=new PlanCleanup({storageRoot:root,sftp:engine.rpc,collect:async()=>JSON.parse(JSON.stringify(scope)),restoreGate:async()=>{},updateIndexes:async()=>{}});
  const next=await service.continuePreview(id);
  assert.equal(next.continuationOf,id);
  assert.equal(engine.observeCount,1); // one shared round covers status, the history status and the continuation
  assert.ok(engine.calls.every(row=>['files.cleanup.observeBatch','files.cleanup.preview'].includes(row.method)));
  assert.equal(next.rows.filter(row=>row.disposition==='delete').length,1); // only the still-present candidate continues
});
