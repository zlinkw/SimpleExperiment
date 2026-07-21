const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const panelSource = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");

test("functional entry points and drawer rails remain in baseline", () => {
  assert.match(panelSource, /class="section-desc"/);
  assert.match(panelSource, /id="experimentActions"/);
  assert.match(panelSource, /id="resultActions"/);
  assert.match(panelSource, /id="artifactActions"/);
  assert.match(panelSource, /id="pptPlotConfig"/);
  assert.match(panelSource, /function renderActionSections/);
  // 7c23e89 基线用 translateX 抽屉 rails。
  assert.match(panelSource, /transform: translateX\(calc\(-1 \* \(var\(--tree-col\) - var\(--tree-peek\)\)\)\)/);
  assert.match(panelSource, /transform: translateX\(calc\(var\(--inspector-col\) - var\(--inspector-peek\)\)\)/);
});
