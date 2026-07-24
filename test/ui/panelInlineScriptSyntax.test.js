const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");

const { renderPanelHtml } = require("../../dist/ui/PanelHtml.js");
const { renderPanelRecoveryHtml } = require("../../dist/ui/PanelRecoveryHtml.js");

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

test("panel recovery page exposes a reload action and valid inline JavaScript", () => {
  const html = renderPanelRecoveryHtml("启动错误");
  assert.match(html, /重新加载面板/);
  assert.match(html, /command:\"reloadPanel\"/);
  const start = html.indexOf("<script");
  const bodyStart = html.indexOf(">", start) + 1;
  const end = html.indexOf("</script>", bodyStart);
  assert.doesNotThrow(() => new vm.Script(html.slice(bodyStart, end), { filename: "panel-recovery-inline.js" }));
});
