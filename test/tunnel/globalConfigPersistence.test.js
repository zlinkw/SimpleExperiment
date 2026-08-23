const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("tunnel setup is persisted globally instead of per workspace", () => {
  const source = fs.readFileSync("src/extension.ts", "utf8");
  assert.match(source, /globalState\.get\(keys\.setupConfig\)/);
  assert.match(source, /globalState\.update\(keys\.setupConfig, persistedXshellSetupConfig\(this\.setupConfig\)\)/);
  assert.doesNotMatch(source, /workspaceState\.get\([^)]*setupConfig/);
});

test("session defaults keep the last panel save unless a non-default user setting changes", () => {
  const source = fs.readFileSync("src/extension.ts", "utf8");
  assert.match(source, /setupConfigurationSignature: "simpleExperiment\.setupConfigurationSignature"/);
  assert.match(source, /savedDefaultsWin = .*sessionDefaultConfigurationSignature\(sessionDefaults\)/);
  assert.match(source, /nonDefaultConfigurationValue\)\(config, "tunnel\.remoteTmuxSessionPrefix"/);
  assert.match(source, /nonDefaultConfigurationValue\)\(config, "tunnel\.condaEnv"/);
  assert.match(source, /await this\.saveState\(\);\s*await this\.context\.globalState\.update\(keys\.setupConfigurationSignature, this\.sessionDefaultConfigurationSignature\(\)\)/);
});
