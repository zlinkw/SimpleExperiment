const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

const { RequestBudget, defaultRequestBudgetConfig } = require("../../dist/tunnel/RequestBudget.js");
const { HttpTunnelClient } = require("../../dist/tunnel/TunnelClient.js");

test("results quality statistics paper and case analysis use Hub Agent API", async () => {
  const calls = [];
  const server = http.createServer((req, res) => {
    calls.push(req.url);
    res.setHeader("Content-Type", "application/json");
    if (req.url === "/api/results/summary") return res.end(JSON.stringify({ schemaVersion: 1, results: [] }));
    res.end(JSON.stringify({ schemaVersion: 1, opId: "op", accepted: true, operationId: "operation-op" }));
  });
  await listen(server);
  const client = new HttpTunnelClient({ localHost: "127.0.0.1", localPort: server.address().port, timeoutMs: 1000 }, new RequestBudget({ ...defaultRequestBudgetConfig, minIntervalByPurpose: {}, disabledPurposes: [] }));
  try {
    for (const action of [
      "parse-results",
      "rescan-results",
      "refresh-results",
      "run-quality-gate",
      "run-statistics",
      "export-paper-table",
      "check-output-contract",
      "parse-case-level",
      "run-leakage-check",
      "run-subgroup-analysis",
      "export-case-analysis",
    ]) {
      await client.postAction(action, { opId: `op-${action}` });
    }
    await client.getResultsSummary();
    assert.equal(calls.includes("/api/actions/parse-results"), true);
    assert.equal(calls.includes("/api/actions/run-quality-gate"), true);
    assert.equal(calls.includes("/api/actions/export-case-analysis"), true);
    assert.equal(calls.at(-1), "/api/results/summary");
  } finally {
    server.close();
  }
});

function listen(server) {
  return new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
}