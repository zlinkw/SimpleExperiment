"use strict";
/**
 * r24 #2 已安装 tsc 原生 incremental + 显式分区 tsBuildInfoFile + 完整输入/输出校验。
 * perf 2026-10-26：分区键只按【兼容边界】划分（见下方 compatHash 构成与 compatVersion 人工升位判据）；
 * 全部输入文件内容哈希仍是完整输入身份 inputHash，独立保存在 state 中并继续驱动 verify-only 门禁。
 * 源码内容/文件数/项目版本号变化不再换分区——由 tsbuildinfo 原生增量吸收（这正是 incremental 的职责）。
 * 语义（命中=诚实的 native up-to-date，发射数如实打印；绝不把 tsbuildinfo 存在当收益）：
 *  - 无状态/键漂移/上次失败 → miss(cold|previous-failed)，tsc --incremental 照常全查；
 *  - 上次 complete 且 tsbuildinfo 在、state.outputs 逐文件 sha 全匹配 → incremental（native 判定 no-op 或增量发射）；
 *  - 输出缺失/被改/部分写入 → 当前分区整体封存为 `.stale-<ts>`（保留证据，不删），开新分区冷编译——
 *    专门覆盖“tsbuildinfo 在但 JS 丢失/被改”不被原生 up-to-date 掩盖；
 *  - 错平台/架构天然不同键，不共享；两棵树各自目录各自状态。
 * 失败：state.status=failed + 旧状态留证（state-<status>-<ts>.json），下次按 previous-failed 走增量重建（有界）。
 * 缓存目录 simple_cluster/cache/tsc/** 不在输入指纹类别、被 .vscodeignore 排除；同根批锁覆盖写入协调。
 * 用法: node scripts/tsc-cached.js [--root dir] [额外 tsc 参数透传]；默认与 `tsc -p . --pretty false` 相同 API/参数。
 */
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");

const SELF_REPO = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
let root = process.cwd();
const passthrough = [];
let verifyOnly = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--root") root = path.resolve(args[++i]);
  else if (args[i] === "--verify-only") verifyOnly = true;
  else passthrough.push(args[i]);
}
const ts = require(path.join(SELF_REPO, "node_modules", "typescript")); // 项目 5.9.3 JS API：仅用于 tsconfig 解析与 fileNames，旧 API 代码路径绝不 require 全局 7
const projectTscBin = path.join(SELF_REPO, "node_modules", "typescript", "bin", "tsc");

/* ============ 共享全局 TS7 CLI 运行时发现（perf 2026-10-26，主控核准接入）============
 * 固定校验 typescript@7.0.2；只读 package.json 版本字段，不加载其 API；不硬编码当前用户路径
 * （env PSG_TSC7_BIN 显式声明 或 npm root -g 实际布局）；绝不 npx/隐式下载；
 * 发现不到/版本不符 ⇒ 回退项目 5.9.3 CLI 并把逐条原因如实打印与入 state。 */
