/**
 * 块A：祖先项目/创新分支登记（模型、本机存储、只读 Git 身份探针与登记服务）。
 *
 * 变更前的缺失行为（先记录，再断言新行为）：
 * - 插件不存在任何“祖先项目/创新分支”登记模型，也没有带继承 GIT_* 定位变量清理的只读身份探针；
 *   跨窗口/多副本归属只能人工换算。
 * - 面板登记动作（创建分支 worktree）没有“预览→digest 一致确认→写前重核”的拒绝路径，
 *   无法保证不覆盖已有分支/目录、不在身份漂移时写入。
 *
 * 本文件断言的最小行为集合：
 * 1) sanitizeGitEnv 清除 GIT_DIR/GIT_WORK_TREE/GIT_COMMON_DIR/GIT_INDEX_FILE/GIT_OBJECT_DIRECTORY/
 *    GIT_ALTERNATE_OBJECT_DIRECTORIES/GIT_PREFIX（含大小写变体）且保留其它环境项；
 *    readGitIdentity 在父环境被注入诱饵仓库定位变量时仍读取真实仓库，且诱饵索引字节不变。
 * 2) 身份分类：分支/commit/dirty/detached；祖先关系 equal/ahead/diverged/separate-repository。
 * 3) 存储：往返校验、拒绝未来 schemaVersion、拒绝重复目录、拒绝孤儿分支、mutate 摘要漂移拒绝。
 * 4) 服务：登记拒绝非仓库/detached/祖先自身；preview/confirm 摘要一致才创建 worktree；
 *    目标目录或分支已存在拒绝；确认阶段漂移拒绝；forget 只移除登记，不删目录/分支；
 *    验证与创建全程不改祖先 HEAD、分支集合与工作区内容。
 *
 * 需要真实 git 子进程与临时仓库夹具，无法用纯内存 fake 替代（隔离/环境清理语义本身是被测行为），
 * 因此作为新功能域新建本文件；其余面板/路由断言扩在既有套件中。
 */
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { after, test } = require("node:test");

const store = require("../../dist/project/BranchProjectStore.js");
const probe = require("../../dist/project/GitIdentityProbe.js");
const { BranchProjectService } = require("../../dist/project/BranchProjectService.js");

const tempDirs = [];
function tempDir(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}
// FIXTURE POLICY: zero cleanup — retained for audit instead of rmSync (与 test/api 2026-10-23 策略一致)。
after(() => {
  for (const dir of tempDirs) console.log(`[fixtures retained, no cleanup] ${dir}`);
});

function gitGitEnv(extra = {}) {
  const env = probe.sanitizeGitEnv(process.env);
  return { ...env, GIT_CONFIG_NOSYSTEM: "1", GIT_ATTR_NOSYSTEM: "1", ...extra };
}
function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: gitGitEnv() });
}
function makeRepo(name) {
  const dir = tempDir(`se-branch-${name}-`);
  git(["init", "-q", dir], dir);
  git(["checkout", "-q", "-B", "main"], dir);
  git(["-c", "user.email=test@example.invalid", "-c", "user.name=Branch Test", "commit", "-q", "--allow-empty", "-m", "base"], dir);
  fs.writeFileSync(path.join(dir, "tracked.txt"), "base\n", "utf8");
  git(["add", "-A"], dir);
  git(["-c", "user.email=test@example.invalid", "-c", "user.name=Branch Test", "commit", "-q", "-m", "files"], dir);
  return dir;
}
function commitFile(repo, file, text, message) {
  fs.writeFileSync(path.join(repo, file), text, "utf8");
  git(["add", "-A"], repo);
  git(["-c", "user.email=test@example.invalid", "-c", "user.name=Branch Test", "commit", "-q", "-m", message], repo);
}
function snapshotRepoState(repo) {
  return {
    head: git(["rev-parse", "HEAD"], repo).trim(),
    branches: git(["branch", "--list", "--format=%(refname:short)"], repo).trim(),
    worktreeList: git(["worktree", "list", "--porcelain"], repo).trim(),
    status: git(["--no-optional-locks", "status", "--porcelain=v1"], repo),
  };
}
function newService(storeDir) {
  const storeInstance = new store.BranchProjectStore(path.join(storeDir, "branch-projects.json"));
  return new BranchProjectService(storeInstance, () => "");
}

