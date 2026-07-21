const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");

// 7c23e89 基线保留 workflow 阶段轨道、对象条、阻塞栏与运行态 chip 作为 live chrome。
test("overview keeps runtime overview helpers and status grid", () => {
  assert.match(panel, /function renderWorkflowStageRail\(/);
  assert.match(panel, /function renderWorkbenchObjectStrip\(/);
  assert.match(panel, /function renderWorkflowBlockerBar\(/);
  assert.match(panel, /function overviewRuntimeChip\(/);
  assert.match(panel, /function renderClusterRuntimeOverview\(/);
  assert.match(panel, /overviewStatusGrid/);
  assert.match(panel, /function statusInfoPopover\(text, label\)/);
  assert.match(panel, /var\(--tree-col\)|always-visible three columns/);
});
