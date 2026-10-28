"use strict";
/**
 * r22/r29 单一 runner（scripts/test-workflow.js v2）回归夹具 — 新测试仅在此登记一次（package 入口 extraFiles）。
 * 临时工作副本 + 合成清单证明（非额外测速）：
 *  1) 已证白名单作业真实有界重叠（≥2 且 ≤2）；exclusive 严格互斥；同根第二批拒绝；
 *  2) 内层失败/超时/取消 ⇒ 外层真实非零 + 独占完整日志 + run.json 凭据；
 *  3) 去重=realpath+argv 矩阵（symlink 别名归并），同文件矩阵行互斥；
 *  4) r29 反例：--reuse-receipt 拒绝；final profile 拒绝 --only 与超限 --max-parallel；hook 对阻断；
 *     测试子进程环境隔离（HOME/USERPROFILE/TMPDIR 沙箱 + 六项 Git 定位变量清除，门禁不受影响）；
 *     运行中输入漂移 ⇒ invalidated；run receipt wx 不可覆盖；
 *  5) assemble 逐项对账：缺 job/空 jobs/缺 gate/过期指纹一律拒绝；check:full 凭据正向可用；
 *  6) vsce 经已安装 bin 元数据解析（R29 #6）；真实仓库对账 = manifest 窄语法独立展开 ⇄ planEntry 双向集合
 *     对账（遗漏/多余/重复/空集失败 + 盘上覆盖集合棘轮/入口映射/白名单路径在盘；2026-10-24 用户契约：
 *     无业务依据的固定总数门禁禁止，见 canonicalPlan 注释）。
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawn, spawnSync } = require("node:child_process");

const REPO = path.resolve(__dirname, "..", "..");
const RUNNER = path.join(REPO, "scripts", "test-workflow.js");
const runner = require(RUNNER);

function makeWorkspace(t) {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), "psg-runner-"));
  fs.mkdirSync(path.join(ws, "test"));
  fs.writeFileSync(path.join(ws, "package.json"), JSON.stringify({ name: "fixture", scripts: {} }));
  t.after(() => fs.rmSync(ws, { recursive: true, force: true }));
  return ws;
}

function writeManifest(ws, manifest) {
  const file = path.join(ws, "manifest.json");
  fs.writeFileSync(file, JSON.stringify(manifest, null, 1));
  return file;
}

/** r29 #2 夹具白名单：basis=文件本体 sha+平台+证据引用（真实仓库由 --attest-overlap 生成闭包版）。 */
const FIXTURE_INDEPENDENCE = { verdict: "PASS", writes: "fixture job scripts write only the explicitly passed marker path (test-owned tmp workspace)", ports: "none", external: "none", git: "stripped by runner", deps: "self-only", subprocess: "none", decidedBy: "fixture-author", decidedAt: "2026-10-24T04:20:00Z" };
function attestIn(ws, files) {
  return files.map(file => ({ file, independence: { ...FIXTURE_INDEPENDENCE }, basis: { platform: process.platform, closure: [{ path: file, sha256: crypto.createHash("sha256").update(fs.readFileSync(path.join(ws, file))).digest("hex") }], evidence: "fixture" } }));
}
/** Fixture job = plain node script under ws/test with baked marker path/sleep/exit. */
function makeJob(ws, name, { sleep = 0, exit = 0, mark = null, envDump = false } = {}) {
  const file = path.join(ws, "test", `${name}.js`);
  const lines = ['"use strict";', "const fs = require(\"node:fs\");"];
  const id = envDump ? "String(process.pid)" : JSON.stringify(name);
  if (mark) {
    lines.push(`const MARK=${JSON.stringify(mark)};`);
    lines.push(`fs.appendFileSync(MARK, JSON.stringify({ev:"start",id:${id},ts:Date.now(),home:process.env.HOME,tmp:process.env.TMPDIR,gd:process.env.GIT_DIR??null,wt:process.env.GIT_WORK_TREE??null})+"\\n");`);
  }
  lines.push(`setTimeout(()=>{${mark ? `fs.appendFileSync(MARK, JSON.stringify({ev:"end",id:${id},ts:Date.now()})+"\\n");` : ""}process.exit(${exit});},${sleep});`);
  fs.writeFileSync(file, lines.join("\n"));
  return `test/${name}.js`;
}

function runRunner(ws, manifest, entry, args = [], env) {
  return spawnSync(process.execPath, [RUNNER, entry, "--root", ws, "--manifest", manifest, ...args],
    { encoding: "utf8", windowsHide: true, timeout: 19000, env: env || process.env });
}

/** last-<entry>.json 是指针；事实文件是批目录里的 run.json（r29 #5 分离）。 */
function receipt(ws, entry) {
  const pointer = JSON.parse(fs.readFileSync(path.join(ws, "simple_cluster", "reports", "test-workflow", `last-${entry}.json`), "utf8"));
  assert.equal(pointer.pointer, true, "last-*.json must be a pointer, not the fact file");
  return JSON.parse(fs.readFileSync(pointer.runReceipt, "utf8"));
}

function intervals(markFile) {
  const starts = {}, out = [];
  for (const line of fs.readFileSync(markFile, "utf8").split("\n")) {
    let row; try { row = JSON.parse(line); } catch { continue; }
    if (row.ev === "start") starts[row.id] = row; else if (row.ev === "end" && starts[row.id] !== undefined) out.push({ id: row.id, start: starts[row.id].ts, end: row.ts, meta: starts[row.id] });
  }
  return out;
}

function maxOverlap(rows) {
  const events = [];
  for (const r of rows) { events.push([r.start, 1]); events.push([r.end, -1]); }
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let cur = 0, max = 0;
  for (const [, d] of events) { cur += d; max = Math.max(max, cur); }
  return max;
}

const baseManifest = (ws, entries, parallelFiles, exclusive = {}) => ({
  schemaVersion: 1, compileGates: [], domains: {}, batchDefaults: { maxParallel: 2, killGraceMs: 2000 },
  entries, classification: { mode: "attested-whitelist", parallel: attestIn(ws, parallelFiles), exclusive },
});

test("runner: attested jobs really overlap but never exceed maxParallel=2", async t => {
  const ws = makeWorkspace(t), mark = path.join(ws, "mark.log");
  const files = [];
  for (let i = 0; i < 6; i++) files.push(makeJob(ws, `ind${i}`, { sleep: 200, mark }));
  const manifest = writeManifest(ws, baseManifest(ws, {
    mix: { phases: { fullCheck: { extraFiles: files.map(f => ({ file: f, argv: [], source: "fixture" })) } } },
  }, files));
  const run = runRunner(ws, manifest, "mix");
  assert.equal(run.status, 0, run.stdout + run.stderr);
  const rec = receipt(ws, "mix");
  assert.equal(rec.overall, "passed");
  assert.equal(rec.jobs.length, 6);
  assert.ok(rec.jobs.every(j => j.basis.startsWith("attested:")), "whitelist basis recorded per job");
  const rows = intervals(mark);
  assert.equal(rows.length, 6);
  assert.ok(maxOverlap(rows) >= 2, "attested jobs must actually overlap at cap 2");
  assert.ok(maxOverlap(rows) <= 2, "single batch never exceeds the global cap");
});

test("runner: unattested files stay serial and drifted attestations downgrade to exclusive (R29 #2)", async t => {
  const ws = makeWorkspace(t), mark = path.join(ws, "mark.log");
  const a = makeJob(ws, "att", { sleep: 250, mark });
  const b = makeJob(ws, "new", { sleep: 250, mark });
  const manifest = writeManifest(ws, baseManifest(ws, {
    mix: { phases: { fullCheck: { extraFiles: [{ file: a, argv: [], source: "f" }, { file: b, argv: [], source: "f" }] } } },
  }, [a]));
  fs.writeFileSync(path.join(ws, a), fs.readFileSync(path.join(ws, a), "utf8") + "// drift after attestation\n");
  const run = runRunner(ws, manifest, "mix");
  assert.equal(run.status, 0, run.stdout + run.stderr);
  const rec = receipt(ws, "mix");
  const ja = rec.jobs.find(j => j.file === a), jb = rec.jobs.find(j => j.file === b);
  assert.ok(ja.basis.startsWith("attestation-drift"), "drifted basis must not stay parallel");
  assert.ok(ja.exclusive && jb.exclusive, "drifted + unattested files both fall back to serial");
  assert.ok(maxOverlap(intervals(mark)) <= 1, "no overlap allowed without valid attestation");
});

test("runner: exclusive jobs never share time with any other job", async t => {
  const ws = makeWorkspace(t), mark = path.join(ws, "mark.log");
  const e1 = makeJob(ws, "ex1", { sleep: 300, mark });
  const i1 = makeJob(ws, "in1", { sleep: 150, mark });
  const e2 = makeJob(ws, "ex2", { sleep: 300, mark });
  const i2 = makeJob(ws, "in2", { sleep: 150, mark });
  const manifest = writeManifest(ws, baseManifest(ws, {
    mix: { phases: { fullCheck: { extraFiles: [e1, i1, e2, i2].map(f => ({ file: f, argv: [], source: "fixture" })) } } },
  }, [i1, i2], { [e1]: ["fixture-exclusive"], [e2]: ["fixture-exclusive"] }));
  const run = runRunner(ws, manifest, "mix");
  assert.equal(run.status, 0, run.stdout + run.stderr);
  const rows = intervals(mark);
  assert.equal(rows.length, 4);
  for (const ex of rows.filter(r => r.id.startsWith("ex")))
    for (const other of rows.filter(r => r.id !== ex.id))
      assert.ok(ex.end <= other.start || ex.start >= other.end, `exclusive ${ex.id} overlapped ${other.id}`);
});

test("runner: same-file argv matrix rows are mutually exclusive (R29 #3)", async t => {
  const ws = makeWorkspace(t), mark = path.join(ws, "mark.log");
  const shared = makeJob(ws, "matrix", { sleep: 300, mark, envDump: true });
  const manifest = writeManifest(ws, baseManifest(ws, {
    mix: { phases: { fullCheck: { extraFiles: [
      { file: shared, argv: [], source: "one" },
      { file: shared, argv: ["--test-reporter", "tap"], source: "two" },
    ] } } },
  }, [shared]));
  const run = runRunner(ws, manifest, "mix");
  assert.equal(run.status, 0, run.stdout + run.stderr);
  const rec = receipt(ws, "mix");
  assert.equal(rec.jobs.length, 2, "argv matrix keeps two rows");
  assert.equal(rec.jobs[0].identity, rec.jobs[1].identity, "identity is realpath-normalized file");
  assert.equal(rec.jobs[0].group, rec.jobs[1].group, "same identity ⇒ same mutex group");
  const rows = intervals(mark);
  assert.equal(rows.length, 2);
  assert.ok(rows[0].end <= rows[1].start || rows[1].end <= rows[0].start, "matrix rows of one file never overlap");
});

test("runner: symlink alias collapses into one run by realpath identity (R29 #3)", { skip: process.platform === "win32" && "POSIX symlink semantics" }, async t => {
  const ws = makeWorkspace(t);
  const real = makeJob(ws, "real", {});
  fs.symlinkSync("real.js", path.join(ws, "test", "alias.js"));
  const manifest = writeManifest(ws, baseManifest(ws, {
    mix: { phases: { fullCheck: { domains: ["d1", "d2"] } } },
    _d: {},
  }, [real]));
  const m = JSON.parse(fs.readFileSync(manifest, "utf8"));
  m.domains = { d1: { sourceScript: "node --test test/real.js" }, d2: { sourceScript: "node --test test/alias.js" } };
  fs.writeFileSync(manifest, JSON.stringify(m, null, 1));
  const run = runRunner(ws, manifest, "mix");
  assert.equal(run.status, 0, run.stdout + run.stderr);
  const rec = receipt(ws, "mix");
  assert.equal(rec.jobs.length, 1, "alias + real file are one identity");
  assert.equal(rec.jobs[0].sources.length, 2, "both sources recorded");
  assert.ok(rec.jobs[0].identity.endsWith("/test/real.js"), "identity resolved through the link");
});

