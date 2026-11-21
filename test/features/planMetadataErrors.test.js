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
  function visit(node) {
    if ((method ? ts.isMethodDeclaration(node) : ts.isFunctionDeclaration(node)) && node.name?.getText(tree) === name) found = node;
    ts.forEachChild(node, visit);
  }
  visit(tree); assert.ok(found, name);
  const body = found.getText(tree);
  return ts.transpileModule(method ? `({${body}}).${name}` : `${body}\n${name}`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
}
const failure = code => Object.assign(new Error(code), { code });
test("optional missing PLAN directories are empty, but permissions and child errors are visible", async () => {
  let readdir = async () => { throw failure("ENOENT"); };
  const walk = vm.runInNewContext(extract("walkYaml"), { path, fs: { readdir: (...args) => readdir(...args) },
    defaultYamlScanBudget: { maxFiles: 500, maxDirs: 800, maxDepth: 8 }, isHeavyProjectDir: () => false });
  assert.equal((await walk("project/plans")).length, 0);
  readdir = async () => { throw failure("EACCES"); };
  await assert.rejects(walk("project/plans"), /EACCES/);
  readdir = async dir => { if (dir.endsWith("plans")) return [{ name: "child", isDirectory: () => true }]; throw failure("EACCES"); };
  await assert.rejects(walk("project/plans"), /EACCES/);
});
test("PLAN scan budgets expose incomplete files, depth and directory limits", async () => {
  const file = name => ({ name, isDirectory: () => false, isFile: () => true });
  const dir = name => ({ name, isDirectory: () => true, isFile: () => false });
  let entries = [file("a.yaml"), file("b.yaml")];
  const walk = vm.runInNewContext(extract("walkYaml"), { path, fs: { readdir: async () => entries },
    defaultYamlScanBudget: { maxFiles: 2, maxDirs: 1, maxDepth: 1 }, isHeavyProjectDir: () => false });
  assert.equal((await walk("project/plans", { requireComplete: true })).length, 2);
  entries = [file("a.yaml"), file("b.yaml"), file("c.yaml")];
  await assert.rejects(walk("project/plans", { requireComplete: true }), /文件数量上限.*列表不完整/);
  entries = [dir("child")];
  await assert.rejects(walk("project/plans", { requireComplete: true }), /目录数量上限.*列表不完整/);
  await assert.rejects(walk("project/plans", { requireComplete: true, maxDirs: 3 }), /目录深度上限.*列表不完整/);
});
test("unreadable PLAN is not parsed as an empty file", async () => {
  const read = vm.runInNewContext(extract("readUtf8Preview"), { fs: { open: async () => { throw failure("EACCES"); } }, Buffer,
    localTextReadBudgetBytes: 1024 });
  await assert.rejects(read("plan.yaml"), /EACCES/);
});
test("selected PLAN metadata distinguishes missing files from failed stat", async () => {
  let code = "ENOENT";
  const read = vm.runInNewContext(extract("readLocalPlanSummary"), { path, safeWorkspacePlanPath: (_r, file) => file,
    fs: { stat: async () => { throw failure(code); } } });
  assert.equal(await read("project", "plans", "plan.yaml"), undefined);
  code = "EACCES";
  await assert.rejects(read("project", "plans", "plan.yaml"), /EACCES/);
});
test("PLAN filtering exposes a cached read error and retains normal filtering", async () => {
  const filter = vm.runInNewContext(extract("apiPlansFilter", true), { ApiWorkflow_1: { filterPlans: plans => ({ plans, count: plans.length, total: plans.length, needsChoice: false }) } });
  const host = { localPlanMetadata: { plans: [{ planFile: "p.yaml" }], archivedPlans: [], error: "read failed" } };
  const failed = await filter.call(host);
  assert.equal(failed.ok, false); assert.equal(failed.error, "read failed"); assert.equal(failed.count, 1);
  delete host.localPlanMetadata.error;
  const normal = await filter.call(host);
  assert.equal(normal.ok, true); assert.equal(normal.count, 1);
});
test("a failed refresh records the error and cannot mark the cached PLAN list complete", async () => {
  const refresh = vm.runInNewContext(extract("refreshLocalPlanMetadata", true), {
    workspaceRoot: () => "project", planDirSafe: () => "plans", errorMessage: error => error.message,
    readLocalPlans: async () => { throw failure("EACCES"); }, readArchivedLocalPlans: async () => [],
    detectLocalProject: async () => ({}),
  });
  const host = { projectContextGeneration: 1, localPlanMetadata: { plans: [{ planFile: "old.yaml" }] },
    localPlanMetadataFullRefresh: true, postState() {} };
  await assert.rejects(refresh.call(host, { force: true, post: false }), /EACCES/);
  assert.equal(host.localPlanMetadata.error, "EACCES");
  assert.equal(host.localPlanMetadataFullRefresh, false);
});
