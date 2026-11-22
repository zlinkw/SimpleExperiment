const assert = require('node:assert/strict');
const test = require('node:test');
require('../_helpers/registerTsRequire');

const store = (initial = {}) => {
  const data = { ...initial };
  return { data, get: key => data[key], update: async (key, value) => { data[key] = value; } };
};

test('onboarding facts persist by project and profile across workspace containers and reset', async () => {
  const { readOnboardingFact, hasOnboardingFact, writeOnboardingFact, migrateOnboardingFacts } = require('../../src/core/ProjectOnboardingState.ts');
  const globalState = store(), folder = { globalState, workspaceState: store({
    'simpleExperiment.projectOnboardingCompleted': true, 'simpleExperiment.projectOnboardingPromptVersion': 1,
  }) };
  const root = 'c:/synthetic/project';
  await migrateOnboardingFacts(folder, root);
  const workspace = { globalState, workspaceState: store() };
  assert.equal(readOnboardingFact(workspace, root, 'projectOnboardingCompleted'), true);
  assert.equal(readOnboardingFact(workspace, root, 'projectOnboardingPrompt'), 1);
  assert.equal(readOnboardingFact(workspace, 'c:/synthetic/other', 'projectOnboardingCompleted'), undefined);
  assert.equal(readOnboardingFact(folder, 'c:/synthetic/other', 'projectOnboardingCompleted'), undefined);
  await migrateOnboardingFacts(folder, 'c:/synthetic/other');
  assert.equal(readOnboardingFact({ globalState, workspaceState: store() }, 'c:/synthetic/other', 'projectOnboardingCompleted'), undefined);
  assert.equal(readOnboardingFact({ globalState: store(), workspaceState: store() }, root, 'projectOnboardingCompleted'), undefined);
  await writeOnboardingFact(workspace, root, 'projectOnboardingCompleted', false);
  assert.equal(readOnboardingFact(folder, root, 'projectOnboardingCompleted'), false);
  await writeOnboardingFact(workspace, root, 'projectOnboardingCompleted', undefined);
  assert.equal(hasOnboardingFact(folder, root, 'projectOnboardingCompleted'), true);
  assert.equal(readOnboardingFact(folder, root, 'projectOnboardingCompleted'), undefined);
  await migrateOnboardingFacts(folder, root);
  assert.equal(readOnboardingFact(folder, root, 'projectOnboardingCompleted'), undefined);
  assert.equal(readOnboardingFact(folder, '', 'projectOnboardingCompleted'), undefined);
  await assert.rejects(writeOnboardingFact(folder, '', 'projectOnboardingCompleted', true), /工作区/);
});

test('failed onboarding migration retains legacy facts and can retry', async () => {
  const { readOnboardingFact, migrateOnboardingFacts } = require('../../src/core/ProjectOnboardingState.ts');
  const globalState = store(), workspaceState = store({ 'simpleExperiment.projectOnboardingCompleted': true });
  const update = globalState.update; let fail = true;
  globalState.update = async (...args) => { if (fail) { fail = false; throw Error('storage unavailable'); } return update(...args); };
  const context = { globalState, workspaceState }, root = 'c:/synthetic/project';
  await assert.rejects(migrateOnboardingFacts(context, root), /storage unavailable/);
  assert.equal(workspaceState.get('simpleExperiment.projectOnboardingCompleted'), true);
  await migrateOnboardingFacts(context, root);
  assert.equal(readOnboardingFact({ globalState, workspaceState: store() }, root, 'projectOnboardingCompleted'), true);
});

