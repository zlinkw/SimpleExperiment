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
  const lockDir = path.join(ws, ".test-workflow-batch.lock");
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
  assert.ok(!fs.existsSync(path.join(ws, ".test-workflow-batch.lock")), "own lock released after the batch");
  const rec = receipt(ws, "one");
  assert.ok(fs.existsSync(path.join(rec.logDir, "lock-release.json")), "release record retained");
  fs.mkdirSync(path.join(ws, ".test-workflow-batch.lock"));
  fs.writeFileSync(path.join(ws, ".test-workflow-batch.lock", "owner.json"), "{\"pid\":99999999}");
  const blocked = runRunner(ws, manifest, "one");
  assert.equal(blocked.status, 3, "unknown/foreign owner is NEVER auto-reclaimed");
  assert.ok(fs.existsSync(path.join(ws, ".test-workflow-batch.lock")), "foreign lock left untouched");
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
  for (const n of names) {
    const nb = Buffer.from(n, "utf8"), data = Buffer.from("{}", "utf8");
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
  for (const f of ["verify-vsix-manifest.js", "package-content-policy.js", "package-content-policy.json"]) fs.copyFileSync(path.join(REPO, "scripts", f), path.join(ws, "scripts", f));
  fs.writeFileSync(path.join(ws, "vsce-mock.js"), 'console.log(process.env.MOCK_VSCE_OUT || "Packaged: fixture-pkg-9.9.9.vsix");\n');
  const { REQUIRED } = require(path.join(REPO, "scripts", "package-content-policy.js"));
  makeStoredZip(path.join(ws, "fixture-pkg-9.9.9.vsix"), [...REQUIRED]); // 当前包：合规
  makeStoredZip(path.join(ws, "fixture-pkg-9.9.8.vsix"), [...REQUIRED, ".test-workflow-batch.lock/owner.json"]); // 历史旧包：带泄漏，泛扫必误报
  makeStoredZip(path.join(ws, "legacy-other.vsix"), [...REQUIRED]); // 反例1用：实存但 name-version 不符的"错误当前包"
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
  assert.equal(line(r3.stdout, "mode"), "cold");
  assert.notEqual(line(r3.stdout, "partition"), p1, "input drift ⇒ new partition");
  assert.match(r3.stdout, /emitted=[1-9]/);
  const p3 = line(r3.stdout, "partition");
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
  const expectedByEntry = {};
  for (const entry of ["package", "build", "check:full", "test", "test:features"]) {
    const exp = canonicalPlan(manifest, entry);
    assert.ok(exp.map.size > 0, `canonical expansion of ${entry} must never be empty`);
    expectedByEntry[entry] = exp;
    const map = new Map();
    for (const j of planOf(entry).jobs) {
      const key = j.identity + "\u0000" + j.argv.join("\u0000");
      assert.ok(!map.has(key), `${entry}: planner emitted duplicate identity+argv for ${j.file}`);
      map.set(key, j);
    }
    const missing = [...exp.map.keys()].filter(k => !map.has(k)).map(k => exp.map.get(k).file);
    const extra = [...map.keys()].filter(k => !exp.map.has(k)).map(k => map.get(k).file);
    assert.deepEqual(missing, [], `${entry}: manifest-defined jobs missing from the plan`);
    assert.deepEqual(extra, [], `${entry}: planned jobs not defined by the manifest contract`);
  }
  // dedup 语义：请求槽位数与去重数直接绑定独立展开（requestedSlots=展开条目数，removed=重复条目数）。
  const pkgExp = expectedByEntry.package;
  assert.equal(pkg.dedup.requestedSlots, pkgExp.requestedSlots, "package requestedSlots = canonical expansion entries (with repeats)");
  assert.equal(pkg.dedup.duplicatesRemoved, pkgExp.requestedSlots - pkgExp.map.size, "package duplicatesRemoved = canonical duplicate count");
  // 新缺陷回归必须按规范身份在 package/build/check:full 权威清单各仅出现一次（Windows 407 首跑登记后的绑定断言）
  for (const entry of ["package", "build", "check:full"]) {
    const occ = planOf(entry).jobs.filter(job => String(job.identity || "").endsWith("/test/features/planRunSharedSubmission.test.js")).length;
    assert.equal(occ, 1, `planRunSharedSubmission must appear exactly once in ${entry}`);
  }
  assert.equal(pkg.hooksVerified.hooksVerified, "zero", "package.json hook graph must stay provable");
  assert.equal(pkg.final, true);
  // 盘上覆盖对账（替代 >=798 固定数）：每一个盘上 *.test.js 都被 test 入口规范覆盖（遗漏即失败），
  // 且 test 入口规划的每个文件真实在盘上（幽灵即失败）。本轮“原覆盖无丢失”由精确 diff（仅测试/文档，manifest 定义与旧文件未删）
  // + 本节独立集合对账共同证明；动态相等关系本身不单独防未来删文件——删除测试仍受既有“必须用户批准”流程约束。
  const testJobs = planOf("test").jobs;
  const testFileSet = new Set(testJobs.map(j => j.file));
  for (const f of disk) assert.ok(testFileSet.has(f), `disk test file dropped from test-entry coverage: ${f}`);
  for (const j of testJobs) assert.ok(fs.existsSync(path.join(REPO, j.file)), `planned file not on disk: ${j.file}`);
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
