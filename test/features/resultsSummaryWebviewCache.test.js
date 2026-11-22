const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { readSource } = require("../_helpers/sourceReader");

const extension = readSource("src/extension.ts");

test("offline import preview remains read-only and does not show an old active query as current", () => {
  require('../_helpers/registerTsRequire');
  const {renderPanelHtml}=require('../../src/ui/PanelHtml.legacy.ts');
  const html=renderPanelHtml(),scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(match=>match[1]);
  const script=scripts.find(value=>value.includes('function renderResultSummary('));assert.ok(script);
  for(const generated of scripts)new vm.Script(generated);
  const start=script.indexOf('function renderResultSummary('),end=script.indexOf('\n    function renderWorkerResultAggregateWarning(',start);
  assert.ok(start>=0&&end>start);
  const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  let output='',workbenchState;
  const context={esc:escape,asArray:value=>Array.isArray(value)?value:[],renderWorkerResultAggregateWarning:()=>'',
    renderResultEvidenceWorkbench:state=>{workbenchState=state;return ''},setHtmlIfChanged:(_id,value)=>{output=value},pendingResultMappingOpen:false};
  vm.runInNewContext(script.slice(start,end),context);
  const backend={objectRecord:value=>value&&typeof value==='object'&&!Array.isArray(value)?value:undefined,
    resultsSummaryArrayLimits:{results:30},dropUndefined:row=>Object.fromEntries(Object.entries(row).filter(([_key,value])=>value!==undefined)),
    firstStringFieldForWebview:(row,...keys)=>keys.map(key=>row[key]).find(value=>typeof value==='string'&&value)||undefined,
    compactStringArrayForWebview:()=>undefined,compactSourceFilesForWebview:()=>undefined,compactResultProvenanceForWebview:()=>undefined,
    compactSensitiveText:value=>String(value)};
  vm.runInNewContext(['compactMetricsRecordForWebview','compactPrimitiveRecordForWebview','compactResultRecordForWebview','offlineResultPreviewForWebview'].map(extractFunction).join('\n')+';this.preview=offlineResultPreviewForWebview;',backend);
  const bundle={importedFrom:'离线<包>',lastImportedAt:'today',results:{results:[{runKey:'实验<一>',metrics:{score:{value:0},empty:''}}]}};
  const preview=backend.preview(bundle),summary={resultCount:0,results:[],stalePlanVersionSuppressed:true};
  const oldReport={source:'active_query',current:false,observedAt:'old',missing:['failed']};
  context.renderResultSummary({offlineResultPreview:preview,resultsSummary:summary,resultSyncReport:oldReport});
  assert.match(output,/离线导入预览/);assert.match(output,/离线&lt;包&gt;/);assert.match(output,/实验&lt;一&gt;/);
  assert.match(output,/&quot;value&quot;:0/);assert.match(output,/&quot;empty&quot;:&quot;&quot;/);
  assert.doesNotMatch(output,/本轮查询失败/);assert.equal(workbenchState.resultSyncReport,null);
  assert.equal(summary.resultCount,0);assert.equal(summary.stalePlanVersionSuppressed,true);assert.equal(bundle.results.results.length,1);
  const otherPlan=backend.preview({results:{planFile:'other.yaml',planRevision:'old',results:bundle.results.results}});
  context.renderResultSummary({offlineResultPreview:otherPlan,resultsSummary:summary,resultSyncReport:oldReport});
  assert.match(output,/仅供查看，归属和版本未核实/);assert.equal(summary.resultCount,0);
  const malformed=backend.preview({results:{results:[null,bundle.results.results[0]]}});
  assert.doesNotThrow(()=>context.renderResultSummary({offlineResultPreview:malformed,resultsSummary:summary,resultSyncReport:oldReport}));
  assert.match(output,/第 1 行.*不是对象/);assert.match(output,/实验&lt;一&gt;/);
  const special=backend.preview({results:{results:[JSON.parse('{"runKey":"特殊","dimensions":{"__proto__":0,"constructor":"值"},"metrics":{"__proto__":{"value":0},"constructor":{"value":0}}}')]}});
  context.renderResultSummary({offlineResultPreview:special,resultsSummary:summary,resultSyncReport:oldReport});
  assert.match(output,/&quot;__proto__&quot;:0/);assert.match(output,/&quot;constructor&quot;:&quot;值&quot;/);
  assert.match(output,/&quot;__proto__&quot;:\{&quot;value&quot;:0\}/);assert.match(output,/&quot;constructor&quot;:\{&quot;value&quot;:0\}/);
  const aliases=backend.preview({results:{final_results:[{runKey:'最终',metrics:{score:{value:0}}}],pending_review_records:[{runKey:'待核',metrics:{score:{value:0}}}]}});
  context.renderResultSummary({offlineResultPreview:aliases,resultsSummary:summary,resultSyncReport:oldReport});
  assert.equal(aliases.totalCount,2);assert.match(output,/最终/);assert.match(output,/待核/);assert.match(output,/&quot;value&quot;:0/);
  assert.equal(backend.preview({results:{results:[],final_results:[{runKey:'忽略'}]}}).totalCount,0);
  context.renderResultSummary({resultsSummary:{},resultSyncReport:oldReport});assert.match(output,/本轮查询失败/);assert.equal(workbenchState.resultSyncReport,oldReport);
});

