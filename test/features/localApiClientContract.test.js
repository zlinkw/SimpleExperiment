const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { callLocalRpc, validateDiscovery, readLocalDiscovery, requestLocalJson, pluginDiscoveryPath } = require('../../dist/cli/LocalApiClient');
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
test('legacy Windows workflow routes remain usable without a Mac-specific option field', async t => {
  const f = await fixture(t); f.state.contract.methods.push('workflow.run');
  await callLocalRpc(() => f.discovery, 'workflow.run', {}); assert.equal(f.calls.at(-1), '/api/v1/rpc');
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

// 审核清单 10：真实 SimpleSFTP 启动门禁必须以本机真实发现文件与真实监听端点为准。
// 只把 upload.workspace 替身成全成功，不能证明现场已经打通：门禁靠的是发现文件↔实时能力的身份核对。
test('real SimpleSFTP startup gate agrees with the real listener and refuses an all-OK stub', async t => {
  const discoveryPath = pluginDiscoveryPath('sftp');
  assert.ok(discoveryPath.toLowerCase().endsWith(path.join('SimpleSFTP', 'api.json').toLowerCase()),
    '门禁必须读真实发现文件而不是测试注入的路径（实际 ' + discoveryPath + '）');
  if (fs.existsSync(discoveryPath)) {
    const disk = JSON.parse(fs.readFileSync(discoveryPath, 'utf8'));
    const discovery = readLocalDiscovery(discoveryPath); // 生产校验：回环 + 显式端口 + 合法 token
    assert.equal(String(new URL(String(discovery.baseUrl)).port), String(disk.port),
      '端口必须取自发现文件，任何写死端口都过不了这一步');
    let capabilities = null;
    let failure = null;
    try { capabilities = await requestLocalJson(discovery, '/api/v1/capabilities', undefined, 1024 * 1024, 5000); }
    catch (error) { failure = error; }
    if (capabilities) {
      assert.equal(capabilities.name, 'SimpleSFTP', '能力回执必须真是 SimpleSFTP 本人');
      assert.equal(capabilities.version, disk.version, '能力回执版本必须与发现文件一致（版本不同就是另一个实例）');
      assert.equal(capabilities.schemaVersion, 1);
      assert.equal(capabilities.rpc, 'json-rpc-2.0');
      assert.ok(Array.isArray(capabilities.methods) && capabilities.methods.every(m => typeof m === 'string'));
      assert.ok(capabilities.methods.includes('upload.workspace'),
        '代码上传要用的方法必须由真实能力公告，而不是由测试替身假设');
      // 真实门禁仍然拒绝未公告的方法：证明“打通”不是无条件放行。
      await assert.rejects(callLocalRpc(() => discovery, 'upload.workspaceNotARealMethod', {}), /unavailable/);
    } else {
      // 监听器已经不在（VS Code 关掉了）：门禁必须拒绝，绝不能凭旧发现文件放行写入。
      assert.ok(failure, '端点不可达时必须有真实错误');
      await assert.rejects(callLocalRpc(() => discovery, 'upload.workspace', {}), /timed out|ECONNREFUSED|ECONNRESET|HTTP|Invalid|interrupted|socket|closed/i);
      t.diagnostic('真实 SimpleSFTP 监听器当前不可达，已按“门禁拒绝”验证：' + String(failure.message).slice(0, 160));
    }
  } else {
    t.diagnostic('本机没有 ' + discoveryPath + '：不假装打通，只验证下面这条“替身不算证据”');
  }
  // 关键反向证据：一个对任何请求都返回 { ok: true } 的替身，过不了真实门禁。
  const stub = http.createServer((req, res) => { req.resume(); res.end(JSON.stringify({ ok: true })); });
  await new Promise(resolve => stub.listen(0, '127.0.0.1', resolve));
  t.after(() => { stub.closeAllConnections(); return new Promise(resolve => stub.close(resolve)); });
  const fakeDiscovery = { baseUrl: 'http://127.0.0.1:' + stub.address().port, token: 'stub-token', name: 'SimpleSFTP', version: '0.2.114' };
  await assert.rejects(callLocalRpc(() => fakeDiscovery, 'upload.workspace', { localPath: '.' }),
    /Invalid or mismatched live API capabilities|unavailable/,
    '“所有 upload.workspace 都返回成功”的替身不构成打通证据');
});
