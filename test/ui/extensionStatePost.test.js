const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");

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
  assert.match(flushBlock, /const state = this\.buildState\(\)/);
  assert.match(flushBlock, /const signature = webviewStatePostSignature\(state\)/);
  assert.match(flushBlock, /if \(!force && signature === this\.lastPostedStateSignature\) return/);
  assert.match(flushBlock, /this\.lastPostedStateSignature = signature/);
  assert.match(flushBlock, /postMessage\(\{ type: "state", state \}\)/);
  assert.match(source, /function webviewStatePostSignature\(state: WebviewClusterState\): string/);
  assert.match(source, /return realtimeUiFieldSignature\(state\)/);
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
  assert.match(source, /function realtimeUiStableText\(value: unknown, depth: number\): string/);
  assert.match(createClientBlock, /if \(this\.shouldPushLocalAvailabilityFromRealtime\(state\)\) void this\.pushLocalWorkerAvailability\(false\)/);
  assert.match(createClientBlock, /if \(this\.shouldPostRealtimeStateForWebview\(state\)\) this\.postState\(\)/);
  for (const field of ["gpu", "schedulerStates", "experimentTraces", "logs", "operations", "diagnostics", "fileTransfers", "workerHealth", "workerTasks", "warnings"]) {
    assert.match(postGateBlock, new RegExp(`previous\\.${field} !== nextRefs\\.${field}`));
    assert.match(refsBlock, new RegExp(`${field}: realtimeUiFieldSignature\\(state\\.${field}\\)`));
    assert.doesNotMatch(refsBlock, new RegExp(`${field}: state\\.${field}[,\\n]`));
  }
  assert.match(postGateBlock, /previous\.resultSummaryDirtyKey !== nextRefs\.resultSummaryDirtyKey/);
  assert.match(postGateBlock, /nowMs - this\.lastRealtimeHeartbeatPostAt < this\.realtimeHeartbeatPostMinMs/);
  assert.match(source, /const signature = realtimeUiFieldSignature\(state\.gpu\)/);
  assert.match(source, /this\.lastAvailabilityGpuSignature === signature/);
  assert.doesNotMatch(source, /lastAvailabilityGpuRef/);
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
