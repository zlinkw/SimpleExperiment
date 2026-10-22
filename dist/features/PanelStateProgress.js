"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.observeStateRenderProgress = observeStateRenderProgress;
function observeStateRenderProgress(postedSeq, renderedSeq, previousObservedRenderedSeq, consecutiveStalledAcks, threshold = 3) {
    const rendered = Number.isFinite(renderedSeq) ? Math.max(0, Math.floor(renderedSeq)) : 0;
    if (postedSeq <= rendered)
        return { previousObservedRenderedSeq: rendered, consecutiveStalledAcks: 0, unhealthy: false };
    if (!Number.isFinite(previousObservedRenderedSeq))
        return { previousObservedRenderedSeq: rendered, consecutiveStalledAcks: 0, unhealthy: false };
    if (rendered > Number(previousObservedRenderedSeq))
        return { previousObservedRenderedSeq: rendered, consecutiveStalledAcks: 0, unhealthy: false };
    const next = Math.max(0, consecutiveStalledAcks) + 1;
    return { previousObservedRenderedSeq: rendered, consecutiveStalledAcks: next, unhealthy: next >= Math.max(1, threshold) };
}
