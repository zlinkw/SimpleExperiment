const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../../src/extension/legacy.ts"), "utf8");
const ast = ts.createSourceFile("legacy.ts", source, ts.ScriptTarget.Latest, true);
const provider = ast.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === "RealtimeTunnelPanelProvider");
const names = new Set(["resultCatalogKey", "invalidateResultCatalogCache", "hasResultCatalogForRoot", "cachedResultCatalog", "compactResultTablesFromCatalog"]);
const methods = provider.members.filter(node => node.name && names.has(node.name.getText(ast)));
const code = ts.transpileModule(`class Subject { ${methods.map(node => node.getText(ast)).join("\n")} }`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const sandbox = {
  path,
  workspaceRoot: () => "C:/workspace",
  DEFAULT_RESULT_CSV_DIR: "experiments/results", Date, console,
};
require("vm").runInNewContext(`${code}; this.Subject = Subject;`, sandbox);

test("buildState reads a UI-light catalog cache while catalog scanning stays in a worker", () => {
  const subject = new sandbox.Subject();
  subject.resultCsvDirectory = "experiments/results";
  subject.resultCatalogDirtyGeneration = 0;
  subject.resultCatalogTtlMs = 5000;
  const catalog = { datasets: [{ name: "A", datasetKey: "a", tables: [{ tableKey: "a/final", dataset: "A", kind: "final", header: ["dataset"], values: { dataset: ["A"] }, path: "a.csv", rowCount: 1, plans: ["must-not-copy"] }], plans: [{ artifacts: ["large-plan-artifact-list"] }] }], fullPlanCache: ["omit"] };
  subject.resultCatalogCache = { key: subject.resultCatalogKey("C:/workspace", { a: "A" }), expiresAt: Date.now() + 5000, catalog };
  subject.refreshResultCatalogForCurrentInterest = () => undefined;
  const first = subject.cachedResultCatalog("C:/workspace", { a: "A" });
  const second = subject.cachedResultCatalog("C:/workspace", { a: "A" });
  assert.equal(first, catalog);
  assert.equal(first, second);
  const compact = subject.compactResultTablesFromCatalog(first);
  assert.equal(compact.length, 1);
  assert.equal("plans" in compact[0], false);
  subject.invalidateResultCatalogCache("test-write");
  assert.equal(subject.cachedResultCatalog("C:/workspace", { a: "A" }), catalog, "last-known-good results stay visible during background refresh");

  const buildStateStart = source.indexOf("private buildState(");
  const buildStateEnd = source.indexOf("\n    currentUiLayoutState()", buildStateStart);
  const buildState = source.slice(buildStateStart, buildStateEnd);
  assert.equal((buildState.match(/ProjectResultTables\.resultCatalog\(/g) || []).length, 0);
  assert.match(buildState, /this\.cachedResultCatalog\(/);
  assert.match(buildState, /this\.compactResultTablesFromCatalog\(resultCatalog\)/);
  assert.doesNotMatch(buildState, /ProjectResultTables\.tableCatalog\(/);
  assert.match(buildState, /const timing: PanelBuildTiming/);
  assert.match(buildState, /timing\.runtimeEvidenceMs\s*=/);
  assert.match(buildState, /timing\.resultCatalog\s*=/);
  assert.match(buildState, /this\.latestPanelBuildTiming = timing/);
  assert.match(source, /resultCatalog: \{ \.\.\.this\.latestPanelBuildTiming\.resultCatalog \}/);
  assert.match(source, /receivedRenderedSemantics: "latest_heartbeat_ack"/);
  assert.match(source, /new Worker\(path\.join\(__dirname, "results", "ProjectResultCatalogWorker\.js"\)\)/);
});
