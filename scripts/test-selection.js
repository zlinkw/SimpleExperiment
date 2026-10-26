"use strict";
/* ============ 旧测试按需选择器 —— 唯一实现、唯一规则集（2026-10-26 用户核准）============
 * 所有入口（开发/交付清单、package、package:assemble 的 receipt 核对）必须调用本模块的
 * buildSelection 生成【本轮唯一决策】；任何入口不得复制/改写规则或自行二次判定。
 * 语义（逐条对应用户需求）：
 *  - 单位=当前真实测试文件；组=manifest 既有 domain（唯一分组依据：domain 本身承载共同功能边界；
 *    绝不按 helper/import 连组，绝不静默合并参数矩阵——参数不同的同文件 job 同组但逐个保留）。
 *  - 组时间=max(成员首次进入 Git 时间)（最新成员出生时间，git log --diff-filter=A；
 *    重命名成员用 git log --follow 追认原加入记录）；任何成员历史不可得 ⇒ 组时间 unknown ⇒ 永不判旧。
 *  - 每次开始测试流程都重算（buildSelection 无缓存、按当前权威清单+真实文件身份现算）。
 *  - cap=floor(N*0.6)，按组时间升序（同时间按组名字典序稳定序）取最旧 cap 组为旧候选；
 *    保护规则命中的候选【恢复执行、不向后补齐】⇒ 实际按需比例 ≤60%；最新 40% 与 unknown 组默认运行。
 *  - “按需”=不默认启动：文件、断言、恢复入口（--include-ondemand）全部保留；决策与 receipt 中
 *    按需项状态是 on_demand，绝不写入/折算为 pass。
 * 规则集（唯一判据来源，改动任何一行都要升 STRATEGY_VERSION；主控 2026-10-26 返修裁定版）：
 *  R1 归组：job.source 链（expandDomain 的 "entry>…>domain"）中最右侧的 manifest.domains 键；无 domain 归属 ⇒ 保护（basis: no-domain-ownership）。
 *     “非关键”必须有可检查依据＝manifest 既有 domain 归属；缺依据 ⇒ 保护。
 *  R2 关键类（正向保护判据）：组键或任一成员路径命中 CRITICAL_PATTERN（锁/互斥/隔离/权限/删除/恢复/取消/停止/租约/完整性/直连 SSH 禁令等）⇒ 保护。
 *  R3 本轮改动真实影响（复用项目既有映射，不新建代码图）：变更文件（status --porcelain -z 含未跟踪 +
 *     diff --name-status -z 相对 origin/master，重命名新旧路径都算，排除 dist/simple_cluster/docs 执行无关路径）——
 *     a) 直接命中组成员文件 ⇒ 保护该组；
 *     b) 命中组成员的既有 attested closure（classification.parallel[].basis.closure —— manifest 内实际存在的
 *        测试→源文件映射，含 src/**.ts 与 dist/**.js 路径；只取路径映射，哈希漂移由 runner 分类环节另行处理）⇒ 保护该组；
 *     c) runner/清单自身（RUNNER_OWN_FILES）⇒ 影响所有组执行 ⇒ 全保护；git 不可用 ⇒ 全保护；
 *     d) 其余组：全部成员均 attested（whitelist 内有 basis）⇒ 可证实与本轮改动无关 ⇒ 保留按需候选；
 *        任一成员无 attested ⇒ 无法证明无关 ⇒ 保护（basis: unattested-members）。
 *  R4 其余 ⇒ 该组属“可判定的非关键旧组”，参与按时间排序；cap 外（较新）组默认运行。
 *  历史可靠性：浅克隆/浅边界外首加入拿不到 ⇒ 该组不得判旧（unknown ⇒ 默认执行），成员与原因如实计入
 *  summary 的 unknownMembers/shallowRepo 字段。 */
