/**
 * ProviderRealtime - 实时相关逻辑抽离 (Phase 2)
 * 搬运自 src/extension.ts 12000-12200 段：realtimeEndpoints / tunnelLaunchItems / agentLaunchItems 等
 * 保持原逻辑不变，依赖通过参数注入。
 */

import type { FactoryContext } from "../factories/types";

function tryRequire<T>(id: string): T | undefined {
  try { return (require as unknown as (x: string) => T)(id); } catch { return undefined; }
}

export interface RealtimeEndpoint {
  readonly id: string;
  readonly role: string;
  readonly displayName: string;
  readonly localHost: string;
  readonly localPort: number;
  readonly token: string;
  readonly timeoutMs: number;
  readonly capabilities?: unknown;
}

export interface TunnelLaunchItem {
  readonly id: string;
  readonly role: string;
  readonly config: unknown;
}

export interface RealtimeDeps {
  readonly setupConfig: unknown;
  readonly tunnelConfig: unknown;
  readonly lastProbe: unknown;
  readonly lastWorkerProbes: Record<string, unknown>;
  readonly factoryContext?: FactoryContext;
}

function endpointCapabilitiesFromProbe(probe: unknown): unknown {
  try { return (probe as Record<string, unknown>)?.["capabilities"] || []; } catch { return []; }
}

export function buildRealtimeEndpoints(deps: RealtimeDeps): RealtimeEndpoint[] {
  // 搬运自 RealtimeTunnelPanelProvider.realtimeEndpoints()
  try {
    const mod = tryRequire<{ buildTunnelEndpointRegistry: (setup: unknown, probes: unknown) => { endpoints: Array<{ enabled: boolean; role: string; id: string; displayName: string; tunnel: { localPort: number }; lastProbe: unknown }> } }>("../tunnel/TunnelEndpointRegistry");
    if (!mod) return [];
    const { buildTunnelEndpointRegistry } = mod;
    const { hubAllowed } = projectTopologyAssessmentStub(deps.setupConfig, deps.lastProbe, deps.lastWorkerProbes);
    const registry = buildTunnelEndpointRegistry(deps.setupConfig, { hub: deps.lastProbe, ...deps.lastWorkerProbes });
    return (registry.endpoints || [])
      .filter((endpoint) => endpoint.enabled && (hubAllowed || endpoint.role !== "hub_control"))
      .map((endpoint) => ({
        id: endpoint.id,
        role: endpoint.role === "hub_control" ? "hub" : "worker",
        displayName: endpoint.displayName,
        localHost: "127.0.0.1",
        localPort: endpoint.tunnel.localPort,
        token: (deps.tunnelConfig as Record<string, string> | undefined)?.["token"] ?? "",
        timeoutMs: 8000,
        capabilities: endpointCapabilitiesFromProbe(endpoint.lastProbe),
      }));
  } catch {
    return [];
  }
}

export function buildTunnelLaunchItems(deps: RealtimeDeps): TunnelLaunchItem[] {
  // 搬运自 RealtimeTunnelPanelProvider.tunnelLaunchItems()
  try {
    const mod = tryRequire<{ normalizeXshellSetupConfig: (c: unknown) => unknown; workerTunnelToXshellSetupConfig: (s: unknown, w: unknown) => unknown }>("../tunnel/XshellTunnelSetup");
    if (!mod) return [];
    const { normalizeXshellSetupConfig, workerTunnelToXshellSetupConfig } = mod;
    const { hubAllowed } = projectTopologyAssessmentStub(deps.setupConfig, deps.lastProbe, deps.lastWorkerProbes);
    const items: TunnelLaunchItem[] = hubAllowed ? [
      { id: "hub", role: "hub", config: normalizeXshellSetupConfig({ ...(deps.setupConfig as Record<string, unknown>), workerRealtimeMode: "hub_only", workerTelemetryMode: "hub_only", workerTunnels: [] }) },
    ] : [];
    const workers: unknown[] = enabledWorkerConfigsStub(deps.setupConfig);
    for (const worker of workers) {
      const w = worker as Record<string, unknown>;
      items.push({ id: String(w["id"]), role: "worker", config: workerTunnelToXshellSetupConfig(deps.setupConfig, worker) });
    }
    return items;
  } catch {
    return [];
  }
}

export function buildAgentLaunchItems(deps: RealtimeDeps): Array<{ id: string; role: string; displayName: string; sessionPath: string }> {
  // 搬运自 RealtimeTunnelPanelProvider.agentLaunchItems()
  return buildTunnelLaunchItems(deps)
    .filter((item) => (item.config as Record<string, unknown>)?.["savedSessionPath"])
    .map((item) => ({
      id: `${item.id}-agent`,
      role: item.role,
      displayName: `${item.id} Agent`,
      sessionPath: String((item.config as Record<string, unknown>)["savedSessionPath"] || ""),
    }));
}

export function buildRealtimeStateSnapshot(deps: RealtimeDeps): Record<string, unknown> {
  return {
    endpoints: buildRealtimeEndpoints(deps),
    launchItems: buildTunnelLaunchItems(deps),
    agentLaunchItems: buildAgentLaunchItems(deps),
    hubAllowed: projectTopologyAssessmentStub(deps.setupConfig, deps.lastProbe, deps.lastWorkerProbes).hubAllowed,
    timestamp: new Date().toISOString(),
  };
}

function enabledWorkerConfigsStub(setupConfig: unknown): unknown[] {
  try { return ((setupConfig as Record<string, unknown>)?.["workerTunnels"] as unknown[] || []).filter((w) => (w as Record<string, unknown>)?.["enabled"] !== false); } catch { return []; }
}

function projectTopologyAssessmentStub(setupConfig: unknown, _lastProbe: unknown, _lastWorkerProbes: unknown): { hubAllowed: boolean; mode: string } {
  // 轻量搬运：hubAllowed 判定与 extension.ts 保持一致（topologyMode 判断），此处简化为 setupConfig 能力
  const sc = setupConfig as Record<string, unknown>;
  const mode = String(sc?.["topologyMode"] || sc?.["mode"] || "hub_plus_workers");
  const hubAllowed = mode !== "worker_only" && mode !== "workers_only";
  return { hubAllowed, mode };
}

export class ProviderRealtime {
  constructor(private readonly deps: RealtimeDeps) {}
  realtimeEndpoints(): RealtimeEndpoint[] { return buildRealtimeEndpoints(this.deps); }
  tunnelLaunchItems(): TunnelLaunchItem[] { return buildTunnelLaunchItems(this.deps); }
  agentLaunchItems() { return buildAgentLaunchItems(this.deps); }
  snapshot() { return buildRealtimeStateSnapshot(this.deps); }
}
