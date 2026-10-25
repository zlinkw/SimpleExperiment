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
 * 5) 块C3 HEAD↔已验 manifest 绑定：真实提交树 blob 字节逐文件核对；Git 忽略/未跟踪的磁盘依赖
 *    ＝无法证明此 HEAD（绝不 stage/commit）；size/SHA/类型/路径/摘要/revision 规则；
 *    dirty→clean 同 blob 复用；假执行器覆盖 cat-file 缺帧/非 blob/截断等如实失败类别。
 * 6) 块C4/C5 PR 适配：origin 规范化剥凭证、漂移/基线缺失/PR 未知一律不写；
 *    普通快推 argv、未知收据不重放、身份复用、merge 必须重查 MERGED、祖先 ff-only 真实仓验证。
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

// —— 块C3：HEAD↔已验 manifest 精确绑定（真实提交树 blob 字节比较；执行器另以假帧覆盖失败类别）——
const binding = require("../../dist/project/BranchHeadBinding.js");
const scopeHost = require("../../dist/extension/PlanCodeScopeHost.js");
const crypto = require("node:crypto");

function manifestFor(repo, files, overrides = {}) {
  const manifest = {};
  for (const rel of files) {
    const bytes = overrides[rel] !== undefined ? (Buffer.isBuffer(overrides[rel]) ? overrides[rel] : Buffer.from(overrides[rel], "utf8"))
      : fs.readFileSync(path.join(repo, ...rel.split("/")));
    manifest[rel] = { size: bytes.length, sha256: crypto.createHash("sha256").update(bytes).digest("hex") };
  }
  return { digest: scopeHost.planExecutionSourceDigest(manifest), manifest };
}

