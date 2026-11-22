const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { ProjectGateway } = require('../../dist/mcp/ProjectGateway.js');
const { createProjectAuthorization, AUTHORIZATION_KEY } = require('../../dist/mcp/ProjectAuthorization.js');
const { PROJECT_TOOLS } = require('../../dist/mcp/ToolCatalog.js');
const vm = require('node:vm');
const { isDeepStrictEqual } = require('node:util');

function loadMcpHost(vscode, overrides = {}) {
  const Module = require('node:module');
  const file = path.resolve(__dirname, '../../dist/extension/McpHost.js');
  const nativeRequire = Module.createRequire(file), exported = {};
  new Function('require', 'exports', fs.readFileSync(file, 'utf8'))(
    name => name === 'vscode' ? vscode : name === './SftpCleanupReview' ? {} : overrides[name] || nativeRequire(name), exported);
  return exported;
}

test('authorization chooser binds the workspace without selecting Workers or scopes', async () => {
  const f = fixture(), writes = [];
  let root = f.root, worker = { ...f.worker }, step = 0, scenario = '';
  const vscode = { workspace: { workspaceFolders: [{ uri: { get fsPath() { return root; } } }] }, window: {
    showQuickPick: async items => {
      if (++step === 1) {
        if (scenario === 'cancel') return undefined;
        if (scenario === 'revoke-switch') { root += '-other'; return { value: 'revoke' }; }
        if (scenario === 'grant-switch') root += '-other';
        return { value: 'grant' };
      }
      assert.fail('unexpected additional chooser');
    }, showInformationMessage() {},
  } };
  const host = { context: { workspaceState: { update: async (...args) => writes.push(args) } }, refreshSharedConnectionSettings() {},
    workerCodeSyncTargets: () => [{ ...worker, remotePath: worker.projectRoot }] };
  const { manageAiAuthorization } = loadMcpHost(vscode);
  for (scenario of ['revoke-switch', 'grant-switch']) {
    root = f.root; worker = { ...f.worker }; step = 0;
    await assert.rejects(manageAiAuthorization(host), /MCP_WORKSPACE_CHANGED|MCP_WORKER.*CHANGED/);
    assert.equal(writes.length, 0);
  }
  for (scenario of ['cancel']) {
    root = f.root; worker = { ...f.worker }; step = 0;
    await manageAiAuthorization(host);
    assert.equal(writes.length, 0);
  }
  root = f.root; worker = { ...f.worker }; step = 0; scenario = 'normal';
  await manageAiAuthorization(host);
  assert.equal(writes.length, 1);
  assert.equal(Object.hasOwn(writes[0][1], 'workers'), false);
  assert.deepEqual(writes[0][1].permissions, ['experiment', 'sync', 'agents', 'configuration', 'results']);
});

test('MCP approval rejects cancellation or a changed project before writing', async () => {
  const f = fixture(), calls = [];
  let root = f.root, mode = 'cancel';
  const args = { key: 'simpleSftp.test', value: 'approved' };
  const gateway = new ProjectGateway({ root: () => root, workers: () => [], store: f.store, methods: () => ({}),
    approve: async (_tool, shown) => {
      if (mode === 'switch') root += '-other';
      return mode !== 'cancel';
    }, sftp: { methods: async () => ['config.set'], call: async (method, params) => { calls.push({ method, params }); } } });
  for (mode of ['cancel', 'switch']) {
    root = f.root; args.value = 'approved';
    await assert.rejects(gateway.call('sftp_configuration_set', args));
    assert.equal(calls.length, 0);
  }
  root = f.root; args.value = 'approved'; mode = 'normal';
  await gateway.call('sftp_configuration_set', args);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].params.value, 'approved');
});

test('MCP file upload rechecks authorization after resolving selected project files', async () => {
  const f = fixture(), captured = [];
  let worker = { ...f.worker }, drift = 'none';
  const file = path.join(f.root, 'selected.py');
  fs.writeFileSync(file, 'print(1)', 'utf8');
  const nativeFs = require('node:fs/promises');
  const fsStub = { ...nativeFs, realpath: async target => {
    const result = await nativeFs.realpath(target);
    if (path.resolve(target) === file) {
      if (drift === 'revoke') await f.store.update(AUTHORIZATION_KEY, undefined);
      if (drift === 'worker') worker = { ...worker, host: 'changed.invalid' };
    }
    return result;
  } };
  const vscode = { workspace: { workspaceFolders: [{ uri: { fsPath: f.root } }] } };
  const host = { context: { workspaceState: f.store }, createLocalApiMethods: () => f.methods, refreshSharedConnectionSettings() {},
    workerCodeSyncTargets: () => [{ ...worker, remotePath: worker.projectRoot }],
    readSimpleSftpCapabilities: async () => ({ methods: ['upload.files'] }), sftpServerOptions: target => target,
    simpleSftpApiCall: async (method, params) => { captured.push({ method, params }); return { ok: true }; },
  };
  const gateway = loadMcpHost(vscode, { 'node:fs/promises': fsStub }).mcpGateway(host);
  for (drift of ['revoke', 'worker']) {
    worker = { ...f.worker }; await f.authorize(['sync']);
    await assert.rejects(gateway.call('sftp_upload_files', { workerId: worker.id, files: ['selected.py'] }), /AUTHORIZATION|NOT_AUTHORIZED|CHANGED/);
    assert.equal(captured.length, 0);
  }
  drift = 'none'; worker = { ...f.worker }; await f.authorize(['sync']);
  await gateway.call('sftp_upload_files', { workerId: worker.id, files: ['selected.py'] });
  assert.equal(captured.length, 1);
  assert.equal(captured[0].params.files[0].localPath, file);
});

test('MCP upload rechecks authorization and exact Worker after manifest preparation', async () => {
  const f = fixture(), captured = [];
  let worker = { ...f.worker }, drift = 'none';
  const vscode = { workspace: { workspaceFolders: [{ uri: { fsPath: f.root } }] } };
  const host = { context: { workspaceState: f.store }, createLocalApiMethods: () => f.methods, refreshSharedConnectionSettings() {},
    workerCodeSyncTargets: () => [{ ...worker, remotePath: worker.projectRoot }],
    readSimpleSftpCapabilities: async () => ({ methods: ['upload.workspace'] }),
    buildDistributedJobCodeManifest: async () => {
      if (drift === 'revoke') await f.store.update(AUTHORIZATION_KEY, undefined);
      if (drift === 'worker') worker = { ...worker, host: 'different.invalid' };
      return { 'main.py': { size: 1 } };
    },
    sftpServerOptions: target => target,
    simpleSftpApiCall: async (method, params) => { captured.push({ method, params }); return { ok: true }; },
  };
  const gateway = loadMcpHost(vscode).mcpGateway(host);
  for (drift of ['revoke', 'worker']) {
    worker = { ...f.worker }; await f.authorize(['sync']);
    await assert.rejects(gateway.call('sftp_upload_workspace', { workerId: worker.id }), /AUTHORIZATION|NOT_AUTHORIZED|CHANGED/);
    assert.equal(captured.length, 0);
  }
  drift = 'none'; worker = { ...f.worker }; await f.authorize(['sync']);
  await gateway.call('sftp_upload_workspace', { workerId: worker.id });
  assert.equal(captured.length, 1);
  assert.equal(captured[0].params.server.host, worker.host);
});

