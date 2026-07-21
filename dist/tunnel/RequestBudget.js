"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestBudget = exports.RequestBudgetDeniedError = exports.defaultRequestBudgetConfig = void 0;
exports.defaultRequestBudgetConfig = {
    maxRequestsPerMinute: 10,
    maxConcurrentRequests: 1,
    pauseWhenHidden: true,
    allowManualOverride: true,
    disabledPurposes: [],
    minIntervalByPurpose: {
        health: 60_000,
        snapshot: 60_000,
        manual_refresh: 1_000,
        diagnostics: 60_000,
        events: 0,
        file_transfer: 0,
    },
};
class RequestBudgetDeniedError extends Error {
    purpose;
    decision;
    constructor(purpose, decision) {
        super(`Request blocked: ${decision.reason || "unknown"}`);
        this.purpose = purpose;
        this.decision = decision;
    }
}
exports.RequestBudgetDeniedError = RequestBudgetDeniedError;
class RequestBudget {
    config;
    inFlight = 0;
    paused = false;
    hidden = false;
    events = [];
    lastByPurpose = new Map();
    lastDeniedReason;
    constructor(config = exports.defaultRequestBudgetConfig) {
        this.config = config;
    }
    setHidden(hidden) {
        this.hidden = hidden;
    }
    pauseAll() {
        this.paused = true;
    }
    resume() {
        this.paused = false;
    }
    isPaused() {
        return this.paused;
    }
    decide(purpose, options = {}) {
        const now = Date.now();
        this.prune(now);
        const manualHealthOverride = options.userInitiated && purpose === "health" && this.config.allowManualOverride;
        if (this.paused && !manualHealthOverride)
            return this.deny(now, purpose, "paused");
        if (this.config.disabledPurposes?.includes(purpose))
            return this.deny(now, purpose, "offline");
        if (this.config.pauseWhenHidden && this.hidden && !options.userInitiated && !options.visibleBypass && purpose !== "health") {
            return this.deny(now, purpose, "hidden");
        }
        if (this.inFlight >= this.config.maxConcurrentRequests)
            return this.deny(now, purpose, "rate_limited", 500);
        if (this.allowedLastMinute(now) >= this.config.maxRequestsPerMinute)
            return this.deny(now, purpose, "rate_limited", 60_000);
        const minInterval = this.config.minIntervalByPurpose[purpose] ?? 0;
        const last = this.lastByPurpose.get(purpose) || 0;
        if (Number.isFinite(minInterval) && minInterval > 0 && now - last < minInterval) {
            return this.deny(now, purpose, "cooldown", minInterval - (now - last));
        }
        return { allowed: true };
    }
    async run(purpose, fn, options = {}) {
        const decision = this.decide(purpose, options);
        if (!decision.allowed)
            throw new RequestBudgetDeniedError(purpose, decision);
        const now = Date.now();
        this.events.push({ at: now, purpose, allowed: true });
        this.lastByPurpose.set(purpose, now);
        this.inFlight += 1;
        try {
            return await fn();
        }
        finally {
            this.inFlight = Math.max(0, this.inFlight - 1);
        }
    }
    snapshot() {
        const now = Date.now();
        this.prune(now);
        const lastAllowed = [...this.events].reverse().find((item) => item.allowed);
        return {
            paused: this.paused,
            hidden: this.hidden,
            inFlight: this.inFlight,
            maxRequestsPerMinute: this.config.maxRequestsPerMinute,
            requestsLastMinute: this.allowedLastMinute(now),
            deniedLastMinute: this.events.filter((item) => !item.allowed).length,
            lastAllowedAt: lastAllowed ? new Date(lastAllowed.at).toISOString() : undefined,
            lastDeniedReason: this.lastDeniedReason,
        };
    }
    deny(now, purpose, reason, retryAfterMs) {
        this.events.push({ at: now, purpose, allowed: false, reason });
        this.lastDeniedReason = reason;
        return { allowed: false, reason, retryAfterMs };
    }
    allowedLastMinute(now) {
        this.prune(now);
        return this.events.filter((item) => item.allowed).length;
    }
    prune(now) {
        const cutoff = now - 60_000;
        while (this.events.length && this.events[0].at < cutoff)
            this.events.shift();
    }
}
exports.RequestBudget = RequestBudget;
