const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function renderPanelHtmlFromSource(source) {
  const cleaned = source
    .replace(/^\/\/ @ts-nocheck\r?\n/, "")
    .replace(/^"use strict";\r?\n/, "")
    .replace(/Object\.defineProperty\(exports,[\s\S]*?;\r?\n/, "")
    .replace(/exports\.renderPanelHtml = renderPanelHtml;\r?\n/, "")
    .replace(/export function renderPanelHtml\(\): string/, "function renderPanelHtml()");
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

function loadRenderedPanelScript() {
  const source = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");
  return extractScript(renderPanelHtmlFromSource(source));
}

test("panel and extension output gates share nextStep and parseable candidate regex", () => {
  const extension = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");
  const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");
  const script = loadRenderedPanelScript();
  for (const source of [extension, panel]) {
    assert.match(source, /nextStep/);
    assert.match(source, /计划强契约/);
    assert.match(source, /下一步/);
  }
  assert.doesNotThrow(() => new vm.Script(script, { filename: "panel-webview.js" }));
  assert.match(script, /isParseableResultCandidate/);
  assert.match(script, /jobs\.csv/);
  assert.match(script, /csv\|json\|txt\|log\|out/);
  // 当前面板将结果位置与门禁下一步分开展示。
  assert.match(panel, /projectQuickRow\("结果位置"/);
  assert.match(extension, /nextLabel: next \? next\.label : ""/);
  assert.match(extension, /nextStep: next \? \(next\.fix \|\| ""\) : ""/);
  assert.match(extension, /在 experiments\/plans 下创建或放入 YAML Plan/);
});

test("isParseableResultCandidate accepts nested plan result paths", () => {
  const script = loadRenderedPanelScript();
  const match = script.match(/function isParseableResultCandidate\(value\) \{[\s\S]*?\n    \}/);
  const metadata = script.match(/const RESULT_METADATA_FILENAMES = new Set\([^;]+;\s+const RESULT_METADATA_SUFFIXES = \[[^\]]*\];/);
  assert.ok(match, "rendered helper missing");
  assert.ok(metadata, "result metadata constants missing");
  const fn = new Function(metadata[0] + match[0] + "; return isParseableResultCandidate;")();
  assert.equal(fn("work_dirs/smoke/metrics_summary.csv"), true);
  assert.equal(fn("experiments/results/suite_a/result.json"), true);
  assert.equal(fn("jobs.csv"), false);
  assert.equal(fn("path/to/jobs.csv"), false);
  assert.equal(fn("readme.md"), false);
});
