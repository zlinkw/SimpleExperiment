"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldAcceptVersionedState = shouldAcceptVersionedState;
exports.mergeVersionedState = mergeVersionedState;
const terminalStates = new Set(["completed", "failed", "stopped", "deleted", "delete_failed"]);
function shouldAcceptVersionedState(previous, incoming) {
    if (!previous)
        return true;
    if (incoming.runKey && previous.runKey && incoming.runKey === previous.runKey && incoming.sessionId && previous.sessionId && incoming.sessionId !== previous.sessionId)
        return true;
    const prevSeq = Number(previous.seq || 0);
    const nextSeq = Number(incoming.seq || 0);
    if (prevSeq && nextSeq && nextSeq < prevSeq)
        return false;
    const prevVersion = Number(previous.stateVersion || 0);
    const nextVersion = Number(incoming.stateVersion || 0);
    if (prevVersion && nextVersion && nextVersion < prevVersion)
        return false;
    const prevTime = Date.parse(String(previous.generatedAt || ""));
    const nextTime = Date.parse(String(incoming.generatedAt || ""));
    if (Number.isFinite(prevTime) && Number.isFinite(nextTime) && nextTime < prevTime && !nextSeq)
        return false;
    const prevStatus = String(previous.status || previous.state || "").toLowerCase();
    const nextStatus = String(incoming.status || incoming.state || "").toLowerCase();
    if (terminalStates.has(prevStatus) && !terminalStates.has(nextStatus) && previous.runKey === incoming.runKey && String(previous.sessionId || "") === String(incoming.sessionId || ""))
        return false;
    return true;
}
function mergeVersionedState(previous, incoming) {
    if (!shouldAcceptVersionedState(previous, incoming))
        return previous;
    return { ...(previous || {}), ...incoming };
}
