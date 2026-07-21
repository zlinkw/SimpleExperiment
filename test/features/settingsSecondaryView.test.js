const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");

test("settings is a secondary main-column view without changing side drawers", () => {
  assert.match(panel, /body:not\(\.main-view-settings\) #mainColumn > \[data-section="settings"\] \{ display: none; \}/);
  assert.match(panel, /body\.main-view-settings #mainColumn > \[data-section\]:not\(\[data-section="settings"\]\) \{ display: none; \}/);
  assert.match(panel, /class="cardTools">\s*<button[^>]*data-main-view="workspace"[^>]*title="返回工作台"[^>]*>返回工作台<\/button>/);
  assert.doesNotMatch(panel, /settingsBackButton[^>]*>&#8592;<\/button>/);
  assert.match(panel, /function applyMainViewForSection\(section\)/);
  assert.match(panel, /function switchMainView\(view\)/);
  assert.match(panel, /lastWorkspaceResource = \{ section: activeResourceSection/);
  assert.match(panel, /applyMainViewForSection\(nextSection\);\s*expandResourceSection\(nextSection\);/);
});

test("settings secondary view keeps pin and three-column mechanisms intact", () => {
  assert.match(panel, /data-drawer-pin="tree"/);
  assert.match(panel, /data-drawer-pin="inspector"/);
  assert.match(panel, /body\.tree-pinned #cardDeck/);
  assert.match(panel, /body\.inspector-pinned #cardDeck/);
  assert.match(panel, /data-section-target="settings"/);
});
