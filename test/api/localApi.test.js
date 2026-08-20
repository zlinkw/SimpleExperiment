const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const { LocalApiServer, confirmationRequired, loopbackRequest, parseRemoteAddress } = require("../../dist/api/LocalApiServer.js");
const extensionSource = fs.readFileSync(path.join(root, "src/extension.ts"), "utf8");
const apiServerSource = fs.readFileSync(path.join(root, "src/api/LocalApiServer.ts"), "utf8");

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

async function startServer(methods = {}, options = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "simple-experiment-api-test-"));
  const port = await freePort();
  const server = new LocalApiServer({
    name: "SimpleExperiment Test",
    version: "0.3.0-test",
    preferredPort: port,
    discoveryPath: path.join(dir, "api.json"),
    methods,
    ...options,
  });
  const discovery = await server.start();
  return {
    root: dir,
    server,
    baseUrl: discovery.baseUrl,
    token: discovery.token,
    cleanup: async () => {
      await server.dispose();
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

function request(port, requestOptions, body) {
  return new Promise((resolve, reject) => {
    const options = { hostname: "127.0.0.1", port, ...requestOptions };
    const req = http.request(options, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve({ status: res.statusCode, text: Buffer.concat(chunks).toString("utf8") }));
    });
    req.on("error", reject);
    if (body !== undefined) req.write(body);
    req.end();
  });
}

function rpc(port, token, method, params = {}) {
  const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method, params });
  return request(port, {
    method: "POST",
    path: "/api/v1/rpc",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  }, body).then((response) => ({ status: response.status, body: JSON.parse(response.text) }));
}

test("SimpleExperiment local API rejects non-loopback peers", () => {
  assert.equal(parseRemoteAddress("::ffff:127.0.0.1"), "127.0.0.1");
  assert.equal(loopbackRequest({ socket: { remoteAddress: "127.0.0.1" } }), true);
  assert.equal(loopbackRequest({ socket: { remoteAddress: "::1" } }), true);
  assert.equal(loopbackRequest({ socket: { remoteAddress: "10.0.0.1" } }), false);
  assert.equal(loopbackRequest({ socket: { remoteAddress: "fe80::1" } }), false);
});

