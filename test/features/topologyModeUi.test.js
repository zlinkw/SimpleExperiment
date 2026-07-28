const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..", "..");
const extension = fs.readFileSync(path.join(root, "src", "extension.ts"), "utf8");
const panel = fs.readFileSync(path.join(root, "src", "ui", "PanelHtml.ts"), "utf8");

test("extension publishes project topology assessment to the webview", () => {
  assert.match(extension, /import TopologyMode_1 = require\("\.\/features\/TopologyMode"\)/);
  assert.match(extension, /const topology = this\.projectTopologyAssessment\(\)/);
  assert.match(extension, /workspace,\s*topology,\s*setup: compactXshellSetupForWebview/);
  assert.match(extension, /configuredMode,\s*storedHubConfigured,\s*modeLabel: topologyModeLabel\(assessment\.mode\)/);
});

test("topology save is project-scoped and strongly confirmed", () => {
  const flow = extension.slice(extension.indexOf("async saveTopologyModeFromUi"), extension.indexOf("async saveHubConfigFromUi"));
  assert.match(flow, /showWarningMessage\(\[/);
  assert.match(flow, /\{ modal: true \}, "保存拓扑"/);
  assert.match(flow, /模式切换不会迁移、覆盖或删除已有任务与结果/);
  assert.match(flow, /config\.update\("topologyMode", requestedMode, vscode\.ConfigurationTarget\.WorkspaceFolder\)/);
  assert.match(flow, /不会访问 Hub、同步到 Hub或创建跨节点自动备份/);
});

test("settings and overview render topology ownership without active Hub controls", () => {
  assert.match(panel, /data-command="saveTopologyMode" data-config-scope="topology"/);
  assert.match(panel, /taskDetailLine\("调度所有者", esc\(topology\.schedulerOwner/);
  assert.match(panel, /taskDetailLine\("状态与结果", esc\(topology\.stateOwner/);
  assert.match(panel, /if \(hubParticipates\) cards\.push/);
  assert.match(panel, /Hub 不参与当前模式/);
  assert.match(panel, /当前模式不访问 Hub/);
  assert.match(panel, /无自动备份/);
});

test("topology command is registered on both sides of the webview boundary", () => {
  assert.match(extension, /case "saveTopologyMode":\s*await this\.saveTopologyModeFromUi\(message\)/);
  assert.match(extension, /SAFE_WEBVIEW_COMMANDS = new Set\(\[[\s\S]*"saveTopologyMode"/);
  assert.match(panel, /webviewHandledCommands = new Set\(\[[\s\S]*"saveTopologyMode"/);
  assert.match(panel, /saveTopologyMode: "保存项目拓扑模式"/);
});
