const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");

function renderPanelHtmlFromSource(source) {
  const cleaned = source
    .replace(/^\/\/ @ts-nocheck\r?\n/, "")
    .replace(/^"use strict";\r?\n/, "")
    .replace(/Object\.defineProperty\(exports,[\s\S]*?;\r?\n/, "")
    .replace(/exports\.renderPanelHtml = renderPanelHtml;\r?\n/, "")
    .replace(/export function renderPanelHtml/, "function renderPanelHtml");
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(cleaned + "\nthis.result = renderPanelHtml();", sandbox);
  return sandbox.result;
}

test("legend tree and first-paint placeholders are restored", () => {
  assert.match(panel, /\.statusLegend \{/);
  assert.match(panel, /\.legendItem \{[\s\S]*display: inline-flex/);
  assert.match(panel, /\.legendDot \{/);
  assert.match(panel, /\.legendDot\.good \{/);
  assert.match(panel, /\.legendDot\.info \{/);
  assert.match(panel, /\.legendDot\.warn \{/);
  assert.match(panel, /\.legendDot\.error \{/);
  assert.match(panel, /\.legendDot\.mine \{/);
  assert.match(panel, /\.tree-item, \.tree-object \{/);
  assert.match(panel, /\.tree-search \{/);
  assert.match(panel, /\.workbenchInspector \{[\s\S]*display: grid/s);
  assert.match(panel, /id="resourceTreeBody"><\/div>/);
  assert.match(panel, /id="workbenchInspector"[^>]*><\/aside>/);
  assert.match(panel, /id="summary" class="workbench-summary"[\s\S]*><\/div>/);
  assert.match(panel, /id="serverCards" data-anchor="servers-list"><\/div>/);
  // densify retained
  assert.match(panel, /端口冲突 /);
  const html = renderPanelHtmlFromSource(panel);
  assert.match(html, /class="legendDot good"/);
  assert.match(html, /id="cardDeck"/);
  assert.match(html, /id="mainColumn"/);
});

test("gpu task plan chrome stays with explanatory guidance", () => {
  // 7c23e89 基线保留 GPU/任务/计划区的说明文案。
  assert.match(panel, /本服务器还有 /);
  assert.match(panel, /个进程未显示/);
  assert.match(panel, /gpuStats/);
  assert.match(panel, /YAML/);
});