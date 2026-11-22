const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");
Module._extensions[".ts"] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, file);
const Results = require("../../src/features/Results.legacy.ts");
const Metrics = require("../../src/features/Metrics.ts");
const Tables = require("../../src/results/ProjectResultTables.ts");
const source = { path: "results.csv", type: "csv", endpoint: "local" };
const wide = Results.selectResultPreset("results.csv");

test("wide metric discovery checks later rows and keeps a legitimate zero", () => {
  const rows = Results.parseResultFile("run_key,score\na,bad\nb,0\nc,0.75\n", source,
    { ...wide, format: "wide_csv", finalRowSelector: undefined, metricColumns: [], columnMapping: { runKey: "run_key" } });
  assert.equal(rows.length, 3);
  assert.equal(rows[0].metrics.score, undefined);
  assert.equal(rows[1].metrics.score.value, 0);
  assert.equal(rows[2].metrics.score.value, 0.75);
});

test("long metrics merge only when case, model and tag also match", () => {
  const text = "run_key,case,model,tag,metric,value\nr,a,m,t,loss,1\nr,a,m,t,accuracy,0.8\nr,b,m,t,loss,2\nr,a,n,t,loss,3\nr,a,m,u,loss,4\n";
  const rows = Results.parseResultFile(text, source, { ...wide, format: "long_csv",
    columnMapping: { runKey: "run_key", metric: "metric", value: "value" } });
  assert.equal(rows.length, 4);
  assert.equal(rows[0].metrics.loss.value, 1);
  assert.equal(rows[0].metrics.accuracy.value, 0.8);
  assert.equal(new Set(rows.map(row => row.resultId)).size, 4);
});

test("quoted newlines, commas and escaped quotes stay within a single CSV record", () => {
  const text = 'run_key,note,score\n"run,a","line 1\nline ""2""",0.9\n';
  const parsed = Tables.readCsv(text);
  assert.equal(parsed.rows.length, 1);
  assert.deepEqual(parsed.rows[0], ["run,a", 'line 1\nline "2"', "0.9"]);
  const preset = { ...wide, format: "wide_csv", finalRowSelector: undefined,
    metricColumns: ["score"], columnMapping: { runKey: "run_key" } };
  const rows = Results.parseResultFile(text, source, preset);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].runKey, "run,a");
  assert.equal(rows[0].metrics.score.value, 0.9);
  assert.equal(Results.previewResultParse(text, source.path, preset).rows, 1);
  const metrics = Metrics.parseMetricsFile(text, source.path);
  assert.equal(metrics.length, 1);
  assert.equal(metrics[0].metrics.score, 0.9);
});

test("long CSV handles quoted fields and ordinary rows", () => {
  const text = 'run_key,note,metric,value\n"r,1","first\nsecond",loss,0\n"r,1",plain,accuracy,0.9\n';
  const preset = { ...wide, format: "long_csv", finalRowSelector: undefined,
    columnMapping: { runKey: "run_key", metric: "metric", value: "value" } };
  const rows = Results.parseResultFile(text, source, preset);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].runKey, "r,1");
  assert.equal(rows[0].metrics.loss.value, 0);
  assert.equal(rows[0].metrics.accuracy.value, 0.9);
});

test("result parsing and aggregation preserve special metric names", () => {
  const preset = { ...wide, format: "wide_csv", finalRowSelector: undefined,
    metricColumns: ["__proto__", "constructor"], columnMapping: { runKey: "run_key" } };
  const records = Results.parseResultFile("run_key,__proto__,constructor\nr,0.4,0.5\n", source, preset);
  assert.equal(records[0].metrics.__proto__.value, 0.4);
  assert.equal(records[0].metrics.constructor.value, 0.5);
  const board = Results.buildResultLeaderboard(records, { filter: {}, groupBy: ["suite"], aggregate: "raw",
    metrics: [{ key: "__proto__" }, { key: "constructor" }] });
  assert.deepEqual(board[0].values.__proto__.raw, [0.4]);
  assert.deepEqual(board[0].values.constructor.raw, [0.5]);
});