const TS7_EXPECTED = "7.0.2";
function discoverSharedTsc7() {
  const reasons = [];
  const bins = [];
  if (process.env.PSG_TSC7_DISABLE === "1") return { kind: "ts5-project", bin: projectTscBin, version: ts.version, source: "disabled", fallbackReasons: ["PSG_TSC7_DISABLE=1（显式回退开关）"] };
  if (process.env.PSG_TSC7_BIN) bins.push(["env PSG_TSC7_BIN", path.resolve(process.env.PSG_TSC7_BIN)]);
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  let probe = null;
  try { probe = spawnSync(npm, ["root", "-g"], { encoding: "utf8", windowsHide: true }); } catch { probe = null; }
  if (probe && probe.status === 0 && probe.stdout.trim()) bins.push(["npm root -g", path.join(probe.stdout.trim(), "typescript", "bin", "tsc")]);
  else reasons.push("npm root -g unavailable: " + (probe ? String(probe.stderr || probe.error?.message || "exit " + probe.status).trim() : "spawn failed"));
  for (const [source, bin] of bins) {
    if (!fs.existsSync(bin)) { reasons.push(`${source}: bin missing at ${bin}`); continue; }
    let meta = null;
    try { meta = JSON.parse(fs.readFileSync(path.join(bin, "..", "..", "package.json"), "utf8")); }
    catch (e) { reasons.push(`${source}: package.json unreadable (${e.code || e.message})`); continue; }
    if (meta.name !== "typescript" || meta.version !== TS7_EXPECTED) { reasons.push(`${source}: version mismatch (found ${meta.name}@${meta.version}, want typescript@${TS7_EXPECTED})`); continue; }
    return { kind: "ts7-global", bin, version: meta.version, source };
  }
  return { kind: "ts5-project", bin: projectTscBin, version: ts.version, source: "fallback", fallbackReasons: reasons };
}
const compilerUsed = discoverSharedTsc7();
// 已核准的候选兼容覆盖（仅隔离 CLI 覆盖，不改 tsconfig/源码/锁文件；CJS 目标不变，Node24 原生支持动态 import）：
const compilerOverrides = compilerUsed.kind === "ts7-global" ? ["--module", "Node16", "--moduleResolution", "Node16"] : [];
if (compilerUsed.kind === "ts5-project" && compilerUsed.fallbackReasons.length) process.stdout.write(`[tsc-cached] TS7 共享 CLI 未启用，回退项目 5.9.3 CLI：${compilerUsed.fallbackReasons.join(" | ")}\n`);

function shaFile(abs) { return crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex"); }
const relOf = abs => path.relative(root, abs).split(path.sep).join("/");

/* 有效编译配置：走 TypeScript 自己的解析（尊重 include/exclude/extends），得到权威 fileNames。 */
const tsconfigPath = path.join(root, "tsconfig.json");
const read = ts.readConfigFile(tsconfigPath, p => fs.readFileSync(p, "utf8"));
if (read.error) { process.stderr.write("[tsc-cached] ERROR: tsconfig unreadable: " + JSON.stringify(read.error) + "\n"); process.exit(2); }
const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, root);
const inputFiles = parsed.fileNames.slice().sort();

const toolchainMarkers = [];
for (const m of ["node_modules/typescript/package.json", "node_modules/@types/node/package.json", "node_modules/@types/vscode/package.json", "package.json", "package-lock.json"]) {
  const abs = path.join(root, m);
  if (fs.existsSync(abs)) toolchainMarkers.push([m, shaFile(abs)]);
}
const inputsHasher = crypto.createHash("sha256");
inputsHasher.update(JSON.stringify({
  root: (() => { try { return fs.realpathSync(root); } catch { return path.resolve(root); } })(),
  platform: process.platform, arch: process.arch, node: process.version,
  compiler: { kind: compilerUsed.kind, version: compilerUsed.version }, // 完整输入身份同样绑定实际执行编译器与有效选项（verify-only 结论不得跨编译器沿用；不冒报 API 版本）
  argv: [...(passthrough.length ? passthrough : ["-p", ".", "--pretty", "false"]), ...compilerOverrides],
  options: { ...parsed.options, ...(compilerOverrides.length ? { module: "Node16", moduleResolution: "Node16" } : {}) }, fileCount: inputFiles.length,
}));
inputsHasher.update("\n");
for (const m of toolchainMarkers) inputsHasher.update(m[0]).update("\u0000").update(m[1]).update("\n");
for (const abs of inputFiles) inputsHasher.update(relOf(abs)).update("\u0000").update(fs.existsSync(abs) ? shaFile(abs) : "missing").update("\n");
const inputHash = inputsHasher.digest("hex");

