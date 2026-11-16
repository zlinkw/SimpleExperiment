const test = require("node:test");
const assert = require("node:assert/strict");

const {
  builtInOutputContracts,
  checkProjectOutputContract,
  contractCheckToMarkdown,
  generateEnvironmentSnapshotSnippet,
  generateOutputContractGuide,
  generatePythonCsvWriterSnippet,
} = require("../dist/features/Quality.js");

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
