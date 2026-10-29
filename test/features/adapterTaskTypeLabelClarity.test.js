const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { readSource } = require("../_helpers/sourceReader");

const panel = readSource("src/ui/PanelHtml.ts");

function extractFunction(name) {
  const start = panel.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing ${name}`);
  const bodyStart = panel.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < panel.length; index += 1) {
    if (panel[index] === "{") depth += 1;
    if (panel[index] === "}") depth -= 1;
    if (depth === 0) return panel.slice(start, index + 1);
  }
  throw new Error(`unterminated ${name}`);
}

function extractFrozenObject(name) {
  const start = panel.indexOf(`const ${name} = Object.freeze({`);
  assert.ok(start >= 0, `missing ${name}`);
  const end = panel.indexOf("});", start);
  assert.ok(end > start, `unterminated ${name}`);
  return panel.slice(start, end + 3);
}

function loadTaskTypeLabel() {
  const sandbox = {};
  vm.createContext(sandbox);
  const runtimeFunction = extractFunction("projectTaskTypeLabel").replace(/\\\\/g, "\\");
  vm.runInContext(`${extractFrozenObject("PROJECT_TASK_TYPE_LABELS")}\n${runtimeFunction}\nthis.taskTypeLabel = projectTaskTypeLabel;\nthis.taskTypeLabels = PROJECT_TASK_TYPE_LABELS;`, sandbox);
  return sandbox;
}

test("project adapter summaries translate common task types", () => {
  const sandbox = loadTaskTypeLabel();
  assert.equal(sandbox.taskTypeLabel("classification"), "分类");
  assert.equal(sandbox.taskTypeLabel("object-detection"), "目标检测");
  assert.equal(Object.isFrozen(sandbox.taskTypeLabels), true);
  assert.match(panel, /const PROJECT_TASK_TYPE_LABELS = Object\.freeze\(\{/);
  assert.match(panel, /"任务 " \+ projectTaskTypeLabel\(rules\.taskType \|\| "generic"\)/);
});

test("project adapter editor and unknown task types remain compatible", () => {
  const sandbox = loadTaskTypeLabel();
  assert.match(panel, /configSelect\("projectAdapterRules", "taskType", "任务类型", taskType/);
  assert.equal(sandbox.taskTypeLabel("future-task"), "future-task");
  assert.equal(sandbox.taskTypeLabel(""), "未指定");
  assert.match(extractFunction("projectTaskTypeLabel"), /PROJECT_TASK_TYPE_LABELS\[key\] \|\| raw \|\| "未指定"/);
  assert.doesNotMatch(extractFunction("projectTaskTypeLabel"), /const labels =/);
});

test("rendered integration editor supports generic, regression and custom projects without forced AUC", () => {
  const panelFunction = require('../_helpers/panelFunction');
  const sandbox = { configDraftValue: (_scope, _key, value) => value, configHelp: () => '', helpBadge: () => '',
    esc: String, escAttr: String, detailsOpenAttr: () => '', adapterRulesArePartial: () => false,
    uniqueText: rows => [...new Set(rows)], asArray: value => Array.isArray(value) ? value : [],
    isParseableResultCandidate: () => true, renderAdapterRuleSummary: () => '' };
  for (const name of ['configSelect','projectRuleInput','projectRuleTextarea','asEditorList','mapToLines','projectTaskTypeHint','renderProjectRuleEditor'])
    vm.runInNewContext(panelFunction(name), sandbox);
  for (const taskType of ['generic','classification','segmentation','regression','future-task']) {
    const html = sandbox.renderProjectRuleEditor({ taskType, primaryMetric: 'project_score', secondaryMetrics: ['custom'], metricAliases: { raw_score: 'project_score' } });
    assert.ok(html.includes('value="' + taskType + '" selected'));
    assert.match(html,/data-key="primaryMetric" value="project_score"/);
    assert.match(html,/raw_score: project_score/);
    assert.doesNotMatch(html,/分割只保留兼容入口|默认分类任务/);
  }
  const generic = sandbox.renderProjectRuleEditor({});
  assert.match(generic,/data-key="primaryMetric" value=""/);
  assert.match(generic,/value="generic" selected/);
});

test('task type changes update only suggestion text and GPU refresh keeps its narrow command',()=>{
 const panelFunction=require('../_helpers/panelFunction'),hint={textContent:''};
 const sandbox={};for(const name of ['projectTaskTypeHint','updateProjectTaskTypeHint'])vm.runInNewContext(panelFunction(name),sandbox);
 sandbox.updateProjectTaskTypeHint({value:'regression',closest:()=>({querySelector:selector=>{assert.equal(selector,'[data-project-task-type-hint]');return hint;}})});
 assert.match(hint.textContent,/RMSE.*MAE.*R2/);
 const html=require('../../dist/ui/PanelHtml').renderPanelHtml();
 assert.match(html,/data-command="manualGpuSnapshot" title="仅刷新当前启用 Worker 的 GPU 状态"/);
 assert.doesNotMatch(html,/data-command="snapshot" title="刷新 GPU 状态"/);
});

test('trial updates show running and authoritative versions without claiming official promotion',()=>{
 const panelFunction=require('../_helpers/panelFunction'),pkg=require('../../package.json'),policy=require('../../docs/release-policy.json');
 const sandbox={panelReleaseTrack:pkg.simpleExperimentRelease,panelRunningVersion:pkg.version,esc:String,pluginUpdateStatusLabel:String,setHtmlIfChanged:(_id,html)=>sandbox.html=html};
 vm.runInNewContext(panelFunction('renderPluginUpdateSettings'),sandbox);
 sandbox.renderPluginUpdateSettings({pluginUpdate:{status:'up_to_date',experiment:{label:'SimpleExperiment',currentVersion:pkg.version,latestVersion:policy.authoritative.simpleExperiment.version,updateAvailable:false}}});
 assert.ok(sandbox.html.includes('试行版 '+pkg.version));assert.ok(sandbox.html.includes('权威版固定为 '+policy.authoritative.simpleExperiment.version));
 assert.equal(pkg.simpleExperimentRelease.authoritativeSftpVersion,policy.authoritative.simpleSftp.version);
 assert.doesNotMatch(sandbox.html,/已是最新/);assert.match(sandbox.html,/不降级/);
});
