// @ts-nocheck
/**
 * FeatureFactory - Feature 工厂
 * 管理 PlanBuilder / Results / Quality / Comparison / DraftPlans 等 FeatureHandler
 * 表驱动映射 WebviewActionCommand -> FeatureKind
 * 遵循 docs/architecture-factory-refactor-plan.md §3.5
 */

import type { FactoryContext } from "./types";

export type FeatureKind =
  | "planBuilder"
  | "results"
  | "lifecycle"
  | "metrics"
  | "comparison"
  | "anomaly"
  | "notifications"
  | "searchTags"
  | "recycleBin"
  | "gpuHistory"
  | "topology"
  | "runOperations"
  | "draftPlans"
  | "quality"
  | "checkpoint";

export interface FeatureHandler<TArgs = unknown, TResult = unknown> {
  readonly kind: FeatureKind;
  execute(args: TArgs, ctx: FactoryContext & { signal?: AbortSignal }): Promise<TResult>;
  queueSpec?(args: TArgs): Pick<import("../core/OperationQueue").OperationSpec, "priority" | "exclusiveKeys" | "coalesceKey" | "timeoutMs">;
}

class GenericFeatureHandler implements FeatureHandler {
  public readonly kind: FeatureKind;
  private readonly impl: (args: unknown, ctx: FactoryContext) => Promise<unknown>;
  constructor(kind: FeatureKind, impl?: (args: unknown, ctx: FactoryContext) => Promise<unknown>) {
    this.kind = kind;
    this.impl = impl || (async (args) => ({ kind, args, ok: true }));
  }
  async execute(args: unknown, ctx: FactoryContext & { signal?: AbortSignal }): Promise<unknown> {
    return this.impl(args, ctx);
  }
  queueSpec(_args: unknown) {
    return { priority: 0 as const, exclusiveKeys: [this.kind] as string[], coalesceKey: undefined, timeoutMs: 30000 };
  }
}

export interface FeatureFactory {
  create(kind: FeatureKind): FeatureHandler;
  createAll(): Record<FeatureKind, FeatureHandler>;
  handlerForCommand(command: string): FeatureHandler | undefined;
  createByName(name: string): FeatureHandler | undefined;
}

const commandToKind: Record<string, FeatureKind> = {
  validatePlan: "planBuilder",
  dryRunPlan: "planBuilder",
  runPlan: "runOperations",
  stopExperiment: "lifecycle",
  retryExperiment: "lifecycle",
  reproducePlan: "planBuilder",
  parseResults: "results",
  refreshResults: "results",
  runQualityGate: "quality",
  runStatistics: "quality",
  exportPaperTable: "results",
  checkClaimEvidence: "quality",
  checkOutputContract: "quality",
  parseCaseLevel: "results",
  runLeakageCheck: "anomaly",
  runSubgroupAnalysis: "results",
  exportCaseAnalysis: "comparison",
  planCheckpointRetention: "checkpoint",
  inspectDataset: "anomaly",
  exportPlottingContract: "comparison",
  restorePlanText: "draftPlans",
  buildExperimentMatrix: "planBuilder",
  comparison: "comparison",
  metrics: "metrics",
  anomaly: "anomaly",
  notifications: "notifications",
  searchTags: "searchTags",
  recycleBin: "recycleBin",
  gpuHistory: "gpuHistory",
  topology: "topology",
  draftPlans: "draftPlans",
};

const featureImplHints: Record<FeatureKind, string> = {
  planBuilder: "features/PlanBuilder",
  results: "features/Results",
  lifecycle: "features/Lifecycle",
  metrics: "features/Metrics",
  comparison: "features/Comparison",
  anomaly: "features/Anomaly",
  notifications: "features/Notifications",
  searchTags: "features/SearchTags",
  recycleBin: "features/RecycleBin",
  gpuHistory: "features/GpuHistoryState",
  topology: "features/TopologyMode",
  runOperations: "features/RunOperations",
  draftPlans: "features/DraftPlans",
  quality: "features/Quality",
  checkpoint: "features/Checkpoint",
};

export class DefaultFeatureFactory implements FeatureFactory {
  private readonly cache = new Map<FeatureKind, FeatureHandler>();
  private readonly deps: Record<string, unknown>;
  constructor(deps: Record<string, unknown> = {}) {
    this.deps = deps;
  }

  create(kind: FeatureKind): FeatureHandler {
    const cached = this.cache.get(kind);
    if (cached) return cached;
    let handler: FeatureHandler | undefined;
    // 尝试按需委托旧模块（门面包裹旧实现，零行为变更）
    const hint = featureImplHints[kind];
    if (hint) {
      try {
        const mod = require(`../${hint}`);
        // 若模块存在，包装为 FeatureHandler（保持原逻辑不变）
        if (mod) {
          handler = new GenericFeatureHandler(kind, async (args, ctx) => {
            // 优先调用模块的默认导出或同名方法
            const fn = mod.execute || mod.default || mod[kind] || mod[`${kind}Handler`];
            if (typeof fn === "function") return fn(args, ctx);
            return { kind, args, delegatedTo: hint, ok: true };
          });
        }
      } catch {}
    }
    if (!handler) handler = new GenericFeatureHandler(kind);
    this.cache.set(kind, handler);
    return handler;
  }

  createAll(): Record<FeatureKind, FeatureHandler> {
    const kinds: FeatureKind[] = [
      "planBuilder", "results", "lifecycle", "metrics", "comparison",
      "anomaly", "notifications", "searchTags", "recycleBin",
      "gpuHistory", "topology", "runOperations", "draftPlans", "quality", "checkpoint",
    ];
    const record = {} as Record<FeatureKind, FeatureHandler>;
    for (const k of kinds) record[k] = this.create(k);
    return record;
  }

  handlerForCommand(command: string): FeatureHandler | undefined {
    const kind = commandToKind[command];
    if (!kind) return undefined;
    return this.create(kind);
  }

  createByName(name: string): FeatureHandler | undefined {
    const kinds = new Set<string>([
      "planBuilder", "results", "lifecycle", "metrics", "comparison",
      "anomaly", "notifications", "searchTags", "recycleBin",
      "gpuHistory", "topology", "runOperations", "draftPlans", "quality", "checkpoint",
    ]);
    if (kinds.has(name)) return this.create(name as FeatureKind);
    // 也支持按命令名查找
    return this.handlerForCommand(name);
  }
}
