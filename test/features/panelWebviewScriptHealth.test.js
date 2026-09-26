const assert = require("node:assert/strict");
const test = require("node:test");
const vm = require("node:vm");
const { renderPanelHtml } = require("../../dist/ui/PanelHtml.js");

function extractScript(html) {
  const start = html.indexOf("<script");
  const gt = html.indexOf(">", start);
  const end = html.indexOf("</script>", gt);
  assert.ok(start >= 0 && gt >= 0 && end > gt, "script tag missing");
  return html.slice(gt + 1, end);
}

test("panel webview script parses and keeps config commands", () => {
  const html = renderPanelHtml();
  const script = extractScript(html);
  assert.doesNotThrow(() => new vm.Script(script, { filename: "panel-webview.js" }));
  for (const command of [
    "configureSessions",
    "saveHubConfig",
    "saveWorkerConfig",
    "addWorkerConfig",
    "deleteWorkerConfig",
    "saveSchedulerConfig",
    "writeAgentCommands",
    "startAllConnections",
    "testAll",
  ]) {
    assert.match(html, new RegExp(command));
  }
  assert.match(script, /代码版本不匹配/);
  assert.match(script, /status-warning/);
  assert.equal((script.match(/const blockedOnly/g) || []).length, 1);
  assert.match(script, /isParseableResultCandidate/);
  assert.match(script, /jobs\.csv/);
});
