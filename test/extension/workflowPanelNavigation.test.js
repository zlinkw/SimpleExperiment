const assert = require("node:assert/strict");
const test = require("node:test");
const { resolveCommandHandlerMap } = require("../../dist/extension/ProviderCommands.js");
const { readSource } = require("../_helpers/sourceReader");

test("workflow panel command is bound and navigation does not call an unbound command", async () => {
  let focused = false;
  const handlers = resolveCommandHandlerMap({ openPanel() { focused = true; } });
  await handlers["simpleExperiment.openPanel"]();
  assert.equal(focused, true);
  const source = readSource("src/extension/legacy.ts");
  const openPanel = source.slice(source.indexOf("async openPanel()"), source.indexOf("async flushPendingPanelNavigation()"));
  assert.match(openPanel, /executeCommand\(`\$\{viewId\}\.focus`\)/);
  assert.match(openPanel, /await this\.openPanel\(\)/);
});

test("manual tunnel commands retain the user-initiated probe and feedback flag", async () => {
  const { DefaultCommandFactory } = require("../../dist/factories/CommandFactory.js");
  const calls = [];
  const provider = { testTunnel(userInitiated) { assert.equal(this, provider); calls.push(userInitiated); return userInitiated; } };
  const handlerMap = resolveCommandHandlerMap(provider), factory = new DefaultCommandFactory();
  for (const id of ["simpleExperiment.testAllTunnels", "simpleExperiment.testXshellTunnel"]) {
    const descriptor = factory.createByName(id, { handlerMap });
    assert.ok(descriptor, id);
    assert.equal(await descriptor.handler(), true, id);
  }
  assert.deepEqual(calls, [true, true]);
  assert.equal(resolveCommandHandlerMap({})["simpleExperiment.testAllTunnels"], undefined, "missing business methods must remain unbound");
});

test("factory activation registers the user-facing AI authorization command and reaches the current provider", async () => {
  const Module = require("node:module");
  const { DefaultCommandFactory } = require("../../dist/factories/CommandFactory.js");
  const { registerProviderCommands } = require("../../dist/extension/ProviderCommands.js");
  const registered = new Map(), context = { subscriptions: [] };
  let invoked = 0;
  const provider = new Proxy({ manageAiAuthorizationFromUi() { invoked += 1; } }, {
    get(target, name) { return target[name] || (() => undefined); },
  });
  const original = Module._load;
  Module._load = function(name, parent, isMain) {
    if (name === "vscode") return { commands: { registerCommand(id, handler) { registered.set(id, handler); return { dispose() {} }; } } };
    return original.call(this, name, parent, isMain);
  };
  try {
    registerProviderCommands({ factoryContext: {}, commandFactory: new DefaultCommandFactory(), provider }, context);
    assert.equal(typeof registered.get("simpleExperiment.manageAiAuthorization"), "function");
    await registered.get("simpleExperiment.manageAiAuthorization")();
    assert.equal(invoked, 1);
  } finally { Module._load = original; }
});

test("the actual factory activation refreshes shared settings when the project window regains focus", async () => {
  const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm"), ts = require("typescript");
  let focused, refreshes = 0, reminders = 0;
  const provider = { resolveWebviewView() {}, refreshSharedConnectionSettings() { refreshes += 1; }, remindSharedConnectionSettings() { reminders += 1; } };
  const noop = () => ({ dispose() {} });
  const vscode = { window: { registerWebviewViewProvider: noop, onDidChangeWindowState(handler) { focused = handler; return noop(); } },
    workspace: { onDidChangeConfiguration: noop, onDidChangeWorkspaceFolders: noop } };
  const modules = {
    "vscode": vscode, "./ExtensionContext": { toFactoryContext: () => ({}) },
    "../factories/ServiceFactory": { DefaultServiceFactory: class { createPanelProvider() { return provider; } commands = {}; } },
    "./ProviderCommands": { registerProviderCommands() {} },
    "./GitBackupSetup": { registerGitBackupCommands() {}, registerGitHubSyncCommands() {}, maybeAutoInstallGitBackup() {} },
    "../config/RenamedExtensionStateMigration": { migrateRenamedExtensionState: async () => undefined },
  };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, "../../src/extension/Activation.ts"), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, require: name => { assert.ok(modules[name], name); return modules[name]; }, console: { log() {}, error: message => assert.fail(message) },
    process: { env: {} }, setTimeout: () => ({}), clearTimeout() {}, });
  await exports.activateExtension({ subscriptions: [] });
  assert.equal(typeof focused, "function");
  focused({ focused: false }); await Promise.resolve();
  assert.equal(refreshes, 0);
  focused({ focused: true }); await Promise.resolve(); await Promise.resolve();
  assert.equal(refreshes, 1); assert.equal(reminders, 1);
});

