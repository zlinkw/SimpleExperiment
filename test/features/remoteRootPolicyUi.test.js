const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "../..");
const extension = fs.readFileSync(path.join(root, "src/extension.ts"), "utf8");
const panel = fs.readFileSync(path.join(root, "src/ui/PanelHtml.ts"), "utf8");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

test("remote root policies are exposed in the plugin settings page", () => {
  assert.equal(packageJson.contributes.configuration.properties["simpleExperiment.remote.allowedRoots"].scope, "resource");
  assert.equal(packageJson.contributes.configuration.properties["simpleExperiment.remote.deniedRoots"].scope, "resource");
  assert.match(panel, /<div id="remoteRootPolicySettings" data-anchor="settings-remote-root-policy"><\/div>/);
  assert.match(panel, /function renderRemoteRootPolicySettings\(state\)/);
  assert.match(panel, /data-key="allowedRoots"/);
  assert.match(panel, /data-key="deniedRoots"/);
  assert.match(panel, /data-command="saveRemoteRootPolicy" data-config-scope="remotePolicy"/);
  assert.match(extension, /remoteRootPolicy: remoteRootPolicyConfig\(\)/);
});

test("saving remote root policies writes the workspace configuration", () => {
  const start = extension.indexOf("async saveRemoteRootPolicyFromUi(message)");
  const end = extension.indexOf("async chooseResultCsvDirFromUi()", start);
  assert.ok(start >= 0 && end > start);
  const method = extension.slice(start, end);
  assert.match(method, /config\.update\("remote\.allowedRoots", allowedRoots, vscode\.ConfigurationTarget\.WorkspaceFolder\)/);
  assert.match(method, /config\.update\("remote\.deniedRoots", deniedRoots, vscode\.ConfigurationTarget\.WorkspaceFolder\)/);
  assert.match(method, /ApiWorkflow_1\.normalizeApiRemotePath\(item\)/);
});
