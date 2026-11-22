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
  const text = fs.readFileSync(require("node:path").join(__dirname, "../../src/mcp/query/Results.ts"), "utf8");
  const tree = ts.createSourceFile("result.ts", text, ts.ScriptTarget.ES2022, true);
  const declaration = tree.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "resultExport");
  const script = ts.transpileModule(`${declaration.getText(tree).replace(/^export /, "")}\nresultExport`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  let receipt;
  const match = { id: "r", metrics: { loss: null }, record: { resultId: "r", status: "parsed", suite: "demo",
    dimensions: {}, metrics: { loss: { value: null } } } };
  const resultExport = vm.runInNewContext(script, { loadResults: async () => [match], selectResult: rows => rows[0],
    buildResultLeaderboard, exportPaperTable: () => "", emit: value => { receipt = value; } });
  assert.equal(await resultExport("r", { json: true }), 0);
  const result = JSON.parse(receipt.content);
  assert.equal(result.metrics.loss, null);
  assert.equal(result.rows[0].values.loss.raw, undefined);
  assert.equal(result.rows[0].bestResultId, undefined);
});

test("MCP metric extraction and comparison retain only actual special keys", async () => {
  const sourceFile = name => fs.readFileSync(require("node:path").join(__dirname, `../../src/mcp/query/${name}.ts`), "utf8");
  const extract = (name, names) => {
    const tree = ts.createSourceFile(`${name}.ts`, sourceFile(name), ts.ScriptTarget.ES2022, true);
    return names.map(id => tree.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === id).getText(tree).replace(/^export /, "")).join("\n");
  };
  const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const numericMetrics = vm.runInNewContext(compile(`${extract("Metrics", ["numericMetrics"])}\nnumericMetrics`));
  const left = JSON.parse('{"__proto__":0.4,"constructor":2,"accuracy":0.8}');
  const right = JSON.parse('{"__proto__":0.6,"accuracy":0.9}');
  assert.equal(numericMetrics({ metrics: left }).__proto__, 0.4);
  let receipt;
  const rows = [left, right].map((metrics, index) => ({ id: String(index), metrics, record: { metrics: {} } }));
  const compare = vm.runInNewContext(compile(`${extract("Compare", ["compareResults"])}\ncompareResults`), {
    loadResults: async () => rows,
    selectResult: (items, id) => items.find(item => item.id === id), numericMetrics,
    builtInResultPresets: [], LOWER_IS_BETTER: /loss/, emit: value => { receipt = value; },
  });
  assert.equal(await compare("0", "1"), 0);
  assert.equal(receipt.metric_difference.__proto__.delta, 0.2);
  assert.equal(Object.hasOwn(receipt.metric_difference, "constructor"), false);
  assert.equal(JSON.parse(JSON.stringify(receipt)).metric_difference.__proto__.delta, 0.2);
});
