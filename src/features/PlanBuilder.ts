/**
 * src/features/PlanBuilder.ts - Facade
 * 原 1884 行已迁移至 PlanBuilder.legacy.ts，按需委托 PlanBuilderFactory
 * 瘦身门面：保持 API 兼容，通过 export * 透传
 */
export * from "./PlanBuilder.legacy";

function tryRequire<T>(id: string): T | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(id) as T;
  } catch {
    return undefined;
  }
}

// 工厂化增强：委托给 MatrixGenerator / PlanBuilderFactory（可选覆盖）
try {
  const factoryMod = tryRequire<unknown>("./factories/PlanBuilderFactory");
  const genMod = tryRequire<unknown>("./PlanBuilder/MatrixGenerator");
  // 可选：覆盖导出以走工厂（当前保持透传，工厂内部已回退到 legacy）
  void factoryMod;
  void genMod;
} catch {}
