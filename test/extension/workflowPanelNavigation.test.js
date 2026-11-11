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
