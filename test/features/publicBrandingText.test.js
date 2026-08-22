const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "../..");
const extension = fs.readFileSync(path.join(root, "src/extension.ts"), "utf8");
const panel = fs.readFileSync(path.join(root, "src/ui/PanelHtml.ts"), "utf8");
const ppt = fs.readFileSync(path.join(root, "src/PptPlotBridge.ts"), "utf8");
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
const legacyNotes = fs.readFileSync(path.join(root, "docs/technical-notes.md"), "utf8");

test("public user-facing labels use SimpleExperiment branding", () => {
  assert.doesNotMatch(extension, /ZLK GitHub|ZLK 结果|simple-results\.pptx|非 ZLK 登录后命令|当前 ZLK Agent|其它 ZLK Agent/);
  assert.doesNotMatch(panel, /写入 simple-\* RemoteCommand/);
  assert.doesNotMatch(ppt, /ZLK 结果/);
  assert.match(extension, /SimpleExperiment GitHub publish/);
  assert.match(extension, /SimpleExperiment 结果/);
  assert.match(extension, /simple-experiment-results\.pptx/);
  assert.match(panel, /写入 Agent RemoteCommand/);
  assert.match(ppt, /SimpleExperiment 结果/);
});

test("legacy technical identifiers remain compatible", () => {
  assert.match(extension, /\.simple-backup/);
  assert.match(extension, /__SIMPLE_EXPERIMENT_PROJECT_NAME__/);
  assert.match(legacyNotes, /旧 `simple-experiment-run` 作为兼容别名继续可用/);
  assert.match(legacyNotes, /`SIMPLE_EXPERIMENT_AGENT_STATE_DIR`/);
});
