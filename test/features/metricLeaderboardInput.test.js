const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const vm = require("node:vm");
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
});

test("CLI outputs the stable union of all actual metric columns", () => {
  const source = fs.readFileSync(path.join(__dirname, "../../src/cli/commands/metric.ts"), "utf8");
  const tree = ts.createSourceFile("metric.ts", source, ts.ScriptTarget.ES2022, true);
  const declaration = tree.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "metricLeaderboard");
  const code = ts.transpileModule(`${declaration.getText(tree).replace(/^export /, "")}\nmetricLeaderboard`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  let output;
  const text = "runKey,accuracy,loss\na,0.8,\nb,0.9,0.4\n";
  const call = vm.runInNewContext(code, { require: () => ({ existsSync: () => true, readFileSync: () => text }),
    ...Metrics, builtInResultPresets: [], writeJson: value => { output = value; }, writeText: value => { output = value; } });
  assert.equal(call({ file: "data.csv", json: true }), 0);
  assert.deepEqual(Array.from(output.metrics), ["accuracy", "loss"]);
  assert.equal(output.board[1].mean.loss, 0.4);
  assert.equal(call({ file: "data.csv", json: false }), 0);
  assert.match(output, /loss/);
  assert.match(output, /0\.4/);
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
