const test = require("node:test");
const assert = require("node:assert/strict");

const { enrichSchedulerRows } = require("../../dist/tunnel/AuthorityMergePolicy.js");

test("worker task telemetry enriches hub scheduler rows only", () => {
  const warnings = [];
  const rows = enrichSchedulerRows([{ runKey: "r1", status: "running", workerId: "w1" }], [{
    schemaVersion: 1,
    workerId: "w1",
    runKey: "r1",
    localStatus: "process_gone",
    lastSeenAt: "2026-01-01T00:00:00Z",
  }], warnings);
  assert.equal(rows[0].status, "running");
  assert.equal(rows[0].workerLiveStatus, "process_gone");
  assert.match(rows[0].workerTelemetryWarning, /does not detect/);
  assert.ok(warnings.some((item) => item.includes("r1")));
});