// @ts-nocheck
/**
 * Factory Infrastructure - Common Types (Phase 0+1)
 * 遵循 docs/architecture-factory-refactor-plan.md §3.1 通用基类型
 * 所有工厂共享的上下文与基接口，Composition Root 唯一组装点使用。
 */

export interface FactoryContext {
  readonly extensionUri: unknown;
  readonly globalState: unknown;
  readonly workspaceState: unknown;
  readonly secrets?: unknown;
  readonly clusterStore?: unknown;
  readonly operationQueue?: unknown;
  readonly requestBudgetConfig?: unknown;
  // 允许透传任意扩展字段，保持渐进式兼容
  readonly [key: string]: unknown;
}

export interface Factory<TProduct> {
  create(ctx: FactoryContext): TProduct;
}

export interface DisposableFactory<T extends { dispose(): unknown }> extends Factory<T> {
  create(ctx: FactoryContext): T;
}

export interface FactoryProduct {
  readonly kind: string;
}

export type FactoryCreateOptions = {
  readonly ctx: FactoryContext;
  readonly overrides?: Record<string, unknown>;
};

export interface BatchFactory<TProduct> extends Factory<TProduct> {
  createAll(ctx: FactoryContext): TProduct[];
  createByName?(name: string, ctx: FactoryContext): TProduct | undefined;
}

export interface AsyncFactory<TProduct> {
  createAsync(ctx: FactoryContext): Promise<TProduct>;
}