test("runner: test children run in isolated env; Git locator vars stripped; gates canonical (R29 #1)", async t => {
  const ws = makeWorkspace(t), mark = path.join(ws, "mark.log");
  fs.mkdirSync(path.join(ws, "scripts"));
  fs.writeFileSync(path.join(ws, "scripts", "gate.js"), `require("node:fs").appendFileSync(${JSON.stringify(path.join(ws, "gate-env.log"))}, JSON.stringify({home:process.env.HOME??null,gd:process.env.GIT_DIR??null})+"\\n");console.log("GATE-OK");\n`);
  const job = makeJob(ws, "iso", { envDump: true, mark });
  const manifest = writeManifest(ws, baseManifest(ws, {
    mix: { phases: { fullCheck: { extraFiles: [{ file: job, argv: [], source: "fixture" }] } } },
  }, [job]));
  const env = { ...process.env, GIT_DIR: "/must/not/leak", GIT_WORK_TREE: "/must/not/leak2" };
  const run = runRunner(ws, manifest, "mix", [], env);
  assert.equal(run.status, 0, run.stdout + run.stderr);
  const rows = intervals(mark);
  assert.equal(rows.length, 1);
  const m = rows[0].meta;
  assert.notEqual(m.home, process.env.HOME, "test child HOME must be the per-file sandbox, not the real user dir");
  assert.ok(m.home.includes("psg-env") && !m.home.includes("simple_cluster"), `HOME=${m.home}`);
  assert.equal(m.gd, null, "GIT_DIR stripped from test children");
  assert.equal(m.wt, null, "GIT_WORK_TREE stripped");
  assert.equal(m.tmp, m.home, "TMPDIR pinned into the same sandbox");
});

test("runner: npm lifecycle hook pair blocks the batch (R29 #3 hook graph)", async t => {
  const ws = makeWorkspace(t);
  fs.writeFileSync(path.join(ws, "package.json"), JSON.stringify({ name: "fixture", scripts: { build: "node x.js", prebuild: "node y.js" } }));
  const job = makeJob(ws, "j", {});
  const manifest = writeManifest(ws, baseManifest(ws, { mix: { phases: { fullCheck: { extraFiles: [{ file: job, argv: [], source: "f" }] } } } }, [job]));
  const run = runRunner(ws, manifest, "mix");
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /lifecycle hooks present/);
});

