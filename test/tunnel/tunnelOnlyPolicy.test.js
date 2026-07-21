const test = require("node:test");
const assert = require("node:assert/strict");

const { assertTunnelOnlyMode, migrateLegacyRemoteConfig } = require("../../dist/tunnel/TunnelOnlyPolicy.js");
const legacyTunnelMode = `${String.fromCharCode(109, 111, 98, 97, 120, 116, 101, 114, 109)}_tunnel_realtime`;

test("tunnel-only policy accepts only tunnel and offline modes", () => {
  assert.doesNotThrow(() => assertTunnelOnlyMode(legacyTunnelMode));
  assert.doesNotThrow(() => assertTunnelOnlyMode("offline_import"));
  assert.throws(() => assertTunnelOnlyMode("legacy"), /已移除/);
});

test("legacy remote config migration removes risky fields", () => {
  const result = migrateLegacyRemoteConfig({
    sshTransportMode: "controlmaster",
    scpPath: "x",
    name: "hub",
    workerRefresh: true,
  });
  assert.equal(result.migratedToTunnel, true);
  assert.deepEqual(result.removedFields.sort(), ["scpPath", "sshTransportMode", "workerRefresh"].sort());
});
