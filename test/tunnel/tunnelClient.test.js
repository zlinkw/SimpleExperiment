const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

const { RequestBudget, defaultRequestBudgetConfig } = require("../../dist/tunnel/RequestBudget.js");
const { HttpTunnelClient } = require("../../dist/tunnel/TunnelClient.js");

test("tunnel client only talks to localhost API with token and coalesces snapshot", async () => {
  const calls = [];
  const server = http.createServer((req, res) => {
    calls.push({ url: req.url, token: req.headers["x-simple-agent-token"] });
    res.setHeader("Content-Type", "application/json");
    if (req.url === "/api/health") return res.end(JSON.stringify({ state: "agent_ok", agentVersion: "t", checkedAt: new Date().toISOString() }));
    if (req.url === "/api/snapshot") {
      setTimeout(() => res.end(JSON.stringify({ schemaVersion: 1, schedulerStates: [] })), 20);
      return;
    }
    if (req.url === "/api/actions/parse-results" && req.method === "POST") return res.end(JSON.stringify({ ok: true }));
    res.statusCode = 404;
    res.end("{}");
  });
  await listen(server);
  const port = server.address().port;
  const budget = new RequestBudget({ ...defaultRequestBudgetConfig, minIntervalByPurpose: {}, disabledPurposes: [] });
  const client = new HttpTunnelClient({ localHost: "127.0.0.1", localPort: port, token: "secret", timeoutMs: 1000 }, budget);
  try {
    const health = await client.getHealth({ userInitiated: true });
    assert.equal(health.state, "agent_ok");
    await Promise.all([client.getSnapshot(), client.getSnapshot()]);
    assert.equal(calls.filter((item) => item.url === "/api/snapshot").length, 1);
    assert.equal(calls.every((item) => item.token === "secret"), true);
    await assert.rejects(() => client.postAction("parse-results", {}), /opId/);
    assert.deepEqual(await client.postAction("parse-results", { opId: "op-1" }), { ok: true });
  } finally {
    server.close();
  }
});

test("tunnel client requires an endpoint host", () => {
  const budget = new RequestBudget(defaultRequestBudgetConfig);
  assert.throws(() => new HttpTunnelClient({ localHost: "", localPort: 18765 }, budget), /host is required/);
});

test("distributed result rebuild may finish beyond the short telemetry timeout", async () => {
  const server = http.createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    setTimeout(() => res.end(JSON.stringify({ status: "completed", outputPaths: ["simple_cluster/results/distributed_preview.json"] })), 60);
  });
  await listen(server);
  const budget = new RequestBudget({ ...defaultRequestBudgetConfig, minIntervalByPurpose: {}, disabledPurposes: [] });
  const client = new HttpTunnelClient({ localHost: "127.0.0.1", localPort: server.address().port,
    token: "secret", timeoutMs: 10 }, budget);
  try {
    const result = await client.postAction("rebuild-distributed-results", { opId: "rebuild-test" });
    assert.equal(result.status, "completed");
  } finally {
    server.close();
  }
});

function listen(server) {
  return new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
}
