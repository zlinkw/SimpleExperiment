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
