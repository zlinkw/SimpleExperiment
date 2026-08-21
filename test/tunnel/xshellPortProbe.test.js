const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

const { probeLocalTunnel, probeWorkerTelemetryTunnel } = require("../../dist/tunnel/XshellTunnelPortProbe.js");

test("xshell port probe detects ok health capabilities and file api", async () => {
  const schedulerDependencies = { ok: false, missingModules: [{ module: "yaml", package: "PyYAML" }], installCommand: "python -m pip install PyYAML" };
  const server = http.createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    if (req.url === "/api/health") return res.end(JSON.stringify({ schemaVersion: 1, agentVersion: "0.2.0", apiVersion: "1", mode: "realtime", startedAt: "x", serverTime: "x", uptimeSeconds: 1, projectRoot: "p", schedulerDependencies, status: "ok" }));
    if (req.url === "/api/capabilities") return res.end(JSON.stringify({ schemaVersion: 1, apiVersion: "1", agentVersion: "0.2.0", endpoints: { health: true, snapshot: true, websocketEvents: true, sseEvents: true, logsTail: true, fileList: true, fileDownload: true, fileRangeDownload: true, fileUploadChunk: true, fileTransferStatus: true, actions: true }, limits: { maxUploadChunkBytes: 1024, maxConcurrentTransfers: 1 }, auth: { required: false, scheme: "none" } }));
    if (req.url === "/api/files/capabilities") return res.end(JSON.stringify({ schemaVersion: 1, rootPolicy: "project_root_only", supportsList: true, supportsStat: true, supportsDownload: true, supportsRangeDownload: true, supportsUploadChunk: true, supportsSha256: true, supportsResume: true, maxUploadChunkBytes: 1024, safeRoots: ["simple_cluster"] }));
    res.statusCode = 404;
    res.end("{}");
  });
  await listen(server);
  try {
    const result = await probeLocalTunnel({ localForwardPort: server.address().port, remoteAgentPort: 18765, realtimeEnabled: true, fileTransferEnabled: true });
    assert.equal(result.status, "ok");
    assert.equal(result.healthOk, true);
    assert.equal(result.fileApiOk, true);
    assert.equal(result.projectRoot, "p");
    assert.deepEqual(result.schedulerDependencies, schedulerDependencies);
  } finally {
    server.close();
  }
});

test("xshell port probe reports local port closed", async () => {
  const result = await probeLocalTunnel({ localForwardPort: 9, remoteAgentPort: 18765, realtimeEnabled: true, fileTransferEnabled: true }, { timeoutMs: 200 });
  assert.equal(result.status, "local_port_closed");
  assert.match(result.message, /未打开|closed/);
});

test("worker telemetry port probe accepts read-only worker api", async () => {
  const schedulerDependencies = { ok: true, missingModules: [] };
  const server = http.createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    if (req.url === "/api/health") return res.end(JSON.stringify({ schemaVersion: 1, agentVersion: "0.2.0", apiVersion: "1", mode: "worker_telemetry", startedAt: "x", serverTime: "x", uptimeSeconds: 1, projectRoot: "p", schedulerDependencies, status: "ok" }));
    if (req.url === "/api/capabilities") return res.end(JSON.stringify({
      schemaVersion: 1,
      apiVersion: "1",
      agentVersion: "0.2.0",
      mode: "worker_telemetry",
      endpoints: { health: true, capabilities: true, gpu: true, workerTasks: true, liveOutput: true, diagnostics: true, websocketEvents: false, sseEvents: true, actions: false, fileList: false, fileDownload: false, fileUploadChunk: false },
    }));
    res.statusCode = 404;
    res.end("{}");
  });
  await listen(server);
  try {
    const result = await probeWorkerTelemetryTunnel({ localForwardPort: server.address().port, remoteAgentPort: 18765 }, { timeoutMs: 500 });
    assert.equal(result.status, "ok");
    assert.equal(result.capabilitiesOk, true);
    assert.equal(result.gpuApiOk, true);
    assert.equal(result.workerTasksApiOk, true);
    assert.equal(result.projectRoot, "p");
    assert.deepEqual(result.schedulerDependencies, schedulerDependencies);
  } finally {
    server.close();
  }
});

test("worker telemetry port probe explains stale hub-mode agent", async () => {
  const server = http.createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    if (req.url === "/api/health") return res.end(JSON.stringify({ schemaVersion: 1, agentVersion: "0.2.0", apiVersion: "1", mode: "realtime", startedAt: "x", serverTime: "x", uptimeSeconds: 1, projectRoot: "p", status: "ok" }));
    if (req.url === "/api/capabilities") return res.end(JSON.stringify({
      schemaVersion: 1,
      apiVersion: "1",
      agentVersion: "0.2.0",
      mode: "hub_control",
      endpoints: { health: true, snapshot: true, websocketEvents: false, sseEvents: true, logsTail: true, fileList: true, fileDownload: true, fileRangeDownload: true, fileUploadChunk: true, fileTransferStatus: true, actions: true },
      limits: { maxUploadChunkBytes: 1024, maxConcurrentTransfers: 1 },
      auth: { required: false, scheme: "none" },
    }));
    res.statusCode = 404;
    res.end("{}");
  });
  await listen(server);
  try {
    const result = await probeWorkerTelemetryTunnel({ localForwardPort: server.address().port, remoteAgentPort: 18765 }, { timeoutMs: 500 });
    assert.equal(result.status, "worker_api_invalid");
    assert.match(result.suggestion, /hub_control Agent/);
    assert.match(result.suggestion, /重新写入 Agent 自动启动命令/);
  } finally {
    server.close();
  }
});

function listen(server) { return new Promise((resolve) => server.listen(0, "127.0.0.1", resolve)); }
