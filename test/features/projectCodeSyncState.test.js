const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadHelpers() {
  const source = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");
  const start = source.indexOf("const PROJECT_CODE_SYNC_PATH");
  const end = source.indexOf("function compactLocalPlansForWebview");
  assert.ok(start > 0 && end > start, "code sync helpers missing");
  const slice = source.slice(start, end);
  const sandbox = {
    fs: {
      readFile: fs.promises.readFile,
      writeFile: fs.promises.writeFile,
      mkdir: fs.promises.mkdir,
      unlink: fs.promises.unlink,
    },
    path,
    console,
  };
  vm.createContext(sandbox);
  vm.runInContext(
    slice +
      "\nthis.exports = { PROJECT_CODE_SYNC_PATH, readProjectCodeSyncState, writeProjectCodeSyncState, normalizeCodeSyncState };",
    sandbox
  );
  return sandbox.exports;
}

function loadSyncRoleStatus() {
  const source = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");
  const start = source.indexOf("const NON_SUCCESSFUL_SYNC_STATUSES");
  const end = source.indexOf("function persistedTunnelGatewayConfig", start);
  assert.ok(start > 0 && end > start, "sync role status helper missing");
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(source.slice(start, end) + "\nthis.exports = { syncRoleStatus };", sandbox);
  return sandbox.exports.syncRoleStatus;
}

test("project code sync state persists under zlk_cluster/ui", async () => {
  const helpers = loadHelpers();
  assert.equal(helpers.PROJECT_CODE_SYNC_PATH, "zlk_cluster/ui/code_sync.json");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "zlk-code-sync-"));
  await helpers.writeProjectCodeSyncState(root, {
    fingerprint: "abc123",
    scope: "plan-check",
    hub: "已同步",
    workers: "已同步 2 台",
    updatedAt: "2026-01-01T00:00:00.000Z",
  });
  const file = path.join(root, "zlk_cluster", "ui", "code_sync.json");
  assert.equal(fs.existsSync(file), true);
  const payload = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.equal(payload.schemaVersion, 1);
  assert.equal(payload.codeSync.fingerprint, "abc123");
  assert.equal(payload.codeSync.scope, "plan-check");
  const loaded = await helpers.readProjectCodeSyncState(root);
  assert.equal(loaded.fingerprint, "abc123");
  assert.equal(loaded.hub, "已同步");
  assert.equal(loaded.workers, "已同步 2 台");
  await helpers.writeProjectCodeSyncState(root, {});
  assert.equal(fs.existsSync(file), false);
});

test("project code sync normalize keeps error and drops empty rows", () => {
  const helpers = loadHelpers();
  assert.equal(helpers.normalizeCodeSyncState(undefined), undefined);
  assert.equal(helpers.normalizeCodeSyncState({}), undefined);
  const normalized = helpers.normalizeCodeSyncState({
    fingerprint: "fp1",
    error: "hub: timeout",
    message: "ignored",
  });
  assert.equal(normalized.fingerprint, "fp1");
  assert.equal(normalized.error, "hub: timeout");
  assert.ok(normalized.updatedAt);
});

test("extension wires project code sync load/persist helpers", () => {
  const source = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");
  assert.match(source, /zlk_cluster\/ui\/code_sync\.json/);
  assert.match(source, /loadProjectCodeSyncState/);
  assert.match(source, /persistProjectCodeSyncState/);
  assert.match(source, /this\.lastCodeSyncState = \{[\s\S]*persistProjectCodeSyncState/);
  assert.match(source, /loadProjectDebugBundleState\(\)\.catch\(\(\) => undefined\),\s*this\.loadProjectCodeSyncState\(\)\.catch\(\(\) => undefined\),/);
});

test("separate Hub and Worker uploads preserve same-fingerprint success", () => {
  const syncRoleStatus = loadSyncRoleStatus();
  const afterHub = syncRoleStatus([{ role: "hub" }], {}, "fp1");
  assert.equal(afterHub.hubSuccess, "已同步");
  assert.equal(afterHub.workersSuccess, "待同步");

  const afterWorkers = syncRoleStatus(
    [{ role: "worker" }, { role: "worker" }],
    { fingerprint: "fp1", hub: afterHub.hubSuccess, workers: afterHub.workersSuccess },
    "fp1"
  );
  assert.equal(afterWorkers.hubSuccess, "已同步");
  assert.equal(afterWorkers.workersSuccess, "已同步 2 台");
});

test("separate upload does not preserve stale status after fingerprint changes", () => {
  const syncRoleStatus = loadSyncRoleStatus();
  const status = syncRoleStatus(
    [{ role: "worker" }],
    { fingerprint: "old", hub: "已同步", workers: "已同步 1 台" },
    "new"
  );
  assert.equal(status.hubSuccess, "待同步");
  assert.equal(status.workersSuccess, "已同步 1 台");
});