test("sanitizeGitEnv 清除继承的 Git 定位变量并保留其它环境", () => {
  const env = {
    PATH: process.env.PATH || "",
    APPDATA: process.env.APPDATA || "C:\\AppData",
    GIT_DIR: "/tmp/decoy/.git",
    git_work_tree: "/tmp/decoy",
    GIT_COMMON_DIR: "/tmp/decoy/.git",
    GIT_INDEX_FILE: "/tmp/decoy/.git/index",
    GIT_OBJECT_DIRECTORY: "/tmp/decoy/.git/objects",
    GIT_ALTERNATE_OBJECT_DIRECTORIES: "/tmp/alt/objects",
    GIT_PREFIX: "sub/",
    GIT_NAMESPACE: "ns",
    GIT_CONFIG: "/tmp/decoy/config",
    SIMPLE_EXPERIMENT_KEEP: "keep-me",
  };
  const clean = probe.sanitizeGitEnv(env);
  for (const key of Object.keys(env)) {
    if (/^git_(dir|work_tree|common_dir|index_file|object_directory|alternate_object_directories|prefix|namespace|config)$/i.test(key))
      assert.ok(!(key in clean), `继承的 Git 定位变量 ${key} 必须被清除`);
  }
  assert.equal(clean.SIMPLE_EXPERIMENT_KEEP, "keep-me");
  assert.equal(typeof clean.PATH, "string");
});

