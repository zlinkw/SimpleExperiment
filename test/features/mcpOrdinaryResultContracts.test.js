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
  const { availableResources } = require("../../src/cli/commands/resource.ts");
  const { businessError } = require("../../src/cli/errors.ts");
  let fail = true, output;
  const call = extract("cli/commands/resource.ts", "resourceCommand", { availableResources,
    optionalApi: async () => ({ worker: { gpus: [{ index: 0, utilizationPercent: 0, processCount: 0 }] } }),
    loadExperiments: async () => { if (fail) throw businessError("task query rejected"); return []; },
    writeJson: value => { output = value; } });
  await assert.rejects(call("available", [], { json: true }), /task query rejected/);
  fail = false; assert.equal(await call("available", [], { json: true }), 0);
  assert.equal(output[0].available, "true"); assert.equal(output[0].utilization, 0);
});
test("metric show rejects a missing result but preserves empty and zero metrics", async () => {
  let row, output;
  const { businessError } = require("../../src/cli/errors.ts");
  const show = extract("cli/commands/metric.ts", "metricShow", { loadResults: async () => row ? [row] : [],
    selectResult: rows => rows[0], businessError, numericMetrics: item => item.metrics, writeJson: value => { output = value; } });
  await assert.rejects(show("missing", { json: true }), /result not found/);
  row = { metrics: {} }; await show("empty", { json: true }); assert.deepEqual(output, {});
  row = { metrics: { score: 0 } }; await show("zero", { json: true }); assert.equal(output.score, 0);
});
test("comparison distinguishes a present empty record from a missing record", async () => {
  let rows, output;
  const compare = extract("cli/commands/compare.ts", "compareCommand", { requirePositional: (r, i) => r[i],
    loadResults: async () => rows, selectResult: (items, id) => items.find(item => item.id === id),
    numericMetrics: row => row.metrics, writeJson: value => { output = value; }, builtInResultPresets: [], LOWER_IS_BETTER: /loss/ });
  rows = [{ id: "a", metrics: {}, record: { metrics: {} } }, { id: "b", metrics: { score: 0 }, record: { metrics: {} } }];
  await compare(["a", "b"], { json: true }); assert.match(output.reason, /no numeric metrics/);
  await compare(["missing", "b"], { json: true }); assert.match(output.reason, /no results recorded for missing/);
});
test("asynchronous experiment result schema names the actual experiment_id", () => {
  const { toolOutputSchema } = require("../../src/mcp/ToolResults.ts");
  const operation = toolOutputSchema("operation_get").anyOf[0];
  const conditional = operation.allOf.find(item => item.if.properties.tool.const === "experiment_results");
  const schema = conditional.then.properties.result.anyOf[0];
  assert.equal(schema.properties.experiment_id.type, "string");
  assert.ok(schema.required.includes("experiment_id"));
});
