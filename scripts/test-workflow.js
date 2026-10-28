"use strict";
/**
 * r22/r29 单一测试清单 planner/runner（scripts/test-workflow.json 为唯一清单）。R29 返修对应关系：
 * #1 测试子进程独立环境沙箱（HOME/USERPROFILE/APPDATA/LOCALAPPDATA/TMP/TEMP/TMPDIR/XDG_*）并清六项 Git
 *    定位变量；非测试编译门禁保留规范环境；绝不 chown/chmod/清理用户目录。
 * #2 parallel 只认 attested basis（文件+静态闭包 sha+平台+批次证据），计划时逐条重验，漂移即降级 exclusive；
 *    --max-parallel 不得超过全局上限。
 * #3 job 身份 = realpath（win32 忽略大小写）+argv 矩阵；同文件矩阵行同组互斥；启动前核验 package.json 实际
 *    hook 图，存在任何 pre/post/保留钩子即阻断（npm 自动钩子无法证明不重复执行）。
 * #4 final profile（package/check:full/build/acceptance/smoke）拒绝 --only；测试结果复用整体移除（--reuse-receipt 拒绝）。
 * #5 输入/输出 receipt 分离：run.json 独占 wx；last-*.json 仅指针；assemble 按当前计划逐项对账文件矩阵、必要
 *    gates、真实 0 退出、日志存在、输入/环境/工具链与编译产物 hash；运行中输入漂移 ⇒ invalidated 非零。
 * #6 vsce 经已安装 package.json bin 元数据解析为真实 JS + process.execPath（同 npm-command 模式），不猜 .cmd。
 * #7 先建独占日志再 spawn；taskkill 等待并捕获错误；树退出未知 ⇒ 非通过；统一 finally 结算已启动项与非零 receipt；
 *    cancel 后不再启动任何 gate；锁仅释放自己确认拥有的，未知/坏 owner 永不自动回收（人工确认后手动清理）。
 * #8 compile/fullCheck/package 类入口运行前调用 scripts/test-workflow-preflight.js 确定性闭包检查并记录进 receipt。
 * 全部子项独占完整 stdout/stderr、真实 pid/时刻/退出码；聚合与外层真实非零（无 echo/grep 掩码）；
 * 单调时钟分段墙钟 + 文件数 + 并行上限 + 去重计数入 run 凭据与汇总行。
 */
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const { spawn, spawnSync } = require("node:child_process");
const { npmCommand } = require("./npm-command");
const testSelection = require("./test-selection"); // 旧测试按需选择：唯一实现，所有入口共用同一决策

const ROOT_DEFAULT = path.resolve(__dirname, "..");
const GIT_LOCATOR_VARS = ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_PREFIX", "GIT_COMMON_DIR", "GIT_OBJECT_DIRECTORY"];
const SANDBOX_ENV_KEYS = ["HOME", "USERPROFILE", "APPDATA", "LOCALAPPDATA", "TMP", "TEMP", "TMPDIR", "XDG_CONFIG_HOME", "XDG_CACHE_HOME", "XDG_DATA_HOME"];
const nowMono = () => Number(process.hrtime.bigint() / 1000000n);

function fail(message, code = 1) {
  process.stderr.write(`[test-workflow] ERROR: ${message}\n`);
  const error = new Error(message);
  error.exitCode = code;
  error.planFail = true;
  throw error;
}

function parseArgs(argv) {
  const out = { entry: null, root: ROOT_DEFAULT, manifest: null, maxParallel: null, domains: [], only: [], dryRun: false, reuseRequested: false, receipt: null, receiptOut: null, logDir: null, cancelStdin: false, includeOndemand: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--root") out.root = path.resolve(argv[++i]);
    else if (a === "--manifest") out.manifest = path.resolve(argv[++i]);
    else if (a === "--max-parallel") { out.maxParallel = Number(argv[++i]); if (!Number.isInteger(out.maxParallel) || out.maxParallel < 1) fail(`--max-parallel must be a positive integer: ${argv[i]}`); }
    else if (a === "--domains") out.domains.push(...String(argv[++i]).split(",").map(s => s.trim()).filter(Boolean));
    else if (a === "--only") out.only.push(argv[++i]);
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--reuse-receipt") out.reuseRequested = true;
    else if (a === "--receipt") out.receipt = path.resolve(argv[++i]);
    else if (a === "--receipt-out") out.receiptOut = path.resolve(argv[++i]);
    else if (a === "--log-dir") out.logDir = path.resolve(argv[++i]);
    else if (a === "--cancel-stdin") out.cancelStdin = true; // r28 U2（主控批准）：opt-in 合作取消；默认绝不读取/抢占 stdin
    else if (a === "--include-ondemand") out.includeOndemand.push(argv[++i]); // 按需恢复入口：all | 组名 | 文件子串（逗号可分多项）
    else if (a.startsWith("--")) fail(`unknown option: ${a}`);
    else if (!out.entry) out.entry = a;
    else fail(`unexpected argument: ${a}`);
  }
  if (!out.entry) fail("usage: node scripts/test-workflow.js <entry> [--domains a,b] [--only file(非最终 profile)] [--max-parallel<=2] [--dry-run] [--receipt path(校验读)] [--receipt-out path] [--root dir] [--manifest file] [--log-dir dir]");
  return out;
}

function loadManifest(root, explicit) {
  const file = explicit || path.join(__dirname, "test-workflow.json");
  if (!fs.existsSync(file)) fail(`manifest missing: ${file}`);
  return { file, data: JSON.parse(fs.readFileSync(file, "utf8")) };
}

/* ---------------- planner ---------------- */

function tokenizeNodeTest(rest) {
  const argv = [], files = [];
  const tokens = rest.trim().split(/\s+/);
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok === "--test-timeout" || tok === "--test-name-pattern" || tok === "--test-reporter") { argv.push(tok, tokens[++i]); continue; }
    if (tok.startsWith("--")) argv.push(tok);
    else files.push(tok);
  }
  return { argv, files };
}

