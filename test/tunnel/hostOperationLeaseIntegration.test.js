const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { readSource } = require("../_helpers/sourceReader");

const source = readSource("src/extension/legacy.ts");
const compiled = fs.readFileSync(path.join(__dirname, "../../dist/extension/legacy.js"), "utf8");

test("a native host action waits for an ordinary background queue write before opening its workflow", async () => {
  const vm = require("node:vm"), ts = require("typescript"), os = require("node:os");
  const legacyMethod = require("../_helpers/legacyMethod");
  const { ResourceOperationLeaseManager } = require("../../dist/core/ResourceOperationLease");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "host-queue-admission-"));
  let entered, release, conflict;
  const ready = new Promise(resolve => { entered = resolve; });
  const held = new Promise(resolve => { release = resolve; });
  const seen = new Promise(resolve => { conflict = resolve; });
  const manager = new ResourceOperationLeaseManager({ leasePath: path.join(root, "lease.json"), windowId: "same-window", heartbeatMs: 0,
    conflictError: () => { conflict(); return new Error("queue writer still owns its exact file"); } });
  const queue = manager.run({ pluginId: "test", workspaceUri: root, hostProjectPath: root, actionType: "queue-write",
    resources: [{ server: "local", project: root, target: path.join(root, "queue.json") }] }, async () => { entered(); await held; });
  await ready;
  const sandbox = { currentHostOperationLeaseContext: () => ({ workspaceUri: root, hostProjectPath: root }),
    HostOperationLease_1: { HostOperationLeaseConflictError: class extends Error {} },
    require: id => { assert.equal(id, "../updates/Bootstrap"); return { assertBusinessAllowed() {} }; }, console, path };
  vm.runInNewContext(ts.transpileModule("globalThis.action = {" + legacyMethod(source, "withHostOperationLease(actionType, actionLabel, operation, options = {})") + "};", {
    compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, sandbox);
  let ran = false;
  const result = sandbox.action.withHostOperationLease.call({ hostOperationLease: manager }, "configure-tunnel-ports", "配置隧道端口", async () => { ran = true; return "opened"; })
    .then(value => ({ value }), error => ({ error }));
  await seen;
  assert.equal(ran, false);
  release(); await queue;
  const outcome = await result;
  assert.equal(outcome.error, undefined);
  assert.equal(outcome.value, "opened");
});

test("SimpleExperiment routes UI side effects through the shared host lease", () => {
  assert.match(source, /require\("\.\.\/core\/HostOperationLease"\)/);
  assert.match(compiled, /require\("\.\.\/core\/HostOperationLease"\)/);
  assert.match(source, /this\.hostOperationLease\.run\(/);
  assert.match(source, /hostOperationLeaseActionForUiCommand\(command\)/);
  assert.match(source, /runActionCommandCore\(command, message\)/);
  for (const command of [
    "startAllConnections",
    "prepareAgents",
    "runPlan",
    "archiveArtifacts",
    "deleteArtifacts",
    "uploadProjectToHub",
    "deployLatestAgent",
    "downloadRemoteResult",
    "openResultArtifact",
  ]) {
    assert.match(source, new RegExp(`\\"${command}\\"`), command);
  }
});

test("read-only state commands are not included in the host side-effect set", () => {
  const start = source.indexOf("const hostOperationUiCommands = new Set([");
  const end = source.indexOf("]);", start);
  assert.ok(start >= 0 && end > start);
  const block = source.slice(start, end);
  for (const command of ["snapshot", "manualGpuSnapshot", "loadGpuHistory", "manualSchedulerSnapshot", "manualTracesSnapshot", "testAll"]) {
    assert.doesNotMatch(block, new RegExp(`\\"${command}\\"`), command);
  }
});

test("host operation labels reuse one frozen lookup table", () => {
  for (const text of [source, compiled]) {
    assert.match(text, /const HOST_OPERATION_LEASE_ACTION_LABELS = Object\.freeze\(\{/);
    assert.match(text, /quickSetup: "检查服务器配置"/);
    assert.match(text, /openResultArtifact: "打开或下载结果文件"/);
    const start = text.indexOf("function hostOperationLeaseActionLabel(command)");
    const end = text.indexOf("function commandNeedsUiStatus", start);
    assert.ok(start >= 0 && end > start);
    const block = text.slice(start, end);
    assert.match(block, /HOST_OPERATION_LEASE_ACTION_LABELS\[command\] \|\| command/);
    assert.doesNotMatch(block, /const labels =/);
  }
});
