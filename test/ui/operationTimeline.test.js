const test = require("node:test");
const assert = require("node:assert/strict");

const { renderPanelHtml } = require("../../dist/ui/PanelHtml.js");

test("operation progress renders as a VS Code timeline", () => {
  const html = renderPanelHtml();
  assert.match(html, /\.operationTimeline \{ display: grid; gap: 6px; \}/);
  assert.match(html, /\.operationItem \{/);
  assert.match(html, /\.operationDot/);
  assert.match(html, /function renderOperationItem/);
  assert.match(html, /'<div class="operationTimeline">' \+ view\.visibleRows\.map\(renderOperationItem\)\.join\(""\) \+ '<\/div>'/);
  assert.match(html, /operationDisplayMessage\(row\)/);
  assert.match(html, /const itemTitle = operationTypeLabel\(rawType\)/);
  assert.match(html, /title="' \+ escAttr\(itemTitle\) \+ '"/);
  assert.match(html, /function operationIsCancelled\(status\)/);
  assert.match(html, /operationStatusCard\("已取消", stats\.cancelled, "cancelled"\)/);
  assert.match(html, /operationIsCancelled\(status\) \? "is-cancelled"/);
  assert.match(html, /if \(operationIsFailureLike\(row\.status\)\) return row\.error/);
  assert.match(html, /if \(operationIsCompleted\(row\.status\)\) return "操作已完成。"/);
  assert.match(html, /meaningfulValue\(row\.progress\)/);
});
