const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../../src/extension/legacy.ts"), "utf8");
const tree = ts.createSourceFile("legacy.ts", source, ts.ScriptTarget.ES2022, true);
function method(name, globals) {
  let found;
  function visit(node) { if (ts.isMethodDeclaration(node) && node.name?.getText(tree) === name) found = node; ts.forEachChild(node, visit); }
  visit(tree); assert.ok(found);
  const code = ts.transpileModule(`({${found.getText(tree)}}).${name}`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return vm.runInNewContext(code, globals);
}
class Cancelled extends Error {}

test("cancelling the result directory picker does not save configuration", async () => {
  let writes = 0;
  const choose = method("chooseResultCsvDirFromUi", { path, UiCommandCancelled: Cancelled,
    fs: { stat: async () => ({ isDirectory: () => true }) }, vscode: { Uri: { file: value => value },
      workspace: { workspaceFolders: [{ uri: { fsPath: "project" } }], getConfiguration: () => ({ update: async () => { writes++; } }) },
      window: { showOpenDialog: async () => undefined } } });
  const host = { resultCsvDirectory: "results", captureProjectContext: () => ({}), projectContextIsCurrent: () => true };
  await assert.rejects(choose.call(host), Cancelled);
  assert.equal(writes, 0);
});

test("cancelling history clearing does not write local state", async () => {
  let writes = 0;
  const clear = method("clearOperationHistoryFromUi", { workspaceRoot: () => "project", UiCommandCancelled: Cancelled,
    stringArrayField: () => [], stringField: () => "", usableSelectionKey: value => value, uniqueStrings: values => values.filter(Boolean),
    vscode: { window: { showWarningMessage: async () => "取消" } } });
  const host = { context: { workspaceState: { update: async () => { writes++; } } } };
  await assert.rejects(clear.call(host, {}), Cancelled);
  assert.equal(writes, 0);
});

test("cancelling selected history clearing does not write local state", async () => {
  let writes = 0;
  const clear = method("clearOperationHistoryFromUi", { workspaceRoot: () => "project", UiCommandCancelled: Cancelled,
    stringArrayField: message => message.operationIds, stringField: () => "", uniqueStrings: values => values.filter(Boolean),
    operationHistoryHideableStatus: status => status === "completed", RunOperations_1: { isOutcomePendingHistoryRecord: () => false },
    vscode: { window: { showWarningMessage: async () => "取消" } } });
  const host = { context: { workspaceState: { update: async () => { writes++; } } },
    buildPlanRuntimeEvidenceState: () => ({ operations: { one: { status: "completed" } } }) };
  await assert.rejects(clear.call(host, { operationIds: ["one"] }), Cancelled);
  assert.equal(writes, 0);
});

test("missing offline audit is reported as a failed action", async () => {
  const errors = [];
  const open = method("openAuditTail", { errorMessage: error => error.message, actionErrorSuggestion: () => "retry" });
  const host = { captureProjectContext: () => ({}), projectContextIsCurrent: () => true, client: {},
    effectiveConnectionMode: () => "offline_import", offlineBundle: {}, recordActionError: item => errors.push(item), postState() {} };
  await assert.rejects(open.call(host), /audit_tail/);
  assert.match(errors[0].message, /audit_tail/);
});
