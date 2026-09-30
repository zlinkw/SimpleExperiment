const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { readSource } = require("../_helpers/sourceReader");

const source = readSource("src/ui/PanelHtml.ts");
const start = source.indexOf("    function resultCatalogViewModel(catalog, state)");
const end = source.indexOf("\n    function renderResultEvidenceWorkbench", start + 20);
assert.ok(start >= 0 && end > start, "production result catalog view model and renderer are present");

function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function createRenderer(options = {}) {
  const context = {
    asArray: value => Array.isArray(value) ? value : [],
    detailsOpenAttr: (key, defaultOpen) => Object.prototype.hasOwnProperty.call(context.detailsOpenState, key)
      ? context.detailsOpenState[key] ? " open" : ""
      : defaultOpen ? " open" : "",
    detailsOpenState: {},
    esc: escapeHtml,
    escAttr: escapeHtml,
    resultSplitTableKey: options.tableKey || "",
    resultSplitFieldName: "",
    resultSplitSearchQuery: "",
    resultSplitSelectedColumns: null,
    resultSplitSelectedValues: null,
    lastState: options.state || {},
    renderCount: 0,
    renderSectionIfVisible: () => { context.renderCount += 1; },
  };
  vm.runInNewContext(source.slice(start, end) + "; this.resultCatalogViewModel = resultCatalogViewModel; this.renderProjectResultTables = renderProjectResultTables; this.openResultSplitToolForTable = openResultSplitToolForTable", context);
  return context;
}

const plan = (planFile, planKey, artifactKey = "") => ({
  planFile,
  planKey,
  label: planFile,
  artifacts: artifactKey ? [{ artifactKey, kind: "raw", workerId: "worker-a", path: artifactKey }] : [],
});

const finalTable = (dataset, rowCount, path) => ({
  tableKey: dataset + "/final", dataset, datasetKey: dataset, name: "final", kind: "final", rowCount, path,
  markdownPath: path.replace(".csv", ".md"), header: ["dataset", "rate_percent"], values: { dataset: [dataset], rate_percent: ["50"] },
});

const methodTable = (dataset, name, path) => ({
  tableKey: dataset + "/" + name, dataset, datasetKey: dataset, name, kind: "method", rowCount: 2, path,
  markdownPath: path.replace(".csv", ".md"), header: ["dataset", "rate_percent"], values: { dataset: [dataset], rate_percent: ["50"] },
});

const catalog = {
  datasets: [
    { dataset: "pad_ufes_20", datasetKey: "pad_ufes_20", tables: [finalTable("pad_ufes_20", 34, "artifacts/results/pad_ufes_20/final/final.csv"), methodTable("pad_ufes_20", "corim", "artifacts/results/pad_ufes_20/methods/corim/corim.csv")], plans: [plan("experiments/plans/comparison/corim.yaml", "corim", "artifacts/results/pad_ufes_20/plans/corim/raw/worker-a/raw.csv")] },
    { dataset: "bus_cot_lesion", datasetKey: "bus_cot_lesion", tables: [finalTable("bus_cot_lesion", 28, "artifacts/results/bus_cot_lesion/final/final.csv"), methodTable("bus_cot_lesion", "corim", "artifacts/results/bus_cot_lesion/methods/corim/corim.csv")], plans: [plan("experiments/plans/comparison/concatenation.yaml", "concatenation")] },
    { dataset: "", datasetKey: "_unassigned", tables: [finalTable("", 0, "artifacts/results/_unassigned/final/final.csv")], plans: [plan("experiments/plans/comparison/unknown-a.yaml", "unknown-a"), plan("experiments/plans/comparison/unknown-b.yaml", "unknown-b")] },
    { dataset: "_shared", datasetKey: "_shared", tables: [], plans: [plan("experiments/plans/comparison/shared.yaml", "shared", "artifacts/results/_shared/raw.csv")] },
  ],
  legacyTables: [],
};

test("view model separates datasets, unassigned plans, and shared sources; selected dataset leads natural order", () => {
  const renderer = createRenderer();
  const view = renderer.resultCatalogViewModel(catalog, { planFileInput: "experiments/plans/comparison/corim.yaml" });
  assert.deepEqual(Array.from(view.datasets, item => item.dataset), ["pad_ufes_20", "bus_cot_lesion"]);
  assert.equal(view.defaultDatasetKey, "pad_ufes_20");
  assert.equal(view.unassigned.count, 2);
  assert.equal(view.shared.count, 1);
  assert.equal(view.shared.artifacts.length, 1);
  assert.equal(view.datasets.some(item => item.datasetKey === "_shared" || item.datasetKey === "_unassigned"), false);
  const natural = renderer.resultCatalogViewModel(catalog, {});
  assert.deepEqual(Array.from(natural.datasets, item => item.dataset), ["bus_cot_lesion", "pad_ufes_20"]);
  assert.equal(natural.defaultDatasetKey, "bus_cot_lesion");
});