function extractFunction(name) {
  const start = extension.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing ${name}`);
  const body = extension.indexOf("{", start);
  let depth = 0;
  for (let index = body; index < extension.length; index += 1) {
    if (extension[index] === "{") depth += 1;
    if (extension[index] === "}") depth -= 1;
    if (depth === 0) return extension.slice(start, index + 1);
  }
  throw new Error(`unterminated ${name}`);
}

function extractDeclaration(name) {
  const start = extension.indexOf(`const ${name} =`);
  assert.ok(start >= 0, `missing declaration ${name}`);
  const end = extension.indexOf(";\n", start);
  assert.ok(end > start, `unterminated declaration ${name}`);
  return extension.slice(start, end + 1);
}

function loadCache() {
  const sandbox = {
    ResultOwnershipScope:require("../../dist/results/ResultOwnershipScope"),
    RESULTS_SUMMARY_WEBVIEW_VARIANT_CACHE_LIMIT: 3,
    resultsSummaryForWebviewCache: new WeakMap(),
    filterCalls: 0,
    compactCalls: 0,
    usableSelectionKey(value) {
      return String(value || "").trim().replace(/^\.\//, "");
    },
    filterResultsSummaryForSelectedPlan(summary, plan, revision, updatedAt) {
      sandbox.filterCalls += 1;
      if (!summary || typeof summary !== "object" || Array.isArray(summary)) return summary;
      return { summary, plan, revision, updatedAt };
    },
    compactResultsSummaryForWebview(value) {
      sandbox.compactCalls += 1;
      if (!value || typeof value !== "object" || Array.isArray(value)) return value;
      return { compacted: true, ...value };
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(`${extractFunction("compactResultsSummaryForPlanForWebview")}\nthis.compactForPlan = compactResultsSummaryForPlanForWebview;`, sandbox);
  return sandbox;
}

function loadActualFilterCache() {
  const sandbox = {
    ResultOwnershipScope:require("../../dist/results/ResultOwnershipScope"),
    RESULTS_SUMMARY_WEBVIEW_VARIANT_CACHE_LIMIT: 8,
    resultsSummaryForWebviewCache: new WeakMap(),
    compactResultsSummaryForWebview(value) {
      return value;
    },
    uniqueStrings(values) {
      return [...new Set(values)];
    },
    objectRecord(value) {
      return value && typeof value === "object" && !Array.isArray(value) ? value : undefined;
    },
  };
  vm.createContext(sandbox);
  vm.runInContext([
    extractDeclaration("RESULT_SUMMARY_RECORD_ARRAY_FIELDS"),
    extractFunction("usableSelectionKey"),
    extractFunction("normalizePlanSelectionKey"),
    extractFunction("planFileEquivalenceKeys"),
    extractFunction("samePlanSelection"),
    extractFunction("resultRecordPlanFile"),
    extractFunction("planVersionTimestamp"),
    extractFunction("resultSummaryMatchesPlanVersion"),
    extractFunction("filterResultsSummaryForSelectedPlan"),
    extractFunction("compactResultsSummaryForPlanForWebview"),
    "this.compactForPlan = compactResultsSummaryForPlanForWebview;",
  ].join("\n"), sandbox);
  return sandbox;
}

test("active result collection survives PLAN scoping without becoming a stale legacy summary", () => {
  const sandbox = loadActualFilterCache(), plan = "experiments/plans/current.yaml";
  const preview = { source: "work_dirs/current/metrics.csv", headers: ["case", "seed", "accuracy"] };
  const summary = { source: "active_query", jobs: [{ planFile: plan, state: "complete", aggregationState: "eligible" }],
    results: [{ planFile: plan, metrics: { accuracy: .9 } }], columnMappingPreviews: { [plan]: preview } };
  const result = sandbox.compactForPlan(summary, plan, "current-revision", "2026-11-12T00:00:00Z");
  assert.equal(result.source, "active_query");
  assert.equal(result.results.length, 1);
  assert.equal(result.completed, 1);
  assert.equal(result.stalePlanVersionSuppressed, undefined);
  assert.deepEqual(result.columnMappingPreview, preview);
});

test("results summary Webview cache reuses one Plan version derivation", () => {
  const sandbox = loadCache();
  const summary = { results: [{ id: "a" }] };
  const first = sandbox.compactForPlan(summary, ".\\experiments\\plans\\a.yaml", "r2", "2026-07-30T00:00:00Z");
  const calls = { filter: sandbox.filterCalls, compact: sandbox.compactCalls };

  assert.strictEqual(sandbox.compactForPlan(summary, "experiments/plans/a.yaml", "r2", "2026-07-30T00:00:00Z"), first);
  assert.deepEqual({ filter: sandbox.filterCalls, compact: sandbox.compactCalls }, calls);
  assert.equal(first.plan, "experiments/plans/a.yaml");
  assert.equal(first.revision, "r2");
});

test("results summary Webview cache invalidates on source and Plan version replacement", () => {
  const sandbox = loadCache();
  const summary = { results: [{ id: "a" }] };
  const first = sandbox.compactForPlan(summary, "a.yaml", "r1", "t1");

  assert.notStrictEqual(sandbox.compactForPlan({ ...summary }, "a.yaml", "r1", "t1"), first);
  assert.notStrictEqual(sandbox.compactForPlan(summary, "a.yaml", "r2", "t1"), first);
  assert.notStrictEqual(sandbox.compactForPlan(summary, "a.yaml", "r1", "t2"), first);
});

test("results summary Webview cache keeps only bounded recent Plan variants", () => {
  const sandbox = loadCache();
  const summary = { results: [] };
  const oldest = sandbox.compactForPlan(summary, "plan-0.yaml", "r0", "t0");
  for (let index = 1; index < 5; index += 1) {
    sandbox.compactForPlan(summary, `plan-${index}.yaml`, `r${index}`, `t${index}`);
  }
  const variants = sandbox.resultsSummaryForWebviewCache.get(summary);

  assert.equal(variants.size, 3);
  assert.notStrictEqual(sandbox.compactForPlan(summary, "plan-0.yaml", "r0", "t0"), oldest);
  assert.equal(variants.size, 3);
});

test("non-object summaries preserve uncached fallback behavior", () => {
  const sandbox = loadCache();

  assert.equal(sandbox.compactForPlan(undefined, "a.yaml"), undefined);
  assert.equal(sandbox.compactForPlan(undefined, "a.yaml"), undefined);
  assert.equal(sandbox.filterCalls, 2);
  assert.equal(sandbox.compactCalls, 2);
});

test("cached result summaries preserve mixed-Plan isolation and archived counts", () => {
  const sandbox = loadActualFilterCache();
  const summary = {
    lastParsedAt: "2026-07-30T01:00:00Z",
    results: [
      { id: "a", planFile: "experiments/plans/a.yaml", finalEvidenceState: "archived" },
      { id: "a-pending", planFile: "experiments/plans/a.yaml", final_evidence_state: "pending_review" },
      { id: "b", planFile: "experiments/plans/b.yaml", finalEvidenceState: "pending_review" },
    ],
  };
  const result = sandbox.compactForPlan(summary, "experiments/plans/a.yaml", "", "");

  assert.deepEqual(Array.from(result.results, (row) => row.id), ["a", "a-pending"]);
  assert.deepEqual(Array.from(result.finalResults, (row) => row.id), ["a"]);
  assert.deepEqual(Array.from(result.pendingReviewRecords, (row) => row.id), ["a-pending"]);
  assert.equal(result.resultCount, 2);
  assert.equal(result.finalResultCount, 1);
  assert.equal(result.pendingReviewCount, 1);
  assert.equal(result.resultScopeSuppressed, true);
  assert.equal(Object.hasOwn(result, "statistics"), false);
  assert.equal(sandbox.compactForPlan(summary, "a.yaml").resultCount, 0, "a basename cannot authorize a different full PLAN path");
  assert.strictEqual(sandbox.compactForPlan(summary, "experiments/plans/a.yaml", "", ""), result);

  const source = extractFunction("filterResultsSummaryForSelectedPlan");
  assert.match(source, /for \(const key of RESULT_SUMMARY_RECORD_ARRAY_FIELDS\)/);
  assert.doesNotMatch(source, /for \(const key of \[/);
  assert.doesNotMatch(source, /results\.filter/);
});

test("cached result summaries still suppress stale Plan revisions", () => {
  const sandbox = loadActualFilterCache();
  const summary = {
    planFile: "a.yaml",
    planRevision: "r1",
    resultCount: 2,
    results: [{ id: "old", planFile: "a.yaml" }],
  };
  const result = sandbox.compactForPlan(summary, "a.yaml", "r2", "");

  assert.equal(result.resultCount, 0);
  assert.equal(result.stalePlanVersionSuppressed, true);
  assert.deepEqual(Array.from(result.results), []);
});
