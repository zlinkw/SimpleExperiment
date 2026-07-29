const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");
const extension = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");

function renderPanelHtmlFromSource(source) {
  const cleaned = source
    .replace(/^\/\/ @ts-nocheck\r?\n/, "")
    .replace(/^"use strict";\r?\n/, "")
    .replace(/Object\.defineProperty\(exports,[\s\S]*?;\r?\n/, "")
    .replace(/exports\.renderPanelHtml = renderPanelHtml;\r?\n/, "")
    .replace(/export function renderPanelHtml/, "function renderPanelHtml")
    .replace(/function renderPanelHtml\(\): string/, "function renderPanelHtml()");
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(cleaned + "\nthis.result = renderPanelHtml();", sandbox);
  return sandbox.result;
}

function extractScript(html) {
  const start = html.indexOf("<script");
  const gt = html.indexOf(">", start);
  const end = html.indexOf("</script>", gt);
  assert.ok(start >= 0 && gt >= 0 && end > gt, "script tag missing");
  return html.slice(gt + 1, end);
}

const panelScript = extractScript(renderPanelHtmlFromSource(panel));

function extractFunction(name) {
  const start = panelScript.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing function ${name}`);
  const body = panelScript.indexOf("{", start);
  let depth = 0;
  for (let index = body; index < panelScript.length; index += 1) {
    if (panelScript[index] === "{") depth += 1;
    if (panelScript[index] === "}") depth -= 1;
    if (depth === 0) return panelScript.slice(start, index + 1);
  }
  throw new Error(`unterminated function ${name}`);
}

function extractSourceFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing function ${name}`);
  const body = source.indexOf("{", start);
  let depth = 0;
  for (let index = body; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`unterminated function ${name}`);
}

function resultLocation(project, meta, plan) {
  const sandbox = {
    RESULT_METADATA_FILENAMES: new Set(["jobs.csv", "artifact_manifest.json", "checkpoint_manifest.json", "manifest.json", "metadata.json", "status.json", "state.json", "progress.json", "job.json", "jobs.json", "env_snapshot.json", "config_snapshot.json", "config_snapshot.yaml", "config_snapshot.yml"]),
    RESULT_METADATA_SUFFIXES: ["_snapshot.json", "_manifest.json", "_status.json", "_state.json", "_progress.json"],
    EMPTY_OUTPUT_DERIVATION_VALUES: Object.freeze([]),
    planOutputCandidatesCache: new WeakMap(),
    planOutputEvidenceCandidatesCache: new WeakMap(),
    adapterRuleResultCandidatesCache: new WeakMap(),
    asArray(value) {
      return Array.isArray(value) ? value : (!value || typeof value !== "object" ? [] : Object.values(value));
    },
  };
  vm.createContext(sandbox);
  vm.runInContext([
    extractFunction("uniqueText"),
    extractFunction("isParseableResultCandidate"),
    extractFunction("planOutputCandidates"),
    extractFunction("planOutputEvidenceCandidates"),
    extractFunction("adapterRuleResultCandidates"),
    extractFunction("projectResultLocation"),
    "this.check = projectResultLocation;",
  ].join("\n"), sandbox);
  return JSON.parse(JSON.stringify(sandbox.check(project, meta, plan)));
}

function panelPreviewScope(previews, plan, rules) {
  const sandbox = {
    RESULT_METADATA_FILENAMES: new Set(["jobs.csv", "artifact_manifest.json", "checkpoint_manifest.json", "manifest.json", "metadata.json", "status.json", "state.json", "progress.json", "job.json", "jobs.json", "env_snapshot.json", "config_snapshot.json", "config_snapshot.yaml", "config_snapshot.yml"]),
    RESULT_METADATA_SUFFIXES: ["_snapshot.json", "_manifest.json", "_status.json", "_state.json", "_progress.json"],
    EMPTY_OUTPUT_DERIVATION_VALUES: Object.freeze([]),
    EMPTY_OUTPUT_DERIVATION_SOURCE: Object.freeze({}),
    planOutputCandidatesCache: new WeakMap(),
    planOutputEvidenceCandidatesCache: new WeakMap(),
    adapterRuleResultCandidatesCache: new WeakMap(),
    planScopedResultCandidateCache: new WeakMap(),
    asArray(value) { return Array.isArray(value) ? value : []; },
  };
  vm.createContext(sandbox);
  vm.runInContext([
    extractFunction("uniqueText"),
    extractFunction("isParseableResultCandidate"),
    extractFunction("planOutputCandidates"),
    extractFunction("planOutputEvidenceCandidates"),
    extractFunction("adapterRuleResultCandidates"),
    extractFunction("resultPreviewRegexEscape"),
    extractFunction("normalizeResultCandidatePath"),
    extractFunction("compileResultCandidatePatterns"),
    extractFunction("compiledResultCandidatesMatchFile"),
    extractFunction("resultCandidatePatternMatchesFile"),
    extractFunction("planScopedResultParsePreviews"),
    "this.check = planScopedResultParsePreviews;",
  ].join("\n"), sandbox);
  return JSON.parse(JSON.stringify(sandbox.check(previews, plan, rules)));
}

