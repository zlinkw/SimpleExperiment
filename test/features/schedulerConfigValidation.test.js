const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../../src/extension/legacy.ts'), 'utf8');
const begin = source.indexOf('    async saveSchedulerConfigFromUi(message)');
const end = source.indexOf('    async saveWorkerConfigFromUi(message)', begin);
assert.ok(begin >= 0 && end > begin);

function fixture() {
  const calls = [], events = [];
  const box = {
    recordField: message => message.patch,
    numberRangePatch: (patch, key, fallback) => { if (patch[key] === 'invalid') throw Error(`invalid ${key}`); return patch[key] ?? fallback; },
    GpuQuotaScheduling: { quotaSettings: () => ({ gpuQuota: 2 }) },
    vscode: { ConfigurationTarget: { Global: 'global' }, workspace: { getConfiguration: () => ({ update: async (...args) => calls.push(args) }) },
      window: { showInformationMessage: () => {} } },
  };
  vm.createContext(box);
  vm.runInContext(ts.transpileModule(`class Host { ${source.slice(begin, end)} } this.Host = Host;`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, box);
  const host = new box.Host();
  Object.assign(host, { schedulerSettings: () => ({}), startAvailabilityPushLoop: () => events.push('loop'), postState: () => events.push('state') });
  return { host, calls, events };
}

test('invalid scheduler fields cause no configuration writes', async () => {
  const f = fixture();
  await assert.rejects(f.host.saveSchedulerConfigFromUi({ patch: { workerActionMaxConcurrent: 'invalid' } }), /invalid workerActionMaxConcurrent/);
  assert.equal(f.calls.length, 0); assert.equal(f.events.length, 0);
});

test('valid scheduler settings preserve all updates and completion behavior', async () => {
  const f = fixture();
  await f.host.saveSchedulerConfigFromUi({ patch: { pollSeconds: 30 } });
  assert.equal(f.calls.length, 10);
  assert.ok(f.calls.some(([key, value, target]) => key === 'scheduler.pollSeconds' && value === 30 && target === 'global'));
  assert.ok(f.calls.some(([key, value]) => key === 'scheduler.dispatchMode' && value === 'local_idle'));
  assert.deepEqual(f.events, ['loop', 'state']);
});
