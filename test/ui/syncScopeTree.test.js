const assert = require("node:assert/strict");
const test = require("node:test");
const Module = require("node:module");
const vm = require("node:vm");
let handler;
const sent = [];
const panel = { webview: { html: "", postMessage: async (message) => { sent.push(message); }, onDidReceiveMessage: (fn) => { handler = fn; } } };
const original = Module._load;
Module._load = function (name, ...args) {
  if (name === "vscode") return { ViewColumn: { Active: 1 }, window: { createWebviewPanel: () => panel } };
  return original.call(this, name, ...args);
};
const { openSyncScopeTree } = require("../../dist/features/SyncScopeTree.js");
Module._load = original;

test("scope Webview renders collapsible checkboxes, status colors and refresh", async () => {
  let saved;
  openSyncScopeTree("范围", [{ id: "workers", label: "Workers", detail: "完整项目", selected: ["."], list: async () => [{ name: "data", path: "data", directory: true }], refresh: async () => ({ data: { state: "same", detail: "一致" } }), save: async (paths) => { saved = paths; } }], 5000);
  assert.match(panel.webview.html, /type='checkbox'/);
  assert.match(panel.webview.html, /paddingLeft=\(depth\*18\)/);
  assert.match(panel.webview.html, /刷新同步状态/);
  assert.match(panel.webview.html, /setInterval/);
  assert.match(panel.webview.html, /\.different\{/);
  assert.match(panel.webview.html, /\.remote-only\{/);
  const script = panel.webview.html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/);
  assert.ok(script);
  new vm.Script(script[1]);
  await handler({ type: "ready" });
  assert.equal(sent.at(-1).refreshIntervalMs, 5000);
  await handler({ type: "list", id: "1", rootId: "workers", path: "." });
  assert.equal(sent.at(-1).entries[0].path, "data");
  await handler({ type: "refresh", id: "2", rootId: "workers" });
  assert.equal(sent.at(-1).statuses.data.state, "same");
  await handler({ type: "save", id: "3", rootId: "workers", paths: ["data"] });
  assert.deepEqual(saved, ["data"]);
});
