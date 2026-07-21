const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");

const { renderPanelHtml } = require("../../dist/ui/PanelHtml.js");

test("panel inline script is valid JavaScript", () => {
  const html = renderPanelHtml();
  const start = html.indexOf("<script");
  assert.notEqual(start, -1);
  const bodyStart = html.indexOf(">", start) + 1;
  const end = html.indexOf("</script>", bodyStart);
  assert.ok(end > bodyStart);
  const script = html.slice(bodyStart, end);
  assert.doesNotThrow(() => new vm.Script(script, { filename: "panel-inline.js" }));
});