const test = require("node:test");
const assert = require("node:assert/strict");

const { renderPanelHtml } = require("../../dist/ui/PanelHtml.js");

test("operation progress renders as a VS Code timeline", () => {
  const html = renderPanelHtml();
  assert.match(html, /\.operationTimeline \{ display: grid; gap: 10px; \}/);
  assert.match(html, /\.operationItem \{/);
  assert.match(html, /\.operationDot/);
  assert.match(html, /function renderOperationItem/);
  assert.match(html, /'<div class="operationTimeline">' \+ rows\.map\(renderOperationItem\)\.join\(""\) \+ '<\/div>'/);
  assert.match(html, /operationDisplayMessage\(row\)/);
  assert.match(html, /title="\'+ escAttr\(message\) \+'/);
});