test('MCP Worker-to-Worker sync binds both selected authorized targets', async () => {
  const f = fixture(), sent = [];
  const second = { id: 'worker-b', host: 'second.invalid', port: 22, user: 'research', projectRoot: '/project/second' };
  const workers = [f.worker, second];
  await f.store.update(AUTHORIZATION_KEY, { ...createProjectAuthorization(f.root), permissions: ['sync'], workers });
  const vscode = { workspace: { workspaceFolders: [{ uri: { fsPath: f.root } }] } };
  const host = { context: { workspaceState: f.store }, createLocalApiMethods: () => f.methods, refreshSharedConnectionSettings() {},
    workerCodeSyncTargets: () => workers.map(worker => ({ ...worker, remotePath: worker.projectRoot })),
    readSimpleSftpCapabilities: async () => ({ methods: ['sync.serverToServerFpsync'] }), sftpServerOptions: target => target,
    simpleSftpApiCall: async (method, params) => { sent.push({ method, params }); return { ok: true }; },
  };
  const gateway = loadMcpHost(vscode).mcpGateway(host);
  await gateway.call('sftp_worker_sync', { sourceWorkerId: 'worker-a', destinationWorkerId: 'worker-b', paths: ['work_dirs/run'] });
  assert.equal(sent[0].params.source.host, f.worker.host);
  assert.equal(sent[0].params.destination.host, second.host);
  assert.deepEqual(sent[0].params.relativePaths, ['work_dirs/run']);
  second.host = 'changed.invalid';
  await assert.rejects(gateway.call('sftp_worker_sync', { sourceWorkerId: 'worker-a', destinationWorkerId: 'worker-b', paths: ['work_dirs/run'] }), /NOT_AUTHORIZED/);
  assert.equal(sent.length, 1);
});

function adapterConfigHost({ online = false, permissionError, probeError, workspaceError, readbackMismatch = false, changeOnUpdate = false, syncResult = [] } = {}) {
  const source = fs.readFileSync(path.join(__dirname, '../../src/extension/legacy.ts'), 'utf8');
  const method = source.slice(source.indexOf('    async apiConfigSet('), source.indexOf('    async apiConfigReset('));
  const getMethod = source.slice(source.indexOf('    async apiConfigGet('), source.indexOf('    async apiConfigSet('));
  const resetMethod = source.slice(source.indexOf('    async apiConfigReset('), source.indexOf('    apiStateValue('));
  const values = { '/one': { csvColumnMapping: { fold: 'fold_id' }, derivedMetric: { metric: 'AP' }, planDatasetMapping: { a: 'dataset' } }, '/two': {} };
  let root = '/one';
  const events = [];
  const config = uri => ({ get: () => values[uri], update: async (_key, value) => {
    values[uri] = readbackMismatch ? { ...value, primaryMetric: 'wrong' } : value;
    if (changeOnUpdate) root = '/two';
  } });
  const context = { vscode: { workspace: { workspaceFolders: [{ uri: '/one' }], getConfiguration: (_name, uri) => config(uri) }, Uri: { file: x => x }, ConfigurationTarget: { WorkspaceFolder: 3 } },
    API_CONFIG_NAMESPACE: 'simpleExperiment', API_CONFIG_PREFIX: 'simpleExperiment.', API_SECRET_CONFIG_KEYS: new Set(),
    stringField: (obj, key) => obj[key] || '', validateApiConfigValue: () => {}, pluginProjectAdapterRules: uri => values[uri],
    isDeepStrictEqual: (a, b) => isDeepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b))),
    mcpInvocation: { getStore: () => ({ permission: name => { events.push(name); if (permissionError) throw Error(permissionError); } }) },
    errorMessage: e => e.message, confirmationRequired: () => Error('confirmation required'), workspaceRoot: () => root,
    assertSingleProjectWorkspace: () => { if (workspaceError) throw Error(workspaceError); return root; },
    assertAgentProjectProbeReady: () => { if (probeError) throw Error(probeError); } };
  const api = vm.runInNewContext(`({${method}}).apiConfigSet`, context);
  const get = vm.runInNewContext(`({${getMethod}}).apiConfigGet`, context);
  const reset = vm.runInNewContext(`({${resetMethod}}).apiConfigReset`, context);
  const host = { apiConfigDefinition: () => ({ schema: { type: 'object' } }), captureProjectContext: () => ({ root }),
    apiConfigValue: config => config.get(),
    projectContextIsCurrent: c => c.root === root, isRealtimeMode: () => online, enabledWorkerConfigs: () => [{ id: 'worker' }], lastWorkerProbes: {}, expectedWorkerAgentProjectRoot: () => '/remote/project',
    syncProjectAdapterRulesToAgents: async () => { events.push('agent-write'); return syncResult; },
    refreshLocalPlanMetadata: async () => events.push('refresh'), invalidateResultCatalogCache: () => events.push('catalog'), postState: () => events.push('post') };
  return { call: value => api.call(host, { key: 'simpleExperiment.projectAdapterRules', scope: 'workspaceFolder', confirm: true, value }),
    read: () => get.call(host, { key: 'simpleExperiment.projectAdapterRules' }),
    reset: () => reset.call(host, { key: 'simpleExperiment.projectAdapterRules', scope: 'workspaceFolder', confirm: true }), values, events, host };
}

test('MCP adapter configuration preserves existing mappings and reports offline synchronization', async () => {
  const f = adapterConfigHost();
  const result = await f.call({ taskType: 'classification', primaryMetric: 'AP', secondaryMetrics: ['macro_f1'] });
  assert.equal(result.value.primaryMetric, 'AP');
  assert.equal(result.value.csvColumnMapping.fold, 'fold_id');
  assert.equal(result.value.derivedMetric.metric, 'AP');
  assert.equal(result.value.planDatasetMapping.a, 'dataset');
  assert.equal(result.sync.status, 'pending');
  assert.match(result.sync.errors[0], /离线/);
  assert.deepEqual(f.events, ['refresh', 'catalog', 'post']);
});

test('adapter configuration requires sync authorization and reports actual Agent outcome', async () => {
  const denied = adapterConfigHost({ online: true, permissionError: 'not authorized' });
  assert.equal((await denied.call({ primaryMetric: 'AP' })).sync.status, 'pending');
  assert.ok(!denied.events.includes('agent-write'));
  const wrongProject = adapterConfigHost({ online: true, probeError: 'project mismatch' });
  assert.match((await wrongProject.call({ primaryMetric: 'AP' })).sync.errors[0], /project mismatch/);
  assert.ok(!wrongProject.events.includes('agent-write'));
  const failed = adapterConfigHost({ online: true, syncResult: ['worker: failed'] });
  assert.equal((await failed.call({ primaryMetric: 'AP' })).sync.status, 'pending');
  const success = adapterConfigHost({ online: true });
  assert.equal((await success.call({ primaryMetric: 'AP' })).sync.status, 'synced');
  assert.deepEqual(success.events, ['sync', 'agents', 'agent-write', 'refresh', 'catalog', 'post']);
});

