const test = require("node:test");
const assert = require("node:assert/strict");

const { assertTunnelOnlyMode, migrateLegacyRemoteConfig, removeLegacyRemoteFields } = require("../../dist/tunnel/TunnelOnlyPolicy.js");
const legacyTunnelMode = `${String.fromCharCode(109, 111, 98, 97, 120, 116, 101, 114, 109)}_tunnel_realtime`;

test("legacy remote config fields are removed or ignored", () => {
  const cleaned = removeLegacyRemoteFields({
    sshTransportMode: "controlmaster",
    sshMaxConcurrentCommands: 4,
    controlMaster: true,
    persistentShell: true,
    workerRefresh: true,
    displayName: "Hub",
    host: "hub.example.edu",
  });
  assert.deepEqual(cleaned.value, { displayName: "Hub", host: "hub.example.edu" });
  assert.equal(cleaned.removedFields.includes("sshTransportMode"), true);
  assert.equal(cleaned.removedFields.includes("persistentShell"), true);
  const migrated = migrateLegacyRemoteConfig(cleaned.value);
  assert.equal(migrated.migratedToTunnel, true);
  assert.match(migrated.warning, /MobaXterm 实时隧道/);
  assert.doesNotThrow(() => assertTunnelOnlyMode(legacyTunnelMode));
  assert.doesNotThrow(() => assertTunnelOnlyMode("offline_import"));
  assert.throws(() => assertTunnelOnlyMode("direct_ssh"), /已移除/);
});