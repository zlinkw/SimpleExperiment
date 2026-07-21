"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerKeyLimiter = void 0;
class PerKeyLimiter {
    maxPerKey;
    active = new Map();
    queues = new Map();
    constructor(maxPerKey = 2) {
        this.maxPerKey = maxPerKey;
    }
    async run(key, task) {
        await this.acquire(key);
        try {
            return await task();
        }
        finally {
            this.release(key);
        }
    }
    acquire(key) {
        const count = this.active.get(key) || 0;
        if (count < this.maxPerKey) {
            this.active.set(key, count + 1);
            return Promise.resolve();
        }
        return new Promise((resolve) => {
            const queue = this.queues.get(key) || [];
            queue.push(() => {
                this.active.set(key, (this.active.get(key) || 0) + 1);
                resolve();
            });
            this.queues.set(key, queue);
        });
    }
    release(key) {
        const count = Math.max(0, (this.active.get(key) || 1) - 1);
        if (count)
            this.active.set(key, count);
        else
            this.active.delete(key);
        const queue = this.queues.get(key);
        const next = queue?.shift();
        if (next)
            next();
        if (queue && !queue.length)
            this.queues.delete(key);
    }
}
exports.PerKeyLimiter = PerKeyLimiter;