const crypto = require("node:crypto");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const STRATEGY_VERSION = "ondemand-old-tests-v2"; // v2：变更解析改 -z 双输出（修复 diff 路径截断 bug）+ closure 定域保护 + 未跟踪新增计入 + 浅历史原因字段
const RATIO = 0.6;
const CRITICAL_PATTERN = /(lock|mutex|isolat|permission|delet|recover|restor|cancel|stop|lease|security|integrity|no-direct-ssh|orphan|submission-truth)/i;
const RUNNER_OWN_FILES = new Set(["scripts/test-workflow.js", "scripts/test-selection.js", "scripts/test-workflow.json", "package.json", "tsconfig.json"]); // 影响所有组执行/编译契约的文件：改动⇒全保护
const CHANGE_IRRELEVANT_PREFIXES = ["dist/", "simple_cluster/", "docs/", "node_modules/"]; // 构建输出/运行证据/文档/依赖安装：不改变测试执行语义（dist 变化经 attested closure 的 src 路径捕获；依赖变化由 package-lock.json/package.json 捕获）

function git(root, args) {
  try { return execFileSync("git", ["-c", "core.quotePath=false", ...args], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 }); }
  catch { return null; }
} // quotePath=false：非 ASCII 路径不得被引号+八进制转义（空格/中文文件名原样，-z 不隐含此设置）

/** 一次批量 git log 取全仓文件首加入时间；重命名等未命中者逐文件 --follow 追认；仍失败 ⇒ 缺席（unknown ⇒ 组不得判旧）。
 *  gitFn 可注入（离线复现用），默认走真实 git；浅克隆由调用方核 is-shallow 并如实记字段。 */
function firstAddedTimes(root, files, gitFn) {
  const g = gitFn || (args => git(root, args));
  const times = new Map();
  // 浅克隆：浅边界(root)提交里的 A 记录是浅抓取假象（真实加入可能在浅外更早）⇒ 不可靠，一律不记 ⇒ 该组 unknown 保守。
  const shallow = (g(["-c", "core.quotePath=false", "rev-parse", "--is-shallow-repository"]) || "").trim() === "true";
  let boundary = new Set();
  if (shallow) { const bl = g(["-c", "core.quotePath=false", "rev-list", "--max-parents=0", "HEAD"]); if (bl) boundary = new Set(bl.trim().split("\n").filter(Boolean)); }
  const out = g(["-c", "core.quotePath=false", "log", "--reverse", "--diff-filter=A", "--name-only", "--format=@%ct %H"]);
  if (out === null) return times; // 历史整体不可靠：全部 unknown ⇒ 全保守执行
  let ct = null, commit = null;
  for (const line of out.split("\n")) {
    if (line.startsWith("@")) { const parts = line.slice(1).trim().split(" "); ct = Number(parts[0]); commit = parts[1] || ""; continue; }
    const rel = line.trim().split(path.sep).join("/");
    if (rel && ct !== null && !times.has(rel) && !(shallow && boundary.has(commit))) times.set(rel, ct);
  }
  for (const rel of files) {
    if (times.has(rel)) continue;
    const follow = g(["-c", "core.quotePath=false", "log", "--follow", "--diff-filter=A", "--format=%ct %H", "--", rel]); // 重命名追踪原加入记录
    if (follow) {
      const lines = follow.trim().split("\n").filter(Boolean);
      const last = lines[lines.length - 1];
      if (last) { const [ctStr, hash] = last.trim().split(" "); if (!(shallow && boundary.has(hash))) times.set(rel, Number(ctStr)); }
    }
  }
  return times;
}

/** 两种 porcelain/diff 输出分开解析，全部 -z NUL 分隔（空格/中文安全）：
 *  status --porcelain=v1 -z：字段 "XY SP path"，R/C 条目的下一字段为原路径；含未跟踪（不传 -uno ⇒ 新源码文件计入）。
 *  diff --name-status -z：状态字段 + 路径（R/C 为 old,new 两字段 ⇒ 新旧路径都算变更）。 */
