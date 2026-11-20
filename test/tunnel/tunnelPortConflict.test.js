const test = require("node:test");
const assert = require("node:assert/strict");

const { detectStaticTunnelPortConflicts } = require("../../dist/tunnel/TunnelPortAllocator.js");

test('repair port conflicts shows each Worker endpoint and configures only on explicit choice', async () => {
  const fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),vm=require('node:vm');
  const source=fs.readFileSync(path.join(__dirname,'../../src/extension/legacy.ts'),'utf8');
  const ast=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true);
  const cls=ast.statements.find(node=>ts.isClassDeclaration(node)&&node.name?.text==='RealtimeTunnelPanelProvider');
  const method=cls.members.find(node=>node.name?.getText(ast)==='repairTunnelPorts').getText(ast);
  let answer;const events=[];
  const vscode={window:{showInformationMessage:async text=>events.push(['info',text]),showWarningMessage:async text=>{events.push(['warning',text]);return answer;}}};
  const Host=vm.runInNewContext(ts.transpileModule(`class Host {${method}}; Host`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,
    {vscode,tunnelHttpEndpoint:(host,port)=>`http://${host}:${port}`});
  const h=new Host();let conflicts=[];Object.assign(h,{setupConfig:{workerTunnels:[{id:'w1',localForwardHost:'localhost'},{id:'w2',localForwardHost:'192.0.2.2'}],ports:{assignments:[]}},
    syncXshellConfigBeforeNetwork:async()=>events.push(['sync']),currentPortConflicts:()=>conflicts,configureTunnelPorts:async()=>events.push(['configure'])});
  await h.repairTunnelPorts();assert.ok(events.some(row=>row[0]==='info'));assert.ok(!events.some(row=>row[0]==='configure'));
  conflicts=[{endpointId:'w1',requestedPort:23001,message:'occupied'},{endpointId:'w2',requestedPort:23002,message:'duplicate'}];
  events.length=0;answer=undefined;await h.repairTunnelPorts();
  const warning=events.find(row=>row[0]==='warning')[1];assert.match(warning,/w1: http:\/\/localhost:23001 - occupied/);assert.match(warning,/w2: http:\/\/192\.0\.2\.2:23002 - duplicate/);
  assert.ok(!events.some(row=>row[0]==='configure'));
  events.length=0;answer='配置端口范围';await h.repairTunnelPorts();assert.equal(events.filter(row=>row[0]==='configure').length,1);
  events.length=0;h.syncXshellConfigBeforeNetwork=async()=>{throw Error('configuration unavailable');};
  await assert.rejects(h.repairTunnelPorts(),/configuration unavailable/);assert.equal(events.length,0);
});

test("static detector rejects invalid/duplicate Worker ports without reserving old Hub ports", () => {
  const conflicts = detectStaticTunnelPortConflicts([
    { endpointId: "hub", role: "hub_control", localForwardHost: "127.0.0.1", localForwardPort: 18765, remoteBindHost: "127.0.0.1", remoteServicePort: 18765, remoteHostLabel: "hub", assignedAt: "t", source: "manual" },
    { endpointId: "w1", role: "worker_telemetry", localForwardHost: "127.0.0.1", localForwardPort: 18765, remoteBindHost: "127.0.0.1", remoteServicePort: 18765, remoteHostLabel: "w1", assignedAt: "t", source: "manual" },
    { endpointId: "w2", role: "worker_telemetry", localForwardHost: "127.0.0.1", localForwardPort: 19000, remoteBindHost: "127.0.0.1", remoteServicePort: 18765, remoteHostLabel: "w2", assignedAt: "t", source: "manual" },
    { endpointId:"w3",role:"worker_telemetry",localForwardPort:18765 },
    { endpointId:"invalid",role:"worker_telemetry",localForwardPort:22 },
  ], { start: 18766, end: 18999 });
  assert.ok(conflicts.some((item) => item.conflictType === "duplicate_in_config"));
  assert.equal(conflicts.some(item=>item.conflictType==="reserved_for_hub"),false);
  assert.ok(conflicts.some(item=>item.conflictType==="invalid_port"));
  assert.ok(conflicts.every(item=>item.endpointId!=="hub"));
  assert.equal(conflicts.some(item=>item.conflictType==="outside_allowed_range"),false,"configured valid ports are not restricted to an allocation hint");
});

test("worker-only topology allows one local 18765 while remote service ports match", () => {
  const conflicts = detectStaticTunnelPortConflicts([
    { endpointId: "w1", role: "worker_telemetry", localForwardHost: "127.0.0.1", localForwardPort: 18765, remoteBindHost: "127.0.0.1", remoteServicePort: 18765, remoteHostLabel: "w1", assignedAt: "t", source: "manual" },
    { endpointId: "w2", role: "worker_telemetry", localForwardHost: "127.0.0.1", localForwardPort: 18766, remoteBindHost: "127.0.0.1", remoteServicePort: 18765, remoteHostLabel: "w2", assignedAt: "t", source: "manual" },
  ], { start: 18766, end: 18999 });
  assert.deepEqual(conflicts, []);
});
