const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");
Module._extensions[".ts"] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, file);
const Results = require("../../src/features/Results.legacy.ts");
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
