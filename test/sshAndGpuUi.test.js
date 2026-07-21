const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const extensionSource = fs.readFileSync(path.join(__dirname, "..", "src", "extension.ts"), "utf8");

test("extension exposes tunnel-only connection UI", () => {
  assert.match(extensionSource, /Configure/);
  assert.match(extensionSource, /Start Tunnel/);
  assert.match(extensionSource, /Manual Refresh/);
  assert.match(extensionSource, /Pause All/);
  assert.match(extensionSource, /Import Offline/);
  assert.match(extensionSource, /127\.0\.0\.1/);
});

test("extension no longer contains direct remote fallback methods", () => {
  for (const forbidden of [
    "runSsh(",
    "connectSshSessions",
    "closeControlMasterSessions",
    "persistent_shell",
    "oneshot",
    "sshTransportMode",
  ]) {
    assert.equal(extensionSource.includes(forbidden), false, forbidden);
  }
});

test("webview hidden state is passed to request budget", () => {
  assert.match(extensionSource, /onDidChangeVisibility/);
  assert.match(extensionSource, /budget\.setHidden/);
});
