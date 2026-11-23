const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../../src/extension/legacy.ts'), 'utf8');
const start = source.indexOf('    async archivePlanCopyFromUi(');
const end = source.indexOf('    private planCleanupHosts', start);
assert.ok(start >= 0 && end > start);
const ast = ts.createSourceFile('legacy.ts', source, ts.ScriptTarget.Latest, true);
const cls = ast.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'RealtimeTunnelPanelProvider');
const names = ['mappedDownloadServerForSource', 'workerCodeSyncTargets', 'workerCodeSyncTarget', 'workerActualWorkRootTarget', 'agentRuntimeDirs', 'sftpServerOptions', 'sshTransportIdentity'];
const methods = cls.members.filter(node => names.includes(node.name?.getText(ast))).map(node => node.getText(ast));
assert.equal(methods.length, names.length);
function fixture(changeAt) {
  let current = true, hostName = 'server', actualRoot = '/actual/project', posts = 0, downloads = 0, notices = [], confirmation = '', targets = [];
  class Cancelled extends Error {}
  const box = { path, crypto: { randomBytes: () => ({ toString: () => 'abcdef' }) }, UiCommandCancelled: Cancelled, makeOpId: () => 'fake-op',
    stringField: (m, k) => m[k], firstNonEmpty: (...items) => items.find(Boolean) || '', remoteProjectName: () => 'project', normalizeRemoteWorkRoot: value => value,
    AgentTmuxPolicy_1: { remoteAgentDirectoryName: () => '.agent' },
    SshTransportIdentity_1: { resolveSshTransportIdentity: target => ({ transportHost: target.host, networkHost: target.host }), buildSftpServerOptions: (target, identity) => ({ host: identity.transportHost, remotePath: target.remotePath }) },
    safeWorkspaceChildPath: (root, child) => path.join(root, child), safeArchiveBundleChildPath: (root, child) => path.join(root, child),
    safePlanToken: value => value, resultStatus: value => value?.status, remoteActionPendingStatus: () => false,
    partitionMappedDownloadTransfers: entries => [entries], MAPPED_RESULT_DOWNLOAD_MAX_ENTRIES: 100, MAPPED_RESULT_DOWNLOAD_MAX_BATCH_BYTES: 1000,
    fs: { readFile: async () => JSON.stringify({ planFile: 'p.yaml', files: [] }) },
    vscode: { window: { showWarningMessage: async text => { confirmation = text; if (changeAt === 'confirmation') hostName = 'changed'; if (changeAt === 'root') actualRoot = '/other'; return '确认复制归档'; }, showInformationMessage: text => notices.push(text) } } };
  vm.createContext(box);
  vm.runInContext(ts.transpileModule(`class Host { ${source.slice(start, end)} ${methods.join('\n')} } this.Host=Host`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, box);
  const host = new box.Host();
  const client = { postWorkerAction: async (_id, _action, request) => {
    posts++; if (changeAt === 'post') current = false;
    const archivePath = `archives/p/${request.snapshotName}`;
    return { status: 'completed', archivePath, files: [`${archivePath}/manifest.json`] };
  } };
  Object.assign(host, { client, captureProjectContext: () => ({ root: 'project-a' }), projectContextIsCurrent: () => current,
    resolveSelectedPlanFile: () => 'p.yaml', filterResultsSummaryForPlan: () => ({ aggregateStatus: 'ready' }),
    enabledWorkerConfigs: () => ['w1', 'w2'].map(id => ({ id, agentProjectDir: `${actualRoot}/${id}`, workerHost: hostName })),
    missingWorkerActionCapabilities: () => [], setupConfig: { remotePath: '/obsolete/root' },
    simpleSftpApiCall: async (_method, options) => { downloads++; targets.push(options.server.remotePath); if (changeAt === 'download') current = false; return { fileCount: options.entries.length }; } });
  return { host, get posts() { return posts; }, get downloads() { return downloads; }, get confirmation() { return confirmation; }, targets, notices };
}
test('changed Worker or project stops before the next archive effect', async () => {
  for (const [point, expectedPosts, expectedDownloads] of [['confirmation', 0, 0], ['root', 0, 0], ['post', 1, 0], ['download', 1, 1]]) {
    const f = fixture(point);
    await assert.rejects(f.host.archivePlanCopyFromUi({ planFile: 'p.yaml' }), /变化|切换/);
    assert.equal(f.posts, expectedPosts); assert.equal(f.downloads, expectedDownloads);
  }
});
test('unchanged project completes both workers with fake endpoints', async () => {
  const f = fixture();
  await f.host.archivePlanCopyFromUi({ planFile: 'p.yaml' });
  assert.equal(f.posts, 2); assert.equal(f.downloads, 2); assert.equal(f.notices.length, 1);
  assert.deepEqual(f.targets, ['/actual/project/w1/project', '/actual/project/w2/project']);
  for (const target of f.targets) assert.ok(f.confirmation.includes(`${target}/archives/p/`));
  assert.doesNotMatch(f.confirmation, /obsolete/);
});
