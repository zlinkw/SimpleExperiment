/* Explicit recovery of existing results through live Simple APIs and the production publication chain. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Module = require('node:module');

async function rpc(plugin, method, params) {
  const discovery = JSON.parse(fs.readFileSync(path.join(process.env.APPDATA, plugin, 'api.json'), 'utf8'));
  const endpoint = new URL(discovery.baseUrl);
  if (endpoint.protocol !== 'http:' || !['127.0.0.1', 'localhost', '::1'].includes(endpoint.hostname)) throw new Error('API discovery is not loopback');
  const headers = { Authorization: 'Bearer ' + discovery.token, 'Content-Type': 'application/json' };
  const capability = await fetch(new URL('/api/v1/capabilities', endpoint), { headers, signal: AbortSignal.timeout(15000) }).then(response => response.json());
  if (!capability.methods?.includes(method)) throw new Error('Unsupported live method: ' + method);
  const response = await fetch(new URL('/api/v1/rpc', endpoint), { method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(60000) }).then(response => response.json());
  if (response.error) throw new Error(response.error.message);
  return response.result;
}

async function main() {
  const args = process.argv.slice(2), option = name => args[args.indexOf(name) + 1];
  if (!args.includes('--workspace') || !args.includes('--plan') || !args.includes('--publish'))
    throw new Error('Usage: node scripts/recover-wrapper-results.js --workspace <root> --plan <file> --publish [--run <id>]');
  const root = path.resolve(option('--workspace')), planFile = option('--plan').replace(/\\/g, '/');
  const state = await rpc('SimpleExperiment', 'state', {});
  if (path.resolve(state.workspace?.hostPath || state.workspace?.root || '').toLowerCase() !== root.toLowerCase()) throw new Error('Active API workspace does not match requested root');
  const metadata = state.plans.find(plan => plan.planFile === planFile);
  if (!metadata) throw new Error('Plan is not in current live project metadata');
  const profiles = (await rpc('SimpleSFTP', 'servers.list', {})).servers;
  const targets = new Map();
  for (const worker of state.setup.workerTunnels.filter(worker => worker.enabled !== false)) {
    const profile = profiles.find(server => server.id === worker.id);
    if (!profile) continue;
    const configuredRoot = String(worker.agentProjectDir || '').replace(/\/+$/, '');
    const expected = path.posix.basename(configuredRoot).toLowerCase() === path.basename(root).toLowerCase()
      ? configuredRoot : configuredRoot + '/' + path.basename(root);
    if (profile.remotePath !== expected || profile.user !== worker.workerUser || Number(profile.port) !== Number(worker.workerSshPort))
      throw new Error('SFTP profile does not match configured Worker project: ' + worker.id);
    targets.set(worker.id, { ...profile, localBase: root });
  }
  const storage = path.join(process.env.APPDATA, 'Code/User/globalStorage/simple-local.simple-experiment');
  const queueModule = require('../dist/features/DistributedPlanQueue');
  const queue = JSON.parse(fs.readFileSync(queueModule.distributedQueuePath(storage, root), 'utf8'));
  if (args.includes('--run')) {
    queue.plans = queue.plans.filter(plan => plan.id === option('--run') && plan.planFile === planFile);
    if (queue.plans.length !== 1) throw new Error('Requested run is not an authoritative local queue entry');
  }
  const vscode = { workspace: { workspaceFolders: [{ uri: { fsPath: root, scheme: 'file', path: root } }],
      getConfiguration: () => ({ get: (name, fallback) => name === 'projectAdapterRules' ? state.detectedProject.adapterRules : fallback }) },
    extensions: { getExtension: () => ({ extensionPath: path.resolve(__dirname, '..'), packageJSON: require('../package.json') }) },
    Uri: { file: fsPath => ({ fsPath }) }, ProgressLocation: { Notification: 1 },
    window: { withProgress: async (_options, work) => work({ report() {} }, { isCancellationRequested: false }),
      showWarningMessage: async () => {}, showInformationMessage: async () => {}, setStatusBarMessage() {} } };
  const originalLoad = Module._load;
  Module._load = function (name, ...params) { return name === 'vscode' ? vscode : originalLoad.call(this, name, ...params); };
  let Provider;
  try { Provider = require('../dist/extension/legacy').RealtimeTunnelPanelProvider; } finally { Module._load = originalLoad; }
  const { HostOperationLeaseManager } = require('../dist/core/HostOperationLease');
  const host = Object.create(Provider.prototype);
  Object.assign(host, { client: {}, context: { globalStorageUri: { fsPath: storage } },
    hostOperationLease: new HostOperationLeaseManager(), resultCsvDirectory: state.detectedProject.resultsDir || 'experiments/results',
    localPlanMetadata: { plans: [metadata], detectedProject: state.detectedProject },
    captureProjectContext: () => ({ root, generation: 1 }), projectContextIsCurrent: () => true,
    effectiveConnectionMode: () => 'tunnel', actionBody: body => body,
    refreshLocalPlanMetadataForAction: async () => {}, loadDistributedQueue: async () => queue,
    loadPlanSyncLedger: async () => ({ schemaVersion: 2, entries: {} }), resolveSelectedPlanFile: () => planFile,
    enabledWorkerConfigs: () => [...targets.keys()].map(id => ({ id })),
    mappedDownloadServerForSource: id => { if (!targets.has(id)) throw new Error('No verified source for ' + id); return targets.get(id); },
    postState() {}, invalidateResultCatalogCache() {} });
  const report = await host.rebuildProjectResultTablesFromUi({ planFiles: [planFile] });
  const registry = JSON.parse(fs.readFileSync(path.join(root, 'simple_cluster/results/project_table_registry.json'), 'utf8'));
  const evidence = registry.plans[planFile]?.wrapperEvidence;
  if (!evidence) throw new Error('No persistent wrapper evidence was published: ' + JSON.stringify(report));
  const identities = [];
  for (const job of evidence.jobs) for (const source of job.sources) {
    const bytes = fs.readFileSync(path.join(root, source.localRelativePath));
    if (crypto.createHash('sha256').update(bytes).digest('hex') !== source.sha256) throw new Error('Persisted SHA256 mismatch');
    const provenance = JSON.parse(fs.readFileSync(path.join(root, source.localRelativePath + '.provenance.json'), 'utf8'));
    if (provenance.job.runId !== evidence.runId || provenance.job.outputDir !== job.job.outputDir) throw new Error('Persisted job identity mismatch');
    identities.push({ runId: job.job.runId, attempt: job.job.attempt, case: job.job.case, seed: job.job.seed, worker: job.job.workerId,
      jobDir: job.job.outputDir, checkpoint: job.checkpointPath, path: source.localRelativePath, source: source.remotePath, sha256: source.sha256 });
  }
  console.log(JSON.stringify({ version: require('../package.json').version, execution: 'production helper + live SimpleSFTP API; Extension Host unchanged',
    planFile, runId: evidence.runId, jobs: evidence.jobs.length, files: identities.length, sha256Verified: identities.length, report,
    identities: args.includes('--verbose') ? identities : evidence.jobs.map(job => ({ ...job.job, sources: job.sources.length, checkpoint: job.checkpointPath })) }, null, 2));
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { rpc };