test("C3 当前提交树逐文件 blob 字节核对：忽略/未跟踪依赖=无法证明此 HEAD；改动/删除如实分类；dirty→clean 可复用", async () => {
  const repo = makeRepo("bind");
  fs.mkdirSync(path.join(repo, "pkg"), { recursive: true });
  fs.mkdirSync(path.join(repo, "experiments"), { recursive: true });
  fs.writeFileSync(path.join(repo, "experiments", "a.yaml"), "jobs: 1\n", "utf8");
  fs.writeFileSync(path.join(repo, "pkg", "model.py"), "w = 1\n", "utf8");
  commitFile(repo, "pkg/model.py", "w = 1\n", "add plan and model"); // git add -A 一并提交 experiments/a.yaml
  fs.writeFileSync(path.join(repo, ".gitignore"), "vendor/\n", "utf8");
  commitFile(repo, ".gitignore", "vendor/\n", "ignore vendor");
  fs.mkdirSync(path.join(repo, "vendor"), { recursive: true });
  fs.writeFileSync(path.join(repo, "vendor", "dep.bin"), Buffer.from([0, 1, 2, 253, 254, 255]));
  const head = git(["rev-parse", "HEAD"], repo).trim();
  const planFile = "experiments/a.yaml";
  const revisionOf = source => source.manifest[planFile]?.sha256;
  // ① 提交内文件逐一一致 → ok（含 .gitignore 也是提交树内普通文件）
  const good = manifestFor(repo, [planFile, "pkg/model.py", "tracked.txt"]);
  let result = await binding.bindPlanSourceToCommit({ runner: binding.runGitBinary, cwd: repo, headCommit: head,
    executionSource: good, planFile, revision: revisionOf(good) });
  assert.equal(result.ok, true, JSON.stringify(result.failures));
  assert.equal(result.coveredFiles, 3);
  assert.match(result.note, /不构成整仓或科研结论等价/, "覆盖范围必须如实声明");
  // ② manifest 含被忽略的磁盘依赖：不在提交树 → 无法证明；不产生任何写入
  const stateBefore = snapshotRepoState(repo);
  const withIgnored = manifestFor(repo, [planFile, "pkg/model.py", "vendor/dep.bin"]);
  result = await binding.bindPlanSourceToCommit({ runner: binding.runGitBinary, cwd: repo, headCommit: head,
    executionSource: withIgnored, planFile, revision: revisionOf(withIgnored) });
  assert.equal(result.ok, false);
  assert.match(result.reason, /无法证明此 HEAD/);
  assert.equal(result.failures.length, 1);
  assert.equal(result.failures[0].path, "vendor/dep.bin");
  assert.match(result.failures[0].reason, /不在当前提交树中/);
  assert.deepEqual(snapshotRepoState(repo), stateBefore, "绑定核对纯只读：不 stage、不 commit、不动工作树");
  // ③ 已验 manifest 的字节与提交 blob 不一致（验证后又改了代码）→ 内容 SHA 不一致
  fs.writeFileSync(path.join(repo, "pkg", "model.py"), "w = 2\n", "utf8");
  result = await binding.bindPlanSourceToCommit({ runner: binding.runGitBinary, cwd: repo, headCommit: head,
    executionSource: good, planFile, revision: revisionOf(good) });
  assert.equal(result.ok, true, "工作树改动不影响“提交树=已验清单”的证明（dirty 注记由调用方按身份探针补）");
  const staleManifest = manifestFor(repo, [planFile, "pkg/model.py"], { "pkg/model.py": "w = 3\n" });
  result = await binding.bindPlanSourceToCommit({ runner: binding.runGitBinary, cwd: repo, headCommit: head,
    executionSource: staleManifest, planFile, revision: revisionOf(staleManifest) });
  assert.equal(result.ok, false);
  assert.equal(result.failures[0].reason, "内容 SHA 与已验清单不一致");
  // ④ 提交里删除 manifest 内文件 → 不在当前提交树
  git(["rm", "-q", "-f", "pkg/model.py"], repo); // 工作树仍是 ③ 的未提交改动，必须 -f 才能移除
  git(["-c", "user.email=test@example.invalid", "-c", "user.name=Branch Test", "commit", "-q", "-m", "drop model"], repo);
  const head2 = git(["rev-parse", "HEAD"], repo).trim();
  result = await binding.bindPlanSourceToCommit({ runner: binding.runGitBinary, cwd: repo, headCommit: head2,
    executionSource: good, planFile, revision: revisionOf(good) });
  assert.equal(result.ok, false);
  assert.equal(result.failures[0].path, "pkg/model.py");
  assert.match(result.failures[0].reason, /不在当前提交树中/);
  // ⑤ dirty→clean：把新内容提交后，用“新字节”的 manifest 在新 HEAD 上仍成立（同 blob＝可复用，不重跑科研）
  commitFile(repo, "pkg/model.py", "w = 2\n", "restore model new content");
  const head3 = git(["rev-parse", "HEAD"], repo).trim();
  const renewed = manifestFor(repo, [planFile, "pkg/model.py", "tracked.txt"]);
  result = await binding.bindPlanSourceToCommit({ runner: binding.runGitBinary, cwd: repo, headCommit: head3,
    executionSource: renewed, planFile, revision: revisionOf(renewed) });
  assert.equal(result.ok, true, JSON.stringify(result.failures));
  // ⑥ 不存在的提交/篡改摘要/revision 漂移/非法路径：全部失败关闭
  result = await binding.bindPlanSourceToCommit({ runner: binding.runGitBinary, cwd: repo, headCommit: head3 + "00000000",
    executionSource: renewed, planFile, revision: revisionOf(renewed) });
  assert.equal(result.ok, false);
  assert.match(result.failures[0].reason, /不存在或不可读/);
  result = await binding.bindPlanSourceToCommit({ runner: binding.runGitBinary, cwd: repo, headCommit: head3,
    executionSource: { ...renewed, digest: "0".repeat(64) }, planFile, revision: revisionOf(renewed) });
  assert.equal(result.ok, false);
  assert.match(result.reason, /摘要自校验失败/);
  result = await binding.bindPlanSourceToCommit({ runner: binding.runGitBinary, cwd: repo, headCommit: head3,
    executionSource: renewed, planFile, revision: "f".repeat(64) });
  assert.equal(result.ok, false);
  assert.match(result.reason, /revision 不一致/);
  const badPath = manifestFor(repo, [planFile]);
  badPath.manifest["../escape.py"] = { size: 1, sha256: "0".repeat(64) };
  badPath.digest = scopeHost.planExecutionSourceDigest(badPath.manifest);
  result = await binding.bindPlanSourceToCommit({ runner: binding.runGitBinary, cwd: repo, headCommit: head3,
    executionSource: badPath, planFile, revision: revisionOf(badPath) });
  assert.equal(result.ok, false);
  assert.match(result.failures[0].reason, /相对路径规则/);
});

