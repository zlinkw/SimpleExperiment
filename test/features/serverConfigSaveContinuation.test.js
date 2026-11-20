const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { readSource } = require("../_helpers/sourceReader");

const source = readSource("src/extension.ts");
const readme = fs.readFileSync(path.join(__dirname, "../../README.md"), "utf8");
const legacyNotes = fs.readFileSync(path.join(__dirname, "../../docs/technical-notes.md"), "utf8");
const guide = fs.readFileSync(path.join(__dirname, "../../docs/simple-experiment-setup.md"), "utf8");

test("manual server saves show computed destinations before offering one next step", () => {
  const helper = source.slice(source.indexOf("serverConfigSavedMessage(label, actualWorkRoot)"), source.indexOf("async saveHubConfigFromUi"));
  assert.match(helper, /当前项目代码：\$\{dirs\.workDir\}/);
  assert.match(helper, /Agent runtime：\$\{dirs\.installDir\}\/simple_cluster\/runtime/);
  assert.match(helper, /打开目标本地项目后再计算代码上传位置/);
  assert.match(helper, /if \(!workspaceRoot\(\)\)[\s\S]{0,320}"选择项目并继续"/);
  assert.match(helper, /next === "选择项目并继续"[\s\S]{0,140}openWorkspaceFolderForContinuation\(`\$\{label\} 配置`, "quickSetup"/);
  assert.match(helper, /打开配置说明/);
  assert.match(helper, /if \(!enabledWorkers\.length\)[\s\S]{0,260}"添加 Worker"/);
  assert.match(helper, /initialServerSetupComplete\(this\.setupConfig, false\)/);
  assert.match(helper, /assertTopologyActualWorkRoots\("完成服务器设置"\)/);
  assert.match(helper, /showInformationMessage\(message, "准备 Agent 并启动"\)/);
  assert.doesNotMatch(helper, /showInformationMessage\(message, "准备 Agent 并启动",/);
  assert.match(helper, /next === "准备 Agent 并启动"\)\s*await this\.prepareAgentsForFirstRun\(\)/);
});

test("retired Hub saves reject while Worker saves persist before continuation", async () => {
  const method=require('../_helpers/legacyMethod');
  const hub=method(source,'saveHubConfigFromUi(');
  const reject=new Function('return ({'+hub+'}).saveHubConfigFromUi;')();
  await assert.rejects(reject.call({},{}),/HUB_REMOVED/);
  const worker=method(source,'saveWorkerConfigCore('),wrapper=method(source,'saveWorkerConfigFromUi(');
  assert.ok(worker.indexOf("applySetupDraft")>=0&&worker.indexOf("applySetupDraft")<worker.indexOf("showServerConfigSavedNextStep"));
  assert.match(worker,/savedWorker\?\.displayName \|\| endpointId/);
  assert.match(wrapper,/saveWorkerConfigCore/);
  assert.doesNotMatch(worker,/refreshXshellSessionLibrary\(/);
  assert.match(worker,/ensureXshellSessionLoaded\(selectedWorker\?\.savedSessionPath\)/);
  assert.doesNotMatch(worker,/Promise\.all\(manual\.workerTunnels\.map/);
  assert.match(worker,/void this\.showServerConfigSavedNextStep\(/);
});

test("deleting a Worker confirms and changes only the selected configuration", async () => {
  const method = require('../_helpers/legacyMethod')(source, 'deleteWorkerConfigFromUi(');
  const workers = ['NWPU3', 'NWPU2', 'NWPU5', 'jqg_h20_zlk', 'rjj8'].map(id => ({ id, enabled: true }));
  for (const endpointId of workers.map(worker => worker.id)) {
    for (const confirmed of [false, true]) {
      const prompts = [], writes = [];
      const vscode = { window: { showWarningMessage: async (...args) => {
        prompts.push(args); return confirmed ? '删除' : undefined;
      } } };
      const UiCommandCancelled = require('../../dist/core/UiCommandCancelled.js').UiCommandCancelled;
      const remove = new Function('stringField', 'vscode', 'XshellTunnelSetup_1', 'UiCommandCancelled',
        'return ({' + method + '}).deleteWorkerConfigFromUi;')(
        (message, key) => message[key], vscode, { normalizeXshellSetupConfig: value => value }, UiCommandCancelled);
      const host = { setupConfig: { workerTunnels: workers }, applySetupDraft: async (...args) => writes.push(args) };
      if (confirmed) await remove.call(host, { endpointId });
      else await assert.rejects(remove.call(host, { endpointId }), UiCommandCancelled);
      assert.equal(prompts.length, 1);
      assert.match(prompts[0][0], new RegExp(endpointId));
      assert.equal(writes.length, confirmed ? 1 : 0);
      if (confirmed) {
        assert.deepEqual(writes[0][0].workerTunnels.map(worker => worker.id),
          workers.filter(worker => worker.id !== endpointId).map(worker => worker.id));
        assert.deepEqual(writes[0][1], { syncAssignmentsFromFields: true });
      }
    }
  }
});

test('Worker import cancellation writes nothing and confirmation saves the selected session', async () => {
  const method = require('../_helpers/legacyMethod')(source, 'addWorkerConfigFromUi(');
  for (const selected of [undefined, { id: 'new-worker', displayName: 'New', savedSessionPath: 'sessions/new.xsh' }]) {
    const calls = [];
    const add = new Function('promptSavedSessionWorker', 'XshellTunnelSetup_1', 'vscode',
      'return ({' + method + '}).addWorkerConfigFromUi;')(
      async (...args) => { calls.push(['prompt', ...args]); return selected; },
      { normalizeXshellSetupConfig: value => value }, { window: { showInformationMessage: async () => {} } });
    const host = {
      setupConfig: { workerTunnels: [{ id: 'existing' }], remoteAgentPort: 1, localForwardPort: 2 },
      xshellLibrary: { existingDirs: ['sessions'], searchedDirs: [], sessions: ['new.xsh'] },
      refreshXshellSessionLibrary: async options => calls.push(['refresh', options]),
      ensureXshellSessionLoaded: async path => calls.push(['load', path]),
      withImportedXshellFields: (config, id) => { calls.push(['scope', id]); return config; },
      applySetupDraft: async (config, options) => calls.push(['save', config, options]),
    };
    assert.equal(await add.call(host, false), Boolean(selected));
    assert.equal(calls.filter(row => row[0] === 'save').length, selected ? 1 : 0);
    if (selected) {
      assert.deepEqual(calls.find(row => row[0] === 'load'), ['load', selected.savedSessionPath]);
      assert.deepEqual(calls.find(row => row[0] === 'scope'), ['scope', selected.id]);
      const save = calls.find(row => row[0] === 'save');
      assert.deepEqual(save[1].workerTunnels.map(row => row.id), ['existing', selected.id]);
      assert.deepEqual(save[2], { syncAssignmentsFromFields: true });
    }
  }
});
