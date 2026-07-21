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

function phaseLabel(phase) {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(`${extractFunction("planExecutionPhaseLabel")}\nthis.phaseLabel = planExecutionPhaseLabel;`, sandbox);
  return sandbox.phaseLabel(phase);
}

test("plan execution phases use workflow labels", () => {
  assert.equal(phaseLabel("ready"), "可提交");
  assert.equal(phaseLabel("validating"), "校验中");
  assert.equal(phaseLabel("dry-running"), "预演中");
  assert.equal(phaseLabel("monitor"), "运行中");
  assert.equal(phaseLabel("results"), "结果待处理");
  assert.equal(phaseLabel("review"), "任务需处理");
});

test("unknown execution phases remain visible for compatibility", () => {
  assert.equal(phaseLabel("future-phase"), "future-phase");
  assert.equal(phaseLabel(""), "未知");
});

test("run workbench keeps the raw phase in the badge tooltip", () => {
  assert.match(panel, /planExecutionPhaseLabel\(executionStage\.phase\)/);
  assert.match(panel, /原始阶段：/);
  assert.match(panel, /function planRunRow\(label, tone, value, badge, badgeTitle\)/);
});
