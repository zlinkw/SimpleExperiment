const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../../src/extension/legacy.ts'), 'utf8');
const start = source.indexOf('    async startAgentEndpointFromUi(message)');
const end = source.indexOf('    async withRemoteActionResource(', start);
assert.ok(start >= 0 && end > start);
const startAgent = new Function('stringField', `return ({${source.slice(start, end)}}).startAgentEndpointFromUi;`)((message, key) => message[key] || '');

test('Agent start requires the explicitly selected Worker', async () => {
  const requests = [], host = { deployLatestAgentRuntime: async (...args) => requests.push(args) };
  await assert.rejects(startAgent.call(host, {}), /明确的 Worker/);
  assert.equal(requests.length, 0);
  await startAgent.call(host, { endpointId: 'worker-2' });
  assert.deepEqual(requests, [[true, false, ['worker-2']]]);
});
