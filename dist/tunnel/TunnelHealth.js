"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyTunnelHealth = classifyTunnelHealth;
function classifyTunnelHealth(input) {
    const checkedAt = new Date().toISOString();
    if (!input.configured)
        return { state: "not_configured", status: "not_configured", checkedAt, message: "Tunnel is not configured." };
    if (input.paused)
        return { state: "paused", status: "paused", checkedAt, message: "Network activity paused." };
    if (input.rateLimited)
        return { state: "rate_limited", status: "rate_limited", checkedAt, message: "Request budget limit reached." };
    if (input.error) {
        const message = input.error instanceof Error ? input.error.message : String(input.error);
        const localClosed = /ECONNREFUSED|fetch failed|connection refused|closed|AbortError/i.test(message);
        const state = localClosed ? "local_port_closed" : "agent_unreachable";
        return { state, status: state, checkedAt, message };
    }
    const snapshotAge = Number(input.response?.snapshotAge ?? 0);
    const staleAfterSeconds = input.staleAfterSeconds ?? 300;
    const state = snapshotAge > staleAfterSeconds ? "stale" : (input.response?.state || input.response?.status || "agent_ok");
    return {
        state,
        status: state,
        checkedAt,
        ...input.response,
        snapshotAge,
    };
}
