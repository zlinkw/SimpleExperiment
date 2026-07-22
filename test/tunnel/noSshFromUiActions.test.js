const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");

test("new realtime UI snapshots use the localhost client", () => {
  const source = fs.readFileSync(path.join(root, "src", "extension.ts"), "utf8");
  const methods = [
    ["manualGpuSnapshot", "manualSchedulerSnapshot", /this\.client\.getGpu\(\)/],
    ["manualSchedulerSnapshot", "manualTracesSnapshot", /this\.client\.getScheduler\(\)/],
    ["manualTracesSnapshot", "generateTunnelScript", /this\.client\.getTraces\(\)/],
  ];
  for (const [method, nextMethod, clientCall] of methods) {
    const start = source.indexOf(`async ${method}()`);
    const end = source.indexOf(`async ${nextMethod}(`, start);
    assert.ok(start >= 0 && end > start, method);
    const body = source.slice(start, end);
    assert.match(body, clientCall, method);
    assert.doesNotMatch(body, /\b(?:runSsh|execFile|spawn)\s*\(/i, method);
  }
  const panel = fs.readFileSync(path.join(root, "src", "ui", "PanelHtml.ts"), "utf8");
  assert.doesNotMatch(panel, /\b(?:direct_ssh|runSsh|execFile|spawn)\s*\(/i);
});