test("runner: final profile rejects --only; --max-parallel capped; reuse removed (R29 #4)", async t => {
  const ws = makeWorkspace(t);
  const job = makeJob(ws, "f1", {});
  const manifest = writeManifest(ws, baseManifest(ws, {
    fin: { final: true, phases: { fullCheck: { extraFiles: [{ file: job, argv: [], source: "f" }] } } },
  }, [job]));
  const only = runRunner(ws, manifest, "fin", ["--only", "test/f1.js"]);
  assert.notEqual(only.status, 0, "--only must be rejected on final profiles");
  assert.match(only.stderr, /--only filtering is forbidden/);
  const over = runRunner(ws, manifest, "fin", ["--max-parallel", "5"]);
  assert.notEqual(over.status, 0);
  assert.match(over.stderr, /exceeds the task-wide cap/);
  const reuse = runRunner(ws, manifest, "fin", ["--reuse-receipt"]);
  assert.notEqual(reuse.status, 0, "result reuse is removed, not gated behind a flag");
  assert.match(reuse.stderr, /removed by r29 #4/);
  assert.equal(runRunner(ws, manifest, "fin").status, 0, "plain final run executes fresh");
});

test("runner: second batch on the same working copy is refused (caps never multiply)", async t => {
  const ws = makeWorkspace(t);
  const slow = makeJob(ws, "slow", { sleep: 2500 });
  const manifest = writeManifest(ws, baseManifest(ws, { one: { phases: { fullCheck: { extraFiles: [{ file: slow, argv: [], source: "f" }] } } } }, [slow]));
  const first = spawn(process.execPath, [RUNNER, "one", "--root", ws, "--manifest", manifest], { stdio: "pipe", windowsHide: true });
  t.after(() => { try { first.kill(); } catch { /* settled */ } });
  const lockDir = path.join(ws, "simple_cluster", "locks", "simple-experiment", "test-workflow", "batch.lock");
  const deadline = Date.now() + 8000;
  while (!fs.existsSync(lockDir) && Date.now() < deadline) await new Promise(r => setTimeout(r, 50));
  assert.ok(fs.existsSync(lockDir), "batch lock exists while first batch runs");
  const second = runRunner(ws, manifest, "one");
  assert.equal(second.status, 3, "second same-root batch rejected with a distinct non-zero code");
  assert.match(second.stderr, /拒绝并发批/);
  const code = await new Promise(resolve => first.on("close", resolve));
  assert.equal(code, 0, "first batch finishes normally");
  assert.ok(fs.existsSync(path.join(ws, "test", "slow.js")));
});

test("runner: lock is released only by its owner and release is recorded (R29 #7)", async t => {
  const ws = makeWorkspace(t);
  const job = makeJob(ws, "q", {});
  const manifest = writeManifest(ws, baseManifest(ws, { one: { phases: { fullCheck: { extraFiles: [{ file: job, argv: [], source: "f" }] } } } }, [job]));
  assert.equal(runRunner(ws, manifest, "one").status, 0);
  assert.ok(!fs.existsSync(path.join(ws, "simple_cluster", "locks", "simple-experiment", "test-workflow", "batch.lock")), "own lock released after the batch");
  const rec = receipt(ws, "one");
  assert.ok(fs.existsSync(path.join(rec.logDir, "lock-release.json")), "release record retained");
  // r31 用户口径（2026-10-28「B，加一次确认」）：即使 pid 经 ESRCH 确证已消失，工具也不得自行永久删除；
  // 没有交互终端就继续阻塞并给全事实，用户在终端连续 2 次确认后才原地直接删除并继续（不堆积、不留档）。
  const deadForeignPid = deadProcessPid();
  const foreignLock = plantBatchLock(ws, { pid: deadForeignPid, entry: "one", batchId: "foreign-dead-999", startedAt: "2026-10-28T01:42:23.814Z", root: ws });
  const blocked = runRunner(ws, manifest, "one");
  assert.equal(blocked.status, 3, "没有终端时不能代为决定删除，必须继续阻塞: " + String(blocked.stdout).slice(-400));
  assert.match(blocked.stderr, /无交互终端/, "阻塞文案要说清为什么没删");
  assert.ok(blocked.stderr.includes(foreignLock), "阻塞文案必须给精确完整路径");
  assert.ok(fs.existsSync(path.join(foreignLock, "owner.json")), "没确认一个字也不删");
  const reclaimed = runRunnerCapped(ws, manifest, "one", { input: "y\ny", interactive: true });
  assert.equal(reclaimed.status, 0, "用户连续 2 次确认之后必须删除陈封锁并继续: " + String(reclaimed.stderr).slice(-400));
  assert.match(reclaimed.stdout, /STALE-LOCK-DELETED/);
  assert.ok(!fs.existsSync(foreignLock), "确认之后的锁必须已消失");
});

/* -------- r30 必修：批锁不再因属主已死而永久阻塞（直接删除 + P0 删除纪律；真实入口与真实退出码） -------- */

const LOCK_PARENT = (ws) => path.join(ws, "simple_cluster", "locks", "simple-experiment", "test-workflow");

/** 只把 ESRCH 当作不存在；EPERM/EACCES 及其余异常一律算存活（与 runner 内部同一语义）。 */
function procAlive(pid) {
  try { process.kill(pid, 0); return true; } catch (error) {
    return !(error && error.code === "ESRCH");
  }
}

/** 确定已退出的 pid：跑一个立即结束的 node 子进程并拿它的 pid（不用随机数）。 */
function deadProcessPid() {
  const child = spawnSync(process.execPath, ["-e", ""], { encoding: "utf8", windowsHide: true, timeout: 10000 });
  assert.equal(child.status, 0, "探命子进程必须正常退出");
  assert.ok(Number.isInteger(child.pid) && child.pid > 0, "子进程 pid 可得");
  assert.equal(procAlive(child.pid), false, `pid ${child.pid} 应已不存在（ESRCH）`);
  return child.pid;
}

/** 植入一把批锁；可造假损坏 owner 与锁目录年龄（用 utimes 而不是睡等）。 */
function plantBatchLock(ws, owner, { corrupt = false, ageMs = 0 } = {}) {
  const lockDir = path.join(LOCK_PARENT(ws), "batch.lock");
  fs.mkdirSync(lockDir, { recursive: true });
  fs.writeFileSync(path.join(lockDir, "owner.json"), corrupt ? "{ not-json" : JSON.stringify(owner, null, 1));
  if (ageMs > 0) { const back = new Date(Date.now() - ageMs); fs.utimesSync(lockDir, back, back); }
  return lockDir;
}

/** 遵守 P0：新增用例的 spawnSync 一律 timeout <= 10000。 */
function runRunnerCapped(ws, manifest, entry, { input, interactive } = {}) {
  return spawnSync(process.execPath, [RUNNER, entry, "--root", ws, "--manifest", manifest],
    { encoding: "utf8", windowsHide: true, timeout: 10000, env: interactive ? { ...process.env, TEST_WORKFLOW_INTERACTIVE: "1" } : process.env,
      input: input === undefined ? undefined : `${input}\n` });
}

function lockHarness(t, name) {
  const ws = makeWorkspace(t);
  const job = makeJob(ws, name, {});
  const manifest = writeManifest(ws, baseManifest(ws, { one: { phases: { fullCheck: { extraFiles: [{ file: job, argv: [], source: "f" }] } } } }, [job]));
  return { ws, manifest };
}

test("runner: 属主 pid 已不存在（ESRCH）——没终端仍阻塞，终端连续 2 次 y 才原地删除并继续，不堆积也不写 clean_dir", t => {
  const { ws, manifest } = lockHarness(t, "stale1");
  const pid = deadProcessPid();
  const lockDir = plantBatchLock(ws, { pid, entry: "one", batchId: "2026-10-28T01-42-23-521Z-24628-package", startedAt: "2026-10-28T01:42:23.814Z", root: ws });
  // 一、非交互入口（CI / 无 TTY）：死亡硬依据也不等于同意，必须继续阻塞并给全事实。
  const noTty = runRunnerCapped(ws, manifest, "one");
  assert.equal(noTty.status, 3, "没有终端不是同意：陈封锁也只能阻塞");
  assert.match(noTty.stderr, /无交互终端/, "要说清为什么没删");
  assert.match(noTty.stderr, /连续 2 次回答 y/, "要告诉用户正确的清理入口");
  assert.ok(noTty.stderr.includes(lockDir), "阻塞文案必须给精确完整路径");
  assert.match(noTty.stderr, new RegExp(`pid=${pid}`), "阻塞文案必须给旧 pid");
  assert.ok(fs.existsSync(path.join(lockDir, "owner.json")), "没确认一个字也不删");
  // 二、交互入口：必须问两次，两次都自动打印全部事实，用户只回答 y。
  const run = runRunnerCapped(ws, manifest, "one", { input: "y\ny", interactive: true });
  assert.equal(run.status, 0, "连续 2 次确认之后必须删除并继续: " + String(run.stderr).slice(-500));
  assert.equal((run.stdout.match(/永久删除批锁——第 \d\/2 次确认/g) || []).length, 2, "必须逐次提示两次确认");
  for (const field of ["精确路径", "类型", "属主 owner.json", "pid / batchId", "startedAt", "判定依据", "目标指纹", "影响范围"])
    assert.ok(run.stdout.includes(field), `确认前必须自动备好事实字段 ${field}，用户不需要自己输入路径`);
  assert.ok(run.stdout.includes(lockDir), "确认文案必须写精确完整路径");
  assert.match(run.stdout, /STALE-LOCK-DELETED/);
  assert.ok(run.stdout.includes(`旧pid=${pid}`), "日志必须写明旧 pid");
  assert.ok(run.stdout.includes("2026-10-28T01-42-23-521Z-24628-package"), "日志必须写明旧 batchId");
  assert.ok(run.stdout.includes("2026-10-28T01:42:23.814Z"), "日志必须写明旧 startedAt");
  assert.ok(run.stdout.includes("ESRCH"), "日志必须写明判定依据");
  assert.match(run.stdout, /来源=用户终端确认（2\/2 次）/, "日志必须记明确认次数与来源");
  assert.ok(!fs.existsSync(lockDir), "锁目录必须已被删除");
  assert.ok(!fs.existsSync(path.join(LOCK_PARENT(ws), "stale-locks")), "不得堆积隔离目录");
  assert.ok(!fs.existsSync(path.join(ws, "clean_dir")), "不得把锁写进 clean_dir 长期留档");
});

test("runner: 属主 pid 仍存活（本测试进程作活体属主）不得删除，无交互终端仍阻塞并给出精确路径", t => {
  const { ws, manifest } = lockHarness(t, "stale2");
  const lockDir = plantBatchLock(ws, { pid: process.pid, entry: "one", batchId: "live-batch-77", startedAt: "2026-10-28T02:00:00.000Z", root: ws });
  const run = runRunnerCapped(ws, manifest, "one");
  assert.equal(run.status, 3, "活体属主的锁不得被删除");
  assert.match(run.stderr, /拒绝并发批/);
  assert.ok(run.stderr.includes(lockDir), "报错必须含精确完整锁路径");
  assert.match(run.stderr, new RegExp(`pid=${process.pid}`), "报错必须含属主 pid");
  assert.match(run.stderr, /live-batch-77/);
  assert.match(run.stderr, /2026-10-28T02:00:00\.000Z/);
  assert.match(run.stderr, /删除这个精确目录/);
  assert.ok(fs.existsSync(path.join(lockDir, "owner.json")), "活锁不得被动");
  assert.equal(JSON.parse(fs.readFileSync(path.join(lockDir, "owner.json"), "utf8")).pid, process.pid);
});

test("runner: 属主存活但锁已超阈值——没终端阻塞、答 n 阻塞、只答一次 y 也阻塞，连续两次 y 才删除并继续", t => {
  const aged = 3 * 60 * 60 * 1000; // 超过 STALE_LOCK_CONFIRM_AGE_MS（2 小时）
  const silent = lockHarness(t, "aged0");
  const silentLock = plantBatchLock(silent.ws, { pid: process.pid, entry: "one", batchId: "aged-batch-silent", startedAt: "2026-10-28T03:00:00.000Z", root: silent.ws }, { ageMs: aged });
  const noTty = runRunnerCapped(silent.ws, silent.manifest, "one");
  assert.equal(noTty.status, 3, "无交互终端不得代为决定删除");
  assert.match(noTty.stderr, /无交互终端/);
  assert.ok(noTty.stderr.includes(silentLock), "必须给精确路径");
  assert.ok(fs.existsSync(path.join(silentLock, "owner.json")), "无终端不得删活锁");

  const deny = lockHarness(t, "agedn");
  const denyLock = plantBatchLock(deny.ws, { pid: process.pid, entry: "one", batchId: "aged-batch-n", startedAt: "2026-10-28T03:10:00.000Z", root: deny.ws }, { ageMs: aged });
  const answered = runRunnerCapped(deny.ws, deny.manifest, "one", { input: "n", interactive: true });
  assert.equal(answered.status, 3, "答 n 必须仍阻塞（默认 N）");
  assert.match(answered.stdout, /\[y\/N\]/, "必须真的提示过一行 y/N");
  assert.match(answered.stderr, /第 1\/2 次确认未通过/, "要说清是哪一次确认没过");
  assert.ok(fs.existsSync(path.join(denyLock, "owner.json")), "答 n 不得删除");

  // 「B，加一次确认」：只点一次 y 绝不构成同意——第二次没有明确 y 就停止删除。
  const once = lockHarness(t, "agedonce");
  const onceLock = plantBatchLock(once.ws, { pid: process.pid, entry: "one", batchId: "aged-batch-once", startedAt: "2026-10-28T03:15:00.000Z", root: once.ws }, { ageMs: aged });
  const onceRun = runRunnerCapped(once.ws, once.manifest, "one", { input: "y", interactive: true });
  assert.equal(onceRun.status, 3, "只答一次 y 不得删除（双确认是本轮契约）");
  assert.match(onceRun.stderr, /第 2\/2 次确认未通过/, "要说清第二次确认没过（EOF 也按默认 N）");
  assert.match(onceRun.stderr, /此前 1 次确认不作数/, "前一次确认不能被累计复用");
  assert.ok(fs.existsSync(path.join(onceLock, "owner.json")), "只答一次 y 不得删除");

  const approve = lockHarness(t, "agedy");
  const approveLock = plantBatchLock(approve.ws, { pid: process.pid, entry: "one", batchId: "aged-batch-y", startedAt: "2026-10-28T03:20:00.000Z", root: approve.ws }, { ageMs: aged });
  const okRun = runRunnerCapped(approve.ws, approve.manifest, "one", { input: "y\ny", interactive: true });
  assert.equal(okRun.status, 0, "连续两次 y 必须删除并继续: " + String(okRun.stderr).slice(-500));
  assert.match(okRun.stdout, /STALE-LOCK-DELETED/);
  assert.match(okRun.stdout, /来源=用户终端确认（2\/2 次）/);
  assert.ok(!fs.existsSync(approveLock), "确认后锁必须确实消失");

  // 第二次回答 n：第一次确认作废，仍然零删除。
  const secondNo = lockHarness(t, "agedy2n");
  const secondNoLock = plantBatchLock(secondNo.ws, { pid: process.pid, entry: "one", batchId: "aged-batch-y-n", startedAt: "2026-10-28T03:25:00.000Z", root: secondNo.ws }, { ageMs: aged });
  const halfRun = runRunnerCapped(secondNo.ws, secondNo.manifest, "one", { input: "y\nn", interactive: true });
  assert.equal(halfRun.status, 3, "第二次答 n 必须停止删除");
  assert.match(halfRun.stderr, /第 2\/2 次确认未通过/);
  assert.ok(fs.existsSync(path.join(secondNoLock, "owner.json")), "半途改主意必须一个字节也不删");
});

test("runner: owner 缺失/损坏或没有合法 pid——宽限内阻塞，过宽限也只能先问，两次确认之后才删除", t => {
  const fresh = lockHarness(t, "stale3a");
  const freshLock = plantBatchLock(fresh.ws, null, { corrupt: true });
  const blocked = runRunnerCapped(fresh.ws, fresh.manifest, "one");
  assert.equal(blocked.status, 3, "刚 mkdir 完还没来得及写 owner 的窗口不得被抢锁");
  assert.match(blocked.stderr, /写盘宽限|拒绝并发批/);
  assert.ok(fs.existsSync(path.join(freshLock, "owner.json")), "宽限内不得动别人的锁");

  // 「无法证明归属」不是死亡证明：过宽限也只是“可以问”，没确认就一个字也不删。
  const aged = lockHarness(t, "stale3b");
  const agedLock = plantBatchLock(aged.ws, null, { corrupt: true, ageMs: 5 * 60 * 1000 });
  const blockedAged = runRunnerCapped(aged.ws, aged.manifest, "one");
  assert.equal(blockedAged.status, 3, "损坏 owner 的锁在没有确认前必须继续阻塞: " + String(blockedAged.stderr).slice(-500));
  assert.match(blockedAged.stderr, /依据=owner-unusable-shape/, "要写清判定依据是无法证明归属");
  assert.match(blockedAged.stderr, /无法证明归属，不是死亡证明/, "文案不得把“读不懂”说成“已退出”");
  assert.ok(fs.existsSync(path.join(agedLock, "owner.json")), "没确认不得删损坏 owner 的锁");
  const gone = runRunnerCapped(aged.ws, aged.manifest, "one", { input: "y\ny", interactive: true });
  assert.equal(gone.status, 0, "用户连续两次确认之后必须删除并继续: " + String(gone.stderr).slice(-500));
  assert.match(gone.stdout, /STALE-LOCK-DELETED/);
  assert.ok(!fs.existsSync(agedLock), "确认之后损坏 owner 的旧锁必须被删除");
  assert.ok(!fs.existsSync(path.join(aged.ws, "clean_dir")), "不得留档到 clean_dir");

  const noPid = lockHarness(t, "stale3c");
  const noPidLock = plantBatchLock(noPid.ws, { entry: "one", batchId: "no-pid-batch", startedAt: "2026-10-28T04:00:00.000Z", root: noPid.ws }, { ageMs: 5 * 60 * 1000 });
  const noPidBlocked = runRunnerCapped(noPid.ws, noPid.manifest, "one");
  assert.equal(noPidBlocked.status, 3, "owner 没有合法 pid 且没有确认时必须阻塞");
  assert.ok(fs.existsSync(path.join(noPidLock, "owner.json")), "没确认不得删");
  const noPidRun = runRunnerCapped(noPid.ws, noPid.manifest, "one", { input: "y\ny", interactive: true });
  assert.equal(noPidRun.status, 0, "确认之后 owner 没有合法 pid 且已过宽限必须删除后继续: " + String(noPidRun.stderr).slice(-400));
  assert.ok(!fs.existsSync(noPidLock));
});

test("runner: 删除纪律拒绝任何非直接子项目标，只有合法 ./直接子项 才动", t => {
  const ws = makeWorkspace(t);
  const parent = LOCK_PARENT(ws);
  const lockDir = path.join(parent, "batch.lock");
  fs.mkdirSync(lockDir, { recursive: true });
  fs.writeFileSync(path.join(lockDir, "owner.json"), "{}");
  fs.writeFileSync(path.join(parent, "not-a-dir"), "x");
  const bad = ["..", ".", "/abs/batch.lock", "a/batch.lock", "batch.lock.tmp*", "sub\\batch.lock", "..\\batch.lock"];
  for (const name of bad) {
    assert.throws(() => runner.deleteOwnedLockChild({ safeRoot: ws, parentDir: parent, childName: name }),
      /LOCK_TARGET_REJECTED/, `必须拒绝目标 ${JSON.stringify(name)}`);
    assert.ok(fs.existsSync(path.join(lockDir, "owner.json")), `非法目标 ${JSON.stringify(name)} 不得动到真锁`);
  }
  // 直接父目录越出安全根同样拒绝
  assert.throws(() => runner.deleteOwnedLockChild({ safeRoot: lockDir, parentDir: parent, childName: "batch.lock" }), /LOCK_TARGET_REJECTED/);
  // 目标必须是目录：文件目标拒绝
  assert.throws(() => runner.deleteOwnedLockChild({ safeRoot: ws, parentDir: parent, childName: "not-a-dir" }), /LOCK_TARGET_REJECTED/);
  assert.ok(fs.existsSync(path.join(parent, "not-a-dir")), "文件目标不得被删");
  // 合法目标：只写 ./直接子项，删后核实消失，并恢复原 cwd
  const cwdBefore = process.cwd();
  const removed = runner.deleteOwnedLockChild({ safeRoot: ws, parentDir: parent, childName: "batch.lock" });
  assert.equal(removed.removed, "./batch.lock");
  assert.ok(!fs.existsSync(lockDir), "合法锁删除后必须确实不存在");
  assert.equal(process.cwd(), cwdBefore, "删除必须恢复原 cwd");
});

test("runner: owner.json 读不到（EISDIR/权限/瞬时 IO）一律阻塞，绝不当成属主已死，连点两次 y 也不许删", t => {
  const ws = makeWorkspace(t);
  const job = makeJob(ws, "unreadable", {});
  const manifest = writeManifest(ws, baseManifest(ws, { one: { phases: { fullCheck: { extraFiles: [{ file: job, argv: [], source: "f" }] } } } }, [job]));
  const lockDir = path.join(LOCK_PARENT(ws), "batch.lock");
  fs.mkdirSync(lockDir, { recursive: true });
  // owner.json 做成目录：readFileSync 必然抛 EISDIR（不靠 ACL、不靠管理员权限，也不碰真实属主进程）。
  fs.mkdirSync(path.join(lockDir, "owner.json"));
  const back = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  fs.utimesSync(lockDir, back, back);
  const read = runner.readLockOwner(lockDir);
  assert.equal(read.readFailed, true, "EISDIR 这类必须记成“读取失败”");
  assert.equal(read.missing, false, "读取失败不等于 owner 不存在");
  const verdict = runner.classifyStaleLock(lockDir);
  assert.equal(verdict.action, "block", "读取失败一律阻塞：读不到只说明我们看不见，不说明原批已退出");
  assert.equal(verdict.basis, "owner-read-failed");
  const noTty = runRunnerCapped(ws, manifest, "one");
  assert.equal(noTty.status, 3);
  assert.match(noTty.stderr, /读取失败不等于属主已死/, "阻塞文案要说清为什么不能判死");
  assert.ok(fs.existsSync(path.join(lockDir, "owner.json")), "没搞清归属之前一个字也不动");
  const forced = runRunnerCapped(ws, manifest, "one", { input: "y\ny", interactive: true });
  assert.equal(forced.status, 3, "归属未知时用户点确认也不许删——确认不能替代归属证据");
  assert.equal((forced.stdout.match(/永久删除批锁——第/g) || []).length, 0, "block 档根本不该出现确认提示");
  assert.ok(fs.existsSync(path.join(lockDir, "owner.json")), "确认不替代归属证据");
});

test("runner: cd 不进直接父目录或 cd 后物理目录不符一律 PARENT_CD_FAILED，锁原地不动", t => {
  const ws = makeWorkspace(t);
  const parent = LOCK_PARENT(ws);
  const lockDir = plantBatchLock(ws, { pid: deadProcessPid(), entry: "one", batchId: "cd-fail-batch", startedAt: "2026-10-28T06:00:00.000Z", root: ws }, { ageMs: 5 * 60 * 1000 });
  const cwdBefore = process.cwd();
  // 一、chdir 本身抛错（权限不足、目录被顶替、路径失效等）：必须统一转成 PARENT_CD_FAILED，不外泄裸 errno。
  assert.throws(() => runner.deleteOwnedLockChild({
    safeRoot: ws, parentDir: parent, childName: "batch.lock",
    chdir: () => { throw Object.assign(new Error("operation not permitted"), { code: "EPERM" }); },
  }), /PARENT_CD_FAILED/, "cd 失败必须报 PARENT_CD_FAILED");
  assert.ok(fs.existsSync(path.join(lockDir, "owner.json")), "cd 失败时锁必须原地不动");
  // 二、chdir 调用成功但物理工作目录对不上（伪造/被换根）：同样必须停手。
  assert.throws(() => runner.deleteOwnedLockChild({
    safeRoot: ws, parentDir: parent, childName: "batch.lock",
    chdir: () => undefined, getCwd: () => path.join(parent, "some-where-else"),
  }), /PARENT_CD_FAILED/, "cd 后物理目录不一致必须报 PARENT_CD_FAILED");
  assert.ok(fs.existsSync(path.join(lockDir, "owner.json")), "物理目录不一致时锁必须原地不动");
  // 三、失败路径必须把进程工作目录还原，绝不影响后续打包步骤。
  assert.equal(process.cwd(), cwdBefore, "删除失败也必须恢复原 cwd");
  // 四、同一个目标在正常钩子下仍可删除（证明上面两次是真的被 PARENT_CD_FAILED 拦住，而不是路径本身不合法）。
  const removed = runner.deleteOwnedLockChild({ safeRoot: ws, parentDir: parent, childName: "batch.lock" });
  assert.equal(removed.removed, "./batch.lock");
  assert.ok(!fs.existsSync(lockDir));
});

test("runner: 确认期间锁被顶替（指纹变了）旧确认作废、零删除，新活动锁原样保留", t => {
  const ws = makeWorkspace(t);
  const oldLock = plantBatchLock(ws, { pid: deadProcessPid(), entry: "one", batchId: "old-batch-1", startedAt: "2026-10-28T05:00:00.000Z", root: ws }, { ageMs: 5 * 60 * 1000 });
  const evidence = runner.collectLockEvidence(oldLock);
  const verdict = runner.classifyStaleLock(oldLock);
  assert.equal(verdict.action, "ask", "ESRCH 死亡硬依据可以进入确认");
  assert.equal(runner.verifyLockDeletionTarget(oldLock, evidence, verdict).ok, true, "仍是刚才那把锁时复核必须通过");
  // 等待确认期间原批退出、另一个活动批取得了同名新锁（真实竞争形态）。
  fs.rmSync(oldLock, { recursive: true, force: true });
  const fresh = plantBatchLock(ws, { pid: process.pid, entry: "one", batchId: "new-live-batch", startedAt: new Date().toISOString(), root: ws });
  const check = runner.verifyLockDeletionTarget(fresh, evidence, verdict);
  assert.equal(check.ok, false, "目标已换人：旧确认绝不能删这把新锁");
  assert.equal(check.changed, true, "必须如实报“已不是判定/确认时的那把锁”");
  assert.ok(fs.existsSync(path.join(fresh, "owner.json")), "新锁必须原样保留");
  assert.equal(JSON.parse(fs.readFileSync(path.join(fresh, "owner.json"), "utf8")).batchId, "new-live-batch");
  assert.equal(runner.classifyStaleLock(fresh).action, "block", "换成存活属主且未达阈值必须回到阻塞");
});

test("runner: 删锁确认次数是命名策略开关，本轮固定两次并留下用户原话依据", t => {
  assert.equal(runner.LOCK_DELETE_CONFIRMATIONS, 2, "本轮契约「B，加一次确认」= 两次明确确认");
  const source = fs.readFileSync(RUNNER, "utf8");
  const declared = source.match(/const LOCK_DELETE_CONFIRMATIONS = (\d+);/);
  assert.ok(declared, "确认次数必须是命名常量");
  assert.equal(Number(declared[1]), 2);
  assert.match(source, /B，加一次确认/, "常量旁必须留下用户原话依据");
  assert.match(source, /非交互入口（无 TTY、stdin 用于取消控制、CI）在任何取值下都不算确认/);
  assert.ok((source.match(/LOCK_DELETE_CONFIRMATIONS/g) || []).length >= 5,
    "确认次数只能由这一个常量驱动，不许别处另开旁路");
  const confirmBody = source.slice(source.indexOf("function confirmLockDeletion"), source.indexOf("async function acquireLock"));
  assert.equal(confirmBody.includes("rmSync"), false, "确认环节只做问答与核验，删除只在双确认+复核通过之后由删除纪律执行");
});

test("runner: inner failure keeps real non-zero exit and complete exclusive logs", async t => {
  const ws = makeWorkspace(t);
  fs.writeFileSync(path.join(ws, "test", "bad.js"), 'console.log("OUT-SENTINEL-77-full-output");console.error("ERR-SENTINEL-77-full-output");process.exit(1);\n');
  const manifest = writeManifest(ws, baseManifest(ws, { one: { phases: { fullCheck: { extraFiles: [{ file: "test/bad.js", argv: [], source: "f" }] } } } }, ["test/bad.js"]));
  const run = runRunner(ws, manifest, "one");
  assert.notEqual(run.status, 0, "outer entry propagates failure as non-zero");
  assert.match(run.stdout, /OUT-SENTINEL-77-full-output/);
  assert.match(run.stdout, /ERR-SENTINEL-77-full-output/);
  const rec = receipt(ws, "one");
  assert.equal(rec.overall, "failed");
  assert.equal(rec.jobs[0].exitCode, 1);
  assert.match(fs.readFileSync(rec.jobs[0].outLog, "utf8"), /OUT-SENTINEL-77-full-output/);
  assert.match(fs.readFileSync(rec.jobs[0].errLog, "utf8"), /ERR-SENTINEL-77-full-output/);
});

test("runner: exclusive-log collision cannot be overwritten and fails closed", async t => {
  const ws = makeWorkspace(t);
  const job = makeJob(ws, "dup", {});
  const manifest = writeManifest(ws, baseManifest(ws, { one: { phases: { fullCheck: { extraFiles: [{ file: job, argv: [], source: "f" }] } } } }, [job]));
  const logDir = path.join(ws, "fixedlogs");
  assert.equal(runRunner(ws, manifest, "one", ["--log-dir", logDir]).status, 0);
  const firstRun = fs.readFileSync(path.join(logDir, "run.json"), "utf8");
  const again = runRunner(ws, manifest, "one", ["--log-dir", logDir]);
  assert.notEqual(again.status, 0, "reusing a log dir must fail, not clobber evidence");
  assert.match(again.stderr, /凭据不可覆盖/);
  assert.equal(fs.readFileSync(path.join(logDir, "run.json"), "utf8"), firstRun, "original credential byte-identical");
});

test("runner: timeout is never a pass (outer kill, real non-zero)", async t => {
  const ws = makeWorkspace(t);
  const slow = makeJob(ws, "slow", { sleep: 4000 });
  const manifest = writeManifest(ws, baseManifest(ws, { one: { phases: { fullCheck: { extraFiles: [{ file: slow, argv: ["--test-timeout", "200"], source: "f" }] } } } }, [slow]));
  const run = runRunner(ws, manifest, "one");
  assert.notEqual(run.status, 0);
  const rec = receipt(ws, "one");
  assert.equal(rec.jobs[0].status, "timeout");
  assert.equal(rec.jobs[0].treeStatus, "confirmed", "own tree kill must be confirmed");
  assert.equal(rec.overall, "failed");
});

test("runner: cancellation is non-pass; launched children settle and die; no new gates start", async t => {
  const ws = makeWorkspace(t), mark = path.join(ws, "mark.log");
  fs.writeFileSync(path.join(ws, "postgate.js"), 'require("node:fs").appendFileSync(process.env.POSTMARK||"/dev/null","RAN\\n");\n');
  const slow = makeJob(ws, "slow", { sleep: 5000, mark });
  const manifest = writeManifest(ws, baseManifest(ws, {
    one: { phases: { fullCheck: { extraFiles: [{ file: slow, argv: [], source: "f" }] } }, post: { gates: ["node postgate.js"] } } },
  [slow]));
  /* r28 U2 裁定：Windows 强杀(TerminateProcess)不承诺 JS 收尾，取消结算凭据从未写出（job-218 ENOENT 已证）。
   * 同一 testID 全部断言保留：POSIX 仍走原 SIGTERM 信号路径验证；win32 用真实管道发送合作取消并结束 stdin
   * （--cancel-stdin opt-in 入口），两端都走真实进程，不用 process.emit 冒充 OS 取消。 */
  const viaStdin = process.platform === "win32";
  const child = spawn(process.execPath, [RUNNER, "one", "--root", ws, "--manifest", manifest, ...(viaStdin ? ["--cancel-stdin"] : [])], { stdio: "pipe", windowsHide: true, env: { ...process.env, POSTMARK: path.join(ws, "post-ran.log") } });
  const deadline = Date.now() + 8000;
  while (!(fs.existsSync(mark) && fs.readFileSync(mark, "utf8").includes("start")) && Date.now() < deadline) await new Promise(r => setTimeout(r, 50));
  if (viaStdin) { child.stdin.write("cancel\n"); child.stdin.end(); } else child.kill("SIGTERM");
  const code = await new Promise(resolve => child.on("close", resolve));
  assert.notEqual(code, 0, "cancelled batch exits non-zero");
  const rec = receipt(ws, "one");
  assert.equal(rec.overall, "cancelled");
  assert.equal(rec.jobs.length, 1, "launched child recorded and settled");
  assert.equal(rec.jobs[0].status, "cancelled");
  await new Promise(r => setTimeout(r, 300));
  assert.ok(!fs.readFileSync(mark, "utf8").includes("end"), "killed child never finishes (tree kill effective)");
  assert.ok(!fs.existsSync(path.join(ws, "post-ran.log")), "no gate starts after cancel (R29 #7)");
});

/* r28 U2（主控批准接口）：--cancel-stdin 显式合作取消入口——两平台都以真实进程验证（非 process.emit 冒充），
 * 并确认取消时真实已启动树的结算状态为 confirmed。等待/收尾沿用上方同一取消用例的既有模式，未新增期限。 */
test("runner: --cancel-stdin triggers the identical cancel settlement on both platforms (tree confirmed)", async t => {
  const ws = makeWorkspace(t), mark = path.join(ws, "mark.log");
  fs.writeFileSync(path.join(ws, "postgate.js"), 'require("node:fs").appendFileSync(process.env.POSTMARK||"/dev/null","RAN\\n");\n');
  const slow = makeJob(ws, "slow", { sleep: 5000, mark });
  const manifest = writeManifest(ws, baseManifest(ws, {
    one: { phases: { fullCheck: { extraFiles: [{ file: slow, argv: [], source: "f" }] } }, post: { gates: ["node postgate.js"] } } },
  [slow]));
  const child = spawn(process.execPath, [RUNNER, "one", "--root", ws, "--manifest", manifest, "--cancel-stdin"], { stdio: "pipe", windowsHide: true, env: { ...process.env, POSTMARK: path.join(ws, "post-ran.log") } });
  const deadline = Date.now() + 8000;
  while (!(fs.existsSync(mark) && fs.readFileSync(mark, "utf8").includes("start")) && Date.now() < deadline) await new Promise(r => setTimeout(r, 50));
  child.stdin.write("can"); // 分块到达（"can"|"cel\n"）仍须识别为一行 cancel
  await new Promise(r => setTimeout(r, 20));
  child.stdin.write("cel\n");
  child.stdin.end(); // 正常 EOF：EOF 本身不得触发取消，行内容才是唯一触发（无任意命令接口）
  const code = await new Promise(resolve => child.on("close", resolve));
  assert.notEqual(code, 0, "stdin-cancelled batch exits non-zero");
  const rec = receipt(ws, "one");
  assert.equal(rec.overall, "cancelled");
  assert.equal(rec.jobs.length, 1, "launched child recorded and settled");
  assert.equal(rec.jobs[0].status, "cancelled");
  assert.equal(rec.jobs[0].treeStatus, "confirmed", "launched tree settlement must be confirmed after stdin cancel");
  await new Promise(r => setTimeout(r, 300));
  assert.ok(!fs.readFileSync(mark, "utf8").includes("end"), "killed child never finishes (tree kill effective)");
  assert.ok(!fs.existsSync(path.join(ws, "post-ran.log")), "no gate starts after cancel");
});

test("runner: without --cancel-stdin stdin is never read — a cancel line must not affect the batch (opt-in)", async t => {
  const ws = makeWorkspace(t);
  const quick = makeJob(ws, "quick", { sleep: 300 });
  const manifest = writeManifest(ws, baseManifest(ws, { one: { phases: { fullCheck: { extraFiles: [{ file: quick, argv: [], source: "f" }] } } } }, [quick]));
  const child = spawn(process.execPath, [RUNNER, "one", "--root", ws, "--manifest", manifest], { stdio: "pipe", windowsHide: true });
  child.stdin.write("cancel\n"); // 未加 flag ⇒ 绝不读取/抢占 stdin，也绝不取消
  const code = await new Promise(resolve => child.on("close", resolve));
  assert.equal(code, 0, "default batch must ignore stdin entirely");
  assert.equal(receipt(ws, "one").overall, "passed");
});

test("runner: mid-run input drift invalidates the batch (no passed credential from a mutated tree, R29 #5)", async t => {
  const ws = makeWorkspace(t), mark = path.join(ws, "mark.log");
  fs.mkdirSync(path.join(ws, "src"));
  fs.writeFileSync(path.join(ws, "src", "a.js"), "module.exports=1;\n");
  const slow = makeJob(ws, "slow", { sleep: 1200, mark, envDump: true });
  const manifest = writeManifest(ws, baseManifest(ws, { one: { phases: { fullCheck: { extraFiles: [{ file: slow, argv: [], source: "f" }] } } } }, [slow]));
  const child = spawn(process.execPath, [RUNNER, "one", "--root", ws, "--manifest", manifest], { stdio: "pipe", windowsHide: true });
  const deadline = Date.now() + 8000;
  while (!(fs.existsSync(mark) && fs.readFileSync(mark, "utf8").includes("start")) && Date.now() < deadline) await new Promise(r => setTimeout(r, 50));
  fs.writeFileSync(path.join(ws, "src", "a.js"), "module.exports=2; // drifted mid-run\n");
  const code = await new Promise(resolve => child.on("close", resolve));
  assert.notEqual(code, 0, "drifted tree must not yield exit 0");
  const rec = receipt(ws, "one");
  assert.equal(rec.overall, "invalidated");
  assert.notEqual(rec.inputFingerprint, rec.endFingerprint);
});

test("runner: dedup by identity+argv matrix; identical sources recorded once", async t => {
  const ws = makeWorkspace(t);
  const shared = makeJob(ws, "shared", {});
  const manifest = writeManifest(ws, {
    schemaVersion: 1, compileGates: [], batchDefaults: { maxParallel: 2, killGraceMs: 2000 },
    domains: {
      d1: { sourceScript: "node --test test/shared.js" },
      d2: { sourceScript: "node --test test/shared.js" },
      d3: { sourceScript: "node --test --test-force-exit test/shared.js" },
    },
    entries: { one: { phases: { fullCheck: { domains: ["d1", "d2", "d3"] } } } },
    classification: { mode: "attested-whitelist", parallel: attestIn(ws, [shared]), exclusive: {} },
  });
  const run = runRunner(ws, manifest, "one");
  assert.equal(run.status, 0, run.stdout + run.stderr);
  const rec = receipt(ws, "one");
  assert.equal(rec.jobs.length, 2);
  assert.equal(rec.dedup.duplicatesRemoved, 1);
  assert.equal(rec.jobs.find(j => j.argv.length === 0).sources.length, 2);
});

test("runner: assemble refuses empty/short receipts item-by-item, accepts fresh full credentials from either source entry (R29 #5)", async t => {
  const ws = makeWorkspace(t);
  fs.writeFileSync(path.join(ws, "asmgate.js"), "console.log(\"ASM-DONE\");\n");
  fs.mkdirSync(path.join(ws, "scripts"));
  fs.writeFileSync(path.join(ws, "scripts", "pkggate.js"), "console.log(\"PKG-GATE-OK\");\n");
  const job = makeJob(ws, "jp", {});
  const manifest = writeManifest(ws, {
    schemaVersion: 1, compileGates: ["node scripts/pkggate.js"], batchDefaults: { maxParallel: 2, killGraceMs: 2000 }, domains: {},
    entries: {
      pkg: { phases: { compile: { gates: "@compile" }, fullCheck: { extraFiles: [{ file: job, argv: [], source: "f" }] } } },
      cfull: { phases: { fullCheck: { extraFiles: [{ file: job, argv: [], source: "f" }] } } },
      asm: { requiresReceiptForEntry: ["pkg", "cfull"], phases: { post: { gates: ["node asmgate.js"] } } },
    },
    classification: { mode: "attested-whitelist", parallel: attestIn(ws, [job]), exclusive: {} },
  });
  assert.match(runRunner(ws, manifest, "asm").stderr, /refused/, "missing credential ⇒ refuse");
  assert.equal(runRunner(ws, manifest, "pkg").status, 0);
  const ok = runRunner(ws, manifest, "asm");
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  assert.match(ok.stdout, /credential validated/);
  const asmRec = receipt(ws, "asm");
  assert.match(fs.readFileSync(asmRec.gates[0].outLog, "utf8"), /ASM-DONE/);

  const pointer = JSON.parse(fs.readFileSync(path.join(ws, "simple_cluster", "reports", "test-workflow", "last-pkg.json"), "utf8"));
  const good = JSON.parse(fs.readFileSync(pointer.runReceipt, "utf8"));
  assert.ok(good.overall === "passed" && good.entry === "pkg");
  const craft = (name, mutate) => {
    const bad = JSON.parse(JSON.stringify(good));
    mutate(bad);
    const p = path.join(ws, `craft-${name}.json`);
    fs.writeFileSync(p, JSON.stringify(bad));
    return ["--receipt", p];
  };
  assert.match(runRunner(ws, manifest, "asm", craft("nojobs", r => { r.jobs = []; })).stderr, /no job evidence/, "empty jobs array must not pass");
  assert.match(runRunner(ws, manifest, "asm", craft("nogates", r => { r.gates = []; })).stderr, /missing-gate/, "gates required by the current plan must be evidenced");
  assert.match(runRunner(ws, manifest, "asm", craft("dropjob", r => { r.jobs[0].identity = "/nowhere/other.js"; })).stderr, /refused|missing-job/, "receipt not covering the current file matrix must fail");
  assert.match(runRunner(ws, manifest, "asm", craft("filemismatch", r => { r.jobs[0].file = "test/other.js"; })).stderr, /file-mismatch/, "row file must equal the planned file");
  assert.match(runRunner(ws, manifest, "asm", craft("compiledonly", r => { r.candidate.state = "compiled"; })).stderr, /candidate state=compiled/, "compiled-only candidate must not assemble (r24 #3)");
  const asmRun2 = runRunner(ws, manifest, "asm");
  assert.equal(asmRun2.status, 0, asmRun2.stdout + asmRun2.stderr);
  const asmRec2 = JSON.parse(fs.readFileSync(JSON.parse(fs.readFileSync(path.join(ws, "simple_cluster", "reports", "test-workflow", "last-asm.json"), "utf8")).runReceipt, "utf8"));
  assert.ok(!asmRec2.phaseWalls.some(p => p.phase === "compile"), "assemble path never recompiles (r24 #3)");
  fs.writeFileSync(path.join(ws, "test", "jp.js"), fs.readFileSync(path.join(ws, "test", "jp.js"), "utf8") + "// stale\n");
  assert.match(runRunner(ws, manifest, "asm").stderr, /fingerprint/, "stale inputs refuse assembly");

  // check:full credential must be accepted once it passes fresh (R29 #5 真正可用)
  const cfull = runRunner(ws, manifest, "cfull");
  assert.equal(cfull.status, 0, cfull.stdout + cfull.stderr);
  const viaFull = runRunner(ws, manifest, "asm");
  assert.equal(viaFull.status, 0, viaFull.stdout + viaFull.stderr);
  assert.match(viaFull.stdout, /credential validated/, "current check:full credential satisfies assembly");
});

/* r27 必修回归：Native 根历史包并存是现存输入。组装阶段 verify-vsix-manifest 门必须显式消费
 * 本批 vsce 成功输出确切路径（name-version 绑定），不得目录泛扫；解析/绑定失败明确非零。 */
function makeStoredZip(file, names) {
  const chunks = [], central = []; let off = 0;
  for (const item of names) { // 字符串条目：正文 "{}"；{name,data} 条目：写入指定正文（r77 正文门）
    const n = typeof item === "string" ? item : item.name;
    const nb = Buffer.from(n, "utf8"), data = Buffer.from(typeof item === "string" ? "{}" : item.data, "utf8");
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(nb.length, 26);
    chunks.push(lh, nb, data);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(nb.length, 28); ch.writeUInt32LE(off, 42);
    central.push(Buffer.concat([ch, nb]));
    off += 30 + nb.length + data.length;
  }
  const body = Buffer.concat(chunks), cd = Buffer.concat(central);
  const eocd = Buffer.alloc(22); eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(names.length, 8); eocd.writeUInt16LE(names.length, 10); eocd.writeUInt32LE(cd.length, 12); eocd.writeUInt32LE(body.length, 16);
  fs.writeFileSync(file, Buffer.concat([body, cd, eocd]));
}

test("r27 assemble verify gate consumes the exact vsce-packaged path; never directory-scans", async t => {
  const ws = makeWorkspace(t);
  fs.writeFileSync(path.join(ws, "package.json"), JSON.stringify({ name: "fixture-pkg", version: "9.9.9", scripts: {} }));
  fs.mkdirSync(path.join(ws, "scripts"), { recursive: true });
  for (const f of ["verify-vsix-manifest.js", "package-content-policy.js", "package-content-policy.json", "package-minimal-readme.js"]) fs.copyFileSync(path.join(REPO, "scripts", f), path.join(ws, "scripts", f));
  fs.writeFileSync(path.join(ws, "vsce-mock.js"), 'console.log(process.env.MOCK_VSCE_OUT || "Packaged: fixture-pkg-9.9.9.vsix");\n');
  const { REQUIRED } = require(path.join(REPO, "scripts", "package-content-policy.js"));
  // r77 正文门：合规包必须含唯一 extension/readme.md，正文与 verify 门按夹具根 package.json 生成的最小文本逐字节一致（单源复用，不手抄）。
  const { generateMinimalReadmeText } = require(path.join(REPO, "scripts", "package-minimal-readme.js"));
  const readmeEntry = { name: "extension/readme.md", data: generateMinimalReadmeText(JSON.parse(fs.readFileSync(path.join(ws, "package.json"), "utf8"))) };
  const compliant = () => [...REQUIRED, readmeEntry];
  makeStoredZip(path.join(ws, "fixture-pkg-9.9.9.vsix"), compliant()); // 当前包：合规（含单条与生成文本一致的 extension/readme.md）
  makeStoredZip(path.join(ws, "fixture-pkg-9.9.8.vsix"), [...compliant(), ".test-workflow-batch.lock/owner.json"]); // 历史旧包：带泄漏，泛扫必误报
  makeStoredZip(path.join(ws, "legacy-other.vsix"), compliant()); // 反例1用：实存但 name-version 不符的"错误当前包"
  const manifest = writeManifest(ws, {
    schemaVersion: 1, compileGates: [], domains: {}, batchDefaults: { maxParallel: 2, killGraceMs: 2000 },
    entries: { inj: { phases: { assemble: { gates: ["node vsce-mock.js", "node scripts/verify-vsix-manifest.js"] } } } },
    classification: { mode: "attested-whitelist", parallel: [], exclusive: {} },
  });
  // 正向：旧+当前并存 ⇒ 通过，且 verify 门命令显式携带本批 --vsix 路径（非泛扫）
  const ok = runRunner(ws, manifest, "inj");
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  const rec = receipt(ws, "inj");
  const vg = rec.gates.find(g => g.cmd.includes("verify-vsix-manifest"));
  assert.ok(vg.passed);
  assert.match(vg.command, /--vsix .*fixture-pkg-9\.9\.9\.vsix$/, "verification must consume the exact packaged path");
  assert.match(fs.readFileSync(vg.outLog, "utf8"), /leakHits=0/);
  assert.match(fs.readFileSync(vg.outLog, "utf8"), /fixture-pkg-9\.9\.9\.vsix/);
  // 反例1：vsce 日志路径与当前 name-version 不符 ⇒ 明确非零且给出绑定原因（不运行脚本）
  const bad = runRunner(ws, manifest, "inj", [], { ...process.env, MOCK_VSCE_OUT: "Packaged: legacy-other.vsix" });
  assert.notEqual(bad.status, 0, "wrong packaged basename must refuse");
  const recB = receipt(ws, "inj");
  const vgB = recB.gates.find(g => g.cmd.includes("verify-vsix-manifest"));
  assert.equal(vgB.passed, false);
  assert.match(vgB.refusal || "", /does not bind current name-version/);
  // 反例2：vsce 日志无 Packaged 路径 ⇒ unresolvable 非零
  const bad2 = runRunner(ws, manifest, "inj", [], { ...process.env, MOCK_VSCE_OUT: "done, no path printed" });
  assert.notEqual(bad2.status, 0);
  const vgC = receipt(ws, "inj").gates.find(g => g.cmd.includes("verify-vsix-manifest"));
  assert.match(vgC.refusal || "", /unresolvable|no passed vsce/);

  /* r77 打包合规正文门：包内 extension/readme.md 必须恰为一条且与同源最小生成文本逐字节一致；
   * 旧完整指南正文/缺失/readme 名多条（含大小写变体并存）一律拒绝，恢复合规后同门复绿（非粘滞）。
   * 诊断只输出路径与判定名，绝不输出正文。 */
  const guideSecret = "COMPLETE-GUIDE-BODY-SECRET-DO-NOT-LEAK";
  makeStoredZip(path.join(ws, "fixture-pkg-9.9.9.vsix"), [...REQUIRED, { name: "extension/readme.md", data: `# 完整用户指南\n${guideSecret}\n` }]);
  const badGuide = runRunner(ws, manifest, "inj");
  assert.notEqual(badGuide.status, 0, "stale full-guide readme body must refuse");
  const vgGuide = receipt(ws, "inj").gates.find(g => g.cmd.includes("verify-vsix-manifest"));
  assert.equal(vgGuide.passed, false);
  const guideLog = fs.readFileSync(vgGuide.outLog, "utf8");
  assert.match(guideLog, /README-CONTENT-MISMATCH extension\/readme\.md/);
  assert.ok(!guideLog.includes(guideSecret), "diagnostics must print path only, never readme body");
  makeStoredZip(path.join(ws, "fixture-pkg-9.9.9.vsix"), [...REQUIRED]); // 无任何 readme 条目
  const badMissing = runRunner(ws, manifest, "inj");
  assert.notEqual(badMissing.status, 0, "missing package readme entry must refuse");
  const vgMissing = receipt(ws, "inj").gates.find(g => g.cmd.includes("verify-vsix-manifest"));
  assert.equal(vgMissing.passed, false);
  assert.match(fs.readFileSync(vgMissing.outLog, "utf8"), /MISSING-README extension\/readme\.md/);
  makeStoredZip(path.join(ws, "fixture-pkg-9.9.9.vsix"), [...REQUIRED, { name: "extension/README.md", data: readmeEntry.data }, readmeEntry]); // 旧指南副本位+生成副本：大小写变体并存
  const badDup = runRunner(ws, manifest, "inj");
  assert.notEqual(badDup.status, 0, "duplicate root readme entries (case-variant) must refuse");
  const vgDup = receipt(ws, "inj").gates.find(g => g.cmd.includes("verify-vsix-manifest"));
  assert.equal(vgDup.passed, false);
  assert.match(fs.readFileSync(vgDup.outLog, "utf8"), /DUPLICATE-README 2 root readme entries/);
  makeStoredZip(path.join(ws, "fixture-pkg-9.9.9.vsix"), compliant()); // 恢复合规：同门复绿，判定非粘滞
  const okAgain = runRunner(ws, manifest, "inj");
  assert.equal(okAgain.status, 0, okAgain.stdout + okAgain.stderr);
});

test("r24 compile cache: cold→hit, input/config/toolchain drift, missing/tampered outputs force rebuild (R24 #2/#5)", async t => {
  const ws = makeWorkspace(t);
  fs.mkdirSync(path.join(ws, "src"));
  fs.writeFileSync(path.join(ws, "tsconfig.json"), JSON.stringify({ compilerOptions: { rootDir: "src", outDir: "dist", module: "CommonJS", target: "ES2022", strict: true }, include: ["src/**/*.ts"] }));
  const src = path.join(ws, "src", "a.ts");
  fs.writeFileSync(src, "export const x: number = 1;\n");
  const TSC = path.join(REPO, "scripts", "tsc-cached.js");
  const runTsc = () => spawnSync(process.execPath, [TSC, "--root", ws], { cwd: ws, encoding: "utf8", timeout: 120000 });
  const line = (out, key) => (out.match(new RegExp(key + "=(\\S+)")) || [])[1];
  const r1 = runTsc();
  assert.equal(r1.status, 0, r1.stdout + r1.stderr);
  const p1 = line(r1.stdout, "partition");
  assert.equal(line(r1.stdout, "mode"), "cold");
  assert.equal(line(r1.stdout, "missReason"), "no-state");
  assert.match(r1.stdout, /emitted=[1-9]/, "cold build really emits");
  assert.ok(fs.existsSync(path.join(ws, "dist", "a.js")), "tsc output materialized");
  const r2 = runTsc();
  assert.equal(r2.status, 0, r2.stdout + r2.stderr);
  assert.equal(line(r2.stdout, "partition"), p1, "same inputs ⇒ same partition");
  assert.equal(line(r2.stdout, "mode"), "incremental");
  assert.equal(line(r2.stdout, "missReason"), "none");
  assert.match(r2.stdout, /emitted=0/, "hit = native up-to-date, zero emits (no fake gain)");
  fs.writeFileSync(src, "export const x: number = 2;\n"); // 源漂移
  const r3 = runTsc();
  const p3 = line(r3.stdout, "partition");
  // 片1契约（主控 2026-10-26 批准）：源码内容不进兼容分区 ⇒ 源漂移不换分区、不强制冷编译；
  // 防陈旧输出的保护＝增量必须真实重编译＋产物字节更新＋state 全量输入身份漂移记录。
  assert.equal(line(r3.stdout, "mode"), "incremental");
  assert.equal(line(r3.stdout, "partition"), p1, "source content drift keeps the compat partition (incremental, not cold, owns source drift)");
  assert.match(r3.stdout, /emitted=[1-9]/);
  assert.match(fs.readFileSync(path.join(ws, "dist", "a.js"), "utf8"), /= 2/, "incremental recompile really refreshed the artifact (no stale output reuse)");
  const st3 = JSON.parse(fs.readFileSync(path.join(ws, "simple_cluster", "cache", "tsc", p3, "state.json"), "utf8"));
  assert.equal(st3.inputDrift && st3.inputDrift.changed, true, "full input identity drift must be recorded in state (verify-only gate input)");
  fs.writeFileSync(path.join(ws, "tsconfig.json"), JSON.stringify({ compilerOptions: { rootDir: "src", outDir: "dist", module: "CommonJS", target: "ES2022", strict: false }, include: ["src/**/*.ts"] }));
  const r4 = runTsc();
  assert.notEqual(line(r4.stdout, "partition"), p3, "effective config drift ⇒ new partition");
  // 工具链状态冒充（state 被改成别的平台/架构记录）不得命中
  const cacheBase = path.join(ws, "simple_cluster", "cache", "tsc");
  const p4 = line(r4.stdout, "partition");
  runTsc(); // 建立 p4 热态
  const stPath = path.join(cacheBase, p4, "state.json");
  const st = JSON.parse(fs.readFileSync(stPath, "utf8"));
  st.toolchain.arch = "sparc64";
  fs.writeFileSync(stPath, JSON.stringify(st));
  const r5 = runTsc();
  assert.equal(line(r5.stdout, "mode"), "cold");
  assert.match(r5.stdout, /missReason=toolchain\/state-mismatch/);
  // tsbuildinfo 在但 JS 丢失 → 必须重建（原生 up-to-date 不得掩盖缺产物）
  const r6 = runTsc(); const p6 = line(r6.stdout, "partition");
  assert.equal(line(r6.stdout, "mode"), "incremental", "r5 rebuild completed ⇒ r6 is a genuine hit");
  assert.match(r6.stdout, /emitted=0/);
  fs.rmSync(path.join(ws, "dist", "a.js"));
  const r7 = runTsc();
  assert.equal(line(r7.stdout, "mode"), "cold");
  assert.match(r7.stdout, /missReason=output-drift/);
  assert.equal(line(r7.stdout, "mode"), "cold", "output drift ⇒ cold rebuild in a re-sealed partition");
  assert.ok(fs.existsSync(path.join(ws, "dist", "a.js")), "missing output restored by rebuild");
  const sealed = fs.readdirSync(cacheBase).filter(n => n.includes(".stale-"));
  assert.equal(sealed.length, 1, "stale partition retained as evidence, never deleted");
  // 同长度篡改字节也必须被 sha 校验抓住
  const good = fs.readFileSync(path.join(ws, "dist", "a.js"));
  runTsc(); // 热态
  runTsc();
  fs.writeFileSync(path.join(ws, "dist", "a.js"), Buffer.from(good).map((b, i) => i === 0 ? b ^ 0x20 : b));
  const r9 = runTsc();
  assert.match(r9.stdout, /missReason=output-drift/);
  assert.equal(line(r9.stdout, "mode"), "cold");
  assert.ok(fs.readFileSync(path.join(ws, "dist", "a.js")).equals(good), "rebuilt bytes equal original tsc output");
  // r27 必须返修: 已有 complete state 的二次正常编译生成旧状态备份——自产 ISO 时间戳冒号在
  // Windows 是非法文件名字符（EINVAL），首次冷编译→暖完整 package 必走此分支。备份 basename
  // 必须 Windows 合法（无冒号）、真实生成、且备份路径不触碰编译输出字节。
  const p9 = line(r9.stdout, "partition");
  const beforeBackup = fs.readFileSync(path.join(ws, "dist", "a.js"));
  const r10 = runTsc();
  assert.equal(r10.status, 0, r10.stdout + r10.stderr);
  assert.equal(line(r10.stdout, "mode"), "incremental", "r9 rebuild completed ⇒ r10 normal warm compile");
  const backups = fs.readdirSync(path.join(cacheBase, p9)).filter(n => n.startsWith("state-complete-"));
  assert.ok(backups.length >= 1, "prior complete state must be retained as backup on normal recompile");
  for (const b of backups) assert.doesNotMatch(b, /:/, `Windows-illegal colon in archive name: ${b}`);
  assert.ok(fs.readFileSync(path.join(ws, "dist", "a.js")).equals(beforeBackup), "backup bookkeeping must not alter emitted bytes");
});

test("r24 npm download cache env + candidate gating in receipts (R24 #1/#3)", async t => {
  const ws = makeWorkspace(t);
  fs.writeFileSync(path.join(ws, "package.json"), JSON.stringify({ name: "fixture", scripts: { cachecheck: "node -e \"console.log(process.env.npm_config_cache)\"" } }));
  fs.writeFileSync(path.join(ws, "cgate.js"), "console.log(" + JSON.stringify("CG-OK") + ");\n");
  const manifest = writeManifest(ws, {
    schemaVersion: 1, compileGates: ["npm run cachecheck", "node cgate.js"], batchDefaults: { maxParallel: 2, killGraceMs: 2000 }, domains: {},
    entries: { cmp: { phases: { compile: { gates: "@compile" } } } },
    classification: { mode: "attested-whitelist", parallel: [], exclusive: {} },
  });
  const run = runRunner(ws, manifest, "cmp");
  assert.equal(run.status, 0, run.stdout + run.stderr);
  const rec = receipt(ws, "cmp");
  const npmGate = rec.gates.find(g => g.cmd === "npm run cachecheck");
  const cacheUsed = fs.readFileSync(npmGate.outLog, "utf8").trim().split("\n").filter(Boolean).pop();
  assert.ok(cacheUsed.endsWith(path.join("simple_cluster", "cache", "npm")), `npm_config_cache=${cacheUsed}`);
  assert.ok(fs.existsSync(cacheUsed), "cache dir materialized (writable persistent location)");
  assert.equal(rec.candidate.state, "compiled", "compile-only entry may only claim compiled");
  assert.ok(!("packaged" in rec.candidate), "no vsce in this entry ⇒ no packaged claim");
});

test("runner: vsce resolves through installed bin metadata, never a guessed shim (R29 #6)", async t => {
  const ws = makeWorkspace(t);
  const pkgDir = path.join(ws, "node_modules", "@vscode", "vsce");
  fs.mkdirSync(pkgDir, { recursive: true });
  fs.writeFileSync(path.join(pkgDir, "package.json"), JSON.stringify({ name: "@vscode/vsce", bin: { vsce: "cli.js" } }));
  fs.writeFileSync(path.join(pkgDir, "cli.js"), "console.log(\"VSCE-META-OK\", ...process.argv.slice(2));\n");
  const resolved = runner.resolveStepCommand(ws, ["vsce", "package"]);
  assert.equal(resolved.command, process.execPath, "must run via process.execPath");
  assert.ok(resolved.args[0].endsWith(path.join("@vscode", "vsce", "cli.js")));
  assert.equal(resolved.viaPackageBin, "@vscode/vsce");
  assert.throws(() => runner.resolveStepCommand(ws, ["totally-unknown-bin", "x"]), /refusing to guess/);
  const real = runner.resolveStepCommand(REPO, ["vsce", "--version"]);
  assert.equal(real.viaPackageBin, "@vscode/vsce", "real repo @vscode/vsce bin metadata resolves");
});

/* 2026-10-24 用户契约：真实仓库对账禁止无业务依据的固定清单总数门禁（禁止 218/219、>=798 这类数字，
 * 也禁止放宽成 >= 或用 actual.length 自证）。expected 只从受审 manifest 的 sourceScript/extraFiles/globs
 * 定义独立展开（下方 canonical* 按 manifest 文档化窄语法自实现，不 import 被测 planner 的展开代码，
 * 不从 planEntry/dry-run 输出反造）；再与 planEntry 实际输出双向对账：遗漏、多余、重复、空集一律失败。
 * 窄语法依据（与 manifest notes 同源，仅覆盖当前受审形态，出现任何未知形态 fail closed 抛错）：
 *  step = body.split(" && ")；`npm run X` X∈domains 则递归否则是 gate；`node --test …` argv 仅
 *  --test-timeout/--test-name-pattern/--test-reporter 带值、其余 --* 为裸 flag、非 -- token 为文件；
 *  含 * 的文件按窄 glob 展开（仅双星号目录段与段内单星）；prereq hoist 与其余 step 不产 job。 */
function canonicalTokenize(rest) {
  // 窄 argv 白名单 = 当前实际获准的 manifest 形态（2026-10-24 统计：取值选项仅 --test-timeout 在用，
  // 裸 flag 仅 --test-force-exit 在用）；其余任何形态 fail closed：
  //   取值选项（--test-timeout/--test-name-pattern/--test-reporter）的值必须存在、非空且不以 - 开头；
  //   未知 --flag 拒绝（不静默入 argv）；文件 token 不得含引号/=/shell 元字符（与生产 assertSafeShell 同族但独立实现）。
  const VALUE_FLAGS = ["--test-timeout", "--test-name-pattern", "--test-reporter"];
  const BARE_FLAGS = ["--test-force-exit"];
  const argv = [], files = [];
  const tokens = rest.trim().split(/\s+/);
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (VALUE_FLAGS.includes(tok)) {
      const val = tokens[++i];
      if (!val || val.startsWith("-")) throw new Error(`canonical argv: ${tok} requires a non-empty plain value, got ${JSON.stringify(val ?? null)}`);
      argv.push(tok, val); continue;
    }
    if (tok.startsWith("--")) {
      if (!BARE_FLAGS.includes(tok)) throw new Error(`canonical argv: unknown bare flag ${JSON.stringify(tok)} (not in the approved manifest form)`);
      argv.push(tok); continue;
    }
    if (/[="'`;|<>()$&]/.test(tok)) throw new Error(`canonical argv: unsafe file token ${JSON.stringify(tok)}`);
    files.push(tok);
  }
  return { argv, files };
}
const canonicalGlobCache = new Map(); // pattern→hits：同进程盘上只读阶段的等价 memoization（多入口重复展开去重扫盘）
function canonicalGlob(pattern) {
  // 窄 glob：仅 **/ 与段内 *（当前 manifest 出现 test/**/*.test.js、test/*.test.js、test/features/*.test.js、
  // test/fileTransfer/*.test.js、test/tunnel/realtime*.test.js）；其他通配语义 ⇒ fail closed。
  if (canonicalGlobCache.has(pattern)) return canonicalGlobCache.get(pattern);
  if (/[?[\]{}]/.test(pattern)) throw new Error(`unsupported glob semantics: ${pattern}`);
  const segs = pattern.split("/");
  let source = "";
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    if (seg === "**") { if (i !== segs.length - 2) throw new Error(`unsupported ** position: ${pattern}`); source += "(?:[^/]*/)*"; continue; }
    source += seg.split("*").map(part => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[^/]*") + (i < segs.length - 1 ? "/" : "");
  }
  const re = new RegExp("^" + source + "$");
  const out = [];
  (function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) { walk(full); continue; }
      const rel = path.relative(REPO, full).split(path.sep).join("/");
      if (re.test(rel)) out.push(rel);
    }
  })(path.join(REPO, segs[0]));
  const hits = out.sort();
  canonicalGlobCache.set(pattern, hits);
  return hits;
}
const canonicalIdentity = file => {
  const abs = path.resolve(REPO, file);
  let real = abs;
  try { real = fs.realpathSync(abs); } catch { /* missing file 由 existsSync 对账拒绝 */ }
  // Windows 大小写折叠（独立规范语义：realpath→win32 统一小写→slash；不 import 被测 jobIdentity 实现）——
  // Native 根 D:/GitRepo… 含大写，planner actual 侧小写，expected 必须同规则否则全量 missing/extra。
  if (process.platform === "win32") real = real.toLowerCase();
  return real.split(path.sep).join("/");
};
function canonicalPlan(manifest, entryName) {
  const entry = manifest.entries[entryName];
  if (!entry || entry.aliasOf) throw new Error(`canonicalPlan: entry missing/alias: ${entryName}`);
  const full = (entry.phases || {}).fullCheck;
  const requested = [];
  const expandDomain = (name, chain) => {
    if (chain.slice(1, -1).includes(name)) throw new Error(`script cycle: ${chain.join(" -> ")} -> ${name}`); // 真循环 fail closed；合法菱形复用允许（与受审契约一致）
    const body = (manifest.domains[name] || {}).sourceScript;
    if (typeof body !== "string") throw new Error(`canonicalPlan: domain missing: ${name}`);
    for (const raw of body.split(" && ")) {
      const step = raw.trim();
      if (!step) continue;
      const npm = /^npm run ([a-zA-Z0-9:_-]+)$/.exec(step);
      if (npm) { if (manifest.domains[npm[1]]) expandDomain(npm[1], [...chain, name]); continue; } // 非 domain 引用 = gate，不产 job
      const t = /^node --test (.+)$/.exec(step);
      if (t) {
        const { argv, files } = canonicalTokenize(t[1]);
        for (const f of files) {
          if (f.includes("*")) for (const hit of canonicalGlob(f)) requested.push({ file: hit, argv: [...argv] });
          else requested.push({ file: f, argv: [...argv] });
        }
        continue;
      }
      if (/^(node|npm) /.test(step)) continue; // manifest 定义的 node/npm 前缀 step = 规范的非 job 产出门（gate/prereq hoist）；此处不解析其内容、不宣称任意 node/npm 已安全
      throw new Error(`canonicalPlan: unrecognized step shape in ${name}: ${step}`);
    }
  };
  if (full) {
    for (const d of full.domains || []) expandDomain(d, [entryName]);
    for (const x of full.extraFiles || []) requested.push({ file: x.file, argv: [...x.argv] });
    for (const g of full.globs || []) for (const p of g.patterns) for (const hit of canonicalGlob(p)) requested.push({ file: hit, argv: [...g.argv] });
  }
  const map = new Map();
  for (const j of requested) map.set(canonicalIdentity(j.file) + "\u0000" + j.argv.join("\u0000"), j);
  return { requestedSlots: requested.length, map };
}