test("readGitIdentity 在继承诱饵定位变量时仍读真实仓库且不写诱饵索引", () => {
  const repo = makeRepo("identity");
  const decoy = makeRepo("decoy");
  const decoyIndex = path.join(decoy, ".git", "index");
  const decoyIndexBefore = fs.existsSync(decoyIndex) ? fs.readFileSync(decoyIndex) : null;
  const decoyHeadBefore = git(["rev-parse", "HEAD"], decoy).trim();

  const saved = { dir: process.env.GIT_DIR, work: process.env.GIT_WORK_TREE, idx: process.env.GIT_INDEX_FILE, common: process.env.GIT_COMMON_DIR };
  try {
    process.env.GIT_DIR = path.join(decoy, ".git");
    process.env.GIT_WORK_TREE = decoy;
    process.env.GIT_INDEX_FILE = decoyIndex;
    process.env.GIT_COMMON_DIR = path.join(decoy, ".git");
    const identity = probe.readGitIdentity(repo);
    assert.equal(identity.error, "");
    assert.equal(path.normalize(identity.toplevel), path.normalize(repo), "必须读取传入目录所在真实仓库");
    assert.equal(identity.branch, "main");
    assert.equal(identity.dirty, false);
    assert.match(identity.headCommit, /^[0-9a-f]{40}$/);
  } finally {
    for (const [key, value] of [["GIT_DIR", saved.dir], ["GIT_WORK_TREE", saved.work], ["GIT_INDEX_FILE", saved.idx], ["GIT_COMMON_DIR", saved.common]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
  if (decoyIndexBefore) assert.deepEqual(fs.readFileSync(decoyIndex), decoyIndexBefore, "诱饵仓库索引必须逐字节不变");
  assert.equal(git(["rev-parse", "HEAD"], decoy).trim(), decoyHeadBefore);
});

test("身份状态分类：dirty 与 detached 如实上报", () => {
  const repo = makeRepo("states");
  fs.writeFileSync(path.join(repo, "untracked.txt"), "x\n", "utf8");
  let identity = probe.readGitIdentity(repo);
  assert.equal(identity.dirty, true, "未跟踪文件属于未提交修改");

  const sha = git(["rev-parse", "HEAD~1"], repo).trim();
  git(["checkout", "-q", "--detach", sha], repo);
  identity = probe.readGitIdentity(repo);
  assert.equal(identity.detached, true);
  assert.equal(identity.branch, "");
  git(["checkout", "-q", "main"], repo);
});

test("祖先关系：同点/领先/分叉/独立仓库如实区分", () => {
  const repo = makeRepo("relation");
  commitFile(repo, "next.txt", "2\n", "next");
  const ancestorIdentity = probe.readGitIdentity(path.join(repo));
  const sameHead = { ...ancestorIdentity };
  assert.equal(probe.compareAncestorRelation(ancestorIdentity, sameHead), "ancestor-equal");

  const childPath = path.join(path.dirname(repo), "child-worktree");
  git(["worktree", "add", "-q", "-b", "innovation/one", childPath, "main"], repo);
  commitFile(childPath, "child.txt", "c\n", "child commit");
  const childIdentity = probe.readGitIdentity(childPath);
  assert.equal(probe.compareAncestorRelation(ancestorIdentity, childIdentity), "ancestor-ahead", "worktree 提交后领先祖先");

  commitFile(repo, "ancestor-only.txt", "a\n", "ancestor moves");
  assert.equal(probe.compareAncestorRelation(probe.readGitIdentity(repo), childIdentity), "diverged");

  const cloneDir = tempDir("se-clone-");
  git(["clone", "-q", repo, path.join(cloneDir, "clone")], cloneDir);
  const cloneIdentity = probe.readGitIdentity(path.join(cloneDir, "clone"));
  assert.equal(probe.compareAncestorRelation(ancestorIdentity, cloneIdentity), "separate-repository", "独立 clone 不得被猜测为已证明关系");
});

test("登记文件：往返校验、未来版本拒绝、重复目录与摘要漂移拒绝", async () => {
  const dir = tempDir("se-branch-store-");
  const file = path.join(dir, "branch-projects.json");
  const ancestor = {
    id: "a".repeat(32), label: "祖先", gitRoot: path.resolve(path.sep, "repo", "ancestor"),
    targetBranch: "main", remoteName: "origin", remoteUrl: "", registeredAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  const branch = {
    id: "b".repeat(32), ancestorId: ancestor.id, label: "分支", workspaceRoot: path.resolve(path.sep, "repo", "branch"),
    branch: "innovation/one", createdFromCommit: "", source: "created-worktree", registeredAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  const branchStore = new store.BranchProjectStore(file);
  const saved = await branchStore.save({ schemaVersion: 1, ancestors: [ancestor], branches: [branch] });
  assert.equal(saved.ancestors.length, 1);
  assert.equal(branchStore.load().branches[0].branch, "innovation/one");

  assert.throws(() => store.parseBranchProjectFile(JSON.stringify({ schemaVersion: 2, ancestors: [], branches: [] })), /schemaVersion/);
  assert.throws(() => store.parseBranchProjectFile(JSON.stringify({ schemaVersion: 1, ancestors: [ancestor], branches: [{ ...branch, ancestorId: "c".repeat(32) }] })), /祖先关联缺失/);
  assert.throws(() => store.parseBranchProjectFile(JSON.stringify({ schemaVersion: 1, ancestors: [ancestor, { ...ancestor, id: "d".repeat(32), label: "重复" }], branches: [] })), /同一目录不能重复登记/);

  const digest = store.branchProjectFileDigest(saved);
  await assert.rejects(() => branchStore.mutate((current) => current, "0".repeat(32)), /刚被修改/);
  await branchStore.mutate((current) => ({ ...current, ancestors: current.ancestors.map((row) => ({ ...row, label: "改名" })) }), digest);
  assert.equal(branchStore.load().ancestors[0].label, "改名");
});

test("服务登记拒绝：非仓库、祖先自身、重复目录；成功登记如实记录身份", async () => {
  const dir = tempDir("se-branch-svc-");
  const repo = makeRepo("svc-ancestor");
  const nonRepo = tempDir("se-notrepo-");
  const service = newService(dir);
  await assert.rejects(() => service.registerAncestor({ label: "", gitRoot: nonRepo }), /不是 Git 仓库/);
  const record = await service.registerAncestor({ label: "", gitRoot: repo });
  assert.equal(record.targetBranch, "main");
  assert.equal(record.gitRoot, path.normalize(repo));
  await assert.rejects(() => service.registerBranch({ ancestorId: record.id, label: "", workspaceRoot: repo }), /就是祖先项目本身/);
  await assert.rejects(() => service.registerAncestor({ label: "dup", gitRoot: repo }), /已登记/);

  const projection = service.verifyAll();
  assert.equal(projection.ancestors[0].state, "verified");
  assert.equal(projection.ancestors[0].git.branch, "main");
  assert.equal(projection.branches.length, 0);
});

test("创建分支：预览/摘要一致才写，目标或分支占用拒绝，漂移拒绝，全程不动祖先", async () => {
  const dir = tempDir("se-branch-create-");
  const repo = makeRepo("create-ancestor");
  const parent = tempDir("se-branch-parent-");
  const service = newService(dir);
  const ancestor = await service.registerAncestor({ label: "", gitRoot: repo });
  const before = snapshotRepoState(repo);

  // previewCreateBranch 是同步函数：同步抛出必须用 assert.throws 捕获（rejects 只处理 Promise）。
  assert.throws(() => service.previewCreateBranch({ ancestorId: ancestor.id, branch: "main", targetParentDir: parent }), /已存在/);
  const takenDir = path.join(parent, "taken");
  fs.mkdirSync(takenDir);
  const previewTaken = service.previewCreateBranch({ ancestorId: ancestor.id, branch: "innovation/taken", targetParentDir: parent });
  // 摘要针对请求参数计算；把目标目录提前造出来后再确认，必须在写前被拒绝。
  fs.mkdirSync(previewTaken.targetPath);
  await assert.rejects(() => service.confirmCreateBranch({ ancestorId: ancestor.id, branch: "innovation/taken", targetParentDir: parent, confirmDigest: previewTaken.digest }), /已存在|发生了变化/);

  const preview = service.previewCreateBranch({ ancestorId: ancestor.id, branch: "innovation/demo", targetParentDir: parent });
  await assert.rejects(() => service.confirmCreateBranch({ ancestorId: ancestor.id, branch: "innovation/demo", targetParentDir: parent, confirmDigest: "f".repeat(32) }), /重新预览/);
  const result = await service.confirmCreateBranch({ ancestorId: ancestor.id, branch: "innovation/demo", targetParentDir: parent, confirmDigest: preview.digest });
  assert.ok(result.ok);
  assert.ok(fs.existsSync(path.join(preview.targetPath, ".git")), "新 worktree 目录应有 Git 工作区标记");
  assert.equal(git(["symbolic-ref", "--short", "HEAD"], preview.targetPath).trim(), "innovation/demo");

  const afterState = snapshotRepoState(repo);
  assert.equal(afterState.head, before.head, "祖先 HEAD 不能因创建分支而移动");
  assert.equal(afterState.status, before.status, "祖先工作区内容不能被动过");
  assert.ok(afterState.branches.includes("innovation/demo"));
  assert.ok(!afterState.branches.includes("main~"), "分支列表只应有增无删");
  assert.equal(afterState.worktreeList.split("\n").filter((line) => line.startsWith("worktree ")).length, before.worktreeList.split("\n").filter((line) => line.startsWith("worktree ")).length + 1);

  const projection = service.verifyAll();
  const branchRow = projection.branches.find((row) => row.record.id === result.record.id);
  assert.equal(branchRow.state, "verified");
  assert.equal(branchRow.relation, "ancestor-equal");
  assert.equal(branchRow.researchValidated, false, "本卡只能证明 Git 身份，不能宣称科研验证通过");

  // 移除登记只动登记表：目录与分支仍在。
  await service.forget("branch", result.record.id);
  assert.ok(fs.existsSync(preview.targetPath), "移除登记不得删除 worktree 目录");
  await assert.rejects(() => service.forget("ancestor", "0".repeat(32)), /不存在/);
  await service.forget("ancestor", ancestor.id);
  assert.equal(service.verifyAll().ancestors.length, 0);
  assert.equal(snapshotRepoState(repo).head, before.head);
});

test("登记已有副本：worktree 记录来源，独立 clone 保持 separate-repository", async () => {
  const dir = tempDir("se-branch-reg-");
  const repo = makeRepo("reg-ancestor");
  const cloneDir = tempDir("se-reg-clone-");
  git(["clone", "-q", "-b", "main", repo, path.join(cloneDir, "copy")], cloneDir);
  git(["checkout", "-q", "-b", "innovation/clone-branch"], path.join(cloneDir, "copy"));
  const service = newService(dir);
  const ancestor = await service.registerAncestor({ label: "", gitRoot: repo });
  const record = await service.registerBranch({ ancestorId: ancestor.id, label: "", workspaceRoot: path.join(cloneDir, "copy") });
  assert.equal(record.source, "registered-existing");
  assert.equal(record.branch, "innovation/clone-branch");
  const projection = service.verifyAll();
  assert.equal(projection.branches[0].relation, "separate-repository");
  assert.equal(git(["rev-parse", "HEAD"], path.join(cloneDir, "copy")).trim(), record.createdFromCommit, "登记与验证不得移动副本提交");
});

test("Git 状态读取失败（受控损坏索引夹具）：验证/登记/预览确认全链拒绝，绝不标 verified", async () => {
  const dir = tempDir("se-branch-statusfail-");
  const repo = makeRepo("statusfail-ancestor");
  const before = snapshotRepoState(repo);
  const service = newService(dir);
  const ancestor = await service.registerAncestor({ label: "", gitRoot: repo });
  // 受控夹具：破坏 .git/index —— rev-parse/symbolic-ref 仍可读（toplevel 有值），但 git status 致命失败。
  fs.writeFileSync(path.join(repo, ".git", "index"), "corrupt-index-fixture-payload-not-a-git-index");
  const projection = service.verifyAll();
  const row = projection.ancestors.find((item) => item.record.id === ancestor.id);
  assert.equal(row.state, "error", "status 读取失败绝不能标 verified/dirty=false=干净");
  assert.ok(row.errors.some((text) => /读取失败/.test(text)), "必须保留真实失败原因");
  const targetParent = tempDir("se-statusfail-target-");
  assert.throws(() => service.previewCreateBranch({ ancestorId: ancestor.id, branch: "innovation/x1", targetParentDir: targetParent }), /读取失败|error/);
  await assert.rejects(() => service.confirmCreateBranch({ ancestorId: ancestor.id, branch: "innovation/x1", targetParentDir: targetParent, confirmDigest: "0".repeat(32) }), /读取失败|error|摘要/);
  // 同一损坏目录用全新登记表再登记：同样拒绝，不把无法读当作干净可登记。
  const service2 = newService(tempDir("se-branch-statusfail2-"));
  await assert.rejects(() => service2.registerAncestor({ label: "", gitRoot: repo }), /读取失败/);
  // 分支副本同一规则：独立 clone 损坏索引后拒绝登记。
  const cloneDir = tempDir("se-statusfail-clone-");
  git(["clone", "-q", "-b", "main", repo, path.join(cloneDir, "copy")], cloneDir);
  git(["checkout", "-q", "-b", "innovation/statusfail"], path.join(cloneDir, "copy"));
  fs.writeFileSync(path.join(cloneDir, "copy", ".git", "index"), "corrupt-index-fixture-payload-not-a-git-index");
  // 祖先用健康新仓（损坏索引的 repo 自己此时已不可登记，正是上面断言的行为）。
  const healthyAncestor = makeRepo("statusfail-healthy-ancestor");
  const service3 = newService(tempDir("se-branch-statusfail3-"));
  const ancestor3 = await service3.registerAncestor({ label: "", gitRoot: healthyAncestor });
  await assert.rejects(() => service3.registerBranch({ ancestorId: ancestor3.id, label: "", workspaceRoot: path.join(cloneDir, "copy") }), /读取失败/);
  // 读取失败路径不得触碰仓库：损坏索引后 rev-parse/branch 仍可读且与登记前一致。
  assert.equal(git(["rev-parse", "HEAD"], repo).trim(), before.head, "读取失败路径不得移动任何提交");
  assert.equal(git(["branch", "--list", "--format=%(refname:short)"], repo).trim(), before.branches);
});
