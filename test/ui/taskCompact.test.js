const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const panelSource = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");

test("task section drops progress cards and dense meta grid", () => {
  assert.doesNotMatch(panelSource, /setHtmlIfChanged\("taskProgressCards", active\.length/);
  assert.doesNotMatch(panelSource, /勾选任务后可批量停止、重试、解析、归档或删除/);
  assert.doesNotMatch(panelSource, /已隐藏 ' \+ hiddenLegacyTaskUiKeys\.size \+ ' 条旧任务残留/);
  assert.doesNotMatch(panelSource, /taskMetaGrid/);
  assert.match(panelSource, /setHtmlIfChanged\("taskProgressCards", ""\)/);
  assert.match(panelSource, /titleBits/);
});