const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { readSource } = require("../_helpers/sourceReader");

function renderPanelHtmlFromSource(source) {
  return require("../../dist/ui/PanelHtml.js").renderPanelHtml();
}

function extractScripts(html) {
  const scripts = [];
  const pattern = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(pattern)) scripts.push(match[1]);
  assert.ok(scripts.length > 0, "script tag missing");
  return scripts;
}

function loadRenderedPanelScript() {
  const source = readSource("src/ui/PanelHtml.ts");
  return extractScripts(renderPanelHtmlFromSource(source)).find((script) => script.includes("function isParseableResultCandidate")) || "";
}

test("panel and extension output gates share nextStep and parseable candidate regex", () => {
  const extension = readSource("src/extension.ts");
  const panel = readSource("src/ui/PanelHtml.ts");
  const script = loadRenderedPanelScript();
  assert.match(extension, /nextStep/);
  for (const source of [extension, panel]) {
    assert.match(source, /计划强契约/);
    assert.match(source, /下一步/);
  }
  assert.doesNotThrow(() => new vm.Script(script, { filename: "panel-webview.js" }));
  assert.match(script, /isParseableResultCandidate/);
  assert.match(script, /jobs\.csv/);
  assert.match(script, /csv\|json\|txt\|log\|out/);
  // 当前面板将结果位置与门禁下一步分开展示。
  assert.match(extension, /nextLabel: next \? next\.label : ""/);
  assert.match(extension, /nextStep: next \? \(next\.fix \|\| ""\) : ""/);
  assert.match(extension, /在 experiments\/plans 下创建或放入 YAML Plan/);
});

test("isParseableResultCandidate accepts nested plan result paths", () => {
  const script = loadRenderedPanelScript();
  const match = script.match(/function isParseableResultCandidate\(value\) \{[\s\S]*?\n    \}/);
  const metadata = script.match(/const RESULT_METADATA_FILENAMES = new Set\([^;]+;\s+const RESULT_METADATA_SUFFIXES = \[[^\]]*\];/);
  assert.ok(match, "rendered helper missing");
  assert.ok(metadata, "result metadata constants missing");
  const fn = new Function(metadata[0] + match[0] + "; return isParseableResultCandidate;")();
  assert.equal(fn("work_dirs/smoke/metrics_summary.csv"), true);
  assert.equal(fn("experiments/results/suite_a/result.json"), true);
  assert.equal(fn("jobs.csv"), false);
  assert.equal(fn("path/to/jobs.csv"), false);
  assert.equal(fn("readme.md"), false);
});

test("host and rendered panel accept ordinary declared results and model-only tasks without a standard filename", () => {
  const ts = require('typescript');
  const host = readSource('src/extension/legacy.ts');
  const script = loadRenderedPanelScript();
  const extract = (source, name = 'projectOutputGateDiagnostics') => {
    const ast = ts.createSourceFile('gate.ts', source, ts.ScriptTarget.Latest, true);
    let fn;
    function visit(node) {
      if (ts.isFunctionDeclaration(node) && node.name?.text === name) fn = node.getText(ast);
      ts.forEachChild(node, visit);
    }
    visit(ast); assert.ok(fn); return fn;
  };
  for (const [source, ui] of [[host, false], [script, true]]) {
    const context = vm.createContext({
      nestedRecord: (record, key) => record[key] || {}, arrayFromRecord: (record, key) => record[key] || [],
      stringPatch: (record, key) => record[key] || '', asArray: value => Array.isArray(value) ? value : [],
      planOutputEvidenceSignals: plan => plan?.outputSignals || [], planOutputEvidenceCandidates: plan => plan?.outputCandidates || [],
      actionableAdapterRuleSignals: rules => Boolean(rules.candidateCsv?.length), adapterRuleResultCandidates: rules => rules.candidateCsv || [],
      planScopedResultParsePreviews: () => ({items: []}), resultPreviewHasRecords: () => false,
      validResultPreviewCount: () => 0, planContractFixText: () => '补齐计划契约',
      EMPTY_OUTPUT_DERIVATION_SOURCE: {}, EMPTY_OUTPUT_DERIVATION_VALUES: [],
      projectOutputGateDiagnosticsCache: new WeakMap(), PROJECT_OUTPUT_GATE_DIAGNOSTICS_VARIANT_LIMIT: 3,
      refListKey: () => 'one-plan',
    });
    vm.runInContext(extract(source), context);
    const call = (project, plan) => ui ? context.projectOutputGateDiagnostics(project, {}, plan) : context.projectOutputGateDiagnostics(project, plan);
    for (const output of ['metrics.csv', 'reports/custom.json', 'model.pt']) {
      const plan = {planContractOk: true, outputSignals: [output === 'model.pt' ? '任务产物:model.pt' : 'paper.result_csv'],
        outputCandidates: output === 'model.pt' ? [] : [output]};
      const result = call({}, plan);
      assert.equal(result.ok, true, output);
      assert.deepEqual(Array.from(result.missing), [], output);
      assert.ok(result.rows.every(row => row.ok), output);
    }
    const missing = call({}, {planContractOk: true});
    assert.equal(missing.ok, false); assert.ok(missing.missing.includes('计划输出'));
    const adapterHint = missing.rows.find(row => row.label === '接入配置').fix;
    assert.match(adapterHint, /AI/);
    assert.doesNotMatch(adapterHint, /插件设置中配置/);
    if (!ui) assert.match(adapterHint, /MCP/);
    if (!ui) {
      context.uniqueStrings = values => [...new Set(values)];
      vm.runInContext(extract(source, 'projectOutputGateFixes'), context);
      const fixes = Array.from(context.projectOutputGateFixes(['接入配置', '候选结果规则', '解析预览'], {}, {}));
      assert.ok(fixes.every(text => /AI/.test(text)));
      assert.doesNotMatch(fixes.join(' '), /插件设置中配置|保存接入规则/);
    }
    const invalid = call({}, {planContractOk: false, outputSignals: ['paper.result_csv'], outputCandidates: ['metrics.csv']});
    assert.equal(invalid.ok, false); assert.ok(invalid.missing.includes('计划强契约'));
  }
});
