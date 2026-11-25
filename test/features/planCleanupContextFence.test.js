"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
require("../_helpers/registerTsRequire");
const { PlanCleanup } = require("../../src/features/PlanCleanup.ts");
const { confirmEmptyParents } = require("../../src/features/IsolationEmptyParents.ts");
const { reviewEmptyIsolationParents } = require("../../src/extension/PlanCleanupEmptyParents.ts");

function fixture() {
  let current = true, flipBeforeSend = false, flipAfterSend = false, loseResponse = false;
  const calls = [], saved = [];
  const row = { id: "row", node: { id: "worker" }, type: "directory", category: "output",
    disposition: "isolate", backendToken: "token", backendDigest: "digest", backendIndex: 0 };
  const operation = { id: "operation", state: "pending", preview: { action: "isolate", confirmations: 1,
    scope: { observationMode: "managed_tmux" }, rows: [row] }, targets: { row: { state: "pending" } } };
  const service = new PlanCleanup({ storageRoot: "unused", sftp: async (method, params, guard) => {
    guard?.(); calls.push({ method, params });
    if (flipAfterSend) current = false;
    if (loseResponse) throw Error("response lost");
    return { receipt: { marker: "accepted" } };
  }, updateIndexes: async () => {} });
  service.preflightConfirmed = async () => {};
  service.managedCheck = async () => ({ state: calls.length ? "completed" : "pending" });
  service.captureIsolationReceipt = (target, response) => { if (response.receipt) target.isolationReceipt = response.receipt; return true; };
  service.observeManaged = async value => { value.state = "completed"; return value; };
  service.save = async value => { saved.push(structuredClone(value));
    if (flipBeforeSend && value.targets.row.state === "executing") current = false; };
  return { service, operation, calls, saved, guard: () => { if (!current) throw Error("context changed"); },
    flipBeforeSend: () => { flipBeforeSend = true; }, flipAfterSend: () => { flipAfterSend = true; },
    loseResponse: () => { loseResponse = true; } };
}

test("an unsent isolation stays pending when its original context changes", async () => {
  const f = fixture(); f.flipBeforeSend();
  const result = await f.service.executeManaged(f.operation, undefined, f.guard);
  assert.equal(f.calls.length, 0); assert.equal(result.state, "partial");
  assert.equal(result.targets.row.state, "pending");
});

test("an accepted isolation receipt is saved before a context change stops the next action", async () => {
  const f = fixture(); f.flipAfterSend();
  const result = await f.service.executeManaged(f.operation, undefined, f.guard);
  assert.equal(f.calls.length, 1); assert.equal(result.state, "partial");
  assert.deepEqual(result.preview.rows[0].isolationReceipt, { marker: "accepted" });
  assert.ok(f.saved.some(value => value.preview.rows[0].isolationReceipt?.marker === "accepted"));
});

test("an isolation with a lost response remains uncertain and is not marked unsent", async () => {
  const f = fixture(); f.loseResponse();
  const result = await f.service.executeManaged(f.operation, undefined, f.guard);
  assert.equal(f.calls.length, 1); assert.equal(result.state, "partial");
  assert.equal(result.targets.row.state, "executing");
});

test("an ordinary isolation completes under the original context", async () => {
  const f = fixture();
  const result = await f.service.executeManaged(f.operation, undefined, f.guard);
  assert.equal(f.calls.length, 1); assert.equal(result.state, "completed");
  assert.equal(result.targets.row.state, "completed");
});

test("a completed original isolation observation is saved even when the context changes during its query", async () => {
  const f = fixture(); let current = true;
  f.service.managedCheck = async () => { current = false; return { state: "completed", receipt: { marker: "observed" } }; };
  const result = await f.service.executeManaged(f.operation, undefined, () => { if (!current) throw Error("context changed"); });
  assert.equal(f.calls.length, 0); assert.equal(result.state, "partial");
  assert.equal(result.targets.row.state, "completed");
  assert.ok(f.saved.some(value => value.preview.rows[0].isolationReceipt?.marker === "observed"));
});

test("empty parent confirmation does not send after the node lookup changes context", async () => {
  let current = true, calls = 0;
  const node = { id: "worker", kind: "remote", root: "/root" };
  const parent = { token: "token", digest: "digest", node, confirmations: 0, confirmationPaths: ["/root/a"] };
  const ports = { currentNode: async () => { current = false; return node; },
    sftp: async () => { calls++; } };
  await assert.rejects(confirmEmptyParents(ports, [parent], 1, () => { if (!current) throw Error("context changed"); }), /context changed/);
  assert.equal(calls, 0); assert.equal(parent.confirmations, 0);
});