test('Agent policy synchronization accepts only completed Worker responses', async () => {
  const source = fs.readFileSync(path.join(__dirname, '../../src/extension/legacy.ts'), 'utf8');
  const method = source.slice(source.indexOf('    async syncProjectAdapterRulesToAgents('), source.indexOf('    async loadProjectAdapterTemplateFiles('));
  const sandbox = { uniqueStrings: rows => [...new Set(rows)], errorMessage: e => e.message };
  const sync = vm.runInNewContext(`({${method}}).syncProjectAdapterRulesToAgents`, sandbox);
  const calls = [];
  const host = { isRealtimeMode: () => true, projectTopologyAssessment: () => ({}), enabledWorkerConfigs: () => [{ id: 'worker' }],
    postTensorboardAction: async (id, action, body) => { calls.push({ id, action, body }); return { status: host.status }; } };
  for (const status of ['submitted', 'failed', 'completed']) {
    host.status = status;
    const errors = await sync.call(host, { primaryMetric: 'AP', planDatasetMapping: { plan: 'dataset' } });
    assert.equal(errors.length, status === 'completed' ? 0 : 1);
  }
  assert.equal(calls.length, 3);
  assert.equal(calls[0].body.options.projectAdapterRules.primaryMetric, 'AP');
  assert.equal('planDatasetMapping' in calls[0].body.options.projectAdapterRules, false);
  await assert.rejects(sync.call(host, {}, () => false), /停止同步/);
  assert.equal(calls.length, 3);
  host.enabledWorkerConfigs = () => [];
  assert.match((await sync.call(host, {}))[0], /没有启用/);
});

test('adapter configuration stops on mismatched readback or workspace switch', async () => {
  for (const option of [{ readbackMismatch: true }, { changeOnUpdate: true }, { workspaceError: '多个工作区' }]) {
    const f = adapterConfigHost(option);
    await assert.rejects(f.call({ primaryMetric: 'AP' }), /回读|切换|多个工作区/);
    assert.deepEqual(f.events, []);
    assert.deepEqual(f.values['/two'], {});
  }
});

test('MCP validates result mappings and permits evidence-based derived metrics', async () => {
  const f = adapterConfigHost();
  await assert.rejects(f.call({ csvColumnMapping: { invalid: 'column' } }), /映射包含无效/);
  await assert.rejects(f.call({ derivedMetric: { metric: 'AP', leftEndpoint: 'clean', rightEndpoint: 'clean', scale: 1, outputName: 'ap_delta' } }), /派生指标/);
  const result = await f.call({ derivedMetric: { metric: 'AP', leftEndpoint: 'clean', rightEndpoint: 'test', scale: 1, outputName: 'ap_delta' } });
  assert.equal(result.value.derivedMetric.metric, 'AP');
  assert.equal(result.value.derivedMetric.outputName, 'ap_delta');
  assert.deepEqual(Object.keys((await f.call({ derivedMetric: {} })).value.derivedMetric), []);
});

test('MCP preserves dataset assignments and refuses bypassing the existing result classification flow', async () => {
  const f = adapterConfigHost();
  await assert.rejects(f.call({ planDatasetMapping: { b: { datasets: ['other'] } } }), /结果归类流程/);
  await assert.rejects(f.reset(), /结果归类流程/);
  assert.equal(f.values['/one'].planDatasetMapping.a, 'dataset');
  assert.deepEqual(f.events, []);
  const result = await f.call({ planDatasetMapping: { a: 'dataset' }, primaryMetric: 'AP', csvColumnMapping: { metric: 'score_name' } });
  assert.equal(result.value.planDatasetMapping.a, 'dataset');
  assert.equal(result.value.csvColumnMapping.fold, 'fold_id');
  assert.equal(result.value.csvColumnMapping.metric, 'score_name');
});

test('configuration reset stays bound to its project and returns the inherited value', async () => {
  const source = fs.readFileSync(path.join(__dirname, '../../src/extension/legacy.ts'), 'utf8');
  const method = source.slice(source.indexOf('    async apiConfigReset('), source.indexOf('    apiStateValue('));
  let root = '/one', mode = 'normal';
  const values = { '/one': { primaryMetric: 'AP' }, '/two': { primaryMetric: 'other' } }, calls = [];
  const config = uri => ({ get: () => values[uri] || { primaryMetric: 'inherited' }, update: async (_key, value, target) => {
    calls.push({ uri, value, target }); if (mode === 'fail') throw Error('save failed');
    values[uri] = value; if (mode === 'switch') root = '/two';
  } });
  const sandbox = { vscode: { workspace: { workspaceFolders: [{ uri: '/one' }], getConfiguration: (_ns, uri) => config(uri) },
      Uri: { file: value => value }, ConfigurationTarget: { WorkspaceFolder: 3, Workspace: 2, Global: 1 } },
    API_CONFIG_NAMESPACE: 'simpleExperiment', API_CONFIG_PREFIX: 'simpleExperiment.', API_SECRET_CONFIG_KEYS: new Set(),
    stringField: (obj, key) => obj[key] || '', confirmationRequired: () => Error('confirmation required'),
    workspaceRoot: () => root, pluginProjectAdapterRules: uri => values[uri] || { primaryMetric: 'inherited' },
    assertSingleProjectWorkspace: () => root };
  const reset = vm.runInNewContext(`({${method}}).apiConfigReset`, sandbox);
  const host = { apiConfigDefinition: () => ({ schema: {} }), apiConfigUpdateTarget: (_schema, scope) => scope === 'workspaceFolder' ? 3 : 2,
    apiConfigValue: cfg => cfg.get(), captureProjectContext: () => ({ root }), projectContextIsCurrent: context => context.root === root,
    refreshLocalPlanMetadata: async () => {}, invalidateResultCatalogCache: () => {}, postState: () => {} };
  const args = { key: 'simpleExperiment.projectAdapterRules', scope: 'workspaceFolder', confirm: true };
  await assert.rejects(reset.call(host, { ...args, confirm: false }), /confirmation required/); assert.equal(calls.length, 0);
  await assert.rejects(reset.call(host, { ...args, scope: 'workspace' }), /workspaceFolder/); assert.equal(calls.length, 0);
  mode = 'fail'; await assert.rejects(reset.call(host, args), /save failed/); assert.equal(values['/one'].primaryMetric, 'AP');
  mode = 'normal'; const result = await reset.call(host, args);
  assert.equal(result.value.primaryMetric, 'inherited'); assert.equal(result.scope, 'workspaceFolder');
  values['/one'] = { primaryMetric: 'AP' }; mode = 'switch';
  await assert.rejects(reset.call(host, args), /切换/); assert.equal(values['/two'].primaryMetric, 'other');
  root = '/one'; mode = 'normal'; values['/one'] = { primaryMetric: 'AP' };
  const ordinary = await reset.call(host, { key: 'simpleExperiment.showAdvancedCommands', scope: 'workspace', confirm: true });
  assert.equal(ordinary.scope, 'workspace'); assert.equal(calls.at(-1).target, 2);
});

