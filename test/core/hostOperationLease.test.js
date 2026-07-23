const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  HOST_OPERATION_LEASE_SCHEMA_VERSION,
  HostOperationLeaseConflictError,
  HostOperationLeaseManager,
  defaultHostOperationLeasePath,
  parseHostOperationLeaseRecord,
} = require("../../dist/core/HostOperationLease.js");

function leaseFixture(options = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "simple-host-lease-"));
  const leasePath = path.join(root, "host-operation-lease.json");
  const managers = [];
  const manager = (windowId, extra = {}) => {
    const value = new HostOperationLeaseManager({ leasePath, windowId, ttlMs: 160, heartbeatMs: 30, ...extra });
    managers.push(value);
    return value;
  };
  const input = (pluginId = "simple-local.simple-experiment", actionType = "run-plan") => ({
    pluginId,
    workspaceUri: "vscode-remote://dev-container/workspaces/MCP/demo",
    hostProjectPath: "D:\\GitRepo\\MCP\\demo",
    actionType,
    actionLabel: actionType,
  });
  return { root, leasePath, managers, manager, input, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}

test("shared lease path and schema are stable across both plugins", () => {
  assert.equal(HOST_OPERATION_LEASE_SCHEMA_VERSION, 1);
  assert.equal(defaultHostOperationLeasePath("C:\\Users\\demo\\AppData\\Local"), "C:\\Users\\demo\\AppData\\Local\\SimpleExperiment\\host-operation-lease.json");
});

test("exclusive creation allows one window and blocks the second with recovery details", async () => {
  const fixture = leaseFixture();
  try {
    const first = fixture.manager("window-a");
    const second = fixture.manager("window-b");
    const [a, b] = await Promise.allSettled([
      first.acquire(fixture.input()),
      second.acquire(fixture.input("simple-local.simple-sftp", "upload-workspace")),
    ]);
    const fulfilled = [a, b].filter((item) => item.status === "fulfilled");
    const rejected = [a, b].filter((item) => item.status === "rejected");
    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    assert.ok(rejected[0].reason instanceof HostOperationLeaseConflictError);
    assert.match(rejected[0].reason.message, /持有窗口：window-[ab]/);
    assert.match(rejected[0].reason.message, /自动恢复/);
    await fulfilled[0].value.release();
  } finally {
    fixture.cleanup();
  }
});

test("heartbeat renews a long operation and prevents premature takeover", async () => {
  const fixture = leaseFixture();
  try {
    const holder = await fixture.manager("window-a", { ttlMs: 120, heartbeatMs: 20 }).acquire(fixture.input());
    await new Promise((resolve) => setTimeout(resolve, 190));
    const record = parseHostOperationLeaseRecord(fs.readFileSync(fixture.leasePath, "utf8"));
    assert.ok(Date.parse(record.expiresAt) > Date.now());
    await assert.rejects(
      fixture.manager("window-b", { ttlMs: 120, heartbeatMs: 20 }).acquire(fixture.input("simple-local.simple-sftp", "upload-workspace")),
      HostOperationLeaseConflictError
    );
    await holder.release();
  } finally {
    fixture.cleanup();
  }
});

test("heartbeat renewal never exposes partial lease JSON", async () => {
  const fixture = leaseFixture();
  try {
    const holder = await fixture.manager("window-a", { ttlMs: 120, heartbeatMs: 5 }).acquire(fixture.input());
    for (let index = 0; index < 40; index += 1) {
      const record = parseHostOperationLeaseRecord(fs.readFileSync(fixture.leasePath, "utf8"));
      assert.ok(record, `invalid lease record at iteration ${index}`);
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    await holder.release();
  } finally {
    fixture.cleanup();
  }
});

test("expired lease supports crash recovery without force-removing an active lease", async () => {
  const fixture = leaseFixture();
  try {
    await fixture.manager("crashed-window", { ttlMs: 100, heartbeatMs: 0 }).acquire(fixture.input());
    await new Promise((resolve) => setTimeout(resolve, 130));
    const replacement = await fixture.manager("replacement-window", { ttlMs: 120, heartbeatMs: 20 }).acquire(fixture.input("simple-local.simple-sftp", "sync-from-remote"));
    assert.equal(replacement.record.windowId, "replacement-window");
    assert.equal(replacement.record.pluginId, "simple-local.simple-sftp");
    await replacement.release();
  } finally {
    fixture.cleanup();
  }
});

test("both plugins reenter the same window lease and release only after the final holder", async () => {
  const fixture = leaseFixture();
  try {
    const experiment = fixture.manager("shared-window");
    const sftp = fixture.manager("shared-window");
    const outer = await experiment.acquire(fixture.input());
    const inner = await sftp.acquire(fixture.input("simple-local.simple-sftp", "upload-workspace"));
    assert.equal(inner.record.leaseId, outer.record.leaseId);
    await outer.release();
    await assert.rejects(fixture.manager("other-window").acquire(fixture.input()), HostOperationLeaseConflictError);
    await inner.release();
    const next = await fixture.manager("other-window").acquire(fixture.input());
    await next.release();
  } finally {
    fixture.cleanup();
  }
});

test("release cannot expire a lease that has been replaced by another owner", async () => {
  const fixture = leaseFixture();
  try {
    const stale = await fixture.manager("window-a", { ttlMs: 100, heartbeatMs: 0 }).acquire(fixture.input());
    await new Promise((resolve) => setTimeout(resolve, 130));
    const current = await fixture.manager("window-b").acquire(fixture.input("simple-local.simple-sftp", "upload-files"));
    await stale.release();
    const record = parseHostOperationLeaseRecord(fs.readFileSync(fixture.leasePath, "utf8"));
    assert.equal(record.leaseId, current.record.leaseId);
    assert.ok(Date.parse(record.expiresAt) > Date.now());
    await current.release();
  } finally {
    fixture.cleanup();
  }
});
