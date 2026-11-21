const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../../src/extension/legacy.ts"), "utf8");
const tree = ts.createSourceFile("legacy.ts", source, ts.ScriptTarget.ES2022, true);
function extract(name, method = false) {
  let found;
  function visit(node) { if ((method ? ts.isMethodDeclaration(node) : ts.isFunctionDeclaration(node)) && node.name?.getText(tree) === name) found = node; ts.forEachChild(node, visit); }
  visit(tree); assert.ok(found);
  const body = found.getText(tree);
  return ts.transpileModule(method ? `({${body}}).${name}` : `${body}\n${name}`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
}
const failure = code => Object.assign(new Error(code), { code });

test("template preview reports read errors and treats only missing files as new", async () => {
  let code = "EACCES";
  const preview = vm.runInNewContext(extract("previewAndConfirmWorkspaceWrites"), { path,
    fs: { readFile: async () => { throw failure(code); } }, workspaceWriteStatusText: status => status,
    vscode: { workspace: { openTextDocument: async x => x }, window: { showTextDocument: async () => {}, showWarningMessage: async () => "写入模板" }, ViewColumn: { Beside: 1 } } });
  const root = path.resolve("project"), writes = [{ fullPath: path.join(root, "adapter.txt"), text: "new" }];
  await assert.rejects(preview(root, writes, "template"), /EACCES/);
  code = "ENOENT";
  assert.equal((await preview(root, writes, "template"))[0].status, "created");
});

test("report opening and copying keep permission errors distinct from missing files", async () => {
  let code = "EACCES";
  const globals = { workspaceRoot: () => "project", safeWorkspaceChildPath: (_root, file) => file,
    CHECK_STATIC_REPORT_REL_PATH: "simple_cluster/check_reports/check-static-latest.md", CHECK_STATIC_REPORT_DIR_REL: "simple_cluster/check_reports",
    fs: { stat: async () => { throw failure(code); } } };
  for (const name of ["openLastCheckStaticReportFromUi", "copyLastCheckStaticReportFromUi"]) {
    const run = vm.runInNewContext(extract(name, true), globals);
    code = "EACCES"; await assert.rejects(run.call({}, { report: "check-static-test.md" }), /EACCES/);
    code = "ENOENT"; await assert.rejects(run.call({}, {}), /报告不存在/);
  }
});

test("draft directory permission errors are not reported as an absent directory", async () => {
  let code = "EACCES";
  const run = vm.runInNewContext(extract("refreshDraftPlans", true), { workspaceRoot: () => "project", path,
    fs: { stat: async () => { throw failure(code); } } });
  const host = { draftPlanState: { drafts: [{ path: "old" }] } };
  await assert.rejects(run.call(host), /EACCES/);
  assert.equal(host.draftPlanState.drafts.length, 1);
  code = "ENOENT"; await run.call(host);
  assert.equal(host.draftPlanState.enabled, false);
  assert.equal(host.draftPlanState.drafts.length, 0);
});
