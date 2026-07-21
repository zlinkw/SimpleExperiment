const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

const { RequestBudget, defaultRequestBudgetConfig } = require("../../dist/tunnel/RequestBudget.js");
const { HttpTunnelClient } = require("../../dist/tunnel/TunnelClient.js");

test("tunnel client only talks to localhost API with token and coalesces snapshot", async () => {
  const calls = [];
  const server = http.createServer((req, res) => {
    calls.push({ url: req.url, token: req.headers["x-zlk-agent-token"] });
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

test("tunnel client rejects non-local endpoints", () => {
  const budget = new RequestBudget(defaultRequestBudgetConfig);
  assert.throws(() => new HttpTunnelClient({ localHost: "0.0.0.0", localPort: 18765 }, budget), /127\.0\.0\.1/);
});

function listen(server) {
  return new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
}
