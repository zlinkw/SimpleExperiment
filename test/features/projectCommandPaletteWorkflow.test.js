const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "../..");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const extension = fs.readFileSync(path.join(root, "src/extension.ts"), "utf8");

function command(command) {
  return packageJson.contributes.commands.find((item) => item.command === command);
}

test("command palette exposes the three primary new-project entry points", () => {
  assert.equal(command("zlkCluster.quickSetup").title, "SimpleExperiment：一键配置向导");
  assert.equal(command("zlkCluster.bootstrapProject").title, "SimpleExperiment：接入当前项目");
  assert.equal(command("zlkCluster.prepareAgents").title, "SimpleExperiment：准备 Agent 并启动");
  assert.ok(packageJson.activationEvents.includes("onCommand:zlkCluster.bootstrapProject"));
  assert.ok(packageJson.activationEvents.includes("onCommand:zlkCluster.prepareAgents"));
  assert.match(extension, /hostCommand\("zlkCluster\.bootstrapProject", "bootstrap-project", "接入当前项目", \(\) => provider\?\.bootstrapProjectFromUi\(\)\)/);
  assert.match(extension, /hostCommand\("zlkCluster\.prepareAgents", "prepare-agents", "准备 Agent 并启动", \(\) => provider\?\.prepareAgentsForFirstRun\(\)\)/);
  const bootstrapStart = extension.indexOf("async bootstrapProjectFromUi()");
  const bootstrapEnd = extension.indexOf("async generateOutputAdapterFromUi()", bootstrapStart);
  const bootstrap = extension.slice(bootstrapStart, bootstrapEnd);
  assert.match(bootstrap, /if \(!root\) \{[\s\S]{0,220}openWorkspaceFolderForContinuation\("接入当前项目", "bootstrapProject"\)[\s\S]{0,80}return;/);
  assert.doesNotMatch(bootstrap, /throw new Error\("需要先打开工作区。"\)/);
  assert.match(extension, /async openWorkspaceFolderForContinuation\(operation, action, payload = \{\}\)/);
  assert.match(extension, /canSelectFolders: true[\s\S]{0,100}canSelectMany: false/);
  assert.match(extension, /pendingWorkspaceContinuation/);
  assert.match(extension, /executeCommand\("vscode\.openFolder", folder, false\)/);
  assert.match(extension, /async resumePendingWorkspaceContinuation\(\)/);
  assert.match(extension, /void provider\.runActivationOnboarding\(\)/);
  assert.match(extension, /name: "workspaceContinuation"[\s\S]{0,180}resumePendingWorkspaceContinuation\(\)/);
  assert.match(extension, /name: "projectStateBootstrap"[\s\S]{0,160}projectBootstrapPromise/);
  assert.match(extension, /name: "firstRunPrompt"[\s\S]{0,140}showFirstRunSetupPromptOnce\(\)/);
  assert.match(extension, /pending\.action === "bootstrapProject"[\s\S]{0,100}bootstrapProjectFromUi\(\)/);
  assert.match(extension, /pending\.action === "quickSetup"[\s\S]{0,140}completeQuickSetupAfterWorkspace/);
  assert.match(extension, /pending\.action === "setupGuide"[\s\S]{0,120}openSetupGuide\(\)/);
  assert.match(extension, /error instanceof UiCommandCancelled[\s\S]{0,500}自动续接失败/);
});

test("connection command keeps literal semantics in package metadata", () => {
  assert.equal(command("zlkCluster.startAllXshellConnections").title, "SimpleExperiment：启动全部 Xshell 连接");
  assert.doesNotMatch(JSON.stringify(packageJson), /一键启动隧道和 Agent/);
});

test("opening a configured project automatically restores endpoint readiness", () => {
  const start = extension.indexOf("resolveWebviewView(webviewView)");
  const end = extension.indexOf("async dispose()", start);
  assert.ok(start >= 0 && end > start);
  const flow = extension.slice(start, end);
  assert.match(flow, /syncConfiguredXshellSessions\("webview resolved"\)/);
  assert.match(flow, /this\.isRealtimeMode\(\) && initialServerSetupComplete\(this\.setupConfig\)/);
  assert.match(flow, /await this\.testTunnel\(false\)/);
  assert.match(flow, /this\.postState\(\)/);
  assert.doesNotMatch(flow, /testTunnel\(true\)/);
});
