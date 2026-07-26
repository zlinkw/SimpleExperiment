const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");

test("run gates and sync surfaces use the full code fingerprint label", () => {
  assert.match(panel, /"代码指纹 " \+ compactIdentifier\(sync\.fingerprint \|\| "-"\)/);
  assert.match(panel, /"代码指纹已确认"/);
  assert.match(panel, /原始 fingerprint：/);
  assert.match(panel, /detail: "代码指纹 " \+ compactIdentifier\(sync\.fingerprint \|\| "-"\)/);
});

test("run gate names missing plan selection directly", () => {
  assert.match(panel, /selectedPlan \? "已选择" : "需要选择计划"/);
  assert.doesNotMatch(panel, /selectedPlan \? "已选择" : "需要 planFile"/);
  assert.doesNotMatch(panel, /"fp " \+ compactIdentifier\(sync\.fingerprint/);
});
