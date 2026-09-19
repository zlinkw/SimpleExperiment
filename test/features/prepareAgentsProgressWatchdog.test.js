const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const extension = fs.readFileSync(path.join(root, "src/extension/legacy.ts"), "utf8");
const panel = fs.readFileSync(path.join(root, "src/ui/PanelHtml.legacy.ts"), "utf8");

test("Agent preparation stays pending while its real deployment continues", () => {
  const status = extension.slice(extension.indexOf("private async withUiCommandStatus("), extension.indexOf("private postUiCommandStatus("));
  assert.match(status, /watchdogMs > 0/);
  assert.match(status, /if \(command === "prepareAgents"\) return 0/);
  assert.match(panel, /if \(command !== "prepareAgents"\) \{\s*pendingActionTimeouts\[clientActionId\]/);
});
