const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");

test("results section pre-key includes Plan selection and operation changes", () => {
  const start = panel.indexOf("function sectionDependencyKey(");
  const end = panel.indexOf("function sectionLocalPreKey(", start);
  const dependency = panel.slice(start, end);
  assert.match(dependency, /section === "results"[\s\S]*data\.planFileInput[\s\S]*data\.plans[\s\S]*data\.resultsSummary[\s\S]*data\.operations[\s\S]*data\.schedulerStates/);
  assert.match(dependency, /data\.experimentTraces[\s\S]*data\.selection[\s\S]*data\.planArchive[\s\S]*data\.pptPlotConfig/);
});

test("results render signature derives contract and analysis paths from operations", () => {
  const start = panel.indexOf("function sectionRenderModel(");
  const end = panel.indexOf("function compactRowsForSignature(", start);
  const model = panel.slice(start, end);
  assert.match(model, /if \(section === "results"\)/);
  assert.match(model, /planFileInput: data\.planFileInput/);
  assert.match(model, /outputContractCheck: compactOutputContractCheckForSignature\(currentResultOutputContractCheck\(data\)\)/);
  assert.match(model, /analysisArtifacts: resultAnalysisArtifactsForState\(data, data\.resultsSummary \|\| \{\}\)/);
  assert.match(panel, /resultEvidenceWorkbenchCacheKeyFor\(summary, traceStats, outputContractCheck, analysisArtifacts, autoParseReadiness\)/);
});