/* ============== 兼容分区（perf 2026-10-26）==============
 * partition 只按“编译器兼容边界”划分。原生 incremental（tsbuildinfo）本身就按规格跟踪文件内容与
 * 文件集合变化；把源码内容放进分区键会让每次改动都丢掉上一份 buildinfo 从零冷启动。
 * compatHash 六类构成：
 *   1 compatVersion（兼容公式版本，见下方人工升位判据）；
 *   2 规范 worktree/输出位置 realpath(root)（不同副本绝不共享可写 buildinfo/dist）；
 *   3 宿主 platform/arch/node 精确版；
 *   4 工具链：ts.version + typescript 包体哈希 + @types/node、@types/vscode 包哈希（类型环境载体；
 *     package-lock 若更换 @types 由本类捕获）；
 *   5 有效编译选项（规范化 parsed.options）+ 透传 argv（两者共同决定发射契约）；
 *   6 明确排除：源码内容、fileCount、项目 package.json 版本字段、package-lock 全文——
 *     前两者属 incremental 原生跟踪范围，后两者不改变编译器兼容性。
 * compatVersion 人工升位判据（任一命中必须手动升位；其余情况一律不动，不做自动升位）：
 *   a) TypeScript 大版本变化（tsbuildinfo 格式随大版本演进）；
 *   b) 本脚本 tsbuildinfo/state 存储格式或语义变化；
 *   c) 输出目录/发射语义变化（outDir 语义、--listEmittedFiles 的 dist/ 前缀过滤口径等）；
 *   d) 本键构成（边界项增删）变化。
 * 完整输入身份 inputHash 与 verify-only、.stale 封存、失败证据、同副本串行语义逐字保留；
 * 公式升级后首编译是一次性冷启动，如实记录，不表述为“缓存失效已修”。 */
const COMPAT_VERSION = "v3"; // 升位判据 d（键构成变化）：v3 记录【实际执行编译器】身份与覆盖选项，不再以项目 API 5.9.3 冒报实际编译器
const compatHasher = crypto.createHash("sha256");
compatHasher.update(JSON.stringify({
  compatVersion: COMPAT_VERSION,
  root: (() => { try { return fs.realpathSync(root); } catch { return path.resolve(root); } })(),
  platform: process.platform, arch: process.arch, node: process.version,
  compiler: { kind: compilerUsed.kind, version: compilerUsed.version, bin: (() => { try { return fs.realpathSync(compilerUsed.bin); } catch { return compilerUsed.bin; } })() },
  compilerOverrides,
  argv: [...(passthrough.length ? passthrough : ["-p", ".", "--pretty", "false"])],
  options: { ...parsed.options, ...Object.fromEntries(compilerOverrides.length ? [["module", "Node16"], ["moduleResolution", "Node16"]] : []) }, // 有效选项=tsconfig+覆盖
}));
for (const m of ["node_modules/typescript/package.json", "node_modules/@types/node/package.json", "node_modules/@types/vscode/package.json"]) {
  const abs = path.join(root, m);
  compatHasher.update("\n").update(m).update("\u0000").update(fs.existsSync(abs) ? shaFile(abs) : "missing");
}
const compatHash = compatHasher.digest("hex");
const partition = `${process.platform}-${process.arch}-compat${COMPAT_VERSION}-${compatHash.slice(0, 16)}`;
const cacheRoot = process.env.PSG_TSC_CACHE_ROOT || path.join(root, "simple_cluster", "cache", "tsc"); // r26 #1 配对评估用覆盖；默认路径不变
const cacheDir = path.join(cacheRoot, partition);
const buildInfo = path.join(cacheDir, "tsconfig.tsbuildinfo");
const stateFile = path.join(cacheDir, "state.json");

function stash(prefix) {
  try {
    const st = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    const keep = path.join(cacheDir, `${prefix}-${String(st.completedAt || st.updatedAt || "unknown").replace(/[:.]/g, "-")}.json`); // r27: ISO 冒号是 Windows 非法文件名字符，统一既有 - 规范
    if (st.status !== "complete") fs.copyFileSync(stateFile, keep); // failed/broken evidence retained
    return st;
  } catch { return null; }
}

