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

test("job dispatch queues behind transport use without consuming the polling quota", async () => {
  const budget = new RequestBudget({ ...defaultRequestBudgetConfig, maxRequestsPerMinute: 1,
    maxConcurrentRequests: 1, minIntervalByPurpose: { run_plan: 60_000 } });
  await budget.run("run_plan", async () => "validated");
  budget.setHidden(true);
  let release;
  const first = budget.run("job_dispatch", () => new Promise((resolve) => { release = resolve; }));
  const order = [];
  const second = budget.run("job_dispatch", async () => { order.push("second"); return "ok"; });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(order, []);
  release("first");
  assert.equal(await first, "first");
  assert.equal(await second, "ok");
  assert.deepEqual(order, ["second"]);
  assert.equal(budget.snapshot().requestsLastMinute, 1);
  budget.pauseAll();
  await assert.rejects(() => budget.run("job_dispatch", async () => "blocked"), /paused/);
});

test("worker task reconciliation still reads Agent tasks when the polling quota is exhausted", async () => {
  const http = require("node:http");
  const { HttpTunnelClient } = require("../../dist/tunnel/TunnelClient.js");
  const server = http.createServer((request, response) => {
    assert.equal(request.url, "/api/worker/tasks");
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ schemaVersion: 1, tasks: [{ commandId: "existing-job", status: "running" }] }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const budget = new RequestBudget({ ...defaultRequestBudgetConfig, maxRequestsPerMinute: 1,
      maxConcurrentRequests: 1, minIntervalByPurpose: {} });
    await budget.run("health", async () => "ok");
    budget.setHidden(true);
    const client = new HttpTunnelClient({ localHost: "127.0.0.1", localPort: server.address().port }, budget);
    const snapshot = await client.getWorkerTasks();
    assert.deepEqual(snapshot.tasks.map((task) => task.commandId), ["existing-job"]);
    assert.equal(budget.snapshot().requestsLastMinute, 1);
    budget.pauseAll();
    await assert.rejects(() => client.getWorkerTasks(), /paused/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("request budget rolling counters expire allowed and denied events together", async () => {
  const realNow = Date.now;
  let now = Date.parse("2026-07-26T00:00:00.000Z");
  Date.now = () => now;
  try {
    const budget = new RequestBudget({
      ...defaultRequestBudgetConfig,
      maxRequestsPerMinute: 10,
      minIntervalByPurpose: {},
    });
    await budget.run("health", async () => "ok");
    budget.setHidden(true);
    assert.equal(budget.decide("snapshot").allowed, false);
    assert.deepEqual(
      (({ requestsLastMinute, deniedLastMinute, lastAllowedAt }) => ({ requestsLastMinute, deniedLastMinute, lastAllowedAt }))(budget.snapshot()),
      { requestsLastMinute: 1, deniedLastMinute: 1, lastAllowedAt: "2026-07-26T00:00:00.000Z" },
    );

    now += 60_001;
    assert.deepEqual(
      (({ requestsLastMinute, deniedLastMinute, lastAllowedAt }) => ({ requestsLastMinute, deniedLastMinute, lastAllowedAt }))(budget.snapshot()),
      { requestsLastMinute: 0, deniedLastMinute: 0, lastAllowedAt: undefined },
    );
  } finally {
    Date.now = realNow;
  }
});

test("request budget avoids rescanning or shifting the rolling event window", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const source = fs.readFileSync(path.join(__dirname, "../../src/tunnel/RequestBudget.ts"), "utf8");
  assert.match(source, /private eventStart = 0/);
  assert.match(source, /private allowedEventCount = 0/);
  assert.match(source, /private deniedEventCount = 0/);
  assert.doesNotMatch(source, /this\.events\.shift\(\)|this\.events\.filter\(|\[\.\.\.this\.events\]\.reverse\(\)/);
});

test("tunnel gateway defaults and realtime refresh policy match the current contract", () => {
  assert.equal(defaultRequestBudgetConfig.minIntervalByPurpose.health, 60_000);
  assert.equal(defaultRequestBudgetConfig.minIntervalByPurpose.snapshot, 60_000);
  assert.equal(defaultRequestBudgetConfig.minIntervalByPurpose.diagnostics, 60_000);
  assert.equal(defaultRequestBudgetConfig.minIntervalByPurpose.gpu_history, 1_000);
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
