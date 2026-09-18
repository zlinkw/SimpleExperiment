const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { readSource } = require("../_helpers/sourceReader");

function renderPanelHtmlFromSource(source) {
  const cleaned = source
    .replace(/^\/\/ @ts-nocheck\r?\n/, "")
    .replace(/^"use strict";\r?\n/, "")
    .replace(/Object\.defineProperty\(exports,[\s\S]*?;\r?\n/, "")
    .replace(/exports\.renderPanelHtml = renderPanelHtml;\r?\n/, "")
    .replace(/export function renderPanelHtml/, "function renderPanelHtml")
    .replace(/function renderPanelHtml\(\): string/, "function renderPanelHtml()");
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(cleaned + "\nthis.result = renderPanelHtml();", sandbox);
  return sandbox.result;
}

function extractScript(html) {
  const start = html.indexOf("<script");
  const gt = html.indexOf(">", start);
  const end = html.indexOf("</script>", gt);
  assert.ok(start >= 0 && gt >= 0 && end > gt, "script tag missing");
  return html.slice(gt + 1, end);
}

test("panel webview script parses and keeps config commands", () => {
  const source = readSource("src/ui/PanelHtml.ts");
  const html = renderPanelHtmlFromSource(source);
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
  assert.match(script, /isParseableResultCandidate/);
  assert.match(script, /jobs\.csv/);
});