function extensionPreviewScope(previews, plan, rules) {
  const sandbox = {
    path,
    EMPTY_OUTPUT_DERIVATION_SOURCE: Object.freeze({}),
    planScopedResultCandidateCache: new WeakMap(),
    escapeRegExp(value) { return String(value || "").replace(/[.*+?^{}$()|[\]\\]/g, "\\$&"); },
    uniqueStrings(values) { return [...new Set(values.filter(Boolean))]; },
    planOutputEvidenceCandidates(item) { return Array.isArray((item || {}).outputCandidates) ? item.outputCandidates : []; },
    adapterRuleResultCandidates(item) { return [
      ...((item || {}).candidateCsv || []),
      ...((item || {}).candidateJson || []),
      ...((item || {}).consoleLogs || []),
      ...((item || {}).textLogs || []),
    ]; },
  };
  vm.createContext(sandbox);
  vm.runInContext([
    extractSourceFunction(extension, "normalizeResultCandidatePath"),
    extractSourceFunction(extension, "compileResultCandidatePatterns"),
    extractSourceFunction(extension, "compiledResultCandidatesMatchFile"),
    extractSourceFunction(extension, "resultCandidatePatternMatchesFile"),
    extractSourceFunction(extension, "planScopedResultParsePreviews"),
    "this.check = planScopedResultParsePreviews;",
  ].join("\n"), sandbox);
  return JSON.parse(JSON.stringify(sandbox.check(previews, plan, rules)));
}

test("project result location prefers selected Plan and rejects metadata placeholders", () => {
  const location = resultLocation({
    resultFiles: ["work_dirs/old/results.csv"],
    adapterRules: { candidateCsv: ["jobs.csv", "work_dirs/rules/scores.csv"] },
  }, {}, {
    outputCandidates: ["status.json", "work_dirs/current/metrics.json"],
  });
  assert.equal(location.path, "work_dirs/current/metrics.json");
  assert.equal(location.source, "当前 Plan");
  assert.match(location.summary, /work_dirs\/current\/metrics\.json/);
  assert.doesNotMatch(location.summary, /status\.json|jobs\.csv/);
});

test("project result location falls back to adapter rules then actual results", () => {
  const adapter = resultLocation({
    adapterRules: { candidateJson: ["artifact_manifest.json", "outputs/metrics.json"] },
    resultFiles: ["outputs/actual.csv"],
  }, {}, {});
  assert.equal(adapter.path, "outputs/metrics.json");
  assert.equal(adapter.source, "接入规则");

  const actual = resultLocation({ resultFiles: ["env_snapshot.json", "outputs/actual.csv"] }, {}, {});
  assert.equal(actual.path, "outputs/actual.csv");
  assert.equal(actual.source, "已发现结果");
});

