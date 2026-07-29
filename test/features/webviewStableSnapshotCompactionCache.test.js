const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const extension = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");

function extractFunction(name) {
  const start = extension.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing ${name}`);
  const body = extension.indexOf("{", start);
  let depth = 0;
  for (let index = body; index < extension.length; index += 1) {
    if (extension[index] === "{") depth += 1;
    if (extension[index] === "}") depth -= 1;
    if (depth === 0) return extension.slice(start, index + 1);
  }
  throw new Error(`unterminated ${name}`);
}

function loadCompactors() {
  const sandbox = {
    xshellSetupForWebviewCache: new WeakMap(),
    probeForWebviewCache: new WeakMap(),
    workerProbesForWebviewCache: new WeakMap(),
    codeSyncForWebviewCache: new WeakMap(),
    healthForWebviewCache: new WeakMap(),
    workerSetupCalls: 0,
    probeNestedCalls: 0,
    workerProbeCalls: 0,
    sensitiveCalls: 0,
    dropUndefined(record) {
      return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
    },
    compactWorkerSetupForWebview(worker) {
      sandbox.workerSetupCalls += 1;
      return { id: worker.id, enabled: worker.enabled };
    },
    compactSchedulerDependenciesForWebview(value) {
      sandbox.probeNestedCalls += 1;
      return value;
    },
    compactCapabilitiesForWebview(value) {
      sandbox.probeNestedCalls += 1;
      return value;
    },
    compactFileCapabilitiesForWebview(value) {
      sandbox.probeNestedCalls += 1;
      return value;
    },
    compactStringArrayForWebview(value, limit) {
      sandbox.probeNestedCalls += 1;
      return Array.isArray(value) ? value.slice(0, limit) : undefined;
    },
    compactSensitiveText(value, limit) {
      sandbox.sensitiveCalls += 1;
      return String(value || "").slice(0, limit);
    },
    compactWorkerProbeForWebview(probe) {
      sandbox.workerProbeCalls += 1;
      return { status: probe.status };
    },
    objectRecord(value) {
      return value && typeof value === "object" && !Array.isArray(value) ? value : undefined;
    },
    firstStringFieldForWebview(item, ...keys) {
      for (const key of keys) {
        if (typeof item[key] === "string" && item[key].trim()) return item[key].trim();
      }
      return undefined;
    },
    firstNumberFieldForWebview(item, ...keys) {
      for (const key of keys) {
        const value = Number(item[key]);
        if (Number.isFinite(value) && item[key] !== "") return value;
      }
      return undefined;
    },
  };
  vm.createContext(sandbox);
  vm.runInContext([
    extractFunction("compactXshellSetupForWebview"),
    extractFunction("compactProbeForWebview"),
    extractFunction("compactWorkerProbesForWebview"),
    extractFunction("compactCodeSyncForWebview"),
    extractFunction("splitSyncFailures"),
    extractFunction("compactHealthForWebview"),
    "this.compactSetup = compactXshellSetupForWebview;",
    "this.compactProbe = compactProbeForWebview;",
    "this.compactWorkerProbes = compactWorkerProbesForWebview;",
    "this.compactCodeSync = compactCodeSyncForWebview;",
    "this.compactHealth = compactHealthForWebview;",
  ].join("\n"), sandbox);
  return sandbox;
}

test("stable setup and probe snapshots reuse compacted Webview objects", () => {
  const sandbox = loadCompactors();
  const setup = { hubHost: "hub", workerTunnels: [{ id: "a", enabled: true }] };
  const probe = {
    status: "ok",
    schedulerDependencies: { ok: true },
    capabilities: { apiVersion: 1 },
    fileCapabilities: { supportsList: true },
    missingCapabilities: ["x"],
    message: "ready",
  };
  const compactedSetup = sandbox.compactSetup(setup);
  const compactedProbe = sandbox.compactProbe(probe);
  const calls = { workers: sandbox.workerSetupCalls, nested: sandbox.probeNestedCalls, sensitive: sandbox.sensitiveCalls };

  assert.strictEqual(sandbox.compactSetup(setup), compactedSetup);
  assert.strictEqual(sandbox.compactProbe(probe), compactedProbe);
  assert.deepEqual({ workers: sandbox.workerSetupCalls, nested: sandbox.probeNestedCalls, sensitive: sandbox.sensitiveCalls }, calls);
  assert.notStrictEqual(sandbox.compactSetup({ ...setup, workerTunnels: [...setup.workerTunnels] }), compactedSetup);
  assert.notStrictEqual(sandbox.compactProbe({ ...probe }), compactedProbe);
});

test("Worker probe snapshots cache as a group and invalidate on replacement", () => {
  const sandbox = loadCompactors();
  const probes = { a: { status: "ok" }, b: { status: "paused" } };
  const first = sandbox.compactWorkerProbes(probes);
  const calls = sandbox.workerProbeCalls;

  assert.strictEqual(sandbox.compactWorkerProbes(probes), first);
  assert.equal(sandbox.workerProbeCalls, calls);
  const second = sandbox.compactWorkerProbes({ ...probes });
  assert.notStrictEqual(second, first);
  assert.equal(sandbox.workerProbeCalls, calls + 2);
});

test("health and code sync snapshots retain defaults and refresh on replacement", () => {
  const sandbox = loadCompactors();
  const health = { status: "ok", checkedAt: "2026-07-30T00:00:00Z", message: "healthy" };
  const codeSync = { fingerprint: "abc", error: "one; two; three; four" };
  const compactedHealth = sandbox.compactHealth(health);
  const compactedCodeSync = sandbox.compactCodeSync(codeSync);

  assert.strictEqual(sandbox.compactHealth(health), compactedHealth);
  assert.strictEqual(sandbox.compactCodeSync(codeSync), compactedCodeSync);
  assert.equal(compactedHealth.state, "ok");
  assert.equal(compactedCodeSync.failureCount, 4);
  assert.equal(compactedCodeSync.error, "one；two；three");
  assert.notStrictEqual(sandbox.compactHealth({ ...health }), compactedHealth);
  assert.notStrictEqual(sandbox.compactCodeSync({ ...codeSync }), compactedCodeSync);
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.compactHealth(undefined))), { state: "unknown", checkedAt: "" });
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.compactCodeSync(undefined))), {});
  assert.equal(sandbox.compactProbe(undefined), undefined);
});
