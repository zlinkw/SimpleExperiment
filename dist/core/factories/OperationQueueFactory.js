"use strict";
/**
 * OperationQueueFactory — OperationQueue 工厂
 * 封装 OperationQueue 创建与全局单例，支持依赖注入与历史上限配置
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultOperationQueueFactory = void 0;
exports.createOperationQueue = createOperationQueue;
exports.createOperationQueueFactory = createOperationQueueFactory;
const OperationQueue_1 = require("../OperationQueue");
let sharedInstance = undefined;
class DefaultOperationQueueFactory {
    deps;
    constructor(deps = {}) { this.deps = deps; }
    create(opts = {}) {
        const historyLimit = opts.historyLimit ?? this.deps.historyLimit ?? 500;
        const maxPending = opts.maxPending ?? this.deps.maxPending ?? 256;
        const queue = new OperationQueue_1.OperationQueue(historyLimit, maxPending);
        if (opts.singleton || this.deps.singleton)
            sharedInstance = queue;
        return queue;
    }
    getShared() {
        // 若外部通过 deps 注入了 operationQueue，优先复用
        if (this.deps.operationQueue)
            return assertOperationQueue(this.deps.operationQueue);
        if (sharedInstance)
            return sharedInstance;
        const historyLimit = this.deps.historyLimit ?? 500;
        const maxPending = this.deps.maxPending ?? 256;
        sharedInstance = new OperationQueue_1.OperationQueue(historyLimit, maxPending);
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
function assertOperationQueue(value) {
    if (!value || typeof value !== "object"
        || typeof value.enqueue !== "function"
        || typeof value.cancel !== "function"
        || typeof value.snapshot !== "function"
        || typeof value.activeExclusiveKeys !== "function")
        throw new Error("Injected OperationQueue does not implement the required scheduling and lifecycle contract.");
    return value;
}
