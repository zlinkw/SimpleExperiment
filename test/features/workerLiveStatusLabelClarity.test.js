const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");

test("task timeline labels Worker live status without changing task status logic", () => {
  assert.match(panel, /const workerLiveStatus = rawWorkerLiveStatus \? labelStatus\(rawWorkerLiveStatus\) : "等待推送"/);
  assert.match(panel, /\["Worker 观测", workerLiveStatus, workerLiveDetail, row\.workerTelemetryWarning \? "warn" : "info"\]/);
  assert.match(panel, /Agent 原始状态：/);
  assert.match(panel, /taskCardClass\(row\.status\)/);
});

test("task progress card keeps raw Worker status in the tooltip", () => {
  assert.match(panel, /原始 Worker 状态：/);
  assert.match(panel, /Worker ' \+ esc\(labelStatus\(row\.workerLiveStatus\)\)/);
  assert.match(panel, /row\.workerTelemetryWarning \? '<div class="status-warning">'/);
});

test("Worker live status does not replace task terminal helpers", () => {
  assert.match(panel, /function taskTerminalStatus\(status\)/);
  assert.match(panel, /function taskFailureLikeStatus\(status\)/);
  assert.match(panel, /function taskArchivableStatus\(status\)/);
});
