const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { readSource } = require("../_helpers/sourceReader");

const source = readSource("src/extension.ts");

test("PLAN and result directories read the selected project folder's resource settings", () => {
  const uri = { fsPath: 'D:/acceptance-project' };
  for (const [name, endMarker, setting, value] of [
    ['planDirSafe', 'const DEFAULT_RESULT_CSV_DIR', 'planDir', 'custom/plans'],
    ['resultCsvDirSafe', 'const localPlanSummaryReadBudgetBytes', 'resultCsvDir', 'custom/results'],
  ]) {
    const start = source.indexOf('function ' + name + '(');
    const code = source.slice(start, source.indexOf(endMarker, start));
    let resource;
    const vscode = { workspace: { workspaceFolders: [{ uri }], getConfiguration: (_section, scope) => {
      resource = scope;
      return { get: key => { assert.equal(key, setting); return scope === uri ? value : 'workspace-default'; } };
    } } };
    const read = new Function('vscode', 'DEFAULT_RESULT_CSV_DIR', 'normalizeResultCsvDir', code + '; return ' + name + ';')(vscode, 'experiments/results', value => value);
    assert.equal(read(), value);
    assert.equal(resource, uri);
  }
});

test("changing the PLAN directory refreshes its catalog and file watchers before publishing state", async () => {
  const method = require('../_helpers/legacyMethod')(source, 'handleConfigurationChanged(');
  const events = [];
  const host = { effectiveConnectionMode: () => 'xshell_tunnel_realtime',
    ensureSelectedPlanFileWatchers: reason => events.push(['watch', reason]),
    refreshLocalPlanMetadata: async options => events.push(['refresh', options]),
    postState: () => events.push(['post']) };
  const run = new Function('return ({' + method + '}).handleConfigurationChanged;')();
  await run.call(host, {affectsConfiguration: key => ['simpleExperiment', 'simpleExperiment.planDir'].includes(key)});
  assert.equal(events[0]?.[0], 'watch');
  assert.deepEqual(events[1], ['refresh', {force: true, post: false}]);
  assert.equal(events.at(-1)[0], 'post');
});

test("the public PLAN catalog waits for metadata refresh instead of returning the previous directory", async () => {
  const start = source.indexOf('"plans.list": async');
  const end = source.indexOf('"results.list":', start);
  const factory = new Function('return function () { return ({' + source.slice(start, end) + '}); };')();
  const host = {localPlanMetadata:{planDir:'old',plans:['old']},
    refreshLocalPlanMetadata: async () => { host.localPlanMetadata={planDir:'new',plans:['new']}; }};
  const result = await factory.call(host)['plans.list']();
  assert.equal(result.planDir, 'new');
  assert.deepEqual(result.plans, ['new']);
});

test("connection setting changes refresh the live client without reloading VS Code", () => {
  assert.match(source, /onDidChangeConfiguration\(\(event\) => void provider\?\.handleConfigurationChanged\(event\)\)/);
  const start = source.indexOf("async handleConfigurationChanged(event)");
  const end = source.indexOf("async clearOfflineImport()", start);
  assert.ok(start > 0 && end > start, "configuration change handler missing");
  const flow = source.slice(start, end);
  assert.match(flow, /affectsConfiguration\?\.\("simpleExperiment"\)/);
  assert.match(flow, /affectsConfiguration\("simpleExperiment\.connectionMode"\)/);
  assert.match(flow, /affectsConfiguration\("simpleExperiment\.tunnel"\)/);
  assert.match(flow, /this\.tunnelConfig = this\.loadTunnelConfig\(\)/);
  assert.match(flow, /this\.setupConfig = this\.loadSetupConfig\(\)/);
  assert.match(flow, /this\.resetClient\(\)/);
  assert.match(flow, /await this\.ensureRealtimeConnected\("configuration changed"\)/);
  assert.match(flow, /this\.postState\(true\)/);
  assert.match(flow, /SimpleExperiment 已切换为 Xshell 实时隧道模式/);
  assert.match(flow, /next === "继续识别工作区"[\s\S]{0,100}this\.bootstrapProjectFromUi\(\)/);
});
