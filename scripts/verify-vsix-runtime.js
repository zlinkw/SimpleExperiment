const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { collectLocalRuntimeClosure } = require("./runtime-closure");
const { GENERATED_README_REL_PATH, generateMinimalReadmeText, ensureGeneratedReadme } = require("./package-minimal-readme.js");

const root = path.resolve(__dirname, "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const compiledRuntimeVersion = require(path.join(root, "dist/runtime/RuntimeManifest.js")).CURRENT_RUNTIME_VERSION;
if (compiledRuntimeVersion !== packageJson.version) {
  process.stderr.write(`Compiled runtime version ${compiledRuntimeVersion} differs from package ${packageJson.version}.\n`);
  process.exit(1);
}
// r77 打包合规：最小 README 必须先于任何消费它的 vsce ls 存在。生成是幂等确定性的（同输入逐字节一致），
// workflow 的 post 门也显式先跑同一脚本；此处自保证使单独直调本验证器同样成立（vsixRuntimeClosure 契约）。
ensureGeneratedReadme(root);
// Use the lockfile-pinned local tool. Validation must never fetch packages or wait for npm consent.
// --readme-path 与 assemble 的真实 vsce package 门保持同一所选路径（vsce 4.0.0 官方选项）。
const vsceCli = require.resolve("@vscode/vsce/vsce");
const result = spawnSync(process.execPath, [vsceCli, "ls", "--no-dependencies", "--readme-path", GENERATED_README_REL_PATH], {
  cwd: root,
  encoding: "utf8",
  // VSCE enumerates package metadata; keep this bounded separately from the
  // shorter deadlines required for Python and test processes.
  timeout: 30000,
  windowsHide: true,
});
if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout || `${result.error?.message || "vsce ls failed"}\n`);
  process.exit(result.status || 1);
}

const packaged = new Set(
  String(result.stdout || "")
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^\.\//, "").replace(/\\/g, "/"))
    .filter((line) => line && !line.startsWith("INFO ") && !line.startsWith("WARNING ")),
);
// r77：vsce ls 输出的是加工前路径 —— --readme-path 所选的生成文件会以生成路径出现，而 ReadmeProcessor
// 在打包时将其重命名为 extension/readme.md。仅允许把这唯一一个、且磁盘内容与 package.json 生成文本逐字节
// 一致（CRLF→LF 归一后）的声明路径映射为政策核验用的 root readme 名；生成目录其它条目照常被政策拒绝。
if (packaged.has(GENERATED_README_REL_PATH)) {
  const generatedText = fs
    .readFileSync(path.join(root, ...GENERATED_README_REL_PATH.split("/")), "utf8")
    .replace(/\r\n/g, "\n");
  if (generatedText !== generateMinimalReadmeText(packageJson)) {
    process.stderr.write(`Generated readme ${GENERATED_README_REL_PATH} differs from the package.json-derived minimal text.\n`);
    process.exit(1);
  }
  packaged.delete(GENERATED_README_REL_PATH);
  packaged.add("readme.md");
}
const entrypoints = [packageJson.main, ...Object.values(packageJson.bin || {})]
  .filter(Boolean)
  .map((entry) => String(entry).replace(/^\.\//, "").replace(/\\/g, "/"));
const missing = [];
// spawn 候选（非 require 直连，经 child_process.spawnSync 运行时加载）：
// src/extension/legacy.ts#runCheckStaticFromUi 双候选归一后命中 scripts/check-static.js，
// 必须随包发布，否则用户侧报“check-static 脚本缺失”。此处断言磁盘存在即必须收录，
// 并纳入 require 闭包队列做传递验证（P0：不硬编码任何端口/IP，只校验路径收录）。
const spawnCandidates = ["scripts/check-static.js", "dist/cli.js"];
for (const candidate of spawnCandidates) {
  const absolute = path.join(root, candidate);
  if (!fs.existsSync(absolute)) continue;
  const normalized = candidate.replace(/\\/g, "/");
  if (!packaged.has(normalized) && !packaged.has(`extension/${normalized}`)) {
    missing.push({ importer: "spawn:src/extension/legacy.ts#runCheckStaticFromUi", required: normalized, chain: ["spawn", normalized] });
  }
}
const closure = collectLocalRuntimeClosure(root, entrypoints, spawnCandidates.filter((candidate) => fs.existsSync(path.join(root, candidate))));
for (const item of closure) {
  const normalized = item.file;
  if (!packaged.has(normalized) && !packaged.has(`extension/${normalized}`)) {
    missing.push({ importer: item.chain.at(-2) || "package.json", required: normalized, chain: item.chain });
  }
}

const buildManifestPath = path.join(root, "dist", "panel-build-manifest.json");
if (!fs.existsSync(buildManifestPath)) {
  missing.push({ importer: "build", required: "dist/panel-build-manifest.json", chain: ["build", "dist/panel-build-manifest.json"] });
} else {
  const manifest = JSON.parse(fs.readFileSync(buildManifestPath, "utf8"));
  for (const row of Array.isArray(manifest.files) ? manifest.files : []) {
    const file = String(row.path || "").replace(/\\/g, "/");
    if (file && !packaged.has(file) && !packaged.has(`extension/${file}`)) {
      missing.push({ importer: "dist/panel-build-manifest.json", required: file, chain: ["dist/panel-build-manifest.json", file] });
    }
  }
}

// 发行包内容策略（单源 scripts/package-content-policy.json，JS/Python 双端等价由矩阵测试锁定）：
// 核实际 vsce 文件清单而非 .vscodeignore 文本；违规只输出路径与类别，不读文件内容。
const contentPolicy = require("./package-content-policy");
const policyViolations = contentPolicy.checkListing(packaged);
if (policyViolations.length) {
  process.stderr.write(`VSIX content policy violations (${policyViolations.length}):\n`);
  for (const line of policyViolations) process.stderr.write(`- ${line}\n`);
  process.exit(1);
}

if (missing.length) {
  process.stderr.write(`VSIX runtime closure missing ${missing.length} file(s):\n`);
  for (const item of missing) process.stderr.write(`- ${item.required} <- ${item.chain.join(" <- ")}\n`);
  process.exit(1);
}

process.stdout.write(`VSIX runtime closure verified: ${closure.length} local module(s), ${entrypoints.length} entrypoint(s).\n`);
