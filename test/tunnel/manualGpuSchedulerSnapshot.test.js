const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");

test("manual ui snapshots call tunnel client APIs", () => {
  const source = fs.readFileSync(path.join(root, "src", "extension.ts"), "utf8");
  assert.match(source, /command === "manualGpuSnapshot"[\s\S]+manualGpuSnapshot/);
  assert.match(source, /command === "manualSchedulerSnapshot"[\s\S]+manualSchedulerSnapshot/);
  assert.match(source, /command === "manualTracesSnapshot"[\s\S]+manualTracesSnapshot/);
  assert.match(source, /await this\.client\.getGpu\(\)/);
  assert.match(source, /await this\.client\.getScheduler\(\)/);
  assert.match(source, /await this\.client\.getTraces\(\)/);
});

test("select log run key only updates webview state", () => {
  const source = fs.readFileSync(path.join(root, "src", "extension.ts"), "utf8");
  assert.match(source, /command === "selectLogRunKey"/);
  assert.match(source, /this\.selectedLogRunKey = String/);
});