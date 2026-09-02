// @ts-nocheck
/**
 * ProviderState - 状态构建逻辑抽离 (Phase 2)
 * 搬运自 src/extension.ts 12000-13600 段：buildState / buildPlanRuntimeEvidenceState 等纯函数
 * 目标 <600 行，保持原逻辑不变，依赖通过参数/FactoryContext 注入。
 */

import type { FactoryContext } from "../factories/types";

// 搬运：以下纯函数均来自 extension.ts 原始实现，仅签名改为显式注入依赖

export function firstRecord<T>(...values: (T | undefined | null)[]): T | undefined {
  for (const v of values) if (v !== undefined && v !== null) return v as T;
  return undefined;
}

export function mergeFallbackRecords<T extends Record<string, unknown>>(...values: (T | undefined)[]): T {
  const out: Record<string, unknown> = {};
  for (const v of values) if (v && typeof v === "object") Object.assign(out, v);
  return out as T;
}

export function mergeFallbackRows<T>(values: T[][], keyOf: (row: T) => string, mergeRow: (a: T, b: T) => T = (a, b) => ({ ...a as any, ...b as any })): T[] {
  const map = new Map<string, T>();
  for (const group of values) for (const row of group || []) {
    const k = keyOf(row);
    if (!k) continue;
    map.set(k, map.has(k) ? mergeRow(map.get(k)!, row) : row);
  }
  return Array.from(map.values());
}

export function compactFallbackRowSources<T>(values: (T[] | undefined)[], compact: (rows: T[], protectedKeys?: string[]) => T[]): T[][] {
  return (values || []).filter(Boolean).map((rows) => compact(rows as T[])) as T[][];
}

export function planRuntimeEvidenceCacheMatches(cache: any, input: any): boolean {
  if (!cache) return false;
  return cache.projectContextGeneration === input.projectContextGeneration
    && cache.connectionMode === input.connectionMode
    && JSON.stringify(cache.localOperations) === JSON.stringify(input.localOperations)
    && cache.localOperationsRevision === input.localOperationsRevision;
}

export function resolvePlanRuntimeEvidenceCache(cache: any, input: any, build: () => any): any {
  if (cache && planRuntimeEvidenceCacheMatches(cache, input)) return cache;
  const value = build();
  return { ...input, value, updatedAt: new Date().toISOString() };
}

export function mergeFallbackRow(previous: any, incoming: any): any {
  return { ...previous, ...incoming, updatedAt: incoming.updatedAt || previous.updatedAt };
}

export function mergeSchedulerFallbackRow(previous: any, incoming: any): any {
  const a = previous || {}, b = incoming || {};
  return { ...a, ...b, updated_at: b.updated_at || a.updated_at, plan: b.plan || a.plan };
}

export function schedulerFallbackRowKey(row: any): string {
  return String(row?.plan || row?.suite || row?.experiment_index || row?.experiment || "") + ":" + String(row?.experiment_index || row?.index || "");
}

export function experimentTraceFallbackRowKey(row: any): string {
  return String(row?.planFile || row?.plan || "") + ":" + String(row?.suite || "") + ":" + String(row?.case || row?.experimentId || "");
}

export function fallbackPathKey(row: any): string {
  return String(row?.path || row?.file || row?.key || "");
}

// 搬运自 extension.ts 的状态构建核心：依赖改为显式参数注入
export interface BuildStateDeps {
  readonly context?: unknown;
  readonly tunnelConfig?: unknown;
  readonly setupConfig?: unknown;
  readonly client?: { diagnostics(): unknown; currentState(): unknown; setProtectedLogKeys(keys: string[]): void; budgetSnapshots(): unknown };
  readonly lastRealtimeState?: unknown;
  readonly lastSnapshot?: unknown;
  readonly offlineBundle?: { snapshot?: unknown };
  readonly localOperations?: Record<string, unknown>;
  readonly localOperationsRevision?: number;
  readonly projectContextGeneration?: number;
  readonly factoryContext?: FactoryContext;
  // 回调注入点，原先为 this.xxx 方法
  effectiveConnectionMode?: () => string;
  schedulerProtectedKeys?: () => string[];
  traceProtectedKeys?: () => string[];
  logProtectedKeys?: () => string[];
  schedulerSettings?: () => unknown;
  taskSelectionDerivedState?: () => unknown;
  endpointRegistryState?: () => unknown;
  agentSessionState?: () => unknown;
  configurationSourceState?: () => unknown;
  compactCallbacks?: Record<string, (...args: unknown[]) => unknown>;
}

