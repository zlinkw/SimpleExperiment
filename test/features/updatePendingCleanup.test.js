const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
require('../_helpers/registerTsRequire');
const {UpdateGate}=require('../../src/updates/UpdateGate.ts');
const {ResourceOperationLeaseManager}=require('../../src/core/ResourceOperationLease.ts');

test('a durable cleanup range does not make the update wait for a transfer',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'update-cleanup-range-'));
  const leasePath=path.join(root,'lease.json'),directory=leasePath+'.resources-v2';fs.mkdirSync(directory);
  const windowId=os.hostname()+':'+process.pid+':cleanup';
  fs.writeFileSync(path.join(directory,'a'.repeat(64)+'.json'),JSON.stringify({schemaVersion:2,windowId,processId:process.pid,
    pendingCleanupKey:'request:0',ticket:0,choosing:false,admissionExpiresAt:0,
    leases:[{pendingCleanup:true,windowId,processId:process.pid,resources:[{server:'local',project:root,target:root}]}]}),'utf8');
  await new UpdateGate(leasePath,()=>true).wait();
  assert.ok(fs.existsSync(path.join(directory,'a'.repeat(64)+'.json')));
});

test('Experiment respects the durable remote range after its original owner exits',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'experiment-cleanup-range-'));
  const leasePath=path.join(root,'lease.json'),directory=leasePath+'.resources-v2';fs.mkdirSync(directory);
  const windowId='old', resources=[{server:'host:22',project:'/project',target:'/project/out'}];
  fs.writeFileSync(path.join(directory,'b'.repeat(64)+'.json'),JSON.stringify({schemaVersion:2,windowId,processId:1234,
    pendingCleanupKey:'request:0',ticket:0,choosing:false,admissionExpiresAt:0,
    leases:[{pendingCleanup:true,leaseId:'request:0',windowId,processId:1234,resources,expiresAt:'2000-01-01T00:00:00.000Z'}]}),'utf8');
  const manager=new ResourceOperationLeaseManager({leasePath,windowId:'new',heartbeatMs:0,ownerAlive:()=>false});
  const input=target=>({pluginId:'test',workspaceUri:'file:///project',hostProjectPath:'/project',actionType:'write',
    resources:[{server:'host:22',project:'/project',target}]});
  await assert.rejects(manager.acquire(input('/project/out/child')),/未结算操作/);
  const independent=await manager.acquire(input('/project/other'));await independent.release();
  const slot=path.join(directory,'b'.repeat(64)+'.json'),record=JSON.parse(fs.readFileSync(slot,'utf8'));
  delete record.leases[0].pendingCleanup;record.leases[0].pendingTransfer=true;
  fs.writeFileSync(slot,JSON.stringify(record),'utf8');
  await assert.rejects(manager.acquire(input('/project/out/child')),/未结算操作/);
});
