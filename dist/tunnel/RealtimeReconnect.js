"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeReconnect = void 0;
class RealtimeReconnect {
    policy;
    attempt = 0;
    constructor(policy = { reconnectInitialDelaySeconds: 3, reconnectMaxDelaySeconds: 60 }) {
        this.policy = policy;
    }
    nextDelayMs() {
        const base = Math.max(1, this.policy.reconnectInitialDelaySeconds) * 1000;
        const max = Math.max(base, this.policy.reconnectMaxDelaySeconds * 1000);
        const delay = Math.min(max, base * 2 ** this.attempt);
        this.attempt += 1;
        return delay;
    }
    reset() {
        this.attempt = 0;
    }
    get attempts() {
        return this.attempt;
    }
}
exports.RealtimeReconnect = RealtimeReconnect;
