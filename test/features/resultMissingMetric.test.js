const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");
const vm = require("node:vm");
Module._extensions[".ts"] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, file);
const { buildResultLeaderboard } = require("../../src/features/Results.legacy.ts");

test("leaderboard excludes missing, blank and boolean values while retaining zero", () => {
  const rows = [null, "", "  ", false, true, 0, "0.8"].map((value, index) => ({
    resultId: String(index), status: "parsed", suite: "demo", dimensions: {}, metrics: { loss: { value } },
  }));
  const config = { filter: {}, groupBy: ["suite"], metrics: [{ key: "loss", higherIsBetter: false }],
    aggregate: "raw", primarySortMetric: "loss" };
  const result = buildResultLeaderboard(rows, config)[0];
  assert.deepEqual(result.values.loss.raw, [0, 0.8]);
  assert.equal(result.bestResultId, "5");
  const missing = buildResultLeaderboard(rows.slice(0, 5), config)[0];
  assert.deepEqual(missing.values.loss, {});
  assert.equal(missing.bestResultId, undefined);
});

test("result export retains null and does not create a numeric raw value for it", async () => {
  const text = fs.readFileSync(require("node:path").join(__dirname, "../../src/cli/commands/result.ts"), "utf8");
  const tree = ts.createSourceFile("result.ts", text, ts.ScriptTarget.ES2022, true);
  const declaration = tree.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "resultExport");
  const script = ts.transpileModule(`${declaration.getText(tree).replace(/^export /, "")}\nresultExport`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  let receipt;
  const match = { id: "r", metrics: { loss: null }, record: { resultId: "r", status: "parsed", suite: "demo",
    dimensions: {}, metrics: { loss: { value: null } } } };
  const resultExport = vm.runInNewContext(script, { loadResults: async () => [match], selectResult: rows => rows[0],
    buildResultLeaderboard, exportPaperTable: () => "", writeJson: value => { receipt = value; } });
  assert.equal(await resultExport("r", { json: true }), 0);
  const result = JSON.parse(receipt.content);
  assert.equal(result.metrics.loss, null);
  assert.equal(result.rows[0].values.loss.raw, undefined);
  assert.equal(result.rows[0].bestResultId, undefined);
});
