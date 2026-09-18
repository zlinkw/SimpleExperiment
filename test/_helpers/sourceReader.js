/**
 * 测试用源码读取器。
 *
 * 背景：工厂化重构（0.4.92）把实现从 `<name>.ts` 移到 `<name>.legacy.ts`，
 * 原文件只保留 `export * from "./<name>.legacy"` 门面。
 * 历史测试仍直接 readFileSync 门面路径，断言拿到的是 7~40 行 re-export，
 * 于是正则/包含类断言全部落空。
 *
 * readSource 统一按「已知门面 → 解析到 legacy 实现」读取，
 * 新增门面时只需在 IMPLEMENTATION_OF 补一行，无需改动各测试文件。
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "../..");

/** 门面路径 → 实际实现路径（相对仓库根，正斜杠） */
const IMPLEMENTATION_OF = {
  "src/extension.ts": "src/extension/legacy.ts",
  "src/clusterSchedulerRuntime.ts": "src/clusterSchedulerRuntime.legacy.ts",
  "src/clusterAgentRuntime.ts": "src/clusterAgentRuntime.legacy.ts",
  "src/ui/PanelHtml.ts": "src/ui/PanelHtml.legacy.ts",
  "src/tunnel/XshellTunnelSetup.ts": "src/tunnel/XshellTunnelSetup.legacy.ts",
  "src/ui/sections/SyncSection.ts": "src/ui/sections/SyncSection.legacy.ts",
};

function normalize(relPath) {
  return String(relPath).replace(/\\/g, "/").replace(/^\.\//, "");
}

/** 该路径是否为已知门面文件 */
function isFacade(relPath) {
  return Object.prototype.hasOwnProperty.call(IMPLEMENTATION_OF, normalize(relPath));
}

/**
 * 读取源码内容。若 relPath 是已知门面，则返回其 legacy 实现的内容。
 * legacy 文件缺失时回退读门面本身，保证不会因缺少文件而抛错。
 *
 * @param {string} relPath 相对仓库根的路径，如 "src/extension.ts"
 * @returns {string}
 */
function readSource(relPath) {
  const key = normalize(relPath);
  const impl = IMPLEMENTATION_OF[key];
  if (impl) {
    try {
      const content = fs.readFileSync(path.join(ROOT, impl), "utf8");
      if (content) return content;
    } catch {
      /* 回退到门面 */
    }
  }
  return fs.readFileSync(path.join(ROOT, key), "utf8");
}

module.exports = { readSource, isFacade, IMPLEMENTATION_OF, ROOT };
