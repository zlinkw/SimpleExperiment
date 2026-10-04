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
  const source = fs.readFileSync(path.join(__dirname, "../../src/extension/CacheCleanupPanel.ts"), "utf8");
  const compiled = fs.readFileSync(path.join(__dirname, "../../dist/extension/CacheCleanupPanel.js"), "utf8");
  vm.runInNewContext(compiled, { require: id => id === "vscode" ? vscode : require(id), module, exports: module.exports, Buffer, process, console });
  const candidate = { workerId: "worker-a", path: "simple_cluster/tmp/old.log", fullPath: "/project/simple_cluster/tmp/old.log", type: "file", bytes: 12, modifiedAt: 1, purpose: "运行日志", token: "stable" };
  const client = { async postWorkerAction(workerId, action) { actions.push(action); return action === "preview-cache-cleanup" ? { status: "completed", candidates: [candidate] } : { status: "completed", deletedCount: 1 }; } };
  module.exports.openCacheCleanupPanel(client, () => [{ id: "worker-a", role: "worker" }]);
  const ownerStart = source.indexOf("function schedulerStateCleanupOwnerMatches(");
  const ownerEnd = source.indexOf("\nfunction realPathSync(", ownerStart);
  const owner = source.slice(ownerStart, ownerEnd);
  assert.match(owner, /owner\.statePath/);
  assert.match(owner, /owner\.projectRoot/);
  assert.match(owner, /owner\.planFile/);
  assert.match(owner, /schedulerTerminal === true/);
  assert.match(source, /schedulerStateCleanupOwnerMatches\(realRoot, full, state\)/);
  assert.match(source, /stat\.size > 2n \* 1024n \* 1024n/);
  const script = html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/);
  assert.ok(script);
  assert.doesNotThrow(() => new vm.Script(script[1]));
  await handler({ type: "refresh" });
  assert.equal(messages.find(item => item.type === "data").rows.length, 1);
  const keys = ["worker-a|simple_cluster/tmp/old.log"];
  await handler({ type: "confirmSecond", keys });
  await handler({ type: "review", keys });
  await handler({ type: "confirmSecond", keys });
  assert.equal(actions.filter(item => item === "delete-cache-candidates").length, 0);
  await handler({ type: "confirmFirst", keys });
  await handler({ type: "confirmSecond", keys });
  assert.equal(actions.filter(item => item === "delete-cache-candidates").length, 1);
});
