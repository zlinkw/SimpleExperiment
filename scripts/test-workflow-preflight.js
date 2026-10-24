"use strict";
/**
 * r29 #8 闭包 preflight —— compile/package 类入口运行前的确定性增量检查（接线在 test-workflow.js main）。
 * 类别：src(入口/加载边) / test / scripts(工具与包政策) / bin / lock(package-lock) / config(根配置)。
 * 语义：
 *  - 无记录 → 初始化，绑定 docs/agent-tasks/plan-state-guard/evidence.md 记录的 r26/r27 84/79 闭包证明（不重做调查）。
 *  - 无任何类别变化 → 复用已记录证明（“不重做无变化调查”），exit 0。
 *  - 仅 test 变化 → exit 0：每次都是全新 fullCheck 执行（无结果复用），编译/打包闭包证明不受影响。
 *  - 其他类别变化：--full-entry（compile+fullCheck 完整链）→ exit 0，本运行即相关变化的增量核，
 *    runner 通过后按覆盖范围回写证明（package/acceptance=all，其余=src,test）；
 *    非完整入口（如 package:assemble）→ 仅当存在匹配当前 closureKey 且覆盖变化类别的 attestation 时放行，否则 exit 1 阻断。
 *  - --attest --categories all|csv --refs ref1,ref2：把当前 closureKey 的证明回写登记（runner 只在整体 passed 后自动调用；
 *    人工调用必须给出可取回的证据引用）。
 * 状态文件：simple_cluster/reports/test-workflow/closure-state.json（含逐类别 文件→sha，变化可精确列出）。
 */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const args = process.argv.slice(2);
let root = path.resolve(__dirname, "..");
const cmd = ["--check", "--attest", "--status"].includes(args[0]) ? args.shift() : "--check";
const opts = { fullEntry: false, categories: [], refs: [] };
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--root") root = path.resolve(args[++i]);
  else if (args[i] === "--full-entry") opts.fullEntry = true;
  else if (args[i] === "--categories") opts.categories = String(args[++i]).split(",").map(s => s.trim()).filter(Boolean);
  else if (args[i] === "--refs") opts.refs = String(args[++i]).split(",").map(s => s.trim()).filter(Boolean);
  else { process.stderr.write(`[preflight] ERROR: unknown option ${args[i]}\n`); process.exit(2); }
}

const CATEGORIES = {
  src: { dirs: ["src"], files: [] },
  test: { dirs: ["test"], files: [] },
  scripts: { dirs: ["scripts"], files: [] },
  bin: { dirs: ["bin"], files: [] },
  lock: { dirs: [], files: ["package-lock.json"] },
  config: { dirs: [], files: ["package.json", "tsconfig.json", ".vscodeignore"] },
};
const statePath = path.join(root, "simple_cluster", "reports", "test-workflow", "closure-state.json");
const sha = abs => crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex");

function snapshot() {
  const out = {};
  for (const [name, spec] of Object.entries(CATEGORIES)) {
    const found = [];
    for (const dir of spec.dirs) {
      const base = path.join(root, dir);
      if (!fs.existsSync(base)) continue;
      (function walk(d) {
        for (const n of fs.readdirSync(d)) {
          const full = path.join(d, n);
          if (fs.statSync(full).isDirectory()) walk(full);
          else found.push(path.relative(root, full).split(path.sep).join("/"));
        }
      })(base);
    }
    for (const f of spec.files) if (fs.existsSync(path.join(root, f))) found.push(f);
    const fileStates = {};
    const h = crypto.createHash("sha256");
    for (const rel of found.sort()) {
      const s = sha(path.join(root, rel));
      fileStates[rel] = s;
      h.update(rel).update("\u0000").update(s).update("\u0000");
    }
    out[name] = { hash: h.digest("hex"), files: fileStates };
  }
  return out;
}

const keyOf = snap => crypto.createHash("sha256").update(JSON.stringify(Object.keys(snap).sort().map(k => [k, snap[k].hash]))).digest("hex");
const loadState = () => { try { return JSON.parse(fs.readFileSync(statePath, "utf8")); } catch { return null; } };
function saveState(st) { fs.mkdirSync(path.dirname(statePath), { recursive: true }); fs.writeFileSync(statePath, JSON.stringify(st, null, 1) + "\n"); }

