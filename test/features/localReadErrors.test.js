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
  const host = { captureProjectContext: () => ({ root: "project" }), projectContextIsCurrent: () => true };
  for (const name of ["openLastCheckStaticReportFromUi", "copyLastCheckStaticReportFromUi"]) {
    const run = vm.runInNewContext(extract(name, true), globals);
    code = "EACCES"; await assert.rejects(run.call(host, { report: "check-static-test.md" }), /EACCES/);
    code = "ENOENT"; await assert.rejects(run.call(host, {}), /报告不存在/);
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

test("draft rejection reports a refresh failure after the write", async () => {
  let writes = 0;
  const globals = { workspaceRoot: () => "project", stringField: (row, key) => String(row?.[key] || ""), errorMessage: (e) => e.message,
    DraftPlans_1: { rejectDraft: async () => { writes += 1; } } };
  const run = vm.runInNewContext(extract("apiDraftReject", true), globals);
  const host = { draftPlanState: { error: "" }, requireDraftRecord: async () => ({ draftPlanPath: "tmp/plan/a.yaml" }),
    captureProjectContext: () => ({}), projectContextIsCurrent: () => true,
    withDraftMetadataLease: async (_root, fn) => fn(),
    refreshDraftPlans: async function () { this.draftPlanState.error = "EACCES"; } };
  await assert.rejects(run.call(host, { draftPlanPath: "tmp/plan/a.yaml" }), /拒绝已写入，但刷新失败：EACCES/);
  assert.equal(writes, 1);
  host.refreshDraftPlans = async () => { throw failure("EIO"); };
  await assert.rejects(run.call(host, { draftPlanPath: "tmp/plan/a.yaml" }), /拒绝已写入，但刷新失败：EIO/);
  assert.equal(writes, 2);
  host.refreshDraftPlans = async function () { this.draftPlanState.error = ""; };
  assert.equal((await run.call(host, { draftPlanPath: "tmp/plan/a.yaml" })).status, "rejected");
  assert.equal(writes, 3);
});

test("draft review and rejection UI surface the same partial-write errors as the API", async () => {
  const globals = { stringField: (row, key) => String(row?.[key] || "") };
  for (const [method, api] of [["rejectDraftFromUi", "apiDraftReject"], ["reviewDraftFromUi", "apiDraftReview"]]) {
    const run = vm.runInNewContext(extract(method, true), globals);
    let seen;
    const host = { [api]: async (args) => { seen = args.draftPlanPath; throw new Error("已写入，但刷新失败"); } };
    await assert.rejects(run.call(host, { planFile: "tmp/plan/a.yaml" }), /已写入，但刷新失败/);
    assert.equal(seen, "tmp/plan/a.yaml");
  }
});

test("draft review identifies a refresh exception after its write", async () => {
  let writes = 0;
  const globals = { workspaceRoot: () => "project", stringField: (row, key) => String(row?.[key] || ""), errorMessage: (e) => e.message,
    DraftPlans_1: { markDraftReviewed: async () => { writes += 1; } } };
  const run = vm.runInNewContext(extract("apiDraftReview", true), globals);
  const host = { requireDraftRecord: async () => ({ draftPlanPath: "tmp/plan/a.yaml" }),
    captureProjectContext: () => ({}), projectContextIsCurrent: () => true,
    withDraftMetadataLease: async (_root, fn) => fn(), refreshDraftPlans: async () => { throw failure("EIO"); } };
  await assert.rejects(run.call(host, { draftPlanPath: "tmp/plan/a.yaml" }), /审核已写入，但刷新失败：EIO/);
  assert.equal(writes, 1);
});