test("runner: real-repo plan reconciles with an independently expanded manifest contract", () => {
  const manifestFile = path.join(REPO, "scripts", "test-workflow.json");
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  const planCache = new Map(); // 同进程同输入 memo：planEntry 对同一 (manifest,entry,opts) 是确定函数，只算一次
  const planOf = entry => {
    if (!planCache.has(entry)) planCache.set(entry, runner.planEntry(manifestFile, manifest, REPO, entry, { only: [], domains: [], root: REPO }));
    return planCache.get(entry);
  };
  const inMem = entry => {
    const plan = planOf(entry);
    return { jobs: plan.jobs.length, independent: plan.jobs.filter(j => !j.classification.exclusive).length, exclusive: plan.jobs.filter(j => j.classification.exclusive).length, dedup: plan.dedup, final: plan.final, hooksVerified: plan.hookProof };
  };
  // CLI 表面保留一次真实进程 dry-run（参数面/输出面完整），其余入口用同进程 planEntry（glob/sha 缓存共享，计划语义同一函数）
  const dry = entry => {
    const r = spawnSync(process.execPath, [RUNNER, entry, "--dry-run"], { cwd: REPO, encoding: "utf8", timeout: 60000 });
    assert.equal(r.status, 0, r.stderr);
    return JSON.parse(r.stdout);
  };
  const cli = dry("package");
  const inPackage = inMem("package");
  assert.deepEqual({ jobs: cli.jobs, dedup: cli.dedup, final: cli.final }, { jobs: inPackage.jobs, dedup: inPackage.dedup, final: inPackage.final }, "CLI and in-memory planner must agree");
  const disk = [];
  (function walk(d) { for (const n of fs.readdirSync(d)) { const f = path.join(d, n); if (fs.statSync(f).isDirectory()) walk(f); else if (n.endsWith(".test.js")) disk.push(path.relative(REPO, f).split(path.sep).join("/")); } })(path.join(REPO, "test"));
  const diskSet = new Set(disk);
  const pkg = inPackage;
  // —— 语义对账：五个权威入口的 (canonical identity + argv) 集合与独立展开完全一致（不多、不少、不重、非空）。
  // argv 参与 identity ⇒ 同文件多 argv 行（矩阵）必须与 manifest 定义逐条相等；单一总数不再是门禁。
  // 2026-10-27 契约修复（用户批准）：按需策略 ondemand-old-tests-v2（scripts/test-selection.js）把最旧候选组
  // 整体移出 plan.jobs 放进 plan.onDemandJobs（status=on_demand_not_run）＝延后启动，不是清单缺项；该策略于
  // 2026-10-26 加入，而本用例（2026-10-24）写成与剥离按需后的 plan.jobs 对齐，历史 package 批次 onDemandFileCount
  // 均为 0（scopeUnknown 命中全保护）所以从未暴露。对账基准因此改为完整计划集 = plan.jobs ∪ plan.onDemandJobs。
  // 比对键完全不变：canonical 全路径身份 + argv（win32 下 realpath 后统一小写），既未改成 basename 也未改成相对路径；
  // 期望集与实测集仍取同一次独立展开 canonicalPlan；missing 与 extra 两条断言一条不删，等式仍成立，只是基准换成并集。
  // 另加三条保护断言：两侧不得相交、并集元素数=选择前唯一集 plan.dedup.uniqueRuns、每个按需项 identity 属于并集且由清单定义。
  const expectedByEntry = {};
  for (const entry of ["package", "build", "check:full", "test", "test:features"]) {
    const exp = canonicalPlan(manifest, entry);
    assert.ok(exp.map.size > 0, `canonical expansion of ${entry} must never be empty`);
    expectedByEntry[entry] = exp;
    const plan = planOf(entry);
    const canonicalKey = (identity, argv) => identity + "\u0000" + argv.join("\u0000");
    // plan.onDemandJobs 只带 { file, argv, status }（运行器 plan 的返回形状），故按需侧身份由本用例自带的
    // 独立规范实现 canonicalIdentity(file) 还原，绝不 import 被测 jobIdentity；与 expected 侧同一规范语义。
    const onDemandKeys = new Set(plan.onDemandJobs.map(j => canonicalKey(canonicalIdentity(j.file), j.argv)));
    const map = new Map();
    for (const j of plan.jobs) {
      const key = canonicalKey(j.identity, j.argv);
      assert.ok(!map.has(key), `${entry}: planner emitted duplicate identity+argv for ${j.file}`);
      assert.ok(!onDemandKeys.has(key), `${entry}: same identity+argv appears in both plan.jobs and plan.onDemandJobs: ${j.file}`); // 保护 1：两侧不相交
      map.set(key, j);
    }
    for (const j of plan.onDemandJobs) {
      const key = canonicalKey(canonicalIdentity(j.file), j.argv);
      assert.ok(!map.has(key), `${entry}: planner emitted duplicate identity+argv for on-demand ${j.file}`);
      map.set(key, j);
    }
    // 保护 2：并集元素数必须等于选择前唯一集（按需延后不得改变唯一集大小，也不得多出或漏掉条目）。
    assert.equal(map.size, plan.dedup.uniqueRuns, `${entry}: plan.jobs ∪ plan.onDemandJobs must equal the pre-selection unique set`);
    // 保护 3：每个按需 job 的 canonical identity 必须落在并集内，且确实由 manifest 契约定义（不得凭空多出自定义项）。
    const unionIdentities = new Set([...map.keys()].map(k => k.split("\u0000")[0]));
    for (const j of plan.onDemandJobs) {
      const identity = canonicalIdentity(j.file);
      assert.ok(unionIdentities.has(identity), `${entry}: on-demand job identity absent from the union: ${j.file}`);
      assert.ok([...exp.map.keys()].some(k => k.split("\u0000")[0] === identity), `${entry}: on-demand job is not defined by the manifest contract: ${j.file}`);
    }
    const missing = [...exp.map.keys()].filter(k => !map.has(k)).map(k => exp.map.get(k).file);
    const extra = [...map.keys()].filter(k => !exp.map.has(k)).map(k => map.get(k).file);
    assert.deepEqual(missing, [], `${entry}: manifest-defined jobs missing from the plan (basis: plan.jobs ∪ plan.onDemandJobs)`);
    assert.deepEqual(extra, [], `${entry}: planned jobs not defined by the manifest contract`);
  }
  // dedup 语义：请求槽位数与去重数直接绑定独立展开（requestedSlots=展开条目数，removed=重复条目数）。
  const pkgExp = expectedByEntry.package;
  assert.equal(pkg.dedup.requestedSlots, pkgExp.requestedSlots, "package requestedSlots = canonical expansion entries (with repeats)");
  assert.equal(pkg.dedup.duplicatesRemoved, pkgExp.requestedSlots - pkgExp.map.size, "package duplicatesRemoved = canonical duplicate count");
  // 新缺陷回归必须按规范身份在 package/build/check:full 权威清单各仅出现一次（Windows 407 首跑登记后的绑定断言）
  for (const entry of ["package", "build", "check:full"]) {
    const occ = planOf(entry).jobs.filter(job => job.identity === canonicalIdentity("test/features/planRunSharedSubmission.test.js")).length; // 完整规范身份相等（win32 下 actual identity 已小写，后缀字面量会 0!==1）
    assert.equal(occ, 1, `planRunSharedSubmission must appear exactly once in ${entry}`);
  }
  assert.equal(pkg.hooksVerified.hooksVerified, "zero", "package.json hook graph must stay provable");
  assert.equal(pkg.final, true);
  // 盘上覆盖对账（替代 >=798 固定数）：每一个盘上 *.test.js 都被 test 入口规范覆盖（遗漏即失败），
  // 且 test 入口规划的每个文件真实在盘上（幽灵即失败）。本轮“原覆盖无丢失”由精确 diff（仅测试/文档，manifest 定义与旧文件未删）
  // + 本节独立集合对账共同证明；动态相等关系本身不单独防未来删文件——删除测试仍受既有“必须用户批准”流程约束。
  const testPlan = planOf("test"); // 盘上覆盖同样按完整计划集判定：按需延后仍属覆盖，不得误报成盘上文件脱离覆盖
  const testJobs = [...testPlan.jobs, ...testPlan.onDemandJobs];
  const testFileSet = new Set(testJobs.map(j => j.file));
  for (const f of disk) assert.ok(testFileSet.has(f), `disk test file dropped from test-entry coverage: ${f}`);
  for (const j of testJobs) assert.ok(fs.existsSync(path.join(REPO, j.file)), `planned file not on disk: ${j.file}`); // 幽灵检查一并覆盖按需侧（只增强不削弱）
  // 分类分区守恒（每个 job 恰属 independent/exclusive 之一侧；总数已由上方集合对账绑定规范展开）。
  assert.equal(pkg.independent + pkg.exclusive, pkg.jobs, "independent+exclusive must partition the planned jobs exactly");
  for (const [name, script] of Object.entries(JSON.parse(fs.readFileSync(path.join(REPO, "package.json"), "utf8")).scripts)) {
    const m = /^node scripts\/test-workflow\.js ([a-zA-Z0-9:_-]+)$/.exec(script);
    if (m) assert.ok(manifest.entries[m[1]], `npm entry ${name} targets a missing manifest entry`);
  }
  for (const p of manifest.classification.parallel) assert.ok(diskSet.has(p.file), `attested path no longer on disk: ${p.file}`);
  for (const p of Object.keys(manifest.classification.exclusive)) assert.ok(diskSet.has(p), `exclusive path no longer on disk: ${p}`);
});

