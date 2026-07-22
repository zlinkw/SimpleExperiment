const test = require("node:test");
const assert = require("node:assert/strict");

const {
  annotatePaperTableWithSignificance,
  builtInOutputContracts,
  caseListToCsv,
  checkProjectOutputContract,
  contractCheckToMarkdown,
  filterRecordsByQualityGate,
  generateEnvironmentSnapshotSnippet,
  generateOutputContractGuide,
  generatePythonCsvWriterSnippet,
  parseCaseLevelCsv,
  runDataLeakageCheck,
  runErrorAnalysis,
  runQualityGate,
  runStatisticalAnalysis,
  runSubgroupAnalysis,
} = require("../dist/features/Quality.js");

function resultRecord(metric = 0.9) {
  const id = metric > 1 ? "bad" : "good";
  return {
    schemaVersion: 1,
    resultId: id,
    experimentId: id,
    runKey: "ours",
    suite: "s",
    experimentName: "ours",
    status: "parsed",
    sourceFiles: [{ path: "metrics_summary.csv", type: "csv", endpoint: "local" }],
    metrics: { AUC: { value: metric, split: "test", seed: "1" } },
    dimensions: { method: "ours", split: "test", seed: "1", dataset: "VinDr" },
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    provenance: { commit: "abc" },
  };
}

function caseCsv() {
  return [
    "experiment_id,case_id,patient_id,dataset,split,fold,seed,method,label,prediction,probability,metric,value,error_type,subgroup,image_path",
    "e1,c1,p1,VinDr,test,0,1,baseline,1,1,0.7,DSC,0.70,,female,img1.png",
    "e1,c1,p1,VinDr,test,0,1,ours,1,1,0.9,DSC,0.90,,female,img1.png",
    "e1,c2,p2,VinDr,test,0,1,baseline,1,0,0.8,DSC,0.50,false_negative,male,img2.png",
    "e1,c2,p2,VinDr,test,0,1,ours,1,1,0.95,DSC,0.80,,male,img2.png",
    "e1,c3,p3,VinDr,train,0,1,ours,0,0,0.1,DSC,0.95,,female,img3.png",
  ].join("\n");
}

test("output contract checker reports missing files and columns with suggestions", () => {
  const contract = builtInOutputContracts[0];
  const files = {
    "metrics_summary.csv": "experiment_id,suite,method,dataset,split,metric,value\nexp,s,ours,VinDr,test,DSC,0.9\n",
    "env_snapshot.json": "{}",
    "config_snapshot.yaml": "x: 1",
  };
  const report = checkProjectOutputContract(files, contract, { experimentId: "e1" });
  assert.equal(report.status, "failed");
  assert.equal(report.columns.some((c) => c.column === "seed" && c.status === "missing"), true);
  assert.match(contractCheckToMarkdown(report), /Output Contract Check/);
  assert.equal(report.suggestions.some((s) => s.title.includes("seed")), true);
});

test("output guide and python snippets include required format", () => {
  const guide = generateOutputContractGuide(builtInOutputContracts[0]);
  assert.match(guide, /metrics_summary.csv/);
  assert.match(generatePythonCsvWriterSnippet("write_metrics_summary", ["experiment_id", "metric"]), /csv.DictWriter/);
  assert.match(generateEnvironmentSnapshotSnippet(), /git_commit/);
});

test("quality gate fails bad result and filters leaderboard inclusion", () => {
  const contract = builtInOutputContracts[0];
  const report = checkProjectOutputContract({ "metrics_summary.csv": "experiment_id,suite,method,dataset,split,seed,metric,value\ne,s,ours,d,test,1,AUC,1.2\n" }, contract);
  const gate = contract.qualityGates[0];
  const failed = runQualityGate(resultRecord(1.2), gate, report, []);
  const passed = runQualityGate(resultRecord(0.9), gate, checkProjectOutputContract({ "metrics_summary.csv": "experiment_id,suite,method,dataset,split,seed,metric,value\ne,s,ours,d,test,1,AUC,0.9\n", "env_snapshot.json": "{}", "config_snapshot.yaml": "x: 1" }, contract), []);
  assert.equal(failed.status, "failed");
  assert.equal(filterRecordsByQualityGate([resultRecord(1.2), resultRecord(0.9)], [failed, passed], "only_gate_passed").length, 1);
});

test("case-level CSV parser supports error and subgroup analysis", () => {
  const rows = parseCaseLevelCsv(caseCsv(), "r1");
  assert.equal(rows.length, 5);
  assert.equal(rows[0].caseId, "c1");
  const worst = runErrorAnalysis(rows, { methodIds: ["baseline"], metric: "DSC", sortBy: { metric: "DSC", direction: "asc" }, limit: 1 });
  assert.equal(worst.cases[0].caseId, "c2");
  assert.match(caseListToCsv(worst.cases), /caseId/);
  const subgroup = runSubgroupAnalysis(rows, { id: "sg", name: "SG", caseLevelSource: "r1", groupBy: ["subgroup"], metrics: ["DSC"], minGroupSize: 2 });
  assert.equal(subgroup.summary.some((g) => g.group === "female"), true);
});

test("statistical rigor supports paired t-test wilcoxon bootstrap and correction", () => {
  const rows = parseCaseLevelCsv(caseCsv(), "r1");
  const plan = {
    schemaVersion: 1,
    id: "stats",
    name: "Stats",
    pairedBy: ["case_id"],
    tests: [
      { id: "t", metric: "DSC", method: "paired_t_test", baselineMethodId: "baseline", compareAllAgainstBaseline: true, alpha: 0.05, correction: "bonferroni", minPairs: 2 },
      { id: "w", metric: "DSC", method: "wilcoxon_signed_rank", baselineMethodId: "baseline", compareAllAgainstBaseline: true, alpha: 0.05, correction: "holm", minPairs: 2 },
      { id: "b", metric: "DSC", method: "bootstrap_ci", baselineMethodId: "baseline", compareAllAgainstBaseline: true, alpha: 0.05, correction: "none", minPairs: 2 },
    ],
    effectSizes: [{ metric: "DSC", method: "mean_diff" }],
    output: { updateLeaderboard: true, updatePaperTable: true, showPValues: true, showSignificanceStars: true, showEffectSize: true },
  };
  const stats = runStatisticalAnalysis(plan, rows, ["baseline", "ours"], "cmp");
  assert.equal(stats.length, 3);
  assert.equal(stats.some((s) => s.method === "bootstrap_ci" || s.ci), true);
  assert.match(annotatePaperTableWithSignificance("table", stats), /table/);
});

test("leakage check warns on missing patient_id and fails on overlap", () => {
  const noPatient = parseCaseLevelCsv("experiment_id,case_id,dataset,split,method,metric,value\ne,c1,d,test,m,DSC,0.9\n", "r");
  assert.equal(runDataLeakageCheck(noPatient).status, "warning");
  const rows = parseCaseLevelCsv([
    "experiment_id,case_id,patient_id,dataset,split,method,metric,value",
    "e,c1,p1,d,train,m,DSC,0.9",
    "e,c2,p1,d,test,m,DSC,0.8",
  ].join("\n"), "r");
  assert.equal(runDataLeakageCheck(rows).status, "failed");
});
