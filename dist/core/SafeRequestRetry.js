"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SafeRequestRetry = exports.RequestReplacedError = void 0;
exports.retryRequestSignal = retryRequestSignal;
exports.assertRetryRequestCurrent = assertRetryRequestCurrent;
exports.registerRetryStopCheck = registerRetryStopCheck;
const node_async_hooks_1 = require("node:async_hooks");
const context = new node_async_hooks_1.AsyncLocalStorage();
class RequestReplacedError extends Error {
    code = "REQUEST_REPLACED";
    constructor() { super("旧请求已被重新执行替代，保留已有产物。"); this.name = "RequestReplacedError"; }
}
exports.RequestReplacedError = RequestReplacedError;
function retryRequestSignal() { return context.getStore()?.controller.signal; }
function assertRetryRequestCurrent() { retryRequestSignal()?.throwIfAborted(); }
function registerRetryStopCheck(check) {
    const request = context.getStore();
    if (request && request.stopChecks.size >= 64)
        throw new Error("待核实的传输过多，未启动更多传输，请先重试并核对已有请求。");
    request?.stopChecks.add(check);
    return () => { request?.stopChecks.delete(check); };
}
async function bounded(work, timeoutMs) {
    let timer;
    try {
        return await Promise.race([work, new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error("旧请求尚未确认退出，未启动新请求；连接恢复后可再次重试。")), timeoutMs);
            })]);
    }
    finally {
        clearTimeout(timer);
    }
}
/** Only explicit requests with identical workspace/action/target keys replace one another. */
class SafeRequestRetry {
    timeoutMs;
    requests = new Map();
    constructor(timeoutMs = 30_000) {
        this.timeoutMs = timeoutMs;
    }
    async run(key, work) {
        const previous = this.requests.get(key);
        if (previous) {
            if (previous.replacing)
                throw new Error("相同请求正在停止并重试，请等待本次处理。");
            previous.replacing = true;
            previous.controller.abort(new RequestReplacedError());
            const settleDeadline = Date.now() + this.timeoutMs;
            const remainingMs = () => Math.max(1, settleDeadline - Date.now());
            try {
                await bounded(previous.settled, remainingMs());
                for (const check of previous.stopChecks) {
                    await bounded(check(), remainingMs());
                    previous.stopChecks.delete(check);
                }
            }
            catch (error) {
                // Keep the old request visible and guarded after an unknown stop result,
                // but allow a later explicit retry to re-check its outstanding receipts.
                previous.replacing = false;
                throw error;
            }
        }
        // Pending unknown outcomes are kept for rechecking; never evict a live guard.
        if (!previous && this.requests.size >= 64)
            throw new Error("待核实的请求过多，请先核对已有传输状态。");
        let settle;
        const request = { controller: new AbortController(), settled: new Promise(resolve => { settle = resolve; }),
            stopChecks: new Set(), replacing: false };
        this.requests.set(key, request);
        try {
            return await context.run(request, async () => {
                const result = await work();
                assertRetryRequestCurrent();
                return result;
            });
        }
        catch (error) {
            if (request.controller.signal.aborted)
                throw request.controller.signal.reason;
            throw error;
        }
        finally {
            settle();
            if (!request.replacing && !request.stopChecks.size && this.requests.get(key) === request)
                this.requests.delete(key);
        }
    }
}
exports.SafeRequestRetry = SafeRequestRetry;
