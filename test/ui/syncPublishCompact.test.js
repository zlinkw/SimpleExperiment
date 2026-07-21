const assert = require("node:assert/strict");
const test = require("node:test");
const { renderPanelHtml } = require("../../dist/ui/PanelHtml.js");

test("sync publish panel is compact without nested progress card header", () => {
  const html = renderPanelHtml();

  assert.match(html, /syncPublishPanel/);
  assert.match(html, /data-anchor="sync-publish"/);
  assert.match(html, /id="publishFlow"/);
  assert.match(html, /id="publishActions"/);
  assert.match(html, /id="codeSyncState"/);
  assert.doesNotMatch(html, /发布与代码同步/);
  assert.doesNotMatch(html, /sync-publish[\s\S]*progressCard/);
});