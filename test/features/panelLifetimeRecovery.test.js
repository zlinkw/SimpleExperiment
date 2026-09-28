const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const root = path.resolve(__dirname, "../..");

function clock() {
  let now = 1_000_000, next = 0;
  const timers = new Map();
  return {
    timers, Date: class extends Date { static now() { return now; } },
    setTimeout(callback, ms) { timers.set(++next, { callback, at: now + ms }); return next; },
    clearTimeout(id) { timers.delete(id); },
    advance(ms) {
      const end = now + ms;
      for (;;) {
        const entry = [...timers].filter(([, row]) => row.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!entry) break;
        now = entry[1].at; timers.delete(entry[0]); entry[1].callback();
      }
      now = end;
    },
  };
}

function host(timer) {
  const source = fs.readFileSync(path.join(root, "src/extension/legacy.ts"), "utf8");
  const ast = ts.createSourceFile("provider.ts", source, ts.ScriptTarget.Latest, true);
  const provider = ast.statements.find((node) => ts.isClassDeclaration(node) && node.name.text === "RealtimeTunnelPanelProvider");
  const methods = new Set(["schedulePanelHeartbeat", "clearPanelHeartbeat", "clearPanelReadyWatchdog", "disposeResolvedWebviewView"]);
  const fields = /^(panelHeartbeat.*|panelDisposed|viewGeneration|viewLifetimeDisposables|lastPanelHeartbeatRecoveryAt|webviewReady)$/;
  const members = provider.members.filter((node) => node.name && (methods.has(node.name.getText(ast)) || (ts.isPropertyDeclaration(node) && fields.test(node.name.getText(ast)))));
  const code = ts.transpileModule("class Subject {\n" + members.map((node) => node.getText(ast)).join("\n") + "\n}", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const sandbox = { ...timer };
  vm.runInNewContext(code + "\nthis.Subject = Subject;", sandbox);
  const result = new sandbox.Subject();
  result.view = { visible: true, webview: { postMessage: (message) => { result.messages.push(message); return Promise.resolve(true); } } };
  result.messages = []; result.webviewReady = true;
  result.reloaded = 0; result.recoveryCards = 0;
  result.loadPanelHtml = () => { result.reloaded++; result.webviewReady = true; result.schedulePanelHeartbeat(); };
  result.showPanelRecovery = () => { result.recoveryCards++; };
  return result;
}

test("a retained renderer that stops replying gets bounded recovery instead of a reload loop", () => {
  const timer = clock(), provider = host(timer);
  provider.schedulePanelHeartbeat();
  timer.advance(30_000);
  assert.equal(provider.messages[0].type, "panelHeartbeat");
  timer.advance(12_000);
  assert.equal(provider.reloaded, 1);
  timer.advance(42_000);
  assert.equal(provider.reloaded, 1);
  assert.equal(provider.recoveryCards, 1);
  assert.equal(provider.webviewReady, false);
  timer.advance(600_000);
  assert.equal(provider.reloaded, 1);
});

test("hidden and disposed views cannot trigger recovery or leave post timers behind", () => {
  const timer = clock(), provider = host(timer);
  provider.schedulePanelHeartbeat();
  timer.advance(30_000);
  provider.view.visible = false;
  timer.advance(12_000);
  assert.equal(provider.reloaded, 0);
  provider.view.visible = true; provider.schedulePanelHeartbeat();
  provider.statePostTimer = timer.setTimeout(() => assert.fail("disposed state post"), 100);
  provider.statePostRetryTimer = timer.setTimeout(() => assert.fail("disposed retry"), 100);
  let released = 0;
  provider.viewLifetimeDisposables = [{ dispose() { released++; } }];
  provider.disposeResolvedWebviewView(provider.view, provider.viewGeneration);
  assert.equal(provider.view, undefined);
  assert.equal(released, 1);
  assert.equal(timer.timers.size, 0);
  timer.advance(600_000);
  assert.equal(provider.reloaded, 0);
});

test("a late old-view disposal cannot clear the replacement view heartbeat", () => {
  const timer = clock(), provider = host(timer);
  const old = provider.view;
  provider.view = { visible: true, webview: { postMessage: () => Promise.resolve(true) } };
  provider.viewGeneration++;
  provider.schedulePanelHeartbeat();
  provider.disposeResolvedWebviewView(old, provider.viewGeneration - 1);
  assert.ok(provider.view);
  assert.equal(timer.timers.size, 1);
  provider.clearPanelHeartbeat();
});

function compactor() {
  const source = fs.readFileSync(path.join(root, "src/ui/OperationPayload.ts"), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const sandbox = { exports: {} };
  vm.runInNewContext(code, sandbox);
  return sandbox.exports.compactOperationsForWebview;
}

test("long-lived operation payloads are bounded without losing action identities or editing evidence", () => {
  const compact = compactor();
  const events = Array.from({ length: 500 }, (_, seq) => ({ seq, payload: { text: "log".repeat(4000) } }));
  const row = { operationId: "old-run", status: "running", workerId: "configured-worker", planFile: "experiments/plans/a.yaml", pid: 42, tmuxTarget: "scheduler:0.1", events, payload: { events }, evidence: { liveLogTail: "tail".repeat(10000) } };
  const input = { active: row };
  const result = compact(input);
  assert.ok(JSON.stringify(result).length < 12_000);
  for (const key of ["operationId", "status", "workerId", "planFile", "pid", "tmuxTarget"]) assert.equal(result.active[key], row[key]);
  assert.equal(result.active.webviewDetailsOmitted, true);
  assert.equal(events.length, 500);
  assert.strictEqual(input.active, row);
  assert.strictEqual(compact(input), result);
  for (let generation = 0; generation < 100; generation++) {
    const next = compact({ active: { ...row, updatedAt: String(generation) } });
    assert.ok(JSON.stringify(next).length < 12_000);
    assert.equal(next.active.updatedAt, String(generation));
  }
  const extension = fs.readFileSync(path.join(root, "src/extension/legacy.ts"), "utf8");
  assert.match(extension, /operations: compactOperationsForWebview\(operations\)/);
});

test("cyclic optional diagnostics cannot break the bounded webview projection", () => {
  const payload = {}; payload.self = payload;
  const result = compactor()({ run: { operationId: "run", status: "running", payload } });
  assert.doesNotThrow(() => JSON.stringify(result));
  assert.equal(result.run.operationId, "run");
});