function changedFiles(root, gitFn) {
  const g = gitFn || (args => git(root, args));
  const relevant = rel => rel && !CHANGE_IRRELEVANT_PREFIXES.some(p => rel.startsWith(p));
  const set = new Set();
  const st = g(["status", "--porcelain=v1", "-z"]);
  if (st === null) return null; // 变更范围不可知 ⇒ 调用方全保守
  const sf = st.split("\0"); if (sf[sf.length - 1] === "") sf.pop();
  for (let i = 0; i < sf.length; i++) {
    const f = sf[i];
    if (f.length < 4) continue;
    const xy = f.slice(0, 2), p = f.slice(3);
    if (xy.includes("R") || xy.includes("C")) { // porcelain.z：rename/copy 条目后随字段＝原路径
      if (relevant(p)) set.add(p);
      i++; if (relevant(sf[i])) set.add(sf[i]);
    } else if (relevant(p)) set.add(p); // 含 "?? path" 未跟踪新增
  }
  const df = g(["diff", "--name-status", "-z", "origin/master...HEAD"]);
  if (df === null) return null;
  const ff = df.split("\0"); if (ff[ff.length - 1] === "") ff.pop();
  for (let i = 0; i < ff.length; i++) {
    const status = ff[i];
    if (/^[RC]\d*$/.test(status)) { const old = ff[++i], nw = ff[++i]; if (relevant(nw)) set.add(nw); if (relevant(old)) set.add(old); }
    else { const p = ff[++i]; if (relevant(p)) set.add(p); }
  }
  return [...set];
}

/** 复用 manifest 内实际存在的映射（attested whitelist 的 closure：测试文件→其依赖的 src/dist 路径）。
 *  只读路径集合；不新建代码图。无 closure 的成员＝无法证明无关 ⇒ R3d 保护。 */
function attestedClosureIndex(manifest) {
  const byTest = new Map();
  for (const e of (manifest.classification && manifest.classification.parallel) || []) byTest.set(e.file, new Set((e.basis && e.basis.closure || []).map(c => c.path)));
  return byTest;
}

function groupKeyOfJob(job, domainNames) {
  let key = null;
  for (const source of job.sources || []) {
    for (const token of String(source).split(">").reverse()) if (domainNames.has(token.trim())) { key = token.trim(); break; }
    if (key) break;
  }
  return key;
}

/** 本轮唯一决策：入口一律消费返回值，不再自行判定。jobs=去重后的计划作业（含参数矩阵）。
 *  gitFn 仅供离线复现注入（默认真实 git），交付调用一律省略。 */
