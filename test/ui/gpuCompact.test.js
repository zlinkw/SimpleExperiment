const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const panelSource = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");

test("gpu section omits explanatory owner hint and process list rendering", () => {
  assert.doesNotMatch(panelSource, /可在设置中填写 zlkCluster\.gpu\.currentUser/);
  assert.doesNotMatch(panelSource, /gpuMetaLine\(server, displayName\) \+<\/div>/);
  assert.doesNotMatch(panelSource, /process-list/);
  assert.match(panelSource, /class="syncPublishPanel"/);
  assert.match(panelSource, /titleBits/);
});