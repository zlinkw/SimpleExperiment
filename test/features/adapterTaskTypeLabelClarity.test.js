const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");

test("project adapter summaries translate common task types", () => {
  assert.match(panel, /function projectTaskTypeLabel\(taskType\)/);
  assert.match(panel, /classification: "分类", segmentation: "分割", regression: "回归", detection: "目标检测"/);
  assert.match(panel, /"任务 " \+ projectTaskTypeLabel\(rules\.taskType \|\| "classification"\)/);
  assert.match(panel, /\["任务类型", projectTaskTypeLabel\(rules\.taskType \|\| "classification"\)\]/);
});

test("project adapter editor and unknown task types remain compatible", () => {
  assert.match(panel, /projectRuleInput\("taskType", "任务类型", rules\.taskType \|\| "classification"/);
  assert.match(panel, /return labels\[key\] \|\| raw \|\| "未指定"/);
});
