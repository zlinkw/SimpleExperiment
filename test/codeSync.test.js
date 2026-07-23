const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));

test("legacy direct sync commands are not contributed", () => {
  const commands = packageJson.contributes.commands.map((item) => item.command);
  assert.equal(commands.includes("zlkCluster.syncToGitHub"), false);
  assert.equal(commands.includes("zlkCluster.deployRuntime"), false);
  assert.equal(commands.includes("zlkCluster.verifyRuntime"), false);
  assert.equal(commands.filter((command) => command.includes("configure") && command.includes("RealtimeTunnel")).every((command) => command.includes("Xshell")), true);
  assert.equal(commands.includes("zlkCluster.configureXshellSavedSessions"), true);
  assert.equal(commands.includes("zlkCluster.prepareAgents"), true);
});