const globCache = new Map();
function expandGlobPattern(root, pattern) {
  const cacheKey = root + "\u0000" + pattern;
  if (globCache.has(cacheKey)) return globCache.get(cacheKey);
  const combined = new RegExp("^" + pattern.split("**/").map(part => part.split("/").map(seg => seg.split("*").map(e => e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[^/]*")).join("/")).join("(?:[^/]*/)*") + "$");
  const out = [];
  const baseDir = pattern.slice(0, pattern.indexOf("/"));
  (function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) { walk(full); continue; }
      const rel = path.relative(root, full).split(path.sep).join("/");
      if (combined.test(rel)) out.push(rel);
    }
  })(path.join(root, baseDir));
  const sorted = out.sort();
  globCache.set(cacheKey, sorted);
  return sorted;
}

function assertSafeShell(step, context) {
  if (/["'`;|<>()$&]/.test(step.replace(/&&/g, ""))) fail(`unknown shell semantics in ${context}: ${step}`);
}

/** r29 #3: job identity = realpath with platform case rules; aliases/links/case variants collapse. */
function jobIdentity(root, file) {
  const abs = path.resolve(root, file);
  let real = abs;
  try { real = fs.realpathSync(abs); } catch { /* missing files are rejected later; keep resolved path */ }
  if (process.platform === "win32") real = real.toLowerCase();
  return real.split(path.sep).join("/");
}

/** r29 #3: npm lifecycle hook graph must be empty — expanded chains cannot prove npm would not run hooks
 * around `npm run X` gate steps; any hook (pair or reserved name) blocks the batch instead of silent double-run. */
function verifyNoNpmHooks(root) {
  const scripts = (JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).scripts) || {};
  const names = Object.keys(scripts);
  const pairs = [];
  for (const n of names) { if (scripts["pre" + n]) pairs.push(`pre${n}`); if (scripts["post" + n]) pairs.push(`post${n}`); }
  const reserved = names.filter(n => ["prepack", "postpack", "prepare", "prepublish", "prepublishOnly", "vscode:prepublish"].includes(n));
  const found = [...new Set([...pairs, ...reserved])];
  if (found.length) fail(`npm lifecycle hooks present (${found.join(", ")}): the runner cannot prove npm will not re-execute them around expanded steps — explicit block (r29 #3). Update the manifest/plan contract first.`);
  return { hooksVerified: "zero", packageJsonSha: sha256File(path.join(root, "package.json")) };
}

/** Recursively expand one legacy npm body into ordered {gates, jobs}; prereq warmup hoisted once. */
function expandDomain(manifest, root, name, body, chain, acc, prereq) {
  if (chain.slice(1, -1).includes(name)) fail(`script cycle: ${chain.join(" -> ")}`);
  for (const raw of body.split(" && ")) {
    const step = raw.trim();
    if (!step) continue;
    assertSafeShell(step, `${chain.join(">")} (${name})`);
    let m;
    if ((m = /^npm run ([a-zA-Z0-9:_-]+)$/.exec(step))) {
      const ref = m[1];
      if (manifest.domains[ref]) expandDomain(manifest, root, ref, manifest.domains[ref].sourceScript, [...chain, ref], acc, prereq);
      else acc.gates.push({ cmd: step, source: chain.join(">") });
      continue;
    }
    if ((m = /^node --test (.+)$/.exec(step))) {
      const { argv, files } = tokenizeNodeTest(m[1]);
      for (const f of files) {
        if (f.includes("*")) for (const hit of expandGlobPattern(root, f)) acc.jobs.push({ file: hit, argv: [...argv], source: chain.join(">") });
        else acc.jobs.push({ file: f, argv: [...argv], source: chain.join(">") });
      }
      continue;
    }
    if (step === prereq.hoistCmd) { prereq.needed = true; continue; }
    acc.gates.push({ cmd: step, source: chain.join(">") });
  }
}

/* r29 #2: attested whitelist. basis = {platform, closure:[{path,sha256}]}; every hash re-verified at plan
 * time; ANY drift/unparsed entry ⇒ exclusive (fail closed). The runner never invents parallelism. */
const shaCache = new Map();
function sha256File(file) { // plan-time only (whitelist verification); never used for run fingerprints
  if (shaCache.has(file)) return shaCache.get(file);
  const hex = sha256Fresh(file);
  shaCache.set(file, hex);
  return hex;
}
/** Fresh read — run fingerprints MUST see mid-run drift (r29 #5), so no caching here. */
function sha256Fresh(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

/* r26 #3: 同一 manifest 规划会话内按文件缓存 basis 校验结论（首次全量逐文件 sha 验证不变；
 * 同文件多 argv 行/多入口复用 = 冻结输入下同一 planner 结论，非跳过验证）。跨进程/新 manifest 对象必然重验。 */
const classifyVerdicts = new WeakMap();
function classify(manifest, root, relFile, identity) {
  const c = manifest.classification || {};
  const entry = (c.parallel || []).find(p => p.file === relFile || p.file.toLowerCase() === relFile.toLowerCase());
  const exclusiveReason = (c.exclusive || {})[relFile];
  if (exclusiveReason) return { exclusive: true, group: "exclusive:" + identity, basis: [].concat(exclusiveReason).join(",") };
  if (entry) {
    let byFile = classifyVerdicts.get(manifest);
    if (!byFile) { byFile = new Map(); classifyVerdicts.set(manifest, byFile); }
    const hit = byFile.get(relFile);
    if (hit) return { exclusive: hit.exclusive, group: (hit.exclusive ? "exclusive:" : "file:") + identity, basis: hit.basis };
    const verdict0 = classifyVerify(manifest, root, relFile, entry, c);
    byFile.set(relFile, verdict0);
    return { exclusive: verdict0.exclusive, group: (verdict0.exclusive ? "exclusive:" : "file:") + identity, basis: verdict0.basis };
  }
  return { exclusive: true, group: "exclusive:" + identity, basis: "unattested-default-serial" };
}
function classifyVerify(manifest, root, relFile, entry, c) {
  {
    if (!entry.independence || entry.independence.verdict !== "PASS") return { exclusive: true, basis: "no-independence-proof(r25-B)" };
    const problems = [];
    if (entry.basis && entry.basis.platform && entry.basis.platform !== process.platform) problems.push(`platform ${entry.basis.platform}!=${process.platform}`);
    for (const item of (entry.basis && entry.basis.closure) || []) {
      const abs = path.join(root, item.path);
      if (!fs.existsSync(abs)) { problems.push(`closure-missing:${item.path}`); continue; }
      if (sha256File(abs) !== item.sha256) problems.push(`drift:${item.path}`);
    }
    if (!fs.existsSync(path.join(root, relFile))) problems.push("file-missing");
    else if (sha256File(path.join(root, relFile)) !== (entry.basis && entry.basis.closure?.[0]?.sha256)) problems.push("drift:self");
    if (!problems.length) return { exclusive: false, basis: "attested:" + (entry.basis.evidence || "unknown-batch") };
    return { exclusive: true, basis: "attestation-drift(" + problems.slice(0, 4).join(";") + ")" };
  }
}

function planEntry(manifestFile, manifest, root, entryName, opts) {
  let name = entryName;
  let entry = manifest.entries[name];
  if (!entry) fail(`entry missing in manifest: ${name}`);
  if (entry.aliasOf) { name = entry.aliasOf; entry = manifest.entries[name]; if (!entry) fail(`alias target missing: ${entryName} -> ${manifest.entries[entryName].aliasOf}`); }
  const gates = entry.phases || {};
  const phases = {};
  const prereq = { needed: false, hoistCmd: "node scripts/prepare-wsl-tests.js", cmds: entry.prereq || [] };
  const resolveGates = (ref, phase) => {
    const arr = ref === "@compile" ? manifest.compileGates : ref;
    return arr.map(cmd => ({ cmd, source: ref === "@compile" ? "compileGates" : phase }));
  };
  const hookProof = verifyNoNpmHooks(root);
  if (opts.reuseRequested) fail("--reuse-receipt removed by r29 #4: test results are never reused; every run executes fresh.");
  if (entry.final && opts.only.length) fail(`entry ${name} is a final profile: --only filtering is forbidden on final acceptance (r29 #4)`);
  if (entry.requiresDomains && !opts.domains.length) fail(`${name} requires explicit --domains a,b,c (显式影响域)`);

  const order = ["compile", "lint", "fullCheck", "post", "assemble"];
  for (const phaseName of order) {
    const spec = gates[phaseName];
    if (spec) phases[phaseName] = { gates: spec.gates ? resolveGates(spec.gates, phaseName).map(g => ({ ...g, phase: phaseName })) : [] };
  }
  const domainList = entry.requiresDomains ? opts.domains : null;
  const full = gates.fullCheck || (entry.requiresDomains ? {} : undefined);
  const acc = { gates: [], jobs: [] };
  if (full) {
    (phases.fullCheck = phases.fullCheck || {}).domainGates = phases.fullCheck.domainGates || [];
    const list = domainList || full.domains || [];
    for (const d of list) {
      if (!manifest.domains[d]) fail(`unknown domain in ${name}: ${d}`);
      expandDomain(manifest, root, d, manifest.domains[d].sourceScript, [name, d], acc, prereq);
    }
    for (const extra of full.extraFiles || []) acc.jobs.push({ file: extra.file, argv: [...extra.argv], source: extra.source });
    for (const g of full.globs || []) for (const pattern of g.patterns) for (const hit of expandGlobPattern(root, pattern)) acc.jobs.push({ file: hit, argv: [...g.argv], source: g.source });
  }
  const compilePlan = phases.compile ? phases.compile.gates : [];
  if (compilePlan.length && full) {
    const seenGate = new Set(compilePlan.map(g => g.cmd));
    acc.gates = acc.gates.filter(g => !seenGate.has(g.cmd));
  }
  if (full) phases.fullCheck.domainGates = acc.gates.map(g => ({ ...g, phase: "fullCheck" }));

  const byKey = new Map();
  for (const j of acc.jobs) {
    const identity = jobIdentity(root, j.file);
    const key = identity + "\u0000" + j.argv.join("\u0000");
    const rel = path.relative(root, path.resolve(root, j.file)).split(path.sep).join("/");
    if (!byKey.has(key)) byKey.set(key, { file: rel, identity, argv: j.argv, sources: [], classification: classify(manifest, root, rel, identity) });
    byKey.get(key).sources.push(j.source);
  }
  let jobs = [...byKey.values()];
  const plannedUniqueBeforeSelection = jobs.length;
  if (opts.only.length) jobs = jobs.filter(j => opts.only.some(o => j.file === o || j.identity === o || j.file.endsWith("/" + o)));
  const missing = jobs.filter(j => !fs.existsSync(path.join(root, j.file)));
  if (missing.length) fail(`planned test file missing on disk: ${missing.map(m => m.file).join(", ")}`);
  // 按需选择（每次流程开始现算；决策=本轮唯一，开发/交付/package/组装核对全部消费同一 summary——见 scripts/test-selection.js 单一规则集）。
  const selection = testSelection.buildSelection(manifest, root, jobs, opts.includeOndemand || []);
  jobs = selection.executedJobs;
  const requiredGates = [...(phases.compile?.gates || []), ...(phases.lint?.gates || []), ...(phases.fullCheck?.domainGates || [])].map(g => g.cmd);
  return {
    entry: name,
    final: Boolean(entry.final),
    report: entry.report || null,
    requiresReceiptForEntry: entry.requiresReceiptForEntry || null,
    prereq: prereq.needed ? (prereq.cmds.length ? prereq.cmds : [prereq.hoistCmd]) : [],
    phases, jobs,
    hookProof,
    requiredGates,
    selection: selection.summary,
    onDemandJobs: selection.onDemandJobs.map(j => ({ file: j.file, argv: j.argv, status: "on_demand_not_run" })),
    dedup: { requestedSlots: acc.jobs.length, uniqueRuns: plannedUniqueBeforeSelection, duplicatesRemoved: acc.jobs.length - plannedUniqueBeforeSelection },
  };
}

function planHash(plan) {
  const h = crypto.createHash("sha256");
  for (const j of [...plan.jobs].sort((a, b) => (a.identity + a.argv.join()).localeCompare(b.identity + b.argv.join()))) h.update(j.identity).update("\u0000").update(j.argv.join("\u0000")).update("\n");
  return h.digest("hex");
}

/* ---------------- fingerprint ---------------- */

function hashTree(root, dirs, looseFiles) {
  const files = [];
  for (const dir of dirs) {
    const base = path.join(root, dir);
    if (!fs.existsSync(base)) continue;
    (function walk(d) {
      for (const name of fs.readdirSync(d)) {
        if (name === "__pycache__" || name.endsWith(".pyc")) continue; // r26: 测试子进程 python 生成的字节码是产物非输入（.py 源仍在面内）；防自伤 invalidated
        const full = path.join(d, name);
        if (fs.statSync(full).isDirectory()) walk(full);
        else files.push(full);
      }
    })(base);
  }
  for (const f of looseFiles || []) {
    const full = path.join(root, f);
    if (fs.existsSync(full)) files.push(full);
  }
  const h = crypto.createHash("sha256");
  for (const f of files.sort()) h.update(path.relative(root, f).split(path.sep).join("/")).update("\u0000").update(sha256Fresh(f)).update("\n");
  return h.digest("hex");
}

function inputFingerprint(root) {
  const h = crypto.createHash("sha256");
  h.update(hashTree(root, ["src", "scripts", "test", "bin"], ["package.json", "package-lock.json", "tsconfig.json", ".vscodeignore"]));
  h.update(`|${process.version}|${process.platform}|${process.arch}`);
  return h.digest("hex");
}

const artifactFingerprint = root => (fs.existsSync(path.join(root, "dist")) ? hashTree(root, ["dist"], []) : "no-dist");

/* ---------------- execution ---------------- */

/** r29 #6: resolve npm bin heads via installed package.json bin metadata — never a guessed .cmd/.sh shim. */
function resolveStepCommand(root, tokens) {
  const head = tokens[0];
  if (head === "node") return { command: process.execPath, args: tokens.slice(1) };
  if (head === "npm") { const inv = npmCommand(tokens.slice(1)); return { command: inv.command, args: inv.args }; }
  const candidates = ["@vscode/" + head, head];
  for (const pkgName of candidates) {
    const meta = path.join(root, "node_modules", pkgName, "package.json");
    if (!fs.existsSync(meta)) continue;
    let bin;
    try {
      const parsed = JSON.parse(fs.readFileSync(meta, "utf8"));
      bin = typeof parsed.bin === "string" ? parsed.bin : parsed.bin && (parsed.bin[head] || (pkgName === head && Object.keys(parsed.bin).length === 1 ? parsed.bin[Object.keys(parsed.bin)[0]] : undefined));
    } catch { fail(`package.json of ${pkgName} unreadable — refusing to guess a bin shim (r29 #6)`); }
    if (!bin) continue;
    const js = path.join(root, "node_modules", pkgName, bin);
    if (fs.existsSync(js)) return { command: process.execPath, args: [js, ...tokens.slice(1)], viaPackageBin: pkgName };
  }
  fail(`cannot resolve command "${head}" through installed package bin metadata — refusing to guess shims (r29 #6)`);
}

function isOwnedTreeGoneError(error) { return error && error.code === "ESRCH"; }

/** Kill our OWN process tree with confirmation. Never touches PIDs we did not spawn. */
function killOwnedTree(child) {
  if (!child || !child.pid) return { method: "none", confirmed: true };
  if (child.exitCode !== null || child.signalCode) return { method: "already-exited", confirmed: true };
  if (process.platform === "win32") {
    const killer = spawnSync("taskkill", ["/T", "/F", "/PID", String(child.pid)], { windowsHide: true, timeout: 8000, encoding: "utf8" });
    if (!killer.error && killer.status === 0) return { method: "taskkill", confirmed: true };
    try { child.kill("SIGKILL"); } catch { /* recorded below */ }
    return { method: "taskkill-failed", confirmed: false, detail: (killer.error && killer.error.message) || `taskkill exit=${killer.status} ${killer.stderr || ""}`.trim() };
  }
  try { process.kill(-child.pid, "SIGKILL"); return { method: "pgid-sigkill", confirmed: true }; }
  catch (error) {
    if (isOwnedTreeGoneError(error)) return { method: "pgid-gone", confirmed: true };
    try { child.kill("SIGKILL"); } catch { /* fallthrough */ }
    return { method: "pgid-failed", confirmed: false, detail: error.message };
  }
}

/** r29 #7: exclusive logs are opened BEFORE spawn; spawn/close errors still settle; kill confirmations kept. */
function spawnCaptured(command, args, opts) {
  return new Promise(resolve => {
    let out, err;
    try {
      out = fs.openSync(opts.outFile, "wx");
      err = fs.openSync(opts.errFile, "wx");
    } catch (error) {
      if (out !== undefined) { try { fs.closeSync(out); } catch { /* ignore */ } }
      resolve({ spawnError: "cannot open exclusive log (" + error.code + "): " + opts.outFile, exitCode: null, stdoutBytes: 0, stderrBytes: 0, pid: null, kill: { method: "none", confirmed: true }, timedOut: false });
      return;
    }
    let child;
    try { child = spawn(command, args, { cwd: opts.cwd, env: opts.env || process.env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true, detached: process.platform !== "win32" }); }
    catch (error) {
      fs.writeSync(err, Buffer.from("spawn failed: " + error.message + "\n"));
      fs.closeSync(out); fs.closeSync(err);
      resolve({ spawnError: error.message, exitCode: null, stdoutBytes: 0, stderrBytes: 0, pid: null, kill: { method: "none", confirmed: true }, timedOut: false });
      return;
    }
    let stdoutBytes = 0, stderrBytes = 0, kill = null, timedOut = false, settled = false, timer = null;
    child.stdout.on("data", d => { stdoutBytes += d.length; fs.writeSync(out, d); });
    child.stderr.on("data", d => { stderrBytes += d.length; fs.writeSync(err, d); });
    const finish = extra => {
      if (settled) return; settled = true; if (timer) clearTimeout(timer);
      fs.closeSync(out); fs.closeSync(err);
      resolve({ exitCode: child.exitCode ?? extra?.code ?? null, signal: extra?.signal ?? child.signalCode ?? null, stdoutBytes, stderrBytes, pid: child.pid, kill: kill || { method: "none", confirmed: true }, timedOut, spawnError: extra?.spawnError });
    };
    const killTree = markTimeout => {
      if (markTimeout) timedOut = true;
      kill = killOwnedTree(child);
    };
    if (opts.timeoutMs) timer = setTimeout(() => killTree(true), opts.timeoutMs);
    child.once("error", error => { kill = kill || killOwnedTree(child); finish({ spawnError: error.message }); });
    child.once("close", (code, signal) => finish({ code, signal }));
    if (opts.onSpawn) opts.onSpawn(child, () => killTree(false));
  });
}

/* ---------------- gates & jobs ---------------- */

async function runGate(state, gate) {
  if (state.cancelled) { const record = { cmd: gate.cmd, phase: gate.phase, source: gate.source, skippedAfterCancel: true, passed: false, exitCode: null }; state.receipt.gates.push(record); return record; }
  const idx = ++state.gateSeq;
  const logDir = path.join(state.logDir, "gates");
  await fsp.mkdir(logDir, { recursive: true });
  const outFile = path.join(logDir, `gate-${String(idx).padStart(2, "0")}.out.log`);
  const errFile = path.join(logDir, `gate-${String(idx).padStart(2, "0")}.err.log`);
  const tokens = gate.cmd.split(/\s+/);
  const resolved = resolveStepCommand(state.root, tokens);
  /* r27 必修：组装阶段的 verify-vsix-manifest 门必须显式消费本批 vsce 成功输出的确切包路径
   * （Native 根历史包并存时目录泛扫会在昂贵全量后误阻断）。解析不到/名称版本绑定失败 ⇒ 明确非零，
   * 流水线内绝不回退目录唯一性泛扫；独立手动无参调用仍按脚本自身唯一性规则。 */
  let injectedArgs = resolved.args;
  let injectionRefusal = null;
  if (tokens[0] === "node" && tokens.some(t => t.includes("verify-vsix-manifest")) && !tokens.includes("--vsix")) {
    const vscePrior = [...state.receipt.gates].reverse().find(g => g.phase === gate.phase && /vsce/.test(g.cmd) && g.passed && g.outLog && fs.existsSync(g.outLog));
    if (!vscePrior) injectionRefusal = `no passed vsce package gate earlier in phase ${gate.phase} - packaged path unknown (r27)`;
    else {
      let m = null;
      try { m = fs.readFileSync(vscePrior.outLog, "utf8").match(/Packaged:?\s*(\S+\.vsix)/); } catch (e) { injectionRefusal = "vsce gate log unreadable: " + e.message; }
      const vsix = m && (path.isAbsolute(m[1]) ? m[1] : path.join(state.root, m[1]));
      if (!injectionRefusal) {
        if (!vsix || !fs.existsSync(vsix)) injectionRefusal = `packaged vsix path unresolvable from ${vscePrior.outLog} (r27)`;
        else {
          const pkg = JSON.parse(fs.readFileSync(path.join(state.root, "package.json"), "utf8"));
          const want = `${pkg.name}-${pkg.version}.vsix`;
          if (path.basename(vsix) !== want) injectionRefusal = `packaged vsix basename ${path.basename(vsix)} does not bind current name-version ${want} (r27)`;
          else injectedArgs = [...resolved.args, "--vsix", vsix];
        }
      }
    }
  }
  if (injectionRefusal) {
    const record = { cmd: gate.cmd, phase: gate.phase, source: gate.source, command: null, exitCode: 1, signal: null, spawnError: null, timedOut: false, treeStatus: "n/a(not-spawned)", passed: false, startedAt: new Date().toISOString(), endedAt: new Date().toISOString(), wallMs: 0, refusal: injectionRefusal, outLog: null, errLog: null };
    state.receipt.gates.push(record);
    process.stdout.write(`[test-workflow] gate FAIL refusal exit=1 ${gate.cmd} :: ${injectionRefusal}\n`);
    return record;
  }
  let gateEnv; // r24 #1: npm 步骤显式指向仓内可写持久下载缓存；配置/可写性/真实命中分开取证
  if (tokens[0] === "npm") {
    const cacheDir = path.join(state.root, "simple_cluster", "cache", "npm");
    fs.mkdirSync(cacheDir, { recursive: true });
    gateEnv = { ...process.env, npm_config_cache: cacheDir };
  }
  const startedAt = new Date().toISOString(), t0 = nowMono();
  const result = await spawnCaptured(resolved.command, injectedArgs, { cwd: state.root, env: gateEnv, outFile, errFile, onSpawn: (child, requestKill) => { state.activeGateKill = requestKill; } });
  state.activeGateKill = null;
  const wallMs = nowMono() - t0;
  const treeConfirmed = result.kill.confirmed;
  const passed = !result.spawnError && !result.timedOut && treeConfirmed && result.exitCode === 0;
  const record = { cmd: gate.cmd, phase: gate.phase, source: gate.source, command: [resolved.command, ...injectedArgs].join(" "), viaPackageBin: resolved.viaPackageBin || null, exitCode: result.exitCode, signal: result.signal || null, spawnError: result.spawnError || null, timedOut: result.timedOut, treeStatus: treeConfirmed ? "confirmed" : "unknown(" + result.kill.method + ":" + (result.kill.detail || "") + ")", passed, startedAt, endedAt: new Date().toISOString(), wallMs, outLog: outFile, errLog: errFile };
  state.receipt.gates.push(record);
  process.stdout.write(`[test-workflow] gate ${passed ? "ok" : "FAIL"} exit=${result.exitCode} ${gate.cmd} :: ${outFile}\n`);
  if (!passed) for (const f of [outFile, errFile]) { try { process.stdout.write(`----- ${f} -----\n${fs.readFileSync(f, "utf8")}`); } catch { /* path still reported */ } }
  return record;
}

/* r28（授权修复）：十键隔离把 APPDATA/USERPROFILE 重定向后，测试合法依赖的“实际已存在”用户站点
 * （如 Windows 用户 site 里的 PyYAML）对子孙进程不可见（cluster_scheduler.py 捕获 ModuleNotFoundError
 * 后 yaml=None，随后 NoneType.safe_dump 崩）。只增加既有依赖的只读搜索根：每批一次、在覆盖环境前、
 * 用实际既有 Python（-B 不写字节码、runner 真实 env、无 shell）解析 site.getusersitepackages()；
 * 目录不存在/命令缺失/任何失败 ⇒ 本批一律不注入并打一行降级日志。不安装、不改全局、不硬编码绝对路径。
 * 字节码缓存经 PYTHONPYCACHEPREFIX 明确落每 job 隔离目录，不再回写共享源码树。 */
let pythonDepRoot = null; // null=本批未查；""=已降级不注入；非空=本批合法只读搜索根
function resolvePythonDependencyRoot() {
  if (pythonDepRoot === null) {
    pythonDepRoot = "";
    const cmd = process.platform === "win32" ? "python" : "python3";
    try {
      const r = spawnSync(cmd, ["-B", "-c", "import site; print(site.getusersitepackages())"], {
        encoding: "utf8", timeout: 15000, windowsHide: true, // 继承 runner 真实 env（此处尚未做任何 env 覆盖）
      });
      const dir = r.status === 0 ? String(r.stdout || "").trim() : "";
      if (dir && fs.existsSync(dir)) {
        pythonDepRoot = dir;
        process.stdout.write(`[test-workflow] python dependency search root (read-only, batch-once): ${dir}\n`);
      } else {
        process.stdout.write("[test-workflow] python dependency search root unresolved; no PYTHONPATH injection this batch\n");
      }
    } catch {
      process.stdout.write("[test-workflow] python dependency search root resolution threw; no PYTHONPATH injection this batch\n");
    }
  }
  return pythonDepRoot;
}

/** r29 #1: per-file isolated environment for TEST children only (gates keep canonical env). */
async function isolatedTestEnv(state, idx) {
  // 短根（默认 /tmp）：tmux/inotify 类工具会在 TMPDIR 下再建 socket 路径，AF_UNIX 上限 ~104 字节，
  // 深仓库日志路径会把 socket 顶爆（File name too long）。沙箱语义不变，只是根更短。
  const scratchBase = process.platform === "win32" || !fs.existsSync("/tmp") ? os.tmpdir() : "/tmp"; // 不随继承的 TMPDIR 漂移，嵌套也不放大
  const dir = path.join(scratchBase, "psg-env", `p${process.pid}`, `job-${String(idx).padStart(3, "0")}`);
  await fsp.mkdir(dir, { recursive: true });
  const env = { ...process.env };
  for (const key of GIT_LOCATOR_VARS) delete env[key]; // 六项 Git 定位变量清除（r29 #1）
  for (const key of SANDBOX_ENV_KEYS) env[key] = dir;
  const pyRoot = resolvePythonDependencyRoot(); // r28：只读既有依赖搜索根（每批一次），失败即不注入
  if (pyRoot && !(env.PYTHONPATH || "").split(path.delimiter).includes(pyRoot)) {
    env.PYTHONPATH = env.PYTHONPATH ? `${env.PYTHONPATH}${path.delimiter}${pyRoot}` : pyRoot; // 保留已有 PYTHONPATH，仅追加
  }
  env.PYTHONPYCACHEPREFIX = dir; // 字节码缓存落本 job 隔离目录（旧 Python 忽略该键，无副作用）
  return { env, dir };
}

async function runJob(state, job) {
  const idx = ++state.jobSeq;
  await fsp.mkdir(state.logDir, { recursive: true });
  const outFile = path.join(state.logDir, `job-${String(idx).padStart(3, "0")}-${path.basename(job.file, ".js")}.out.log`);
  const errFile = path.join(state.logDir, `job-${String(idx).padStart(3, "0")}-${path.basename(job.file, ".js")}.err.log`);
  const { env, dir: envDir } = await isolatedTestEnv(state, idx);
  const timeoutIdx = job.argv.indexOf("--test-timeout");
  const innerTimeoutMs = timeoutIdx >= 0 ? Number(job.argv[timeoutIdx + 1]) : null;
  const outerTimeoutMs = Number.isFinite(innerTimeoutMs) ? innerTimeoutMs + state.killGraceMs : null;
  const startedAt = new Date().toISOString(), t0 = nowMono();
  const result = await spawnCaptured(process.execPath, [...job.argv, job.file], {
    cwd: state.root, env, outFile, errFile, timeoutMs: outerTimeoutMs,
    onSpawn: (child, requestKill) => { job.child = child; job.requestKill = requestKill; state.runningJobs.set(job, child); if (state.cancelled) requestKill(); },
  });
  state.runningJobs.delete(job);
  job.child = null;
  const wallMs = nowMono() - t0;
  const treeConfirmed = result.kill.confirmed;
  const status = state.cancelled ? "cancelled" : result.timedOut ? "timeout" : result.spawnError ? "spawn-error" : result.exitCode === 0 && treeConfirmed ? "passed" : "failed";
  const record = { file: job.file, identity: job.identity, argv: job.argv, sources: job.sources, exclusive: job.classification.exclusive, group: job.classification.group, basis: job.classification.basis, envDir, pid: result.pid, startedAt, endedAt: new Date().toISOString(), wallMs, exitCode: result.exitCode, signal: result.signal || null, spawnError: result.spawnError || null, timedOut: result.timedOut || false, treeStatus: treeConfirmed ? "confirmed" : "unknown(" + result.kill.method + ":" + (result.kill.detail || "") + ")", status, outLog: outFile, errLog: errFile, cpuMs: "not-recorded" };
  state.receipt.jobs.push(record);
  process.stdout.write(`[test-workflow] job ${status} exit=${result.exitCode} ${job.file}${job.classification.exclusive ? " [exclusive]" : ""} :: ${outFile}\n`);
  if (status !== "passed") for (const f of [outFile, errFile]) { try { process.stdout.write(`----- ${f} -----\n${fs.readFileSync(f, "utf8")}`); } catch { /* keep path */ } }
  return record;
}

async function runJobsScheduled(state) {
  const pending = [...state.plan.jobs];
  const running = []; // slots: { job, group, promise, settled }
  let maxObserved = 0;
  for (;;) {
    if (!state.cancelled) {
      for (let i = 0; i < pending.length;) {
        if (running.length >= state.maxParallel) break;
        const job = pending[i];
        const exclusiveRunning = running.some(r => r.job.classification.exclusive);
        if (job.classification.exclusive && running.length > 0) { i++; continue; }
        if (!job.classification.exclusive) {
          if (exclusiveRunning) { i++; continue; }
          if (job.classification.group && running.some(r => r.group === job.classification.group)) { i++; continue; } // declared shared group + same-file matrix rows (r29 #3)
        }
        pending.splice(i, 1);
        const slot = { job, group: job.classification.group, settled: false };
        slot.promise = runJob(state, job).then(() => { slot.settled = true; });
        running.push(slot);
        maxObserved = Math.max(maxObserved, running.length);
      }
    } else {
      for (const slot of running) if (slot.job.requestKill) slot.job.requestKill(); // only children this batch owns
    }
    if (!running.length) {
      if (state.cancelled || !pending.length) break;
      continue;
    }
    await Promise.race(running.map(s => s.promise));
    for (let i = running.length - 1; i >= 0; i--) if (running[i].settled) running.splice(i, 1);
  }
  return maxObserved;
}

/* ---------------- same-root batch lock (r29 #7 + r30: 属主确已死的锁直接删除，活动批照旧阻塞) ---------------- */

// 阈值来源均为本轮用户口径（2026-10-28）：进程存在性是硬依据，年龄只是辅助，不得只靠年龄就动活动批。
// r30 口径修订：不用“移走堆积”（会让文件无限度堆叠），改成“能确定的直接删、判不定的先问一次”。
// OWNER_WRITE_GRACE_MS：mkdir 与 owner.json 落盘之间存在窗口（刚建好目录、还没来得及写 owner）。
// 只有“无法证明归属”的锁才需要这个宽限；已证实 pid 消失（ESRCH）不需要宽限。
const OWNER_WRITE_GRACE_MS = 60_000;
// STALE_LOCK_CONFIRM_AGE_MS：属主进程仍在（或存活判定不清）但锁已老到这个程度，才值得打扰用户确认
// 一次删除；没到就继续阻塞（并发批本来就是错的）。此常量只决定“问不问”，永远不会让属主存活的锁
// 被自动删除。
const STALE_LOCK_CONFIRM_AGE_MS = 2 * 60 * 60 * 1000;
/**
 * LOCK_DELETE_CONFIRMATIONS（B3 命名策略开关）：删除本项目批锁需要几次明确点击确认。
 * 取值来源（用户原话，逐条对应）：
 *  - 2026-10-28「B，加一次确认」：选 B，仍然要用户确认，工具不得自行永久删除；把原来的一次确认加为两次明确确认；
 *  - 更早「这些锁不做移走。允许做成直接删除的方式」：只授权“直接删除”这个方式（不移走、不堆积），
 *    并不免除项目 P0“永久删除须两次明确确认”的流程；
 *  - 更早「让用户只需要点击确认即可」：确认只需点击回答，不要求用户输入路径，也不要求用户手工去删。
 * 本轮固定为 2，与项目 P0 永久删除双确认一致。将来放宽只能由用户再次明确授权后改这一个常量，
 * 不得在别处另开旁路；非交互入口（无 TTY、stdin 用于取消控制、CI）在任何取值下都不算确认。
 */
const LOCK_DELETE_CONFIRMATIONS = 2;

/**
 * r30: 判定 pid 是否仍存活。不能假设 signalling 语义跨平台一致：项目 AGENTS 明确警告 Python 的
 * os.kill(pid,0) 在 Windows 对存活进程也会抛错，Node 侧同样只把 ESRCH 当作“确不存在”；
 * EPERM/EACCES（权限不足、他人会话、受保护进程）以及任何其它异常一律保守算存活。
 * 判定不清时最多继续阻塞或让用户确认一次，绝不因为判定不确定就删活动批的锁。
 */
function ownerProcessAlive(pid) {
  const numeric = Number(pid);
  if (!Number.isInteger(numeric) || numeric <= 0) return { alive: false, basis: `owner pid 缺失或非法（${JSON.stringify(pid)}）` };
  try {
    process.kill(numeric, 0);
    return { alive: true, basis: `pid ${numeric} 可 signalling` };
  } catch (error) {
    const code = error && error.code;
    if (code === "ESRCH") return { alive: false, basis: `pid ${numeric} 已不存在（ESRCH）` };
    if (code === "EPERM" || code === "EACCES") return { alive: true, basis: `pid ${numeric} 存在但无权 signalling（${code}）` };
    return { alive: true, basis: `pid ${numeric} 存活判定异常（${code || error}），保守视为存活` };
  }
}

/**
 * 读属主登记（B1 返修）：三种情况必须分开，不得一律归为“损坏即可删”。
 *  - ENOENT：owner 登记确实不存在（missing）——无法证明归属，调用方还要看写盘宽限期；
 *  - 其它读取错误（EACCES/EISDIR/EIO/瞬时错）：readFailed——只是我们读不到，**不等于属主已死**，
 *    调用方一律保守阻塞，绝不因为锁够老就自动删除；
 *  - 读到但解析失败/不是对象：broken（形状不可用），同样按“无法证明归属”处理。
 */
function readLockOwner(lockDir) {
  let text;
  try { text = fs.readFileSync(path.join(lockDir, "owner.json"), "utf8"); } catch (error) {
    const code = error && error.code;
    if (code === "ENOENT") return { text: "(missing)", owner: null, broken: "owner.json 不存在", readFailed: false, missing: true };
    return { text: `(unreadable: ${code || error})`, owner: null, broken: `owner.json 读不到（${code || error}）`, readFailed: true, missing: false };
  }
  let parsed;
  try { parsed = JSON.parse(text); } catch (error) {
    return { text, owner: null, broken: `owner.json 解析失败（${error && error.message || error}）`, readFailed: false, missing: false };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { text, owner: null, broken: "owner.json 不是对象", readFailed: false, missing: false };
  return { text, owner: parsed, broken: null, readFailed: false, missing: false };
}

/** 锁目录自身的年龄（用于写盘宽限与“要不要问用户”的阈值判定，绝不用来自动删活锁）。 */
function lockDirAgeMs(lockDir) {
  try { return Date.now() - fs.statSync(lockDir).mtimeMs; } catch { return Number.POSITIVE_INFINITY; }
}

/**
 * 判定现有锁该怎么处理（B1 返修）。已经没有“自动删除”这一档：
 *  - "ask"：可以请用户点击确认。三种依据：pid 经 ESRCH 确证已消失（唯一的死亡硬依据）；
 *    owner 缺失/形状不可用/没有合法 pid 因而无法证明归属且已过 OWNER_WRITE_GRACE_MS（这只是“无法证明”，
 *    **不是死亡证明**，缺失或损坏 owner 都不等于原批次已退出）；或属主仍在跑但锁龄已达阈值。
 *    进入 ask 也必须完成 LOCK_DELETE_CONFIRMATIONS（本轮 2 次）明确确认才能删，工具绝不自作主张。
 *  - "block"：owner 读取失败（EACCES/EISDIR/EIO/瞬时错：读不到不等于属主已死，身份不明一律保守停止）、
 *    写盘宽限内的无主窗口、属主仍在跑且未到老锁阈值。锁龄永远不能替代归属证据。
 * 返回 action: "ask" | "block"，并带 basis 供日志与确认文案引用。
 */
function classifyStaleLock(lockDir) {
  const { text, owner, broken, readFailed, missing } = readLockOwner(lockDir);
  const pidNumeric = owner ? Number(owner.pid) : NaN;
  const ageMs = lockDirAgeMs(lockDir);
  const view = (extra) => ({ ...extra, ownerText: text,
    batchId: owner && owner.batchId || "(unknown)",
    pid: owner && owner.pid !== undefined && owner.pid !== null ? String(owner.pid) : "(none)",
    startedAt: owner && owner.startedAt || "(unknown)", root: owner && owner.root || "(unknown)", ageMs });
  if (readFailed) {
    // B1：权限/I/O/瞬时错只说明“我们读不到属主”，不是“原批次已退出”。年龄再老也不许判死。
    return view({ action: "block", basis: "owner-read-failed",
      reason: `${broken}：读取失败不等于属主已死，归属未知一律保守阻塞（只有 pid 报 ESRCH 才是死亡硬依据），不自动删除` });
  }
  if (broken || !Number.isInteger(pidNumeric) || pidNumeric <= 0) {
    const why = broken || `owner.json 里没有合法 pid（${JSON.stringify(owner && owner.pid)}）`;
    if (ageMs < OWNER_WRITE_GRACE_MS) return view({ action: "block", basis: "owner-unprovable-in-grace", reason: `${why}，且锁目录只有 ${Math.round(ageMs)}ms（< ${OWNER_WRITE_GRACE_MS}ms 写盘宽限），可能是刚建锁还来不及写 owner 的活动批` });
    return view({ action: "ask", basis: missing ? "owner-missing" : "owner-unusable-shape", reason: `${why}，锁目录已存在 ${Math.round(ageMs / 1000)}s（超过 ${OWNER_WRITE_GRACE_MS / 1000}s 写盘宽限）；这只是无法证明归属，不是死亡证明，必须由用户确认后才动` });
  }
  const alive = ownerProcessAlive(pidNumeric);
  if (!alive.alive) return view({ action: "ask", basis: "owner-dead-esrch", reason: `${alive.basis}（死亡硬依据）；仍需用户完成 ${LOCK_DELETE_CONFIRMATIONS} 次确认才删除` });
  if (ageMs >= STALE_LOCK_CONFIRM_AGE_MS) return view({ action: "ask", basis: "owner-alive-aged", reason: `${alive.basis}，属主仍在跑，但锁已存在 ${Math.round(ageMs / 60000)} 分钟（≥ ${STALE_LOCK_CONFIRM_AGE_MS / 60000} 分钟阈值），无法证明属主已死` });
  return view({ action: "block", basis: "owner-alive", reason: `${alive.basis}，属主仍在跑，且锁龄 ${Math.round(ageMs / 1000)}s 未到老锁阈值` });
}

/**
 * 删除本项目自己创建的锁目录，遵守项目 P0 删除纪律（不因口径放宽而取消）：
 *  1) 目标只能是直接子项名：不允许绝对路径、父目录、`..`、`/`、`\`、通配符或拼接长路径；
 *  2) 目标与直接父目录先解析成规范路径，直接父目录必须落在本项目安全根之内；
 *  3) 先核类型：直接父目录与目标都必须是普通目录且不是符号链接（只删自己创建的锁）；
 *  4) 真的 cd 进直接父目录并核实物理工作目录一致，不一致立即停下报 PARENT_CD_FAILED；
 *  5) 删除参数只能写 `./<直接子项名>`；失败原文抛出，绝不退化成 rm 长路径；
 *  6) 删后核实目标确实不存在；任何情况下都恢复原 cwd。
 * 只用于本工作副本自己的批锁；属主仍存活的他人锁只能问，不能走到这里删。
 */
function deleteOwnedLockChild({ safeRoot, parentDir, childName, chdir: chdirHook, getCwd: getCwdHook }) {
  const rejected = (why) => { throw new Error(`LOCK_TARGET_REJECTED: ${why}；目标=${JSON.stringify(childName)} 父目录=${parentDir}`); };
  if (typeof childName !== "string" || childName.length === 0) rejected("删除目标不能为空");
  if (childName === "." || childName === "..") rejected("删除目标不能是当前目录或父目录");
  if (path.isAbsolute(childName) || /^[a-zA-Z]:[\\/]/.test(childName)) rejected("删除目标不能是绝对路径");
  if (/[\\/]/.test(childName)) rejected("删除目标不能含路径分隔符，只能是直接子项名");
  if (/[*?[\]]/.test(childName)) rejected("删除目标不允许通配符");
  let rootReal, parentReal;
  try { rootReal = fs.realpathSync(path.resolve(safeRoot)); } catch (error) { rejected(`安全根解不开（${error && error.code || error}）`); }
  try { parentReal = fs.realpathSync(path.resolve(parentDir)); } catch (error) { rejected(`直接父目录解不开（${error && error.code || error}）`); }
  const rel = path.relative(rootReal, parentReal);
  if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) rejected(`直接父目录不在安全根内：${parentReal} vs ${rootReal}`);
  let parentStat, targetStat;
  try { parentStat = fs.lstatSync(parentReal); }
  catch (error) { rejected(`直接父目录 stat 失败（${error && error.code || error}）`); }
  if (!parentStat.isDirectory() || parentStat.isSymbolicLink()) rejected(`直接父目录必须是普通目录且不是符号链接：${parentReal}`);
  try { targetStat = fs.lstatSync(path.join(parentReal, childName)); }
  catch (error) { rejected(`目标 stat 失败（${error && error.code || error}），不删除`); }
  if (!targetStat.isDirectory() || targetStat.isSymbolicLink()) rejected(`只能删除自己创建的普通锁目录（不是文件、不是符号链接）：${childName}`);
  const cwdBefore = process.cwd();
  // B1 补齐：chdir 直接抛错（权限不足、目录刚被顶替、路径失效等）也必须统一转成 PARENT_CD_FAILED，
  // 不让调用方看到裸 errno。chdir/getCwd 只是可注入缝，默认行为与以前逐字一致。
  const go = typeof chdirHook === "function" ? chdirHook : (dir) => process.chdir(dir);
  const where = typeof getCwdHook === "function" ? getCwdHook : () => process.cwd();
  try {
    try {
      go(parentReal);
    } catch (error) {
      throw new Error(`PARENT_CD_FAILED: 无法 cd 进直接父目录（${error && error.code || error}），不执行删除`);
    }
    const cwdNow = where();
    const same = process.platform === "win32" ? String(cwdNow).toLowerCase() === parentReal.toLowerCase() : cwdNow === parentReal;
    if (!same) throw new Error(`PARENT_CD_FAILED: 已 cd 但物理工作目录不一致（${cwdNow} vs ${parentReal}），不执行删除`);
    fs.rmSync(`./${childName}`, { recursive: true });
    if (fs.existsSync(`./${childName}`)) throw new Error(`LOCK_STILL_PRESENT: 删除后目标仍存在 ./${childName}`);
  } finally {
    try { process.chdir(cwdBefore); } catch { /* 原 cwd 已不存在时不掩盖真实错因 */ }
  }
  return { parentReal, removed: `./${childName}` };
}

/** 目标指纹：路径 + 类型 + inode + 大小 + mtime + owner.json 内容摘要，用来核实“仍是刚才那把锁”（B2）。 */
function lockFingerprint(evidence) {
  const ownerSha = crypto.createHash("sha256")
    .update(String(evidence.ownerText === undefined ? "" : evidence.ownerText), "utf8").digest("hex").slice(0, 16);
  return `real=${evidence.lockDirReal}|type=${evidence.type}|ino=${evidence.ino}|size=${evidence.size}|mtime=${evidence.mtimeMs}|ownerSha=${ownerSha}`;
}

/**
 * 自动为确认备齐全部事实（B3：用户只需点击，不需要输入路径，也不需要手工删除）：
 * 精确完整路径、类型、属主 owner.json 原文、pid、batchId、startedAt、锁龄、判定依据与目标指纹。
 */
function collectLockEvidence(lockDir) {
  const evidence = { lockDir, type: "(unknown)", lockDirReal: "(解不开)", ino: 0, size: 0, mtimeMs: 0 };
  try {
    const st = fs.lstatSync(lockDir);
    evidence.type = st.isSymbolicLink() ? "符号链接" : (st.isDirectory() ? "普通目录" : "文件");
    evidence.ino = st.ino; evidence.size = st.size; evidence.mtimeMs = Math.round(st.mtimeMs);
  } catch (error) { evidence.type = `stat 失败（${error && error.code || error}）`; }
  try { evidence.lockDirReal = fs.realpathSync(lockDir); } catch { /* 保留“(解不开)”，不猜路径 */ }
  const read = readLockOwner(lockDir);
  evidence.ownerText = read.text;
  evidence.ownerBroken = read.broken;
  evidence.ownerReadFailed = read.readFailed;
  evidence.fingerprint = lockFingerprint(evidence);
  return evidence;
}

/**
 * 删除前的最后一道核实（B2）：目标必须与判定/确认时**完全同一**（指纹一致），且重新判定仍允许进入删除。
 * 等待确认期间原锁退出、另一个活动批取得同名锁时，这里必须失败——旧确认绝不能删掉新锁，
 * 也不能拿“外层还会重试三轮”当作删除前核验的替代。
 */
function verifyLockDeletionTarget(lockDir, evidence, verdict) {
  const now = collectLockEvidence(lockDir);
  if (now.fingerprint !== evidence.fingerprint) {
    return { ok: false, changed: true, now, reason: `目标已不是判定/确认时的那把锁（旧指纹=${evidence.fingerprint} 新指纹=${now.fingerprint}）` };
  }
  const again = classifyStaleLock(lockDir);
  if (again.action !== "ask") return { ok: false, changed: false, now, again, reason: `删除前重新判定为 ${again.action}（${again.reason}），不删除` };
  if (verdict && again.basis !== verdict.basis) return { ok: false, changed: false, now, again, reason: `删除前判定依据已变化（${verdict.basis} → ${again.basis}），不删除，交回重新判定` };
  return { ok: true, now, again };
}

/** 只读一行确认输入：默认 N；读不到（EOF、stdin 不可用）一律按未确认处理，绝不当成同意。 */
function readConfirmationLine() {
  let answer = "";
  try {
    const buf = Buffer.alloc(1);
    for (let i = 0; i < 4096; i++) {
      let read = 0;
      try { read = fs.readSync(0, buf, 0, 1); } catch { break; }
      if (read <= 0) break;
      answer += buf.toString("utf8", 0, 1);
      if (answer.includes("\n")) break;
    }
  } catch { answer = ""; }
  return answer.trim();
}

/**
 * 永久删除批锁前的确认（B3 + 用户 2026-10-28「B，加一次确认」）：必须完成
 * LOCK_DELETE_CONFIRMATIONS 次**明确点击**（本轮 2 次，与项目 P0 永久删除双确认一致）。
 * 每次确认前自动打印精确路径、类型、owner、pid、batchId、startedAt、锁龄、判定依据与目标指纹；
 * 用户只回答 y/N，不需要输入路径，也不需要自己手工去删。
 * 两次确认之间必须重新核实“仍是刚才那把锁”；删除前还有 verifyLockDeletionTarget 这第三道核验。
 * 非交互入口（无 TTY、stdin 被本批用于取消控制、CI）一律不代为决定，只打印事实后继续阻塞：
 * “没有终端”不是同意；日志、死亡证据或直接子项限制都不能替代确认要求。
 */
function confirmLockDeletion(state, verdict, evidence) {
  const interactive = process.stdin.isTTY === true || process.env.TEST_WORKFLOW_INTERACTIVE === "1";
  if (!interactive || state.cancelStdin) {
    return { approved: false, confirmations: 0,
      reason: `无交互终端（stdin 不是 TTY，或本批用 stdin 做取消控制，或 CI），不代为决定：${LOCK_DELETE_CONFIRMATIONS} 次确认一次也没有发生` };
  }
  const ageText = Number.isFinite(verdict.ageMs) ? `${Math.round(verdict.ageMs / 1000)}s` : "未知";
  for (let round = 1; round <= LOCK_DELETE_CONFIRMATIONS; round++) {
    if (round > 1) {
      const now = collectLockEvidence(state.lockDir);
      if (now.fingerprint !== evidence.fingerprint) {
        return { approved: false, confirmations: round - 1, targetChanged: true,
          reason: `第 ${round - 1} 次与第 ${round} 次确认之间目标已变化（旧指纹=${evidence.fingerprint} 新指纹=${now.fingerprint}），停止删除并重新判定` };
      }
    }
    process.stdout.write(`[test-workflow] 永久删除批锁——第 ${round}/${LOCK_DELETE_CONFIRMATIONS} 次确认（本项目 P0：永久删除须 ${LOCK_DELETE_CONFIRMATIONS} 次明确确认，只需回答 y，默认 N）\n`
      + `  精确路径        : ${state.lockDir}\n`
      + `  类型            : ${evidence.type}\n`
      + `  属主 owner.json : ${String(evidence.ownerText).split(/\r?\n/).join(" ").slice(0, 400)}\n`
      + `  pid / batchId   : ${verdict.pid} / ${verdict.batchId}\n`
      + `  startedAt       : ${verdict.startedAt}\n`
      + `  锁龄 / 安全根    : ${ageText} / ${state.root}\n`
      + `  判定依据        : ${verdict.basis} —— ${verdict.reason}\n`
      + `  目标指纹        : ${evidence.fingerprint}\n`
      + `  影响范围        : 只删除这个锁目录本身（直接子项 ./batch.lock），同目录其它文件与项目文件一律不动\n`
      + `确认删除 ${state.lockDir} ？[y/N] `);
    const answer = readConfirmationLine();
    process.stdout.write(`（第 ${round}/${LOCK_DELETE_CONFIRMATIONS} 次回答：${answer || "(空，默认 N)"}）\n`);
    if (!/^y(es)?$/i.test(answer)) {
      return { approved: false, confirmations: round - 1,
        reason: `第 ${round}/${LOCK_DELETE_CONFIRMATIONS} 次确认未通过（回答 ${JSON.stringify(answer)}，默认 N），此前 ${round - 1} 次确认不作数` };
    }
  }
  return { approved: true, confirmations: LOCK_DELETE_CONFIRMATIONS, reason: `用户已在终端完成 ${LOCK_DELETE_CONFIRMATIONS} 次明确确认` };
}

/**
 * 取得本工作副本的批锁（r31 口径，仅服务本地测试/打包工具链；插件运行时的其它锁不套用这里的规则）。
 * 拿不到锁时：先只读判定归属（B1：读不到 owner / 身份不明一律阻塞，年龄不能替代归属证据）；
 * 只有可进入确认的依据（ESRCH 死亡硬依据、无法证明归属且已过写盘宽限、属主存活但锁已老）才转成确认；
 * 确认必须完成 LOCK_DELETE_CONFIRMATIONS（本轮 2 次）明确点击（B3），删除前还要核实仍是同一目标（B2）；
 * 非交互入口与用户拒绝都继续阻塞，并给出精确路径与全部事实。任何情况下都不移动、不留档、不批量清理。
 */
async function acquireLock(state) {
  // r17-C: the batch lock lives inside the consumed project's managed tree (git-ignored and
  // package-ignored by the existing simple_cluster rules). Admission/release semantics are
  // byte-identical to before; a crash-residual lock at the OLD repo-root location is neither
  // scanned nor touched.
  const parent = path.join(state.root, "simple_cluster", "locks", "simple-experiment", "test-workflow");
  await fsp.mkdir(parent, { recursive: true });
  state.lockDir = path.join(parent, "batch.lock");
  const meta = { pid: process.pid, entry: state.plan.entry, batchId: state.batchId, startedAt: new Date().toISOString(), root: state.root };
  // 最多三轮：mkdir 失败 → 判归属 → 用户双确认且复核通过才删除后重试（并发竞争时下一轮重新判定）。
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await fsp.mkdir(state.lockDir);
      await fsp.writeFile(path.join(state.lockDir, "owner.json"), JSON.stringify(meta, null, 1));
      return;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      const verdict = classifyStaleLock(state.lockDir);
      // B3：无论哪一档都先自动备齐事实，阻塞文案与确认文案直接引用，用户不必自己去找路径。
      const evidence = collectLockEvidence(state.lockDir);
      const ageText = Number.isFinite(verdict.ageMs) ? `${Math.round(verdict.ageMs / 1000)}s` : "未知";
      const facts = `pid=${verdict.pid} batchId=${verdict.batchId} startedAt=${verdict.startedAt} 锁龄=${ageText}`
        + ` 依据=${verdict.basis} 指纹=${evidence.fingerprint}`;
      const blockLine = (extra) => `another test-workflow batch owns this working copy — 拒绝并发批（不放大并行上限）。${verdict.reason}。`
        + ` ${facts} root=${verdict.root} 锁目录=${state.lockDir}。${extra}owner.json=${verdict.ownerText}`;
      let confirmed = 0;
      if (verdict.action === "ask") {
        const answer = confirmLockDeletion(state, verdict, evidence);
        if (!answer.approved) {
          fail(blockLine(`${answer.reason}。要自动清理请在本机交互终端重跑并连续 ${LOCK_DELETE_CONFIRMATIONS} 次回答 y，`
            + `或人工确认无活动批后自行删除这个精确目录：${state.lockDir}`), 3);
        }
        confirmed = answer.confirmations;
      } else {
        fail(blockLine(`归属不明或属主仍存活，本工具不会自动删除锁。要清理请等属主退出、或锁龄超过 ${STALE_LOCK_CONFIRM_AGE_MS / 60000} 分钟后`
          + `在本机交互终端连续 ${LOCK_DELETE_CONFIRMATIONS} 次回答 y，或人工确认无活动批后自行删除这个精确目录：${state.lockDir}`), 3);
      }
      // B2：删除前最后一道核实——必须还是刚才判定并确认的那把锁，且重新判定仍允许删除。
      // 期间被新的活动批顶替时绝不删除，只记一行并重新判定（“还有三轮重试”不是核验的替代）。
      const check = verifyLockDeletionTarget(state.lockDir, evidence, verdict);
      if (!check.ok) {
        if (check.changed) {
          console.log(`[test-workflow] STALE-LOCK-RECLASSIFY 删除前复核发现 ${state.lockDir} 已不是判定/确认时的那把锁（${check.reason}），本轮不删除，重新判定`);
          continue;
        }
        fail(blockLine(`删除前复核不通过：${check.reason}`), 3);
      }
      try { deleteOwnedLockChild({ safeRoot: state.root, parentDir: parent, childName: "batch.lock" }); }
      catch (removeError) {
        fail(`拒绝并发批（不放大并行上限）：用户已确认陈旧的锁（${verdict.reason}，${facts}）但删除被安全纪律拦下：${removeError && removeError.message || removeError}`
          + `；锁目录=${state.lockDir}`, 3);
      }
      console.log(`[test-workflow] STALE-LOCK-DELETED 依据=${verdict.reason} 旧pid=${verdict.pid} 旧batchId=${verdict.batchId}`
        + ` 旧startedAt=${verdict.startedAt} 锁龄=${ageText} 已删目录=${state.lockDir}`
        + ` 来源=用户终端确认（${confirmed}/${LOCK_DELETE_CONFIRMATIONS} 次） 目标指纹=${evidence.fingerprint}`);
    }
  }
  fail(`another test-workflow batch owns this working copy — 拒绝并发批（不放大并行上限）：三轮内未能取得 ${state.lockDir}。`
    + `请确认无活动批后删除这个精确目录再重试`, 3);
}

function releaseOwnedLock(state) {
  if (!state.lockDir) return;
  try {
    const owner = JSON.parse(fs.readFileSync(path.join(state.lockDir, "owner.json"), "utf8"));
    if (owner.pid === process.pid && owner.batchId === state.batchId) {
      fs.writeFileSync(path.join(state.logDir, "lock-release.json"), JSON.stringify({ releasedAt: new Date().toISOString(), owner }, null, 1));
      fs.rmSync(state.lockDir, { recursive: true, force: true });
      state.lockReleased = true;
    }
  } catch { /* not ours — leave untouched */ }
}

/* ---------------- receipt validation (r29 #5) ---------------- */

function validateReceiptForAssemble(priorPath, entryName, currentPlan, currentFingerprint, currentArtifact) {
  if (!fs.existsSync(priorPath)) return { ok: false, reason: "receipt missing" };
  let r;
  try { r = JSON.parse(fs.readFileSync(priorPath, "utf8")); } catch (e) { return { ok: false, reason: "receipt unreadable: " + e.message }; }
  if (r.schemaVersion !== 2) return { ok: false, reason: `receipt schemaVersion=${r.schemaVersion} not trusted (run fresh)` };
  if (r.entry !== entryName) return { ok: false, reason: `receipt entry=${r.entry} != ${entryName}` };
  if (r.overall !== "passed") return { ok: false, reason: `receipt overall=${r.overall}` };
  if (!Array.isArray(r.jobs) || !r.jobs.length) return { ok: false, reason: "receipt has no job evidence" };
  if (r.inputFingerprint !== currentFingerprint) return { ok: false, reason: "input fingerprint mismatch (源码/测试/脚本/lock/配置/平台工具链已变化)" };
  if (r.endFingerprint !== r.inputFingerprint) return { ok: false, reason: `receipt was invalidated by mid-run drift (endFingerprint=${r.endFingerprint})` };
  if (r.fullCheckPlanHash !== planHash(currentPlan)) return { ok: false, reason: "fullCheck plan hash mismatch (文件矩阵/参数矩阵已变化)" };
  if (r.artifactFingerprint !== currentArtifact) return { ok: false, reason: "编译产物 hash 与当前 dist 不一致" };
  if (!r.candidate || r.candidate.state !== "validated") return { ok: false, reason: `receipt candidate state=${(r.candidate && r.candidate.state) || "missing"} — 仅 validated 候选可组装（compiled 不可，r24 #3）` };
  const byKey = new Map(r.jobs.map(j => [j.identity + "\u0000" + j.argv.join("\u0000"), j]));
  const problems = [];
  for (const job of currentPlan.jobs) {
    const row = byKey.get(job.identity + "\u0000" + job.argv.join("\u0000"));
    if (!row) { problems.push(`missing-job:${job.file}`); continue; }
    if (row.file !== job.file) problems.push(`file-mismatch:${job.file}!=${row.file}`);
    else if (row.status !== "passed" || row.exitCode !== 0) problems.push(`not-passed:${job.file}=${row.status}/${row.exitCode}`);
    else if (!row.outLog || !fs.existsSync(row.outLog)) problems.push(`missing-log:${job.file}`);
  }
  const gateOk = new Set(r.gates.filter(g => g.passed).map(g => g.cmd));
  for (const cmd of currentPlan.requiredGates) if (!gateOk.has(cmd)) problems.push(`missing-gate:${cmd}`);
  const selProblem = testSelection.decisionMatchesReceipt(r.selection, currentPlan.selection); // 同一按需策略与决策，开发/交付/package/组装同源核对（禁止组装环节隐式扩跑/缩跑）
  if (selProblem) problems.push(selProblem);
  if (r.selection && Array.isArray(r.selection.onDemand)) {
    const onDemandFiles = new Set(r.selection.onDemand.flatMap(g => g.files));
    for (const job of currentPlan.jobs) if (onDemandFiles.has(job.file)) problems.push(`selection-inconsistent:当前计划包含按需文件 ${job.file}`);
  }
  if (problems.length) return { ok: false, reason: "逐项对账失败: " + problems.slice(0, 8).join(", ") + (problems.length > 8 ? ` …共${problems.length}项` : "") };
  return { ok: true, batchId: r.batchId, jobs: r.jobs.length, gates: r.gates.length };
}

/* ---------------- main ---------------- */

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const manifestFile = loadManifest(opts.root, opts.manifest);
  const manifest = manifestFile.data;
  const plan = planEntry(manifestFile.file, manifest, opts.root, opts.entry, opts);
  const globalCap = (manifest.batchDefaults && manifest.batchDefaults.maxParallel) || 2;
  if (opts.maxParallel && opts.maxParallel > globalCap) fail(`--max-parallel=${opts.maxParallel} exceeds the task-wide cap ${globalCap} (r29 #2)`);
  const batchId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${process.pid}-${plan.entry.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  const state = {
    root: opts.root, plan, batchId,
    logDir: opts.logDir || path.join(opts.root, "simple_cluster", "reports", "test-workflow", batchId),
    maxParallel: opts.maxParallel || globalCap,
    killGraceMs: (manifest.batchDefaults && manifest.batchDefaults.killGraceMs) || 30000,
    gateSeq: 0, jobSeq: 0, cancelStdin: !!opts.cancelStdin, cancelled: false, refused: null, activeGateKill: null, runningJobs: new Map(),
    receipt: { schemaVersion: 2, batchId, entry: plan.entry, final: plan.final, root: opts.root, manifest: manifestFile.file, startedAt: new Date().toISOString(), maxParallel: 0, hooksVerified: plan.hookProof, closurePreflight: null, phases: {}, gates: [], jobs: [], dedup: plan.dedup, overall: null },
    t0: nowMono(), phaseTimes: [], lockDir: null, lockReleased: false, receiptWritten: false,
  };
  state.receipt.maxParallel = state.maxParallel;
  state.receipt.fullCheckPlanHash = planHash(plan);
  state.receipt.selectionDedupFiles = new Set(plan.jobs.map(j => j.file)).size + plan.onDemandJobs.length;

  if (opts.dryRun) {
    const byGroup = { independent: 0, exclusive: 0 };
    for (const j of plan.jobs) byGroup[j.classification.exclusive ? "exclusive" : "independent"]++;
    console.log(JSON.stringify({ entry: plan.entry, final: plan.final, jobs: plan.jobs.length, independent: byGroup.independent, exclusive: byGroup.exclusive, dedup: plan.dedup, prereq: plan.prereq, phases: Object.keys(plan.phases), hooksVerified: plan.hookProof, selection: plan.selection, onDemandJobs: plan.onDemandJobs }, null, 1));
    return 0;
  }

  const startFingerprint = inputFingerprint(opts.root);
  state.receipt.inputFingerprint = startFingerprint;
  await fsp.mkdir(state.logDir, { recursive: true });
  await acquireLock(state);
  const onCancel = () => {
    state.cancelled = true;
    if (state.activeGateKill) state.activeGateKill();
    for (const job of state.plan.jobs) if (job.requestKill && state.runningJobs.has(job)) job.requestKill();
  };
  process.on("SIGINT", onCancel);
  process.on("SIGTERM", onCancel);

  /* r28 U2（主控批准的 Windows 验收所需接口）：--cancel-stdin 时监听已管道的 stdin，
   * 收到恰好一行 "cancel"（支持分块到达、忽略 CRLF、EOF 不触发）即走既有 onCancel——
   * Windows 强杀（TerminateProcess）不承诺任何 JS 收尾，合作入口让取消结算凭据在两平台真实写出。
   * 不加任意命令接口；收尾（含 planFail 早退）必须解除监听，否则 CLI 被 stdin 挂住。 */
  let detachCancelStdin = () => {};
  if (opts.cancelStdin) {
    process.stdin.setEncoding("utf8");
    let pending = "";
    const onData = chunk => {
      pending += chunk;
      let nl;
      while ((nl = pending.indexOf("\n")) >= 0) {
        const line = pending.slice(0, nl).replace(/\r$/, "");
        pending = pending.slice(nl + 1);
        if (line === "cancel") onCancel();
      }
    };
    process.stdin.on("data", onData);
    detachCancelStdin = () => { process.stdin.off("data", onData); process.stdin.pause(); };
  }

  const writeReceiptAndRelease = async code => {
    if (state.receiptWritten) return code;
    state.receiptWritten = true;
    detachCancelStdin(); // r28 U2: 解除 stdin 监听，事件loop可自然退出
    const totalMs = nowMono() - state.t0;
    const endFingerprint = inputFingerprint(opts.root);
    state.receipt.endFingerprint = endFingerprint;
    state.receipt.artifactFingerprint = artifactFingerprint(opts.root);
    state.receipt.endedAt = new Date().toISOString();
    state.receipt.totalWallMs = totalMs;
    state.receipt.phaseWalls = state.phaseTimes;
    state.receipt.logDir = state.logDir;
    state.receipt.launchedCount = state.receipt.jobs.length;
    const failed = state.receipt.gates.filter(g => !g.passed && !g.skippedAfterCancel).length + state.receipt.jobs.filter(j => j.status !== "passed").length;
    const skipped = state.receipt.gates.filter(g => g.skippedAfterCancel).length;
    if (state.cancelled || skipped) state.receipt.overall = "cancelled";
    else if (state.refused) state.receipt.overall = "refused";
    else if (endFingerprint !== startFingerprint) state.receipt.overall = "invalidated"; // r29 #5: mid-run drift never yields a passed credential
    else if (failed) state.receipt.overall = "failed";
    else state.receipt.overall = "passed";
    const candidate = { distFingerprint: state.receipt.artifactFingerprint };
    if (state.receipt.gates.some(g => g.phase === "compile" && g.passed) && !state.receipt.gates.some(g => g.phase === "compile" && !g.passed)) candidate.state = "compiled";
    if (state.receipt.overall === "passed" && plan.phases.fullCheck) candidate.state = "validated"; // 只有完整 fullCheck 实际读取同一输出+全部 gates 逐项核且无漂移才可 validated
    const assembleGates = state.receipt.gates.filter(g => g.phase === "assemble");
    const vsceGate = [...assembleGates].reverse().find(g => /vsce/.test(g.cmd) && g.passed && g.outLog && fs.existsSync(g.outLog));
    if (vsceGate && assembleGates.every(g => g.passed)) { // packaged 必须含打包后清单门禁通过（r25-A） // packaged：实物 .vsix 定位+SHA（与 gate 日志同批可取回）
      try {
        const m = fs.readFileSync(vsceGate.outLog, "utf8").match(/Packaged:?\s*(\S+\.vsix)/);
        const vsix = m && (path.isAbsolute(m[1]) ? m[1] : path.join(state.root, m[1]));
        if (vsix && fs.existsSync(vsix)) candidate.packaged = { path: vsix, sha256: sha256Fresh(vsix), bytes: fs.statSync(vsix).size, at: new Date().toISOString() };
        else candidate.packaged = { error: "vsix path not found in assemble gate log" };
      } catch (e) { candidate.packaged = { error: e.message }; }
    }
    state.receipt.candidate = candidate;
    state.receipt.selection = plan.selection;
    state.receipt.onDemandJobs = plan.onDemandJobs;
    const runPath = opts.receiptOut || path.join(state.logDir, "run.json");
    try { await fsp.mkdir(path.dirname(runPath), { recursive: true }); } catch { /* fallthrough to write attempt */ }
    try { // exclusive wx: never overwrite a prior credential or evidence
      await fsp.writeFile(runPath, JSON.stringify(state.receipt, null, 1), { flag: "wx" });
    } catch (error) {
      process.stderr.write(`[test-workflow] run receipt write refused (${error.code}): ${runPath} — 凭据不可覆盖，另指定 --receipt-out 或新日志目录。\n`);
      state.receipt.overall = state.receipt.overall === "passed" ? "failed" : state.receipt.overall;
    }
    const pointer = path.join(opts.root, "simple_cluster", "reports", "test-workflow", `last-${plan.entry.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`);
    try { // pointer/summary only — the run.json under the batch logDir is the fact file
      await fsp.mkdir(path.dirname(pointer), { recursive: true });
      await fsp.writeFile(pointer, JSON.stringify({ pointer: true, batchId, runReceipt: runPath, entry: plan.entry, overall: state.receipt.overall, totalWallMs: state.receipt.totalWallMs, inputFingerprint: startFingerprint, endedAt: state.receipt.endedAt }, null, 1));
    } catch { /* pointer is best-effort */ }
    releaseOwnedLock(state);
    if (state.receipt.overall === "passed" && (plan.phases.compile || plan.phases.fullCheck)) {
      try { // 完整 compile+fullCheck+package 通过 = 当前闭包状态的新证明，记录进 closure-state（r29 #8 增量核的完成记录）
        // 覆盖范围诚实分级：只有完整打包链证明“全部”；check:full/build 只重验源码与测试。
        const covered = ["package", "acceptance"].includes(plan.entry) ? "all" : "src,test,scripts";
        const att = spawnSync(process.execPath, [path.join(__dirname, "test-workflow-preflight.js"), "--attest", "--categories", covered, "--refs", runPath, "--root", opts.root], { cwd: opts.root, encoding: "utf8", timeout: 60000 });
        process.stdout.write(`[test-workflow] closure re-attested: ${(att.stdout || att.stderr || "").trim().split("\n").pop()}\n`);
      } catch { /* attestation recording never invalidates a passed run */ }
    }
    process.stdout.write(`[test-workflow] entry=${plan.entry} overall=${state.receipt.overall} files=${state.receipt.jobs.length} maxParallel=${state.maxParallel} maxObservedConcurrent=${state.maxConcurrent || 0} dedupRemoved=${plan.dedup.duplicatesRemoved} logDir=${state.logDir}\n`);
    const sel = plan.selection;
    process.stdout.write(`[test-selection] strategy=${sel.strategyVersion} decision=${sel.selectionHash.slice(0, 16)} 原总文件槽=${plan.dedup.requestedSlots} 去重后文件=${state.receipt.selectionDedupFiles} 组数=${sel.groupCount} 旧候选cap=${sel.oldCandidateCap} 保护恢复=${sel.protectedRestoredCount}${sel.restoredByUserCount ? `+用户恢复${sel.restoredByUserCount}` : ""} 按需静默文件=${sel.onDemandFileCount} 实际执行作业=${sel.executedJobCount}（按需≠通过：${sel.onDemandFileCount} 个文件未运行、不计入结果）\n`);
    if (sel.onDemand.length) process.stdout.write(`[test-selection] 按需清单: ${sel.onDemand.map(g => g.key + "(" + g.files.length + ")").join(", ")} —— 恢复入口: --include-ondemand all 或 组名/文件子串\n`);
    for (const p of state.phaseTimes) process.stdout.write(`[test-workflow] phase ${p.phase} wall=${p.wallMs}ms${p.note ? " " + p.note : ""}\n`);
    process.stdout.write(`[test-workflow] TOTAL wall=${totalMs}ms (monotonic; run.json=${runPath} lockReleased=${state.lockReleased})\n`);
    if (state.receipt.overall !== "passed") return code || 1;
    if (code) return code;
    if (plan.report === "acceptance") writeAcceptanceReport(opts.root, state.receipt);
    return 0;
  };

  try {
    // r29 #8: deterministic closure preflight before any compile/fullCheck/package work.
    if (plan.phases.compile || plan.phases.assemble) {
      const preArgs = [path.join(__dirname, "test-workflow-preflight.js"), "--check", "--root", opts.root];
      if (plan.phases.compile || plan.phases.fullCheck) preArgs.push("--full-entry"); // 本运行自身即相关变化的增量核，通过后回写证明
      const pre = spawnSync(process.execPath, preArgs, { cwd: opts.root, encoding: "utf8", timeout: 120000 });
      state.receipt.closurePreflight = { exit: pre.status, out: (pre.stdout || "").trim().split("\n").slice(-4), err: (pre.stderr || "").trim().split("\n").slice(-4) };
      if (pre.status !== 0) { state.refused = "closure preflight: " + (pre.stdout || pre.stderr || "").trim().split("\n").slice(-3).join(" | "); process.stderr.write(pre.stdout || ""); process.stderr.write(pre.stderr || ""); return await writeReceiptAndRelease(1); }
      process.stdout.write(`[test-workflow] closure preflight ok: ${(pre.stdout || "").trim().split("\n").pop()}\n`);
    }

    // r29 #5: assemble validates against the CURRENT plan (package or check:full credential), item-by-item.
    if (plan.requiresReceiptForEntry) {
      const currentFingerprint = inputFingerprint(opts.root);
      const currentArtifact = artifactFingerprint(opts.root);
      const candidates = opts.receipt ? [opts.receipt] : (Array.isArray(plan.requiresReceiptForEntry) ? plan.requiresReceiptForEntry : [plan.requiresReceiptForEntry])
        .map(e => {
          const pointerPath = path.join(opts.root, "simple_cluster", "reports", "test-workflow", `last-${e.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`);
          try { return JSON.parse(fs.readFileSync(pointerPath, "utf8")).runReceipt || pointerPath; } catch { return pointerPath; }
        });
      let verdict = { ok: false, reason: "no candidate receipt found — 先完整通过一次 package 或 check:full" };
      const refusalReasons = [];
      for (const priorPath of candidates) {
        let prior = null;
        try { prior = JSON.parse(fs.readFileSync(priorPath, "utf8")); } catch { verdict = { ok: false, reason: `receipt missing/unreadable: ${priorPath}` }; refusalReasons.push(verdict.reason); continue; }
        const wanted = Array.isArray(plan.requiresReceiptForEntry) ? plan.requiresReceiptForEntry : [plan.requiresReceiptForEntry];
        const sourceEntryName = wanted.find(e => prior.entry === e);
        if (!sourceEntryName) { verdict = { ok: false, reason: `receipt ${priorPath} entry=${prior.entry} not in [${wanted}]` }; continue; }
        const sourcePlan = planEntry(manifestFile.file, manifest, opts.root, sourceEntryName, { domains: [], only: [], root: opts.root, includeOndemand: opts.includeOndemand }); // 恢复入口必须端到端一致：验收时 --include-ondemand all，组装核对同参重算同一决策
        verdict = validateReceiptForAssemble(priorPath, sourceEntryName, sourcePlan, currentFingerprint, currentArtifact);
        verdict.receiptPath = priorPath;
        if (verdict.ok) break;
        refusalReasons.push(`${priorPath}: ${verdict.reason}`);
      }
      if (!verdict.ok) {
        process.stderr.write(`[test-workflow] package:assemble refused: ${refusalReasons.length ? refusalReasons.join(" | ") : verdict.reason} — 缺失/失败/过期/对账不过一律拒绝，不是绕过门禁入口。\n`);
        state.refused = `package:assemble refused: ${refusalReasons.join(" | ") || verdict.reason}`;
        return await writeReceiptAndRelease(1);
      }
      process.stdout.write(`[test-workflow] assemble credential validated: ${verdict.receiptPath} batch=${verdict.batchId} jobs=${verdict.jobs} gates=${verdict.gates} 逐项对账通过\n`);
    }

    for (const phaseName of ["compile", "lint"]) {
      const spec = plan.phases[phaseName];
      if (!spec) continue;
      if (state.cancelled) return await writeReceiptAndRelease(1);
      const t0 = nowMono();
      for (const gate of spec.gates) { const r = await runGate(state, gate); if (!r.passed) return await writeReceiptAndRelease(1); if (state.cancelled) break; }
      state.phaseTimes.push({ phase: phaseName, wallMs: nowMono() - t0 });
      if (state.cancelled) return await writeReceiptAndRelease(1);
    }

    if (plan.prereq.length) {
      const t0 = nowMono();
      for (const cmd of plan.prereq) { const r = await runGate(state, { cmd, phase: "prereq", source: "hoisted once-per-batch" }); if (!r.passed) return await writeReceiptAndRelease(1); if (state.cancelled) break; }
      state.phaseTimes.push({ phase: "prereq", wallMs: nowMono() - t0 });
      if (state.cancelled) return await writeReceiptAndRelease(1);
    }

    if (plan.phases.fullCheck) {
      const spec = plan.phases.fullCheck;
      const t0 = nowMono();
      for (const gate of spec.domainGates || []) { const r = await runGate(state, gate); if (!r.passed) return await writeReceiptAndRelease(1); if (state.cancelled) break; }
      if (!state.cancelled) state.maxConcurrent = await runJobsScheduled(state);
      state.phaseTimes.push({ phase: "fullCheck", wallMs: nowMono() - t0, files: plan.jobs.length });
      if (state.cancelled) return await writeReceiptAndRelease(1);
      const failed = state.receipt.jobs.filter(j => j.status !== "passed");
      if (failed.length) { process.stderr.write(`[test-workflow] ${failed.length} job(s) not passed: ${failed.map(f => `${f.file}=${f.status}/${f.exitCode}`).join(", ")}\n`); return await writeReceiptAndRelease(1); }
    }

    for (const phaseName of ["post", "assemble"]) {
      const spec = plan.phases[phaseName];
      if (!spec) continue;
      if (state.cancelled) return await writeReceiptAndRelease(1);
      const t0 = nowMono();
      for (const gate of spec.gates) { const r = await runGate(state, gate); if (!r.passed) return await writeReceiptAndRelease(1); if (state.cancelled) break; }
      state.phaseTimes.push({ phase: phaseName, wallMs: nowMono() - t0 });
    }
    return await writeReceiptAndRelease(0);
  } catch (error) {
    // r29 #7: any unexpected exit still settles launched children and writes a non-zero receipt.
    process.stderr.write(`[test-workflow] FATAL: ${error && error.stack || error}\n`);
    for (const job of state.runningJobs.values()) killOwnedTree(job);
    if (error.planFail && !state.receipt.jobs.length && !state.receipt.gates.length) { // pre-execution planning failure: no run credential required
      detachCancelStdin(); // r28 U2: 早退路径同样解除监听
      releaseOwnedLock(state);
      return error.exitCode || 1;
    }
    return await writeReceiptAndRelease(1);
  }
}

function writeAcceptanceReport(root, receipt) {
  const dir = path.join(root, "simple_cluster", "reports", "acceptance");
  fs.mkdirSync(dir, { recursive: true });
  const summary = { generatedAt: receipt.endedAt, overall: receipt.overall, batchId: receipt.batchId, logDir: receipt.logDir, runReceipt: path.join(receipt.logDir, "run.json"), totalWallMs: receipt.totalWallMs, phaseWalls: receipt.phaseWalls, files: receipt.jobs.length, maxParallel: receipt.maxParallel, gates: receipt.gates.map(g => ({ cmd: g.cmd, phase: g.phase, passed: g.passed, exitCode: g.exitCode, log: g.outLog })), failedJobs: receipt.jobs.filter(j => j.status !== "passed").map(j => ({ file: j.file, status: j.status, exitCode: j.exitCode, log: j.outLog })) };
  fs.writeFileSync(path.join(dir, "latest.json"), JSON.stringify(summary, null, 2) + "\n");
  const sel = receipt.selection || null;
  const md = ["# SimpleExperiment Acceptance", "", `overall=${receipt.overall}`, `generatedAt=${receipt.endedAt}`, `totalWallMs=${receipt.totalWallMs} files=${receipt.jobs.length} maxParallel=${receipt.maxParallel}`, `full logs: ${receipt.logDir}`,
    ...(sel ? ["", `按需选择(${sel.strategyVersion} decision=${sel.selectionHash.slice(0, 16)}): 组=${sel.groupCount} cap=${sel.oldCandidateCap} 保护恢复=${sel.protectedRestoredCount} 按需静默文件=${sel.onDemandFileCount}（**未运行，不是通过**；恢复: --include-ondemand all）`, ...(sel.onDemand.length ? ["", "按需（未运行）清单:", ...sel.onDemand.flatMap(g => g.files.map(f => `- ${f} [${g.key}]`))] : [])] : []),
    "", "| Step | Status | Exit |", "| --- | --- | --- |",
    ...receipt.gates.map(g => `| gate ${g.cmd} | ${g.passed ? "passed" : "failed"} | ${g.exitCode} |`),
    ...receipt.jobs.filter(j => j.status !== "passed").map(j => `| job ${j.file} | ${j.status} | ${j.exitCode} |`)].join("\n");
  fs.writeFileSync(path.join(dir, "latest.md"), md + "\n");
  process.stdout.write(`[acceptance] overall=${receipt.overall} report=${path.join(dir, "latest.md")} logs=${receipt.logDir}\n`);
}

module.exports = { planEntry, planHash, jobIdentity, expandGlobPattern, resolveStepCommand, validateReceiptForAssemble, inputFingerprint, verifyNoNpmHooks, sha256File, sha256Fresh,
  ownerProcessAlive, readLockOwner, classifyStaleLock, deleteOwnedLockChild, collectLockEvidence, lockFingerprint,
  verifyLockDeletionTarget, confirmLockDeletion, LOCK_DELETE_CONFIRMATIONS, STALE_LOCK_CONFIRM_AGE_MS, OWNER_WRITE_GRACE_MS };

if (require.main === module) main().then(code => { process.exitCode = code; }).catch(error => {
  process.stderr.write(`[test-workflow] FATAL: ${error && error.stack || error}\n`);
  process.exitCode = error && error.exitCode || 1;
});
