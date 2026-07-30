const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");

function extractFunction(name) {
  const start = panel.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing ${name}`);
  const bodyStart = panel.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < panel.length; index += 1) {
    if (panel[index] === "{") depth += 1;
    if (panel[index] === "}") depth -= 1;
    if (depth === 0) return panel.slice(start, index + 1);
  }
  throw new Error(`unterminated ${name}`);
}

function extractFrozenObject(name) {
  const start = panel.indexOf(`const ${name} = Object.freeze({`);
  assert.ok(start >= 0, `missing ${name}`);
  const end = panel.indexOf("});", start);
  assert.ok(end > start, `unterminated ${name}`);
  return panel.slice(start, end + 3);
}

function pendingLabel(command) {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(`${extractFrozenObject("PENDING_ACTION_LABELS")}\n${extractFunction("pendingLabel")}\nthis.check = pendingLabel;`, sandbox);
  return sandbox.check({ command });
}

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

test("task pending labels reuse one immutable lookup table", () => {
  assert.equal(pendingLabel("stopExperiment"), "停止中");
  assert.equal(pendingLabel("completeThreeWay"), "校验中");
  assert.equal(pendingLabel("futureCommand"), "执行中");
  assert.match(panel, /const PENDING_ACTION_LABELS = Object\.freeze\(\{/);
  assert.match(extractFunction("pendingLabel"), /PENDING_ACTION_LABELS\[command\] \|\| "执行中"/);
  assert.doesNotMatch(extractFunction("pendingLabel"), /const labels =/);
});
