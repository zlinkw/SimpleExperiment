"use strict";
/**
 * r25-A 打包后清单门禁：对最终 .vsix 的真实 ZIP 中央目录做内容政策核验（无外部依赖，纯 ZIP 解析）。
 * 规则单一来源 = scripts/package-content-policy.json（与文件政策同一 leak/required 规则源）。
 * 用法: node scripts/verify-vsix-manifest.js [--vsix path] [--list]
 *  - 无 --vsix：取仓库根唯一 *.vsix（多于一个即失败，防止误核旧包）；
 *  - 违规条目（开发锁/缓存/日志/receipt/编译元信息）或必需资源缺失 ⇒ 非零；输出违规路径（不打印内容）。
 */
const fs = require("node:fs");
const path = require("node:path");
const { classify, REQUIRED } = require("./package-content-policy.js");

const args = process.argv.slice(2);
let root = path.resolve(__dirname, ".."), vsix = null, list = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--vsix") vsix = path.resolve(args[++i]);
  else if (args[i] === "--list") list = true;
  else if (args[i] === "--root") root = path.resolve(args[++i]);
  else { process.stderr.write(`[vsix-manifest] unknown option ${args[i]}\n`); process.exit(2); }
}
if (!vsix) {
  const found = fs.readdirSync(root).filter(f => f.endsWith(".vsix"));
  if (found.length !== 1) { process.stderr.write(`[vsix-manifest] expected exactly one root .vsix for deterministic verification, found ${found.length}: ${found.join(", ")}\n`); process.exit(1); }
  vsix = path.join(root, found[0]);
}

/* ZIP 中央目录解析：EOCD → 条目循环（不用解压，只看名称/大小）。 */
function zipEntries(file) {
  const buf = fs.readFileSync(file);
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 65558; i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("EOCD not found — not a readable ZIP");
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  const out = [];
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) throw new Error("central directory corrupt at entry " + n);
    const nameLen = buf.readUInt16LE(off + 28), extraLen = buf.readUInt16LE(off + 30), cmtLen = buf.readUInt16LE(off + 32);
    const uncomp = buf.readUInt32LE(off + 24);
    out.push({ name: buf.toString("utf8", off + 46, off + 46 + nameLen), uncomp });
    off += 46 + nameLen + extraLen + cmtLen;
  }
  return out;
}

const entries = zipEntries(vsix);
const names = entries.map(e => normalizeEntry(e.name));
function normalizeEntry(n) { let s = n.replace(/\\/g, "/"); if (s.startsWith("extension/")) s = s.slice("extension/".length); return s; }
const leaks = names.map(n => ({ n, c: classify(n) })).filter(x => x.c).map(x => `${x.n} <category:${x.c}>`);
const seen = new Set(names.map(n => n.toLowerCase()));
const missing = REQUIRED.filter(r => !seen.has(r));
if (list) for (const n of names.slice().sort()) process.stdout.write(n + "\n");
process.stdout.write(`[vsix-manifest] vsix=${vsix} entries=${entries.length} leakHits=${leaks.length} missingRequired=${missing.length} policy=package-content-policy.json(single-source)\n`);
for (const l of leaks.slice(0, 20)) process.stdout.write(`[vsix-manifest] LEAK ${l}\n`);
for (const m of missing) process.stdout.write(`[vsix-manifest] MISSING-REQUIRED ${m}\n`);
if (leaks.length || missing.length) process.exit(1);
