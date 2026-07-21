const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");

test("resource tree active lookup ignores duplicate jump buttons outside the tree", () => {
  assert.match(panel, /data-section-target="settings" data-anchor-target="settings"/);
  assert.match(panel, /function resourceTreeActiveSelector\(section, anchor\) \{\s*return '#resourceTree \[data-section-target="'/);
  assert.match(panel, /document\.querySelector\(resourceTreeActiveSelector\(activeResourceSection, activeResourceAnchor\)\)/);
});
