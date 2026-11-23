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
const Tables = require("../../src/results/ProjectResultTables.ts");
function extract(file, name, method = false) {
  const text = fs.readFileSync(path.join(__dirname, "../../src", file), "utf8");
  const tree = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true);
  let match;
  function visit(node) {
    if ((method ? ts.isMethodDeclaration(node) : ts.isFunctionDeclaration(node)) && node.name?.getText(tree) === name) match = node;
    ts.forEachChild(node, visit);
  }
  visit(tree);
  assert.ok(match);
  const src = match.getText(tree).replace(/^export /, "");
  const expression = method ? `({${src}}).${name}` : `${src}\n${name}`;
  return ts.transpileModule(expression, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
}
function fixture(initialDataset = "") {
  const events = [];
  const table = { dataset: initialDataset, datasetKey: initialDataset || "_unassigned", tableKey: "_unassigned/final", kind: "final", name: "final",
    header: ["plan_file", "dataset", "accuracy"], rows: [["plan.yaml", initialDataset, 0.8]], markdown: "" };
  let saved = { tables: [table] };
  const map = vm.runInNewContext(extract("results/LatestResultExport.ts", "mapLatestResultDatasets"), {
    withResultWriter: async (_root, _dir, _current, action) => action(), readLatestResultExport: async () => saved,
    normalizePlanDatasetKey: Tables.normalizePlanDatasetKey, datasetPartitions: Tables.datasetPartitions,
    tablePaths: require("../../src/results/ResultLayout.ts").tablePaths, resultTableMarkdown: Tables.resultTableMarkdown,
    safeFile: async () => "memory", LATEST_RESULT_FILE: "latest.json",
    atomicWriteText: async (_file, value) => { events.push("json"); saved = JSON.parse(value); },
    writeTables: async () => { events.push("tables"); throw new Error("EACCES"); },
  });
  return { map, events, saved: () => saved };
}
test("mapping is saved after validation and before a failing table write", async () => {
  const f = fixture();
  let mapping;
  await assert.rejects(f.map("root", "results", { "plan.yaml": "肺" }, () => true,
    async () => { f.events.push("config"); mapping = "肺"; }), /EACCES/);
  assert.equal(mapping, "肺");
  assert.deepEqual(f.events, ["config", "json", "tables"]);
  assert.equal(f.saved().tables[0].rows[0][1], "肺");
  assert.equal(f.saved().tables[0].rows[0][2], 0.8);
});
test("trusted dataset rejects a different mapping before configuration is saved", async () => {
  const f = fixture("可信");
  await assert.rejects(f.map("root", "results", { "plan.yaml": "其他" }, () => true,
    async () => { f.events.push("config"); }), /不能通过人工映射覆盖/);
  assert.deepEqual(f.events, []);
});
test("dataset directory collision rejects the request before configuration is saved", async () => {
  const f = fixture();
  const table = f.saved().tables[0];
  table.rows.push(["other.yaml", "A B", 0.7]);
  await assert.rejects(f.map("root", "results", { "plan.yaml": "A_B" }, () => true,
    async () => { f.events.push("config"); }), /同一目录/);
  assert.deepEqual(f.events, []);
});
test("host supplies validated configuration save to the result writer", async () => {
  let saved;
  const context = { root: "project" };
  const host = { captureProjectContext: () => context, projectContextIsCurrent: () => true,
    readProjectResultCatalog: async () => ({ unassignedPlans: [{ planFile: "plan.yaml" }] }),
    refreshLocalResultCatalogForProject: async () => {}, postState() {} };
  const apply = vm.runInNewContext(extract("extension/legacy.ts", "applyPlanDatasetMappingFromUi", true), {
    recordField: (message, key) => message[key], pluginProjectAdapterRules: () => ({}), ProjectResultTables: Tables,
    DEFAULT_RESULT_CSV_DIR: "results", mapLatestResultDatasets: async (_r, _d, _m, _c, save) => { await save(); throw Error("EACCES"); },
    vscode: { Uri: { file: root => root }, ConfigurationTarget: { WorkspaceFolder: 1 }, workspace: {
      getConfiguration: () => ({ update: async (_key, rules) => { saved = rules; } }) }, window: {} },
  });
  await assert.rejects(apply.call(host, { mappings: { "plan.yaml": "肺" } }), /EACCES/);
  assert.equal(saved.planDatasetMapping["plan.yaml"].datasets[0], "肺");
});

test("opening a result table keeps the original directory across asynchronous reads", async () => {
  const context = { root: "project" }, calls = [], table = { tableKey: "BUS/final", path: "results/BUS/final.csv", markdownPath: "results/BUS/final.md" };
  let changeDuringCatalog = false, changeDuringExport = false;
  const host = { resultCsvDirectory: "results", captureProjectContext: () => context, projectContextIsCurrent: () => true,
    readProjectResultCatalog: async (_root, _mappings, directory) => {
      calls.push(["catalog", directory]); if (changeDuringCatalog) host.resultCsvDirectory = "other";
      return { datasets: [{ tables: [table], plans: [] }] };
    },
    withProjectResultPublicationLease: async (_root, _directory, work) => work(),
    openWorkspaceFileForProjectContext: async file => calls.push(["open", file]) };
  const open = vm.runInNewContext(extract("extension/legacy.ts", "openLocalResultTableFromUi", true), {
    pluginProjectAdapterRules: () => ({}), DEFAULT_RESULT_CSV_DIR: "results",
    readLatestResultExport: async (_root, directory) => { calls.push(["read", directory]); if (changeDuringExport) host.resultCsvDirectory = "other"; return { tables: [{ tableKey: table.tableKey }] }; },
    regenerateLatestResultTables: async (_root, directory, _value, current) => { assert.equal(current(), true); calls.push(["regenerate", directory]); },
  });
  await open.call(host, { tableKey: "BUS/final", format: "md", file: "../ignored" });
  assert.deepEqual(calls, [["catalog", "results"], ["read", "results"], ["regenerate", "results"], ["open", table.markdownPath]]);
  calls.length = 0; changeDuringCatalog = true;
  await assert.rejects(open.call(host, { tableKey: "BUS/final" }), /结果目录已变化/);
  assert.deepEqual(calls, [["catalog", "results"]]);
  calls.length = 0; host.resultCsvDirectory = "results"; changeDuringCatalog = false; changeDuringExport = true;
  await assert.rejects(open.call(host, { tableKey: "BUS/final" }), /结果目录已变化/);
  assert.deepEqual(calls, [["catalog", "results"], ["read", "results"]]);
});
