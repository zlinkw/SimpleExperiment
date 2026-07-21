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

function labelStatus(value) {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(`${extractFunction("labelStatus")}\nthis.labelStatus = labelStatus;`, sandbox);
  return sandbox.labelStatus(value);
}

test("result trace statuses use Chinese workflow labels", () => {
  assert.equal(labelStatus("archived"), "已归档");
  assert.equal(labelStatus("pending_review"), "待筛选");
  assert.equal(labelStatus("parsed"), "已解析");
  assert.equal(labelStatus("parse_failed"), "解析失败");
  assert.equal(labelStatus("deleted"), "已删除");
  assert.equal(labelStatus("residue"), "有残留");
});

test("result trace UI keeps raw statuses available in hover text", () => {
  assert.match(panel, /原始归档状态：/);
  assert.match(panel, /原始删除状态：/);
  assert.match(panel, /taskMetric\("解析", labelStatus\(row\.resultStatus\)\)/);
  assert.match(panel, /detailTab\("归档", labelStatus\(row\.status/);
  assert.match(panel, /\["解析", labelStatus\(rawResultStatus\), traceTone\(row\.resultStatus\), rawResultStatus\]/);
  assert.match(panel, /\["归档", labelStatus\(rawArchiveStatus\), traceTone\(row\.status\), rawArchiveStatus\]/);
  assert.match(panel, /\["删除", labelStatus\(rawDeleteStatus\), traceTone\(row\.deleteStatus\), rawDeleteStatus\]/);
  assert.match(panel, /title \+ "原始状态：" \+ rawStatus/);
});

test("unknown result status remains unchanged for old and future records", () => {
  assert.equal(labelStatus("future_archive_state"), "future_archive_state");
});