test("SimpleExperiment local API requires bearer auth and handles invalid RPC", async () => {
  const f = await startServer({ "status": async () => ({ ok: true }) });
  try {
    const health = await request(f.server.port, { method: "GET", path: "/api/v1/health" });
    assert.equal(health.status, 401);
    const unknown = await rpc(f.server.port, f.token, "unknown");
    assert.equal(unknown.body.error.code, -32601);
    const invalid = await request(f.server.port, {
      method: "POST",
      path: "/api/v1/rpc",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${f.token}` },
    }, JSON.stringify({ method: "status" }));
    assert.equal(invalid.status, 400);
    assert.equal(JSON.parse(invalid.text).error.code, -32600);
  } finally {
    await f.cleanup();
  }
});

test("SimpleExperiment local API exposes health, capabilities and OpenAPI", async () => {
  const f = await startServer({ "status": async () => ({ ok: true }), "plans.list": async () => ({ plans: [] }) });
  try {
    const health = await request(f.server.port, {
      method: "GET",
      path: "/api/v1/health",
      headers: { Authorization: `Bearer ${f.token}` },
    });
    assert.equal(health.status, 200);
    assert.equal(JSON.parse(health.text).version, "0.3.0-test");

    const capabilities = await request(f.server.port, {
      method: "GET",
      path: "/api/v1/capabilities",
      headers: { Authorization: `Bearer ${f.token}` },
    });
    assert.equal(JSON.parse(capabilities.text).confirmation.required, true);

    const openapi = await request(f.server.port, {
      method: "GET",
      path: "/api/v1/openapi.json",
      headers: { Authorization: `Bearer ${f.token}` },
    });
    const spec = JSON.parse(openapi.text);
    assert.equal(spec.openapi, "3.0.0");
    assert.ok(spec.paths["/api/v1/rpc"].post);
  } finally {
    await f.cleanup();
  }
});

test("CONFIRM_REQUIRED is returned as a JSON-RPC API error", async () => {
  const f = await startServer({
    "invoke": async () => {
      throw confirmationRequired({ operation: "runPlan", requires: ["confirm"] });
    },
  });
  try {
    const response = await rpc(f.server.port, f.token, "invoke", { command: "runPlan" });
    assert.equal(response.body.error.code, 2001);
    assert.equal(response.body.error.message, "CONFIRM_REQUIRED");
    assert.deepEqual(response.body.error.data.requires, ["confirm"]);
  } finally {
    await f.cleanup();
  }
});

test("SSE stream is bounded and terminates after the event cap", async () => {
  const f = await startServer({}, { maxEvents: 2, sseTimeoutMs: 500 });
  try {
    f.server.publish({ type: "one", data: 1 });
    f.server.publish({ type: "two", data: 2 });
    f.server.publish({ type: "three", data: 3 });
    const response = await new Promise((resolve, reject) => {
      const req = http.get({
        hostname: "127.0.0.1",
        port: f.server.port,
        path: "/api/v1/events",
        headers: { Authorization: `Bearer ${f.token}` },
      }, (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => resolve({ status: res.statusCode, text: Buffer.concat(chunks).toString("utf8") }));
      });
      req.on("error", reject);
    });
    assert.equal(response.status, 200);
    assert.equal((response.text.match(/^id: /gm) || []).length, 2);
  } finally {
    await f.cleanup();
  }
});

test("simple-experiment CLI reads the discovery file", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "simple-experiment-cli-test-"));
  try {
    const discoveryPath = path.join(dir, "api.json");
    fs.writeFileSync(discoveryPath, `${JSON.stringify({
      schemaVersion: 1,
      name: "SimpleExperiment",
      baseUrl: "http://127.0.0.1:19765",
      port: 19765,
      token: "test-token",
      pid: 123,
    })}\n`, "utf8");
    process.env.SIMPLE_EXPERIMENT_API_FILE = discoveryPath;
    const { readApiDiscovery } = require("../../dist/cli.js");
    const discovery = readApiDiscovery();
    assert.equal(discovery.port, 19765);
    assert.equal(discovery.token, "test-token");
  } finally {
    delete process.env.SIMPLE_EXPERIMENT_API_FILE;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("SimpleExperiment exposes the planned API methods and explicit confirmation gate", () => {
  const methods = [
    "status",
    "state",
    "actions.list",
    "plans.list",
    "results.list",
    "tasks.list",
    "operations.list",
    "gpu.list",
    "gpu.history",
    "live.output",
    "config.list",
    "config.get",
    "config.set",
    "config.reset",
    "state.list",
    "state.get",
    "state.set",
    "state.reset",
    "invoke",
  ];
  for (const method of methods) {
    const pattern = method.includes(".")
      ? new RegExp(`"${method.replace(/\./g, "\\.")}": async`)
      : new RegExp(`["']?${method}["']?\\s*:\\s*async`);
    assert.match(extensionSource, pattern, `missing API method ${method}`);
  }
  assert.match(extensionSource, /LOCAL_API_PREFERRED_PORT = 19765/);
  assert.match(extensionSource, /API_DISCOVERY_PATH = path\.join\(API_DISCOVERY_DIR, "api\.json"\)/);
  assert.match(extensionSource, /const API_CONFIRM_COMMANDS = new Set\(/);
  assert.match(extensionSource, /API_CONFIRM_COMMANDS\.has\(command\) && params\.confirm !== true/);
  assert.match(extensionSource, /throw confirmationRequired\(/);
  assert.match(extensionSource, /new LocalApiServerClass\(/);
  assert.match(extensionSource, /"config\.set": async \(params\) => this\.apiConfigSet\(params\)/);
  assert.match(extensionSource, /"state\.set": async \(params\) => this\.apiStateSet\(params\)/);
  assert.match(extensionSource, /validateApiConfigValue\(/);
  assert.match(extensionSource, /normalizeApiStateValue\(/);
  assert.doesNotMatch(apiServerSource, /\bscp\b|\brsync\b/);
});