test("leased factory commands reach the bound project provider and preserve lease rejection", async () => {
  const Module = require("node:module");
  const { DefaultCommandFactory, COMMAND_MANIFEST } = require("../../dist/factories/CommandFactory.js");
  const { registerProviderCommands } = require("../../dist/extension/ProviderCommands.js");
  const registered = new Map(), calls = [];
  let denied = false;
  const provider = new Proxy({
    async withHostOperationLease(action, label, work) {
      assert.equal(this, provider);
      calls.push({ action, label });
      if (denied) throw new Error("fixture project lease conflict");
      return work();
    },
  }, { get(target, name) { return target[name] || ((...args) => { calls.push({ method: name, args }); return name; }); } });
  const original = Module._load;
  Module._load = function(name, parent, isMain) {
    if (name === "vscode") return { commands: { registerCommand(id, handler) { registered.set(id, handler); return { dispose() {} }; } } };
    return original.call(this, name, parent, isMain);
  };
  try {
    registerProviderCommands({ factoryContext: {}, commandFactory: new DefaultCommandFactory(), provider }, { subscriptions: [] });
    for (const descriptor of COMMAND_MANIFEST.filter(row => row.withLease !== false)) {
      calls.length = 0;
      await registered.get(descriptor.id)("selected-target");
      assert.equal(calls[0].action, descriptor.id);
      assert.equal(calls[0].label, descriptor.title);
      assert.deepEqual(calls[1].args, ["selected-target"]);
    }
    calls.length = 0; denied = true;
    await assert.rejects(registered.get("simpleExperiment.verifyAgentVersion")(), /fixture project lease conflict/);
    assert.equal(calls.length, 1, "a rejected lease must not reach the business method");
    const missing = new Proxy({}, { get: (_, name) => name === "withHostOperationLease" ? undefined : () => undefined });
    registerProviderCommands({ factoryContext: {}, commandFactory: new DefaultCommandFactory(), provider: missing }, { subscriptions: [] });
    await assert.rejects(registered.get("simpleExperiment.verifyAgentVersion")(), /缺少 HostOperationLease/);
  } finally { Module._load = original; }
});

test("factory registers the existing operation-log and Xshell entry points with their real handlers", async () => {
  const { DefaultCommandFactory } = require("../../dist/factories/CommandFactory.js");
  const calls = [];
  const handlerMap = resolveCommandHandlerMap({ showOperationLogFromUi: () => calls.push("log"), openAllXshellSessions: () => calls.push("xshell") });
  const factory = new DefaultCommandFactory();
  for (const id of ["simpleExperiment.showOperationLog", "simpleExperiment.openXshellSessions"]) {
    const descriptor = factory.createByName(id, { handlerMap });
    assert.ok(descriptor, id);
    await descriptor.handler();
  }
  assert.deepEqual(calls, ["log", "xshell"]);
});

