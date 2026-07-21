const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");

// 7c23e89 基线：资源树/onboarding 保留对象文案与步骤说明，tree 对象条可见。
test("tree and onboarding keep object entries and step text", () => {
  assert.match(panel, /\.onboardingStep span \{[^}]*color: var\(--muted\)/);
  assert.match(panel, /function onboardingStep\(/);
  assert.match(panel, /function treeObjectItem\(/);
  assert.match(panel, /treeObjectItem\("servers", "Hub"/);
  assert.match(panel, /var\(--tree-col\)|always-visible three columns/);
});