/* r28（授权修复契约）：十键隔离后“实际已存在”用户站点依赖的只读搜索根仍可见——runner 每批一次、
 * 在覆盖任何环境前，用实际既有 Python（-B、runner 真实 env、无 shell）解析 site.getusersitepackages()；
 * 保留已有 PYTHONPATH 仅追加该根；字节码缓存经 PYTHONPYCACHEPREFIX 落每 job 隔离目录；
 * 解析失败（目录不存在等）⇒ 本批一律不注入。夹具用 PYTHONUSERBASE 让真实 Python 指向 fixture 站点
 * （合法机制，不硬编码绝对路径）；模块名 r28dep 全局唯一，证明可见性来自注入而非系统 site-packages。 */
const PY_CMD = process.platform === "win32" ? "python" : "python3";
function r28Setup(t) {
  const probe = spawnSync(PY_CMD, ["-B", "-c", "import site; print(site.getusersitepackages())"], { encoding: "utf8", timeout: 15000, windowsHide: true, env: process.env });
  if (probe.status !== 0) return null; // 本机无可解析 Python ⇒ 契约不适用（两台验收机均有 Python，勿据此跳过当作通过）
  const ws = makeWorkspace(t);
  const usersiteBase = path.join(ws, "usersite");
  const marker = path.join(ws, "keepme"); // 已有 PYTHONPATH 代表（只需被保留，不必在盘上存在）
  const siteProbe = spawnSync(PY_CMD, ["-B", "-c", "import site; print(site.getusersitepackages())"], { encoding: "utf8", timeout: 15000, windowsHide: true, env: { ...process.env, PYTHONUSERBASE: usersiteBase } });
  assert.equal(siteProbe.status, 0, siteProbe.stderr);
  const siteDir = siteProbe.stdout.trim();
  fs.mkdirSync(siteDir, { recursive: true });
  fs.writeFileSync(path.join(siteDir, "r28dep.py"), 'MARKER = "r28-fixture-user-site"\n');
  fs.writeFileSync(path.join(ws, "probe.py"), [
    "import json, os, site",
    "info = {\"pp\": os.environ.get(\"PYTHONPATH\", \"\"), \"pcp\": os.environ.get(\"PYTHONPYCACHEPREFIX\", \"\"),",
    "        \"tmp\": os.environ.get(\"TMP\", \"\"), \"home\": os.environ.get(\"HOME\", \"\"), \"usersite\": site.getusersitepackages()}",
    "try:",
    "    import r28dep",
    "    info[\"dep\"] = r28dep.__file__",
    "except Exception as exc:",
    "    info[\"depErr\"] = type(exc).__name__",
    "print(json.dumps(info))",
    "",
  ].join("\n"));
  return { ws, usersiteBase, marker };
}
function r28PyJob(ws, name, marker, expect) {
  const py = [
    '"use strict";',
    "const assert = require(\"node:assert/strict\");",
    "const path = require(\"node:path\");",
    "const { spawnSync } = require(\"node:child_process\");",
    `const PY = ${JSON.stringify(PY_CMD)};`,
    `const r = spawnSync(PY, ["-B", path.join(__dirname, "..", "probe.py")], { encoding: "utf8" }); // 继承 job env：与真实失败路径同构`,
    "assert.equal(r.status, 0, r.stderr);",
    "const info = JSON.parse(r.stdout);",
    "assert.equal(info.pcp, info.tmp, \"PYTHONPYCACHEPREFIX must be the per-job isolation dir\");",
    "assert.equal(info.home, info.tmp, \"ten-key isolation intact: HOME stays the job sandbox dir\");",
    `const MARKER = ${JSON.stringify(marker)};`,
    expect === "visible"
      ? "assert.equal(info.pp, MARKER + path.delimiter + info.usersite, \"existing PYTHONPATH preserved, resolved user-site root appended\");\nassert.ok(info.dep && info.dep.startsWith(info.usersite), \"fixture user-site module must be importable through the injected read-only root: \" + JSON.stringify(info));"
      : "assert.equal(info.pp, MARKER, \"failed resolution must not inject anything into PYTHONPATH\");\nassert.equal(info.depErr, \"ModuleNotFoundError\", \"unresolvable batch must stay invisible: \" + JSON.stringify(info));",
    "",
  ];
  const file = path.join(ws, "test", `${name}.js`);
  fs.writeFileSync(file, py.join("\n"));
  return `test/${name}.js`;
}
function r28Run(ws, files, env) {
  const manifest = writeManifest(ws, baseManifest(ws, {
    pyvis: { phases: { fullCheck: { extraFiles: files.map(f => ({ file: f, argv: [], source: "fixture" })) } } },
  }, [], Object.fromEntries(files.map(f => [f, ["fixture-serial"]]))));
  return runRunner(ws, manifest, "pyvis", [], env);
}

