// @ts-nocheck
/**
 * src/features/Results.ts - Facade
 * 原 1595 行已迁移至 Results.legacy.ts，按需委托 ResultsFactory
 * 瘦身门面：保持 API 兼容，通过 export * 透传
 */
export * from "./Results.legacy";

// 工厂化增强：委托给 ResultParser / ResultsFactory（可选覆盖）
try {
  const factoryMod = require("./factories/ResultsFactory");
  const parserMod = require("./Results/ResultParser");
  void factoryMod;
  void parserMod;
} catch {}
