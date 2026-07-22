const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");

test("webview panel open auto connects realtime stream", () => {
  const source = fs.readFileSync(path.join(root, "src", "extension.ts"), "utf8");
  assert.match(source, /ensureRealtimeConnected\("webview resolved"\)/);
  assert.match(source, /await client\.connect\(\)/);
  assert.doesNotMatch(source, /this\.client\.connect\(this\.lastRealtimeState\?\.lastSeq \|\| 0\)/);
  assert.match(source, /this\.budget\.isPaused\(\)/);
});

test("test tunnel and resume network auto reconnect realtime", () => {
  const source = fs.readFileSync(path.join(root, "src", "extension.ts"), "utf8");
  assert.match(source, /ensureRealtimeConnected\("tunnel test ok"\)/);
  assert.match(source, /ensureRealtimeConnected\("resume network"\)/);
  assert.match(source, /disconnect\("paused"\)/);
});
