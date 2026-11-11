const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { ProjectGateway } = require('../../dist/mcp/ProjectGateway.js');
const { createProjectAuthorization, AUTHORIZATION_KEY } = require('../../dist/mcp/ProjectAuthorization.js');
const { PROJECT_TOOLS } = require('../../dist/mcp/ToolCatalog.js');
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'simple-mcp-'));
  const worker = { id: 'worker-a', host: 'example.invalid', port: 22, user: 'research', projectRoot: '/project/demo' };
  let grant;
  const calls = [];
  const methods = Object.fromEntries([...new Set(PROJECT_TOOLS.map(tool => tool.method))].map(method => [method,
    async params => { calls.push({ method, params }); return { ok: true, operationId: 'operation-1', status: 'checking_workers' }; }]));
  const store = { get: () => grant, update: async (key, value) => { assert.equal(key, AUTHORIZATION_KEY); grant = value; } };
  return { root, worker, calls, methods, store,
    gateway: new ProjectGateway({ root: () => root, workers: () => [worker], store, methods: () => methods }),
    authorize: async permissions => store.update(AUTHORIZATION_KEY, createProjectAuthorization(root, [worker], permissions)) };
}
test('read tools work without a write grant and forged confirmation factors never become authorization', async () => {
  const f = fixture();
  assert.equal((await f.gateway.call('project_status', {})).ok, true);
  await assert.rejects(f.gateway.call('plan_run', { planFile: 'experiments/plans/demo.yaml' }), /AUTHORIZATION_REQUIRED/);
  await assert.rejects(f.gateway.call('plan_run', { planFile: 'demo.yaml', confirm: true }), /Unknown/);
  assert.equal(f.calls.length, 1);
});
test('user grant enables normal execution, retains receipts, and revocation takes effect on the next call', async () => {
  const f = fixture(); await f.authorize(['experiment']);
  await assert.rejects(f.gateway.call('plan_run', { planFile: 'demo.yaml' }), /AUTHORIZATION_REQUIRED: sync/);
  await f.authorize(['experiment', 'sync', 'agents']);
  const result = await f.gateway.call('plan_run', { planFile: 'experiments/plans/demo.yaml' });
  assert.equal(result.status, 'checking_workers');
  assert.equal(f.calls[0].params.workspace, f.root);
  assert.equal(f.calls[0].params.confirm, true);
  await f.store.update(AUTHORIZATION_KEY, undefined);
  await assert.rejects(f.gateway.call('plan_run', { planFile: 'demo.yaml' }), /AUTHORIZATION_REQUIRED/);
  assert.equal(f.calls.length, 1);
});
test('Agent operations require the correct grant and exact configured Worker identity', async () => {
  const f = fixture(); await f.authorize(['agents']);
  await f.gateway.call('agent_restart', { serverIds: ['worker-a'] });
  assert.equal(f.calls[0].params.action, 'restart');
  await assert.rejects(f.gateway.call('agent_restart', { serverIds: ['worker-other'] }), /WORKER_UNKNOWN/);
  f.worker.projectRoot = '/another-project';
  await assert.rejects(f.gateway.call('agent_restart', { serverIds: ['worker-a'] }), /WORKER_NOT_AUTHORIZED/);
});
test('project authorization skips ordinary empty-run/path prompts but never confirms real cleanup targets', async () => {
  const { authorizedEmptyRunChoice, authorizedRemoteTargets } = require('../../dist/mcp/Invocation.js');
  const f = fixture(); await f.authorize(['experiment', 'sync', 'agents']);
  const empty = { phase: 1, groups: [{ value: 'rerun_missing', targets: [] }] };
  assert.equal(authorizedEmptyRunChoice(empty), undefined);
  f.methods['workflow.run'] = async () => {
    assert.equal(authorizedEmptyRunChoice(empty), 'rerun_missing');
    assert.equal(authorizedEmptyRunChoice({ phase: 1, groups: [{ value: 'rerun_missing', targets: [{ path: '/project/demo/old' }] }] }), undefined);
    assert.equal(authorizedEmptyRunChoice({ phase: 2, groups: [{ value: 'isolate_and_run', targets: [] }] }), undefined);
    assert.equal(authorizedRemoteTargets([{ ...f.worker, remotePath: f.worker.projectRoot }]), true);
    assert.throws(() => authorizedRemoteTargets([{ ...f.worker, remotePath: '/project/other' }]), /NOT_AUTHORIZED/);
    await f.store.update(AUTHORIZATION_KEY, undefined);
    assert.throws(() => authorizedEmptyRunChoice(empty), /AUTHORIZATION_REQUIRED/);
    return { ok: true };
  };
  await f.gateway.call('plan_run', { planFile: 'plan.yaml' });
  assert.equal(authorizedEmptyRunChoice(empty), undefined);
});
test('long tool requests return observable receipts and never persist raw result payloads', async () => {
  const { ProjectMcpOperations } = require('../../dist/mcp/ProjectOperations.js');
  const f = fixture(); await f.authorize(['results']);
  const records = {};
  let release;
  f.methods['results.list'] = () => new Promise(resolve => { release = resolve; });
  const ops = new ProjectMcpOperations({ root: () => f.root, gateway: () => f.gateway, records: () => records, changed: () => {} });
  const receipt = await ops.call('result_collect', {});
  assert.equal(receipt.receiptProvesExperimentCompletion, false);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(ops.status(receipt.operationId).status, 'running');
  release({ ok: true, rows: [{ privateRawMetric: 0.12345 }] });
  await new Promise(resolve => setImmediate(resolve));
  const done = ops.status(receipt.operationId);
  assert.equal(done.status, 'succeeded');
  assert.equal(done.result.rows[0].privateRawMetric, 0.12345);
  assert.equal(JSON.stringify(records).includes('privateRawMetric'), false);
  f.methods['results.list'] = async () => { throw Object.assign(Error('needs path review'), { apiCode: 2001, apiData: { targets: ['exact-path'] } }); };
  const failed = await ops.call('result_collect', {});
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(ops.status(failed.operationId).status, 'failed');
  assert.deepEqual(ops.status(failed.operationId).result.detail.targets, ['exact-path']);
});
test('cleanup execution retains the original human confirmation state and cannot accept invented factors', async () => {
  const f = fixture(); await f.authorize(['sync']);
  await f.gateway.call('cleanup_execute', { operationId: 'operation-1' });
  assert.deepEqual(f.calls[0].params, { operationId: 'operation-1' });
  await assert.rejects(f.gateway.call('cleanup_execute', { operationId: 'operation-1', pathConfirmed: true }), /Unknown/);
});
test('file review keeps both human phases and never executes deletion from a confirmation click', async () => {
  const f = fixture(), Module = require('node:module'), file = path.resolve(__dirname, '../../dist/extension/SftpCleanupReview.js');
  let receive;
  const replies = [], calls = [], exports = {};
  const panel = { webview: { onDidReceiveMessage: callback => { receive = callback; return { dispose() {} }; }, postMessage: async value => replies.push(value) }, onDidDispose() {} };
  const vscode = { ViewColumn: { Active: 1 }, workspace: { workspaceFolders: [{ uri: { fsPath: f.root } }] }, window: { createWebviewPanel: () => panel } };
  new Function('require', 'exports', fs.readFileSync(file, 'utf8'))(name => name === 'vscode' ? vscode : Module.createRequire(file)(name), exports);
  const row = { token: 'a'.repeat(48), digest: 'frozen', action: 'delete', node: { kind: 'local', root: f.root }, confirmations: 0,
    targets: [{ type: 'file', absolutePath: path.join(f.root, 'only-this.txt'), missing: false }] };
  exports.openSftpCleanupReview(f.root, structuredClone(row), async (method, params) => {
    calls.push({ method, params });
    if (method === 'files.cleanup.status') return structuredClone(row);
    assert.equal(method, 'files.cleanup.confirm');
    assert.equal(params.phase, row.confirmations + 1);
    assert.deepEqual(params.exactTargets, [row.targets[0].absolutePath]);
    row.confirmations = params.phase; return { confirmations: row.confirmations };
  });
  assert.equal(calls.length, 0);
  new (require('node:vm').Script)(/<script[^>]*>([\s\S]*?)<\/script>/.exec(panel.webview.html)[1]);
  await receive({ type: 'confirm', phase: 2 }); assert.equal(row.confirmations, 0);
  await receive({ type: 'confirm', phase: 1 }); assert.equal(row.confirmations, 1);
  await receive({ type: 'confirm', phase: 1 }); assert.equal(row.confirmations, 1);
  await receive({ type: 'confirm', phase: 2 }); assert.equal(row.confirmations, 2);
  assert.equal(calls.filter(call => call.method === 'files.cleanup.confirm').length, 2);
  assert.equal(calls.some(call => call.method === 'files.cleanup.execute'), false);
  assert.equal(replies.at(-1).required, 2);
});
test('SFTP calls resolve project roots and preserve independent source/destination bindings', async () => {
  const f = fixture(); await f.authorize(['sync']);
  fs.mkdirSync(path.join(f.root, 'src'));fs.writeFileSync(path.join(f.root,'src/model.py'),'x','utf8');
  const Module = require('node:module');
  const file = path.resolve(__dirname, '../../dist/extension/McpHost.js');
  const realRequire = Module.createRequire(file), exports = {};
  const fakeVscode = { workspace: { workspaceFolders: [{ uri: { fsPath: f.root } }] } };
  const reviewExports = {};
  new Function('require', 'exports', fs.readFileSync(path.join(path.dirname(file), 'SftpCleanupReview.js'), 'utf8'))(name => name === 'vscode' ? fakeVscode : realRequire(name), reviewExports);
  new Function('require', 'exports', fs.readFileSync(file, 'utf8'))(name => name === 'vscode' ? fakeVscode : name === './SftpCleanupReview' ? reviewExports : realRequire(name), exports);
  const captured = [];
  const host = { context: { workspaceState: f.store }, createLocalApiMethods: () => f.methods, refreshSharedConnectionSettings() {},
    workerCodeSyncTargets: () => [{ id: f.worker.id, host: f.worker.host, user: f.worker.user, port: f.worker.port, remotePath: f.worker.projectRoot }],
    agentRuntimeUploadTargets: () => { throw Error('SFTP must not target the runtime deployment directory'); },
    readSimpleSftpCapabilities: async () => ({ methods: ['upload.files', 'upload.workspace', 'remote.listDirs', 'sync.projectInventory'] }),
    buildDistributedJobCodeManifest: async (root,executionOnly) => { assert.equal(root,f.root);assert.equal(executionOnly,false);return {'src/model.py':{size:1}}; },
    sftpServerOptions: target => target,
    simpleSftpApiCall: async (method, params) => { captured.push({ method, params }); return { ok: true }; },
  };
  const gateway = exports.mcpGateway(host);
  await gateway.call('sftp_upload_files', { workerId: 'worker-a', files: ['src/model.py'] });
  assert.equal(captured[0].params.server.remotePath, '/project/demo');
  assert.equal(captured[0].params.localPath, f.root);
  assert.equal(captured[0].params.pathConfirmed, true);
  assert.deepEqual(captured[0].params.files,[{localPath:path.join(f.root,'src/model.py'),remoteName:'src/model.py'}]);
  await gateway.call('sftp_inventory', { workerId: 'worker-a', paths: ['src'] });
  assert.deepEqual(captured[1].params.scopePaths, ['src']);
  assert.equal(captured[1].params.metadataOnly, true);
  await gateway.call('sftp_upload_workspace',{workerId:'worker-a'});
  assert.deepEqual(Object.keys(captured[2].params.manifest),['src/model.py']);
  assert.equal(captured[2].params.pruneManagedFiles,false);assert.equal(captured[2].params.transientManifest,true);
  await gateway.call('sftp_remote_directories',{workerId:'worker-a',relativePath:'src'});
  assert.equal(captured[3].params.remotePath,'/project/demo/src');assert.equal(captured[3].params.server.remotePath,'/project/demo/src');
  await assert.rejects(gateway.call('sftp_upload_files',{workerId:'worker-a',files:[__filename]}),/MCP_PROJECT_FILE_REQUIRED/);
  await assert.rejects(gateway.call('sftp_remote_directories',{workerId:'worker-a',relativePath:'../outside'}),/MCP_PROJECT_DIRECTORY_REQUIRED/);
  host.readSimpleSftpCapabilities = async () => { throw Error('companion unavailable'); };
  assert.equal((await gateway.call('project_status', {})).ok, true);
  assert.match((await gateway.call('sftp_connection', {})).error, /companion unavailable/);
});
test('official MCP client discovers tools and calls the host gateway using structured results', async () => {
  const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
  const { InMemoryTransport } = require('@modelcontextprotocol/sdk/inMemory.js');
  const { createProjectMcpServer } = require('../../dist/mcp/Server.js');
  const f = fixture();
  const server = createProjectMcpServer('0.5.485', async (method, params) => method === 'mcp.catalog'
    ? f.gateway.catalog() : f.gateway.call(params.tool, params.arguments));
  const client = new Client({ name: 'mcp-regression-client', version: '1.0.0' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(a); await client.connect(b);
    const tools = await client.listTools();
    assert.ok(tools.tools.some(tool => tool.name === 'plan_run' && tool.annotations.readOnlyHint === false));
    assert.equal(new Set(tools.tools.map(tool => tool.name)).size, tools.tools.length);
    const status = await client.callTool({ name: 'project_status', arguments: {} });
    assert.equal(status.structuredContent.ok, true);
    const denied = await client.callTool({ name: 'plan_run', arguments: { planFile: 'demo.yaml' } });
    assert.equal(denied.isError, true);
    assert.match(denied.structuredContent.error, /AUTHORIZATION_REQUIRED/);
    const grant = await client.callTool({ name: 'project_authorization', arguments: {} });
    assert.equal(grant.structuredContent.authorization, null);
  } finally { await client.close(); await server.close(); }
});

test('shared CLI views isolate concurrent projects and return objects before terminal rendering', async () => {
  const { queryProject } = require('../../dist/mcp/ProjectQueries.js');
  const a = fixture(), b = fixture();
  function rpc(root, metric) {
    return async (method, params) => {
      assert.equal(method, 'results.list');
      await new Promise(resolve => setImmediate(resolve));
      assert.equal(require('../../dist/cli/data.js').projectRoot(), root);
      return { source: 'active_query', summary: { current: true, observedAt: '2026-11-11T00:00:00Z', results: [{
        planFile: 'plans/demo.yaml', workerId: 'worker-a', runId: 'run-1', completionState: 'verified', aggregationState: 'eligible',
        metrics: { [metric]: 0.5 }, dimensions: { seed: 42 }, sourceFiles: [{ path: 'work_dirs/demo/metrics.csv' }],
      }] } };
    };
  }
  const values = await Promise.all([queryProject(a.root, rpc(a.root, 'AP'), 'metric_list', {}), queryProject(b.root, rpc(b.root, 'macro_f1'), 'metric_list', {})]);
  assert.deepEqual(values, [{ metrics: ['AP'] }, { metrics: ['macro_f1'] }]);
  const rows = await queryProject(a.root, rpc(a.root, 'AP'), 'result_list', {});
  const exported = await queryProject(a.root, rpc(a.root, 'AP'), 'result_export', { id: rows[0].id, format: 'csv' });
  assert.equal(exported.current, true);
  assert.match(exported.content, /AP/);
  await assert.rejects(queryProject(a.root, rpc(a.root, 'AP'), 'result_parse', { file: path.join(__dirname, 'mcpProject.test.js') }), /PROJECT_FILE_REQUIRED/);
});
test('paper exports return every CLI format as structured content and routine cleanup queries need no extra Codex prompt', async () => {
  const { queryProject } = require('../../dist/mcp/ProjectQueries.js');
  const f = fixture(), input = path.join(f.root, 'registry.json');
  fs.writeFileSync(input, '[]', 'utf8');
  for (const format of ['markdown', 'csv', 'latex']) {
    const value = await queryProject(f.root, async () => assert.fail('local table rendering must not call a remote service'), 'result_paper_table', {
      file: 'registry.json', metrics: ['accuracy'], format,
    });
    assert.equal(value.format, format); assert.match(value.content, /accuracy/); assert.equal(value.source, input);
  }
  const config = require('../../scripts/mcp-codex-config.js').configuration(f.root, path.join(f.root, 'simpleex-mcp-launcher.cjs'));
  for (const name of ['plan_run', 'cleanup_status', 'file_cleanup_execute', 'draft_review'])
    assert.ok(config.includes('[mcp_servers.simple_experiment.tools.' + name + ']\napproval_mode = "approve"'));
  assert.equal(config.includes('[mcp_servers.simple_experiment.tools.state_set]'), false);
  const stats = PROJECT_TOOLS.find(tool => tool.name === 'sftp_file_stats');
  assert.ok(stats.inputSchema.required.includes('paths'));
});

test('exact task stop records its intent before closing only the selected job', async () => {
  const { stopProjectTask } = require('../../dist/extension/TaskControl.js');
  const { canonicalProjectId } = require('../../dist/features/DistributedPlanQueue.js');
  const f = fixture(), jobs = [{ workerId: 'worker-a', commandId: 'first' }, { workerId: 'worker-a', commandId: 'second' }];
  const plan = { id: 'workflow-1', projectId: canonicalProjectId(f.root), jobs };
  const closed = [];
  const host = { captureProjectContext: () => f.root, projectContextIsCurrent: value => value === f.root,
    saveDistributedQueue: async (root, unused, options) => { assert.equal(root, f.root); options.mutateLatest({ plans: [plan] }); },
    stopDistributedJobForClear: async (owner, job, local) => { assert.equal(owner, plan); assert.ok(job.stopIntent); assert.equal(local, true); closed.push(job.commandId); return { status: 'completed' }; },
  };
  await stopProjectTask(host, f.root, { workerId: 'worker-a', commandId: 'second', confirm: true });
  assert.deepEqual(closed, ['second']); assert.equal(jobs[0].stopIntent, undefined);
  await assert.rejects(stopProjectTask(host, f.root, { workerId: 'worker-a', commandId: 'other', confirm: true }), /EXACT_IDENTITY/);
  assert.deepEqual(closed, ['second']);
});

test('official stdio client connects to the packaged server and preserves live project identity', async () => {
  const http = require('node:http');
  const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
  const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
  const f = fixture(), startedAt = new Date().toISOString(), instanceId = process.pid + ':' + startedAt;
  const methods = ['mcp.catalog', 'mcp.call'];
  let liveRoot = f.root;
  const api = http.createServer((req, res) => {
    if (req.url === '/api/v1/capabilities') { res.end(JSON.stringify({ schemaVersion: 1, rpc: 'json-rpc-2.0', name: 'SimpleExperiment', version: '0.5.485', instanceId, workspace: liveRoot, methods })); return; }
    const chunks = []; req.on('data', bytes => chunks.push(bytes)); req.on('end', async () => {
      const request = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      const result = request.method === 'mcp.catalog' ? await f.gateway.catalog() : await f.gateway.call(request.params.tool, request.params.arguments);
      res.end(JSON.stringify({ jsonrpc: '2.0', id: request.id, result }));
    });
  });
  await new Promise(resolve => api.listen(0, '127.0.0.1', resolve));
  const discovery = path.join(f.root, 'api.json');
  fs.writeFileSync(discovery, JSON.stringify({ name: 'SimpleExperiment', version: '0.5.485', pid: process.pid, startedAt,
    baseUrl: 'http://127.0.0.1:' + api.address().port, token: 'fixture-only', workspace: f.root }), 'utf8');
  const transport = new StdioClientTransport({ command: process.execPath, args: [path.resolve(__dirname, '../../dist/mcp/server.cjs'), '--workspace', f.root, '--instance', instanceId],
    env: { ...process.env, SIMPLE_EXPERIMENT_API_FILE: discovery }, stderr: 'pipe' });
  const client = new Client({ name: 'stdio-acceptance', version: '1.0.0' });
  let stderr = ''; transport.stderr?.on('data', bytes => { stderr += bytes.toString('utf8'); });
  try {
    await client.connect(transport);
    assert.ok((await client.listTools()).tools.some(tool => tool.name === 'project_status'));
    assert.equal((await client.callTool({ name: 'project_status', arguments: {} })).structuredContent.ok, true);
    liveRoot = path.join(f.root, 'another-project');
    const rejected = await client.callTool({ name: 'project_status', arguments: {} });
    assert.equal(rejected.isError, true); assert.match(rejected.structuredContent.error, /工作区/);
  } catch (error) { error.message += '\nMCP stderr: ' + stderr; throw error; }
  finally { await client.close(); api.closeAllConnections(); await new Promise(resolve => api.close(resolve)); }
});

test('workspace MCP connection rebinds after a normal host reload, refuses ambiguity and never bypasses its version', async () => {
  const { LocalApiServer } = require('../../dist/api/LocalApiServer');
  const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
  const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
  const f = fixture(), discovery = path.join(f.root, 'SimpleExperiment', 'api.json');
  fs.mkdirSync(path.dirname(discovery));
  const instances = [];
  let calls = 0;
  async function host(version = '0.5.485') {
    const api = new LocalApiServer({ name: 'SimpleExperiment', version, preferredPort: 0, workspace: f.root, discoveryPath: discovery,
      methods: { 'mcp.catalog': () => PROJECT_TOOLS, 'mcp.call': () => ({ ok: true, calls: ++calls }) } });
    instances.push(api); await api.start(); return api;
  }
  const env = { ...process.env, APPDATA: f.root };
  for (const key of ['SIMPLE_EXPERIMENT_API_FILE', 'SIMPLE_CLI_INSTANCE_ID', 'SIMPLE_CLI_RESOLVED_EXPERIMENT']) delete env[key];
  const original = await host();
  const transport = new StdioClientTransport({ command: process.execPath,
    args: [path.resolve(__dirname, '../../dist/mcp/server.cjs'), '--workspace', f.root], env, stderr: 'pipe' });
  const client = new Client({ name: 'reload-acceptance', version: '1.0.0' });
  try {
    await client.connect(transport);
    assert.equal((await client.callTool({ name: 'project_status', arguments: {} })).isError, false);
    await original.dispose();
    const reloaded = await host();
    const resumed = await client.callTool({ name: 'project_status', arguments: {} });
    assert.equal(resumed.isError, false, resumed.structuredContent?.error);
    assert.equal(calls, 2);
    const duplicate = await host();
    const ambiguous = await client.callTool({ name: 'project_status', arguments: {} });
    assert.equal(ambiguous.isError, true); assert.match(ambiguous.structuredContent.error, /多个|多于|实例|ambiguous/i); assert.equal(calls, 2);
    await duplicate.dispose(); await reloaded.dispose(); await host('0.5.486');
    const changed = await client.callTool({ name: 'project_status', arguments: {} });
    assert.equal(changed.isError, true); assert.match(changed.structuredContent.error, /VERSION.*MISMATCH|版本/); assert.equal(calls, 2);
  } finally { await client.close(); for (const api of instances) await api.dispose(); }
});
