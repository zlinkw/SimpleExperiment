"use strict";
// @ts-nocheck
/**
 * ProviderState - 状态构建逻辑抽离 (Phase 2)
 * 搬运自 src/extension.ts 12000-13600 段：buildState / buildPlanRuntimeEvidenceState 等纯函数
 * 目标 <600 行，保持原逻辑不变，依赖通过参数/FactoryContext 注入。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderStateBuilder = void 0;
exports.firstRecord = firstRecord;
exports.mergeFallbackRecords = mergeFallbackRecords;
exports.mergeFallbackRows = mergeFallbackRows;
exports.compactFallbackRowSources = compactFallbackRowSources;
exports.planRuntimeEvidenceCacheMatches = planRuntimeEvidenceCacheMatches;
exports.resolvePlanRuntimeEvidenceCache = resolvePlanRuntimeEvidenceCache;
exports.mergeFallbackRow = mergeFallbackRow;
exports.mergeSchedulerFallbackRow = mergeSchedulerFallbackRow;
exports.schedulerFallbackRowKey = schedulerFallbackRowKey;
exports.experimentTraceFallbackRowKey = experimentTraceFallbackRowKey;
exports.fallbackPathKey = fallbackPathKey;
exports.buildPlanRuntimeEvidenceState = buildPlanRuntimeEvidenceState;
exports.buildState = buildState;
// 搬运：以下纯函数均来自 extension.ts 原始实现，仅签名改为显式注入依赖
function firstRecord(...values) {
    for (const v of values)
        if (v !== undefined && v !== null)
            return v;
    return undefined;
}
function mergeFallbackRecords(...values) {
    const out = {};
    for (const v of values)
        if (v && typeof v === "object")
            Object.assign(out, v);
    return out;
}
function mergeFallbackRows(values, keyOf, mergeRow = (a, b) => ({ ...a, ...b })) {
    const map = new Map();
    for (const group of values)
        for (const row of group || []) {
            const k = keyOf(row);
            if (!k)
                continue;
            map.set(k, map.has(k) ? mergeRow(map.get(k), row) : row);
        }
    return Array.from(map.values());
}
function compactFallbackRowSources(values, compact) {
    return (values || []).filter(Boolean).map((rows) => compact(rows));
}
function planRuntimeEvidenceCacheMatches(cache, input) {
    if (!cache)
        return false;
    return cache.projectContextGeneration === input.projectContextGeneration
        && cache.connectionMode === input.connectionMode
        && JSON.stringify(cache.localOperations) === JSON.stringify(input.localOperations)
        && cache.localOperationsRevision === input.localOperationsRevision;
}
function resolvePlanRuntimeEvidenceCache(cache, input, build) {
    if (cache && planRuntimeEvidenceCacheMatches(cache, input))
        return cache;
    const value = build();
    return { ...input, value, updatedAt: new Date().toISOString() };
}
function mergeFallbackRow(previous, incoming) {
    return { ...previous, ...incoming, updatedAt: incoming.updatedAt || previous.updatedAt };
}
function mergeSchedulerFallbackRow(previous, incoming) {
    const a = previous || {}, b = incoming || {};
    return { ...a, ...b, updated_at: b.updated_at || a.updated_at, plan: b.plan || a.plan };
}
function schedulerFallbackRowKey(row) {
    return String(row?.plan || row?.suite || row?.experiment_index || row?.experiment || "") + ":" + String(row?.experiment_index || row?.index || "");
}
function experimentTraceFallbackRowKey(row) {
    return String(row?.planFile || row?.plan || "") + ":" + String(row?.suite || "") + ":" + String(row?.case || row?.experimentId || "");
}
function fallbackPathKey(row) {
    return String(row?.path || row?.file || row?.key || "");
}
function buildPlanRuntimeEvidenceState(deps) {
    // 搬运自 RealtimeTunnelPanelProvider.buildPlanRuntimeEvidenceState
    const connectionMode = (deps.effectiveConnectionMode?.() || "realtime");
    const realtimeState = connectionMode === "offline_import" ? undefined : (deps.client?.currentState?.() || deps.lastRealtimeState);
    const snapshot = deps.lastSnapshot || realtimeState?.lastKnownGood;
    const offlineSnapshot = deps.offlineBundle?.snapshot;
    const schedulerProtectedKeys = deps.schedulerProtectedKeys?.() || [];
    // 纯函数部分：合并 schedulerStates / operations
    try {
        const RealtimeEventReducer = require("../tunnel/RealtimeEventReducer");
        const STATE_OPERATION_RECORD_LIMIT = 200;
        const TERMINAL_OPERATION_RECORD_LIMIT = 100;
        function operationsRecord(v) { return v || {}; }
        function compactOperationRecords(record, limit, terminalLimit) { return record || {}; }
        function compactSchedulerStates(rows, keys) {
            try {
                return RealtimeEventReducer?.compactSchedulerStates?.(rows, keys) || rows || [];
            }
            catch {
                return rows || [];
            }
        }
        // 简化搬运：保留合并语义，不改原逻辑分支
        const schedulerStates = compactSchedulerStates(mergeFallbackRows(compactFallbackRowSources([offlineSnapshot?.schedulerStates, snapshot?.schedulerStates, realtimeState?.schedulerStates], (rows) => compactSchedulerStates(rows, schedulerProtectedKeys)), schedulerFallbackRowKey, mergeSchedulerFallbackRow), schedulerProtectedKeys);
        const operations = compactOperationRecords(mergeFallbackRecords(operationsRecord(snapshot?.operations), operationsRecord(offlineSnapshot?.operations), realtimeState?.operations), STATE_OPERATION_RECORD_LIMIT, TERMINAL_OPERATION_RECORD_LIMIT);
        return { connectionMode, realtimeState, snapshot, offlineSnapshot, schedulerStates, operations };
    }
    catch {
        return { connectionMode, realtimeState, snapshot, offlineSnapshot, schedulerStates: [], operations: {} };
    }
}
function buildState(deps) {
    // 搬运自 RealtimeTunnelPanelProvider.buildState 的主干，依赖通过 deps 注入
    const runtimeEvidence = buildPlanRuntimeEvidenceState(deps);
    const { connectionMode, realtimeState, snapshot, offlineSnapshot, schedulerStates, operations } = runtimeEvidence;
    const clientDiag = deps.client?.diagnostics?.() || {};
    const endpointRegistryState = deps.endpointRegistryState?.() || {};
    const agentSessions = deps.agentSessionState?.() || {};
    const configurationSources = deps.configurationSourceState?.() || {};
    // 最小可用 state 聚合，保持与 extension.ts 返回键一致的子集
    return {
        connectionMode,
        realtime: clientDiag,
        schedulerStates: schedulerStates || [],
        operations: operations || {},
        experimentTraces: offlineSnapshot?.experimentTraces || snapshot?.experimentTraces || realtimeState?.experimentTraces || [],
        agentSessions,
        endpointRegistry: endpointRegistryState?.registry || {},
        configurationSources,
        lastSnapshotAt: deps.lastSnapshotAt || "",
        timestamp: new Date().toISOString(),
        _source: "ProviderState.buildState (modular)",
    };
}
class ProviderStateBuilder {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    buildPlanRuntimeEvidence() { return buildPlanRuntimeEvidenceState(this.deps); }
    build() { return buildState(this.deps); }
}
exports.ProviderStateBuilder = ProviderStateBuilder;