test("default metrics retain distinct AP, AUPRC and aggregation identities in wide, long and JSON", () => {
  const preset = Results.builtInResultPresets.find(p => p.id === "classification_wide_csv");
  const names = ["AP", "AUPRC", "macro_f1", "micro_f1", "weighted_f1", "macro_precision", "micro_recall", "loss", "log_loss"];
  const values = [0, .2, .3, .4, .5, .6, .7, .8, .9];
  const wideText = `run_key,${names.join(",")}\nr,${values.join(",")}\n`;
  const longText = `run_key,metric,value\n${names.map((name, i) => `r,${name},${values[i]}`).join("\n")}\n`;
  const jsonText = JSON.stringify({ run_key: "r", metrics: Object.fromEntries(names.map((name, i) => [name, values[i]])) });
  const wideRows = Results.parseResultFile(wideText, source, preset);
  const longRows = Results.parseResultFile(longText, source, { ...preset, format: "long_csv" });
  const jsonRows = Results.parseResultFile(jsonText, { ...source, path: "results.json", type: "json" }, preset);
  for (const rows of [wideRows, longRows, jsonRows]) {
    assert.equal(rows.length, 1);
    for (const [i, name] of names.entries()) assert.equal(rows[0].metrics[name]?.value, values[i], name);
  }
  const preview = Results.previewResultParse(wideText, source.path, preset);
  assert.equal(preview.rows, 1);
  assert.equal(preview.sampleMetrics.AP.value, 0);
  const schema = Results.builtInResultSchemas.find(s => s.id === "classification");
  const projected = Results.applyResultSchema(wideRows[0], schema);
  for (const [i, name] of names.entries()) assert.equal(projected.metrics[name]?.value, values[i], name);
  const empty = Results.parseResultFile("run_key,AP,AUPRC\nr,,0\n", source, preset)[0].metrics;
  assert.equal(empty.AP, undefined);
  assert.equal(empty.AUPRC.value, 0);
  const synonyms = Results.parseResultFile("run_key,average_precision,pr_auc,f1_macro,f1_micro,f1_weighted\nr,0,0.2,0.3,0.4,0.5\n", source, preset)[0].metrics;
  for (const [i, name] of names.slice(0, 5).entries()) assert.equal(synonyms[name]?.value, values[i]);
  const split = Results.parseResultFile("run_key,test_macro_f1,val_macro_f1\nr,0,0.4\n", source, preset)[0].metrics;
  assert.equal(split.macro_f1.value, 0);
  assert.equal(split.val_macro_f1.value, .4);
  const explicit = Results.parseResultFile("run_key,AP\nr,0.5\n", source, { ...preset, metricAliases: { AP: "AUPRC" } });
  assert.equal(explicit[0].metrics.AUPRC.value, .5);
  assert.equal(Results.normalizeMetricKey("AP", undefined, [{ from: "AP", to: "AUPRC" }]), "AUPRC");
});

test("automatic selection reaches wide, long and JSON through parser and factory consumers", () => {
  const { ResultParser } = require("../../src/features/Results/ResultParser.ts");
  const { createResultsFactory } = require("../../src/features/factories/ResultsFactory.ts");
  const wideText = "run_key,AP,AUPRC,custom_score\nr,0,0.2,0.7\n";
  const longText = "run_key,metric,value\nr,AP,0\nr,AUPRC,0.2\n";
  const jsonText = '{"run_key":"r","metrics":{"AP":0,"AUPRC":0.2}}';
  const parser = new ResultParser(), factory = createResultsFactory(), factoryParser = factory.createParser();
  for (const [file, text] of [["results.csv", wideText], ["results.csv", longText], ["results.json", jsonText]]) {
    for (const records of [parser.parse(text, { path: file }), factory.parse(text, file, undefined), factoryParser.parse(text, file)]) {
      assert.equal(records.length, 1);
      assert.equal(records[0].metrics.AP.value, 0);
      assert.equal(records[0].metrics.AUPRC.value, .2);
    }
    assert.equal(factory.preview(text, file).records, 1);
    assert.equal(parser.preview(text, file).records, 1);
  }
  assert.equal(factoryParser.parse(wideText, "results.csv")[0].metrics.custom_score.value, .7);
  assert.equal(factoryParser.parse("run_key,AP\n", "results.csv").length, 0);
  const explicit = factory.createParser("classification_long_csv");
  assert.equal(explicit.parse(wideText, "results.csv").length, 0);
  assert.throws(() => factory.createParser("missing").parse(wideText, "results.csv"), /未知结果解析预设/);
  const custom = { ...Results.builtInResultPresets[1], metricColumns: ["custom_score"], metricAliases: { custom_score: "custom" } };
  assert.equal(factory.parse(wideText, "results.csv", custom)[0].metrics.custom.value, .7);
});

test("local result command selects from actual contents and rejects unknown explicit presets", () => {
  const vm = require("node:vm"), path = require("node:path");
  const text = fs.readFileSync(path.join(__dirname, "../../src/cli/commands/result.ts"), "utf8");
  const ast = ts.createSourceFile("result.ts", text, ts.ScriptTarget.ES2022, true);
  const node = ast.statements.find(item => ts.isFunctionDeclaration(item) && item.name?.text === "resultParse");
  let input = "run_key,AP,AUPRC\nr,0,0.2\n", output;
  const context = { fs: { existsSync: () => true, readFileSync: () => input }, path,
    builtInResultPresets: Results.builtInResultPresets, selectResultPreset: Results.selectResultPreset,
    parseResultFile: Results.parseResultFile, usageError: msg => Error(msg), businessError: msg => Error(msg), writeJson: rows => { output = rows; } };
  const run = vm.runInNewContext(ts.transpileModule(node.getText(ast).replace(/^export /, "") + "\nresultParse", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  assert.equal(run({ file: "results.csv" }), 0);
  assert.equal(output[0].metrics.AP.value, 0);
  assert.equal(output[0].metrics.AUPRC.value, .2);
  input = "run_key,metric,value\nr,AP,0\nr,AUPRC,0.2\n";
  assert.equal(run({ file: "results.csv" }), 0);
  assert.equal(output[0].metrics.AP.value, 0);
  assert.throws(() => run({ file: "results.csv", preset: "missing" }), /unknown result preset/);
  assert.equal(run({ file: "results.csv", preset: "classification_long_csv" }), 0);
  assert.equal(output[0].metrics.AUPRC.value, .2);
});