test("r28: existing user-site deps stay visible (batch-once resolve, PYTHONPATH append, per-job pycache)", t => {
  const s = r28Setup(t);
  if (!s) return t.skip("no resolvable python on this host");
  const files = [r28PyJob(s.ws, "pyvis1", s.marker, "visible"), r28PyJob(s.ws, "pyvis2", s.marker, "visible")];
  const run = r28Run(s.ws, files, { ...process.env, PYTHONUSERBASE: s.usersiteBase, PYTHONPATH: s.marker });
  assert.equal(run.status, 0, run.stdout + run.stderr);
  const rec = receipt(s.ws, "pyvis");
  assert.equal(rec.jobs.length, 2);
  assert.ok(rec.jobs.every(j => j.status === "passed"), JSON.stringify(rec.jobs.map(j => [j.file, j.status])));
  const hits = (run.stdout.match(/python dependency search root \(read-only, batch-once\)/g) || []).length;
  assert.equal(hits, 1, "resolution must happen exactly once per batch, not per job");
});

test("r28: unresolvable user site ⇒ no PYTHONPATH injection for the whole batch (fail-safe)", t => {
  const s = r28Setup(t);
  if (!s) return t.skip("no resolvable python on this host");
  fs.rmSync(s.usersiteBase, { recursive: true, force: true }); // 解析出的目录不存在 ⇒ 降级
  const files = [r28PyJob(s.ws, "pyvisn", s.marker, "absent")];
  const run = r28Run(s.ws, files, { ...process.env, PYTHONUSERBASE: path.join(s.ws, "no-such-base"), PYTHONPATH: s.marker });
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.equal(receipt(s.ws, "pyvis").jobs[0].status, "passed");
  assert.equal((run.stdout.match(/no PYTHONPATH injection this batch/g) || []).length, 1);
  assert.doesNotMatch(run.stdout, /batch-once\)/, "degraded batch must not claim an injected root");
});
