const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {assessProjectTopology,normalizeTopologyMode}=require('../../dist/features/TopologyMode');
test('one Worker and many Workers share one topology despite any old Hub fields',()=>{
  for(const mode of ['', 'single_worker','worker_pool','hub_worker']) for(const count of [1,2,4]){
    const value=assessProjectTopology(mode,{hubConfigured:true,enabledWorkerCount:count});
    assert.equal(value.mode,'worker_pool');assert.equal(value.valid,true);assert.equal(value.hubAllowed,false);
  }
  const empty=assessProjectTopology('',{hubConfigured:true,enabledWorkerCount:0});
  assert.equal(empty.mode,'worker_pool');assert.equal(empty.valid,false);assert.match(empty.issues.join(' '),/Worker/);
  assert.equal(normalizeTopologyMode('single_worker'),'worker_pool');
});
test('published settings expose only the unified Worker mode and no Hub commands',()=>{
  const p=JSON.parse(fs.readFileSync('package.json','utf8'));
  assert.deepEqual(p.contributes.configuration.properties['simpleExperiment.topologyMode'].enum,['worker_pool']);
  assert.ok(!p.contributes.commands.some(row=>/Hub/.test(row.title)&&!/GitHub/.test(row.title)));
});
test('legacy saved Hub fields never enter the runtime registry or port targets and remain unmodified',()=>{
  const {normalizeXshellSetupConfig}=require('../../dist/tunnel/XshellTunnelSetup');
  const {buildTunnelEndpointRegistry,endpointAssignmentsFromConfig}=require('../../dist/tunnel/TunnelEndpointRegistry');
  for(const count of [0,1,3,1]){
    const raw={hubHost:'old-hub',savedSessionPath:'old-hub.xsh',agentProjectDir:'/old/hub',workerTunnels:Array.from({length:count},(_,i)=>({id:'w'+i,workerHost:'h'+i,agentProjectDir:'/data/w'+i,localForwardPort:20000+i,remoteAgentPort:21000+i,enabled:true}))};
    const before=JSON.stringify(raw),config=normalizeXshellSetupConfig(raw),r=buildTunnelEndpointRegistry(config);
    assert.equal(r.endpoints.length,count);assert.ok(r.endpoints.every(e=>e.role==='worker_telemetry'));assert.equal(r.hub,undefined);
    assert.ok(endpointAssignmentsFromConfig(config).every(e=>e.role==='worker_telemetry'));assert.equal(JSON.stringify(raw),before);
  }
});
test('port allocation never probes or reserves a Hub and preserves the explicit Worker endpoint',async()=>{
 const {allocateTunnelPorts}=require('../../dist/tunnel/TunnelPortAllocator');const seen=[];
 const r=await allocateTunnelPorts({hub:{id:'hub',host:'retired',requestedLocalPort:19999,remoteAgentPort:22000},workers:[{id:'w',host:'worker',requestedLocalPort:18765,remoteTelemetryPort:31001,enabled:true}],portRange:{start:18765,end:18999},preserveExistingAssignments:true},(port,id)=>{seen.push(id);return 'available'});
 assert.ok(!seen.includes('hub'));assert.equal(r.assignments.length,1);assert.equal(r.assignments[0].localForwardPort,18765);assert.equal(r.assignments[0].remoteServicePort,31001);
});
