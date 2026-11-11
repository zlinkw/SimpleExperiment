const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { readSource } = require("../_helpers/sourceReader");

test("tunnel setup uses the shared profile boundary while preserving existing API entry names", () => {
  const source = readSource("src/extension.ts");
  assert.match(source, /readProjectConnectionValue\(this\.context, workspaceRoot\(\), keys\.setupConfig\)/);
  assert.match(source, /const setup = persistedXshellSetupConfig\(this\.setupConfig\)/);
  assert.match(source, /saveProjectConnectionValues\(this\.context, workspaceRoot\(\), \{ \[keys\.tunnelConfig\]: tunnel, \[keys\.setupConfig\]: setup \}\)/);
  assert.doesNotMatch(source, /globalState\.update\(keys\.(?:setupConfig|tunnelConfig)/);
});

test("shared Conda defaults retain their save while resource prefix is explicitly global", () => {
  const source = readSource("src/extension.ts");
  assert.match(source, /setupConfigurationSignature: "simpleExperiment\.setupConfigurationSignature"/);
  assert.match(source, /savedDefaultsWin = condaSignature === this\.sessionDefaultConfigurationSignature\(sessionDefaults\)/);
  assert.doesNotMatch(source.slice(source.indexOf("sessionDefaultInspections(config ="), source.indexOf("gpuOwnerConfig() {", source.indexOf("sessionDefaultInspections(config ="))), /remoteTmuxSessionPrefix/);
  assert.match(source, /const explicit = \(0, ConfigurationSettings_1\.globalConfigurationValue\)\(config, key, savedValue === undefined \? fallback : savedValue\)/);
  assert.match(source, /!hasStoredSignature && explicit === fallback && savedValue !== undefined && savedValue !== fallback\s*\?\s*savedValue\s*:\s*explicit/);
  const ts = require("typescript");
  const ast = ts.createSourceFile("host.ts", source, ts.ScriptTarget.Latest, true);
  const cls = ast.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === "RealtimeTunnelPanelProvider");
  const method = name => cls.members.find(node => node.name?.getText(ast) === name).getText(ast);
  const save = method("applySetupDraft");
  assert.doesNotMatch(save, /ConfigurationTarget\.Global|configuration\.update\(/);
  assert.match(save, /options\.saveGlobalResourcePrefix === true[\s\S]*persistGlobalResourcePrefix\(patch\.remoteTmuxSessionPrefix\)/);
  const globalSave = method("persistGlobalResourcePrefix");
  assert.match(globalSave, /update\("tunnel\.remoteTmuxSessionPrefix", prefix, vscode\.ConfigurationTarget\.Global\)/);
  assert.doesNotMatch(globalSave, /update\("tunnel\.(?:condaEnv|workerTunnels|localForwardPort|remoteAgentPort)"/);
  assert.ok(save.indexOf('await this.saveState()') < save.indexOf('await saveProjectConnectionValues('));
  assert.match(save, /\[keys\.setupConfigurationSignature\]: this\.sessionDefaultConfigurationSignature\(\)/);
});