test("empty parent review propagates context changes through confirmation", async () => {
  let current = true, calls = 0;
  const guard = () => { if (!current) throw Error("context changed"); };
  const preview = { node: { id: "w", kind: "local" }, confirmationPaths: ["/root/a"] };
  const service = { list: async () => [{ id: "one", action: "isolate" }],
    status: async (_id, _round, check) => { check(); return { preview: {} }; },
    prepareEmptyParentCleanup: async (_preview, _replacement, check) => { check(); return [preview]; },
    confirmEmptyParentCleanup: async (_rows, _phase, check) => { current = false; check(); calls++; },
    executeEmptyParentCleanup: async () => { calls++; } };
  const host = { askRunConfirmation: async () => "delete_empty_parents" };
  await assert.rejects(reviewEmptyIsolationParents(host, service, guard), /context changed/);
  assert.equal(calls, 0);
});

test("the host does not start an isolation after migration changes the caller context", async () => {
  const fs = require("node:fs"), path = require("node:path"), ts = require("typescript"), vm = require("node:vm");
  const source = fs.readFileSync(path.resolve(__dirname, "../../src/extension/PlanCleanupHost.ts"), "utf8");
  const tree = ts.createSourceFile("PlanCleanupHost.ts", source, ts.ScriptTarget.Latest, true);
  let member; function visit(node) { if (ts.isMethodDeclaration(node) && node.name.getText(tree) === "execute") member = node; ts.forEachChild(node, visit); } visit(tree);
  const Host = vm.runInNewContext(ts.transpileModule("class Host{" + member.getText(tree) + "};Host", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText);
  let current = true, calls = 0;
  const host = new Host(); host.runningOperations = new Set(); host.activePaths = new Map();
  host.ensureOperationRecordsMigrated = async () => { current = false; };
  host.service = { registeredIsolationSource: async () => { calls++; } };
  await assert.rejects(host.execute("operation", () => { if (!current) throw Error("context changed"); }), /context changed/);
  assert.equal(calls, 0); assert.equal(host.runningOperations.size, 0);
});

test("status observations serialize by operation while a stale caller cannot cancel another", async () => {
  const fs = require("node:fs"), path = require("node:path"), ts = require("typescript"), vm = require("node:vm");
  const source = fs.readFileSync(path.resolve(__dirname, "../../src/features/PlanCleanup.ts"), "utf8");
  const tree = ts.createSourceFile("PlanCleanup.ts", source, ts.ScriptTarget.Latest, true);
  let member; function visit(node) { if (ts.isMethodDeclaration(node) && node.name.getText(tree) === "status") member = node; ts.forEachChild(node, visit); } visit(tree);
  let record = { id: "operation", state: "running", indexed: true, executionRequestedAt: "time", preview: { action: "isolate", scope: { observationMode: "managed_tmux" } } };
  let release, started; const gate = new Promise(resolve => { release = resolve; }), entered = new Promise(resolve => { started = resolve; });
  let current = true, count = 0, active = 0, maxActive = 0;
  const fakeFs = { readFile: async () => JSON.stringify(record) };
  const Host = vm.runInNewContext(ts.transpileModule("class Host{" + member.getText(tree) + "};Host", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText,
    { fs: fakeFs, clone: value => structuredClone(value), cleanupError: code => { throw Error(code); } });
  const host = new Host(); host.observing = new Map(); host.busy = new Set(); host.file = id => id;
  host.newObservationRound = () => ({ closed: false });
  host.observeManaged = async value => { active++; maxActive = Math.max(maxActive, active); const n = ++count;
    if (n === 1) { started(); await gate; value.state = "running"; }
    else { value.state = "completed"; value.receipt = "new"; }
    active--; return value; };
  host.save = async value => { record = structuredClone(value); };
  const first = host.status("operation", undefined, () => { if (!current) throw Error("context changed"); });
  await entered; const second = host.status("operation"); current = false; release();
  await assert.rejects(first, /context changed/);
  const result = await second;
  assert.equal(maxActive, 1); assert.equal(count, 2); assert.equal(result.receipt, "new");
  assert.equal(record.receipt, "new"); assert.equal(record.state, "completed");
});
