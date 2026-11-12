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
  const body = panel.indexOf("{", start);
  let depth = 0;
  for (let index = body; index < panel.length; index += 1) {
    if (panel[index] === "{") depth += 1;
    if (panel[index] === "}") depth -= 1;
    if (depth === 0) return panel.slice(start, index + 1);
  }
  throw new Error(`unterminated ${name}`);
}

function extractConst(name) {
  const marker = `const ${name} = `;
  const start = panel.indexOf(marker);
  assert.ok(start >= 0, `missing ${name}`);
  const open = panel.indexOf("[", start);
  let depth = 0;
  for (let index = open; index < panel.length; index += 1) {
    if (panel[index] === "[") depth += 1;
    if (panel[index] === "]") depth -= 1;
    if (depth === 0) return panel.slice(start, index + 1) + ";";
  }
  throw new Error(`unterminated ${name}`);
}

test("diagnostics readiness groups are a hoisted fixed table", () => {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext([
    extractConst("FEATURE_READINESS_GROUPS"),
    "this.groups = FEATURE_READINESS_GROUPS;",
  ].join("\n"), sandbox);

  const groups = sandbox.groups;
  assert.equal(groups.length, 5);
  assert.equal(groups.map((group) => group[0]).join("|"), "发布同步|计划运行链路|Worker 手动控制|结果证据闭环|诊断与恢复");
  const commands = groups.flatMap((group) => group[1]);
  assert.equal(commands.length, new Set(commands).size, "readiness commands must not repeat across groups");
  assert.ok(commands.includes("runPlan"));
  assert.ok(commands.includes("plotResultsToPpt"));
  assert.ok(commands.includes("reconcileDeletions"));

  const renderer = extractFunction("renderFeatureReadiness");
  assert.match(renderer, /featureReadinessRowsHtmlForState\(state, FEATURE_READINESS_GROUPS\)/);
  assert.doesNotMatch(renderer, /const groups = \[/);
});

test("target completion matrix keeps static rows out of the render path", () => {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext([
    extractConst("TARGET_MATRIX_BASELINE_ROWS"),
    extractConst("TARGET_MATRIX_TRAILING_ROWS"),
    extractConst("TARGET_MATRIX_PROJECT_EVIDENCE"),
    extractConst("TARGET_MATRIX_SMOKE_EVIDENCE"),
    "this.baseline = TARGET_MATRIX_BASELINE_ROWS;",
    "this.trailing = TARGET_MATRIX_TRAILING_ROWS;",
    "this.projectEvidence = TARGET_MATRIX_PROJECT_EVIDENCE;",
    "this.smokeEvidence = TARGET_MATRIX_SMOKE_EVIDENCE;",
  ].join("\n"), sandbox);

  assert.equal(sandbox.baseline.length, 4);
  assert.equal(sandbox.trailing.length, 1);
  assert.equal(sandbox.baseline[0][0], "UI 中文与工作流");
  assert.equal(sandbox.trailing[0][0], "旧隧道内部遗留");
  assert.equal(sandbox.projectEvidence.length, 3);
  assert.equal(sandbox.smokeEvidence.length, 3);

  const renderer = extractFunction("renderTargetCompletionMatrix");
  const order = ["当前插件版本", "TARGET_MATRIX_BASELINE_ROWS", "项目自动接入", "真实 Agent 能力", "真实集群烟测", "TARGET_MATRIX_TRAILING_ROWS"];
  let cursor = -1;
  for (const token of order) {
    const next = renderer.indexOf(token, cursor + 1);
    assert.ok(next > cursor, `matrix row order broken at ${token}`);
    cursor = next;
  }
});

test("capability bar reflects only enabled Worker probes and distinguishes unprovided from untested", () => {
  const writes = new Map();
  const sandbox = {setHtmlIfChanged:(key,value)=>writes.set(key,value),esc:String,escAttr:String,labelStatus:String,
    enabledWorkerTunnelsCacheSource:null,enabledWorkerTunnelsCacheValue:[],EMPTY_WORKER_TUNNELS_FOR_ALIAS:[]};
  vm.runInNewContext(['enabledWorkerTunnelsForState','capabilityItem','renderCapabilities'].map(extractFunction).join('\n'),sandbox);
  const state={setup:{workerTunnels:[{id:'active'},{id:'disabled',enabled:false}]},
    capabilities:{endpoints:{fileUploadChunk:true}},
    workerProbes:{active:{status:'ok',capabilities:{endpoints:{actions:true,fileDownload:true,sseEvents:true}}},disabled:{status:'ok',capabilities:{endpoints:{}}}}};
  sandbox.renderCapabilities(state);
  let html=writes.get('capabilities');
  assert.match(html,/active/); assert.doesNotMatch(html,/disabled|需升级/);
  assert.match(html,/动作接口[\s\S]*?可用/); assert.match(html,/下载[\s\S]*?可用/);
  assert.match(html,/上传[\s\S]*?未提供/); assert.match(html,/原始通道：SSE/);
  state.workerProbes={}; sandbox.renderCapabilities(state);
  assert.match(writes.get('capabilities'),/能力待检测/);
  sandbox.renderCapabilities({setup:{workerTunnels:[]}});
  assert.match(writes.get('capabilities'),/未配置已启用的 Worker/);
  sandbox.renderCapabilities({});
  assert.match(writes.get('capabilities'),/未配置已启用的 Worker/);
});
