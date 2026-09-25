const assert = require("node:assert/strict");
const test = require("node:test");
const Module = require("node:module");
const vm = require("node:vm");
const { expandSyncScopeBatchSelection, runSyncScopeBatch } = require("../../dist/features/SyncScopeBatch.js");

test("batch selection expands only branches containing exclusions", async () => {
  const calls = [];
  const tree = {
    ".": [{ path: "code", name: "code", directory: true }, { path: "artifacts", name: "artifacts", directory: true }],
    code: [{ path: "code/a.py", name: "a.py", directory: false }, { path: "code/b.py", name: "b.py", directory: false }],
    artifacts: [{ path: "artifacts/keep", name: "keep", directory: true }, { path: "artifacts/drop", name: "drop", directory: true }],
  };
  const selected = await expandSyncScopeBatchSelection(["."], ["artifacts/drop", "code/b.py"], async (parent) => {
    calls.push(parent);
    return tree[parent] || [];
  });
  assert.deepEqual(selected.map((item) => item.path), ["artifacts/keep", "code/a.py"]);
  assert.deepEqual(calls.sort(), [".", "artifacts", "code"]);
});

test("batch runner keeps at most two paths in flight and reports failures", async () => {
  let active = 0;
  let maxActive = 0;
  const release = [];
  const done = runSyncScopeBatch([1, 2, 3], async (item) => {
    maxActive = Math.max(maxActive, ++active);
    await new Promise((resolve) => release.push(resolve));
    active--;
    if (item === 2) throw new Error("worker failed");
  }, () => {});
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(maxActive, 2);
  release.splice(0).forEach((resolve) => resolve());
  await new Promise((resolve) => setImmediate(resolve));
  release.splice(0).forEach((resolve) => resolve());
  const result = await done;
  assert.deepEqual(result.map((row) => row.error || "ok"), ["ok", "worker failed", "ok"]);
});

test("sync scope webview batch controls parse as JavaScript", () => {
  const panel = { webview: { html: "", onDidReceiveMessage() {} } };
  const original = Module._load;
  Module._load = function (request, ...args) {
    return request === "vscode" ? { window: { createWebviewPanel: () => panel }, ViewColumn: { Active: 1 } } : original.call(this, request, ...args);
  };
  let openSyncScopeTree;
  try { ({ openSyncScopeTree } = require("../../dist/features/SyncScopeTree.js")); }
  finally { Module._load = original; }
  openSyncScopeTree("test", []);
  const script = panel.webview.html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script);
  new vm.Script(script);
  assert.match(panel.webview.html, /批量同步勾选项/);
  assert.match(panel.webview.html, /批量删除勾选项/);
});
