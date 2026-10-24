"use strict";
/**
 * r29 #2 分类器 v2 —— 已证白名单，绝不自动提权并行。
 * --verify（默认）：逐条重验 parallel 条目的 basis（平台 + 测试文件/静态闭包 sha256），任何漂移/缺失/平台不符
 *   一律降级 exclusive；清单外的新文件不登记（runner 默认串行），本命令从不把 exclusive 提升为 parallel。
 * --attest-overlap <run.json>：只从真实批次凭据中 status=passed 且与另一 passed 作业时间区间真实重叠的作业
 *   建立/刷新白名单条目；basis = 测试文件本体 + 其静态 require 闭包的逐文件 sha + 平台 + 批次证据引用。
 *   失败、超时、被取消、未重叠、序列化的作业一律不进入白名单。批量整体 failed 不影响单作业的重叠事实，
 *   但批次 overall 会记入 evidence 供审阅。
 * 用法: node scripts/test-workflow-classify.js [--verify | --attest-overlap simple_cluster/.../run.json]
 */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const root = path.resolve(__dirname, "..");
const manifestFile = path.join(__dirname, "test-workflow.json");
const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
const args = process.argv.slice(2);

function fail(msg) { process.stderr.write(`[classify] ERROR: ${msg}\n`); process.exit(1); }

function listTestFiles() {
  const out = [];
  (function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) walk(full);
      else if (name.endsWith(".test.js")) out.push(path.relative(root, full).split(path.sep).join("/"));
    }
  })(path.join(root, "test"));
  return out.sort();
}

const sha = abs => crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex");