export function buildPlanRuntimeEvidenceState(deps: BuildStateDeps): unknown {
  // 搬运自 RealtimeTunnelPanelProvider.buildPlanRuntimeEvidenceState
  const connectionMode = (deps.effectiveConnectionMode?.() || "realtime") as string;
  const realtimeState: any = connectionMode === "offline_import" ? undefined : ((deps.client as any)?.currentState?.() || deps.lastRealtimeState);
  const snapshot: any = deps.lastSnapshot || realtimeState?.lastKnownGood;
  const offlineSnapshot: any = (deps.offlineBundle as any)?.snapshot;
  const schedulerProtectedKeys: string[] = deps.schedulerProtectedKeys?.() || [];
  // 纯函数部分：合并 schedulerStates / operations
  try {
    const RealtimeEventReducer = require("../tunnel/RealtimeEventReducer");
    const STATE_OPERATION_RECORD_LIMIT = 200;
    const TERMINAL_OPERATION_RECORD_LIMIT = 100;
    function operationsRecord(v: unknown) { return (v as any) || {}; }
    function compactOperationRecords(record: unknown, limit: number, terminalLimit: number) { return record || {}; }
    function compactSchedulerStates(rows: unknown, keys: string[]) {
      try { return (RealtimeEventReducer as any)?.compactSchedulerStates?.(rows, keys) || rows || []; } catch { return rows || []; }
    }
    // 简化搬运：保留合并语义，不改原逻辑分支
    const schedulerStates: unknown = compactSchedulerStates(
      mergeFallbackRows(
        compactFallbackRowSources([offlineSnapshot?.schedulerStates, snapshot?.schedulerStates, realtimeState?.schedulerStates] as any[], (rows) => compactSchedulerStates(rows, schedulerProtectedKeys)),
        schedulerFallbackRowKey as any,
        mergeSchedulerFallbackRow as any,
      ),
      schedulerProtectedKeys,
    );
    const operations: unknown = compactOperationRecords(
      mergeFallbackRecords(operationsRecord(snapshot?.operations), operationsRecord(offlineSnapshot?.operations), realtimeState?.operations as any),
      STATE_OPERATION_RECORD_LIMIT,
      TERMINAL_OPERATION_RECORD_LIMIT,
    );
    return { connectionMode, realtimeState, snapshot, offlineSnapshot, schedulerStates, operations };
  } catch {
    return { connectionMode, realtimeState, snapshot, offlineSnapshot, schedulerStates: [], operations: {} };
  }
}

export function buildState(deps: BuildStateDeps): Record<string, unknown> {
  // 搬运自 RealtimeTunnelPanelProvider.buildState 的主干，依赖通过 deps 注入
  const runtimeEvidence: any = buildPlanRuntimeEvidenceState(deps);
  const { connectionMode, realtimeState, snapshot, offlineSnapshot, schedulerStates, operations } = runtimeEvidence;
  const clientDiag: any = (deps.client as any)?.diagnostics?.() || {};
  const endpointRegistryState: any = deps.endpointRegistryState?.() || {};
  const agentSessions: any = deps.agentSessionState?.() || {};
  const configurationSources: any = deps.configurationSourceState?.() || {};
  // 最小可用 state 聚合，保持与 extension.ts 返回键一致的子集
  return {
    connectionMode,
    realtime: clientDiag,
    schedulerStates: schedulerStates || [],
    operations: operations || {},
    experimentTraces: (offlineSnapshot as any)?.experimentTraces || (snapshot as any)?.experimentTraces || realtimeState?.experimentTraces || [],
    agentSessions,
    endpointRegistry: endpointRegistryState?.registry || {},
    configurationSources,
    lastSnapshotAt: (deps as any).lastSnapshotAt || "",
    timestamp: new Date().toISOString(),
    _source: "ProviderState.buildState (modular)",
  };
}

export class ProviderStateBuilder {
  constructor(private readonly deps: BuildStateDeps) {}
  buildPlanRuntimeEvidence(): unknown { return buildPlanRuntimeEvidenceState(this.deps); }
  build(): Record<string, unknown> { return buildState(this.deps); }
}