function diffChanges(prevSnap, curSnap) {
  const changes = {};
  for (const cat of Object.keys(CATEGORIES)) {
    const a = prevSnap?.[cat], b = curSnap[cat];
    if (!a || a.hash === b.hash) continue;
    const paths = [];
    const all = new Set([...Object.keys(a.files || {}), ...Object.keys(b.files)]);
    for (const rel of [...all].sort()) {
      const inA = a.files?.[rel], inB = b.files[rel];
      if (inA !== inB) paths.push(rel + (inA === undefined ? " (+)" : inB === undefined ? " (-)" : " (改)"));
    }
    changes[cat] = paths.length ? paths.slice(0, 20).concat(paths.length > 20 ? [`…共${paths.length}项`] : []) : ["(类别哈希变化但旧状态无逐文件记录)"];
  }
  return changes;
}

const cur = snapshot();
const currentKey = keyOf(cur);
let state = loadState();

if (cmd === "--attest") {
  if (!opts.categories.length || !opts.refs.length) { process.stderr.write("[preflight] ERROR: --attest 需要 --categories 与 --refs（可取回的证据引用）\n"); process.exit(2); }
  state = state || { schemaVersion: 1, initializedFrom: "docs/agent-tasks/plan-state-guard/evidence.md r26/r27 84/79 闭包证明", attestations: [] };
  state.snapshot = cur;
  state.closureKey = currentKey;
  state.updatedAt = new Date().toISOString();
  state.attestations = (state.attestations || []).filter(a => a.closureKey !== currentKey);
  state.attestations.push({ closureKey: currentKey, categories: opts.categories, refs: opts.refs, at: state.updatedAt });
  state.attestations = state.attestations.slice(-20);
  saveState(state);
  console.log(`attested: closureKey=${currentKey.slice(0, 12)}… categories=${opts.categories.join(",")} refs=${opts.refs.join(",").slice(0, 160)}`);
  process.exit(0);
}

if (!state) {
  saveState({ schemaVersion: 1, initializedFrom: "docs/agent-tasks/plan-state-guard/evidence.md r26/r27 84/79 闭包证明", snapshot: cur, closureKey: currentKey, updatedAt: new Date().toISOString(), attestations: [] });
  console.log("init: 无记录 → 初始化并绑定 r26/r27 84/79 已归档闭包证明；后续完整入口通过后自动回写新证明");
  process.exit(0);
}

if (cmd === "--status") {
  console.log(JSON.stringify({ closureKey: currentKey, matchesState: state.closureKey === currentKey, attestations: (state.attestations || []).length, stateUpdatedAt: state.updatedAt || null }, null, 1));
  process.exit(0);
}

const changes = diffChanges(state.snapshot, cur);
const changed = Object.keys(changes);
if (!changed.length) { console.log(`unchanged: closureKey=${currentKey.slice(0, 12)}… 无类别变化 → 复用已记录闭包证明（r26/r27 84/79 + 最近批次），不重做调查`); process.exit(0); }
const summary = changed.map(c => `${c}[${changes[c].length}]`).join(" ");
for (const [c, ps] of Object.entries(changes)) for (const p of ps) process.stdout.write(`[preflight] change ${c}: ${p}\n`);
if (changed.every(c => c === "test")) { console.log(`test-only: ${summary} → 全新 fullCheck 覆盖，编译/打包闭包证明不受影响`); process.exit(0); }
if (opts.fullEntry) { console.log(`changed: ${summary} → 本运行（完整 compile+fullCheck 链）即增量核，通过后按覆盖范围回写证明`); process.exit(0); }
const covered = (state.attestations || []).find(a => a.closureKey === currentKey && (a.categories.includes("all") || changed.every(c => a.categories.includes(c))));
if (covered) { console.log(`attested-cover: ${summary} → 引用 ${covered.refs.join(",")} (${covered.at})`); process.exit(0); }
process.stderr.write(`[preflight] BLOCKED: 闭包变化 ${summary}，当前入口无法自行重验且无匹配 attestation —— 先完整通过 package/check:full 生成当前状态凭据（未知/未覆盖一律阻断，不放行）\n`);
process.exit(1);
