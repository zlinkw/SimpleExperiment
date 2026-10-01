const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");
const legacySource = fs.readFileSync(path.join(__dirname, "../../src/extension/legacy.ts"), "utf8");

const source = fs.readFileSync(path.join(__dirname, "../../src/features/PanelStateProgress.ts"), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const loaded = { exports: {} };
vm.runInNewContext(code, { exports: loaded.exports, module: loaded });

test("rendering progress clears backlog even when posted remains one state ahead", () => {
  const observations = [
    [7900, 7899, 7890],
    [7930, 7929, 7899],
    [7962, 7961, 7929],
  ];
  let stalled = 0;
  for (const [posted, rendered, previous] of observations) {
    const result = loaded.exports.observeStateRenderProgress(posted, rendered, previous, stalled, 3);
    stalled = result.consecutiveStalledAcks;
    assert.equal(result.unhealthy, false);
    assert.equal(stalled, 0);
  }
});

test("three heartbeats with no rendered progress detect a truly stalled UI", () => {
  let stalled = 0;
  let previous = 18;
  for (let ack = 0; ack < 2; ack += 1) {
    const result = loaded.exports.observeStateRenderProgress(20, 18, previous, stalled, 3);
    previous = result.previousObservedRenderedSeq;
    stalled = result.consecutiveStalledAcks;
    assert.equal(result.unhealthy, false);
  }
  const third = loaded.exports.observeStateRenderProgress(20, 18, previous, stalled, 3);
  assert.equal(third.consecutiveStalledAcks, 3);
  assert.equal(third.unhealthy, true);
  const caughtUp = loaded.exports.observeStateRenderProgress(18, 18, 18, third.consecutiveStalledAcks, 3);
  assert.equal(caughtUp.consecutiveStalledAcks, 0);
  assert.equal(caughtUp.unhealthy, false);
});

test("render progress resets the stall counter before a new no-progress period", () => {
  let result = loaded.exports.observeStateRenderProgress(20, 18, 18, 0, 3);
  assert.equal(result.consecutiveStalledAcks, 1);
  result = loaded.exports.observeStateRenderProgress(20, 19, result.previousObservedRenderedSeq, result.consecutiveStalledAcks, 3);
  assert.equal(result.consecutiveStalledAcks, 0);
  for (let expected = 1; expected <= 3; expected += 1) {
    result = loaded.exports.observeStateRenderProgress(20, 19, result.previousObservedRenderedSeq, result.consecutiveStalledAcks, 3);
    assert.equal(result.consecutiveStalledAcks, expected);
    assert.equal(result.unhealthy, expected === 3);
  }
});

test("first heartbeat establishes a baseline and no backlog clears the stall counter", () => {
  const first = loaded.exports.observeStateRenderProgress(20, 18, undefined, 2, 3);
  assert.equal(first.consecutiveStalledAcks, 0);
  assert.equal(first.unhealthy, false);
  const caughtUp = loaded.exports.observeStateRenderProgress(18, 18, 18, 2, 3);
  assert.equal(caughtUp.consecutiveStalledAcks, 0);
});

function extractMethod(name) {
  const ast = ts.createSourceFile("legacy.ts", legacySource, ts.ScriptTarget.Latest, true);
  const provider = ast.statements.find((node) => ts.isClassDeclaration(node) && node.name?.text === "RealtimeTunnelPanelProvider");
  const method = provider.members.find((node) => node.name?.getText(ast) === name);
  assert.ok(method, name);
  return { ast, method };
}

test("heartbeat ACK integration does not recover while rendered sequence advances", () => {
  const { ast, method } = extractMethod("handlePanelHeartbeatAck");
  const code = ts.transpileModule(`class Subject { ${method.getText(ast)} }`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const sandbox = { PanelStateProgress_1: loaded.exports, Number, Date };
  vm.runInNewContext(`${code}\nthis.Subject = Subject;`, sandbox);
  const subject = new sandbox.Subject();
  Object.assign(subject, {
    panelDisposed: false, view: { visible: true }, panelHeartbeatId: 1, panelDocumentGeneration: 2,
    lastPostedStateSeq: 7900, lastReceivedStateSeq: 0, lastRenderedStateSeq: 0,
    lastHeartbeatObservedRenderedStateSeq: 7890, stateRenderStalledAcks: 0,
    panelHeartbeatTimeout: undefined, panelUnknownHealthSince: 0, panelUnknownHealthGeneration: 0,
    recoveries: [], schedulePanelHeartbeat() {}, recoverPanelHeartbeatFailure(reason) { this.recoveries.push(reason); },
  });
  for (const [heartbeatId, posted, rendered] of [[1, 7900, 7899], [2, 7930, 7929], [3, 7962, 7961]]) {
    subject.panelHeartbeatId = heartbeatId;
    subject.lastPostedStateSeq = posted;
    subject.handlePanelHeartbeatAck({ heartbeatId, documentGeneration: 2, lastReceivedStateSeq: rendered, lastRenderedStateSeq: rendered, renderHealth: { status: "ok" } });
    assert.equal(subject.stateRenderStalledAcks, 0);
    assert.equal(subject.lastHeartbeatObservedRenderedStateSeq, rendered);
  }
  assert.deepEqual(Array.from(subject.recoveries), []);
});

function createHeartbeatSubject() {
  const { ast, method } = extractMethod("handlePanelHeartbeatAck");
  const code = ts.transpileModule(`class Subject { ${method.getText(ast)} }`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const sandbox = { PanelStateProgress_1: loaded.exports, Number, Date, Math, clearTimeout() {} };
  vm.runInNewContext(`${code}\nthis.Subject = Subject;`, sandbox);
  const subject = new sandbox.Subject();
  Object.assign(subject, {
    panelDisposed: false, view: { visible: true }, panelHeartbeatId: 0, panelDocumentGeneration: 2,
    lastPostedStateSeq: 0, lastReceivedStateSeq: 0, lastRenderedStateSeq: 0,
    lastHeartbeatObservedRenderedStateSeq: undefined, stateRenderStalledAcks: 0,
    panelHeartbeatTimeout: undefined, panelUnknownHealthSince: 0, panelUnknownHealthGeneration: 0,
    webviewDocumentVisible: true, panelDocumentHasRenderedState: false,
    recoveries: [], schedulePanelHeartbeat() {},
    recoverPanelHeartbeatFailure(reason) { this.recoveries.push(reason); },
    updatePanelDocumentVisibility(visible) {
      if (this.webviewDocumentVisible !== visible) {
        this.webviewDocumentVisible = visible;
        this.stateRenderStalledAcks = 0;
        this.lastHeartbeatObservedRenderedStateSeq = undefined;
        this.latestPanelHeartbeatProgress = undefined;
      }
    },
  });
  return subject;
}

test("hidden and not-yet-renderable documents never accumulate sequence stalls", () => {
  for (const reason of ["document-hidden", "bootstrap", "awaiting-first-render", "state-render-pending", "render-health-probe-pending"]) {
    const subject = createHeartbeatSubject();
    for (let heartbeatId = 1; heartbeatId <= 10; heartbeatId += 1) {
      subject.panelHeartbeatId = heartbeatId;
      subject.lastPostedStateSeq = 1000 + heartbeatId;
      subject.handlePanelHeartbeatAck({
        heartbeatId, documentGeneration: 2, lastReceivedStateSeq: 1000 + heartbeatId,
        lastRenderedStateSeq: 100, renderHealth: { status: "unknown", reason },
      });
    }
    assert.deepEqual(Array.from(subject.recoveries), [], reason);
    assert.equal(subject.stateRenderStalledAcks, 0, reason);
    assert.equal(subject.lastHeartbeatObservedRenderedStateSeq, undefined, reason);
  }
});

test("visible healthy renderer still recovers after three heartbeats with no progress", () => {
  const subject = createHeartbeatSubject();
  subject.panelDocumentHasRenderedState = true;
  subject.lastHeartbeatObservedRenderedStateSeq = 100;
  for (let heartbeatId = 1; heartbeatId <= 3; heartbeatId += 1) {
    subject.panelHeartbeatId = heartbeatId;
    subject.lastPostedStateSeq = 1000 + heartbeatId;
    subject.handlePanelHeartbeatAck({ heartbeatId, documentGeneration: 2,
      lastReceivedStateSeq: 1000 + heartbeatId, lastRenderedStateSeq: 100,
      renderHealth: { status: "ok", reason: "render-completed" } });
  }
  assert.deepEqual(Array.from(subject.recoveries), ["state-render-sequence-stalled"]);
  assert.equal(subject.stateRenderStalledAcks, 3);
});

test("explicit frame-stall health takes precedence over sequence-stall recovery", () => {
  const subject = createHeartbeatSubject();
  subject.panelDocumentHasRenderedState = true;
  subject.lastPostedStateSeq = 1000;
  subject.lastHeartbeatObservedRenderedStateSeq = 100;
  subject.stateRenderStalledAcks = 2;
  subject.panelHeartbeatId = 1;
  subject.handlePanelHeartbeatAck({ heartbeatId: 1, documentGeneration: 2,
    lastReceivedStateSeq: 999, lastRenderedStateSeq: 100,
    renderHealth: { status: "unhealthy", reason: "state-render-frame-stalled" } });
  assert.deepEqual(Array.from(subject.recoveries), ["state-render-frame-stalled"]);
});

test("one hundred hidden state updates stay pending and flush once on visibility", () => {
  const { ast, method } = extractMethod("postState");
  const code = ts.transpileModule(`class Subject { ${method.getText(ast)} }`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  let nextTimerId = 0;
  const timers = new Map();
  const calls = [];
  const sandbox = {
    Date,
    setTimeout(callback, delay) { const id = ++nextTimerId; timers.set(id, { callback, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
  };
  vm.runInNewContext(`${code}\nthis.Subject = Subject;`, sandbox);
  const subject = new sandbox.Subject();
  Object.assign(subject, {
    panelLifecycleState: "ready", view: { visible: true }, webviewReady: true,
    webviewDocumentVisible: false, statePostPending: false, statePostTimer: undefined,
    statePostInFlight: false, statePostImmediatePending: false,
    hiddenSuppressedStatePosts: 0, coalescedStatePosts: 0, lastFullStatePostAt: 0,
    statePostBatchMs: 100, statePostMinimumIntervalMs: 200,
    extensionRuntimeVersionState: () => ({ reloadRequired: false }),
    realtimeRefreshPolicy: () => ({ uiBatchMs: 100 }),
    showPanelReloadRequired() {},
    flushStatePost(force) { calls.push(force); this.statePostPending = false; this.statePostTimer = undefined; },
  });
  for (let index = 0; index < 100; index += 1) subject.postState();
  assert.equal(subject.statePostPending, true);
  assert.equal(subject.hiddenSuppressedStatePosts, 100);
  assert.equal(timers.size, 0);
  assert.deepEqual(calls, []);
  subject.webviewDocumentVisible = true;
  subject.postState(true);
  assert.deepEqual(calls, [true]);
});

test("host visibility transition resets stall evidence and forces one latest state", () => {
  const { ast, method } = extractMethod("updatePanelDocumentVisibility");
  const code = ts.transpileModule(`class Subject { ${method.getText(ast)} }`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const sandbox = { clearTimeout() {} };
  vm.runInNewContext(`${code}\nthis.Subject = Subject;`, sandbox);
  const subject = new sandbox.Subject();
  const posts = [];
  Object.assign(subject, {
    webviewDocumentVisible: false, statePostPending: false, statePostTimer: undefined,
    lastHeartbeatObservedRenderedStateSeq: 100, stateRenderStalledAcks: 2,
    latestPanelHeartbeatProgress: { renderedSeq: 100, previousRenderedSeq: 100, stalledAckCount: 2 },
    postState(immediate) { posts.push(immediate); },
  });
  subject.updatePanelDocumentVisibility(true);
  subject.updatePanelDocumentVisibility(true);
  assert.equal(subject.webviewDocumentVisible, true);
  assert.equal(subject.statePostPending, true);
  assert.equal(subject.lastHeartbeatObservedRenderedStateSeq, undefined);
  assert.equal(subject.stateRenderStalledAcks, 0);
  assert.equal(subject.latestPanelHeartbeatProgress, undefined);
  assert.deepEqual(posts, [true]);
});

test("ordinary state updates coalesce at uiBatchMs with a 200 ms full-state floor", () => {
  const { ast, method } = extractMethod("postState");
  const code = ts.transpileModule(`class Subject { ${method.getText(ast)} }`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  let nextTimerId = 0;
  const timers = new Map();
  const calls = [];
  const sandbox = {
    Date,
    setTimeout(callback, delay) { const id = ++nextTimerId; timers.set(id, { callback, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
  };
  vm.runInNewContext(`${code}\nthis.Subject = Subject;`, sandbox);
  const subject = new sandbox.Subject();
  Object.assign(subject, {
    panelLifecycleState: "ready", view: { visible: true }, webviewReady: true,
    webviewDocumentVisible: true, statePostPending: false, statePostTimer: undefined,
    statePostInFlight: false, statePostImmediatePending: false,
    hiddenSuppressedStatePosts: 0, coalescedStatePosts: 0, lastFullStatePostAt: 0,
    statePostBatchMs: 100, statePostMinimumIntervalMs: 200,
    extensionRuntimeVersionState: () => ({ reloadRequired: false }),
    realtimeRefreshPolicy: () => ({ uiBatchMs: 100 }),
    showPanelReloadRequired() {},
    flushStatePost(force) { calls.push(force); this.statePostPending = false; this.statePostTimer = undefined; },
  });
  for (let index = 0; index < 100; index += 1) subject.postState();
  assert.equal(timers.size, 1);
  assert.equal([...timers.values()][0].delay, 200);
  assert.equal(subject.coalescedStatePosts, 99);
  [...timers.values()][0].callback();
  assert.deepEqual(calls, [false]);
});

test("new document stamp and disposal reset the heartbeat render-progress tracker", () => {
  const { ast: stampAst, method: stampMethod } = extractMethod("stampPanelDocument");
  const stampSource = stampMethod.getText(stampAst);
  assert.match(stampSource, /this\.resetPanelStateProgress\(true\)/);
  const { ast: disposeAst, method: disposeMethod } = extractMethod("dispose");
  assert.match(disposeMethod.getText(disposeAst), /this\.resetPanelStateProgress\(true\)/);

  const { ast, method } = extractMethod("resetPanelStateProgress");
  const code = ts.transpileModule(`class Subject { ${method.getText(ast)} }`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const sandbox = {};
  vm.runInNewContext(`${code}\nthis.Subject = Subject;`, sandbox);
  const subject = new sandbox.Subject();
  subject.lastHeartbeatObservedRenderedStateSeq = 19;
  subject.stateRenderStalledAcks = 2;
  subject.lastReceivedStateSeq = 5593;
  subject.lastRenderedStateSeq = 3640;
  subject.stateSequence = 5593;
  subject.panelDocumentHasRenderedState = true;
  subject.latestPanelHeartbeatProgress = { renderedSeq: 19, previousRenderedSeq: 18, stalledAckCount: 2 };
  subject.resetPanelStateProgress(true);
  assert.equal(subject.lastHeartbeatObservedRenderedStateSeq, undefined);
  assert.equal(subject.stateRenderStalledAcks, 0);
  assert.equal(subject.latestPanelHeartbeatProgress, undefined);
  assert.equal(subject.lastReceivedStateSeq, 0);
  assert.equal(subject.lastRenderedStateSeq, 0);
  assert.equal(subject.panelDocumentHasRenderedState, false);
  assert.equal(subject.stateSequence, 5593, "document reset must keep the provider-wide state sequence monotonic");
});
