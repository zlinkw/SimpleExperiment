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

function stats(rows) {
  const sandbox = {
    operationRowsForState: () => rows,
    overviewOperationStatsCacheRows: null,
    overviewOperationStatsCacheValue: null,
  };
  vm.createContext(sandbox);
  vm.runInContext([
    extractFunction("operationIsActive"),
    extractFunction("operationIsFailureLike"),
    extractFunction("operationSucceeded"),
    extractFunction("overviewOperationStats"),
    "this.check = overviewOperationStats;",
  ].join("\n"), sandbox);
  return JSON.parse(JSON.stringify(sandbox.check({})));
}

function typeLabel(type) {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(`${extractFunction("operationTypeLabel")}\nthis.check = operationTypeLabel;`, sandbox);
  return sandbox.check(type);
}

function statusLabel(status) {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(`${extractFunction("operationStatusLabel")}\nthis.check = operationStatusLabel;`, sandbox);
  return sandbox.check(status);
}

test("operation types use clear Chinese labels with raw fallback", () => {
  assert.equal(typeLabel("validate-plan"), "校验计划");
  assert.equal(typeLabel("runPlan"), "运行计划");
  assert.equal(typeLabel("parse_results"), "解析结果");
  assert.equal(typeLabel("future-operation"), "future-operation");
  assert.equal(typeLabel(""), "操作");
  assert.equal(statusLabel("submitted"), "已提交");
  assert.equal(statusLabel("completed_with_errors"), "部分失败");
  assert.equal(statusLabel("stopped"), "已停止");
});

test("overview operation stats cover active failure and completed statuses", () => {
  const rows = [
    { type: "newest", status: "unsupported", updatedAt: "2026-07-18T12:00:00Z" },
    { type: "a", status: "accepted" },
    { type: "b", status: "submitted" },
    { type: "c", status: "running" },
    { type: "d", status: "stalled" },
    { type: "e", status: "error" },
    { type: "f", status: "completed" },
  ];
  assert.deepEqual(stats(rows), {
    total: 7,
    running: 3,
    failed: 3,
    completed: 1,
    latest: "2026-07-18T12:00:00Z",
    latestStatus: "unsupported",
    latestType: "newest",
  });
});

test("overview operation surfaces use real counts and declare their runtime dependency", () => {
  const overviewStart = panel.indexOf("function renderOverviewOpsWorkbench(");
  const overviewEnd = panel.indexOf("function renderClusterRuntimeOverview(", overviewStart);
  const overview = panel.slice(overviewStart, overviewEnd);
  assert.match(overview, /const operationStats = overviewOperationStats\(state\);/);
  assert.match(overview, /failedOps: operationStats\.failed/);
  assert.match(panel, /overviewStatusCard\("操作进度", operationStats\.failed \? "error"/);
  assert.match(panel, /objectTile\("操作", "O", operationStats\.failed \? "error"/);
  assert.match(panel, /\["进行中", String\(operationStats\.running\)/);
  assert.match(panel, /\["失败", String\(operationStats\.failed\)/);
  assert.match(panel, /\["已完成", String\(operationStats\.completed\)/);
  assert.match(panel, /operationTypeLabel\(operationStats\.latestType/);
  assert.match(panel, /function operationTypeLabel\(type\)/);
  assert.match(panel, /operationIsFailureLike\(status\) \? "is-failed"/);
  assert.doesNotMatch(panel, /overviewStatusCard\("操作进度", "", "查看专区"/);
});
