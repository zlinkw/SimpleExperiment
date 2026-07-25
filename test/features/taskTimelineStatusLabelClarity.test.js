const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");

test("task timeline translates task status and preserves the raw value in details", () => {
  assert.match(panel, /const rawTaskStatus = row\.status \|\| "-"/);
  assert.match(panel, /\["任务状态", taskStatusLabel\(rawTaskStatus\), "原始状态：" \+ rawTaskStatus/);
  assert.match(panel, /taskCardClass\(row\.status\)/);
  assert.match(panel, /const taskTime = taskTimestampView\(row\)/);
  assert.match(panel, /taskTerminalStatus\(row\.status\) \? "终态" : "更新"/);
  assert.match(panel, /taskTime\.label \+ "时间：" \+ taskTime\.raw/);
  assert.match(panel, /minuteBucket: Math\.floor\(Date\.now\(\) \/ 60000\)/);
});

test("task timeline keeps unknown task status values compatible", () => {
  assert.match(panel, /taskStatusLabel\(status\)/);
  assert.match(panel, /return labels\[taskStatusToken\(raw\)\] \|\| raw/);
});
