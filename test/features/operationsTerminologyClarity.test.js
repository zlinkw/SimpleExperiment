const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { readSource } = require("../_helpers/sourceReader");

const panel = readSource("src/ui/PanelHtml.ts");

test("operations surfaces explain the compact Plan view", () => {
  assert.match(panel, /按 Plan 查看进度；展开单行查看任务和日志/);
  assert.match(panel, /运行中和异常置顶；完成记录折叠/);
  assert.match(panel, /完整操作与任务记录/);
  assert.match(panel, /失败或卡住的操作需要查看错误和残留/);
  assert.match(panel, /确认耗时按钮在完成、失败、取消或超时后恢复可点击/);
  assert.match(panel, /\["运行器警告", row\.runnerWarningCount/);
});

test("operations surfaces keep raw compatibility terms outside visible labels", () => {
  assert.match(panel, /accepted running completed failed stalled/);
  assert.match(panel, /"操作列表", "入口", "", "查看已提交、执行中、已完成和异常操作/);
  assert.doesNotMatch(panel, />UI 操作、Agent operation</);
  assert.doesNotMatch(panel, /"operation 终态"/);
  assert.doesNotMatch(panel, /\["runner 警告",/);
});
