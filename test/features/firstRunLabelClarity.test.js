const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");

test("new project entry labels explain config and execution paths in Chinese", () => {
  assert.match(panel, /projectQuickRow\("当前配置"/);
  assert.match(panel, /projectPathButton\(configAvailable \? "打开配置" : "", firstConfig\)/);
  assert.match(panel, /projectQuickRow\("入口", "训练："/);
  assert.match(panel, /projectPathButton\(trainEntry \? "训练" : "", trainEntry\)/);
  assert.match(panel, /projectPathButton\(testEntry \? "评估" : "", testEntry\)/);
  assert.match(panel, /确认运行后会自动生成代码指纹，并同步 Hub 与参与 Worker/);
  assert.doesNotMatch(panel, /projectPathButton\(configAvailable \? "打开 config"/);
  assert.doesNotMatch(panel, /projectQuickRow\("入口", "train:/);
  assert.doesNotMatch(panel, /确认运行后会自动生成 fingerprint，并同步 Hub 与参与 Worker/);
});
