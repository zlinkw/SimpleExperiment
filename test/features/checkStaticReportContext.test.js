const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../../src/extension/legacy.ts"), "utf8");
const tree = ts.createSourceFile("legacy.ts", source, ts.ScriptTarget.ES2022, true);
const names = new Set(["captureProjectContext", "projectContextIsCurrent", "openWorkspaceFileForProjectContext",
  "openLastCheckStaticReportFromUi", "copyLastCheckStaticReportFromUi"]);
const methods = new Map();
function visit(node) {
  if (ts.isMethodDeclaration(node) && names.has(node.name?.getText(tree))) methods.set(node.name.getText(tree), node.getText(tree));
  ts.forEachChild(node, visit);
}
visit(tree);
for (const name of names) assert.ok(methods.has(name), name);
const code = ts.transpileModule(`class Host { ${[...methods.values()].join("\n")} }; this.Host = Host;`,
  { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

function fixture() {
  let root = "/project-a";
  const calls = [], hooks = {};
  const stat = async () => hooks.stat ? hooks.stat() : { isFile: () => true, isDirectory: () => false };
  const sandbox = {
    workspaceRoot: () => root,
    safeWorkspaceChildPath: (project, rel) => `${project}/${rel}`,
    workspaceEditorUriForFile: rel => `${root}/${rel}`,
    CHECK_STATIC_REPORT_REL_PATH: "simple_cluster/check_reports/check-static-latest.md",
    CHECK_STATIC_REPORT_DIR_REL: "simple_cluster/check_reports",
    UiCommandCancelled: Error,
    fs: { stat, readFile: async (file, encoding) => { calls.push(["read", file, encoding]); return hooks.read ? hooks.read() : "报告内容"; } },
    vscode: {
      workspace: { openTextDocument: async uri => { calls.push(["open", uri]); return hooks.open ? hooks.open() : { uri }; } },
      window: { showTextDocument: async doc => calls.push(["show", doc.uri]), showInformationMessage: message => calls.push(["notice", message]) },
      env: { clipboard: { writeText: async text => { calls.push(["copy", text]); if (hooks.copy) await hooks.copy(); } } },
      ViewColumn: { Active: 1 },
    },
  };
  vm.runInNewContext(code, sandbox);
  const host = new sandbox.Host();
  host.projectContextGeneration = 1;
  host.projectContextAbortController = new AbortController();
  return { host, calls, hooks, switchProject() { root = "/project-b"; host.projectContextGeneration++; } };
}

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

test("report opening and copying retain the original project on success", async () => {
  const f = fixture();
  await f.host.openLastCheckStaticReportFromUi({ report: "check-static-example.md" });
  assert.deepEqual(f.calls.slice(0, 2), [["open", "/project-a/simple_cluster/check_reports/check-static-example.md"],
    ["show", "/project-a/simple_cluster/check_reports/check-static-example.md"]]);
  await f.host.copyLastCheckStaticReportFromUi();
  assert.deepEqual(f.calls.find(call => call[0] === "read"), ["read", "/project-a/simple_cluster/check_reports/check-static-latest.md", "utf8"]);
  assert.deepEqual(f.calls.find(call => call[0] === "copy"), ["copy", "报告内容"]);
});

test("switching project while checking a report prevents opening or reading it", async () => {
  for (const method of ["openLastCheckStaticReportFromUi", "copyLastCheckStaticReportFromUi"]) {
    const f = fixture(), gate = deferred();
    f.hooks.stat = () => gate.promise;
    const pending = f.host[method]({});
    f.switchProject(); gate.resolve({ isFile: () => true, isDirectory: () => false });
    await assert.rejects(pending, /项目已切换/);
    assert.equal(f.calls.length, 0);
  }
});

test("switching project during editor opening prevents displaying the old report", async () => {
  const f = fixture(), gate = deferred(), entered = deferred();
  f.hooks.open = () => { entered.resolve(); return gate.promise; };
  const pending = f.host.openLastCheckStaticReportFromUi({});
  await entered.promise; f.switchProject(); gate.resolve({ uri: "old-document" });
  await assert.rejects(pending, /项目已切换/);
  assert.equal(f.calls.filter(call => call[0] === "show").length, 0);
});

test("switching project during report reading prevents clipboard publication", async () => {
  const f = fixture(), gate = deferred(), entered = deferred();
  f.hooks.read = () => { entered.resolve(); return gate.promise; };
  const pending = f.host.copyLastCheckStaticReportFromUi();
  await entered.promise; f.switchProject(); gate.resolve("旧报告");
  await assert.rejects(pending, /项目已切换/);
  assert.equal(f.calls.filter(call => call[0] === "copy").length, 0);
});

test("a copy already started is not reported as belonging to the new project", async () => {
  const f = fixture(), gate = deferred(), entered = deferred();
  f.hooks.copy = () => { entered.resolve(); return gate.promise; };
  const pending = f.host.copyLastCheckStaticReportFromUi();
  await entered.promise; f.switchProject(); gate.resolve(); await pending;
  assert.deepEqual(f.calls.filter(call => call[0] === "copy"), [["copy", "报告内容"]]);
  assert.equal(f.calls.filter(call => call[0] === "notice").length, 0);
});
