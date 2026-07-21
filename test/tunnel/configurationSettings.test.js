const test = require("node:test");
const assert = require("node:assert/strict");

const { explicitConfigurationValue } = require("../../dist/tunnel/ConfigurationSettings.js");

test("configuration defaults do not override saved tunnel setup", () => {
  const config = {
    inspect(section) {
      if (section === "tunnel.workerRealtimeMode") return { defaultValue: "hub_only" };
      if (section === "tunnel.workerTunnels") return { defaultValue: [] };
      return undefined;
    },
  };
  const savedWorkers = [{ id: "nwpu5", enabled: true }];
  assert.equal(explicitConfigurationValue(config, "tunnel.workerRealtimeMode", "hub_plus_workers"), "hub_plus_workers");
  assert.deepEqual(explicitConfigurationValue(config, "tunnel.workerTunnels", savedWorkers), savedWorkers);
});

test("explicit user configuration still overrides saved tunnel setup", () => {
  const config = {
    inspect(section) {
      if (section === "tunnel.workerRealtimeMode") return { defaultValue: "hub_only", globalValue: "hub_only" };
      if (section === "tunnel.workerTunnels") return { defaultValue: [], globalValue: [{ id: "manual", enabled: true }] };
      return undefined;
    },
  };
  assert.equal(explicitConfigurationValue(config, "tunnel.workerRealtimeMode", "hub_plus_workers"), "hub_only");
  assert.deepEqual(explicitConfigurationValue(config, "tunnel.workerTunnels", []), [{ id: "manual", enabled: true }]);
});