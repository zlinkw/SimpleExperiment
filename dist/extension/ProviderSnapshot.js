"use strict";
// @ts-nocheck
/**
 * ProviderSnapshot - 快照/合并逻辑抽离 (Phase 2)
 * 搬运自 src/extension.ts 中 syncState / StateMerge / compact* / manualSnapshot 相关
 * 保持原逻辑不变，依赖通过参数注入。
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderSnapshot = void 0;
exports.mergeRealtimeSnapshotWithFallback = mergeRealtimeSnapshotWithFallback;
exports.compactMergedGpuForWebview = compactMergedGpuForWebview;
exports.applySyncStateFilters = applySyncStateFilters;
exports.requestManualSnapshot = requestManualSnapshot;
exports.compactStateMergeDiagnostics = compactStateMergeDiagnostics;
const syncState = __importStar(require("../syncState"));
function mergeRealtimeSnapshotWithFallback(deps) {
    // 搬运自 buildPlanRuntimeEvidenceState 中的 fallback 合并策略
    const { lastSnapshot, lastRealtimeState, offlineBundle } = deps;
    const realtimeState = lastRealtimeState || {};
    const snapshot = lastSnapshot || realtimeState?.lastKnownGood;
    const offlineSnapshot = offlineBundle?.snapshot;
    // 优先 realtime，其次 snapshot，最后 offline
    return {
        schedulerStates: firstNonEmpty(realtimeState?.schedulerStates, snapshot?.schedulerStates, offlineSnapshot?.schedulerStates) || [],
        experimentTraces: firstNonEmpty(realtimeState?.experimentTraces, snapshot?.experimentTraces, offlineSnapshot?.experimentTraces) || [],
        gpu: firstNonEmpty(realtimeState?.gpu, snapshot?.gpu, offlineSnapshot?.gpu) || {},
        operations: firstNonEmpty(realtimeState?.operations, snapshot?.operations, offlineSnapshot?.operations) || {},
        logs: firstNonEmpty(realtimeState?.logs, snapshot?.logs, offlineSnapshot?.logs) || {},
    };
}
function firstNonEmpty(...values) {
    for (const v of values)
        if (v !== undefined && v !== null && (Array.isArray(v) ? v.length : Object.keys(v).length))
            return v;
    return values.find((v) => v !== undefined && v !== null);
}
function compactMergedGpuForWebview(...gpus) {
    // 搬运自 extension.ts compactMergedGpuForWebview 的简化版：合并去重
    const out = {};
    for (const g of gpus)
        if (g && typeof g === "object")
            Object.assign(out, g);
    return out;
}
function applySyncStateFilters(experimentIndex, schedulerState, deletedExperiments, deletedSchedulerMatchers) {
    // 委托给 syncState 纯函数，保持原逻辑不变
    const filteredExperiments = syncState.filterExperimentIndex(experimentIndex, deletedExperiments);
    const sched = syncState.filterSchedulerState(schedulerState || {}, deletedSchedulerMatchers);
    return {
        filteredExperiments,
        filteredSchedulerState: sched.state,
        changed: filteredExperiments.length !== experimentIndex?.length || sched.changed,
    };
}
async function requestManualSnapshot(deps) {
    // 搬运自 RealtimeTunnelPanelProvider.manualSnapshot() 的调用门面
    try {
        await deps.provider?.manualSnapshot?.();
        return { ok: true, at: new Date().toISOString() };
    }
    catch {
        return { ok: false };
    }
}
function compactStateMergeDiagnostics(state) {
    // 搬运自 extension.ts compactDiagnostics 的简化投影，供快照层复用
    return {
        schedulerRows: Array.isArray(state.schedulerStates) ? state.schedulerStates.length : 0,
        experimentTraces: Array.isArray(state.experimentTraces) ? state.experimentTraces.length : 0,
        operations: typeof state.operations === "object" ? Object.keys(state.operations || {}).length : 0,
        timestamp: new Date().toISOString(),
    };
}
class ProviderSnapshot {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    merged() { return mergeRealtimeSnapshotWithFallback(this.deps); }
    diag(state) { return compactStateMergeDiagnostics(state); }
    filters(experiments, schedState, deletedExps, deletedSched) {
        return applySyncStateFilters(experiments, schedState, deletedExps, deletedSched);
    }
}
exports.ProviderSnapshot = ProviderSnapshot;
