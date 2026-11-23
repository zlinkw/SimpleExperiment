const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const test = require("node:test");
const ts = require("typescript");
const vm = require("node:vm");
Module._extensions[".ts"] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, file);
function extract(file, name, globals) {
  const text = fs.readFileSync(path.join(__dirname, "../../src", file), "utf8");
  const tree = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true);
  const node = tree.statements.find(item => ts.isFunctionDeclaration(item) && item.name?.text === name);
  assert.ok(node);
  return vm.runInNewContext(ts.transpileModule(`${node.getText(tree).replace(/^export /, "")}\n${name}`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, globals);
}
test("resource query surfaces task refusal and preserves genuinely idle zero values", async () => {
  const { businessError } = require("../../src/mcp/query/Support.ts");
  const source = "mcp/query/Resources.ts", globals = {};
  for (const name of ["asRecord", "finiteNumber", "gpuRecords", "availableResources"]) globals[name] = extract(source, name, globals);
  let fail = true, output;
  const call = extract(source, "resourceAvailable", { availableResources: globals.availableResources,
    optionalApi: async () => ({ worker: { gpus: [{ index: 0, utilizationPercent: 0, processCount: 0 }] } }),
    loadExperiments: async () => { if (fail) throw businessError("task query rejected"); return []; },
    emit: value => { output = value; } });
  await assert.rejects(call(), /task query rejected/);
  fail = false; assert.equal(await call(), 0);
  assert.equal(output[0].available, "true"); assert.equal(output[0].utilization, 0);
  const gpu = { worker: { status: "stale", gpus: [{ index: 0, utilizationPercent: 0, processCount: 0 }] } };
  assert.equal(globals.availableResources({ gpu }, new Set())[0].available, "unknown");
  assert.equal(globals.availableResources({ gpu }, new Set())[0].reason, "telemetry_unavailable");
  gpu.worker.gpus[0].processCount = 2;
  assert.equal(globals.availableResources({ gpu }, new Set())[0].available, "unknown");
  gpu.worker.status = "degraded";
  assert.equal(globals.availableResources({ gpu }, new Set())[0].available, "unknown");
  gpu.worker.status = "online";
  assert.equal(globals.availableResources({ source: "offline_import", gpu }, new Set())[0].available, "unknown");
  assert.equal(globals.availableResources({ gpu }, new Set())[0].available, "false");
});
test("metric show rejects a missing result but preserves empty and zero metrics", async () => {
  let row, output;
  const { businessError } = require("../../src/mcp/query/Support.ts");
  const show = extract("mcp/query/Metrics.ts", "metricShow", { loadResults: async () => row ? [row] : [],
    selectResult: rows => rows[0], businessError, numericMetrics: item => item.metrics, emit: value => { output = value; } });
  await assert.rejects(show("missing"), /result not found/);
  row = { metrics: {} }; await show("empty"); assert.deepEqual(output, {});
  row = { metrics: { score: 0 } }; await show("zero"); assert.equal(output.score, 0);
});
test("comparison distinguishes a present empty record from a missing record", async () => {
  let rows, output;
  const compare = extract("mcp/query/Compare.ts", "compareResults", {
    loadResults: async () => rows, selectResult: (items, id) => items.find(item => item.id === id),
    numericMetrics: row => row.metrics, emit: value => { output = value; }, builtInResultPresets: [], LOWER_IS_BETTER: /loss/ });
  rows = [{ id: "a", metrics: {}, record: { metrics: {} } }, { id: "b", metrics: { score: 0 }, record: { metrics: {} } }];
  await compare("a", "b"); assert.match(output.reason, /no numeric metrics/);
  await compare("missing", "b"); assert.match(output.reason, /no results recorded for missing/);
});
test("asynchronous experiment result schema names the actual experiment_id", () => {
  const { toolOutputSchema } = require("../../src/mcp/ToolResults.ts");
  const operation = toolOutputSchema("operation_get").anyOf[0];
  const conditional = operation.allOf.find(item => item.if.properties.tool.const === "experiment_results");
  const schema = conditional.then.properties.result.anyOf[0];
  assert.equal(schema.properties.experiment_id.type, "string");
  assert.ok(schema.required.includes("experiment_id"));
});
test("result parsing and metric leaderboard accept only their implemented options", () => {
  const { PROJECT_TOOLS, validateToolArguments } = require("../../src/mcp/ToolCatalog.ts");
  const schema = name => PROJECT_TOOLS.find(tool => tool.name === name).inputSchema;
  assert.doesNotThrow(() => validateToolArguments(schema("result_parse"), { file: "results.csv", preset: "custom" }));
  assert.doesNotThrow(() => validateToolArguments(schema("metric_leaderboard"), { file: "results.csv", primary: "score" }));
  for (const [name, args] of [["result_parse", { file: "a.csv", primary: "score" }],
    ["result_parse", { file: "a.csv", metrics: ["score"] }], ["metric_leaderboard", { file: "a.csv", preset: "x" }],
    ["metric_leaderboard", { file: "a.csv", metrics: ["score"] }]]) {
    assert.throws(() => validateToolArguments(schema(name), args), /Unknown arguments/);
  }
  let selected;
  const preset = { id: "custom" };
  const parse = extract("mcp/query/ResultParse.ts", "resultParse", { fs: { existsSync: () => true, readFileSync: () => "score\n1" }, path,
    builtInResultPresets: [preset], parseResultFile: (_text, _source, chosen) => { selected = chosen; return []; }, emit() {} });
  assert.equal(parse({ file: "a.csv", preset: "custom" }), 0);
  assert.equal(selected, preset);
});
test("WARN and WARNING map to WARNING without altering other levels", () => {
  const { parseLogRecords: parse } = require("../../src/mcp/query/Experiments.ts");
  const rows = parse("2026-01-01 01:02:03 WARN first\nWARNING second\nERROR third\nINFO fourth\nDEBUG fifth\nCRITICAL sixth\n");
  assert.deepEqual(Array.from(rows, row => row.level), ["WARNING", "WARNING", "ERROR", "INFO", "DEBUG", "CRITICAL"]);
  assert.equal(rows[0].timestamp, "2026-01-01 01:02:03");
  assert.equal(rows[1].message, "WARNING second");
});
test("experiment references prefer exact IDs and reject ambiguous aliases", () => {
  const { pickExperiment } = require("../../src/mcp/query/Experiments.ts");
  const rows = [{ id: "one", name: "target", run_id: "r1" }, { id: "target", name: "shared", run_id: "r2" },
    { id: "worker:3", name: "shared", run_id: "r3" }];
  assert.equal(pickExperiment(rows, "target").id, "target");
  assert.equal(pickExperiment(rows, "r3").id, "worker:3");
  assert.throws(() => pickExperiment(rows, "shared"), /EXPERIMENT_SELECTION_AMBIGUOUS/);
});
test("qualified artifact IDs do not fall back to suffixes from another identity", async () => {
  const { businessError } = require("../../src/mcp/query/Support.ts");
  const rows = [{ id: "worker:1", name: "old", run_id: "r1" }, { id: "worker:2", name: "worker", run_id: "r2" }];
  const find = extract("mcp/query/Artifacts.ts", "findArtifact", { path, businessError,
    loadExperiments: async () => rows,
    listArtifacts: async id => id === "worker:1" ? [{ id: "worker:1:dir/file.csv", path: "dir/file.csv" }] : [],
    resolveProjectPath: value => value, fileExists: () => false, fs });
  assert.equal((await find("worker:1:dir/file.csv")).path, "dir/file.csv");
  assert.equal((await find("worker:1:file.csv")).path, "dir/file.csv");
  assert.equal(await find("worker:2:file.csv"), null);
});
