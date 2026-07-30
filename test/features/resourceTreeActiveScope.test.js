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

test("resource tree reuses immutable icon and tone rank tables", () => {
  assert.match(panel, /const RESOURCE_TREE_SECTION_ICONS = Object\.freeze\(\{ overview: "◌", servers: "▧", gpu: "◫"/);
  assert.match(panel, /const RESOURCE_TREE_TONE_RANKS = Object\.freeze\(\{ error: 5, warn: 4, mine: 3, good: 2, info: 1 \}\)/);
  assert.match(panel, /return RESOURCE_TREE_SECTION_ICONS\[section\] \|\| "•"/);
  assert.match(panel, /RESOURCE_TREE_TONE_RANKS\[b\][\s\S]{0,80}RESOURCE_TREE_TONE_RANKS\[a\]/);
  assert.doesNotMatch(panel, /function defaultTreeObjectIcon\(section\) \{\s*const map =/);
  assert.doesNotMatch(panel, /function resourceTreeDominantTone\(tones\) \{\s*const rank =/);
});
