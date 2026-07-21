const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeMobaXtermSetupConfig } = require("../../dist/tunnel/MobaXtermSetup.js");
const { buildTunnelEndpointRegistry } = require("../../dist/tunnel/TunnelEndpointRegistry.js");
const { buildMultiEndpointTunnelCommands, generateMobaXtermStartAllBatScript } = require("../../dist/tunnel/MobaXtermCommandBuilder.js");

test("multi endpoint command builder emits grouped Hub and Worker tunnel commands", () => {
  const setup = normalizeMobaXtermSetupConfig({
    mobaxtermExePath: "C:\\MobaXterm.exe",
    hubHost: "hub.local",
    hubUser: "zlk",
    workerRealtimeMode: "hub_plus_workers",
    workerTunnels: [{ id: "w1", workerHost: "w1.local", workerUser: "zlk", localForwardPort: 18766, enabled: true }],
  });
  const endpoints = buildTunnelEndpointRegistry(setup).endpoints;
  const commands = buildMultiEndpointTunnelCommands(setup, endpoints);
  assert.equal(commands.length, 2);
  assert.match(commands[0].preview.sshCommand, /127\.0\.0\.1:18765:127\.0\.0\.1:18765/);
  assert.match(commands[1].preview.sshCommand, /127\.0\.0\.1:18766:127\.0\.0\.1:18765/);
  const script = generateMobaXtermStartAllBatScript(setup, endpoints);
  assert.match(script, /Hub control tunnel/);
  assert.match(script, /Worker telemetry tunnel/);
});