function buildSelection(manifest, root, jobs, includeOndemand, gitFn) {
  const g = gitFn || (args => git(root, args));
  const domainNames = new Set(Object.keys(manifest.domains || {}));
  const byFile = new Map(); // relFile -> {group|null, jobs:[]}
  for (const job of jobs) {
    if (!byFile.has(job.file)) byFile.set(job.file, { group: groupKeyOfJob(job, domainNames), jobs: [] });
    byFile.get(job.file).jobs.push(job);
  }
  const times = firstAddedTimes(root, [...byFile.keys()], g);
  const head = (g(["rev-parse", "HEAD"]) || "").trim() || "unknown-head";
  const shallow = (g(["rev-parse", "--is-shallow-repository"]) || "").trim() === "true"; // 浅克隆：浅边界外的首加入拿不到⇒成员 unknown⇒组不判旧（保守），如实记
  const changed = changedFiles(root, g);
  const scopeUnknown = changed === null || changed.some(f => RUNNER_OWN_FILES.has(f)); // runner/清单自身或 git 不可用 ⇒ 影响所有组执行 ⇒ 全保护
  const closure = attestedClosureIndex(manifest);
  const groups = new Map(); // key -> {key, files, firstAddedMax|null, ownershipKnown}
  for (const [file, info] of byFile) {
    if (!info.group) { groups.set("protected:" + file, { key: "protected:" + file, files: [file], firstAddedMax: null, ownershipKnown: false }); continue; } // R1
    if (!groups.has(info.group)) groups.set(info.group, { key: info.group, files: [], firstAddedMax: null, ownershipKnown: true });
    groups.get(info.group).files.push(file);
  }
  for (const g of groups.values()) {
    if (!g.ownershipKnown) continue;
    let max = 0;
    g.unknownMembers = [];
    for (const f of g.files) { const t = times.get(f); if (t === undefined) { g.unknownMembers.push(f); max = null; } else if (max !== null) max = Math.max(max, t); } // 任一成员首加入不可靠 ⇒ 组 unknown（浅克隆/浅边界外/未跟踪新文件均在此保守）
    g.firstAddedMax = max;
  }
  const N = groups.size;
  const cap = Math.floor(N * RATIO);
  const ordered = [...groups.values()].filter(g => g.firstAddedMax !== null).sort((a, b) => a.firstAddedMax - b.firstAddedMax || a.key.localeCompare(b.key));
  const candidates = ordered.slice(0, cap);
  const protectedRestored = [];
  const onDemand = [];
  const protectedKeys = new Set();
  for (const g of candidates) {
    let reason = null;
    if (scopeUnknown) reason = changed === null ? "change-scope-unprovable(git)" : "runner-or-manifest-change"; // R3c
    else if (CRITICAL_PATTERN.test(g.key) || g.files.some(f => CRITICAL_PATTERN.test(f))) reason = "critical-class"; // R2
    else if (changed.some(f => g.files.includes(f))) reason = "changed-this-round"; // R3a 直接命中组成员
    else if (changed.some(f => g.files.some(file => closure.has(file) && closure.get(file).has(f)))) reason = "changed-mapped-closure"; // R3b 既有 attested closure 映射命中（src/dist 依赖）
    else if (g.files.some(f => !closure.has(f))) reason = "unattested-members"; // R3d 有成员无既有映射 ⇒ 无法证明无关 ⇒ 保守保护
    if (reason) protectedRestored.push({ group: g.key, reason }); else onDemand.push(g);
    if (reason) protectedKeys.add(g.key);
  }
  const include = new Set((includeOndemand || []).flatMap(s => String(s).split(",")).map(s => s.trim()).filter(Boolean));
  const restoredByUser = [];
  const finalOnDemand = [];
  for (const g of onDemand) {
    const hit = include.has("all") || include.has(g.key) || g.files.some(f => [...include].some(tok => tok !== "all" && f.includes(tok)));
    if (hit) restoredByUser.push({ group: g.key, reason: "user-include" }); else finalOnDemand.push(g);
  }
  const onDemandFiles = new Set(finalOnDemand.flatMap(g => g.files));
  const executedJobs = jobs.filter(j => !onDemandFiles.has(j.file));
  const onDemandJobs = jobs.filter(j => onDemandFiles.has(j.file));
  const summary = {
    strategyVersion: STRATEGY_VERSION, ratio: RATIO, head,
    groupCount: N, oldCandidateCap: cap,
    protectedRestoredCount: protectedRestored.length, restoredByUserCount: restoredByUser.length,
    onDemandGroupCount: finalOnDemand.length, onDemandFileCount: onDemandFiles.size, executedJobCount: executedJobs.length,
    scopeUnknown: scopeUnknown ? (changed === null ? "git-unprovable" : "runner-or-manifest-change") : "none",
    shallowRepo: shallow, changedFilesCount: changed ? changed.length : null,
    groups: [...groups.values()].map(g => ({ key: g.key, firstAddedMax: g.firstAddedMax, unknownMembers: g.unknownMembers || [], files: [...g.files].sort() })).sort((a, b) => a.key.localeCompare(b.key)),
    oldCandidates: candidates.map(g => g.key), protectedRestored, restoredByUser,
    onDemand: finalOnDemand.map(g => ({ key: g.key, files: [...g.files].sort() })),
  };
  summary.selectionHash = crypto.createHash("sha256").update(JSON.stringify({ v: STRATEGY_VERSION, head, g: summary.groups, c: summary.oldCandidates, p: summary.protectedRestored, u: summary.restoredByUser })).digest("hex");
  return { summary, executedJobs, onDemandJobs };
}

/** receipt 组装核对的决策一致性：同一策略+同一候选/清单 ⇒ 同 hash；不一致即拒（禁止 package 链上隐式扩跑或缩跑）。 */
function decisionMatchesReceipt(priorSelection, currentSelection) {
  if (!priorSelection || !currentSelection) return "selection missing on " + (!priorSelection ? "prior receipt" : "current plan") + " — 按需决策不可缺项核对";
  if (priorSelection.strategyVersion !== currentSelection.strategyVersion) return `selection strategy ${priorSelection.strategyVersion}!=${currentSelection.strategyVersion}`;
  if (priorSelection.selectionHash !== currentSelection.selectionHash) return "selection decision hash mismatch (候选/组清单/按需与保护分类已变化，按当前决策重跑完整验收)";
  return null;
}

module.exports = { STRATEGY_VERSION, buildSelection, decisionMatchesReceipt, firstAddedTimes, changedFiles };
