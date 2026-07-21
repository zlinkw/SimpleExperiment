const test = require("node:test");
const assert = require("node:assert/strict");

const { RealtimeReconnect } = require("../../dist/tunnel/RealtimeReconnect.js");
const { defaultRealtimeRefreshPolicy } = require("../../dist/tunnel/RealtimeTunnelClient.js");

test("reconnect backoff uses bounded jitter", () => {
  const reconnect = new RealtimeReconnect(
    { reconnectInitialDelaySeconds: 4, reconnectMaxDelaySeconds: 60 },
    () => 1,
  );

  assert.equal(reconnect.nextDelayMs(), 5000);
  assert.equal(reconnect.nextDelayMs(), 10000);
  assert.equal(reconnect.nextDelayMs(), 20000);
});

test("reconnect jitter is positive and never shortens retry delay", () => {
  const reconnect = new RealtimeReconnect(
    { reconnectInitialDelaySeconds: 4, reconnectMaxDelaySeconds: 60 },
    () => 0,
  );

  assert.equal(reconnect.nextDelayMs(), 4000);
  assert.equal(reconnect.nextDelayMs(), 8000);
  assert.equal(reconnect.nextDelayMs(), 16000);
});

test("snapshot fallback minimum default is one minute", () => {
  assert.equal(defaultRealtimeRefreshPolicy.snapshotFallbackIntervalSeconds, 60);
});