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
 * 规则集（唯一判据来源，改动任何一行都要升 STRATEGY_VERSION）：
 *  R1 归组：job.source 链（expandDomain 的 "entry>…>domain"）中最右侧的 manifest.domains 键；无 domain 归属 ⇒ 保护（basis: no-domain-ownership）。
 *  R2 关键类：组键或任一成员路径命中 CRITICAL_PATTERN（锁/互斥/隔离/权限/删除/恢复/取消/停止/租约/完整性/直连 SSH 禁令等）⇒ 保护。
 *  R3 本轮改动真实影响：变更文件（工作区+相对 origin/master 提交差，排除 dist/simple_cluster/docs 执行无关路径）
 *     直接命中组成员文件 ⇒ 保护该组；命中 src/** 或 scripts/** 或 package.json/tsconfig/test-workflow.json
 *     （无法证明与任何域无关的范围未知改动）⇒ 全组保护（basis: change-scope-unmappable）。
 *  R4 其余 ⇒ 该组属“可判定的非关键旧组”，参与按时间排序；cap 外（较新）组默认运行。 */
const crypto = require("node:crypto");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const STRATEGY_VERSION = "ondemand-old-tests-v1";
const RATIO = 0.6;
const CRITICAL_PATTERN = /(lock|mutex|isolat|permission|delet|recover|restor|cancel|stop|lease|security|integrity|no-direct-ssh|orphan|submission-truth)/i;
const SCOPE_UNKNOWN_PREFIXES = ["src/", "scripts/", "package.json", "tsconfig.json", "scripts/test-workflow.json"];
const CHANGE_IRRELEVANT_PREFIXES = ["dist/", "simple_cluster/", "docs/"]; // 构建输出/运行证据/文档：不改变测试执行语义

function git(root, args) {
  try { return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 }); }
  catch { return null; }
}

/** 一次批量 git log 取全仓文件首加入时间；重命名等未命中者逐文件 --follow 追认；仍失败 ⇒ 缺席（unknown）。 */
function firstAddedTimes(root, files) {
  const times = new Map();
  const out = git(root, ["log", "--reverse", "--diff-filter=A", "--name-only", "--format=@%ct"]);
  if (out === null) return times; // 历史整体不可靠：全部 unknown ⇒ 全保守执行
  let ct = null;
  for (const line of out.split("\n")) {
    if (line.startsWith("@")) { ct = Number(line.slice(1)); continue; }
    const rel = line.trim().split(path.sep).join("/");
    if (rel && ct !== null && !times.has(rel)) times.set(rel, ct);
  }
  for (const rel of files) {
    if (times.has(rel)) continue;
    const follow = git(root, ["log", "--follow", "--diff-filter=A", "--format=%ct", "--", rel]); // 重命名追踪原加入记录
    if (follow) { const lines = follow.trim().split("\n").filter(Boolean); if (lines.length) times.set(rel, Number(lines[lines.length - 1])); }
  }
  return times;
}

function changedFiles(root) {
  const set = new Set();
  for (const src of [git(root, ["status", "--porcelain", "--untracked-files=no"]), git(root, ["diff", "--name-only", "origin/master...HEAD"])]) {
    if (src === null) return null; // 变更范围不可知 ⇒ 调用方按 scope-unknown 全保守
    for (const line of src.split("\n")) {
      const rel = line.slice(3).trim().split(" -> ").pop().split(path.sep).join("/"); // porcelain 前缀恒为 "XY "（含 rename 的 "R  old -> new"），rename 取新名
      if (rel && !CHANGE_IRRELEVANT_PREFIXES.some(p => rel.startsWith(p))) set.add(rel);
    }
  }
  return [...set];
}

function groupKeyOfJob(job, domainNames) {
  let key = null;
  for (const source of job.sources || []) {
    for (const token of String(source).split(">").reverse()) if (domainNames.has(token.trim())) { key = token.trim(); break; }
    if (key) break;
  }
  return key;
}

/** 本轮唯一决策：入口一律消费返回值，不再自行判定。jobs=去重后的计划作业（含参数矩阵）。 */
function buildSelection(manifest, root, jobs, includeOndemand) {
  const domainNames = new Set(Object.keys(manifest.domains || {}));
  const byFile = new Map(); // relFile -> {group|null, jobs:[]}
  for (const job of jobs) {
    if (!byFile.has(job.file)) byFile.set(job.file, { group: groupKeyOfJob(job, domainNames), jobs: [] });
    byFile.get(job.file).jobs.push(job);
  }
  const times = firstAddedTimes(root, [...byFile.keys()]);
  const head = (git(root, ["rev-parse", "HEAD"]) || "").trim() || "unknown-head";
  const changed = changedFiles(root);
  const scopeUnknown = changed === null || changed.some(f => SCOPE_UNKNOWN_PREFIXES.some(p => f === p || f.startsWith(p)));
  const groups = new Map(); // key -> {key, files, firstAddedMax|null, ownershipKnown}
  for (const [file, info] of byFile) {
    if (!info.group) { groups.set("protected:" + file, { key: "protected:" + file, files: [file], firstAddedMax: null, ownershipKnown: false }); continue; } // R1
    if (!groups.has(info.group)) groups.set(info.group, { key: info.group, files: [], firstAddedMax: null, ownershipKnown: true });
    groups.get(info.group).files.push(file);
  }
  for (const g of groups.values()) {
    if (!g.ownershipKnown) continue;
    let max = 0;
    for (const f of g.files) { const t = times.get(f); if (t === undefined) { max = null; break; } max = Math.max(max, t); } // 任一成员 unknown ⇒ 组 unknown
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
    if (scopeUnknown) reason = changed === null ? "change-scope-unprovable(git)" : "change-scope-unmappable"; // R3
    else if (CRITICAL_PATTERN.test(g.key) || g.files.some(f => CRITICAL_PATTERN.test(f))) reason = "critical-class"; // R2
    else if (changed.some(f => g.files.includes(f))) reason = "changed-this-round"; // R3
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
    scopeUnknown: scopeUnknown ? (changed === null ? "git-unprovable" : "unmappable-changes") : "none",
    groups: [...groups.values()].map(g => ({ key: g.key, firstAddedMax: g.firstAddedMax, files: [...g.files].sort() })).sort((a, b) => a.key.localeCompare(b.key)),
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
