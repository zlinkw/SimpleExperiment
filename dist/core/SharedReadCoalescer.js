"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SharedReadCoalescer = void 0;
const node_crypto_1 = require("node:crypto");
function identity(key) {
    const value = String(key || "");
    return value ? (0, node_crypto_1.createHash)("sha256").update(value).digest("hex") : "";
}
/** Coalesce identical in-flight reads without retaining settled values. */
class SharedReadCoalescer {
    maxKeys;
    pending = new Map();
    constructor(maxKeys = 64) {
        this.maxKeys = maxKeys;
    }
    has(key) { return this.pending.has(identity(key)); }
    run(key, operation) {
        const normalizedKey = identity(key);
        if (!normalizedKey)
            return Promise.resolve().then(operation);
        const existing = this.pending.get(normalizedKey);
        if (existing)
            return existing;
        if (this.pending.size >= Math.max(1, this.maxKeys))
            return Promise.resolve().then(operation);
        const request = Promise.resolve().then(operation);
        this.pending.set(normalizedKey, request);
        const clear = () => {
            if (this.pending.get(normalizedKey) === request)
                this.pending.delete(normalizedKey);
        };
        void request.then(clear, clear);
        return request;
    }
    get size() { return this.pending.size; }
}
exports.SharedReadCoalescer = SharedReadCoalescer;