test("C3 假执行器：ls-tree 符号链接/缺路径与 cat-file 帧缺失/非 blob 均如实归类，绝不打印 blob 内容", async () => {
  const sha = text => crypto.createHash("sha256").update(text).digest("hex");
  const manifest = { "a.py": { size: 2, sha256: sha("x\n") },
    "link.py": { size: 1, sha256: sha("l") },
    "gone.py": { size: 1, sha256: sha("g") },
    "sub/dir.py": { size: 1, sha256: sha("s") },
    "treeish.py": { size: 1, sha256: sha("t") } };
  const okOid = "1111111111111111111111111111111111111111";
  const linkOid = "2222222222222222222222222222222222222222";
  const goneOid = "3333333333333333333333333333333333333333";
  const treeOid = "4444444444444444444444444444444444444444";
  const listing = ["100644 blob " + okOid + "\ta.py", "120000 blob " + linkOid + "\tlink.py",
    "100644 blob " + goneOid + "\tgone.py", "160000 commit " + treeOid + "\tsub",
    "100644 blob " + treeOid + "\ttreeish.py"].join("\0") + "\0";
  // cat-file --batch 帧按请求顺序返回（请求顺序＝manifest 键序过滤后的 a, gone, treeish）
  const batch = Buffer.concat([
    Buffer.from(okOid + " blob 2\n"), Buffer.from("x\n"), Buffer.from("\n"),
    Buffer.from(goneOid + " missing\n"),
    Buffer.from(treeOid + " tree 0\n\n"),
  ]);
  const requested = [];
  const runner = async (args, _cwd, stdin) => {
    if (args[0] === "rev-parse") return { code: 0, stdout: Buffer.from("tree\n"), stderr: "" };
    if (args[0] === "ls-tree") return { code: 0, stdout: Buffer.from(listing, "utf8"), stderr: "" };
    if (args[0] === "cat-file") { requested.push(String(stdin)); return { code: 0, stdout: batch, stderr: "" }; }
    throw new Error("unexpected " + args.join(" "));
  };
  const result = await binding.verifyCommitTreeAgainstManifest({ runner, cwd: "/fixture", commit: "c".repeat(40), manifest });
  assert.equal(result.ok, false);
  assert.equal(result.coveredFiles, 1, "唯一逐字节一致的文件");
  assert.equal(requested.length, 1, "≤300 个对象单批读取");
  const byPath = new Map(result.failures.map(row => [row.path, row.reason]));
  assert.match(byPath.get("link.py"), /符号链接/);
  assert.match(byPath.get("gone.py"), /对象库中缺失/);
  assert.match(byPath.get("treeish.py"), /不是 blob/);
  assert.match(byPath.get("sub/dir.py"), /不在当前提交树中/);
  const serialized = JSON.stringify(result);
  assert.ok(!serialized.includes(JSON.stringify("x\n")), "失败信息不得携带 blob 内容");
  // 截断帧：声明大小但字节不足 → 全部剩余帧按未知处理，不得判为一致
  const truncRunner = async (args) => {
    if (args[0] === "rev-parse") return { code: 0, stdout: Buffer.from("t\n"), stderr: "" };
    if (args[0] === "ls-tree") return { code: 0, stdout: Buffer.from("100644 blob " + okOid + "\ta.py\0", "utf8"), stderr: "" };
    return { code: 0, stdout: Buffer.from(okOid + " blob 9\nx\n"), stderr: "" };
  };
  const truncated = await binding.verifyCommitTreeAgainstManifest({ runner: truncRunner, cwd: "/fixture", commit: "c".repeat(40), manifest: { "a.py": manifest["a.py"] } });
  assert.equal(truncated.ok, false);
  assert.match(truncated.failures[0].reason, /帧解析失败/);
});

