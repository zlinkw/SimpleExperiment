const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");

function loadRealtimeUiFieldSignature(source) {
  const block = source.match(/function realtimeUiFieldSignature[\s\S]*?function objectRecord/)?.[0] || "";
  const runnable = block
    .replace("function realtimeUiFieldSignature(value: unknown): string", "function realtimeUiFieldSignature(value)")
    .replace(/\nfunction objectRecord[\s\S]*$/, "");
  return new Function(runnable + "; return realtimeUiFieldSignature;")();
}

test("extension coalesces ordinary webview state posts and flushes on visibility", () => {
  const source = fs.readFileSync(path.join(root, "src", "extension.ts"), "utf8");
  const postStateBlock = source.match(/private postState[\s\S]*?private flushStatePost/)?.[0] || "";
  const flushBlock = source.match(/private flushStatePost[\s\S]*?private integration/)?.[0] || "";

  assert.match(source, /private statePostTimer\?: ReturnType<typeof setTimeout>/);
  assert.match(source, /private statePostPending = false/);
  assert.match(source, /private lastPostedStateSignature = ""/);
  assert.match(source, /private readonly statePostBatchMs = 100/);
  assert.match(source, /if \(webviewView\.visible\) this\.postState\(true\);\s*else this\.postState\(\);/);
  assert.match(source, /resolveWebviewView\(webviewView\)[\s\S]{0,320}this\.loadPanelHtml\(\)/);
  assert.match(source, /renderPanelBootstrapDocument\(renderPanelHtml, renderPanelRecoveryHtml\)/);
  assert.match(source, /if \(this\.statePostTimer\) clearTimeout\(this\.statePostTimer\)/);
  assert.match(postStateBlock, /if \(immediate\) \{\s*this\.flushStatePost\(true\);/);
  assert.match(postStateBlock, /this\.statePostPending = true/);
  assert.match(postStateBlock, /if \(!this\.view\.visible\) return/);
  assert.match(postStateBlock, /setTimeout\(\(\) => this\.flushStatePost\(false\), this\.statePostBatchMs\)/);
  assert.match(flushBlock, /if \(!force && !this\.statePostPending\) return/);
  assert.match(flushBlock, /if \(!this\.view\.visible\) return/);
  assert.match(flushBlock, /this\.statePostPending = false/);
  assert.match(flushBlock, /try \{\s*state = this\.buildState\(\)/);
  assert.match(flushBlock, /catch \(error\)[\s\S]{0,700}this\.buildPanelFallbackState\(this\.lastError\)/);
  assert.match(source, /private buildPanelFallbackState\(message: string\): WebviewClusterState/);
  assert.match(flushBlock, /state\.contextActionSignature = contextActionStatePostSignature\(state\)/);
  assert.match(flushBlock, /const signature = webviewStatePostSignature\(state\)/);
  assert.match(flushBlock, /if \(!force && signature === this\.lastPostedStateSignature\) return/);
  assert.match(flushBlock, /if \(!delivered\)[\s\S]{0,180}reportPostError/);
  assert.match(flushBlock, /this\.lastPostedStateSignature = signature/);
  assert.match(flushBlock, /const posted = this\.view\.webview\.postMessage\(\{ type: "state", state \}\)/);
  assert.match(flushBlock, /Promise\.resolve\(posted\)\.then\(completePost, reportPostError\)/);
  assert.match(flushBlock, /catch \(error\) \{\s*reportPostError\(error\)/);
  assert.match(source, /function webviewStatePostSignature\(state: WebviewClusterState\): string/);
  assert.match(source, /return realtimeUiFieldSignature\(state\)/);
  const contextActionSignatureBlock = source.match(/function contextActionStatePostSignature[\s\S]*?function realtimeUiFieldSignature/)?.[0] || "";
  for (const field of ["setup", "integrations", "health", "realtime", "capabilities", "selection", "workerProbes", "plans", "schedulerStates", "operations", "resultsSummary"]) {
    assert.match(contextActionSignatureBlock, new RegExp(`${field}: state\\.${field}`));
  }
  for (const field of ["gpu", "gpuHistory", "logs", "fileTransfers", "diagnostics", "auditTail"]) {
    assert.doesNotMatch(contextActionSignatureBlock, new RegExp(`state\\.${field}`));
  }
  assert.doesNotMatch(postStateBlock, /postMessage\(\{ type: "state"/);
  assert.doesNotMatch(flushBlock, /JSON\.stringify/);
});

test("extension skips heartbeat-only realtime webview posts and keeps content changes", () => {
  const source = fs.readFileSync(path.join(root, "src", "extension.ts"), "utf8");
  const createClientBlock = source.match(/private createClient\(\): MultiEndpointRealtimeClient[\s\S]*?private shouldPushLocalAvailabilityFromRealtime/)?.[0] || "";
  const postGateBlock = source.match(/private shouldPostRealtimeStateForWebview[\s\S]*?private realtimeUiStateRefsFor/)?.[0] || "";
  const refsBlock = source.match(/private realtimeUiStateRefsFor[\s\S]*?private realtimeRefreshPolicy/)?.[0] || "";

  assert.match(source, /private realtimeUiStateRefs\?: RealtimeUiStateRefs/);
  assert.match(source, /private lastRealtimeHeartbeatPostAt = 0/);
  assert.match(source, /private readonly realtimeHeartbeatPostMinMs = 60_000/);
  assert.match(source, /private lastAvailabilityGpuSignature = ""/);
  assert.match(source, /function realtimeUiFieldSignature\(value: unknown\): string/);
  assert.match(source, /function realtimeUiStableHash\(value, depth, digest\)/);
  assert.doesNotMatch(source, /function realtimeUiStableText/);
  assert.match(createClientBlock, /const uiRefs = this\.realtimeUiStateRefsFor\(state\)/);
  assert.equal((createClientBlock.match(/realtimeUiStateRefsFor\(state\)/g) || []).length, 1);
  assert.match(createClientBlock, /if \(this\.shouldPushLocalAvailabilityFromRealtime\(uiRefs\.gpu\)\) void this\.pushLocalWorkerAvailability\(false\)/);
  assert.match(createClientBlock, /if \(this\.shouldPostRealtimeStateForWebview\(uiRefs\)\) this\.postState\(\)/);
  for (const field of ["gpu", "schedulerStates", "experimentTraces", "logs", "operations", "diagnostics", "fileTransfers", "workerHealth", "workerTasks", "warnings"]) {
    assert.match(postGateBlock, new RegExp(`previous\\.${field} !== nextRefs\\.${field}`));
    assert.match(refsBlock, new RegExp(`${field}: realtimeUiFieldSignature\\(state\\.${field}\\)`));
    assert.doesNotMatch(refsBlock, new RegExp(`${field}: state\\.${field}[,\\n]`));
  }
  assert.match(postGateBlock, /previous\.resultSummaryDirtyKey !== nextRefs\.resultSummaryDirtyKey/);
  assert.match(postGateBlock, /nowMs - this\.lastRealtimeHeartbeatPostAt < this\.realtimeHeartbeatPostMinMs/);
  assert.match(source, /private shouldPushLocalAvailabilityFromRealtime\(signature\)/);
  assert.doesNotMatch(source, /private shouldPushLocalAvailabilityFromRealtime[\s\S]{0,160}realtimeUiFieldSignature/);
  assert.match(source, /this\.lastAvailabilityGpuSignature === signature/);
  assert.doesNotMatch(source, /lastAvailabilityGpuRef/);
});

test("realtime state signatures stay bounded and sample across large values", () => {
  const source = fs.readFileSync(path.join(root, "src", "extension.ts"), "utf8");
  const signature = loadRealtimeUiFieldSignature(source);
  assert.equal(signature({ b: 2, a: 1 }), signature({ a: 1, b: 2 }));

  const longA = "a".repeat(600);
  const longB = longA.slice(0, 300) + "b" + longA.slice(301);
  assert.notEqual(signature(longA), signature(longB));

  const rowsA = Array.from({ length: 600 }, (_, index) => ({ index, value: "same" }));
  const rowsB = rowsA.map((row) => ({ ...row }));
  rowsB[599].value = "changed";
  assert.notEqual(signature(rowsA), signature(rowsB));

  const deepA = { a: { b: { c: { d: { e: { f: "before" } } } } } };
  const deepB = { a: { b: { c: { d: { e: { f: "after" } } } } } };
  assert.notEqual(signature(deepA), signature(deepB));

  const dense = Array.from({ length: 240 }, (_, outer) => Array.from({ length: 240 }, (_, inner) => outer * 240 + inner));
  const nodeCount = Number(signature(dense).split(":")[2]);
  assert.equal(nodeCount, 4096);
});

test("local availability push stays server-only and project-state-free", () => {
  const source = fs.readFileSync(path.join(root, "src", "extension.ts"), "utf8");
  const pushBlock = source.match(/private async pushLocalWorkerAvailability[\s\S]*?private localWorkerAvailabilityRows/)?.[0] || "";
  const rowsBlock = source.match(/private localWorkerAvailabilityRows[\s\S]*?private resetClient/)?.[0] || "";

  assert.match(pushBlock, /this\.client\.postAvailabilityBatch/);
  assert.match(pushBlock, /source: "local_aggregator"/);
  assert.match(pushBlock, /workers,/);
  for (const forbidden of ["plan", "recentPlans", "resultsSummary", "fileTransfers", "projectRoot", "workspaceState", "globalState"]) {
    assert.doesNotMatch(pushBlock, new RegExp(forbidden), forbidden);
    assert.doesNotMatch(rowsBlock, new RegExp(forbidden), forbidden);
  }
  for (const allowed of ["workerId", "availableGpuIds", "busyGpuIds", "capacityLimit", "ttlSeconds"]) {
    assert.match(rowsBlock, new RegExp(allowed), allowed);
  }
});

test("stalled ui command status still observes late terminal result", () => {
  const source = fs.readFileSync(path.join(root, "src", "extension.ts"), "utf8");
  const block = source.match(/private async withUiCommandStatus[\s\S]*?private postUiCommandStatus/)?.[0] || "";
  assert.match(block, /result\.status === "stalled"/);
  assert.match(block, /guardedWork\.then\(\(lateResult\) =>/);
  assert.match(block, /后台真实终态/);
  assert.match(block, /lateResult\.status === "failed"/);
  assert.match(block, /this\.recordActionError/);
  assert.match(block, /this\.postUiCommandStatus\(clientActionId, lateResult\.status, command, message\)/);
});
