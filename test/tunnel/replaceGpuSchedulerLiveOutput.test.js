const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

const { RequestBudget, defaultRequestBudgetConfig } = require("../../dist/tunnel/RequestBudget.js");
const { HttpTunnelClient } = require("../../dist/tunnel/TunnelClient.js");

test("gpu scheduler traces and live output use Hub Agent APIs", async () => {
  const calls = [];
  const server = http.createServer((req, res) => {
    calls.push(req.url);
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ schemaVersion: 1 }));
  });
  await listen(server);
  const client = new HttpTunnelClient({ localHost: "127.0.0.1", localPort: server.address().port, timeoutMs: 1000 }, new RequestBudget({ ...defaultRequestBudgetConfig, minIntervalByPurpose: {}, disabledPurposes: [] }));
  try {
    await client.getGpu();
    await new Promise((resolve) => setTimeout(resolve, 1_100));
    await client.getGpuHistory({ serverId: "worker a", gpuId: "0/1", start: 100, end: 200, maxPoints: 5000 });
    await client.getScheduler();
    await client.getTraces();
    await client.getLiveOutput("work_dirs/run 1/train.log", 12);
    assert.deepEqual(calls, [
      "/api/gpu",
      "/api/gpu/history?serverId=worker+a&gpuId=0%2F1&start=100&end=200&maxPoints=864",
      "/api/scheduler",
      "/api/traces",
      "/api/live-output?runKey=work_dirs%2Frun+1%2Ftrain.log&since=12",
    ]);
  } finally {
    server.close();
  }
});

function listen(server) {
  return new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
}
