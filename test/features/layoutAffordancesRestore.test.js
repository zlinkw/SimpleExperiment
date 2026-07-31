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
    .replace(/export function renderPanelHtml/, "function renderPanelHtml")
    .replace(/function renderPanelHtml\(\): string/, "function renderPanelHtml()");
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(cleaned + "\nthis.result = renderPanelHtml();", sandbox);
  return sandbox.result;
}

function assertScriptParses(html) {
  const start = html.indexOf("<script");
  const gt = html.indexOf(">", start);
  const end = html.indexOf("</script>", gt);
  const script = html.slice(gt + 1, end);
  assert.doesNotThrow(() => new vm.Script(script, { filename: "panel-webview.js" }));
}

test("drawer UI baseline keeps layout edit and tree inspector affordances", () => {
  const source = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");
  const html = renderPanelHtmlFromSource(source);
  assert.match(html, /id="layoutEditToggle"/);
  assert.match(html, /id="resourceTreeInspector"/);
  assert.match(html, /tree-inspector/);
  assert.match(html, /layoutResizer/);
  assert.match(html, /data-drawer-pin="tree"/);
  assert.match(html, /data-drawer-pin="inspector"/);
  assert.match(html, /function toggleDrawerPinned\(side\)/);
  assert.match(html, /body\.tree-pinned #cardDeck/);
  assert.match(html, /body\.inspector-pinned #cardDeck/);
  assert.match(html, /aria-pressed/);
  assertScriptParses(html);
});

test("main panel layout reuses one order membership index", () => {
  const source = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");
  const start = source.indexOf("function applyUiLayout(");
  const end = source.indexOf("function uiLayoutApplyKey(", start);
  const applyLayout = source.slice(start, end);

  assert.match(applyLayout, /const orderedSections = new Set\(currentUiLayout\.order\)/);
  assert.match(applyLayout, /cards\.filter\(\(card\) => !orderedSections\.has\(card\.dataset\.section\)\)/);
  assert.doesNotMatch(applyLayout, /currentUiLayout\.order\.includes/);
});