test("renderer puts compact dataset tables first and collapses plans, unassigned details, and shared sources", () => {
  const renderer = createRenderer({ tableKey: "pad_ufes_20/corim", state: { planFileInput: "experiments/plans/comparison/corim.yaml" } });
  const html = renderer.renderProjectResultTables({
    planFileInput: "experiments/plans/comparison/corim.yaml",
    resultOutputConfig: { catalog, tables: catalog.datasets.flatMap(group => group.tables) },
  });
  const datasetGroups = html.match(/class="resultDatasetGroup"[^>]* open/g) || [];
  assert.equal(datasetGroups.length, 1);
  assert.match(html, /总表 34 行 · 方法 1 · Plan 1/);
  assert.match(html, /总表 28 行 · 方法 1 · Plan 1/);
  assert.match(html, /该数据集总表/);
  assert.match(html, /方法结果/);
  assert.match(html, /Plan 产物（1）/);
  assert.doesNotMatch(html, /class="resultDatasetGroup"[^>]*_shared/);
  assert.doesNotMatch(html, /class="resultDatasetGroup"[^>]*_unassigned/);
  assert.match(html, /⚠ 2 个 Plan 尚未识别数据集/);
  assert.match(html, /查看 2 个 Plan/);
  assert.match(html, /result-unassigned"/);
  assert.match(html, /高级来源/);
  assert.match(html, /跨数据集原始来源（1）/);
  assert.match(html, /data-details-key="result-dataset-plans-pad_ufes_20"(?! open)/);
  assert.match(html, /data-details-key="result-plan-pad_ufes_20-corim"(?! open)/);
  assert.match(html, /title="experiments\/plans\/comparison\/corim.yaml">corim.yaml/);
  assert.match(html, /title="artifacts\/results\/pad_ufes_20\/final\/final.csv"/);
  assert.doesNotMatch(html, />artifacts\/results\/pad_ufes_20\/final\/final\.csv</);
  assert.match(html, /class="resultMethodList"/);
  assert.doesNotMatch(html, /class="resultTableCards"/);
  assert.match(html, /data-table-key="bus_cot_lesion\/corim" data-format="csv"/);
  assert.match(html, /data-table-key="bus_cot_lesion\/corim" data-format="md"/);
  assert.match(html, /data-table-key="pad_ufes_20\/corim" data-format="csv"/);
  const sourceTableOptions = [...html.matchAll(/<option value="([^"]+)"/g)].map(match => match[1]).filter(value => value.endsWith("/final") || value.endsWith("/corim"));
  assert.equal(new Set(sourceTableOptions).size, sourceTableOptions.length);
  assert.match(html, /data-open-result-split data-table-key="pad_ufes_20\/corim"/);
  assert.match(html, /value="pad_ufes_20\/corim"/);
  assert.match(html, /来源：pad_ufes_20 \/ corim/);
  assert.match(html, /id="resultSplitTables" data-details-key="result-split-tables"/);
  assert.match(source, /\.resultTableName \{ min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;/);
  assert.match(source, /data-command="syncAllResultArtifacts"/);
  assert.match(source, /data-command="parseResults"/);
  assert.match(source, /原始数据与详细追溯/);
  const rendererSource = source.slice(start, end);
  assert.doesNotMatch(rendererSource, /experiments\/results/);
  const reportHtml = renderer.renderProjectResultTables({ resultSyncReport: { discovered: 20, included: ["Plan A"], missing: ["Plan B"], skipped: ["Plan C"] }, resultOutputConfig: { catalog, tables: catalog.datasets.flatMap(group => group.tables) } });
  assert.match(reportHtml, /发现 20 · 收录 1 · 缺指标 1 · 跳过\/失败 1/);
  assert.match(reportHtml, /<details data-details-key="result-sync-report"><summary>查看 Plan 与 Worker 明细/);
  assert.match(readSource("src/ui/sections/ResultsSection.ts"), /按数据集浏览总表、方法结果与原始文件/);
});

test("split action selects the clicked table and opens the existing split tool", () => {
  const renderer = createRenderer({ state: { planFileInput: "experiments/plans/comparison/corim.yaml" } });
  renderer.openResultSplitToolForTable("pad_ufes_20/corim");
  assert.equal(renderer.resultSplitTableKey, "pad_ufes_20/corim");
  assert.equal(renderer.detailsOpenState["result-split-tables"], true);
  assert.equal(renderer.renderCount, 1);
  const html = renderer.renderProjectResultTables({ resultOutputConfig: { catalog, tables: catalog.datasets.flatMap(group => group.tables) } });
  assert.match(html, /data-details-key="result-split-tables" open/);
  assert.match(html, /来源：pad_ufes_20 \/ corim/);
  assert.match(source, /openResultSplitToolForTable\(splitSource\.dataset\.tableKey \|\| ""\)/);
});
