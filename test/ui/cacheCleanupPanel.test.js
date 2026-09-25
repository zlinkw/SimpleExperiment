const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("cache review requires two path confirmations before sending a delete action", async () => {
  let handler;
  let html = "";
  const messages = [];
  const actions = [];
  const webview = {
    set html(value) { html = value; },
    postMessage(value) { messages.push(value); return Promise.resolve(true); },
    onDidReceiveMessage(value) { handler = value; },
  };
  const vscode = { window: { createWebviewPanel: () => ({ webview }) }, ViewColumn: { Active: 1 } };
  const module = { exports: {} };
  const compiled = fs.readFileSync(path.join(__dirname, "../../dist/extension/CacheCleanupPanel.js"), "utf8");
  vm.runInNewContext(compiled, { require: id => id === "vscode" ? vscode : require(id), module, exports: module.exports, Buffer, process, console });
  const candidate = { workerId: "nwpu2", path: "simple_cluster/tmp/old.log", fullPath: "/project/simple_cluster/tmp/old.log", type: "file", bytes: 12, modifiedAt: 1, purpose: "运行日志", token: "stable" };
  const client = { async postWorkerAction(workerId, action) { actions.push(action); return action === "preview-cache-cleanup" ? { status: "completed", candidates: [candidate] } : { status: "completed", deletedCount: 1 }; } };
  module.exports.openCacheCleanupPanel(client, () => [{ id: "nwpu2", role: "worker" }]);
  const script = html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/);
  assert.ok(script);
  assert.doesNotThrow(() => new vm.Script(script[1]));
  await handler({ type: "refresh" });
  assert.equal(messages.find(item => item.type === "data").rows.length, 1);
  const keys = ["nwpu2|simple_cluster/tmp/old.log"];
  await handler({ type: "confirmSecond", keys });
  await handler({ type: "review", keys });
  await handler({ type: "confirmSecond", keys });
  assert.equal(actions.filter(item => item === "delete-cache-candidates").length, 0);
  await handler({ type: "confirmFirst", keys });
  await handler({ type: "confirmSecond", keys });
  assert.equal(actions.filter(item => item === "delete-cache-candidates").length, 1);
});
