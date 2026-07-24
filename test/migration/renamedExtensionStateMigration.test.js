const assert = require("node:assert/strict");
const test = require("node:test");

const migration = require("../../dist/config/RenamedExtensionStateMigration.js");

function context(current, legacy) {
  const values = new Map(Object.entries(current || {}));
  return {
    globalStorageUri: { fsPath: "C:/Users/test/AppData/Roaming/Code/User/globalStorage/simple-local.simple-experiment" },
    globalState: {
      get(key, fallback) { return values.has(key) ? values.get(key) : fallback; },
      async update(key, value) { values.set(key, value); },
    },
    readState: () => legacy,
    values,
  };
}

test("renamed extension restores the more complete Xshell setup without direct SSH fields", async () => {
  const legacy = {
    "zlkCluster.xshellRealtimeTunnelConfig": {
      xshellExePath: "C:/Program Files/NetSarang/Xshell/Xshell.exe",
      hubHost: "hub.example",
      hubUser: "runner",
      savedSessionPath: "C:/sessions/hub.xsh",
      agentProjectDir: "/srv/projects",
      privateKeyPath: "C:/secret/key",
      workerTunnels: [{ id: "gpu-a", hubHost: "gpu.example", hubUser: "runner", savedSessionPath: "C:/sessions/gpu.xsh", privateKeyPath: "C:/secret/gpu" }],
    },
  };
  const state = context({ "zlkCluster.xshellRealtimeTunnelConfig": {} }, legacy);
  const result = await migration.migrateRenamedExtensionState(state, { readState: state.readState });
  assert.equal(result.migrated, true);
  const setup = state.values.get("zlkCluster.xshellRealtimeTunnelConfig");
  assert.equal(setup.savedSessionRunner, "xshell");
  assert.equal(setup.workerTunnels.length, 1);
  assert.equal(setup.privateKeyPath, undefined);
  assert.equal(setup.workerTunnels[0].privateKeyPath, undefined);
  assert.equal(state.values.get("zlkCluster.tunnelGatewayConfig").connectionMode, "xshell_tunnel_realtime");
});

test("renamed extension never overwrites an already complete public setup", async () => {
  const current = {
    "zlkCluster.xshellRealtimeTunnelConfig": {
      xshellExePath: "xshell.exe",
      hubHost: "current-hub",
      hubUser: "runner",
      savedSessionPath: "current.xsh",
      agentProjectDir: "/srv/current",
      workerTunnels: [{ id: "current-worker", savedSessionPath: "current-worker.xsh", enabled: true }],
    },
  };
  const state = context(current, { "zlkCluster.xshellRealtimeTunnelConfig": { hubHost: "old", workerTunnels: [{ id: "old" }, { id: "old2" }, { id: "old3" }] } });
  const result = await migration.migrateRenamedExtensionState(state, { readState: state.readState });
  assert.equal(result.reason, "current_setup_complete");
  assert.equal(state.values.get("zlkCluster.xshellRealtimeTunnelConfig").hubHost, "current-hub");
});

test("renamed extension marks an unavailable legacy database as checked without failing activation", async () => {
  const state = context({ "zlkCluster.xshellRealtimeTunnelConfig": {} }, {});
  const result = await migration.migrateRenamedExtensionState(state, { readState: () => ({}) });
  assert.equal(result.migrated, false);
  assert.equal(state.values.get(migration.RENAMED_EXTENSION_STATE_MIGRATION_KEY), migration.RENAMED_EXTENSION_STATE_MIGRATION_VERSION);
});
