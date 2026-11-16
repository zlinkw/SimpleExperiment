const assert = require("node:assert/strict");
const test = require("node:test");
const { renderPanelHtml } = require("../../dist/ui/PanelHtml.js");

test("result summary keeps its navigation anchor", () => {
  const html = renderPanelHtml();
  assert.match(html, /id="resultSummary" data-anchor="results-summary"/);
});
