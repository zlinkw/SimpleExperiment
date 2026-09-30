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

test("new document stamp and disposal reset the heartbeat render-progress tracker", () => {
  const { ast: stampAst, method: stampMethod } = extractMethod("stampPanelDocument");
  const stampSource = stampMethod.getText(stampAst);
  assert.match(stampSource, /this\.resetPanelStateProgress\(\)/);
  const { ast: disposeAst, method: disposeMethod } = extractMethod("dispose");
  assert.match(disposeMethod.getText(disposeAst), /this\.resetPanelStateProgress\(\)/);

  const { ast, method } = extractMethod("resetPanelStateProgress");
  const code = ts.transpileModule(`class Subject { ${method.getText(ast)} }`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const sandbox = {};
  vm.runInNewContext(`${code}\nthis.Subject = Subject;`, sandbox);
  const subject = new sandbox.Subject();
  subject.lastHeartbeatObservedRenderedStateSeq = 19;
  subject.stateRenderStalledAcks = 2;
  subject.latestPanelHeartbeatProgress = { renderedSeq: 19, previousRenderedSeq: 18, stalledAckCount: 2 };
  subject.resetPanelStateProgress();
  assert.equal(subject.lastHeartbeatObservedRenderedStateSeq, undefined);
  assert.equal(subject.stateRenderStalledAcks, 0);
  assert.equal(subject.latestPanelHeartbeatProgress, undefined);
});
