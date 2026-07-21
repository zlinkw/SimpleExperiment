const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");

test("topbar keeps network recovery and uses one settings entry", () => {
  const topbarStart = panel.indexOf('<div class="topbar-actions">');
  const topbarEnd = panel.indexOf("</div>", topbarStart);
  const topbar = panel.slice(topbarStart, topbarEnd);
  assert.match(topbar, /data-command="pauseAll"/);
  assert.match(topbar, /data-command="resumeNetwork"/);
  assert.match(topbar, /data-section-target="settings"/);
  assert.doesNotMatch(topbar, /layoutEditToggle|collapseAllSections|expandAllSections|resetUiLayout/);
});

test("layout tools remain available inside settings and editing returns to workspace", () => {
  assert.match(panel, /class="settingsLayoutTools" data-anchor="settings-layout"/);
  assert.match(panel, /id="layoutEditToggle"/);
  assert.match(panel, /id="collapseAllSections"/);
  assert.match(panel, /id="expandAllSections"/);
  assert.match(panel, /data-command="resetUiLayout"/);
  assert.match(panel, /if \(!layoutEdit && currentMainView === "settings"\) switchMainView\("workspace"\);/);
  assert.match(panel, /treeObjectItem\("settings", "界面布局"/);
});
