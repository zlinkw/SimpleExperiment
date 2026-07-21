const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");

test("postTunnelAction wrapper generates opId checks capabilities and posts fixed action", () => {
  const source = fs.readFileSync(path.join(root, "src", "extension.ts"), "utf8");
  assert.match(source, /private async postTunnelAction/);
  assert.match(source, /makeOpId\(action\)/);
  assert.match(source, /missingCapabilities/);
  assert.match(source, /client\.postAction<T>\(action, request\)/);
  assert.match(source, /schemaVersion: 1/);
  assert.match(source, /localOperations/);
});