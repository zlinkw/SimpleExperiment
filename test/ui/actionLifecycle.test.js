const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("webview terminal uiCommandStatus clears button loading by client action", () => {
  const root = path.resolve(__dirname, "..", "..");
  const source = fs.readFileSync(path.join(root, "src", "ui", "PanelHtml.ts"), "utf8");
  const handler = source.match(/function handleUiCommandStatus[\s\S]*?function clearCompletedPendingButtons/)?.[0] || "";
  assert.match(handler, /clientActionId/);
  assert.match(handler, /isTerminalUiStatus\(data\.status\)/);
  assert.match(handler, /delete pendingActionsById\[clientActionId\]/);
  assert.match(handler, /clearPendingActionTimeout\(clientActionId\)/);
  assert.match(handler, /clearButtonsForPending\(clientActionId, pendingKey, data\.command\)/);
  assert.match(handler, /!item && !isTerminalUiStatus\(data\.status\)/);
});

test("webview command watchdog is scoped to client action id", () => {
  const root = path.resolve(__dirname, "..", "..");
  const source = fs.readFileSync(path.join(root, "src", "ui", "PanelHtml.ts"), "utf8");
  const clickHandler = source.match(/document\.addEventListener\("click"[\s\S]*?vscode\.postMessage/)?.[0] || "";
  const clearBlock = source.match(/function clearPendingActionTimeout[\s\S]*?function clearButtonsForPending/)?.[0] || "";
  assert.match(source, /let pendingActionTimeouts = \{\}/);
  assert.match(clickHandler, /pendingActionTimeouts\[clientActionId\] = setTimeout/);
  assert.match(clickHandler, /const item = pendingActionsById\[clientActionId\]/);
  assert.doesNotMatch(clickHandler, /pendingActionsById\[clientActionId\] \|\| pendingActions\[pendingKey\]/);
  assert.match(clearBlock, /clearTimeout\(timer\)/);
  assert.match(clearBlock, /delete pendingActionTimeouts\[clientActionId\]/);
});

test("extension action operations use stable ids and watchdog terminal states", () => {
  const root = path.resolve(__dirname, "..", "..");
  const source = fs.readFileSync(path.join(root, "src", "extension.ts"), "utf8");
  assert.match(source, /operationId\?: string/);
  assert.match(source, /request\.operationId = request\.opId/);
  assert.match(source, /scheduleOperationWatchdog\(request\.opId, action\)/);
  assert.match(source, /status: "stalled"/);
  assert.match(source, /operationTerminalStatus/);
  assert.match(source, /"stalled"/);
  assert.match(source, /"unsupported"/);
});

test("extension compacts operation payload without dropping active operations", () => {
  const root = path.resolve(__dirname, "..", "..");
  const source = fs.readFileSync(path.join(root, "src", "extension.ts"), "utf8");
  const buildState = source.match(/private buildState\(\): WebviewClusterState[\s\S]*?return \{/)?.[0] || "";
  const compact = source.match(/function compactOperationRecords[\s\S]*?function operationTerminal/)?.[0] || "";

  assert.match(source, /const LOCAL_OPERATION_RECORD_LIMIT = 120/);
  assert.match(source, /const STATE_OPERATION_RECORD_LIMIT = 120/);
  assert.match(source, /const TERMINAL_OPERATION_RECORD_LIMIT = 80/);
  assert.match(buildState, /this\.localOperations = compactOperationRecords\(this\.localOperations, LOCAL_OPERATION_RECORD_LIMIT, TERMINAL_OPERATION_RECORD_LIMIT\)/);
  assert.match(buildState, /const operations = compactOperationRecords\(/);
  assert.match(compact, /if \(!operationTerminal\(entry\[1\]\)\)\s*active\.push\(entry\)/);
  assert.match(compact, /operationFailureTerminalStatus\(operationStatusOf\(entry\[1\]\)\)/);
  assert.match(compact, /sortOperationEntries\(active\)\.forEach\(add\)/);
  assert.match(compact, /sortOperationEntries\(terminal\)\.slice\(0, terminalLimit\)/);
});

test("local toolbar commands wait for extension terminal status", () => {
  const root = path.resolve(__dirname, "..", "..");
  const source = fs.readFileSync(path.join(root, "src", "extension.ts"), "utf8");
  assert.match(source, /function localCommandReleasesAfterTrigger/);
  assert.match(source, /\["startAllConnections", "testAll", "snapshot"\]/);
  assert.match(source, /已触发本地 VS Code 操作/);
  assert.match(source, /Promise\.race\(\[guardedWork, timeout\]\)/);
});

test("webview repeated render does not preserve disabled state for loading buttons", () => {
  const root = path.resolve(__dirname, "..", "..");
  const source = fs.readFileSync(path.join(root, "src", "ui", "PanelHtml.ts"), "utf8");
  assert.match(source, /const alreadyLoading = button\.classList\.contains\("is-loading"\)/);
  assert.match(source, /if \(!alreadyLoading\) button\.dataset\.wasDisabled/);
  assert.match(source, /delete button\.dataset\.clientActionId/);
});
