const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");

test("webview state exposes realtime fields as first class fields", () => {
  const source = fs.readFileSync(path.join(root, "src", "extension.ts"), "utf8");
  for (const field of ["gpu", "schedulerStates", "experimentTraces", "logs", "operations", "fileTransfers"]) {
    assert.match(source, new RegExp(`\\b${field}\\b`), field);
  }
  assert.match(source, /const realtimeState: RealtimeState/);
  assert.match(source, /offlineSnapshot/);
  assert.match(source, /compactDiagnostics/);
  assert.match(source, /bulkOmitted/);
  assert.match(source, /实时大字段已在 state 顶层提供/);
  const diagnosticsBlock = source.match(/private compactDiagnostics[\s\S]*?private postState/)?.[0] || "";
  assert.doesNotMatch(diagnosticsBlock, /\bgpu,\s*\n/);
  assert.doesNotMatch(diagnosticsBlock, /\bschedulerStates,\s*\n/);
  assert.doesNotMatch(diagnosticsBlock, /\bexperimentTraces,\s*\n/);
  assert.doesNotMatch(diagnosticsBlock, /\bfileTransfers,\s*\n/);
  assert.doesNotMatch(source, /lastKnownGood\.fileTransfers/);
});

test("webview state sends compact lastKnownGood instead of duplicating bulk realtime fields", () => {
  const source = fs.readFileSync(path.join(root, "src", "extension.ts"), "utf8");
  const block = source.match(/private compactLastKnownGood[\s\S]*?private compactDiagnostics/)?.[0] || "";
  assert.match(block, /gpuServers/);
  assert.match(block, /schedulerRows/);
  assert.match(block, /experimentTraces/);
  assert.doesNotMatch(block, /\bgpu:\s*snapshot\.gpu/);
  assert.doesNotMatch(block, /\bschedulerStates:\s*snapshot\.schedulerStates/);
});

test("panel html has primary realtime sections", () => {
  const { renderPanelHtml } = require("../../dist/ui/PanelHtml.js");
  const html = renderPanelHtml();
  for (const text of ["GPU 状态", "任务运行状态", "实验记录", "操作进度", "文件传输队列", "实时日志", "能力状态", "诊断"]) {
    assert.match(html, new RegExp(text));
  }
  for (const id of ["gpuSummary", "gpuGrid", "taskSummary", "taskTable", "traceTable", "operationList", "transferTable", "logRunKeySelect", "liveLog"]) {
    assert.match(html, new RegExp(`id="${id}"`), id);
  }
});