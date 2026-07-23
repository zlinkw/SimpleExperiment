const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "../..");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const extension = fs.readFileSync(path.join(root, "src/extension.ts"), "utf8");
const panel = fs.readFileSync(path.join(root, "src/ui/PanelHtml.ts"), "utf8");
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
const guide = fs.readFileSync(path.join(root, "docs/simple-experiment-setup.md"), "utf8");

const advancedCommands = [
  "zlkCluster.writeXshellAgentStartupCommands",
  "zlkCluster.configureXshellRealtimeTunnel",
  "zlkCluster.startHubTunnel",
  "zlkCluster.startWorkerTunnel",
  "zlkCluster.startXshellRealtimeTunnel",
  "zlkCluster.startAllXshellRealtimeTunnels",
  "zlkCluster.showTunnelEndpointRegistry",
  "zlkCluster.testXshellTunnel",
  "zlkCluster.restartRealtimeStream",
  "zlkCluster.pauseRealtimeStream",
  "zlkCluster.resumeRealtimeStream",
  "zlkCluster.pauseAllNetworkActivity",
  "zlkCluster.generateXshellTunnelScript",
  "zlkCluster.openTunnelStatus",
  "zlkCluster.runXshellRealIntegrationCheck",
  "zlkCluster.manualRefresh",
  "zlkCluster.importOfflineBundle",
];

const primaryCommands = [
  "zlkCluster.openPanel",
  "zlkCluster.quickSetup",
  "zlkCluster.bootstrapProject",
  "zlkCluster.prepareAgents",
  "simpleExperiment.openSetupGuide",
  "zlkCluster.configureXshellSavedSessions",
  "zlkCluster.configureWorkerTunnels",
  "zlkCluster.configureTunnelPorts",
  "zlkCluster.startAllXshellConnections",
  "zlkCluster.testAllTunnels",
];

test("command palette defaults to the new-project main workflow without removing advanced handlers", () => {
  const commands = new Set(packageJson.contributes.commands.map((item) => item.command));
  const palette = packageJson.contributes.menus.commandPalette;
  const hiddenByDefault = new Map(palette.map((item) => [item.command, item.when]));

  assert.equal(packageJson.contributes.configuration.properties["zlkCluster.showAdvancedCommands"].default, false);
  assert.deepEqual([...hiddenByDefault.keys()].sort(), [...advancedCommands].sort());

  for (const command of advancedCommands) {
    assert.ok(commands.has(command), `${command} must remain contributed`);
    assert.equal(hiddenByDefault.get(command), "config.zlkCluster.showAdvancedCommands");
    assert.match(extension, new RegExp(`(?:registerCommand|hostCommand)\\("${command.replaceAll(".", "\\.")}"`));
  }

  for (const command of primaryCommands) {
    assert.ok(commands.has(command), `${command} must remain contributed`);
    assert.equal(hiddenByDefault.has(command), false, `${command} must remain visible by default`);
  }

  assert.match(readme, /zlkCluster\.showAdvancedCommands/);
  assert.match(readme, /旧自动隧道、单端点启动、实时流和诊断恢复命令仍保持注册/);
  assert.match(guide, /面板内原按钮和直接命令 ID 不变/);
});

test("settings links directly to the advanced command visibility setting", () => {
  assert.match(panel, /data-anchor="settings-advanced-commands"/);
  assert.match(panel, /data-command="openAdvancedCommandsSetting"[^>]*>打开命令设置<\/button>/);
  assert.match(panel, /"openAdvancedCommandsSetting"/);
  assert.match(extension, /case "openAdvancedCommandsSetting":[\s\S]{0,180}workbench\.action\.openSettings", "zlkCluster\.showAdvancedCommands"/);
});
