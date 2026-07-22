const test = require("node:test");
const assert = require("node:assert/strict");

const { renderPanelHtml } = require("../../dist/ui/PanelHtml.js");

test("task rows expose localized stop retry parse archive delete and open log actions", () => {
  const html = renderPanelHtml();
  for (const text of ["停止", "重试", "解析", "归档", "删除", "打开日志"]) {
    assert.match(html, new RegExp(text));
  }
  assert.match(html, /data-danger="true"/);
  assert.match(html, /selectLogRunKey/);
});
