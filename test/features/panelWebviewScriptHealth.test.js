const assert = require("node:assert/strict");
const test = require("node:test");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
require("../_helpers/registerTsRequire");

function loadSourceRenderer() {
  const sourcePath = path.resolve(__dirname, "../../src/ui/PanelHtml.legacy.ts");
  const source = fs.readFileSync(sourcePath, "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = new Module(sourcePath, module);
  loaded.filename = sourcePath;
  loaded.paths = Module._nodeModulePaths(path.dirname(sourcePath));
  loaded._compile(code, sourcePath);
  return loaded.exports.renderPanelHtml;
}

const renderPanelHtml = loadSourceRenderer();

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
  assert.match(script, /documentGeneration: panelDocumentGeneration/);
  assert.match(script, /renderHealth/);
  assert.match(script, /state-render-frame-stalled/);
  assert.match(script, /required-render-root-missing/);
});
