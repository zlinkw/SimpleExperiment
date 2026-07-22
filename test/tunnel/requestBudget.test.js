const test = require("node:test");
const assert = require("node:assert/strict");

const { RequestBudget, RequestBudgetDeniedError, defaultRequestBudgetConfig } = require("../../dist/tunnel/RequestBudget.js");
const { defaultTunnelGatewayConfig, normalizeTunnelGatewayConfig, refreshProfiles, requestBudgetConfigFromTunnel } = require("../../dist/tunnel/TunnelGateway.js");

test("request budget enforces cooldown, pause, hidden, and per-minute limits", async () => {
  const budget = new RequestBudget({
    ...defaultRequestBudgetConfig,
    maxRequestsPerMinute: 2,
    minIntervalByPurpose: { health: 0, snapshot: 50, manual_refresh: 10 },
  });

  await budget.run("health", async () => "ok");
  budget.config.minIntervalByPurpose.health = 50;
  await assert.rejects(() => budget.run("health", async () => "blocked"), (error) => {
    assert.equal(error instanceof RequestBudgetDeniedError, true);
    assert.equal(error.decision.reason, "cooldown");
    return true;
  });
  budget.config.minIntervalByPurpose.health = 0;

  budget.setHidden(true);
  await assert.rejects(() => budget.run("snapshot", async () => "blocked"), /hidden/);

  budget.pauseAll();
  await assert.rejects(() => budget.run("snapshot", async () => "blocked", { userInitiated: true }), /paused/);
  await assert.doesNotReject(() => budget.run("health", async () => "ok", { userInitiated: true }));

  const snapshot = budget.snapshot();
  assert.equal(snapshot.paused, true);
  assert.ok(snapshot.deniedLastMinute >= 2);
});

test("events are enabled by default for realtime tunnel", async () => {
  const budget = new RequestBudget(defaultRequestBudgetConfig);
  assert.equal(await budget.run("events", async () => "ok"), "ok");
});

test("tunnel gateway defaults and realtime refresh policy match the current contract", () => {
  assert.equal(defaultRequestBudgetConfig.minIntervalByPurpose.health, 60_000);
  assert.equal(defaultRequestBudgetConfig.minIntervalByPurpose.snapshot, 60_000);
  assert.equal(defaultRequestBudgetConfig.minIntervalByPurpose.diagnostics, 60_000);
  assert.equal(defaultTunnelGatewayConfig.healthCheckIntervalSeconds, 30);
  assert.equal(defaultTunnelGatewayConfig.snapshotPollIntervalSeconds, 30);
  assert.equal(defaultTunnelGatewayConfig.maxRequestsPerMinute, 120);
  assert.equal(refreshProfiles.realtime.health, 5);
  assert.equal(refreshProfiles.realtime.snapshot, 30);
  assert.equal(refreshProfiles.balanced.health, 10);
  assert.equal(refreshProfiles.balanced.snapshot, 60);

  const normalized = normalizeTunnelGatewayConfig({ healthCheckIntervalSeconds: 5, snapshotPollIntervalSeconds: 30 });
  assert.equal(normalized.healthCheckIntervalSeconds, 5);
  assert.equal(normalized.snapshotPollIntervalSeconds, 30);

  const budgetConfig = requestBudgetConfigFromTunnel(normalized);
  assert.equal(budgetConfig.minIntervalByPurpose.health, 60_000);
  assert.equal(budgetConfig.minIntervalByPurpose.snapshot, 60_000);
});
