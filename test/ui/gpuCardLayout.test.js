const test = require("node:test");
const assert = require("node:assert/strict");

const { renderPanelHtml } = require("../../dist/ui/PanelHtml.js");

test("gpu server cards render as a single-column stack", () => {
  const html = renderPanelHtml();
  assert.match(html, /\.gpuServerStack \{ display: grid; grid-template-columns: 1fr; gap: 10px; \}/);
  assert.match(html, /id="gpuGrid" class="gpuServerStack"/);
  assert.doesNotMatch(html, /id="gpuGrid" class="cardGrid"/);
});