test("project result location never invents metrics_summary.csv", () => {
  assert.deepEqual(resultLocation({}, {}, {}), {
    path: "",
    count: 0,
    source: "",
    summary: "未声明可解析结果位置",
  });
  assert.match(panel, /projectQuickRow\("结果位置", resultLocation\.summary/);
  assert.match(panel, /当前 Plan 已声明输出，无需额外模板/);
  assert.match(panel, /已识别" \+ resultLocation\.source \+ "，可按需保存接入模板/);
  assert.match(panel, /resultLocation\.path && outputGate\.ok \? "status-completed" : "status-warning"/);
  assert.doesNotMatch(panel, /const resultPath = [^;]*\|\| "metrics_summary\.csv"/);
});

test("local result previews stay scoped to the selected Plan and explicit project rules", () => {
  const previews = [
    { file: "work_dirs/alpha/base/metrics.csv", parseable: true, records: 2 },
    { file: "work_dirs/beta/base/metrics.csv", parseable: true, records: 3 },
    { file: "work_dirs/alpha/base/stderr.log", parseable: true, records: 1 },
    { file: "shared/reference.csv", parseable: true, records: 1 },
  ];
  const plan = {
    planFile: "experiments/plans/alpha.yaml",
    suite: "alpha",
    outputCandidates: ["work_dirs/{suite}/{case}/metrics.csv", "{output_dir}/stderr.log"],
  };
  const rules = { candidateCsv: ["shared/*.csv"] };
  const expectedFiles = ["work_dirs/alpha/base/metrics.csv", "work_dirs/alpha/base/stderr.log", "shared/reference.csv"];
  for (const scope of [panelPreviewScope(previews, plan, rules), extensionPreviewScope(previews, plan, rules)]) {
    assert.deepEqual(scope.items.map((item) => item.file), expectedFiles);
    assert.equal(scope.hiddenCount, 1);
    assert.equal(scope.scoped, true);
  }
  assert.match(panel, /当前 Plan ' \+ matched\.length/);
  assert.match(panel, /隐藏其他 ' \+ normalized\.hiddenCount/);
  assert.match(extension, /planScopedResultParsePreviews\(arrayFromRecord\(project \|\| \{\}, "resultParsePreviews"\), plan, rules\)/);
});

test("frontend and backend result preview scopes compile candidates before filtering previews", () => {
  const previews = [
    { file: "nested\\metrics.csv" },
    { file: "runs/alpha/case-1/result.json" },
    { file: "runs/alpha/deep/final.log" },
    { file: "runs/beta/case-1/result.json" },
  ];
  const plan = {
    planFile: "experiments/plans/alpha.yaml",
    suite: "alpha",
    outputCandidates: ["metrics.csv", "runs/{suite}/case-?/result.json", "runs/{suite}/**/*.log"],
  };
  const expected = [
    "nested\\metrics.csv",
    "runs/alpha/case-1/result.json",
    "runs/alpha/deep/final.log",
  ];

  assert.deepEqual(panelPreviewScope(previews, plan, {}).items.map((item) => item.file), expected);
  assert.deepEqual(extensionPreviewScope(previews, plan, {}).items.map((item) => item.file), expected);
  for (const [source, extractor] of [[panelScript, extractSourceFunction], [extension, extractSourceFunction]]) {
    const scopedSource = extractor(source, "planScopedResultParsePreviews");
    assert.match(scopedSource, /compileResultCandidatePatterns\(candidates, plan\)/);
    assert.doesNotMatch(scopedSource, /candidates\.some|resultCandidatePatternMatchesFile/);
  }
});

test("panel state derivation reuses fixed command and result metadata collections", () => {
  assert.match(panel, /const PPT_AUTOMATION_ACTION_COMMANDS = new Set\(/);
  assert.match(panel, /const DEBUG_MODE_BLOCKED_UI_COMMANDS = new Set\(/);
  assert.match(panel, /const RESULT_METADATA_FILENAMES = new Set\(/);
  assert.match(panel, /const RESULT_METADATA_SUFFIXES = \[/);

  const pptReadiness = extractFunction("pptAutomationReadinessForState");
  const debugGate = extractFunction("debugModeBlockedUiCommand");
  const resultCandidate = extractFunction("isParseableResultCandidate");
  assert.match(pptReadiness, /PPT_AUTOMATION_ACTION_COMMANDS\.has/);
  assert.match(debugGate, /DEBUG_MODE_BLOCKED_UI_COMMANDS\.has/);
  assert.match(resultCandidate, /RESULT_METADATA_FILENAMES\.has/);
  assert.match(resultCandidate, /RESULT_METADATA_SUFFIXES\.some/);
  assert.doesNotMatch([pptReadiness, debugGate, resultCandidate].join("\n"), /new Set\(|const metadataSuffixes/);
});
