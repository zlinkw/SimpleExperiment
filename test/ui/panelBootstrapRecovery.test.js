const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { renderPanelBootstrapDocument } = require("../../dist/ui/PanelBootstrap.js");
const extension = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");
const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");

test("panel host rendering falls back to a recovery document", () => {
  const normal = renderPanelBootstrapDocument(() => "<main>ready</main>", () => "recovery");
  assert.deepEqual(normal, { html: "<main>ready</main>", recovered: false });

  const recovered = renderPanelBootstrapDocument(
    () => { throw new Error("render exploded"); },
    (message) => `<main>${message}</main>`,
  );
  assert.equal(recovered.recovered, true);
  assert.equal(recovered.error, "render exploded");
  assert.match(recovered.html, /render exploded/);

  const empty = renderPanelBootstrapDocument(() => "", (message) => `<main>${message}</main>`);
  assert.equal(empty.recovered, true);
  assert.match(empty.error, /渲染结果为空/);
});

test("panel ready watchdog is cleared on ready, recovery, reload, and dispose", () => {
  const resolveFlow = extension.slice(extension.indexOf("resolveWebviewView(webviewView)"), extension.indexOf("async dispose()"));
  const messageFlow = extension.slice(extension.indexOf('case "webviewReady"'), extension.indexOf('case "webviewBootstrapError"'));
  const watchdogFlow = extension.slice(extension.indexOf("private startPanelReadyWatchdog"), extension.indexOf("private flushStatePost"));
  const disposeFlow = extension.slice(extension.indexOf("async dispose()"), extension.indexOf("async withHostOperationLease"));

  assert.match(resolveFlow, /this\.loadPanelHtml\(\)/);
  assert.match(messageFlow, /this\.clearPanelReadyWatchdog\(\)/);
  assert.match(watchdogFlow, /private showPanelRecovery[\s\S]{0,180}this\.clearPanelReadyWatchdog\(\)/);
  assert.match(watchdogFlow, /renderPanelBootstrapDocument\(renderPanelHtml, renderPanelRecoveryHtml\)/);
  assert.match(watchdogFlow, /if \(document\.recovered\)/);
  assert.match(watchdogFlow, /this\.startPanelReadyWatchdog\(\)/);
  assert.match(watchdogFlow, /private reloadPanelHtml\(\): void \{\s*this\.loadPanelHtml\(\);/);
  assert.match(disposeFlow, /this\.clearPanelReadyWatchdog\(\)/);
});

test("panel registers the message listener before HTML can emit the ready handshake", () => {
  const start = extension.indexOf("resolveWebviewView(webviewView)");
  const end = extension.indexOf("async dispose()", start);
  const flow = extension.slice(start, end);
  const listener = flow.indexOf("webviewView.webview.onDidReceiveMessage");
  const html = flow.indexOf("this.loadPanelHtml()");

  assert.ok(listener >= 0, "missing webview message listener");
  assert.ok(html >= 0, "missing panel HTML load");
  assert.ok(listener < html, "ready listener must be attached before HTML assignment");
  assert.match(extension, /if \(!this\.webviewReady\)\s*this\.startPanelReadyWatchdog\(\)/);
});

test("panel reports post-bootstrap render failures without hiding the recovery path", () => {
  assert.match(extension, /case "webviewRenderError":[\s\S]{0,260}recordActionError/);
  assert.match(extension, /"webviewReady", "webviewBootstrapError", "webviewRenderError", "reloadPanel"/);
  assert.match(panel, /let lastRenderErrorMessage = ""/);
  assert.match(panel, /vscode\.postMessage\(\{ command: "webviewRenderError", error: .*\.slice\(0, \d+\) \}\)/);
});
