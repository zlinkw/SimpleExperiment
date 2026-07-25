const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const panelSource = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");

function extractFunction(name) {
  const start = panelSource.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing function ${name}`);
  const body = panelSource.indexOf("{", start);
  let depth = 0;
  for (let index = body; index < panelSource.length; index += 1) {
    if (panelSource[index] === "{") depth += 1;
    if (panelSource[index] === "}") depth -= 1;
    if (depth === 0) return panelSource.slice(start, index + 1);
  }
  throw new Error(`unterminated function ${name}`);
}

test("task section drops progress cards and dense meta grid", () => {
  assert.doesNotMatch(panelSource, /setHtmlIfChanged\("taskProgressCards", active\.length/);
  assert.doesNotMatch(panelSource, /勾选任务后可批量停止、重试、解析、归档或删除/);
  assert.doesNotMatch(panelSource, /已隐藏 ' \+ hiddenLegacyTaskUiKeys\.size \+ ' 条旧任务残留/);
  assert.doesNotMatch(panelSource, /taskMetaGrid/);
  assert.match(panelSource, /setHtmlIfChanged\("taskProgressCards", ""\)/);
  assert.match(panelSource, /titleBits/);
});

test("task workbench derives counts selections and render priority in one view model", () => {
  const sandbox = {
    TASK_RENDER_LIMIT: 80,
    taskStatusToken: (status) => String(status || ""),
    taskFailureLikeStatus: (status) => ["failed", "error", "stalled", "stopped", "cancelled", "canceled"].includes(String(status || "")),
    isTaskRowSelected: (row, selected) => selected.has(row.uiKey),
  };
  vm.createContext(sandbox);
  vm.runInContext(`${extractFunction("taskRowsViewModel")}\nthis.model = taskRowsViewModel;`, sandbox);
  const rows = Array.from({ length: 90 }, (_, index) => ({ uiKey: `done-${index}`, status: "completed" }))
    .concat([{ uiKey: "running", status: "running" }, { uiKey: "failed", status: "failed" }])
    .concat(Array.from({ length: 7 }, (_, index) => ({ uiKey: `queued-${index}`, status: "queued" })))
    .concat([{ uiKey: "selected", status: "completed" }]);
  const model = sandbox.model(rows, new Set(["selected"]));

  assert.equal(model.visibleRows.length, 80);
  assert.deepEqual(Array.from(model.visibleRows.slice(0, 3), (row) => row.uiKey), ["selected", "running", "failed"]);
  assert.deepEqual(Array.from(model.selectedRows, (row) => row.uiKey), ["selected"]);
  assert.deepEqual(Array.from(model.activeRows, (row) => row.uiKey), ["running"]);
  assert.equal(model.detailRow.uiKey, "selected");
  assert.deepEqual(JSON.parse(JSON.stringify(model.counts)), { queued: 7, running: 1, testing: 0, completed: 91, failed: 1, stopped: 0 });
  assert.doesNotMatch(extractFunction("taskRowsViewModel"), /allRows\.filter\(/);
  assert.ok([...panelSource.matchAll(/const taskView = taskRowsViewModel\(rows, selected\)/g)].length >= 2);
});
