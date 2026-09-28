"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestBudget = exports.RequestBudgetDeniedError = exports.defaultRequestBudgetConfig = void 0;
exports.defaultRequestBudgetConfig = {
    maxRequestsPerMinute: 0,
    maxConcurrentRequests: 0,
    pauseWhenHidden: true,
    allowManualOverride: true,
    disabledPurposes: [],
    minIntervalByPurpose: {},
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
    eventStart = 0;
    allowedEventCount = 0;
    deniedEventCount = 0;
    lastAllowedAt;
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
        if (this.config.pauseWhenHidden && this.hidden && !options.userInitiated && !options.visibleBypass && purpose !== "health" && purpose !== "job_dispatch" && purpose !== "job_reconcile") {
            return this.deny(now, purpose, "hidden");
        }
        return { allowed: true };
    }
    async run(purpose, fn, options = {}) {
        const decision = this.decide(purpose, options);
        if (!decision.allowed)
            throw new RequestBudgetDeniedError(purpose, decision);
        const now = Date.now();
        this.recordEvent({ at: now, purpose, allowed: true });
        this.lastDeniedReason = undefined;
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
        return {
            paused: this.paused,
            hidden: this.hidden,
            inFlight: this.inFlight,
            maxRequestsPerMinute: 0,
            requestsLastMinute: this.allowedEventCount,
            deniedLastMinute: this.deniedEventCount,
            lastAllowedAt: this.lastAllowedAt === undefined ? undefined : new Date(this.lastAllowedAt).toISOString(),
            lastDeniedReason: this.lastDeniedReason,
        };
    }
    deny(now, purpose, reason, retryAfterMs) {
        this.recordEvent({ at: now, purpose, allowed: false, reason });
        this.lastDeniedReason = reason;
        return { allowed: false, reason, retryAfterMs };
    }
    recordEvent(event) {
        this.events.push(event);
        if (event.allowed) {
            this.allowedEventCount += 1;
            this.lastAllowedAt = event.at;
        }
        else {
            this.deniedEventCount += 1;
        }
    }
    prune(now) {
        const cutoff = now - 60_000;
        while (this.eventStart < this.events.length && this.events[this.eventStart].at < cutoff) {
            const event = this.events[this.eventStart];
            if (event.allowed)
                this.allowedEventCount = Math.max(0, this.allowedEventCount - 1);
            else
                this.deniedEventCount = Math.max(0, this.deniedEventCount - 1);
            this.eventStart += 1;
        }
        if (this.lastAllowedAt !== undefined && this.lastAllowedAt < cutoff)
            this.lastAllowedAt = undefined;
        if (this.eventStart >= 1024 && this.eventStart * 2 >= this.events.length) {
            this.events.splice(0, this.eventStart);
            this.eventStart = 0;
        }
    }
}
exports.RequestBudget = RequestBudget;
