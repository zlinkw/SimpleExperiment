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

function call(name, value) {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(`${extractFunction(name)}\nthis.fn = ${name};`, sandbox);
  return sandbox.fn(value);
}

test("analysis and PPT config values use clear Chinese labels", () => {
  assert.equal(call("analysisStatusLabel", "significant"), "显著");
  assert.equal(call("analysisStatusLabel", "not-significant"), "不显著");
  assert.equal(call("analysisStatusLabel", "needs experiment"), "需实验");
  assert.equal(call("chartTypeLabel", "auto"), "自动");
  assert.equal(call("styleModeLabel", "activePpt"), "跟随当前 PPT");
});

test("unknown analysis values remain unchanged for compatibility", () => {
  assert.equal(call("analysisStatusLabel", "future_state"), "future_state");
  assert.equal(call("chartTypeLabel", "futureChart"), "futureChart");
  assert.equal(call("styleModeLabel", "futureStyle"), "futureStyle");
});

test("result summary and PPT selects hide raw identifiers without changing config values", () => {
  assert.match(panel, /row\("解析失败数量", pick\(summary, \["parseFailed", "parse_failed"\]/);
  assert.doesNotMatch(panel, /row\("parse_failed"/);
  assert.match(panel, /optionHtml\("auto", "自动", chartType === "auto"\)/);
  assert.match(panel, /optionHtml\("activePpt", "跟随当前 PPT", styleMode === "activePpt"\)/);
  assert.match(panel, /原始值：/);
});
