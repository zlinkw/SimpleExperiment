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
  let refreshed;
  openSyncScopeTree("范围", [{ id: "workers", label: "Workers", detail: "完整项目", selected: ["."], list: async () => [{ name: "data", path: "data", directory: true }], refresh: async (relative) => { refreshed = relative; return { data: { state: "same", detail: "一致" } }; }, save: async (paths) => { saved = paths; } }], 5000);
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
  await handler({ type: "refresh", id: "2", rootId: "workers", path: "data" });
  assert.equal(refreshed, "data");
  assert.equal(sent.at(-1).path, "data");
  assert.equal(sent.at(-1).statuses.data.state, "same");
  await handler({ type: "save", id: "3", rootId: "workers", paths: ["data"] });
  assert.deepEqual(saved, ["data"]);
});

test("scope Webview requests visible-file status and replaces waiting badges", () => {
  const script = panel.webview.html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/);
  assert.ok(script);
  class Element {
    constructor() { this.children = []; this.style = {}; this.textContent = ""; }
    appendChild(child) { this.children.push(child); return child; }
    replaceChildren(...children) { this.children = children; }
  }
  const elements = new Map();
  const document = {
    hidden: false,
    getElementById(id) { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); },
    createElement() { return new Element(); },
  };
  const messages = [];
  let onMessage;
  vm.runInNewContext(script[1], {
    acquireVsCodeApi: () => ({ postMessage: (message) => messages.push(message) }),
    document,
    window: { addEventListener: (_type, callback) => { onMessage = callback; } },
    setInterval: () => 1,
  });
  assert.equal(messages.at(-1).type, "ready");
  onMessage({ data: { type: "init", roots: [{ id: "workers", label: "Workers", detail: "完整项目", selected: ["."], rootSelectable: true }, { id: "local", label: "Local", detail: "本机同步", selected: [], rootSelectable: false }], refreshIntervalMs: 5000 } });
  assert.equal(messages.at(-1).type, "list");
  onMessage({ data: { type: "children", rootId: "workers", path: ".", entries: [{ name: "data", path: "data", directory: true, locations: ["w1"] }, { name: "README.md", path: "README.md", directory: false }] } });
  assert.equal(messages.at(-1).type, "refresh");
  assert.equal(messages.at(-1).path, ".");
  const hash = "a".repeat(64);
  onMessage({ data: { type: "status", rootId: "workers", path: ".", statuses: { ".": { state: "same", detail: "共 2 个文件 · 2 一致" }, "data": { state: "same", detail: "共 1 个文件 · 1 一致" }, "README.md": { state: "same", detail: "本机 同版 · w1 最新版", versions: { w1: { sha256: hash, modifiedAtMs: 1000, latest: "candidate" } } } }, refreshedAt: "now" } });
  assert.match(elements.get("status").textContent, /已校验/);
  const folderBadge = elements.get("tree").children[1].children.find((child) => child.className === "badge same");
  assert.match(folderBadge?.textContent, /共 1 个文件 · 1 一致/);
  assert.equal(elements.get("tree").children[2].children.find((child) => child.className === "badge same")?.className, "badge same");
  const version = elements.get("tree").children[2].children.find((child) => child.className === "versions").children[0];
  assert.match(version.textContent, new RegExp(hash));
  assert.equal(version.children[0].textContent, "保留此版");
  assert.equal(version.children[1].textContent, "删除");
  version.children[1].onclick();
  assert.deepEqual({ type: messages.at(-1).type, path: messages.at(-1).path, endpointId: messages.at(-1).endpointId }, { type: "remove", path: "README.md", endpointId: "w1" });
  onMessage({ data: { type: "status", rootId: "workers", path: ".", statuses: { "data": { state: "unknown", detail: "1 未确认", unverified: true } }, refreshedAt: "now" } });
  const folderVersions = elements.get("tree").children[1].children.find((child) => child.className === "versions");
  assert.equal(folderVersions.children[0].children[0].disabled, true);
  elements.get("tabs").children[1].onclick();
  assert.deepEqual({ type: messages.at(-1).type, rootId: messages.at(-1).rootId, path: messages.at(-1).path }, { type: "list", rootId: "local", path: "." });
});
