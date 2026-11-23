const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../../src/extension/legacy.ts'), 'utf8');
const start = source.indexOf('    async deleteWorkerConfigFromUi(message)');
const end = source.indexOf('    async startTunnelEndpointFromUi(message)', start);
assert.ok(start >= 0 && end > start);

function fixture(prompt) {
  const writes = [], box = {
    stringField: (message, key) => message[key], vscode: { window: { showWarningMessage: prompt } },
    XshellTunnelSetup_1: { normalizeXshellSetupConfig: value => value }, UiCommandCancelled: class extends Error {},
  };
  vm.createContext(box);
  vm.runInContext(ts.transpileModule(`class Host { ${source.slice(start, end)} } this.Host = Host;`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, box);
  const host = new box.Host();
  host.setupConfig = { workerTunnels: [{ id: 'a', host: 'original' }, { id: 'b', host: 'other' }] };
  host.applySetupDraft = async draft => writes.push(draft);
  return { host, writes };
}

test('worker changed during confirmation cannot be deleted', async () => {
  let f;
  f = fixture(async () => { f.host.setupConfig.workerTunnels[0].host = 'changed'; return '删除'; });
  await assert.rejects(f.host.deleteWorkerConfigFromUi({ endpointId: 'a' }), /配置已变化/);
  assert.equal(f.writes.length, 0);
});

test('confirmation deletes only the selected unchanged worker; cancellation writes nothing', async () => {
  let f = fixture(async () => '删除');
  await f.host.deleteWorkerConfigFromUi({ endpointId: 'a' });
  assert.equal(f.writes.length, 1); assert.deepEqual(Array.from(f.writes[0].workerTunnels, row => row.id), ['b']);
  f = fixture(async () => undefined);
  await assert.rejects(f.host.deleteWorkerConfigFromUi({ endpointId: 'a' }), /取消删除/);
  assert.equal(f.writes.length, 0);
});
