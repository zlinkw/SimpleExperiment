const test = require("node:test");
const assert = require("node:assert/strict");

const { detectStaticTunnelPortConflicts } = require("../../dist/tunnel/TunnelPortAllocator.js");

test("static port conflict detector reports duplicate reserved and outside range", () => {
  const conflicts = detectStaticTunnelPortConflicts([
    { endpointId: "hub", role: "hub_control", localForwardHost: "127.0.0.1", localForwardPort: 18765, remoteBindHost: "127.0.0.1", remoteServicePort: 18765, remoteHostLabel: "hub", assignedAt: "t", source: "manual" },
    { endpointId: "w1", role: "worker_telemetry", localForwardHost: "127.0.0.1", localForwardPort: 18765, remoteBindHost: "127.0.0.1", remoteServicePort: 18765, remoteHostLabel: "w1", assignedAt: "t", source: "manual" },
    { endpointId: "w2", role: "worker_telemetry", localForwardHost: "127.0.0.1", localForwardPort: 19000, remoteBindHost: "127.0.0.1", remoteServicePort: 18765, remoteHostLabel: "w2", assignedAt: "t", source: "manual" },
  ], { start: 18766, end: 18999 });
  assert.ok(conflicts.some((item) => item.conflictType === "duplicate_in_config"));
  assert.ok(conflicts.some((item) => item.conflictType === "reserved_for_hub"));
  assert.ok(conflicts.some((item) => item.conflictType === "outside_allowed_range"));
});