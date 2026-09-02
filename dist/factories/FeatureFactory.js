"use strict";
/**
 * FeatureFactory - Feature 工厂
 * 管理 PlanBuilder / Results / Quality / Comparison / DraftPlans 等 FeatureHandler
 * 表驱动映射 WebviewActionCommand -> FeatureKind
 * 遵循 docs/architecture-factory-refactor-plan.md §3.5
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultFeatureFactory = void 0;
function tryRequire(id) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require(id);
    }
    catch {
        return undefined;
    }
}
class GenericFeatureHandler {
    kind;
    impl;
    constructor(kind, impl) {
        this.kind = kind;
        this.impl = impl || (async (args) => ({ kind, args, ok: true }));
    }
    async execute(args, ctx) {
        return this.impl(args, ctx);
    }
    queueSpec(_args) {
        return { priority: 0, exclusiveKeys: [this.kind], coalesceKey: undefined, timeoutMs: 30000 };
    }
}
const commandToKind = {
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
const featureImplHints = {
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
function getFeatureModule(hint) {
    return tryRequire(`../${hint}`);
}
class DefaultFeatureFactory {
    cache = new Map();
    deps;
    constructor(deps = {}) {
        this.deps = deps;
    }
    create(kind) {
        const cached = this.cache.get(kind);
        if (cached)
            return cached;
        let handler;
        // 尝试按需委托旧模块（门面包裹旧实现，零行为变更）
        const hint = featureImplHints[kind];
        if (hint) {
            const mod = getFeatureModule(hint);
            // 若模块存在，包装为 FeatureHandler（保持原逻辑不变）
            if (mod) {
                handler = new GenericFeatureHandler(kind, async (args, ctx) => {
                    // 优先调用模块的默认导出或同名方法
                    const rec = mod;
                    const fn = rec["execute"]
                        || rec["default"]
                        || rec[kind]
                        || rec[`${kind}Handler`];
                    if (typeof fn === "function")
                        return fn(args, ctx);
                    return { kind, args, delegatedTo: hint, ok: true };
                });
            }
        }
        if (!handler)
            handler = new GenericFeatureHandler(kind);
        this.cache.set(kind, handler);
        return handler;
    }
    createAll() {
        const kinds = [
            "planBuilder", "results", "lifecycle", "metrics", "comparison",
            "anomaly", "notifications", "searchTags", "recycleBin",
            "gpuHistory", "topology", "runOperations", "draftPlans", "quality", "checkpoint",
        ];
        const record = {};
        for (const k of kinds)
            record[k] = this.create(k);
        return record;
    }
    handlerForCommand(command) {
        const kind = commandToKind[command];
        if (!kind)
            return undefined;
        return this.create(kind);
    }
    createByName(name) {
        const kinds = new Set([
            "planBuilder", "results", "lifecycle", "metrics", "comparison",
            "anomaly", "notifications", "searchTags", "recycleBin",
            "gpuHistory", "topology", "runOperations", "draftPlans", "quality", "checkpoint",
        ]);
        if (kinds.has(name))
            return this.create(name);
        // 也支持按命令名查找
        return this.handlerForCommand(name);
    }
}
exports.DefaultFeatureFactory = DefaultFeatureFactory;
