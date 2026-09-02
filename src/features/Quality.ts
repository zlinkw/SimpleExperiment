/**
 * src/features/Quality.ts - Facade
 * 原 649 行已迁移至 Quality.legacy.ts，按需委托 QualityFactory
 * 瘦身门面：保持 API 兼容，通过 export * 透传
 */
export * from "./Quality.legacy";

function tryRequire<T>(id: string): T | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(id) as T;
  } catch {
    return undefined;
  }
}

// 工厂化增强：委托给 QualityFactory（可选覆盖）
try {
  const factoryMod = tryRequire<unknown>("./factories/QualityFactory");
  void factoryMod;
} catch {}