test('operation log actions keep exact identity, nested evidence and full-file provenance', async () => {
  const ts = require('typescript'), vm = require('node:vm');
  const source = readSource('src/extension/legacy.ts');
  const ast = ts.createSourceFile('log-actions.ts', source, ts.ScriptTarget.Latest, true);
  const names = new Set(['operationLogSource', 'showLogHistoryFromUi', 'openFullLogFromUi']);
  const methods = []; let redact;
  function visit(node) {
    if (ts.isMethodDeclaration(node) && names.has(node.name?.getText(ast))) methods.push(node.getText(ast));
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'redactSensitiveText') redact = node.getText(ast);
    ts.forEachChild(node, visit);
  }
  visit(ast); assert.equal(methods.length, names.size); assert.ok(redact);
  const notices = [], documents = [], picks = [], reads = [], copied = [];
  let choose = async () => undefined, copyError;
  const context = vm.createContext({
    vscode: {window: {showInformationMessage: text => notices.push(text),
      showQuickPick: async (items, options) => {picks.push({items, options}); return choose(items);}, showTextDocument: async doc => documents.push(doc)},
      workspace: {openTextDocument: async doc => doc}, env: {clipboard: {writeText: async text => {if (copyError) throw copyError; copied.push(text);}}}},
    normalizeRemoteResultInspectionPath: value => value.startsWith('work_dirs/') ? value : '', UiCommandCancelled: Error,
  });
  const code = ts.transpileModule(redact + '\nthis.Host = class {\n' + methods.join('\n') + '\n};',
    {compilerOptions: {target: ts.ScriptTarget.ES2022}}).outputText;
  vm.runInContext(code, context);
  const rows = {one: {operationId: 'exact', planFile: 'plans/one.yaml', payload: {evidence: {
    liveLogTail: 'epoch 1\ntoken=secret-value\nepoch 2', logPath: 'work_dirs/one/train.log', workerId: 'worker-a'}}},
    other: {operationId: 'other', planFile: 'plans/one.yaml', logTail: 'WRONG LOG', logPath: 'work_dirs/other/train.log'}};
  const host = new context.Host(); let current = true;
  Object.assign(host, {buildState: () => ({operations: rows}), captureProjectContext: () => ({root: 'test-project'}),
    projectContextIsCurrent: () => current, client: {}, resultInspectionContent: file => file.text,
    downloadMetricMemoryBatch: async (scope, client, batch) => {reads.push({scope, client, batch}); return {metricFiles: [{text: 'complete file\npassword=private-value'}]};}});
  await host.showLogHistoryFromUi({operationId: 'exact', planFile: 'wrong.yaml'});
  assert.match(picks[0].options.title, /exact/);
  assert.equal(picks[0].items.length, 3); assert.match(picks[0].items[1].detail, /已脱敏/);
  assert.doesNotMatch(JSON.stringify(picks), /secret-value|WRONG LOG/);
  assert.deepEqual(copied, [], 'cancelling the picker copies nothing');
  choose = async items => items[1]; await host.showLogHistoryFromUi({operationId: 'exact'});
  assert.deepEqual(copied, [picks[1].items[1].detail]);
  copyError = new Error('clipboard failed');
  await assert.rejects(host.showLogHistoryFromUi({operationId: 'exact'}), /clipboard failed/); copyError = undefined;
  let resolvePick; choose = () => new Promise(resolve => {resolvePick = resolve;});
  const pendingPick = host.showLogHistoryFromUi({operationId: 'exact'});
  current = false; resolvePick({detail: 'old-project-log'});
  await assert.rejects(pendingPick, /项目已切换/);
  assert.equal(copied.length, 1, 'a stale selection cannot reach the clipboard'); current = true;
  const cancelledPick = host.showLogHistoryFromUi({operationId: 'exact'});
  current = false; resolvePick(undefined); await cancelledPick;
  assert.equal(copied.length, 1, 'cancelling after a switch remains a no-op'); current = true;
  await host.openFullLogFromUi({operationId: 'exact'});
  assert.equal(reads[0].batch.workerId, 'worker-a'); assert.equal(reads[0].batch.entries[0].remotePath, 'work_dirs/one/train.log');
  assert.equal(reads[0].scope.resultInspection, true);
  assert.match(documents[0].content, /操作：exact/); assert.match(documents[0].content, /complete file/);
  assert.doesNotMatch(documents[0].content, /private-value|epoch 1|WRONG LOG/);
  await assert.rejects(host.openFullLogFromUi({operationId: 'missing', planFile: 'plans/one.yaml'}), /无法唯一定位/);
  await assert.rejects(host.openFullLogFromUi({planFile: 'plans/one.yaml'}), /无法唯一定位/);
  rows.empty = {operationId: 'empty'};
  await host.showLogHistoryFromUi({operationId: 'empty'}); await host.openFullLogFromUi({operationId: 'empty'});
  assert.ok(notices.every(text => text.includes('empty'))); assert.equal(reads.length, 1);
  current = false; await host.openFullLogFromUi({operationId: 'exact'});
  assert.equal(documents.length, 1, 'a completed read cannot open a log in another project');
  current = true; host.downloadMetricMemoryBatch = async () => {throw new Error('real read failed');};
  await assert.rejects(host.openFullLogFromUi({operationId: 'exact'}), /real read failed/);
});
