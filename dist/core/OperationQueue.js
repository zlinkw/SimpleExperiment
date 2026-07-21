"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperationQueue = void 0;
const ErrorModel_1 = require("./ErrorModel");
const priorityRank = {
    user_blocking: 0,
    manual: 1,
    background: 2,
    realtime: 3,
};
class OperationQueue {
    pending = [];
    running = new Map();
    coalesced = new Map();
    records = [];
    enqueue(spec) {
        if (spec.coalesceKey) {
            const existing = this.coalesced.get(spec.coalesceKey);
            if (existing) {
                this.record(spec, "coalesced");
                return existing;
            }
        }
        const promise = new Promise((resolve, reject) => {
            this.pending.push({ spec, resolve, reject });
            this.record(spec, "queued");
            this.pump();
        });
        if (spec.coalesceKey) {
            this.coalesced.set(spec.coalesceKey, promise.finally(() => this.coalesced.delete(spec.coalesceKey)));
        }
        return promise;
    }
    cancel(id) {
        const running = this.running.get(id);
        if (running && running.spec.cancellable) {
            running.controller.abort();
            this.update(id, "cancelled");
            return true;
        }
        const index = this.pending.findIndex((item) => item.spec.id === id && item.spec.cancellable);
        if (index >= 0) {
            const [item] = this.pending.splice(index, 1);
            item.resolve();
            this.update(id, "cancelled");
            return true;
        }
        return false;
    }
    snapshot(limit = 50) {
        return this.records.slice(-limit);
    }
    activeExclusiveKeys() {
        const keys = new Set();
        for (const item of this.running.values()) {
            for (const key of item.spec.exclusiveKeys || [])
                keys.add(key);
        }
        return keys;
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
        const active = this.activeExclusiveKeys();
        return !keys.some((key) => active.has(key));
    }
    async start(item) {
        const controller = new AbortController();
        this.running.set(item.spec.id, { spec: item.spec, controller });
        this.update(item.spec.id, "running", { startedAt: new Date().toISOString() });
        let timer;
        try {
            const timeout = item.spec.timeoutMs
                ? new Promise((_, reject) => {
                    timer = setTimeout(() => {
                        controller.abort();
                        reject(new Error(`operation timeout: ${item.spec.id}`));
                    }, item.spec.timeoutMs);
                    timer.unref?.();
                })
                : undefined;
            await (timeout ? Promise.race([item.spec.run(controller.signal), timeout]) : item.spec.run(controller.signal));
            this.update(item.spec.id, "succeeded", { finishedAt: new Date().toISOString() });
            item.resolve();
        }
        catch (error) {
            const status = controller.signal.aborted ? "timeout" : "failed";
            this.update(item.spec.id, status, { finishedAt: new Date().toISOString(), error: (0, ErrorModel_1.normalizeZlkError)(error) });
            item.reject(error);
        }
        finally {
            if (timer)
                clearTimeout(timer);
            this.running.delete(item.spec.id);
            this.pump();
        }
    }
    record(spec, status) {
        this.records.push({
            id: spec.id,
            type: spec.type,
            priority: spec.priority,
            status,
            targetServers: spec.targetServers || [],
            targetKeys: spec.targetKeys || [],
            exclusiveKeys: spec.exclusiveKeys || [],
        });
    }
    update(id, status, patch = {}) {
        const current = [...this.records].reverse().find((item) => item.id === id);
        if (current)
            Object.assign(current, patch, { status });
    }
}
exports.OperationQueue = OperationQueue;
