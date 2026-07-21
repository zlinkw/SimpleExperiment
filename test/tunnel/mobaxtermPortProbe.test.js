const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

const { probeLocalTunnel, probeWorkerTelemetryTunnel } = require("../../dist/tunnel/MobaXtermPortProbe.js");

test("mobaxterm port probe detects ok health capabilities and file api", async () => {
  const server = http.createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    if (req.url === "/api/health") return res.end(JSON.stringify({ schemaVersion: 1, agentVersion: "0.2.0", apiVersion: "1", mode: "realtime", startedAt: "x", serverTime: "x", uptimeSeconds: 1, projectRoot: "p", status: "ok" }));
    if (req.url === "/api/capabilities") return res.end(JSON.stringify({ schemaVersion: 1, apiVersion: "1", agentVersion: "0.2.0", endpoints: { health: true, snapshot: true, websocketEvents: true, sseEvents: true, logsTail: true, fileList: true, fileDownload: true, fileRangeDownload: true, fileUploadChunk: true, fileTransferStatus: true, actions: true }, limits: { maxUploadChunkBytes: 1024, maxConcurrentTransfers: 1 }, auth: { required: false, scheme: "none" } }));
    if (req.url === "/api/files/capabilities") return res.end(JSON.stringify({ schemaVersion: 1, rootPolicy: "project_root_only", supportsList: true, supportsStat: true, supportsDownload: true, supportsRangeDownload: true, supportsUploadChunk: true, supportsSha256: true, supportsResume: true, maxUploadChunkBytes: 1024, safeRoots: ["zlk_cluster"] }));
    res.statusCode = 404;
    res.end("{}");
  });
  await listen(server);
  try {
    const result = await probeLocalTunnel({ localForwardPort: server.address().port, remoteAgentPort: 18765, realtimeEnabled: true, fileTransferEnabled: true });
    assert.equal(result.status, "ok");
    assert.equal(result.healthOk, true);
    assert.equal(result.fileApiOk, true);
  } finally {
    server.close();
  }
});

test("mobaxterm port probe reports local port closed", async () => {
  const result = await probeLocalTunnel({ localForwardPort: 9, remoteAgentPort: 18765, realtimeEnabled: true, fileTransferEnabled: true }, { timeoutMs: 200 });
  assert.equal(result.status, "local_port_closed");
  assert.match(result.message, /未打开|closed/);
});

function listen(server) { return new Promise((resolve) => server.listen(0, "127.0.0.1", resolve)); }