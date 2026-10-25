"use strict";
/**
 * 发行包最小 README 单源生成器（r77 打包合规，2026-10-25）。
 * 背景：vsce 4.0.0 collectFiles 恒强制纳入所选 README（@vscode/vsce/out/package.js:1343-1345
 * notIgnored=['!package.json', `!${readmePath}`]），ReadmeProcessor 将其重命名为 extension/readme.md
 * 写入 VSIX —— 这是工具链强制的最小发布元数据例外（scripts/package-content-policy.json
 * toolchain_readme_exception）。源根 README.md 是完整用户指南，按 2026-10-21 用户裁决仅源码仓保留。
 * 方案（官方 API，无改名/空壳规避）：本脚本按 package.json 既有元数据确定性地生成最小 README
 * （项目名/简述/官方在线指南链接）到专用生成路径；assemble 的真实 `vsce package`/`vsce ls` 统一带
 * `--readme-path`（main.js:100/136 官方选项）指向它；源根 README.md 由 .vscodeignore 实际排除
 * （换 readmePath 后 '!README.md' 强制否定式消失）。scripts/verify-vsix-manifest.js 复用
 * generateMinimalReadmeText 对最终 ZIP 内 extension/readme.md 真实正文做逐字节（CRLF→LF 归一后）比对。
 * 确定性：输出只依赖 package.json 字段，无时间戳/版本号/随机量；重复生成逐字节一致。
 */
const fs = require("node:fs");
const path = require("node:path");

// 专用生成路径：simple_cluster/ 已被 .gitignore(:39) 与 .vscodeignore `simple_cluster/**` 排除；
// vsce 仅在 --readme-path 下通过 negate 全路径 re-include 这一个文件（collectFiles :1380-1383，
// minimatch 直接对文件路径求值，无目录剪枝问题），且该路径自身不入包 —— ReadmeProcessor 会把它
// 重命名为 extension/readme.md。listing 消费者（verify-vsix-runtime.js）仅允许把这一个已核内容
// 的声明路径映射为政策核验用的 root readme 名，不得泛豁免生成目录。
const GENERATED_README_REL_PATH = "simple_cluster/packaging/minimal-readme.md";

function generateMinimalReadmeText(pkg) {
  if (!pkg || typeof pkg.name !== "string" || !pkg.name.trim()) {
    throw new Error("minimal readme requires a package.json with a non-empty name");
  }
  const title = typeof pkg.displayName === "string" && pkg.displayName.trim() ? pkg.displayName.trim() : pkg.name.trim();
  const lines = [`# ${title}`];
  if (typeof pkg.description === "string" && pkg.description.trim()) lines.push("", pkg.description.trim());
  const repoUrl = pkg.repository && (typeof pkg.repository === "string" ? pkg.repository : pkg.repository.url);
  if (typeof repoUrl === "string" && repoUrl.trim()) {
    lines.push("", `完整使用指南见官方仓库：${repoUrl.trim().replace(/\.git$/, "")}`);
  }
  return `${lines.join("\n")}\n`;
}

function ensureGeneratedReadme(root) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const target = path.join(root, ...GENERATED_README_REL_PATH.split("/"));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const text = generateMinimalReadmeText(pkg);
  fs.writeFileSync(target, text, "utf8");
  return target;
}

if (require.main === module) {
  const root = path.resolve(__dirname, "..");
  ensureGeneratedReadme(root);
  process.stdout.write(`Minimal release README generated: ${GENERATED_README_REL_PATH}\n`);
}

module.exports = { GENERATED_README_REL_PATH, generateMinimalReadmeText, ensureGeneratedReadme };