// —— 块C4/C5：科研仓 PR 适配（git/gh 注入执行器；祖先快进用真实临时仓）——
const pr = require("../../dist/project/BranchPullRequest.js");

function buf(text) { return Buffer.from(String(text), "utf8"); }
function jsonBuf(value) { return buf(JSON.stringify(value)); }
function recordingGit(script) {
  const calls = [];
  const runner = async (args, cwd, stdin) => {
    calls.push({ args: args.join(" "), cwd, stdin });
    for (const row of script) {
      if (!row.match.test(args.join(" "))) continue;
      if (row.uses !== undefined) { row.used = (row.used || 0) + 1; if (row.used > row.uses) continue; }
      if (row.throw) throw new Error(row.throw);
      return { code: row.code ?? 0, stdout: buf(row.stdout ?? ""), stderr: row.stderr ?? "" };
    }
    throw new Error("unexpected git args: " + args.join(" "));
  };
  return { runner, calls };
}
function memoryLedger(initial = []) {
  let rows = [...initial];
  return { load: async () => rows.map(row => ({ ...row })), save: async next => { rows = next; }, rows: () => rows };
}
const FULL_SHA = "a".repeat(40);
const BASE_SHA = "b".repeat(40);
const PR_SCRIPT_COMMON = [
  { match: /^remote get-url/, stdout: "https://github.com/org/repo.git\n" },
  { match: /^ls-remote --heads origin main$/, stdout: BASE_SHA + "\trefs/heads/main\n" },
  { match: /^ls-remote --heads origin exp\//, stdout: "" },
  { match: /^rev-list/, code: 128, stderr: "unknown revision" },
];
const PR_OPTS = { cwd: "/repo", remoteName: "origin", registeredRemoteUrl: "https://x:y@example.com/org/repo.git", branch: "exp/m1", base: "main", sourceSha: FULL_SHA };

test("C4 normalizeGithubTarget：https/ssh/多段组规范化并剥离凭证；异常输入拒绝", () => {
  assert.deepEqual(pr.normalizeGithubTarget("https://github.com/org/repo.git"), { host: "github.com", owner: "org", repo: "repo", repoSlug: "org/repo", displayUrl: "https://github.com/org/repo" });
  assert.equal(pr.normalizeGithubTarget("https://tok:pw@github.com/org/repo"), undefined, "含凭证 https：拒绝而非剥离后继续");
  assert.equal(pr.normalizeGithubTarget("git@github.com:org/repo.git").displayUrl, "https://github.com/org/repo");
  assert.equal(pr.normalizeGithubTarget("ssh://git@github.com/org/repo").displayUrl, "https://github.com/org/repo");
  assert.equal(pr.normalizeGithubTarget("https://gitlab.internal/team/sub/project").repoSlug, "team/sub/project");
  assert.equal(pr.normalizeGithubTarget("not a url"), undefined);
  assert.equal(pr.normalizeGithubTarget("https://github.com/org"), undefined);
  assert.equal(pr.normalizeGithubTarget(""), undefined);
});

test("C4 preview：漂移/基线缺失/PR 列表失败全部如实分类，任何路径都不发生写入调用", async () => {
  const ok = recordingGit(PR_SCRIPT_COMMON);
  const gh = recordingGit([{ match: /^pr list/, stdout: jsonBuf([]) }]);
  let preview = await pr.previewBranchPullRequest({ git: ok.runner, gh: gh.runner, ...PR_OPTS });
  assert.equal(preview.ok, true);
  assert.equal(preview.target.displayUrl, "https://github.com/org/repo", "目标取自实际 remote get-url，非登记文本");
  assert.equal(preview.existing.kind, "none");
  assert.equal(preview.divergence, "unknown");
  assert.ok(ok.calls.every(call => !/push|commit|merge/.test(call.args)), "预览绝不写入");
  const drift = recordingGit([{ match: /^remote get-url/, stdout: "https://github.com/org/other.git\n" }]);
  preview = await pr.previewBranchPullRequest({ git: drift.runner, gh: gh.runner, ...PR_OPTS });
  assert.equal(preview.ok, false);
  assert.match(preview.reason, /目标漂移/);
  const noBase = recordingGit(PR_SCRIPT_COMMON.map(row => row.match.source.includes("main") ? { ...row, stdout: "" } : row));
  preview = await pr.previewBranchPullRequest({ git: noBase.runner, gh: gh.runner, ...PR_OPTS });
  assert.equal(preview.baseState, "missing");
  const badGh = recordingGit([{ match: /^pr list/, code: 1, stderr: "graphql: Something went wrong" }]);
  preview = await pr.previewBranchPullRequest({ git: ok.runner, gh: badGh.runner, ...PR_OPTS });
  assert.equal(preview.existing.kind, "unknown");
  assert.match(preview.existing.note, /PR 列表查询失败/);
});

test("C4 create：普通快推 argv、未知收据绝不自动重放、gh 输出异常经只读对账复用", async () => {
  const ledger = memoryLedger();
  const ghEmpty = recordingGit([{ match: /^pr list/, stdout: jsonBuf([]) }]);
  const git1 = recordingGit([
    { match: /^push/, throw: "connect timeout" },
    ...PR_SCRIPT_COMMON,
  ]);
  const preview0 = await pr.previewBranchPullRequest({ git: recordingGit(PR_SCRIPT_COMMON).runner, gh: ghEmpty.runner, ...PR_OPTS });
  let result = await pr.createBranchPullRequest({ git: git1.runner, gh: ghEmpty.runner, ledger, ...PR_OPTS, title: "t", body: "b", previewDigest: preview0.digest });
  assert.equal(result.status, "blocked-unknown");
  assert.equal(ledger.rows().filter(row => row.outcome === "unknown" && row.action === "push").length, 1, "未知写入必须先落 unknown 收据");
  // 第二次：gh 列表失败 → PR 状态未知 → 拒绝写入，push 不得再次发生（不重放）
  const git2 = recordingGit([
    { match: /^push/, stdout: "" },
    ...PR_SCRIPT_COMMON,
  ]);
  const ghBad = recordingGit([{ match: /^pr list/, code: 1, stderr: "api down" }]);
  const previewB = await pr.previewBranchPullRequest({ git: recordingGit(PR_SCRIPT_COMMON).runner, gh: ghBad.runner, ...PR_OPTS });
  result = await pr.createBranchPullRequest({ git: git2.runner, gh: ghBad.runner, ledger, ...PR_OPTS, title: "t", body: "b", previewDigest: previewB.digest });
  assert.equal(result.status, "blocked-unknown");
  assert.match(result.reason, /既有 PR\/远端状态未能确定/);
  assert.equal(git2.calls.filter(call => call.args.startsWith("push")).length, 0, "PR 状态未知时绝不重推");
  // 完整成功路径：none → 普通快推（无 force）→ gh pr create 身份一致
  const git3 = recordingGit([
    { match: /^push/, stdout: "" },
    { match: /^ls-remote --heads origin exp\//, stdout: "", uses: 1 },
    { match: /^ls-remote --heads origin exp\//, stdout: FULL_SHA + "\trefs/heads/exp/m1\n" },
    ...PR_SCRIPT_COMMON,
  ]);
  const gh3 = recordingGit([
    { match: /^pr create/, stdout: jsonBuf({ number: 12, url: "https://github.com/org/repo/pull/12", baseRefName: "main", headRefOid: FULL_SHA }) },
    { match: /^pr list/, stdout: jsonBuf([]) },
  ]);
  const preview3 = await pr.previewBranchPullRequest({ git: recordingGit(PR_SCRIPT_COMMON).runner, gh: recordingGit([{ match: /^pr list/, stdout: jsonBuf([]) }]).runner, ...PR_OPTS });
  result = await pr.createBranchPullRequest({ git: git3.runner, gh: gh3.runner, ledger, ...PR_OPTS, title: "t", body: "b", previewDigest: preview3.digest });
  assert.equal(result.status, "created", JSON.stringify(result));
  assert.equal(result.prNumber, 12);
  const pushCall = git3.calls.find(call => call.args.startsWith("push"));
  assert.equal(pushCall.args, "push origin refs/heads/exp/m1:refs/heads/exp/m1", "只允许普通快推 refspec");
  // gh 输出不可解析 → 只读对账确认已建 → reused；此前远端已有该分支头＝无需 push
  const git4 = recordingGit([
    ...PR_SCRIPT_COMMON.map(row => row.match.source.includes("exp") ? { ...row, stdout: FULL_SHA + "\trefs/heads/exp/m1\n" } : row),
  ]);
  const gh4 = recordingGit([
    { match: /^pr list/, stdout: jsonBuf([]), uses: 1 },
    { match: /^pr create/, stdout: "creating pull request\nnot json" },
    { match: /^pr list/, stdout: jsonBuf([{ number: 13, state: "OPEN", headRefOid: FULL_SHA, baseRefName: "main", url: "https://github.com/org/repo/pull/13" }]) },
  ]);
  const preview4 = await pr.previewBranchPullRequest({ git: recordingGit(PR_SCRIPT_COMMON.map(row => row.match.source.includes("exp") ? { ...row, stdout: FULL_SHA + "\trefs/heads/exp/m1\n" } : row)).runner, gh: gh4.runner, ...PR_OPTS });
  result = await pr.createBranchPullRequest({ git: git4.runner, gh: gh4.runner, ledger, ...PR_OPTS, title: "t", body: "b", previewDigest: preview4.digest });
  assert.equal(result.status, "reused", JSON.stringify(result));
  assert.equal(result.prNumber, 13);
  assert.equal(git4.calls.filter(call => call.args.startsWith("push")).length, 0);
  // 预览漂移（digest 不一致）→ 零写入
  const git5 = recordingGit([{ match: /^push/, stdout: "" }, ...PR_SCRIPT_COMMON]);
  result = await pr.createBranchPullRequest({ git: git5.runner, gh: gh3.runner, ledger, ...PR_OPTS, title: "t", body: "b", previewDigest: "STALE" });
  assert.equal(result.status, "blocked-unknown");
  assert.match(result.reason, /与确认时的预览不一致/);
  assert.equal(git5.calls.filter(call => call.args.startsWith("push")).length, 0);
});

test("C5 merge：退出码不作结论，仅重查 MERGED+mergeCommit 算成功；祖先更新严格 ff-only", async () => {
  const ghMerged = recordingGit([
    { match: /^pr merge/, code: 1, stderr: "post-merge hook failed" },
    { match: /^pr view/, stdout: jsonBuf({ state: "MERGED", mergedAt: "2026-10-25T00:00:00Z", mergeCommit: { oid: "c".repeat(40) } }) },
  ]);
  let result = await pr.mergeBranchPullRequest({ gh: ghMerged.runner, cwd: "/repo", repoSlug: "org/repo", prNumber: 12, verifiedHeadSha: FULL_SHA });
  assert.equal(result.status, "merged", "读回事实优先：退出码非 0 但已 MERGED");
  const ghSilent = recordingGit([
    { match: /^pr merge/, code: 0, stdout: "" },
    { match: /^pr view/, stdout: jsonBuf({ state: "OPEN", mergeCommit: null }) },
  ]);
  result = await pr.mergeBranchPullRequest({ gh: ghSilent.runner, cwd: "/repo", repoSlug: "org/repo", prNumber: 12, verifiedHeadSha: FULL_SHA });
  assert.equal(result.status, "not-merged");
  const ghDown = recordingGit([{ match: /^pr merge/, throw: "timeout" }]);
  const ledger = memoryLedger();
  result = await pr.mergeBranchPullRequest({ gh: ghDown.runner, ledger, cwd: "/repo", repoSlug: "org/repo", prNumber: 12, verifiedHeadSha: FULL_SHA });
  assert.equal(result.status, "blocked-unknown");
  assert.equal(ledger.rows().filter(row => row.action === "merge" && row.outcome === "unknown").length, 1);
  result = await pr.mergeBranchPullRequest({ gh: ghMerged.runner, cwd: "/repo", repoSlug: "org/repo", prNumber: 12, verifiedHeadSha: "nope" });
  assert.equal(result.status, "blocked-unknown", "无有效已验 SHA 拒绝合并");
  // 真实临时仓：祖先快进四态
  const originDir = tempDir("se-pr-origin-");
  git(["init", "-q", "--bare", "-b", "main", originDir], originDir);
  const seed = tempDir("se-pr-seed-");
  const dirA = tempDir("se-pr-A-"); const dirC = tempDir("se-pr-C-");
  git(["clone", "-q", originDir, dirA], seed);
  git(["clone", "-q", originDir, dirC], seed);
  commitFile(dirA, "tracked.txt", "seed\n", "seed");
  git(["push", "-q", "origin", "refs/heads/main:refs/heads/main"], dirA);
  const ancestorIdentity = () => {
    const out = git(["rev-parse", "--abbrev-ref", "HEAD"], dirA).trim();
    const head = git(["rev-parse", "HEAD"], dirA).trim();
    const dirty = git(["--no-optional-locks", "status", "--porcelain=v1"], dirA).trim() !== "";
    return { branch: out, headCommit: head, dirty, error: "" };
  };
  commitFile(dirC, "tracked.txt", "base-line\n", "land on base");
  git(["push", "-q", "origin", "refs/heads/main:refs/heads/main"], dirC);
  const landedSha = git(["rev-parse", "HEAD"], dirC).trim();
  let ff = await pr.fastForwardAncestorRoot({ git: pr.runGitPullRequest, cwd: dirA, remoteName: "origin", base: "main", expectedMergeCommit: landedSha, identity: ancestorIdentity() });
  assert.equal(ff.status, "fast-forwarded", JSON.stringify(ff));
  assert.equal(ff.to, landedSha.toLowerCase());
  fs.writeFileSync(path.join(dirA, "dirt.txt"), "x\n", "utf8");
  ff = await pr.fastForwardAncestorRoot({ git: pr.runGitPullRequest, cwd: dirA, remoteName: "origin", base: "main", expectedMergeCommit: landedSha, identity: ancestorIdentity() });
  assert.equal(ff.status, "blocked");
  assert.match(ff.reason, /不干净/);
  fs.rmSync(path.join(dirA, "dirt.txt"));
  commitFile(dirA, "tracked.txt", "local-divergence\n", "local commit");
  commitFile(dirC, "tracked.txt", "remote-again\n", "remote commit");
  git(["push", "-q", "origin", "refs/heads/main:refs/heads/main"], dirC);
  const remote2 = git(["rev-parse", "HEAD"], dirC).trim();
  ff = await pr.fastForwardAncestorRoot({ git: pr.runGitPullRequest, cwd: dirA, remoteName: "origin", base: "main", expectedMergeCommit: remote2, identity: ancestorIdentity() });
  assert.equal(ff.status, "blocked");
  assert.match(ff.reason, /ff-only/);
  ff = await pr.fastForwardAncestorRoot({ git: pr.runGitPullRequest, cwd: dirA, remoteName: "origin", base: "main", expectedMergeCommit: "d".repeat(40), identity: ancestorIdentity() });
  assert.equal(ff.status, "blocked");
  assert.match(ff.reason, /不是刚确认的合并提交/);
});
