"use strict";
// @ts-nocheck
/**
 * ProviderRealtime - 实时相关逻辑抽离 (Phase 2)
 * 搬运自 src/extension.ts 12000-12200 段：realtimeEndpoints / tunnelLaunchItems / agentLaunchItems 等
 * 保持原逻辑不变，依赖通过参数注入。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderRealtime = void 0;
exports.buildRealtimeEndpoints = buildRealtimeEndpoints;
exports.buildTunnelLaunchItems = buildTunnelLaunchItems;
exports.buildAgentLaunchItems = buildAgentLaunchItems;
exports.buildRealtimeStateSnapshot = buildRealtimeStateSnapshot;
function endpointCapabilitiesFromProbe(probe) {
    try {
        return probe?.capabilities || [];
    }
    catch {
        return [];
    }
}
function buildRealtimeEndpoints(deps) {
    // 搬运自 RealtimeTunnelPanelProvider.realtimeEndpoints()
    try {
        const { buildTunnelEndpointRegistry } = require("../tunnel/TunnelEndpointRegistry");
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
            token: deps.tunnelConfig?.token,
            timeoutMs: 8000,
            capabilities: endpointCapabilitiesFromProbe(endpoint.lastProbe),
        }));
    }
    catch {
        return [];
    }
}
function buildTunnelLaunchItems(deps) {
    // 搬运自 RealtimeTunnelPanelProvider.tunnelLaunchItems()
    try {
        const { normalizeXshellSetupConfig, workerTunnelToXshellSetupConfig } = require("../tunnel/XshellTunnelSetup");
        const { hubAllowed } = projectTopologyAssessmentStub(deps.setupConfig, deps.lastProbe, deps.lastWorkerProbes);
        const items = hubAllowed ? [
            { id: "hub", role: "hub", config: normalizeXshellSetupConfig({ ...deps.setupConfig, workerRealtimeMode: "hub_only", workerTelemetryMode: "hub_only", workerTunnels: [] }) },
        ] : [];
        const workers = enabledWorkerConfigsStub(deps.setupConfig);
        for (const worker of workers) {
            items.push({ id: worker.id, role: "worker", config: workerTunnelToXshellSetupConfig(deps.setupConfig, worker) });
        }
        return items;
    }
    catch {
        return [];
    }
}
function buildAgentLaunchItems(deps) {
    // 搬运自 RealtimeTunnelPanelProvider.agentLaunchItems()
    return buildTunnelLaunchItems(deps)
        .filter((item) => item.config?.savedSessionPath)
        .map((item) => ({
        id: `${item.id}-agent`,
        role: item.role,
        displayName: `${item.id} Agent`,
        sessionPath: item.config.savedSessionPath || "",
    }));
}
function buildRealtimeStateSnapshot(deps) {
    return {
        endpoints: buildRealtimeEndpoints(deps),
        launchItems: buildTunnelLaunchItems(deps),
        agentLaunchItems: buildAgentLaunchItems(deps),
        hubAllowed: projectTopologyAssessmentStub(deps.setupConfig, deps.lastProbe, deps.lastWorkerProbes).hubAllowed,
        timestamp: new Date().toISOString(),
    };
}
function enabledWorkerConfigsStub(setupConfig) {
    try {
        return (setupConfig?.workerTunnels || []).filter((w) => w?.enabled !== false);
    }
    catch {
        return [];
    }
}
function projectTopologyAssessmentStub(setupConfig, _lastProbe, _lastWorkerProbes) {
    // 轻量搬运：hubAllowed 判定与 extension.ts 保持一致（topologyMode 判断），此处简化为 setupConfig 能力
    const mode = String(setupConfig?.topologyMode || setupConfig?.mode || "hub_plus_workers");
    const hubAllowed = mode !== "worker_only" && mode !== "workers_only";
    return { hubAllowed, mode };
}
class ProviderRealtime {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    realtimeEndpoints() { return buildRealtimeEndpoints(this.deps); }
    tunnelLaunchItems() { return buildTunnelLaunchItems(this.deps); }
    agentLaunchItems() { return buildAgentLaunchItems(this.deps); }
    snapshot() { return buildRealtimeStateSnapshot(this.deps); }
}
exports.ProviderRealtime = ProviderRealtime;
