const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeXshellSetupConfig } = require("../../dist/tunnel/XshellTunnelSetup.js");
const { buildTunnelEndpointRegistry } = require("../../dist/tunnel/TunnelEndpointRegistry.js");
const { buildMultiEndpointXshellTunnelCommands, generateXshellStartAllBatScript } = require("../../dist/tunnel/XshellTunnelCommandBuilder.js");

test('script entry handles empty, invalid, cancelled and configured Worker choices', async () => {
  const vm = require('node:vm'), ts = require('typescript'), path = require('node:path');
  const { readSource } = require('../_helpers/sourceReader');
  const method = require('../_helpers/legacyMethod')(readSource('src/extension.ts'), 'generateTunnelScript(');
  for (const mode of ['empty', 'invalid', 'cancel', 'single-bat', 'single-ps1', 'multi-bat', 'multi-ps1', 'changed-project', 'changed-worker']) {
    const writes = [], notices = [], calls = [];
    let current = true;
    const workers = mode === 'empty' ? [] : [{ id: 'w1', config: { host: 'first.example', port: 24567 } },
      ...(mode.startsWith('multi') ? [{ id: 'w2', config: { host: 'second.example', port: 24568 } }] : [])];
    const ext = mode.endsWith('ps1') ? 'ps1' : 'bat';
    const vscode = { Uri: { file: fsPath => ({ fsPath }) }, window: {
      showErrorMessage: message => notices.push(message),
      showSaveDialog: async () => {
        if (mode === 'changed-project') current = false;
        if (mode === 'changed-worker') workers[0].config.host = 'changed.example';
        return mode === 'cancel' ? undefined : { fsPath: `C:/fixture/output.${ext}` };
      },
    } };
    const builder = {};
    for (const name of ['generateXshellStartAllPs1Script', 'generateXshellPs1Script', 'generateXshellStartAllBatScript', 'generateXshellBatScript'])
      builder[name] = (...args) => { calls.push([name, ...args]); return 'script:' + name; };
    const code = ts.transpileModule('class Host {' + method + '}; Host', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
    const Host = vm.runInNewContext(code, { vscode, path, process, workspaceRoot: () => 'C:/fixture',
      fs: { writeFile: async (...args) => writes.push(args) },
      XshellTunnelSetup_1: { validateXshellSetupConfig: config => mode === 'invalid' ? ['invalid setup'] : [] },
      TunnelEndpointRegistry_1: { buildTunnelEndpointRegistry: () => ({ endpoints: workers.map(item => ({ ...item, enabled: true })) }) },
      XshellTunnelCommandBuilder_1: builder });
    const host = new Host(); host.tunnelLaunchItems = () => workers; host.setupConfig = {}; host.lastWorkerProbes = {};
    host.captureProjectContext = () => 'project'; host.projectContextIsCurrent = () => current;
    if (mode.startsWith('changed')) {
      await assert.rejects(host.generateTunnelScript(), /项目或 Worker 隧道配置已变化/);
      assert.equal(writes.length, 0); assert.equal(calls.length, 0); continue;
    }
    await host.generateTunnelScript();
    if (['empty', 'invalid', 'cancel'].includes(mode)) {
      assert.equal(writes.length, 0, mode); assert.equal(calls.length, 0, mode);
      if (mode !== 'cancel') assert.equal(notices.length, 1, mode);
      continue;
    }
    const expected = mode.startsWith('multi') ? `generateXshellStartAll${ext === 'ps1' ? 'Ps1' : 'Bat'}Script` : `generateXshell${ext === 'ps1' ? 'Ps1' : 'Bat'}Script`;
    assert.equal(calls[0][0], expected); assert.equal(writes[0][0], `C:/fixture/output.${ext}`);
    assert.equal(writes[0][1], 'script:' + expected); assert.equal(writes[0][2], 'utf8');
    if (mode.startsWith('single')) assert.deepEqual(calls[0][1], { host: 'first.example', port: 24567 });
    else assert.deepEqual(Array.from(calls[0][2], row => [row.config.host, row.config.port]), [['first.example', 24567], ['second.example', 24568]]);
  }
});

test("multi endpoint command builder emits only configured Worker tunnel commands", () => {
  const setup = normalizeXshellSetupConfig({
    xshellExePath: "C:\\Program Files\\NetSarang\\Xshell 8\\Xshell.exe",
    hubHost: "hub.local",
    hubUser: "simple",
    workerRealtimeMode: "hub_plus_workers",
    workerTunnels: [{ id: "w1", workerHost: "w1.local", workerUser: "simple", localForwardPort: 18766, enabled: true }],
  });
  const endpoints = buildTunnelEndpointRegistry(setup).endpoints;
  const commands = buildMultiEndpointXshellTunnelCommands(setup, endpoints);
  assert.equal(commands.length, 1);
  assert.match(commands[0].preview.sshCommand, /127\.0\.0\.1:18766:127\.0\.0\.1:18765/);
  const script = generateXshellStartAllBatScript(setup, endpoints);
  assert.doesNotMatch(script,/Hub control tunnel/);
  assert.match(script, /Worker telemetry tunnel/);
});
