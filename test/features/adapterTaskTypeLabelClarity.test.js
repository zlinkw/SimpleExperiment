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
  assert.match(panel, /"任务 " \+ projectTaskTypeLabel\(rules\.taskType \|\| ""\)/);
  assert.match(panel, /"主指标 " \+ \(rules\.primaryMetric \|\| "未指定"\)/);
});

test("unknown task types remain visible in summaries", () => {
  const sandbox = loadTaskTypeLabel();
  assert.equal(sandbox.taskTypeLabel("future-task"), "future-task");
  assert.equal(sandbox.taskTypeLabel(""), "未指定");
  assert.match(extractFunction("projectTaskTypeLabel"), /PROJECT_TASK_TYPE_LABELS\[key\] \|\| raw \|\| "未指定"/);
  assert.doesNotMatch(extractFunction("projectTaskTypeLabel"), /const labels =/);
});

test("integration summary reports configuration and synchronization without a manual form", () => {
  const sandbox = { esc: String, detailsOpenAttr: () => '', asArray: value => Array.isArray(value) ? value : [],
    adapterRuleText: (rules, key, fallback) => (rules[key] || []).join('、') || fallback,
    renderAdapterRuleSummary: rules => `${rules.taskType || ''} ${rules.primaryMetric || ''}` };
  vm.runInNewContext(extractFunction('renderProjectRuleEditor'), sandbox);
  for (const taskType of ['generic','classification','segmentation','regression','future-task']) {
    const rules = { taskType, primaryMetric: 'AP', candidateCsv: ['metrics.csv'] };
    const html = sandbox.renderProjectRuleEditor(rules, rules, { status: 'pending', errors: ['离线模式'] });
    assert.match(html, /已配置/); assert.ok(html.includes(taskType)); assert.match(html, /AP/); assert.match(html, /metrics\.csv/);
    assert.match(html, /Agent 待同步.*离线模式/);
    assert.doesNotMatch(html, /<input|<select|<textarea|保存接入规则/);
  }
  assert.match(sandbox.renderProjectRuleEditor({}, {}, {}), /待 AI 配置.*项目识别线索/);
  assert.match(sandbox.renderProjectRuleEditor({taskType:'classification'}, {taskType:'classification'}, {}), /待 AI 配置/);
  assert.match(sandbox.renderProjectRuleEditor({primaryMetric:'weighted_f1'}, {primaryMetric:'weighted_f1'}, {status:'synced'}), /Agent 已同步/);
});

test('GPU refresh keeps its narrow command',()=>{
 const html=require('../../dist/ui/PanelHtml').renderPanelHtml();
 assert.match(html,/data-command="manualGpuSnapshot" title="仅刷新当前启用 Worker 的 GPU 状态"/);
 assert.doesNotMatch(html,/data-command="snapshot" title="刷新 GPU 状态"/);
});

test('result mapping source renders a read-only summary of existing configuration', () => {
 const sandbox={asArray:value=>Array.isArray(value)?value:[],detailsOpenAttr:()=>'',esc:String};
 vm.runInNewContext(extractFunction('renderResultColumnMappingEditor'),sandbox);
 const html=sandbox.renderResultColumnMappingEditor({resultOutputConfig:{columnMapping:{case:'specimen'},adapterRules:{derivedMetric:{metric:'AP',leftEndpoint:'a',rightEndpoint:'b',outputName:'delta',scale:1}}}},
   {source:'results.csv',mapping:{seed:'rng'},sampleValues:{specimen:['case1']}});
 assert.match(html,/results\.csv.*case → specimen.*seed → rng.*case1.*AP · a · b · delta · 1/);
 assert.doesNotMatch(html,/<input|<select|<textarea|保存映射/);
});

