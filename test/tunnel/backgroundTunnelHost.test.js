const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const ts = require('typescript');
const { readSource } = require('../_helpers/sourceReader');
const legacyMethod = require('../_helpers/legacyMethod');
const source = readSource('src/extension.ts');
const transport = require('../../dist/tunnel/BackgroundSshTunnels');

function methods(names, globals = {}) {
  const code = ts.transpileModule('class Host {' + names.map(name => legacyMethod(source, name+'(')).join('\n') + '} this.Host = Host;',
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const context = { mcpInvocation: { getStore: () => undefined }, ...globals }; vm.createContext(context); vm.runInContext(code, context); return context.Host.prototype;
}
const item = (id = 'w1') => ({ id, role: 'worker', config: { hubHost: id+'.example.org', hubUser:'science',hubSshPort:2222,
  localForwardHost:'localhost',localForwardPort:29001,remoteAgentHost:'worker.internal',remoteAgentPort:29201 } });

test('Agent login command honors selected Workers, confirmation and target changes', async () => {
  for (const mode of ['empty', 'path-cancel', 'modal-cancel', 'changed', 'project-change', 'runtime-change', 'success', 'selected', 'skip', 'failure', 'unmanaged']) {
    const calls = [], notices = [], configured = [{ id: 'w1', filePath: 'C:/fixture/w1.xsh', command: 'start-w1' },
      { id: 'w2', filePath: 'C:/fixture/w2.xsh', command: 'start-w2' }];
    let targets = mode === 'empty' ? [] : configured, currentRoot = 'C:/fixture', remotePath = '/one';
    class Cancelled extends Error {}
    const proto = methods(['writeXshellAgentStartupCommands'], {
      assertSingleProjectWorkspace: () => currentRoot, workspaceRoot: () => currentRoot, UiCommandCancelled: Cancelled, isUiCommandCancelled: error => error instanceof Cancelled,
      AgentRuntimeScope_1: { selectAgentRuntimeTargets: (rows, ids) => ids.length ? rows.filter(row => ids.includes(row.id)) : rows },
      agentStartupWriteConfirmationDetail: () => 'confirm paths', path: require('node:path'), errorMessage: error => error.message,
      xshellLoginCommandUpdateLabel: (reason, changed) => reason || (changed ? 'changed' : 'unchanged'),
      XshellSessionPatcher_1: { updateXshellSessionLoginCommand: async (file, command, options) => {
        calls.push(['patch', file, command, options]);
        if (mode === 'failure' && file.endsWith('w1.xsh')) throw Error('patch failed');
        return mode === 'skip' ? { changed: false, skippedReason: 'preserved' } : { changed: true, backupPath: file + '.bak' };
      } },
      vscode: { window: { showWarningMessage: async () => { if (mode === 'changed') targets = [{ ...configured[0], filePath: 'C:/fixture/replaced.xsh' }, configured[1]];
        if (mode === 'project-change') currentRoot = 'C:/other'; if (mode === 'runtime-change') remotePath = '/changed';
        return mode === 'modal-cancel' ? undefined : '确认写入'; }, showInformationMessage: message => notices.push(message) } },
    });
    const host = { setupConfig: { workerTunnels: [{ id: 'w1' }, { id: 'w2' }] },
      assertTopologyActualWorkRoots() {}, agentStartupTargets: () => targets, agentRuntimeUploadTargets: () => [{ id: 'w1', remotePath }, { id: 'w2', remotePath: '/two' }],
      confirmRemoteWriteTargets: async () => { calls.push(['confirm']); if (mode === 'path-cancel') throw new Cancelled('cancelled'); },
      applySetupDraft: async value => { calls.push(['save', value]); host.setupConfig.workerTunnels = value.workerTunnels; }, postState: () => calls.push(['state']) };
    Object.setPrototypeOf(host, proto);
    if (['path-cancel', 'changed', 'project-change', 'runtime-change'].includes(mode)) await assert.rejects(host.writeXshellAgentStartupCommands(true, true), Cancelled);
    else await host.writeXshellAgentStartupCommands(true, mode !== 'unmanaged', mode === 'selected' ? ['w2'] : []);
    const patched = calls.filter(row => row[0] === 'patch'), saved = calls.filter(row => row[0] === 'save');
    if (['empty', 'path-cancel', 'modal-cancel', 'changed', 'project-change', 'runtime-change'].includes(mode)) { assert.equal(patched.length, 0, mode); assert.equal(saved.length, 0, mode); continue; }
    assert.equal(patched.length, mode === 'selected' ? 1 : 2, mode);
    if (mode === 'selected') assert.equal(patched[0][1], 'C:/fixture/w2.xsh');
    for (const patch of patched) assert.deepEqual(JSON.parse(JSON.stringify(patch[3])), { backup: true, managedAgentLogin: mode !== 'unmanaged', preserveUnmanaged: mode === 'unmanaged' });
    assert.equal(saved.length, ['skip', 'unmanaged'].includes(mode) ? 0 : mode === 'success' ? 2 : 1, mode);
    if (mode === 'failure') assert.ok(notices.some(text => text.includes('处理完成') && text.includes('patch failed')));
    assert.ok(calls.some(row => row[0] === 'state'));
  }
});

test('production manager uses TCP listening evidence and the current business gate', () => {
  let options, gates=0;
  const proto=methods(['backgroundTunnels'],{BackgroundSshTunnels_1:{...transport,BackgroundSshTunnelManager:class{constructor(value){options=value;}}},
    XshellTunnelLauncher_1:{isLocalPortAvailable:()=>{}},require:()=>({assertBusinessAllowed:()=>gates++})});
  proto.backgroundTunnels.call({});assert.equal(options.portListening,transport.backgroundPortListening);
  options.assertBusinessAllowed();assert.equal(gates,1);
});

test('per-Worker launch uses the same current-configuration confirmation as batch launch', async () => {
  const calls=[],proto=methods(['startTunnelEndpointFromUi'],{stringField:(row,key)=>row[key]});
  const host={startBackgroundTunnels:async(...args)=>calls.push(args)};
  await proto.startTunnelEndpointFromUi.call(host,{endpointId:'w1'});
  assert.deepEqual(JSON.parse(JSON.stringify(calls)),[[true,true,['w1']]]);
  await assert.rejects(proto.startTunnelEndpointFromUi.call(host,{}),/明确的 Worker/);
});

test('cancelling tunnel confirmation does not start a selected Worker', async () => {
  class Cancelled extends Error {}
  const entries = [item('w1'), item('w2')], calls = [];
  const proto = methods(['startBackgroundTunnels'], {
    BackgroundSshTunnels_1: transport, UiCommandCancelled: Cancelled,
    AgentRuntimeScope_1: { selectAgentRuntimeTargets: (rows, selected) => rows.filter(row => selected.includes(row.id)) },
    tunnelHttpEndpoint: (host, port) => `${host}:${port}`,
    vscode: { window: { showWarningMessage: async message => { calls.push(message); return undefined; } } },
  });
  const host = { captureProjectContext: () => ({ signal: new AbortController().signal }), projectContextIsCurrent: () => true,
    syncXshellConfigBeforeNetwork: async () => {}, currentTunnelLaunchBlockers: () => [], tunnelLaunchItems: () => entries,
    tunnelConfig: {}, backgroundTunnels: () => assert.fail('cancelled request must not start a tunnel') };
  await assert.rejects(proto.startBackgroundTunnels.call(host, true, true, ['w2']), Cancelled);
  assert.equal(calls.length, 1);
  assert.match(calls[0], /w2:/);
  assert.doesNotMatch(calls[0], /w1:/);
});

test('confirmed Worker launch preserves verified, failed, cancelled and pending outcomes', async () => {
  class Cancelled extends Error {}
  class Pending extends Error {}
  for (const state of ['verified', 'existing_tunnel', 'failed', 'cancelled', 'requested']) {
    const entries = [item('w1'), item('w2')], launches = [], notices = [];
    const proto = methods(['startBackgroundTunnels', 'startTunnelEndpointFromUi'], {
      BackgroundSshTunnels_1: transport, UiCommandCancelled: Cancelled, UiCommandRemotePending: Pending,
      AgentRuntimeScope_1: { selectAgentRuntimeTargets: (rows, selected) => rows.filter(row => selected.includes(row.id)) },
      stringField: (row, key) => row[key], tunnelHttpEndpoint: (host, port) => `${host}:${port}`,
      vscode: { ProgressLocation: { Notification: 1 }, window: {
        showWarningMessage: async message => { notices.push(message); return '启动后台隧道'; },
        showInformationMessage: message => notices.push(message),
        withProgress: async (_options, work) => work({ report() {} }),
      } },
    });
    const host = { ...proto, captureProjectContext: () => ({ signal: new AbortController().signal }), projectContextIsCurrent: () => true,
      syncXshellConfigBeforeNetwork: async () => {}, currentTunnelLaunchBlockers: () => [], tunnelLaunchItems: () => entries,
      tunnelConfig: {}, setupConfig: { autoTestTunnelAfterStart: false }, enabledWorkerConfigs: () => entries,
      backgroundTunnels: () => ({ running: () => [], launchAll: async targets => {
        launches.push(...targets.map(target => target.id)); return [{ id: 'w2', state, message: `w2 ${state}` }];
      } }), ensureRealtimeConnected: async () => {} };
    Object.setPrototypeOf(host, proto);
    const launch = () => proto.startTunnelEndpointFromUi.call(host, { endpointId: 'w2' });
    if (state === 'failed') await assert.rejects(launch(), /w2 failed/);
    else if (state === 'cancelled') await assert.rejects(launch(), Cancelled);
    else if (state === 'requested') await assert.rejects(launch(), Pending);
    else await launch();
    assert.deepEqual(launches, ['w2']);
    assert.ok(notices.some(message => message.includes(`w2 ${state}`)));
    if (state === 'failed' || state === 'requested') {
      assert.equal(await proto.startBackgroundTunnels.call(host, false, true, ['w2']), false,
        'automatic callers keep the existing boolean contract');
    }
  }
});

test('confirmation cannot start an endpoint changed or disabled while the modal was open', async () => {
  for(const change of ['endpoint','disabled','project']) {
    let entries=[item()],current=true,spawns=0;
    const context={signal:new AbortController().signal};
    const proto=methods(['startBackgroundTunnels'],{BackgroundSshTunnels_1:transport,UiCommandCancelled:class extends Error{},
      AgentRuntimeScope_1:{selectAgentRuntimeTargets:rows=>rows},tunnelHttpEndpoint:()=>'',
      vscode:{window:{showWarningMessage:async()=>{if(change==='endpoint')entries[0].config.hubHost='changed.example';if(change==='disabled')entries=[];if(change==='project')current=false;return '启动后台隧道';}}}});
    const host={captureProjectContext:()=>context,projectContextIsCurrent:()=>current,syncXshellConfigBeforeNetwork:async()=>{},
      currentTunnelLaunchBlockers:()=>[],tunnelLaunchItems:()=>entries,tunnelConfig:{},backgroundTunnels:()=>{spawns++;assert.fail('stale request reached manager');}};
    await assert.rejects(proto.startBackgroundTunnels.call(host),/已变化/);assert.equal(spawns,0);
  }
});

test('MCP tunnel start rechecks authorization after async preparation', async () => {
  let granted=true,managerCalls=0;
  const proto=methods(['startBackgroundTunnels'],{BackgroundSshTunnels_1:transport,UiCommandCancelled:class extends Error{},
    AgentRuntimeScope_1:{selectAgentRuntimeTargets:rows=>rows},mcpInvocation:{getStore:()=>({permission:scope=>{assert.equal(scope,'agents');if(!granted)throw Error('AUTHORIZATION_REVOKED');}})}});
  const host={captureProjectContext:()=>({signal:new AbortController().signal}),projectContextIsCurrent:()=>true,
    syncXshellConfigBeforeNetwork:async()=>{granted=false;},currentTunnelLaunchBlockers:()=>[],tunnelLaunchItems:()=>[item()],tunnelConfig:{},
    backgroundTunnels:()=>{managerCalls++;assert.fail('revoked request must not start or stop tunnels');}};
  await assert.rejects(proto.startBackgroundTunnels.call(host,false,false),/AUTHORIZATION_REVOKED/);
  assert.equal(managerCalls,0);
});

test('MCP tunnel launch callback stops later endpoints after authorization changes', async () => {
  let granted=true,launched=0;
  const proto=methods(['startBackgroundTunnels'],{BackgroundSshTunnels_1:transport,UiCommandCancelled:class extends Error{},
    AgentRuntimeScope_1:{selectAgentRuntimeTargets:rows=>rows},mcpInvocation:{getStore:()=>({permission:()=>{if(!granted)throw Error('AUTHORIZATION_REVOKED');}})},
    vscode:{ProgressLocation:{Notification:1},window:{withProgress:async(_opts,work)=>work({report(){}})}}});
  const host={captureProjectContext:()=>({signal:new AbortController().signal}),projectContextIsCurrent:()=>true,
    syncXshellConfigBeforeNetwork:async()=>{},currentTunnelLaunchBlockers:()=>[],tunnelLaunchItems:()=>[item()],tunnelConfig:{},enabledWorkerConfigs:()=>[{id:'w1'}],
    backgroundTunnels:()=>({running:()=>[],launchAll:async(_endpoints,options)=>{options.assertCurrent();launched++;granted=false;options.assertCurrent();}})};
  await assert.rejects(proto.startBackgroundTunnels.call(host,false,false),/AUTHORIZATION_REVOKED/);
  assert.equal(launched,1);
});

test('background start and old command aliases use the background manager without Xshell', async () => {
  const calls = [], ui = [], entries = [item()], ids = [];
  const proto = methods(['startAllXshellRealtimeTunnels','startAllXshellConnections','launchTunnelItem','startBackgroundTunnels'], {
    BackgroundSshTunnels_1: transport,
    AgentRuntimeScope_1: { selectAgentRuntimeTargets: (rows, selected) => selected.length ? rows.filter(row => selected.includes(row.id)) : rows },
    vscode: { ProgressLocation:{Notification:1}, window:{ withProgress:async(_config,work)=>work({report(){}}),showInformationMessage:message=>ui.push(message),showWarningMessage:message=>ui.push(message) } },
    tunnelHttpEndpoint:(host,port)=>host+':'+port,
  });
  const host = { ...proto, setupConfig:{autoTestTunnelAfterStart:false},tunnelConfig:{},captureProjectContext:()=>({signal:new AbortController().signal}),projectContextIsCurrent:()=>true,
    syncXshellConfigBeforeNetwork:async()=>calls.push('configured'),currentTunnelLaunchBlockers:()=>[],
    tunnelLaunchItems:()=>entries,enabledWorkerConfigs:()=>[{id:'w1'}],
    backgroundTunnels:()=>({ running:()=>[],launchAll:async endpoints=>{ ids.push(...endpoints.map(row=>row.id));return endpoints.map(row=>({id:row.id,state:'verified',message:'listening'})); } }),
    ensureRealtimeConnected:async()=>calls.push('observe'),launchUniqueXshellSessions:()=>assert.fail('background must never open Xshell') };
  Object.setPrototypeOf(host,proto);
  await proto.startAllXshellRealtimeTunnels.call(host,false);
  await proto.startAllXshellConnections.call(host,false,false);
  await proto.launchTunnelItem.call(host,entries[0]);
  assert.deepEqual(ids,['w1','w1','w1']);assert.equal(ui.length,3);assert.ok(ui.every(message=>message.includes('Agent 就绪状态以检测结果为准')));
});

test('runtime preflight uses saved SSH identities without scanning or rewriting Xshell files', async () => {
  const proto=methods(['syncXshellConfigBeforeNetwork']);const calls=[];
  const host={ refreshLocalSshConfig:async()=>calls.push('ssh'),assertSshTransportIdentities:async targets=>calls.push(targets[0].id),sftpSharedTargets:()=>[{id:'w1'}],
    refreshXshellSessionLibrary:()=>assert.fail('no automatic session read'),syncConfiguredXshellSessions:()=>assert.fail('no automatic import') };
  await proto.syncXshellConfigBeforeNetwork.call(host,'start');assert.deepEqual(calls,['ssh','w1']);
});

test('explicit Xshell opening keeps enabled session deduplication and never starts background work', async () => {
  const entries=[item('w1'),item('w2')], launched=[];entries.forEach(row=>row.config.savedSessionPath='C:/sessions/shared.xsh');
  const proto=methods(['openAllXshellSessions','launchUniqueXshellSessions'],{AgentRuntimeScope_1:{selectAgentRuntimeTargets:rows=>rows},localPathKey:value=>value.toLowerCase(),tunnelHttpEndpoint:()=>'',vscode:{window:{showInformationMessage(){}}},
    XshellTunnelSetup_1:{xshellExecutablePath:()=> 'C:/Xshell.exe'},XshellSessionLauncher_1:{launchXshellSavedSession:async request=>{launched.push(request);return{launched:true};}},waitForXshellBatchLaunchSlot:async()=>{},errorMessage:String});
  const host={setupConfig:{},refreshXshellSessionLibrary:async()=>{},tunnelLaunchItems:()=>entries,
    startBackgroundTunnels:()=>assert.fail('manual must not start background tunnels'),deployLatestAgentRuntime:()=>assert.fail('manual must not deploy')};
  Object.setPrototypeOf(host,proto);
  const results=await proto.openAllXshellSessions.call(host,false);assert.equal(results.length,2);assert.match(results[1],/跳过重复打开/);assert.equal(launched.length,1);assert.equal(launched[0].sessionPath,'C:/sessions/shared.xsh');
});

test('Agent preparation routes runtime deploy and background start without session writes', async () => {
  const calls=[];
  const proto=methods(['prepareAgentsForFirstRun'],{workspaceRoot:()=>'/project',assertSingleProjectWorkspace:()=>{},UiCommandCancelled:class extends Error{},
    agentStartupWriteConfirmationDetail:()=>'',tunnelTestCompletion:()=>({ready:true,issues:[]}),sleep:async()=>{},vscode:{ProgressLocation:{Notification:1},window:{showWarningMessage:async()=> '确认准备并启动',withProgress:async(_options,work)=>work({report(){}})}}});
  const host={ensureSimpleSftpReadyForSetup:async()=>true,syncXshellConfigBeforeNetwork:async()=>{},assertTopologyReady:()=>({}),assertTopologyActualWorkRoots(){},
    currentAgentPreparationBlockers:()=>[],agentStartupTargets:()=>[{id:'w1',filePath:''}],enabledWorkerConfigs:()=>[{id:'w1'}],assertExecutionCondaEnvReady(){},workerActionTargets:()=>[],
    sftpSharedTargets:()=>[{id:'w1'}],agentRuntimeUploadTargets:()=>[{id:'w1'}],confirmRemoteWriteTargets:async()=>calls.push('confirm'),
    writeSftpManagerServerProfiles:async()=>{calls.push('profiles');return{targetCount:1};},writeXshellAgentStartupCommands:()=>assert.fail('no session patch'),
    deployLatestAgentRuntime:async()=>{calls.push('deploy');return{targets:[],manifest:{}};},startAllXshellConnections:async()=>calls.push('background'),
    testTunnel:async()=>calls.push('detect'),verifyDeployedAgentRuntime:async()=>({fatal:[],warnings:[]}),setupConfig:{}};
  assert.equal(await proto.prepareAgentsForFirstRun.call(host,false),true);assert.deepEqual(calls,['confirm','profiles','deploy','background','detect']);
});
