"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeReconnect = void 0;
class RealtimeReconnect {
    policy;
    random;
    attempt = 0;
    constructor(policy = { reconnectInitialDelaySeconds: 3, reconnectMaxDelaySeconds: 60 }, random = Math.random) {
        this.policy = policy;
        this.random = random;
    }
    nextDelayMs() {
        const base = Math.max(1, this.policy.reconnectInitialDelaySeconds) * 1000;
        const max = Math.max(base, this.policy.reconnectMaxDelaySeconds * 1000);
        const rawDelay = Math.min(max, base * 2 ** this.attempt);
        this.attempt += 1;
        const jitterWindow = Math.min(rawDelay * 0.25, Math.max(1000, base));
        const maxDelay = Math.min(max, rawDelay + jitterWindow);
        if (maxDelay <= rawDelay)
            return rawDelay;
        return Math.round(rawDelay + (maxDelay - rawDelay) * clamp01(this.random()));
    }
    reset() {
        this.attempt = 0;
    }
    get attempts() {
        return this.attempt;
    }
}
exports.RealtimeReconnect = RealtimeReconnect;
function clamp01(value) {
    if (!Number.isFinite(value))
        return 0;
    return Math.max(0, Math.min(1, value));
}