fs.mkdirSync(cacheDir, { recursive: true });
let state = null;
try { state = JSON.parse(fs.readFileSync(stateFile, "utf8")); }
catch (error) {
  if (fs.existsSync(stateFile)) { fs.copyFileSync(stateFile, path.join(cacheDir, `state-broken-${Date.now()}.json`)); process.stdout.write(`[tsc-cached] state unreadable (${error.code}) — preserved as broken evidence\n`); }
}

if (verifyOnly) {
  // 旧 "npm run typecheck" 门禁语义保留：类型检查必须通过且绑定当前输入——但不重放同输入编译。
  // 判定：state.status=complete 且 inputHash==当前输入 且 tsbuildinfo 在 且 outputs sha 全匹配 ⇒ 上次 tsc
  // （含完整类型检查）针对的就是这组字节，结论不变；任何漂移 ⇒ 非零（调用方需按完整编译门禁重跑）。
  const problems = [];
  if (!state || state.status !== "complete") problems.push("no-complete-state");
  else if (state.inputHash !== inputHash) problems.push("input-hash-drift");
  if (!fs.existsSync(buildInfo)) problems.push("tsbuildinfo-missing");
  if (!problems.length) for (const [rel, shaWant] of Object.entries(state.outputs || {})) {
    const abs = path.join(root, rel);
    let cur = null; try { cur = fs.existsSync(abs) ? shaFile(abs) : "missing"; } catch { cur = "unreadable"; }
    if (cur !== shaWant) { problems.push("output-drift:" + rel); break; }
  }
  if (problems.length) { process.stderr.write(`[tsc-cached] verify-only FAILED (${problems.join(",")}) partition=${partition} — 需完整编译（同输入 tsc 已含类型检查，漂移后结论不可沿用）\n`); process.exit(1); }
  process.stdout.write(`[tsc-cached] verify-only ok partition=${partition} inputs=${inputFiles.length} 与上次完成编译(typecheck+emit, ts=${state.toolchain.ts})输入哈希一致、输出无漂移 — 类型检查结论绑定当前输入，未重放编译\n`);
  process.exit(0);
}

let mode, missReason = "none";
if (!state) { mode = "cold"; missReason = "no-state"; }
else if (state.status === "failed") { mode = "rebuild"; missReason = "previous-failed"; stash("state-failed-kept"); }
else if (state.status !== "complete") { mode = "cold"; missReason = "state-" + state.status; }
else if (!state.toolchain || state.toolchain.platform !== process.platform || state.toolchain.arch !== process.arch || state.toolchain.ts !== compilerUsed.version || state.toolchain.compiler !== compilerUsed.kind || state.toolchain.node !== process.version) { mode = "cold"; missReason = "toolchain/state-mismatch"; }
else if (state.compatHash !== compatHash) { mode = "cold"; missReason = "compat-formula-mismatch"; }
else {
  const missing = [];
  for (const [rel, sha] of Object.entries(state.outputs || {})) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) { missing.push(rel + " (+missing)"); continue; }
    let cur = null; try { cur = shaFile(abs); } catch { cur = "unreadable"; }
    if (cur !== sha) missing.push(rel + " (改)");
  }
  if (!fs.existsSync(buildInfo)) { mode = "cold"; missReason = "tsbuildinfo-missing"; }
  else if (missing.length) {
    missReason = "output-drift(" + missing.slice(0, 3).join(",") + (missing.length > 3 ? `…${missing.length}项` : "") + ")";
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    fs.renameSync(cacheDir, cacheDir + ".stale-" + stamp); // 整体封存（含旧 state/tsbuildinfo），新分区冷编译；不删他人缓存
    fs.mkdirSync(cacheDir, { recursive: true });
    state = null;
    mode = "cold";
  } else { mode = "incremental"; }
}

