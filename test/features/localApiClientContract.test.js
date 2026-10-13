const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { callLocalRpc, validateDiscovery, readLocalDiscovery, requestLocalJson } = require('../../dist/cli/LocalApiClient');
async function fixture(t) {
  const calls = [], state = { contract: { schemaVersion: 1, rpc: 'json-rpc-2.0', methods: ['status'] }, result: { jsonrpc: '2.0', id: 1, result: { ok: true } } };
  const server = http.createServer((req, res) => { calls.push(req.url); assert.equal(req.headers.authorization, 'Bearer fixture');
    if (req.url === '/api/v1/capabilities') res.end(JSON.stringify(state.contract));
    else { req.resume(); res.end(JSON.stringify(state.result)); } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
  const discovery = { baseUrl: 'http://127.0.0.1:' + server.address().port, token: 'fixture' };
  return { calls, state, discovery };
}
test('reads live capabilities before each RPC, rejecting unavailable methods and malformed receipts', async t => {
  const f = await fixture(t); const read = () => f.discovery;
  await callLocalRpc(read, 'status', {}); await callLocalRpc(read, 'status', {});
  assert.deepEqual(f.calls, ['/api/v1/capabilities', '/api/v1/rpc', '/api/v1/capabilities', '/api/v1/rpc']);
  await assert.rejects(callLocalRpc(read, 'runPlan', {}), /unavailable/); assert.equal(f.calls.at(-1), '/api/v1/capabilities');
  f.state.result = { jsonrpc: '2.0', id: 2, result: {} }; await assert.rejects(callLocalRpc(read, 'status', {}), /JSON-RPC/);
});
test('changed discovery or mismatched capability version cannot POST', async t => {
  const f = await fixture(t); let reads = 0;
  await assert.rejects(callLocalRpc(() => ({ ...f.discovery, token: ++reads === 1 ? 'fixture' : 'changed' }), 'status', {}), /changed/);
  assert.ok(!f.calls.includes('/api/v1/rpc'));
  await assert.rejects(callLocalRpc(() => ({ ...f.discovery, version: '1.0.0' }), 'status', {}), /mismatched/);
});
test('an old running extension cannot accept a new workflow before its workspace guard protocol is loaded', async t => {
  const f = await fixture(t); f.state.contract.methods.push('workflow.run');
  await assert.rejects(callLocalRpc(() => f.discovery, 'workflow.run', {}), /reload/); assert.ok(!f.calls.includes('/api/v1/rpc'));
  f.state.contract.methodOptions = { 'workflow.run': { workspaceIdentityRechecked: true } };
  await callLocalRpc(() => f.discovery, 'workflow.run', {}); assert.equal(f.calls.at(-1), '/api/v1/rpc');
});
test('loopback/UTF-8/size gates reject external or stopped listeners without leaking secrets', async t => {
  for (const baseUrl of ['https://127.0.0.1:12', 'http://example.com:12', 'http://user:pass@127.0.0.1:12', 'http://127.0.0.1']) assert.throws(() => validateDiscovery({ baseUrl, token: 'fixture' }), /loopback/);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rpc-discovery-evidence-')), file = path.join(dir, 'api.json');
  fs.writeFileSync(file, Buffer.from([0xff])); assert.throws(() => readLocalDiscovery(file));
  fs.writeFileSync(file, 'fixture-secret-MUSTNOTAPPEAR {', 'utf8');
  assert.throws(() => readLocalDiscovery(file), e => !e.message.includes('MUSTNOTAPPEAR') && /withheld/.test(e.message));
  fs.writeFileSync(file, 'x'.repeat(65537), 'utf8'); assert.throws(() => readLocalDiscovery(file), /discovery/);
  const f = await fixture(t); await assert.rejects(requestLocalJson(f.discovery, '/api/v1/capabilities', undefined, 10), /size/);
  await assert.rejects(callLocalRpc(() => f.discovery, 'status', { value: 'a'.repeat(4 * 1024 * 1024) }), /size/);
});