test('MCP gateway reads, writes and rereads the project adapter configuration', async () => {
  const f = fixture(); await f.authorize(['configuration']);
  const adapter = adapterConfigHost();
  f.methods['config.get'] = () => adapter.read();
  f.methods['config.set'] = params => adapter.call(params.value);
  assert.equal((await f.gateway.call('configuration_get', { key: 'simpleExperiment.projectAdapterRules' })).value.csvColumnMapping.fold, 'fold_id');
  const written = await f.gateway.call('configuration_set', { key: 'simpleExperiment.projectAdapterRules', scope: 'workspaceFolder', value: { primaryMetric: 'AP', candidateCsv: ['results/metrics.csv'] } });
  assert.equal(written.sync.status, 'pending');
  const read = await f.gateway.call('configuration_get', { key: 'simpleExperiment.projectAdapterRules' });
  assert.equal(read.value.primaryMetric, 'AP');
  assert.equal(read.value.csvColumnMapping.fold, 'fold_id');
  assert.equal(read.sync.status, 'pending');
});

test('saved MCP configuration is consumed by the real result CSV parser without merging metrics', async () => {
  const adapter = adapterConfigHost();
  await adapter.call({ csvColumnMapping: { case: 'case_id', seed: 'seed_id', metric: 'metric_name', value: 'metric_value' }, metricAliases: {} });
  const rules = (await adapter.read()).value;
  assert.equal(rules.csvColumnMapping.fold, 'fold_id');
  const source = fs.readFileSync(path.join(__dirname, '../../src/extension/legacy.ts'), 'utf8');
  const snippet = source.slice(source.indexOf('function parseDownloadedMetricCsv('), source.indexOf('function isResultMetricFile('));
  const javascript = require('typescript').transpileModule(snippet, { compilerOptions: { target: 99 } }).outputText;
  const sandbox = { ProjectResultTables: require('../../dist/results/ProjectResultTables.js') };
  vm.runInNewContext(javascript + '\nthis.parse = parseDownloadedMetricCsv;', sandbox);
  const csv = 'case_id,seed_id,metric_name,metric_value\na,1,AP,0.7\na,1,AUPRC,0.8\na,1,macro_f1,0.6\na,1,weighted_f1,0.9\n';
  const rows = sandbox.parse(csv, rules.csvColumnMapping, {}, rules.metricAliases);
  assert.deepEqual(Array.from(rows, row => Object.keys(row.metrics)[0]), ['AP', 'AUPRC', 'macro_f1', 'weighted_f1']);
  assert.deepEqual(Array.from(rows, row => Object.values(row.metrics)[0].value), [0.7, 0.8, 0.6, 0.9]);
});
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'simple-mcp-'));
  const worker = { id: 'worker-a', host: 'example.invalid', port: 22, user: 'research', projectRoot: '/project/demo' };
  let grant;
  const calls = [];
  const methods = Object.fromEntries([...new Set(PROJECT_TOOLS.map(tool => tool.method))].map(method => [method,
    async params => { calls.push({ method, params }); return { ok: true, operationId: 'operation-1', status: 'checking_workers' }; }]));
  methods.status = async params => { calls.push({ method: 'status', params }); return {
    ok: true, name: 'SimpleExperiment', version: '0.5.485', workspace: root, pid: process.pid,
  }; };
  const store = { get: () => grant, update: async (key, value) => { assert.equal(key, AUTHORIZATION_KEY); grant = value; } };
  return { root, worker, calls, methods, store,
    gateway: new ProjectGateway({ root: () => root, workers: () => [worker], store, methods: () => methods }),
    authorize: async permissions => store.update(AUTHORIZATION_KEY, { ...createProjectAuthorization(root), permissions, workers: [worker] }) };
}
test('MCP log reads preserve the exact Worker and remote cursor, including empty responses', async () => {
  const ts = require('typescript');
  const source = fs.readFileSync(path.join(__dirname, '../../src/extension/legacy.ts'), 'utf8');
  const method = source.slice(source.indexOf('    async apiLiveOutput('), source.indexOf('    apiConfigSchema()'));
  const javascript = ts.transpileModule('const hostMethod = ({' + method + '}).apiLiveOutput;', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const read = vm.runInNewContext(javascript + '\nhostMethod;', { stringField: (value, key) => typeof value[key] === 'string' ? value[key] : '' });
  const f = fixture(), calls = [];
  let response = { text: 'first\n', offset: 7 }, failure;
  const host = { client: { getLiveOutput: async (...args) => { calls.push(args); if (failure) throw failure; return response; } },
    resolveWorkerEndpointId: id => id, buildState: () => ({ logs: { 'run-1-other': { text: 'other task' }, 'run-1': { text: 'stale cache' } } }) };
  f.methods['live.output'] = (params, _server, context) => read.call(host, params, context?.signal);
  const first = await f.gateway.call('log_read', { workerId: 'worker-a', runKey: 'run-1', since: 0 });
  assert.equal(first.logs[0].text, 'first\n'); assert.equal(first.logs[0].offset, 7);
  response = { text: 'next\n', offset: 12 };
  const next = await f.gateway.call('log_read', { workerId: 'worker-a', runKey: 'run-1', since: 7 });
  assert.equal(next.logs[0].text, 'next\n'); assert.equal(next.logs[0].offset, 12);
  assert.deepEqual(calls.map(args => args.slice(0, 3)), [['run-1', 0, 'worker-a'], ['run-1', 7, 'worker-a']]);
  response = { text: '', offset: 12 };
  const empty = await f.gateway.call('log_read', { workerId: 'worker-a', runKey: 'run-1', since: 12 });
  assert.equal(empty.count, 0);
  assert.equal(empty.offset, 12);
  const schema = PROJECT_TOOLS.find(tool => tool.name === 'log_read').outputSchema;
  assert.equal(new (require('@modelcontextprotocol/sdk/validation/ajv').AjvJsonSchemaValidator)().getValidator(schema)(empty).valid, true);
  failure = Error('Worker unavailable');
  await assert.rejects(f.gateway.call('log_read', { workerId: 'worker-a', runKey: 'run-1', since: 12 }), /Worker unavailable/);
});

test('experiment_log returns all local lines, requested tail, and remote errors', async () => {
  const { queryProject } = require('../../dist/mcp/ProjectQueries.js');
  const f = fixture(), cluster = path.join(f.root, 'simple_cluster');
  fs.mkdirSync(cluster, { recursive: true });
  const logFile = path.join(f.root, 'experiment.log');
  fs.writeFileSync(logFile, Array.from({ length: 240 }, (_, i) => `line ${i + 1}`).join('\n'), 'utf8');
  fs.writeFileSync(path.join(cluster, 'experiment_index.json'), JSON.stringify([
    { id: 'local-run', status: 'completed', log_path: logFile },
    { id: 'remote-run', status: 'completed', worker_id: 'worker-a', log_path: '/remote/log' },
  ]), 'utf8');
  const rpc = async (method) => {
    if (method === 'live.output') throw Object.assign(Error('Worker log unavailable'), { exitCode: 4 });
    return {};
  };
  const all = await queryProject(f.root, rpc, 'experiment_log', { id: 'local-run' });
  assert.equal(all.length, 240); assert.equal(all[0].message, 'line 1');
  const tail = await queryProject(f.root, rpc, 'experiment_log', { id: 'local-run', lines: 2 });
  assert.deepEqual(tail.map(row => row.message), ['line 239', 'line 240']);
  assert.deepEqual(await queryProject(f.root, rpc, 'experiment_log', { id: 'local-run', lines: 0 }), []);
  await assert.rejects(queryProject(f.root, rpc, 'experiment_log', { id: 'remote-run' }), /Worker log unavailable/);
  await assert.rejects(queryProject(f.root, rpc, 'experiment_log', { id: 'missing' }), /experiment not found/);
  const requests = [];
  const remote = async (method, params) => {
    if (method !== 'live.output') return {};
    requests.push(params);
    return { runKey: '/remote/log', logs: [{ key: '/remote/log', text: 'first\nsecond\n' }], count: 1 };
  };
  const remoteTail = await queryProject(f.root, remote, 'experiment_log', { id: 'remote-run', lines: 1 });
  assert.deepEqual(remoteTail.map(row => row.message), ['second']);
  assert.deepEqual(requests, [{ runKey: '/remote/log', workerId: 'worker-a' }]);
  assert.deepEqual(await queryProject(f.root, async method => method === 'live.output' ? { logs: [], count: 0 } : {}, 'experiment_log', { id: 'remote-run' }), []);
});

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

test('MCP project preparation starts its configured connections before verification', async () => {
  const f = fixture(); await f.authorize(['agents']);
  await f.gateway.call('project_prepare', {});
  assert.equal(f.calls[0].method, 'project.prepare');
  assert.equal(f.calls[0].params.startSessions, true);
});

test('server list reports configured Workers even before GPU telemetry arrives', async () => {
  const f = fixture();
  f.methods.status = async () => ({ topology: { mode: 'worker_pool', workerCount: 1 } });
  f.methods['gpu.list'] = async () => ({});
  f.methods['config.list'] = async () => ({ keys: [] });
  f.methods['server.testAll'] = async params => {
    assert.equal(params.refresh, false);
    return { rows: [{ serverId: 'worker-a', host: 'example.invalid', port: 22, user: 'research', status: 'local_port_closed' }] };
  };
  const rows = await f.gateway.call('server_list', {});
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 'worker-a');
  assert.equal(rows[0].online, 'local_port_closed');
  assert.equal(rows[0].ssh, 'research@example.invalid:22');
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
test('long MCP outcomes persist into the current operation dictionary after host compaction', async () => {
  const { ProjectMcpOperations } = require('../../dist/mcp/ProjectOperations.js');
  const f = fixture(); await f.authorize(['results']);
  let records = {}, persisted, changes = 0, release;
  const ops = new ProjectMcpOperations({ root: () => f.root, gateway: () => f.gateway,
    records: () => records, changed: () => {
      changes++;
      persisted = structuredClone(records);
      records = structuredClone(records);
    } });
  for (const failure of [false, true]) {
    f.methods['results.list'] = () => new Promise((resolve, reject) => {
      release = () => failure ? reject(Error('actual collection failure')) : resolve({ ok: true, privateRawMetric: 0.25 });
    });
    const receipt = await ops.call('result_collect', {});
    await new Promise(resolve => setImmediate(resolve));
    records = structuredClone(records);
    const beforeFinish = changes;
    release();
    await new Promise(resolve => setImmediate(resolve));
    const expected = failure ? 'failed' : 'succeeded';
    assert.equal(ops.status(receipt.operationId).status, expected);
    assert.equal(persisted[receipt.operationId].status, expected);
    assert.ok(persisted[receipt.operationId].finishedAt);
    assert.equal(changes, beforeFinish + 1);
    assert.equal(JSON.stringify(persisted).includes('privateRawMetric'), false);
    assert.equal(ops.status(receipt.operationId).resultAvailable, true);
    const reloaded = new ProjectMcpOperations({ root: () => f.root, gateway: () => f.gateway,
      records: () => persisted, changed: () => {} });
    assert.equal(reloaded.status(receipt.operationId).status, expected);
    assert.equal(reloaded.status(receipt.operationId).resultAvailable, false);
  }
});

test('MCP receipt preserves nested native status separately from request completion', async () => {
  const { ProjectMcpOperations } = require('../../dist/mcp/ProjectOperations.js');
  const f = fixture(); await f.authorize(['results']);
  const records = {}, calls = [];
  const ops = new ProjectMcpOperations({ root: () => f.root, gateway: () => f.gateway, records: () => records, changed: () => {} });
  for (const status of ['running', 'unknown', 'failed']) {
    const native = { ok: true, operationId: `native-${status}`, status, message: `native ${status}` };
    f.methods['results.list'] = async () => { calls.push(status); return native; };
    const receipt = await ops.call('result_collect', {});
    await new Promise(resolve => setImmediate(resolve));
    const view = await ops.call('operation_get', { operationId: receipt.operationId });
    assert.equal(view.status, 'succeeded');
    assert.equal(view.requestScope, 'tool_request');
    assert.equal(view.receiptProvesExperimentCompletion, false);
    assert.deepEqual(view.result, native);
  }
  assert.deepEqual(calls, ['running', 'unknown', 'failed']);
});

test('late MCP completion cannot restore retired requests or write another workspace', async () => {
  const { ProjectMcpOperations } = require('../../dist/mcp/ProjectOperations.js');
  const f = fixture(); await f.authorize(['results']);
  let root = f.root, records = {}, release, changes = 0;
  f.methods['results.list'] = () => new Promise(resolve => { release = resolve; });
  const ops = new ProjectMcpOperations({ root: () => root, gateway: () => f.gateway,
    records: () => records, changed: () => { changes++; records = structuredClone(records); } });
  for (const workspaceChanged of [false, true]) {
    root = f.root;
    const receipt = await ops.call('result_collect', {});
    await new Promise(resolve => setImmediate(resolve));
    const beforeFinish = changes;
    if (workspaceChanged) root = f.root + '-other';
    else records = {};
    release({ ok: true });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(changes, beforeFinish);
    if (workspaceChanged) {
      assert.equal(records[receipt.operationId].status, 'running');
      assert.throws(() => ops.status(receipt.operationId), /MCP_WORKSPACE_CHANGED/);
    } else assert.throws(() => ops.status(receipt.operationId), /MCP_OPERATION_NOT_FOUND/);
  }
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
    readSimpleSftpCapabilities: async () => ({ methods: ['upload.files', 'upload.workspace', 'remote.listDirs', 'sync.projectInventory', 'sync.downloadMappedPaths'] }),
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
  await gateway.call('sftp_inventory', { workerId: 'worker-a', paths: ['src/model.py'], includeHashes: true });
  assert.equal(captured.pop().params.metadataOnly, false);
  await assert.rejects(gateway.call('sftp_inventory', { workerId: 'worker-a', includeHashes: true }), /MCP_HASH_PATHS_REQUIRED/);
  await assert.rejects(gateway.call('sftp_download_mapped', { workerId: 'worker-a', entries: [{ remotePath: 'metrics.csv', localRelativePath: 'metrics.csv' }] }), /bytes|sha256/);
  await assert.rejects(gateway.call('sftp_download_mapped', { workerId: 'worker-a', entries: [{ remotePath: 'metrics.csv', localRelativePath: 'metrics.csv', bytes: 53 }] }), /sha256/);
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
test('MCP result comparison respects declared directions and export preserves the selected row', async () => {
  const { queryProject } = require('../../dist/mcp/ProjectQueries.js');
  const f = fixture();
  const make = (runId, seed, metrics) => ({ planFile: 'plans/p.yaml', workerId: 'worker-a', runId,
    completionState: 'verified', aggregationState: 'eligible', dimensions: { seed, dataset: 'data,"A"', fold: 'fold\n1' },
    metrics, sourceFiles: [{ path: 'work_dirs/metrics.csv' }] });
  const records = [make('run-left', 0, { RMSE: 2, custom: { value: 5, higherIsBetter: false }, unknown_metric: 0.123456789 }),
    make('run-right', 1, { RMSE: 1, custom: { value: 3, higherIsBetter: false }, unknown_metric: 0 })];
  const rpc = async method => { assert.equal(method, 'results.list'); return { source: 'active_query', summary: { current: true, results: records } }; };
  const rows = await queryProject(f.root, rpc, 'result_list', {});
  const compared = await queryProject(f.root, rpc, 'result_compare', { left: rows[0].id, right: rows[1].id });
  assert.ok(compared.improvement.includes('RMSE')); assert.ok(compared.improvement.includes('custom'));
  const exported = JSON.parse((await queryProject(f.root, rpc, 'result_export', { id: rows[0].id, format: 'json' })).content);
  assert.deepEqual(exported.dimensions, records[0].dimensions);
  assert.equal(exported.metrics.unknown_metric, 0.123456789);
  const csv = (await queryProject(f.root, rpc, 'result_export', { id: rows[0].id, format: 'csv' })).content;
  assert.match(csv, /0\.123456789/); assert.match(csv, /"data,""A"""/); assert.match(csv, /"fold\n1"/);
  assert.ok(!compared.improvement.includes('unknown_metric') && !compared.regression.includes('unknown_metric'));
  records[1].metrics = { RMSE: 2, custom: { value: 3, higherIsBetter: true }, ignored: 'not numeric' };
  const conflicting = await queryProject(f.root, rpc, 'result_compare', { left: rows[0].id, right: rows[1].id });
  assert.deepEqual(conflicting.improvement, []); assert.deepEqual(conflicting.regression, []);
  assert.deepEqual(conflicting.metric_difference.RMSE, { left: 2, right: 2, delta: 0 });
  records[1].metrics = { other: 1 };
  assert.deepEqual(JSON.parse(JSON.stringify((await queryProject(f.root, rpc, 'result_compare', { left: rows[0].id, right: rows[1].id })).metric_difference)), {});
});
test('MCP file parsing rejects unknown presets and ranks known loss in the correct direction', async () => {
  const { queryProject } = require('../../dist/mcp/ProjectQueries.js');
  const f = fixture();
  const csv = path.join(f.root, 'metrics.csv');
  fs.writeFileSync(csv, 'experimentId,runKey,loss\nfirst,group,0.8\nsecond,group,0.2\n', 'utf8');
  const rpc = async () => { throw Error('unexpected remote call'); };
  await assert.rejects(queryProject(f.root, rpc, 'result_parse', { file: csv, preset: 'missing-preset' }), /preset/i);
  await assert.rejects(queryProject(f.root, rpc, 'result_parse', { file: csv, preset: '' }), /preset/i);
  assert.ok(Array.isArray(await queryProject(f.root, rpc, 'result_parse', { file: csv, preset: 'classification_wide_csv' })));
  const board = await queryProject(f.root, rpc, 'metric_leaderboard', { file: csv, primary: 'loss' });
  assert.equal(board.board[0].bestExperimentId, 'second');
  const unknown = await queryProject(f.root, rpc, 'metric_leaderboard', { file: csv, primary: 'experimentId' });
  assert.equal(unknown.board[0].bestExperimentId, undefined);
  const json = path.join(f.root, 'metrics.json');
  fs.writeFileSync(json, JSON.stringify({ experimentId: 'json', metrics: { quality: 0.6 }, primaryMetric: 'quality', higherIsBetter: false }), 'utf8');
  const parsed = require('../../dist/features/Metrics.js').parseMetricsFile(fs.readFileSync(json, 'utf8'), json);
  assert.equal(parsed[0].primaryMetric, 'quality'); assert.equal(parsed[0].higherIsBetter, false);
});
test('MCP plan build requires valid explicit seeds and its saved matrix matches', async () => {
  const { queryProject } = require('../../dist/mcp/ProjectQueries.js');
  const f = fixture(), rpc = async () => { throw Error('unexpected remote call'); };
  const base = { suite: 'demo', base: 'config.yaml' };
  for (const seeds of [[], [''], ['1', '1'], ['not-an-integer']])
    await assert.rejects(queryProject(f.root, rpc, 'plan_build', { ...base, seeds }), /seed/i);
  const built = await queryProject(f.root, rpc, 'plan_build', { ...base, seeds: ['0', '2'] });
  assert.deepEqual(built.seeds, ['0', '2']);
  const plan = path.join(f.root, 'demo.yaml'); fs.writeFileSync(plan, built.yaml, 'utf8');
  const matrix = await queryProject(f.root, rpc, 'plan_matrix', { planFile: plan });
  assert.equal(matrix.seeds, 2); assert.equal(matrix.cases, 1); assert.equal(matrix.count, 2);
  fs.writeFileSync(plan, 'suite: demo\nseeds: [1, 2]\ncases: []\n', 'utf8');
  assert.equal((await queryProject(f.root, rpc, 'plan_matrix', { planFile: plan })).count, 0);
  fs.writeFileSync(plan, 'suite: demo\nseeds: [1, 2]\ncases:\n  - case: first\n    overrides: {model: A}\n  - case: second\n    overrides: {model: B}\n', 'utf8');
  const cases = await queryProject(f.root, rpc, 'plan_matrix', { planFile: plan });
  assert.equal(cases.count, 4); assert.equal(cases.cases, 2);
  fs.writeFileSync(plan, 'suite: demo\nseeds: [1, 2]\ncases:\n  - overrides: {model: A}\n  - overrides: {model: B}\n', 'utf8');
  const unnamed = await queryProject(f.root, rpc, 'plan_matrix', { planFile: plan });
  assert.equal(unnamed.count, 4); assert.equal(unnamed.cases, 2);
  fs.writeFileSync(plan, 'suite: demo\nseeds: [1, 2]\ncases: [{overrides: {model: A}}, {overrides: {model: B}}]\n', 'utf8');
  assert.equal((await queryProject(f.root, rpc, 'plan_matrix', { planFile: plan })).count, 4);
});
test('routine cleanup queries need no extra Codex prompt', async () => {
  const f = fixture();
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
  const f = fixture(), jobs = [0,1].map(index=>({index,case:'control',seed:42,outputDir:'work_dirs/'+index,status:'running',workerId:'worker-a',commandId:index?'second':'first'}));
  const plan = { id: 'workflow-1', projectId: canonicalProjectId(f.root), jobs };
  const closed = [];
  const host = { captureProjectContext: () => f.root, projectContextIsCurrent: value => value === f.root,
    saveDistributedQueue: async (root, unused, options) => { assert.equal(root, f.root); options.mutateLatest({ plans: [plan] }); },
    stopDistributedJobForClear: async (owner, job, local) => { assert.equal(owner, plan); assert.ok(job.stopIntent); assert.equal(local, true); closed.push(job.commandId); return { status: 'completed' }; },
  };
  await stopProjectTask(host, f.root, { workerId: 'worker-a', commandId: 'second', confirm: true });
  assert.deepEqual(closed, ['second']); assert.equal(jobs[0].stopIntent, undefined);
  assert.equal(jobs[0].status,'running');
  assert.equal(jobs[1].status,'cancelled');
  assert.equal(jobs[1].commandId,'second');
  assert.equal(jobs[1].stopIntent,undefined);
  await assert.rejects(stopProjectTask(host, f.root, { workerId: 'worker-a', commandId: 'other', confirm: true }), /EXACT_IDENTITY/);
  assert.deepEqual(closed, ['second']);
});

test('confirmed retained cancellation survives serialization, stale live projections and missing remote tasks', () => {
  const q = require('../../dist/features/DistributedPlanQueue.js');
  const now = Date.now(), job = { index: 0, case: 'control', seed: 42, status: 'running', lifecycleProtocol: 2,
    resultPathPolicy: 'declared', commandId: 'stopped-command', workerId: 'worker-a', outputDir: 'work_dirs/control', collectionResultCsv: 'work_dirs/control/metrics.csv' };
  const plan = { id: 'workflow-stop', projectId: 'project-stop', planFile: 'stop.yaml', resultPathPolicy: 'declared', jobs: [job] };
  q.confirmRetainedTaskStop(plan, job, now);
  const serialized = q.serializeDistributedQueue({ plans: [plan] });
  let restored = q.restoreFormalJobQueue(JSON.parse(serialized));
  assert.equal(restored.plans[0].jobs[0].status, 'cancelled');
  assert.equal(restored.plans[0].jobs[0].finishedAt, new Date(now).toISOString());
  const live = structuredClone(restored);
  Object.assign(live.plans[0].jobs[0], { status: 'unknown', executionState: 'missing', lastObservedAt: new Date(now).toISOString() });
  restored = q.keepCurrentObservations(restored, live, now);
  restored = q.mergeDurableWorkerSnapshots(restored, [{ workerId: 'worker-a', capabilities: { taskLifecycle: 2 }, tasks: [], fetchedAt: new Date(now).toISOString(), generatedAt: new Date(now).toISOString() }], plan.projectId, now);
  assert.equal(restored.plans[0].jobs[0].status, 'cancelled');
  assert.equal(restored.plans[0].jobs[0].commandId, 'stopped-command');
  const at = new Date(now + 1000).toISOString();
  for (const snapshots of [
    [],
    [{ workerId: 'worker-a', error: 'AGENT_PROJECT_MISMATCH', tasks: [], fetchedAt: at }],
    [{ workerId: 'worker-a', pending: true, tasks: [] }],
    [{ workerId: 'worker-a', capabilities: { taskLifecycle: 2 }, error: 'Worker query failed', tasks: [], fetchedAt: at }],
    [{ workerId: 'worker-a', capabilities: { taskLifecycle: 2 }, queryComplete: true, tasks: [], fetchedAt: at, generatedAt: at }],
  ]) {
    const input = q.restoreFormalJobQueue(JSON.parse(serialized));
    input.plans[0].jobs[0].status = 'unknown';
    const merged = q.mergeDurableWorkerSnapshots(input, snapshots, plan.projectId, now + 1000);
    const stopped = merged.plans[0].jobs[0];
    assert.equal(stopped.status, 'cancelled', JSON.stringify(snapshots));
    assert.equal(stopped.executionState, 'missing');
    assert.equal(stopped.finishedAt, new Date(now).toISOString());
    assert.deepEqual(stopped.trustedTerminalProof, job.trustedTerminalProof);
    assert.equal(input.plans[0].jobs[0].status, 'unknown', 'query projection must not mutate its input');
  }
  for (const change of [p => p.projectId = 'another-project', p => p.id = 'another-workflow', p => p.jobs[0].commandId = 'another-command', p => p.jobs[0].outputDir = 'work_dirs/another']) {
    const changed = JSON.parse(serialized); change(changed.plans[0]);
    assert.equal(q.restoreFormalJobQueue(changed).plans[0].jobs[0].status, 'unknown', 'cancellation proof cannot cross task identity');
    assert.equal(q.mergeDurableWorkerSnapshots(changed, [], changed.plans[0].projectId, now + 1000).plans[0].jobs[0].status,
      'unknown', 'live queries cannot restore another identity\'s cancellation');
  }
  const unconfirmed = JSON.parse(serialized);
  delete unconfirmed.plans[0].jobs[0].trustedTerminalProof;
  assert.equal(q.mergeDurableWorkerSnapshots(unconfirmed, [], plan.projectId, now + 1000).plans[0].jobs[0].status, 'unknown');
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
      methods: { 'mcp.catalog': () => PROJECT_TOOLS, 'mcp.call': () => ({ ok: true, name: 'SimpleExperiment', version,
        workspace: f.root, pid: process.pid, calls: ++calls }) } });
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

test('every advertised output schema validates errors and distinguishes request receipts from native results', () => {
  const { AjvJsonSchemaValidator } = require('@modelcontextprotocol/sdk/validation/ajv');
  const { LONG_TOOLS, toolOutputSchema } = require('../../dist/mcp/ToolResults.js');
  const ajv = new AjvJsonSchemaValidator();
  const validators = new Map(PROJECT_TOOLS.map(tool => [tool.name, ajv.getValidator(tool.outputSchema)]));
  for (const tool of PROJECT_TOOLS) {
    assert.equal(tool.outputSchema.type, 'object', tool.name);
    for (const code of [-32000, 'MCP_WORKSPACE_CHANGED'])
      assert.equal(validators.get(tool.name)({ ok: false, error: 'actual business error', code, detail: { reason: 'fixture' } }).valid, true, tool.name);
  }
  for (const name of LONG_TOOLS) {
    const receipt = { ok: true, operationId: 'mcp-request', status: 'running', requestScope: 'tool_request',
      receiptProvesExperimentCompletion: false, nextTool: 'operation_get', nextArguments: { operationId: 'mcp-request' } };
    assert.equal(validators.get(name)(receipt).valid, true, name);
    assert.equal(validators.get(name)({ ...receipt, receiptProvesExperimentCompletion: true }).valid, false, name);
  }
  assert.equal(validators.get('project_status')({ ok: true }).valid, false);
  assert.equal(validators.get('task_list')({ projectId: 'project', jobLifecycle: [{ commandId: 'running', exitCode: null }], workerTasks: [] }).valid, true);
  const operation = { operationId: 'mcp-result', status: 'succeeded', tool: 'result_list', resultAvailable: true, result: [{ id: 'result' }] };
  assert.equal(validators.get('operation_get')(operation).valid, true);
  assert.equal(validators.get('operation_get')({ ...operation, result: [7] }).valid, false, 'the original tool determines the delayed result type');
  assert.equal(validators.get('operation_get')({ ...operation, result: { ok: false, error: 'query failed', code: -32000 } }).valid, true);
  assert.throws(() => toolOutputSchema('undeclared_tool'), /OUTPUT_SCHEMA_MISSING/);
});

test('TensorBoard tools use the project Worker grant and cannot turn a forged confirmation into authority', async () => {
  const f = fixture();
  await f.gateway.call('tensorboard_status', { workerId: 'worker-a' });
  await f.gateway.call('tensorboard_viewer', { workerId: 'worker-a', view: 'scalars' });
  await assert.rejects(f.gateway.call('tensorboard_start', { workerId: 'worker-a' }), /AUTHORIZATION_REQUIRED/);
  await assert.rejects(f.gateway.call('tensorboard_stop', { workerId: 'worker-a', confirm: true }), /Unknown/);
  await assert.rejects(f.gateway.call('tensorboard_status', { workerId: 'other-worker' }), /WORKER_UNKNOWN/);
  await f.authorize(['experiment']);
  await f.gateway.call('tensorboard_start', { workerId: 'worker-a' });
  const start = f.calls.find(call => call.method === 'tensorboard.start');
  assert.equal(start.params.workerId, 'worker-a'); assert.equal(start.params.confirm, true);
  await f.store.update(AUTHORIZATION_KEY, undefined);
  await assert.rejects(f.gateway.call('tensorboard_stop', { workerId: 'worker-a' }), /AUTHORIZATION_REQUIRED/);
});

test('actual TensorBoard API returns service facts and a scoped viewer link without opening a browser', async () => {
  const ts = require('typescript'), vm = require('node:vm');
  const source = fs.readFileSync(path.resolve(__dirname, '../../src/extension/legacy.ts'), 'utf8');
  const ast = ts.createSourceFile('host.ts', source, ts.ScriptTarget.Latest, true), entries = [];
  const names = new Set(['tensorboard.status', 'tensorboard.start', 'tensorboard.stop', 'tensorboard.viewer']);
  function visit(node) {
    if (ts.isPropertyAssignment(node) && ts.isStringLiteral(node.name) && names.has(node.name.text)) entries.push(node.getText(ast));
    ts.forEachChild(node, visit);
  }
  visit(ast); assert.equal(entries.length, names.size);
  const make = vm.runInNewContext(ts.transpileModule('function make(){return {' + entries.join(',') + '};} make;', {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, { URL, UiCommandCancelled: Error, vscode: { workspace: { getConfiguration: () => ({ get: () => 6222 }) } } });
  let current = true, failStatus = false;
  const calls = [], service = { status: 'completed', windowId: '@41', running: true, listening: true, port: 6222 };
  const host = {
    postTensorboardAction: async (id, action, body) => { calls.push({ id, action, body }); return failStatus ? { status: 'failed', message: 'actual service failure' } : service; },
    openTensorBoardFromUi: async (message, external) => { assert.equal(external, false); calls.push(message); return { ...service, endpointId: message.endpointId, proxyVerified: true }; },
    stopTensorBoardFromUi: async message => ({ ...service, endpointId: message.endpointId, running: false, listening: false, closedWindowIds: ['@41'] }),
    captureProjectContext: () => ({ root: 'D:/project-acceptance' }), projectContextIsCurrent: () => current,
    tensorboardTarget: id => { assert.equal(id, 'worker-a'); },
    startLocalApiServer: async () => ({ viewerUrl: id => 'http://127.0.0.1:23456/tensorboard/?ticket=fixture&server=' + id }),
  };
  const methods = make.call(host);
  assert.equal((await methods['tensorboard.status']({ workerId: 'worker-a' })).port, 6222);
  assert.equal(calls[0].action, 'get-tensorboard-status');
  assert.equal((await methods['tensorboard.start']({ workerId: 'worker-a' })).proxyVerified, true);
  assert.equal((await methods['tensorboard.stop']({ workerId: 'worker-a' })).closedWindowIds[0], '@41');
  for (const view of ['scalars', 'native']) {
    const result = await methods['tensorboard.viewer']({ workerId: 'worker-a', view });
    const url = new URL(result.url);
    assert.equal(url.searchParams.get('workspace'), result.workspace);
    assert.equal(url.searchParams.get('server'), 'worker-a');
    assert.equal(url.searchParams.get('native'), view === 'native' ? 'ready' : null);
  }
  failStatus = true;
  await assert.rejects(methods['tensorboard.status']({ workerId: 'worker-a' }), /actual service failure/);
  current = false;
  await assert.rejects(methods['tensorboard.viewer']({ workerId: 'worker-a' }), /项目已切换/);
});

test('official MCP client validates named output contracts without losing arrays, extra evidence or errors', async () => {
  const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
  const { InMemoryTransport } = require('@modelcontextprotocol/sdk/inMemory.js');
  const { createProjectMcpServer } = require('../../dist/mcp/Server.js');
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const responses = {
    project_status: { ok: true, name: 'SimpleExperiment', version: 'fixture', workspace: '/fixture', pid: 1, extraEvidence: { untouched: true } },
    experiment_list: [{ id: 'job', status: 'cancelled', native_state: { command_id: 'job', exit_code: null } }],
    configuration_get: { key: 'simpleExperiment.showAdvancedCommands', value: false },
    operation_get: { operationId: 'mcp-result', status: 'succeeded', tool: 'result_show', resultAvailable: true,
      result: { id: 'result-native', metrics: { accuracy: 0.75 }, time: null, observedAt: null,
        outputFiles: ['work_dirs/control/metrics.csv', 'work_dirs/control/model.pt'] } },
  };
  let failure;
  const server = createProjectMcpServer('fixture', async (method, params) => {
    if (method === 'mcp.catalog') return PROJECT_TOOLS;
    if (failure) throw failure;
    return responses[params.tool];
  });
  const client = new Client({ name: 'output-contract-test', version: '1' });
  try {
    await server.connect(serverTransport); await client.connect(clientTransport);
    const catalog = await client.listTools();
    assert.equal(catalog.tools.length, PROJECT_TOOLS.length);
    assert.deepEqual((await client.callTool({ name: 'project_status', arguments: {} })).structuredContent, responses.project_status);
    assert.deepEqual((await client.callTool({ name: 'experiment_list', arguments: {} })).structuredContent, { result: responses.experiment_list });
    assert.equal((await client.callTool({ name: 'configuration_get', arguments: { key: 'simpleExperiment.showAdvancedCommands' } })).structuredContent.value, false);
    assert.deepEqual((await client.callTool({ name: 'operation_get', arguments: { operationId: 'mcp-result' } })).structuredContent, responses.operation_get);
    responses.operation_get.result.outputFiles = [{ path: 'invalid-object' }];
    await assert.rejects(client.callTool({ name: 'operation_get', arguments: { operationId: 'mcp-result' } }), /output schema/i);
    responses.operation_get = { operationId: 'mcp-service', status: 'succeeded', tool: 'tensorboard_start', resultAvailable: true,
      result: { status: 'completed', endpointId: 'worker-a', windowId: '@41', running: true, listening: true, proxyVerified: true } };
    assert.equal((await client.callTool({ name: 'operation_get', arguments: { operationId: 'mcp-service' } })).structuredContent.result.windowId, '@41');
    responses.project_status.version = 7;
    await assert.rejects(client.callTool({ name: 'project_status', arguments: {} }), /output schema/i);
    failure = Object.assign(new Error('original business failure'), { apiCode: -32000, apiData: { source: 'fixture' } });
    const rejected = await client.callTool({ name: 'project_status', arguments: {} });
    assert.equal(rejected.isError, true); assert.equal(rejected.structuredContent.code, -32000);
    assert.equal(rejected.structuredContent.error, 'original business failure');
    assert.deepEqual(rejected.structuredContent.detail, { source: 'fixture' });
  } finally { await client.close(); await server.close(); }
});