process.stdout.write(`[tsc-cached] partition=${partition} compat=${COMPAT_VERSION}:${compatHash.slice(0, 12)} inputHash=${inputHash.slice(0, 12)}${state && state.status === "complete" && state.inputHash ? (state.inputHash === inputHash ? " (same-input)" : " (input-drift)") : ""} mode=${mode} missReason=${missReason} cacheDir=${path.relative(root, cacheDir)} inputs=${inputFiles.length} compiler=${compilerUsed.kind}@${compilerUsed.version}${compilerOverrides.length ? " [" + compilerOverrides.join(" ") + "]" : ""} api=${ts.version}${compilerUsed.source !== "fallback" ? " via " + compilerUsed.source : ""}\n`);

const startedAtIso = new Date().toISOString();
const tscArgs = [compilerUsed.bin, ...(passthrough.length ? passthrough : ["-p", ".", "--pretty", "false"]), ...compilerOverrides, "--incremental", "--tsBuildInfoFile", buildInfo, "--listEmittedFiles"];
const t0 = process.hrtime.bigint();
const run = spawnSync(process.execPath, tscArgs, { cwd: root, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
const wallMs = Number((process.hrtime.bigint() - t0) / 1000000n);
const stdout = run.stdout ? run.stdout.toString() : "";
const stderr = run.stderr ? run.stderr.toString() : "";
process.stdout.write(stdout);
process.stderr.write(stderr);
if (run.error) process.stderr.write(`[tsc-cached] spawn error: ${run.error.message}\n`);

const emitted = stdout.split("\n").filter(l => l.startsWith("TSFILE:"));
const ok = !run.error && run.status === 0;
const nowIso = new Date().toISOString();
if (ok) {
  const outputs = (state && state.status === "complete" ? { ...state.outputs } : {});
  for (const line of emitted) {
    const abs = line.slice("TSFILE: ".length).trim();
    if (!abs || !fs.existsSync(abs)) continue;
    const rel = relOf(abs);
    if (!rel.startsWith("dist/")) continue;
    try { outputs[rel] = shaFile(abs); } catch { /* next run re-verifies from scratch */ }
  }
  const priorInputHash = state && state.status === "complete" ? state.inputHash : null;
  const nextState = { status: "complete", inputHash, previousInputHash: priorInputHash, inputDrift: priorInputHash === null ? null : { changed: priorInputHash !== inputHash, from: priorInputHash.slice(0, 12), to: inputHash.slice(0, 12) }, compatHash, compatVersion: COMPAT_VERSION, partition, toolchain: { platform: process.platform, arch: process.arch, node: process.version, ts: compilerUsed.version, compiler: compilerUsed.kind, compilerOverrides }, outputs, emittedLastRun: emitted.length, mode, missReason, wallMs, startedAt: startedAtIso, completedAt: nowIso };
  if (state && state.status === "complete") fs.copyFileSync(stateFile, path.join(cacheDir, `state-complete-${String(state.completedAt || "prev").replace(/[:.]/g, "-")}.json`)); // r27 同上
  fs.writeFileSync(stateFile + ".tmp", JSON.stringify(nextState, null, 1));
  fs.renameSync(stateFile + ".tmp", stateFile); // 完整写入（tmp+rename），半写状态只会落 broken 证据
} else {
  const failed = { status: "failed", inputHash, previousInputHash: state && state.status === "complete" ? state.inputHash : null, compatHash, compatVersion: COMPAT_VERSION, partition, failedAt: nowIso, exit: run.status, note: "tsc 失败；下次按 previous-failed 增量重建；本文件与 gate 日志为失败证据" };
  if (state && state.status === "complete") fs.copyFileSync(stateFile, path.join(cacheDir, `state-complete-prior-${nowIso.replace(/[:.]/g, "-")}.json`));
  fs.writeFileSync(stateFile, JSON.stringify(failed, null, 1));
}
process.stdout.write(`[tsc-cached] result=${ok ? "ok" : "FAILED exit=" + run.status} emitted=${emitted.length} wall=${wallMs}ms stateFile=${path.relative(root, stateFile)}\n`);
process.exitCode = ok ? 0 : (run.status || 1);
