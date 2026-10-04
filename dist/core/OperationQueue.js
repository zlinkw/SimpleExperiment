"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperationQueue = exports.OperationCancelledError = exports.OperationAlreadyActiveError = exports.OperationQueueCapacityError = void 0;
const ErrorModel_1 = require("./ErrorModel");
class OperationQueueCapacityError extends Error {
    code = "OPERATION_QUEUE_FULL";
    constructor(maxPending) {
        super(`operation queue is full (${maxPending} pending operations)`);
        this.name = "OperationQueueCapacityError";
    }
}
exports.OperationQueueCapacityError = OperationQueueCapacityError;
class OperationAlreadyActiveError extends Error {
    code = "OPERATION_ALREADY_ACTIVE";
    constructor(id) {
        super(`operation is already queued or running: ${id}`);
        this.name = "OperationAlreadyActiveError";
    }
}
exports.OperationAlreadyActiveError = OperationAlreadyActiveError;
class OperationCancelledError extends Error {
    code = "OPERATION_CANCELLED";
    constructor(id) {
        super(`operation cancelled before it started: ${id}`);
        this.name = "OperationCancelledError";
    }
}
exports.OperationCancelledError = OperationCancelledError;
const priorityRank = {
    user_blocking: 0,
    manual: 1,
    background: 2,
    realtime: 3,
};
const terminalStatuses = new Set(["succeeded", "failed", "cancelled", "timeout", "coalesced"]);
class OperationQueue {
    historyLimit;
    maxPending;
    pending = [];
    running = new Map();
    coalesced = new Map();
    records = [];
    latestRecordById = new Map();
    activeExclusiveKeyCounts = new Map();
    constructor(historyLimit = 500, maxPending = 256) {
        this.historyLimit = historyLimit;
        this.maxPending = maxPending;
        this.historyLimit = Math.max(1, Math.floor(Number(historyLimit) || 500));
        this.maxPending = Math.max(1, Math.floor(Number(maxPending) || 256));
    }
    enqueue(spec) {
        if (!spec || !String(spec.id || "").trim())
            return Promise.reject(new Error("operation id is required"));
        if (this.running.has(spec.id) || this.pending.some((item) => item.spec.id === spec.id))
            return Promise.reject(new OperationAlreadyActiveError(spec.id));
        if (spec.coalesceKey) {
            const existing = this.coalesced.get(spec.coalesceKey);
            if (existing) {
                this.record(spec, "coalesced");
                return existing;
            }
        }
        if (this.pending.length >= this.maxPending)
            return Promise.reject(new OperationQueueCapacityError(this.maxPending));
        const promise = new Promise((resolve, reject) => {
            this.pending.push({ spec, resolve, reject });
            this.record(spec, "queued");
            this.pump();
        });
        const coalesceKey = spec.coalesceKey;
        if (coalesceKey) {
            this.coalesced.set(coalesceKey, promise);
            const clear = () => {
                if (this.coalesced.get(coalesceKey) === promise)
                    this.coalesced.delete(coalesceKey);
            };
            // Handle both branches explicitly. A bare finally() creates a second
            // rejected Promise that can become an unhandled rejection when no caller
            // observes the coalescing registry value.
            void promise.then(clear, clear);
        }
        return promise;
    }
    cancel(id) {
        const running = this.running.get(id);
        if (running && running.spec.cancellable) {
            running.cancelled = true;
            running.controller.abort();
            this.update(id, "cancelling");
            return true;
        }
        const index = this.pending.findIndex((item) => item.spec.id === id && item.spec.cancellable);
        if (index >= 0) {
            const [item] = this.pending.splice(index, 1);
            item.reject(new OperationCancelledError(id));
            this.update(id, "cancelled");
            this.pump();
            return true;
        }
        return false;
    }
    snapshot(limit = 50) {
        return this.records.slice(-limit);
    }
    activeExclusiveKeys() {
        return new Set(this.activeExclusiveKeyCounts.keys());
    }
    pump() {
        this.pending.sort((a, b) => priorityRank[a.spec.priority] - priorityRank[b.spec.priority]);
        for (;;) {
            const index = this.pending.findIndex((item) => this.canRun(item.spec));
            if (index < 0)
                return;
            const [item] = this.pending.splice(index, 1);
            void this.start(item);
        }
    }
    canRun(spec) {
        const keys = spec.exclusiveKeys || [];
        if (!keys.length)
            return true;
        return !keys.some((key) => this.activeExclusiveKeyCounts.has(key));
    }
    async start(item) {
        const controller = new AbortController();
        const execution = { spec: item.spec, controller, cancelled: false, timedOut: false };
        this.running.set(item.spec.id, execution);
        this.addActiveExclusiveKeys(item.spec);
        this.update(item.spec.id, "running", { startedAt: new Date().toISOString() });
        let timer;
        try {
            if (item.spec.timeoutMs) {
                timer = setTimeout(() => {
                    execution.timedOut = true;
                    controller.abort();
                    this.update(item.spec.id, "cancelling", { error: (0, ErrorModel_1.normalizeSimpleError)(new Error(`operation timed out; waiting for the underlying work to settle: ${item.spec.id}`)) });
                }, item.spec.timeoutMs);
                timer.unref?.();
            }
            const operation = item.spec.run(controller.signal);
            await operation;
            const finishedAt = new Date().toISOString();
            if (execution.timedOut) {
                const error = new Error(`operation timed out after the underlying work settled: ${item.spec.id}`);
                this.update(item.spec.id, "timeout", { finishedAt, error: (0, ErrorModel_1.normalizeSimpleError)(error) });
                item.reject(error);
            }
            else {
                this.update(item.spec.id, execution.cancelled ? "cancelled" : "succeeded", { finishedAt });
                item.resolve();
            }
        }
        catch (error) {
            const status = execution.timedOut ? "timeout" : execution.cancelled ? "cancelled" : "failed";
            const patch = { finishedAt: new Date().toISOString() };
            if (status !== "cancelled")
                patch.error = (0, ErrorModel_1.normalizeSimpleError)(error);
            this.update(item.spec.id, status, patch);
            item.reject(error);
        }
        finally {
            if (timer)
                clearTimeout(timer);
            this.running.delete(item.spec.id);
            this.removeActiveExclusiveKeys(item.spec);
            this.pump();
        }
    }
    record(spec, status) {
        const record = {
            id: spec.id,
            type: spec.type,
            priority: spec.priority,
            status,
            targetServers: spec.targetServers || [],
            targetKeys: spec.targetKeys || [],
            exclusiveKeys: spec.exclusiveKeys || [],
        };
        this.records.push(record);
        this.latestRecordById.set(record.id, record);
        this.trimRecords();
    }
    update(id, status, patch = {}) {
        const current = this.latestRecordById.get(id);
        if (current)
            Object.assign(current, patch, { status });
        this.trimRecords();
    }
    addActiveExclusiveKeys(spec) {
        for (const key of spec.exclusiveKeys || []) {
            this.activeExclusiveKeyCounts.set(key, (this.activeExclusiveKeyCounts.get(key) || 0) + 1);
        }
    }
    removeActiveExclusiveKeys(spec) {
        for (const key of spec.exclusiveKeys || []) {
            const next = (this.activeExclusiveKeyCounts.get(key) || 0) - 1;
            if (next > 0)
                this.activeExclusiveKeyCounts.set(key, next);
            else
                this.activeExclusiveKeyCounts.delete(key);
        }
    }
    trimRecords() {
        let excess = this.records.length - this.historyLimit;
        if (excess <= 0)
            return;
        const remapIds = new Set();
        this.records = this.records.filter((record) => {
            if (excess > 0 && terminalStatuses.has(record.status)) {
                excess -= 1;
                if (this.latestRecordById.get(record.id) === record) {
                    this.latestRecordById.delete(record.id);
                    remapIds.add(record.id);
                }
                return false;
            }
            return true;
        });
        for (const id of remapIds) {
            for (let index = this.records.length - 1; index >= 0; index -= 1) {
                if (this.records[index].id !== id)
                    continue;
                this.latestRecordById.set(id, this.records[index]);
                break;
            }
        }
    }
}
exports.OperationQueue = OperationQueue;
