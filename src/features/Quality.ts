// @ts-nocheck
/**
 * src/features/Quality.ts - Facade
 * 原 649 行已迁移至 Quality.legacy.ts，按需委托 QualityFactory
 * 瘦身门面：保持 API 兼容，通过 export * 透传
 */
export * from "./Quality.legacy";

// 工厂化增强：委托给 QualityFactory（可选覆盖）
try {
  const factoryMod = require("./factories/QualityFactory");
  void factoryMod;
} catch {}
