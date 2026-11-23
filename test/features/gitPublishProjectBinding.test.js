const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../../src/extension/legacy.ts"), "utf8");
const extract = (start, end) => {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from);
  return source.slice(from, to);
};
const methods = extract("    async prepareLocalGitPublish(", "    async syncToGitHub(")
  + extract("    async primaryGitRepository()", "    async ensureSftpManagerCommand(");

function fixture() {
  let root = "/project", generation = 1;
  const calls = [], repositories = [];
  const git = { repositories };
  const vscode = { extensions: { getExtension: () => ({ isActive: true, exports: { getAPI: () => git } }) },
    commands: { executeCommand() { throw Error("unscoped command must not run"); } } };
  const sandbox = { vscode, workspaceRoot: () => root, samePath: (a, b) => a === b,
    gitRepositoryHasChanges: () => true, gitRepositoryHasRemote: () => true, timestampCommitMessage: () => "test", changedFileNamesFromRepo: () => [],
    assertNonEmptyCommitMessage() {}, calls };
  vm.createContext(sandbox);
  vm.runInContext(ts.transpileModule("class Host {\n" + methods + "\n}\nthis.Host=Host;", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, sandbox);
  const host = new sandbox.Host();
  host.captureProjectContext = () => ({ root, generation });
  host.projectContextIsCurrent = context => !!context && context.root === root && context.generation === generation;
  const repo = (repoRoot, afterAdd = () => {}) => ({ rootUri: { fsPath: repoRoot }, inputBox: {},
    state: { workingTreeChanges: [{ uri: { fsPath: repoRoot + "/tracked" } }], untrackedChanges: [{ uri: { fsPath: repoRoot + "/new" } }], remotes: [{ name: "origin" }] },
    async add(paths) { calls.push(["add", repoRoot, [...paths]]); afterAdd(); },
    async commit() { calls.push(["commit", repoRoot]); }, async push() { calls.push(["push", repoRoot]); } });
  return { host, repositories, repo, calls, switchProject(value) { root = value; generation++; } };
}

test("publishing rejects a different registered repository", async () => {
  const f = fixture();
  f.repositories.push(f.repo("/other"));
  await assert.rejects(f.host.prepareLocalGitPublish(), /项目根目录没有对应/);
  assert.deepEqual(f.calls, []);
});

test("publishing stages and pushes only the current repository", async () => {
  const f = fixture();
  f.repositories.push(f.repo("/other"), f.repo("/project"));
  const prepared = await f.host.prepareLocalGitPublish();
  await f.host.publishPreparedGitBranch(prepared);
  assert.deepEqual(f.calls, [["add", "/project", ["/project/tracked", "/project/new"]], ["commit", "/project"], ["push", "/project"]]);
});

test("a project switch during staging prevents commit and push", async () => {
  const f = fixture();
  f.repositories.push(f.repo("/project", () => f.switchProject("/other")));
  await assert.rejects(f.host.prepareLocalGitPublish(), /项目或 Git 仓库已变化/);
  assert.deepEqual(f.calls, [["add", "/project", ["/project/tracked", "/project/new"]]]);
});

test("a project switch after preparation prevents push", async () => {
  const f = fixture();
  f.repositories.push(f.repo("/project"));
  const prepared = await f.host.prepareLocalGitPublish();
  f.switchProject("/other");
  await assert.rejects(f.host.publishPreparedGitBranch(prepared), /未推送原项目/);
  assert.equal(f.calls.some(row => row[0] === "push"), false);
});

test("a switch during commit reports its possible completion and prevents push", async () => {
  const f = fixture();
  const repo = f.repo("/project");
  repo.commit = async () => { f.calls.push(["commit", "/project"]); f.switchProject("/other"); };
  f.repositories.push(repo);
  await assert.rejects(f.host.prepareLocalGitPublish(), /本地提交可能已完成，未继续推送/);
  assert.equal(f.calls.some(row => row[0] === "push"), false);
});

test("provenance is not written after the project changes during Git lookup", async () => {
  const method = extract("    async recordRunGitProvenance(", "    /** 块C：写进队列的溯源");
  const writes = [];
  let generation = 1;
  const sandbox = { path, crypto: require("node:crypto"), samePath: (a, b) => a === b,
    atomicWriteText: async (...args) => writes.push(args) };
  vm.createContext(sandbox);
  vm.runInContext(ts.transpileModule("class Host {\n" + method + "\n}\nthis.Host=Host;", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, sandbox);
  const host = new sandbox.Host();
  host.captureProjectContext = () => ({ root: "/project", generation });
  host.projectContextIsCurrent = context => context.generation === generation;
  host.collectRunGitProvenance = async () => { generation++; return { repositoryRoot: "/project", localCommit: "abc" }; };
  await assert.rejects(host.recordRunGitProvenance("plan"), /未写入运行版本记录/);
  assert.deepEqual(writes, []);
});
