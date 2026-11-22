const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");
Module._extensions[".ts"] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, file);
const Metrics = require("../../src/features/Metrics.ts");

test("JSON extensions are case insensitive and invalid JSON remains an error", () => {
  for (const file of ["metrics.json", "metrics.JSON", "metrics.JsOn"]) {
    const row = Metrics.parseMetricsFile('{"metrics":{"accuracy":0.9}}', file)[0];
    assert.equal(row.metrics.accuracy, 0.9);
    assert.throws(() => Metrics.parseMetricsFile("{", file), SyntaxError);
  }
});

test("known numeric dimensions are excluded but custom metrics and zero remain", () => {
  const row = Metrics.parseMetricsFile("runKey,experimentId,seed,case,accuracy,custom\nr,123,42,9,0.9,0\n", "data.csv")[0];
  assert.deepEqual(row.metrics, { accuracy: 0.9, custom: 0 });
  const json = Metrics.parseMetricsFile('{"experimentId":123,"seed":42,"accuracy":0.9,"custom":0}', "data.JSON")[0];
  assert.deepEqual(json.metrics, { accuracy: 0.9, custom: 0 });
  const explicit = Metrics.parseMetricsFile('{"seed":42,"metrics":{"seed":0.5,"epoch":0,"score":0.8,"__proto__":1,"constructor":2}}', "data.json")[0];
  assert.equal(explicit.metrics.seed, 0.5);
  assert.equal(explicit.metrics.epoch, 0);
  assert.equal(explicit.metrics.score, 0.8);
  assert.equal(explicit.metrics.__proto__, 1);
  assert.equal(explicit.metrics.constructor, 2);
});

test("CSV and JSON special metric keys survive leaderboard aggregation", () => {
  for (const [text, file] of [
    ["runKey,__proto__,constructor,accuracy\nr,0.4,0.5,0.8\n", "data.csv"],
    ['{"metrics":{"__proto__":0.4,"constructor":0.5,"accuracy":0.8}}', "data.JSON"],
  ]) {
    const rows = Metrics.parseMetricsFile(text, file);
    const board = Metrics.buildLeaderboard(rows, () => "group")[0];
    assert.equal(board.mean.__proto__, 0.4);
    assert.equal(board.mean.constructor, 0.5);
    assert.equal(JSON.parse(JSON.stringify(board)).mean.__proto__, 0.4);
  }
});
