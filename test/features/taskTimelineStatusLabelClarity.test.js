const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");

test("task timeline translates task status and preserves the raw value in details", () => {
  assert.match(panel, /const rawTaskStatus = row\.status \|\| "-"/);
  assert.match(panel, /\["任务状态", taskStatusLabel\(rawTaskStatus\), "原始状态：" \+ rawTaskStatus/);
  assert.match(panel, /taskCardClass\(row\.status\)/);
});

test("task timeline keeps unknown task status values compatible", () => {
  assert.match(panel, /taskStatusLabel\(status\)/);
  assert.match(panel, /return labels\[taskStatusToken\(raw\)\] \|\| raw/);
});
