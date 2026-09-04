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
// 定案：长任务超时默认不处理，由用户人工处理。run-plan/reproduce-plan 队列 timeoutMs 保持 0（禁用），不设 600s；
// OperationQueue 侧 timeoutMs=0 即禁用定时器（falsy 不设 timer），租约冲突仅阻塞提交不杀长任务（后台化），UI 提示用户手动中止/清理。
function isLongRunningPlanArgs(args) {
    try {
        const text = JSON.stringify(args || "").toLowerCase();
        return text.includes("run-plan") || text.includes("reproduce-plan")
            || text.includes("runplan") || text.includes("reproduceplan");
    }
    catch {
        return false;
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
    queueSpec(args) {
        // run-plan/reproduce-plan 长任务禁用队列超时（timeoutMs=0=禁用，用户手动中止/清理）；
        // runOperations kind 默认即长任务，其余短任务保持 30s。不设 600s 默认杀。
        const longRunning = this.kind === "runOperations" || isLongRunningPlanArgs(args);
        return { priority: 0, exclusiveKeys: [this.kind], coalesceKey: undefined, timeoutMs: longRunning ? 0 : 30000 };
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
