const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("tunnel setup is persisted globally instead of per workspace", () => {
  const source = fs.readFileSync("src/extension.ts", "utf8");
  assert.match(source, /globalState\.get\(keys\.setupConfig\)/);
  assert.match(source, /globalState\.update\(keys\.setupConfig, persistedXshellSetupConfig\(this\.setupConfig\)\)/);
  assert.doesNotMatch(source, /workspaceState\.get\([^)]*setupConfig/);
});
