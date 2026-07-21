"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyExperimentEvent = applyExperimentEvent;
exports.retryExperiment = retryExperiment;
const terminal = new Set(["completed", "failed", "stopped", "deleted"]);
function applyExperimentEvent(lifecycle, event) {
    const current = lifecycle || { experimentId: event.experimentId, attemptId: event.attemptId || "attempt-1", state: "planned", events: [] };
    if (current.events.some((item) => item.seq >= event.seq))
        return current;
    if (terminal.has(current.state) && event.to && !terminal.has(event.to) && event.attemptId === current.attemptId) {
        return { ...current, events: [...current.events, { ...event, reason: event.reason || "ignored stale transition" }] };
    }
    return { ...current, state: event.to || current.state, attemptId: event.attemptId || current.attemptId, events: [...current.events, event] };
}
function retryExperiment(previous, mode = "same_worker") {
    const attempt = `attempt-${previous.events.filter((item) => item.type === "retry").length + 2}`;
    const event = {
        experimentId: previous.experimentId,
        attemptId: attempt,
        seq: Math.max(0, ...previous.events.map((item) => item.seq)) + 1,
        type: "retry",
        from: previous.state,
        to: "queued",
        at: new Date().toISOString(),
        source: "user",
        reason: mode,
    };
    return applyExperimentEvent({ ...previous, attemptId: attempt, state: "queued" }, event);
}
