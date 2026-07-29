const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");
const readme = fs.readFileSync(path.join(__dirname, "../../README.md"), "utf8");
const guide = fs.readFileSync(path.join(__dirname, "../../docs/simple-experiment-setup.md"), "utf8");

function methodBody(name, nextName) {
  const start = source.indexOf(`    ${name}(`);
  const end = source.indexOf(`    ${nextName}(`, start + 1);
  assert.ok(start >= 0 && end > start, `missing ${name}`);
  return source.slice(start, end);
}

test("workspace folder changes reload isolated project context", () => {
  assert.match(source, /onDidChangeWorkspaceFolders\(\(\) => void provider\?\.handleWorkspaceFoldersChanged\(\)\)/);
  const handler = methodBody("handleWorkspaceFoldersChanged", "async reloadProjectContextAfterWorkspaceChange");
  const flow = methodBody("async reloadProjectContextAfterWorkspaceChange", "resetProjectContextInMemory");
  const reset = methodBody("resetProjectContextInMemory", "async migrateLegacyProjectUiStateFromVsCode");
  assert.match(handler, /previous\.catch\(\(\) => undefined\)[\s\S]*\.then\(\(\) => this\.reloadProjectContextAfterWorkspaceChange\(\)\)/);
  assert.match(handler, /recordActionError\(\{ command: "workspaceChanged"/);
  assert.match(handler, /this\.workspaceChangePromise === current/);
  assert.ok(flow.indexOf("resetProjectContextInMemory()") < flow.indexOf("resetClient()"));
  assert.ok(flow.indexOf("resetClient()") < flow.indexOf("bootstrapProjectLocalUiState()"));
  assert.ok(flow.indexOf("bootstrapProjectLocalUiState()") < flow.indexOf("refreshLocalPlanMetadata"));
  assert.match(flow, /ensureSelectedPlanFileWatchers\("workspace folders changed"\)/);
  assert.match(flow, /testTunnel\(false\)/);
  assert.match(flow, /postState\(true\)/);

  for (const pattern of [
    /projectContextGeneration \+= 1/,
    /selectedPlanId = undefined/,
    /planFileInput = undefined/,
    /selectedExperimentIds\.clear\(\)/,
    /selectedRunKeys\.clear\(\)/,
    /selectedArchiveKeys\.clear\(\)/,
    /selectedTaskUiKeys\.clear\(\)/,
    /planSelectionPersistenceQueue\.dirty = false/,
    /taskSelectionPersistenceQueue\.dirty = false/,
    /projectStatePersistenceQueues\.values\(\)/,
    /offlineBundle = undefined/,
    /resultsSummary = undefined/,
    /projectPptPlotConfig = undefined/,
    /projectUiLayout = undefined/,
    /localOperations = \{\}/,
    /lastCodeSyncState = \{\}/,
    /confirmedRemotePaths = \[\]/,
    /confirmedPptPaths = \[\]/,
    /lastSnapshot = undefined/,
    /lastRealtimeState = undefined/,
    /gpuHistoryState\.reset\(\)/,
    /lastProbe = undefined/,
    /lastWorkerProbes = \{\}/,
  ]) assert.match(reset, pattern);
});

test("project selection writes are coalesced and isolated across workspace changes", () => {
  const planPersist = methodBody("async persistProjectPlanSelectionState", "reconcileProjectPlanSelection");
  const taskPersist = methodBody("async persistProjectTaskSelectionState", "private async persistCoalescedProjectState<T>");
  const coalesced = methodBody("private async persistCoalescedProjectState<T>", "private queueProjectStatePersistence<T>");
  const queue = methodBody("private queueProjectStatePersistence<T>", "async loadProjectOfflineBundleState");

  assert.match(planPersist, /persistCoalescedProjectState\(this\.planSelectionPersistenceQueue/);
  assert.match(taskPersist, /persistCoalescedProjectState\(this\.taskSelectionPersistenceQueue/);
  assert.match(coalesced, /queue\.dirty = true/);
  assert.match(coalesced, /while \(queue\.promise\)/);
  assert.match(queue, /const projectContext = this\.captureProjectContext\(\)/);
  assert.match(queue, /while \(queue\.dirty && this\.projectContextIsCurrent\(projectContext\)\)/);
  assert.match(queue, /queue\.dirty = false;\s*await write\(projectContext\.root, state\)/);
  assert.match(queue, /if \(!this\.projectContextIsCurrent\(projectContext\)\)\s*return/);
  assert.match(queue, /queue\.promise === persistence/);
});

test("all remaining project JSON states use independent coalesced queues", () => {
  const cases = [
    ["OfflineBundle", "offlineBundle", "writeProjectOfflineBundleState"],
    ["ActionErrors", "actionErrors", "writeProjectActionErrorsState"],
    ["PptPlotConfig", "pptPlotConfig", "writeProjectPptPlotConfigState"],
    ["UiLayout", "uiLayout", "writeProjectUiLayoutState"],
    ["DebugBundle", "debugBundle", "writeProjectDebugBundleState"],
    ["CodeSync", "codeSync", "writeProjectCodeSyncState"],
    ["RemotePathConfirmations", "remotePathConfirmations", "writeProjectRemotePathConfirmationsState"],
    ["PptPathConfirmations", "pptPathConfirmations", "writeProjectPptPathConfirmationsState"],
    ["LocalPlanMetadata", "localPlanMetadata", "writeProjectLocalPlanMetadataState"],
  ];
  for (const [name, key, writer] of cases) {
    const pattern = new RegExp(`async persistProject${name}State\\(\\) \\{[\\s\\S]{0,420}persistCoalescedProjectState\\(this\\.projectStatePersistenceQueue\\("${key}"\\)[\\s\\S]{0,320}${writer}`);
    assert.match(source, pattern, name);
  }
  const queueLookup = methodBody("private projectStatePersistenceQueue", "private queueProjectStatePersistence<T>");
  assert.match(queueLookup, /projectStatePersistenceQueues\.get\(key\)/);
  assert.match(queueLookup, /projectStatePersistenceQueues\.set\(key, queue\)/);
});

test("workspace reset precedes project loaders and stale scans cannot win", () => {
  const flow = methodBody("async reloadProjectContextAfterWorkspaceChange", "resetProjectContextInMemory");
  assert.ok(flow.indexOf("resetProjectContextInMemory()") < flow.indexOf("bootstrapProjectLocalUiState()"));
  assert.match(source, /generation !== this\.projectContextGeneration \|\| root !== workspaceRoot\(\)/);
  assert.match(source, /if \(this\.localPlanMetadataRefreshPromise === refresh\)/);
  assert.ok([...source.matchAll(/generation !== this\.projectContextGeneration/g)].length >= 6);
  assert.match(source, /const client = this\.client;[\s\S]{0,260}const summary = await client\.getResultsSummary\(planFile\);\s*if \(generation !== this\.projectContextGeneration \|\| client !== this\.client\)\s*return;\s*this\.resultsSummary = summary/);
  assert.match(source, /client\.postAction\(action, request\)[\s\S]{0,260}generation !== this\.projectContextGeneration \|\| client !== this\.client/);
  assert.match(source, /client\.postWorkerAction\(workerId, action, request\)[\s\S]{0,260}generation !== this\.projectContextGeneration \|\| client !== this\.client/);
  assert.match(readme, /切换工作区目录.*清空上一项目/);
  assert.match(guide, /切换工作区目录.*重新加载/);
});

test("stale plan watcher and debounce callbacks cannot cross workspace context", () => {
  const dispose = methodBody("disposeSelectedPlanFileWatchers", "ensureSelectedPlanFileWatchers");
  const ensure = methodBody("ensureSelectedPlanFileWatchers", "handleLocalPlanTextDocumentSave");
  const event = methodBody("async handleLocalPlanFileSystemEvent", "scheduleSelectedPlanLocalChangeParse");
  const debounce = methodBody("scheduleSelectedPlanLocalChangeParse", "queueResultParseAfterProjectChange");
  const reset = methodBody("resetProjectContextInMemory", "async migrateLegacyProjectUiStateFromVsCode");
  assert.match(source, /private planFileWatcherGeneration = 0/);
  assert.match(source, /private planLocalChangeParseGeneration = 0/);
  assert.match(dispose, /this\.planFileWatcherGeneration \+= 1/);
  assert.match(ensure, /const watcherGeneration = this\.planFileWatcherGeneration/);
  assert.match(ensure, /handleLocalPlanFileSystemEvent\(uri, watcherGeneration, root\)/);
  assert.match(event, /const generation = this\.projectContextGeneration/);
  assert.match(event, /root !== expectedRoot \|\| watcherGeneration !== this\.planFileWatcherGeneration/);
  assert.ok([...event.matchAll(/generation !== this\.projectContextGeneration \|\| root !== workspaceRoot\(\) \|\| watcherGeneration !== this\.planFileWatcherGeneration/g)].length >= 2);
  assert.match(debounce, /const timerGeneration = \+\+this\.planLocalChangeParseGeneration/);
  assert.match(debounce, /timerGeneration !== this\.planLocalChangeParseGeneration \|\| generation !== this\.projectContextGeneration \|\| root !== workspaceRoot\(\)/);
  assert.match(reset, /this\.planLocalChangeParseGeneration \+= 1/);
});

test("stale project-local state reads cannot overwrite the new workspace", () => {
  const bootstrap = methodBody("async bootstrapProjectLocalUiState", "captureProjectContext");
  const reader = methodBody("async readCurrentProjectState", "handleWorkspaceFoldersChanged");
  assert.match(bootstrap, /const projectContext = this\.captureProjectContext\(\)/);
  assert.match(bootstrap, /projectContextIsCurrent\(projectContext\)[\s\S]*migrateLegacyProjectUiStateFromVsCode\(projectContext\)/);
  assert.match(reader, /const context = this\.captureProjectContext\(\)/);
  assert.match(reader, /current: this\.projectContextIsCurrent\(context\)/);

  for (const stateReader of [
    "readProjectPlanSelectionState",
    "readProjectTaskSelectionState",
    "readProjectOfflineBundleState",
    "readProjectActionErrorsState",
    "readProjectPptPlotConfigState",
    "readProjectUiLayoutState",
    "readProjectDebugBundleState",
    "readProjectCodeSyncState",
    "readProjectRemotePathConfirmationsState",
    "readProjectPptPathConfirmationsState",
    "readProjectLocalOperationsState",
    "readProjectLocalPlanMetadataState",
  ]) {
    assert.match(source, new RegExp(`readCurrentProjectState\\(${stateReader}\\)`), stateReader);
    assert.doesNotMatch(source, new RegExp(`${stateReader}\\(workspaceRoot\\(\\)\\)`), stateReader);
  }

  const migration = methodBody("async migrateLegacyProjectUiStateFromVsCode", "effectiveConnectionMode");
  assert.match(migration, /projectContext = this\.captureProjectContext\(\)/);
  assert.ok([...migration.matchAll(/projectContextIsCurrent\(projectContext\)/g)].length >= 6);
});

test("offline bundle import cannot apply stale project state", () => {
  const source = methodBody("async importOffline", "async handleMessage");
  assert.match(source, /const generation = this\.projectContextGeneration/);
  assert.match(source, /const root = workspaceRoot\(\)/);
  assert.ok([...source.matchAll(/generation !== this\.projectContextGeneration \|\| root !== workspaceRoot\(\)/g)].length >= 4);
  assert.match(source, /await this\.pauseRealtimeStream\(\)/);
  assert.match(source, /this\.offlineBundle = result\.bundle/);
  assert.match(source, /if \(generation === this\.projectContextGeneration && root === workspaceRoot\(\)\)\s*this\.postState\(\)/);
});

test("stale network probes and realtime callbacks cannot overwrite the new project", () => {
  const tunnel = methodBody("async testTunnel", "async runXshellRealIntegrationCheck");
  const integration = methodBody("async runXshellRealIntegrationCheck", "async restartRealtimeStream");
  const snapshot = methodBody("async manualSnapshot", "async manualGpuSnapshot");
  const connect = methodBody("async ensureRealtimeConnected", "async migrateLegacyConfigOnce");
  const client = methodBody("private createClient", "private shouldPushLocalAvailabilityFromRealtime");
  assert.match(tunnel, /const generation = this\.projectContextGeneration/);
  assert.ok([...tunnel.matchAll(/generation !== this\.projectContextGeneration/g)].length >= 4);
  assert.match(tunnel, /const nextWorkerProbes = \{\}/);
  assert.ok(tunnel.indexOf("const nextWorkerProbes") < tunnel.indexOf("this.lastProbe = probe"));
  assert.match(integration, /generation !== this\.projectContextGeneration/);
  assert.match(snapshot, /generation !== this\.projectContextGeneration/);
  assert.match(connect, /client !== this\.client/);
  assert.match(client, /generation !== this\.projectContextGeneration \|\| client !== this\.client/);
  assert.match(readme, /旧项目尚未完成的项目状态文件回读、检测或实时回调都会被丢弃/);
  assert.match(guide, /旧项目尚未完成的项目状态文件回读、检测、快照或实时回调不会写入新项目/);
});

test("stale Xshell library scans cannot overwrite a new project or request key", () => {
  const refresh = methodBody("async refreshXshellSessionLibrary", "private xshellLibraryRequestKey");
  const key = methodBody("private xshellLibraryRequestKey", "configuredXshellSessionPaths");
  const reset = methodBody("resetProjectContextInMemory", "async migrateLegacyProjectUiStateFromVsCode");
  assert.match(source, /xshellLibraryRefreshPromiseKey = ""/);
  assert.match(refresh, /const requestKey = this\.xshellLibraryRequestKey\(dirs, configuredPaths\)/);
  assert.match(refresh, /const generation = this\.projectContextGeneration/);
  assert.match(refresh, /this\.xshellLibraryRefreshPromiseKey === requestKey/);
  assert.match(refresh, /generation !== this\.projectContextGeneration \|\| requestKey !== this\.xshellLibraryRequestKey\(\)/);
  assert.match(refresh, /if \(this\.xshellLibraryRefreshPromise === refresh\)/);
  assert.match(refresh, /this\.xshellLibraryRefreshPromiseKey = requestKey/);
  assert.match(key, /dirs: dirs\.map/);
  assert.match(key, /sessions: configuredPaths\.map/);
  assert.match(reset, /this\.xshellLibraryRefreshPromise = undefined/);
  assert.match(reset, /this\.xshellLibraryRefreshPromiseKey = ""/);
});
