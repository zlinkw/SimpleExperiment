const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const root = path.join(__dirname, "../..");
const RUNNER = path.join(root, "scripts", "test-workflow.js");
const runner = require(RUNNER);
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const acceptance = fs.readFileSync(path.join(root, "scripts", "acceptance.js"), "utf8");
const runnerSource = fs.readFileSync(RUNNER, "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "scripts", "test-workflow.json"), "utf8"));

/* r27: 旧断言匹配 acceptance.js 内 runNpm("build"/"unit tests"/"feature regression tests") 实现形状；
 * r22 起 acceptance = 薄入口 + 单一 manifest/planner。以下迁移保持同一 testID 的每个保护目的，
 * 改为对当前真实执行器的行为等价验证（逐项旧→新映射见 evidence.md r27 节）。 */
test("release acceptance command has an executable report workflow", () => {
  // 旧: packageJson.scripts.acceptance === "node scripts/acceptance.js" —— 原样保留。
  assert.equal(packageJson.scripts.acceptance, "node scripts/acceptance.js");

  // 旧: runNpm(...) 步骤表存在（acceptance 可执行且驱动全部覆盖）。
  // 新: 薄入口必须用 Node 原生进程委托同一 runner 的 acceptance 入口并透传参数与聚合退出码。
  assert.match(acceptance, /spawnSync\(process\.execPath, \[path\.join\(__dirname, "test-workflow\.js"\), "acceptance", \.\.\.process\.argv\.slice\(2\)\]/, "thin entry must delegate to the single runner acceptance entry");
  assert.match(acceptance, /process\.exitCode = result\.status === null \? 1 : result\.status/, "runner aggregate exit code must pass through unchanged");

  // 旧: runNpm("build", ["run","build"]) —— acceptance 包含原 build 全域。
  // 新: planner 真实展开：acceptance 作业集 ⊇ build 入口作业集（同一清单同一 planner，文件+argv 身份）。
  const planOpts = { only: [], domains: [], root };
  const idOf = j => `${j.file} ${JSON.stringify(j.argv || [])}`;
  const accPlan = runner.planEntry(path.join(root, "scripts", "test-workflow.json"), manifest, root, "acceptance", planOpts);
  const accIds = new Set(accPlan.jobs.map(idOf));
  const buildPlan = runner.planEntry(path.join(root, "scripts", "test-workflow.json"), manifest, root, "build", planOpts);
  for (const j of buildPlan.jobs) assert.ok(accIds.has(idOf(j)), `acceptance union missing build-domain job ${idOf(j)}`);

  // 旧: runNpm("unit tests", ["test"]) 与 runNpm("feature regression tests", ["run","test:features"])。
  // 新: 盘上全部 *.test.js（unit 面=原 npm test glob 对象）与全部 test/features 文件都在 acceptance
  // 作业并集内（不缩水棘轮；原断言保证这三步在，新断言保证覆盖文件一个不少）。
  const disk = [];
  (function walk(d) { for (const n of fs.readdirSync(d)) { const f = path.join(d, n); if (fs.statSync(f).isDirectory()) walk(f); else if (n.endsWith(".test.js")) disk.push(path.relative(root, f).split(path.sep).join("/")); } })(path.join(root, "test"));
  const accFiles = new Set(accPlan.jobs.map(j => j.file));
  for (const f of disk) assert.ok(accFiles.has(f), `acceptance union missing disk test file ${f}`);
  assert.ok(disk.some(f => f.startsWith("test/features/")), "features coverage must exist to be covered");

  // 旧: packageJson.scripts["test:scenarios"] === "npm run test:features"（scenarios→features 等价）。
  // 新: npm 表面走同一 runner，映射由清单 alias 承担且 planner 真实解析到 test:features。
  assert.equal(packageJson.scripts["test:scenarios"], "node scripts/test-workflow.js test:scenarios");
  assert.equal(manifest.entries["test:scenarios"].aliasOf, "test:features");
  const scenPlan = runner.planEntry(path.join(root, "scripts", "test-workflow.json"), manifest, root, "test:scenarios", planOpts);
  assert.equal(scenPlan.entry, "test:features", "planner must resolve the scenarios alias onto the real features executor");

  // 旧: doesNotMatch(/shell\s*:/) —— 无 shell 拼接；扩展到当前真实执行链两文件。
  assert.doesNotMatch(acceptance, /shell\s*:/);
  assert.doesNotMatch(runnerSource, /shell\s*:\s*true/);

  // 旧: overall=${overall} 打印 + 报告目录路径（聚合可见、报告落 acceptance 目录）。
  // 新A(聚合非零真实透传): final 入口 --only 被 runner 拒绝 ⇒ 薄入口必须原样返回非零。
  const probe = spawnSync(process.execPath, [path.join(root, "scripts", "acceptance.js"), "--only", "anything"], { cwd: root, encoding: "utf8", timeout: 30000, windowsHide: true });
  assert.notEqual(probe.status, 0, "runner refusal must surface as non-zero through the thin entry");
  assert.match(probe.stderr + probe.stdout, /final profile/, "refusal reason must be visible");

  // 新B(报告真实生成): 隔离工作副本内用 report:"acceptance" 入口完整跑一次真实 runner，
  // 断言 latest.json/latest.md 落原 acceptance 目录、含 overall 与完整日志目录引用、stdout 打印 overall=。
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), "psg-acc-rep-"));
  try {
    fs.mkdirSync(path.join(ws, "test"));
    fs.writeFileSync(path.join(ws, "package.json"), JSON.stringify({ name: "fixture", scripts: {} }));
    fs.writeFileSync(path.join(ws, "test", "jp.js"), '"use strict";\nsetTimeout(() => process.exit(0), 10);\n');
    const manifestFile = path.join(ws, "manifest.json");
    fs.writeFileSync(manifestFile, JSON.stringify({
      schemaVersion: 1, compileGates: [], domains: {}, batchDefaults: { maxParallel: 2, killGraceMs: 2000 },
      classification: { mode: "attested-whitelist", parallel: [], exclusive: { "test/jp.js": ["fixture-serial"] } },
      entries: { acc: { report: "acceptance", phases: { fullCheck: { extraFiles: [{ file: "test/jp.js", argv: [], source: "fixture" }] } } } },
    }, null, 1));
    const run = spawnSync(process.execPath, [RUNNER, "acc", "--root", ws, "--manifest", manifestFile], { encoding: "utf8", timeout: 30000, windowsHide: true });
    assert.equal(run.status, 0, run.stdout + run.stderr);
    assert.match(run.stdout, /\[acceptance\] overall=passed/, "overall= must be printed with report and log-dir references");
    const dir = path.join(ws, "simple_cluster", "reports", "acceptance");
    const latest = JSON.parse(fs.readFileSync(path.join(dir, "latest.json"), "utf8"));
    assert.equal(latest.overall, "passed");
    assert.ok(latest.logDir && fs.existsSync(latest.logDir), "report must reference the full-log directory");
    assert.ok(fs.existsSync(latest.runReceipt), "report must reference the complete run receipt");
    const md = fs.readFileSync(path.join(dir, "latest.md"), "utf8");
    assert.match(md, /overall=passed/);
    assert.match(md, /full logs: /, "markdown report must cite complete logs");
  } finally { fs.rmSync(ws, { recursive: true, force: true }); }
});
