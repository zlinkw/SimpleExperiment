const test = require("node:test");
const assert = require("node:assert/strict");

const { renderPanelHtml } = require("../../dist/ui/PanelHtml.js");

test("task rows expose stop retry parse archive delete and open log actions", () => {
  const html = renderPanelHtml();
  for (const text of ["Stop", "Retry", "Parse", "Archive", "Delete", "Open Log"]) {
    assert.match(html, new RegExp(text));
  }
  assert.match(html, /data-danger="true"/);
  assert.match(html, /selectLogRunKey/);
});