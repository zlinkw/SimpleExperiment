"use strict";
// @ts-nocheck
/**
 * OperationQueueFactory — OperationQueue 工厂
 * 封装 OperationQueue 创建与全局单例，支持依赖注入与历史上限配置
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultOperationQueueFactory = void 0;
exports.createOperationQueue = createOperationQueue;
exports.createOperationQueueFactory = createOperationQueueFactory;
let sharedInstance = undefined;
function resolveOperationQueueClass() {
    try {
        const mod = require("../OperationQueue");
        if (mod && mod.OperationQueue)
            return mod.OperationQueue;
    }
    catch { }
    return null;
}
class DefaultOperationQueueFactory {
    deps;
    constructor(deps = {}) { this.deps = deps; }
    create(opts = {}) {
        const historyLimit = opts.historyLimit ?? this.deps.historyLimit ?? 500;
        const Cls = resolveOperationQueueClass();
        if (Cls)
            return new Cls(historyLimit);
        // 降级内存队列（兼容测试）
        return {
            kind: "OperationQueue",
            historyLimit,
            enqueue: async (spec) => { await spec.run?.(new AbortController().signal); },
            cancel: () => false,
            snapshot: () => [],
            activeExclusiveKeys: () => new Set(),
        };
    }
    getShared() {
        const Cls = resolveOperationQueueClass();
        if (sharedInstance)
            return sharedInstance;
        const historyLimit = this.deps.historyLimit ?? 500;
        sharedInstance = Cls ? new Cls(historyLimit) : this.create({ historyLimit });
        // 若外部通过 deps 注入了 operationQueue，优先复用
        if (this.deps.operationQueue)
            return this.deps.operationQueue;
        return sharedInstance;
    }
    resetShared() { sharedInstance = undefined; }
}
exports.DefaultOperationQueueFactory = DefaultOperationQueueFactory;
function createOperationQueue(opts) {
    const factory = new DefaultOperationQueueFactory();
    return factory.create(opts);
}
function createOperationQueueFactory(deps) {
    return new DefaultOperationQueueFactory(deps);
}
