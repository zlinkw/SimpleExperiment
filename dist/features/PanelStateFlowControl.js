"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPanelStateFlowControlState = createPanelStateFlowControlState;
exports.beginPanelStateDocument = beginPanelStateDocument;
exports.setPanelStateFlowVisibility = setPanelStateFlowVisibility;
exports.requestPanelStateFlowPost = requestPanelStateFlowPost;
exports.markPanelStateFlowPosted = markPanelStateFlowPosted;
exports.markPanelStateFlowDelivered = markPanelStateFlowDelivered;
exports.failPanelStateFlowPost = failPanelStateFlowPost;
exports.acknowledgePanelStateRendered = acknowledgePanelStateRendered;
exports.panelStateFlowControlSnapshot = panelStateFlowControlSnapshot;
function createPanelStateFlowControlState(documentGeneration = 0, visible = true) {
    return {
        documentGeneration: normalizeSequence(documentGeneration),
        visible: visible === true,
        postedSeq: 0,
        deliveredSeq: 0,
        renderedSeq: 0,
        outstandingRenderSeq: null,
        outstandingSince: null,
        pendingDirty: false,
        pendingImmediate: false,
    };
}
function beginPanelStateDocument(state, documentGeneration, visible = true) {
    return createPanelStateFlowControlState(documentGeneration, visible);
}
function setPanelStateFlowVisibility(state, visible) {
    const nextVisible = visible === true;
    if (!nextVisible && state.visible && state.outstandingRenderSeq !== null && state.renderedSeq < state.outstandingRenderSeq) {
        return {
            ...state,
            visible: false,
            outstandingRenderSeq: null,
            outstandingSince: null,
            pendingDirty: true,
        };
    }
    return { ...state, visible: nextVisible };
}
function requestPanelStateFlowPost(state, immediate = false, bootstrap = false) {
    const pending = {
        ...state,
        pendingDirty: true,
        pendingImmediate: state.pendingImmediate || immediate === true || bootstrap === true,
    };
    if (!pending.visible)
        return { state: pending, shouldPost: false, immediate: pending.pendingImmediate, reason: "hidden" };
    if (pending.outstandingRenderSeq !== null && pending.renderedSeq < pending.outstandingRenderSeq) {
        return { state: pending, shouldPost: false, immediate: pending.pendingImmediate, reason: "awaiting-render" };
    }
    return { state: pending, shouldPost: true, immediate: pending.pendingImmediate, reason: "ready" };
}
function markPanelStateFlowPosted(state, seq, now = Date.now()) {
    const normalizedSeq = normalizeSequence(seq);
    if (!normalizedSeq || normalizedSeq <= state.postedSeq)
        return state;
    if (state.outstandingRenderSeq !== null && state.renderedSeq < state.outstandingRenderSeq)
        return state;
    return {
        ...state,
        postedSeq: normalizedSeq,
        outstandingRenderSeq: normalizedSeq,
        outstandingSince: Math.max(0, Number.isFinite(now) ? now : Date.now()),
        pendingDirty: false,
        pendingImmediate: false,
    };
}
function markPanelStateFlowDelivered(state, seq) {
    const normalizedSeq = normalizeSequence(seq);
    if (!normalizedSeq || normalizedSeq > state.postedSeq)
        return state;
    return { ...state, deliveredSeq: Math.max(state.deliveredSeq, normalizedSeq) };
}
function failPanelStateFlowPost(state, seq) {
    const normalizedSeq = normalizeSequence(seq);
    if (state.outstandingRenderSeq !== normalizedSeq)
        return state;
    return {
        ...state,
        outstandingRenderSeq: null,
        outstandingSince: null,
        pendingDirty: true,
    };
}
function acknowledgePanelStateRendered(state, documentGeneration, seq, now = Date.now()) {
    const normalizedGeneration = normalizeSequence(documentGeneration);
    const normalizedSeq = normalizeSequence(seq);
    if (normalizedGeneration !== state.documentGeneration || normalizedSeq === 0 || normalizedSeq > state.postedSeq || normalizedSeq <= state.renderedSeq) {
        return { state, accepted: false, clearedOutstanding: false, renderAckLatencyMs: null, shouldFlushPending: false };
    }
    const clearedOutstanding = state.outstandingRenderSeq !== null && normalizedSeq >= state.outstandingRenderSeq;
    const renderAckLatencyMs = clearedOutstanding && state.outstandingSince !== null
        ? Math.max(0, Math.round((Number.isFinite(now) ? now : Date.now()) - state.outstandingSince))
        : null;
    const next = {
        ...state,
        renderedSeq: normalizedSeq,
        outstandingRenderSeq: clearedOutstanding ? null : state.outstandingRenderSeq,
        outstandingSince: clearedOutstanding ? null : state.outstandingSince,
    };
    return {
        state: next,
        accepted: true,
        clearedOutstanding,
        renderAckLatencyMs,
        shouldFlushPending: clearedOutstanding && next.pendingDirty && next.visible,
    };
}
function panelStateFlowControlSnapshot(state, now = Date.now()) {
    return {
        documentGeneration: state.documentGeneration,
        visible: state.visible,
        postedSeq: state.postedSeq,
        deliveredSeq: state.deliveredSeq,
        renderedSeq: state.renderedSeq,
        outstandingRenderSeq: state.outstandingRenderSeq,
        pendingDirty: state.pendingDirty,
        outstandingAgeMs: state.outstandingSince === null ? 0 : Math.max(0, Math.round((Number.isFinite(now) ? now : Date.now()) - state.outstandingSince)),
    };
}
function normalizeSequence(value) {
    return Number.isSafeInteger(value) ? Math.max(0, value) : 0;
}
