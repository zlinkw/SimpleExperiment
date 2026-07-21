const test = require("node:test");
const assert = require("node:assert/strict");
const net = require("node:net");

const { normalizeTunnelGatewayConfig } = require("../../dist/tunnel/TunnelGateway.js");
const { normalizeMobaXtermSetupConfig } = require("../../dist/tunnel/MobaXtermSetup.js");
const { recommendAvailableLocalPort } = require("../../dist/tunnel/MobaXtermLauncher.js");

test("mobaxterm realtime setup defaults to realtime and file transfer", () => {
  const tunnel = normalizeTunnelGatewayConfig({});
  const setup = normalizeMobaXtermSetupConfig({});
  assert.equal(tunnel.connectionMode, "mobaxterm_tunnel_realtime");
  assert.equal(tunnel.allowStreaming, true);
  assert.equal(setup.realtimeEnabled, true);
  assert.equal(setup.fileTransferEnabled, true);
  assert.equal(setup.autoStartTunnelOnExtensionActivation, false);
  assert.equal(setup.autoTestTunnelAfterStart, true);
});

test("occupied local port gets recommended replacement", async () => {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const occupied = server.address().port;
  try {
    const recommended = await recommendAvailableLocalPort(occupied);
    assert.notEqual(recommended, occupied);
    assert.ok(recommended >= 1024 && recommended <= 65535);
  } finally {
    server.close();
  }
});
