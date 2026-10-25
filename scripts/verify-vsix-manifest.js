"use strict";
/**
 * r25-A 打包后清单门禁：对最终 .vsix 的真实 ZIP 中央目录做内容政策核验（无外部依赖，纯 ZIP 解析）。
 * 规则单一来源 = scripts/package-content-policy.json（与文件政策同一 leak/required 规则源）。
 * 用法: node scripts/verify-vsix-manifest.js [--vsix path] [--list]
 *  - 无 --vsix：取仓库根唯一 *.vsix（多于一个即失败，防止误核旧包）；
 *  - 违规条目（开发锁/缓存/日志/receipt/编译元信息）或必需资源缺失 ⇒ 非零；输出违规路径（不打印内容）。
 * r77 打包合规新增正文层：包内 root readme（extension/readme.md 即工具链所选 README 的最终名）必须
 *  恰为一条，且正文与 scripts/package-minimal-readme.js 由 package.json 元数据生成的最小文本逐字节
 *  一致（CRLF→LF 归一后）；缺失、多条 readme 名条目（含旧完整指南副本或大小写变体并存）、内容不匹配
 *  或不可读取 ⇒ 非零。诊断仍只输出路径与判定名，绝不输出正文。
 */
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const { classify, REQUIRED } = require("./package-content-policy.js");
const { generateMinimalReadmeText } = require("./package-minimal-readme.js");

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

/* ZIP 中央目录解析：EOCD → 条目循环（名称/大小；r77 另存压缩方式与本地头偏移，仅 root readme 条目按需读取正文）。 */
function zipEntries(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 65558; i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("EOCD not found — not a readable ZIP");
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  const out = [];
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) throw new Error("central directory corrupt at entry " + n);
    const nameLen = buf.readUInt16LE(off + 28), extraLen = buf.readUInt16LE(off + 30), cmtLen = buf.readUInt16LE(off + 32);
    const comp = buf.readUInt32LE(off + 20), uncomp = buf.readUInt32LE(off + 24);
    const method = buf.readUInt16LE(off + 10), local = buf.readUInt32LE(off + 42);
    out.push({ name: buf.toString("utf8", off + 46, off + 46 + nameLen), comp, uncomp, method, local });
    off += 46 + nameLen + extraLen + cmtLen;
  }
  return out;
}

/* 按中央目录给出的本地头偏移读取单条目正文（stored 直读；deflate 用 Node 内置 inflateRaw；无外部依赖）。 */
function entryData(buf, e) {
  if (buf.readUInt32LE(e.local) !== 0x04034b50) throw new Error("local header corrupt at " + e.name);
  const nameLen = buf.readUInt16LE(e.local + 26), extraLen = buf.readUInt16LE(e.local + 28);
  const start = e.local + 30 + nameLen + extraLen;
  const raw = buf.subarray(start, start + e.comp);
  if (e.method === 0) return raw;
  if (e.method === 8) return zlib.inflateRawSync(raw);
  throw new Error(`unsupported zip method ${e.method} at ${e.name}`);
}

const zipBuf = fs.readFileSync(vsix);
const entries = zipEntries(zipBuf);
const names = entries.map(e => normalizeEntry(e.name));
function normalizeEntry(n) { let s = n.replace(/\\/g, "/"); if (s.startsWith("extension/")) s = s.slice("extension/".length); return s; }
const leaks = names.map(n => ({ n, c: classify(n) })).filter(x => x.c).map(x => `${x.n} <category:${x.c}>`);
const seen = new Set(names.map(n => n.toLowerCase()));
const missing = REQUIRED.filter(r => !seen.has(r));

/* r77 root readme 正文层：raw 条目（区分大小写）中规范化到 root 且名为 readme/readme.md 的必须恰有一条，
 * 正文与同源生成文本逐字节（CRLF→LF 归一后）一致。旧完整指南即便以 extension/README.md 混入，也会作为
 * 第二条 readme 名条目或内容不匹配被拒。诊断只输出路径与判定名。 */
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const expectedReadme = generateMinimalReadmeText(packageJson).replace(/\r\n/g, "\n");
const readmeEntries = entries.filter(e => {
  const n = normalizeEntry(e.name).toLowerCase();
  return n === "readme.md" || n === "readme";
});
const readmeViolations = [];
if (readmeEntries.length === 0) {
  readmeViolations.push("MISSING-README extension/readme.md (single generated minimal readme required)");
} else if (readmeEntries.length > 1) {
  readmeViolations.push(`DUPLICATE-README ${readmeEntries.length} root readme entries: ${readmeEntries.map(e => e.name).join(", ")}`);
} else {
  let readmeText;
  try {
    readmeText = entryData(zipBuf, readmeEntries[0]).toString("utf8").replace(/\r\n/g, "\n");
  } catch (err) {
    readmeViolations.push(`UNREADABLE-README ${readmeEntries[0].name} (${err instanceof Error ? err.message : String(err)})`);
  }
  if (readmeText !== undefined && readmeText !== expectedReadme) {
    readmeViolations.push(`README-CONTENT-MISMATCH ${readmeEntries[0].name} (must equal scripts/package-minimal-readme.js output)`);
  }
}

if (list) for (const n of names.slice().sort()) process.stdout.write(n + "\n");
process.stdout.write(`[vsix-manifest] vsix=${vsix} entries=${entries.length} leakHits=${leaks.length} missingRequired=${missing.length} readmeViolations=${readmeViolations.length} policy=package-content-policy.json(single-source)\n`);
for (const l of leaks.slice(0, 20)) process.stdout.write(`[vsix-manifest] LEAK ${l}\n`);
for (const m of missing) process.stdout.write(`[vsix-manifest] MISSING-REQUIRED ${m}\n`);
for (const v of readmeViolations) process.stdout.write(`[vsix-manifest] ${v}\n`);
if (leaks.length || missing.length || readmeViolations.length) process.exit(1);