test('actual API, prompt and panel consumers share the project fact and retain confirmation', async () => {
  const ts = require('typescript'), vm = require('node:vm'), path = require('node:path');
  const { readSource } = require('../_helpers/sourceReader'), legacyMethod = require('../_helpers/legacyMethod');
  const facts = require('../../src/core/ProjectOnboardingState.ts');
  const source = readSource('src/extension.ts');
  const methods = ['apiStateValue', 'apiStateList', 'apiStateGet', 'apiStateSet', 'apiStateReset', 'markProjectOnboardingComplete', 'showFirstRunSetupPromptOnceCore']
    .map(name => legacyMethod(source, name + '()')).join('\n');
  let promptCount = 0;
  const folders = [{ uri: {} }], vscode = { workspace: { workspaceFolders: folders },
    window: { showWarningMessage: async () => { promptCount++; return '不再提示'; } } };
  let activeRoot = 'C:/synthetic/project';
  const stateKeys = { projectOnboardingPrompt: 'simpleExperiment.projectOnboardingPromptVersion', projectOnboardingCompleted: 'simpleExperiment.projectOnboardingCompleted' };
  const meta = Object.fromEntries(Object.keys(stateKeys).map(key => [key, { store: 'global', writable: true, label: key }]));
  const sandbox = { ...facts, keys: stateKeys, API_STATE_KEYS: meta, vscode, process,
    workspaceRoot: () => activeRoot, stringField: (object, key) => object[key] || '',
    normalizeApiStateValue: (key, value) => key === 'projectOnboardingCompleted' ? Boolean(value) : Number(value),
    redactApiStateValue: (_, value) => value, confirmationRequired: () => Error('CONFIRM_REQUIRED'),
    UiCommandCancelled: Error, path, simpleSftpIntegrationReadiness: () => ({ ready: true }),
    legacySftpInstallationState: () => ({}), initialServerSetupComplete: () => true };
  const ast = ts.createSourceFile('legacy.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const rootHelpers = ast.statements.filter(n => ts.isFunctionDeclaration(n) && ['localPathKey', 'projectOnboardingRoot'].includes(n.name?.text)).map(n => n.getText(ast)).join('\n');
  const compiled = ts.transpileModule(rootHelpers + '\nglobalThis.projectOnboardingRoot=projectOnboardingRoot;\nglobalThis.hostMethods = {' + methods + '};', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(compiled, sandbox);
  const context = { globalState: store(), workspaceState: store({ 'simpleExperiment.projectOnboardingCompleted': true }) };
  const host = Object.assign({ context, projectContextGeneration: 0, captureProjectContext: () => ({ root: 'C:/synthetic/project' }),
    projectContextIsCurrent: () => true, postState() {}, projectLocallyRecognized: () => true,
    enabledWorkerConfigs: () => [{}], setupConfig: {}, lastCodeSyncState: {} }, sandbox.hostMethods);
  await assert.rejects(host.apiStateSet({ key: 'projectOnboardingCompleted', value: true }), /CONFIRM_REQUIRED/);
  let finishBootstrap;
  host.projectBootstrapPromise = new Promise(resolve => { finishBootstrap = resolve; });
  const setting = host.apiStateSet({ key: 'projectOnboardingCompleted', value: false, confirm: true });
  await facts.migrateOnboardingFacts(context, sandbox.projectOnboardingRoot());
  finishBootstrap();
  await setting;
  assert.equal(host.apiStateValue('projectOnboardingCompleted'), false);
  await host.markProjectOnboardingComplete({ root: 'C:/synthetic/project' });
  assert.equal((await host.apiStateGet({ key: 'projectOnboardingCompleted' })).value, true);
  assert.equal((await host.apiStateList()).keys.find(x => x.key === 'projectOnboardingPrompt').value, 1);
  await host.showFirstRunSetupPromptOnceCore();
  assert.equal(promptCount, 0);
  context.workspaceState = store();
  activeRoot = 'C:/SYNTHETIC/other/../project';
  assert.equal((await host.apiStateGet({ key: 'projectOnboardingCompleted' })).value, true);
  await host.apiStateSet({ key: 'projectOnboardingCompleted', value: false, confirm: true });
  assert.equal(host.apiStateValue('projectOnboardingCompleted'), false);
  const start = source.indexOf('        const onboardingCompleted = this.apiStateValue("projectOnboardingCompleted");');
  const end = source.indexOf('\n        const resultRoot =', start);
  assert.ok(start > 0 && end > start);
  const panel = new Function('hasOnboardingFact', 'projectOnboardingRoot', 'projectOnboardingStateForWebview',
    'projectOnboardingCompletedFromCodeSync', 'workspace', 'topology', 'integrations',
    source.slice(start, end) + '\nreturn projectOnboarding;');
  const render = () => panel.call(host, facts.hasOnboardingFact, sandbox.projectOnboardingRoot, x => x, () => true,
    {}, {}, { simpleSftp: {} });
  assert.equal(render().completed, false);
  assert.equal(render().recognized, false);
  await host.apiStateReset({ key: 'projectOnboardingCompleted', confirm: true });
  assert.equal(host.apiStateValue('projectOnboardingCompleted'), undefined);
  assert.equal(render().completed, false);
  assert.equal(render().recognized, false);
  await host.apiStateReset({ key: 'projectOnboardingPrompt', confirm: true });
  await host.showFirstRunSetupPromptOnceCore();
  assert.equal(promptCount, 1);
  assert.equal(host.apiStateValue('projectOnboardingPrompt'), 1);
  activeRoot = 'C:/synthetic/other'; host.projectContextGeneration = 1;
  assert.equal(host.apiStateValue('projectOnboardingCompleted'), undefined);
  activeRoot = 'C:/synthetic/project'; host.projectContextGeneration = 0;
  vscode.workspace.workspaceFolders.push({ uri: {} });
  await assert.rejects(host.apiStateSet({ key: 'projectOnboardingCompleted', value: true, confirm: true }), /工作区/);
  assert.equal(host.apiStateValue('projectOnboardingCompleted'), undefined);
});
