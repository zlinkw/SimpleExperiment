const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../../src/extension/legacy.ts"), "utf8");
const ast = ts.createSourceFile("legacy.ts", source, ts.ScriptTarget.Latest, true);
const provider = ast.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === "RealtimeTunnelPanelProvider");
const names = new Set(["resultCatalogKey", "invalidateResultCatalogCache", "hasResultCatalogForRoot", "cachedResultCatalog", "compactResultTablesFromCatalog", "inspectResultCatalogInputs", "scheduleResultCatalogRefresh", "finishQueuedResultCatalogRefresh", "startResultCatalogRefreshWorker"]);
const methods = provider.members.filter(node => node.name && names.has(node.name.getText(ast)));
const code = ts.transpileModule(`class Subject { ${methods.map(node => node.getText(ast)).join("\n")} }`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const sandbox = {
  path,
  workspaceRoot: () => "C:/workspace",
  DEFAULT_RESULT_CSV_DIR: "experiments/results", Date, console,
  fs: {}, ProjectResultPublication: { projectResultPublicationJournalPath: root => path.join(root, "journal.json") },
  pluginProjectAdapterRules: () => ({ planDatasetMapping: {} }),
  PanelStateProjection_1: { panelInterestedSections: () => new Set(["results"]) },
  errorMessage: value => value instanceof Error ? value.message : String(value),
};
require("vm").runInNewContext(`${code}; this.Subject = Subject;`, sandbox);

test("settled publication journals do not keep successful results perpetually loading", async () => {
  const subject = new sandbox.Subject();
  subject.resultCsvDirectory = "experiments/results";
  subject.resultCatalogDirtyGeneration = 0;
  subject.resultCatalogRefreshSequence = 0;
  subject.resultCatalogTtlMs = 5000;
  subject.resultCatalogStatus = "loading";
  let status = "committed";
  sandbox.fs.stat = async () => ({ dev: 1, ino: 2, size: 100, mtimeMs: 1, ctimeMs: 1 });
  sandbox.fs.readFile = async () => JSON.stringify({ schemaVersion: 1, status });
  for (const settled of ["committed", "rolled-back"]) {
    status = settled;
    assert.equal((await subject.inspectResultCatalogInputs("C:/workspace")).publicationPending, false);
  }
  for (const active of ["preparing", "publishing"]) {
    status = active;
    assert.equal((await subject.inspectResultCatalogInputs("C:/workspace")).publicationPending, true);
  }
  let starts = 0;
  subject.startResultCatalogRefreshWorker = () => { starts++; subject.resultCatalogStatus = "ready"; };
  subject.scheduleResultCatalogRefreshTimer = () => undefined;
  status = "publishing";
  subject.scheduleResultCatalogRefresh({ root: "C:/workspace", mappings: {}, key: subject.resultCatalogKey("C:/workspace", {}) });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(starts, 0, "an unfinished transaction must still gate the reader");
  status = "committed";
  subject.scheduleResultCatalogRefresh({ root: "C:/workspace", mappings: {}, key: subject.resultCatalogKey("C:/workspace", {}) });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(starts, 1, "committed results must reach the catalog reader without deleting the receipt");
  assert.equal(subject.resultCatalogStatus, "ready");
});

test("malformed or unreadable publication journals fail explicitly rather than claiming an empty catalog", async () => {
  const subject = new sandbox.Subject();
  sandbox.fs.stat = async () => ({ dev: 1, ino: 2, size: 100, mtimeMs: 1, ctimeMs: 1 });
  for (const text of ["invalid-json", JSON.stringify({ schemaVersion: 1, status: "unknown" })]) {
    sandbox.fs.readFile = async () => text;
    await assert.rejects(subject.inspectResultCatalogInputs("C:/workspace"));
  }
  sandbox.fs.readFile = async () => { throw Object.assign(new Error("unreadable receipt"), { code: "EACCES" }); };
  await assert.rejects(subject.inspectResultCatalogInputs("C:/workspace"), /unreadable receipt/);
  sandbox.fs.stat = async () => ({ dev: 1, ino: 2, size: 8 * 1024 * 1024 + 1, mtimeMs: 1, ctimeMs: 1 });
  await assert.rejects(subject.inspectResultCatalogInputs("C:/workspace"), /记录过大/);
  sandbox.fs.stat = async () => { throw Object.assign(new Error("absent"), { code: "ENOENT" }); };
  assert.equal((await subject.inspectResultCatalogInputs("C:/workspace")).publicationPending, false);
});

test("successful partial sync reaches ready catalog and publishes its tables through the real worker lifecycle", async () => {
  const catalog = { datasets: [{ name: "A", datasetKey: "a", tables: [{ tableKey: "a/final", kind: "final", path: "final.csv", rowCount: 17 }] }] };
  sandbox.fs.stat = async () => ({ dev: 1, ino: 2, size: 100, mtimeMs: 1, ctimeMs: 1 });
  sandbox.fs.readFile = async () => JSON.stringify({ schemaVersion: 1, status: "committed" });
  sandbox.__dirname = "C:/extension/dist";
  sandbox.Worker = class extends require("node:events").EventEmitter {
    postMessage(request) { queueMicrotask(() => this.emit("message", { id: request.id, catalog })); }
    async terminate() { this.emit("exit", 1); }
  };
  const subject = new sandbox.Subject();
  Object.assign(subject, { resultCsvDirectory: "experiments/results", resultCatalogDirtyGeneration: 1,
    resultCatalogRefreshSequence: 0, resultCatalogTtlMs: 5000, resultCatalogStatus: "loading", panelSectionInterest: {},
    resultSyncReport: { incorporated: 17, failed: 3 } });
  subject.scheduleResultCatalogRefreshTimer = () => undefined;
  const posted = [];
  subject.postState = () => posted.push({ status: subject.resultCatalogStatus, tables: subject.resultCatalogCache?.tables });
  subject.scheduleResultCatalogRefresh({ root: "C:/workspace", mappings: {}, key: subject.resultCatalogKey("C:/workspace", {}) });
  for (let turn = 0; turn < 5 && !posted.length; turn++) await new Promise(resolve => setImmediate(resolve));
  assert.equal(subject.resultCatalogStatus, "ready");
  assert.equal(subject.resultCatalogCache.catalog, catalog);
  assert.equal(posted[0].tables[0].rowCount, 17);
  assert.equal(subject.resultCatalogRefreshWorker, undefined);
  assert.equal(subject.resultCatalogRefreshError, "");
});

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
