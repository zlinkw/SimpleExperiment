const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");

test("operations surfaces use readable Chinese terminology", () => {
  assert.match(panel, /界面操作、Agent 返回状态/);
  assert.match(panel, /"操作终态", "操作 进度 已提交 执行中 失败 卡住 已完成 accepted running failed stalled completed"/);
  assert.match(panel, /查看已提交、执行中、已完成和异常操作/);
  assert.match(panel, /失败或卡住的操作需要查看错误和残留/);
  assert.match(panel, /确认耗时按钮在完成、失败、取消或超时后恢复可点击/);
  assert.match(panel, /等待可用性上报或 GPU 资源租约/);
  assert.match(panel, /\["代码指纹", compactText/);
  assert.match(panel, /\["Hub 操作", hasCapability/);
  assert.match(panel, /\["运行器警告", row\.runnerWarningCount/);
});

test("operations surfaces keep raw compatibility terms outside visible labels", () => {
  assert.match(panel, /accepted running completed failed stalled/);
  assert.match(panel, /代码指纹（fingerprint）/);
  assert.match(panel, /操作接口能力（action endpoint）/);
  assert.doesNotMatch(panel, />UI 操作、Agent operation</);
  assert.doesNotMatch(panel, /"operation 终态"/);
  assert.doesNotMatch(panel, /\["runner 警告",/);
});
