const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
require('../_helpers/registerTsRequire');
const {ResourceOperationLeaseManager}=require('../../src/core/ResourceOperationLease.ts');
test('actual async lease ancestry excludes only this call; live sibling leases remain, released leases vanish',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'cleanup-live-lease-'));
  const manager=new ResourceOperationLeaseManager({leasePath:path.join(root,'lease.json'),windowId:'fixture',heartbeatMs:0,ownerAlive:()=>true});
  const request=target=>({pluginId:'fixture',workspaceUri:root,hostProjectPath:root,actionType:'runPlan',resources:[{server:'worker:22',project:'/project',target:'/project/'+target}]});
  const sibling=await manager.acquire(request('other'));
  try {
    await manager.run(request('job'),async()=>{
      assert.equal((await manager.inspect()).records.length,2);
      const live=(await manager.inspect({excludeCurrent:true})).records;
      assert.deepEqual(live.map(row=>row.leaseId),[sibling.record.leaseId]);
    });
    assert.equal((await manager.inspect()).records.length,1);
  } finally {await sibling.release();}
  assert.deepEqual((await manager.inspect()).records,[]);
});
test('Agent live execution boundaries ignore retained history, preserve scope and retire success/failure without disk writes',()=>{
  const proc=spawnSync('python',['-B','-X','utf8',path.join(__dirname,'cleanupActivity.fixture.py'),path.join(__dirname,'../../dist/runtime/cluster_agent.py')],
    {encoding:'utf8',windowsHide:true,timeout:10000});
  assert.equal(proc.status,0,proc.stderr||proc.stdout||proc.error?.message);
  assert.deepEqual(JSON.parse(proc.stdout),{ok:true,liveRegistry:true,historyWrites:0});
});