test('result summary dependencies change when configured mapping or derived metric changes', () => {
 const sandbox={compactSelectedResultPlanForSignature:()=>({}),compactResultsSummaryForSignature:()=>({}),resultAutoParseReadinessForState:()=>({}),
   compactTracesForSignature:()=>({}),compactResultSelectionForSignature:()=>({}),compactPlanArchiveForSignature:()=>({})};
 vm.runInNewContext(extractFunction('sectionRenderModel'),sandbox);
 const model=state=>JSON.stringify(sandbox.sectionRenderModel(state,'results'));
 const before=model({resultOutputConfig:{columnMapping:{case:'old'},adapterRules:{derivedMetric:{metric:'AP'}}}});
 assert.notEqual(model({resultOutputConfig:{columnMapping:{case:'new'},adapterRules:{derivedMetric:{metric:'AP'}}}}),before);
 assert.notEqual(model({resultOutputConfig:{columnMapping:{case:'old'},adapterRules:{derivedMetric:{metric:'AUPRC'}}}}),before);
});

test('update settings show the running channel and queried versions without frozen authority notices',()=>{
 const panelFunction=require('../_helpers/panelFunction'),pkg=require('../../package.json');
 const sandbox={panelReleaseTrack:{channel:'stable',authoritativeVersion:'0.5.440',authoritativeSftpVersion:'0.2.117'},panelRunningVersion:pkg.version,esc:String,pluginUpdateStatusLabel:String,setHtmlIfChanged:(_id,html)=>sandbox.html=html};
 vm.runInNewContext(panelFunction('renderPluginUpdateSettings'),sandbox);
 const state={pluginUpdate:{status:'up_to_date',experiment:{label:'SimpleExperiment',currentVersion:pkg.version,latestVersion:pkg.version,updateAvailable:false},sftp:{label:'SimpleSFTP',currentVersion:'0.2.118',latestVersion:'0.2.118',updateAvailable:false}}};
 sandbox.renderPluginUpdateSettings(state);
 assert.ok(sandbox.html.includes('当前运行：SimpleExperiment '+pkg.version+'（正式版）'));
 assert.ok(sandbox.html.includes('SimpleSFTP: 0.2.118；正式更新通道 0.2.118'));
 assert.doesNotMatch(sandbox.html,/试行版|权威版|0\.5\.440|0\.2\.117/);assert.match(sandbox.html,/不降级/);
 sandbox.panelReleaseTrack.channel='trial';sandbox.renderPluginUpdateSettings(state);
 assert.ok(sandbox.html.includes('当前运行：SimpleExperiment '+pkg.version+'（预览版）'));
 assert.doesNotMatch(sandbox.html,/权威版|0\.5\.440|0\.2\.117/);
 sandbox.panelReleaseTrack.channel='stable';sandbox.renderPluginUpdateSettings({});
 assert.ok(sandbox.html.includes('（正式版）'));assert.doesNotMatch(sandbox.html,/0\.5\.440|0\.2\.117|权威版/);
});

test('update settings preserve update actions, busy state and visible errors',()=>{
 const panelFunction=require('../_helpers/panelFunction');
 const sandbox={panelReleaseTrack:{channel:'stable'},panelRunningVersion:'0.5.483',esc:String,pluginUpdateStatusLabel:String,setHtmlIfChanged:(_id,html)=>sandbox.html=html};
 vm.runInNewContext(panelFunction('renderPluginUpdateSettings'),sandbox);
 sandbox.renderPluginUpdateSettings({pluginUpdate:{status:'update_available',experiment:{label:'SimpleExperiment',currentVersion:'0.5.483',latestVersion:'0.5.484',updateAvailable:true}}});
 assert.match(sandbox.html,/0\.5\.483 → 0\.5\.484/);assert.match(sandbox.html,/data-command="installPluginUpdates"/);
 for(const status of ['checking','installing']){
  sandbox.renderPluginUpdateSettings({pluginUpdate:{status,message:'正在处理'}});
  assert.match(sandbox.html,/data-command="checkPluginUpdates"[^>]* disabled/);assert.match(sandbox.html,/正在处理/);
 }
 sandbox.renderPluginUpdateSettings({pluginUpdate:{status:'error',message:'无法访问更新源'}});
 assert.match(sandbox.html,/无法访问更新源/);assert.doesNotMatch(sandbox.html,/data-command="installPluginUpdates"/);
});