function staticRefs(absFile) {
  let s; try { s = fs.readFileSync(absFile, "utf8"); } catch { return []; }
  const refs = [];
  for (const m of s.matchAll(/(?:from\s*|require\()\s*["'](\.{1,2}\/[^"']+)["']/g)) refs.push(m[1]);
  return refs;
}
function resolveRelative(fromAbs, spec) {
  const base = path.resolve(path.dirname(fromAbs), spec);
  for (const cand of [base, base + ".ts", base + ".js", base + ".cjs", base + ".mjs", path.join(base, "index.ts"), path.join(base, "index.js")]) {
    if (fs.existsSync(cand) && fs.statSync(cand).isFile()) return cand;
  }
  return null;
}
/** 文件本体在前，其后是传递闭包（测试自身 + helper/src 静态引用）。 */
function staticClosure(relFile) {
  const seen = new Set();
  const queue = [path.join(root, relFile)];
  const out = [];
  while (queue.length) {
    const abs = queue.shift();
    const rel = path.relative(root, abs).split(path.sep).join("/");
    if (seen.has(rel) || !fs.existsSync(abs)) continue;
    seen.add(rel);
    out.push(rel);
    for (const spec of staticRefs(abs)) {
      const target = resolveRelative(abs, spec);
      if (target) queue.push(target);
    }
  }
  return out;
}

const classification = manifest.classification = manifest.classification || {};
const parallel = classification.parallel = classification.parallel || [];
const exclusive = classification.exclusive = classification.exclusive || {};

/* ================= r25-B 独立性正证（提权的必要条件；重叠只是观测） =================
 * 判定规则（有界、可复核；任何未知/无法解析 → FAIL ⇒ exclusive）：
 *  - writes：所有 write/mkdir/rm/unlink/rename/copy/stream 调用点的目标必须能绑定到本文件的
 *    mkdtempSync(os.tmpdir())/tmpdir() 派生变量；process.cwd()/字面仓库路径/绝对路径/未解析目标 ⇒ FAIL。
 *    （runner v2 结构保证：测试子孙的 TMP/TEMP/TMPDIR/HOME/USERPROFILE/APPDATA/LOCALAPPDATA/XDG_* 均指向每作业沙箱。）
 *  - ports：listen(0) 允许（ephemeral）；listen(固定端口)/PORT 常量+listen ⇒ FAIL。
 *  - external：外部二进制仅当同文件存在 `-S`/socket 或 HOME/TMPDIR 实参绑定（每作业归属）才允许，否则 FAIL。
 *  - git：runner 剥离六项定位变量 ⇒ git 子进程归属沙箱；但直接写 .git/GIT_ 环境变量赋值 ⇒ FAIL。
 *  - deps：全部 require/import 为相对静态可解析（含 .ts/.js/index 解析）；动态 require(变量) ⇒ FAIL(未知依赖)。
 *  - subprocess：spawn/exec 目标限于 process.execPath / 外部白名单(上一条) / -c 类内省；未知裸命令 ⇒ FAIL。
 * 输出逐文件 verdict + 命中证据行（file:line:类别，不含内容）。--attest-independence 只写 PASS 文件，
 * 并为每个 PASS 条目重建 basis（版本绑定仍需要）；不读取任何重叠信息。 */
function analyzeIndependence(file) {
  const abs = path.join(root, file);
  const text = fs.readFileSync(abs, "utf8");
  const lines = text.split("\n");
  const hits = [];
  const fail = (why) => hits.push(why);
  const codeLines = lines.map(l => l.replace(/^\s*\/\/.*$/, "")); // 剥离整行注释：注释里的 spawn/exec 不是调用
  const tmpVar = new Set();
  codeLines.forEach((l, i) => {
    if (/mkdtempSync\s*\(/.test(l) || /os\.tmpdir\s*\(/.test(l) || /\btmpdir\s*\(/.test(l)) tmpVar.add(i);
  });
  const tmpBound = new Set();
  codeLines.forEach((l, i) => {
    const m = /(?:const|let|var)\s+(\w+)\s*=\s*[^;]*(mkdtemp|tmpdir)/.exec(l);
    if (m) tmpBound.add(m[1]);
    const j = /(?:const|let|var)\s+(\w+)\s*=\s*path\.(?:join|resolve)\s*\(\s*(\w+)/.exec(l);
    if (j && tmpBound.has(j[2])) tmpBound.add(j[1]);
    const c = /(\w+)\s*\+\s*['"`]/.exec(l);
  });
  codeLines.forEach((l, i) => {
    if (/(writeFileSync|appendFileSync|mkdirSync|rmSync|unlinkSync|renameSync|createWriteStream|copyFileSync|writeFile\s*\(|cpSync)\s*\(/.test(l)) {
      const bound = [...tmpBound].some(v => new RegExp("\b" + v + "\b").test(l));
      const sandboxish = /(mkdtemp|tmpdir|TMPDIR|tmpRoot|fixtureRoot|sandbox)/.test(l);
      if (!bound && !sandboxish) fail(`L${i + 1}:write-target-unresolved`);
    }
    if (/(writeFileSync|appendFileSync|mkdirSync|rmSync|copyFileSync|createWriteStream)\s*\(\s*['"`](\.\.?\/|[A-Za-z]:[\\/])/.test(l)) fail(`L${i + 1}:shared-or-absolute-write`);
    if (/process\.cwd\(\s*\)[^)]*(writeFileSync|mkdirSync|appendFileSync|createWriteStream)/.test(l.replace(/\.Sync/g, "Sync"))) fail(`L${i + 1}:cwd-write`);
    const sp = /(?:^|[^\w.$])(spawn|spawnSync|execFile|execFileSync|execSync|exec)\w*\s*\(\s*([^,)]{0,60})/.exec(l);
    if (sp) {
      const arg = sp[2].trim();
      if (arg === "process.execPath") { /* 受控：同 runner 受管子进程 */ }
      else if (/^['"`]/.test(arg)) { /* 字面命令：交给下面的 external 规则判归属绑定 */ }
      else fail(`L${i + 1}:spawn-target-unresolved(${arg.slice(0, 40)})`);
    }
    const listen = /\.listen\s*\(\s*(\w+|\d+)\s*[,)]/.exec(l);
    if (listen && listen[1] !== "0") fail(`L${i + 1}:fixed-or-named-port(${listen[1]})`);
    if (/(?:^|[^\w.$])(?:spawn|spawnSync|execFile|execFileSync|execSync|exec)\w*\s*\(\s*['"`]([A-Za-z0-9_.\\/-]+)['"`]/.test(l) && !/(?:^|[^\w.$])(?:spawn|spawnSync|execFile|execFileSync|execSync|exec)\w*\s*\(\s*['"`](echo|true|false|pwd|cat|node)['"`]/.test(l)) {
      const scoped = /-S\b|--socket|SOCKET|socket|HOME|TMPDIR|tmpdir|mkdtemp|-H\b/.test(l) || codeLines.some(o => /-S\b|--socket/i.test(o));
      if (!scoped) fail(`L${i + 1}:external-without-sandbox-binding`);
    }
    if (/require\s*\(\s*(?!['"`\.])/.test(l) && !/require\s*\(\s*['"`]/.test(l)) fail(`L${i + 1}:dynamic-require`);
    if (/process\.env\.GIT_(DIR|WORK_TREE|INDEX_FILE|OBJECT_DIRECTORY|COMMON_DIR)\s*=/.test(l)) fail(`L${i + 1}:git-locator-mutation`);
  });
  for (const spec of staticRefs(abs)) if (!resolveRelative(abs, spec)) fail(`unresolved-static-ref:${spec}`);
  const ok = hits.length === 0;
  return ok ? {
    verdict: "PASS",
    writes: "all targets bound to per-file mkdtemp/tmpdir chain (runner v2 pins TMP/TEMP/TMPDIR/HOME/USERPROFILE/APPDATA/LOCALAPPDATA/XDG_* to per-job sandbox)",
    ports: "no fixed/ephemeral-exposing listen found",
    external: "external binaries carry -S/socket or sandbox env binding or absent",
    git: "six locator vars stripped by runner; no in-test mutation",
    deps: `static-complete closure (${staticClosure(file).length} files)`,
    subprocess: "children are node (execPath) or sandbox-bound externals; inherit per-job env",
  } : { verdict: "FAIL", reasons: [...new Set(hits)].slice(0, 6) };
}

if (args[0] === "--attest-independence") {
  if (classification.mode !== "attested-whitelist") fail("classification.mode 不是 attested-whitelist");
  const kept = [];
  const failed = [];
  for (const [file, why] of Object.entries(exclusive)) {
    if (!Array.isArray(why) || !why[0] || !why[0].startsWith("independence-fail:")) continue;
    if (!fs.existsSync(path.join(root, file))) continue;
    const rv = analyzeIndependence(file);
    if (rv.verdict !== "PASS") continue;
    delete exclusive[file];
    parallel.push({ file, independence: { ...rv, decidedBy: "scripts/test-workflow-classify.js analyzeIndependence (r25-B)", decidedAt: new Date().toISOString() }, basis: { platform: process.platform, closure: staticClosure(file).map(p2 => ({ path: p2, sha256: sha(path.join(root, p2)) })) } });
  }
  for (const entry of [...parallel]) {
    if (!fs.existsSync(path.join(root, entry.file))) { failed.push([entry.file, ["file-missing"]]); parallel.splice(parallel.indexOf(entry), 1); continue; }
    const v = analyzeIndependence(entry.file);
    if (v.verdict === "PASS") {
      entry.independence = { ...v, decidedBy: "scripts/test-workflow-classify.js analyzeIndependence (r25-B)", decidedAt: new Date().toISOString() };
      entry.basis.closure = staticClosure(entry.file).map(p2 => ({ path: p2, sha256: sha(path.join(root, p2)) }));
      entry.basis.platform = process.platform;
    } else {
      parallel.splice(parallel.indexOf(entry), 1);
      exclusive[entry.file] = ["independence-fail:" + v.reasons.join(",")];
      failed.push([entry.file, v.reasons]);
    }
  }
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 1) + "\n");
  console.log(`attest-independence: parallel-kept=${parallel.length} demoted=${failed.length}`);
  for (const [f, rs] of failed.slice(0, 15)) console.log(`  FAIL ${f}: ${rs.join(",")}`);
  if (failed.length > 15) console.log(`  …共${failed.length}项`);
} else if (args.length === 0 || args[0] === "--verify") {
  if (classification.mode !== "attested-whitelist") fail("classification.mode 不是 attested-whitelist —— 拒绝按启发式生成/扩大并行（R29 #2）；先跑 --attest-overlap 真实批次证据");
  const kept = [], downgraded = [];
  for (const entry of parallel) {
    const problems = [];
    if (!entry.independence || entry.independence.verdict !== "PASS") problems.push("no-independence-proof(r25-B)");
    if (!entry.basis || !entry.basis.closure || !entry.basis.closure.length) problems.push("no-basis");
    else {
      if (entry.basis.platform && entry.basis.platform !== process.platform) problems.push(`platform:${entry.basis.platform}!=${process.platform}`);
      for (const item of entry.basis.closure) {
        const abs = path.join(root, item.path);
        if (!fs.existsSync(abs)) { problems.push(`missing:${item.path}`); continue; }
        if (sha(abs) !== item.sha256) problems.push(`drift:${item.path}`);
      }
    }
    if (problems.length) { exclusive[entry.file] = ["attestation-drift:" + problems.slice(0, 4).join(",")]; downgraded.push(entry.file); }
    else kept.push(entry);
  }
  for (const f of downgraded) { const i = parallel.findIndex(p => p.file === f); if (i >= 0) parallel.splice(i, 1); }
  const disk = new Set(listTestFiles());
  const unregistered = [...disk].filter(f => !parallel.some(p => p.file === f) && !exclusive[f]);
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 1) + "\n");
  console.log(`verify: parallel-kept=${kept.length} downgraded=${downgraded.length}${downgraded.length ? " (" + downgraded.slice(0, 10).join(", ") + (downgraded.length > 10 ? " …" : "") + ")" : ""} exclusive=${Object.keys(exclusive).length} unregistered-default-serial=${unregistered.length}`);
  process.exitCode = 0;
} else if (args[0] === "--attest-overlap") {
  const runPath = args[1];
  if (!runPath) fail("--attest-overlap 需要批次 run receipt 路径");
  const abs = path.resolve(root, runPath);
  if (!fs.existsSync(abs)) fail(`run receipt 不存在: ${abs}`);
  const r = JSON.parse(fs.readFileSync(abs, "utf8"));
  if (!Array.isArray(r.jobs) || !r.jobs.length) fail("receipt 无作业证据");
  const passed = r.jobs.filter(j => j.status === "passed" && j.startedAt && j.endedAt);
  const overlapping = new Set();
  for (let i = 0; i < passed.length; i++) for (let k = i + 1; k < passed.length; k++) {
    const a = passed[i], b = passed[k];
    if (Date.parse(a.startedAt) < Date.parse(b.endedAt) && Date.parse(b.startedAt) < Date.parse(a.endedAt)) { overlapping.add(a.file); overlapping.add(b.file); }
  }
  if (!overlapping.size) fail("该批次没有任何 passed 作业之间存在真实时间重叠 —— 无并行证据可登记");
  let added = 0, refreshed = 0;
  const independent = new Set(parallel.filter(e => e.independence && e.independence.verdict === "PASS").map(e => e.file));
  for (const file of [...overlapping].sort()) {
    if (!fs.existsSync(path.join(root, file))) { process.stderr.write(`[classify] skip ${file}: 文件已不在盘\n`); continue; }
    if (!independent.has(file)) { process.stderr.write(`[classify] skip ${file}: 无 r25-B 独立性正证——重叠只是观测，不单独提权\n`); continue; }
    const basis = { platform: process.platform, closure: staticClosure(file).map(p => ({ path: p, sha256: sha(path.join(root, p)) })), evidence: `batch:${r.batchId} overall=${r.overall} overlap-pass` };
    const existing = parallel.find(p => p.file === file);
    if (existing) { existing.basis = basis; refreshed++; } else { parallel.push({ file, basis }); added++; }
    if (exclusive[file]) { delete exclusive[file]; process.stderr.write(`[classify] ${file}: 旧 exclusive 记录被更新的重叠通过证据取代\n`); }
  }
  classification.mode = "attested-whitelist";
  classification.proofBatch = { id: r.batchId, runReceipt: path.relative(root, abs).split(path.sep).join("/"), batchOverall: r.overall, attestedAt: new Date().toISOString() };
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 1) + "\n");
  console.log(`attest: overlapping-passed=${overlapping.size} added=${added} refreshed=${refreshed} parallel-total=${parallel.length} batch-overall=${r.overall}`);
} else {
  fail(`unknown command: ${args[0]} (用法见文件头)`);
}
