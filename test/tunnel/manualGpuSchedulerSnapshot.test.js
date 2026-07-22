const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");

test("manual ui snapshots call tunnel client APIs", () => {
  const source = fs.readFileSync(path.join(root, "src", "extension.ts"), "utf8");
  assert.match(source, /case "manualGpuSnapshot":[\s\S]+manualGpuSnapshot/);
  assert.match(source, /case "manualSchedulerSnapshot":[\s\S]+manualSchedulerSnapshot/);
  assert.match(source, /case "manualTracesSnapshot":[\s\S]+manualTracesSnapshot/);
  assert.match(source, /await this\.client\.getGpu\(\)/);
  assert.match(source, /await this\.client\.getScheduler\(\)/);
  assert.match(source, /await this\.client\.getTraces\(\)/);
});

test("select log run key updates selection and refreshes live output", () => {
  const source = fs.readFileSync(path.join(root, "src", "extension.ts"), "utf8");
  assert.match(source, /case "selectLogRunKey":/);
  assert.match(source, /this\.selectedLogRunKey = stringField/);
  assert.match(source, /fetchSelectedLiveOutput\(this\.selectedLogRunKey/);
});
