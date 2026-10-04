"use strict";
/** Assemble realtime endpoints from the resolved per-server tunnel configuration. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderRealtime = void 0;
exports.buildRealtimeEndpoints = buildRealtimeEndpoints;
exports.buildTunnelLaunchItems = buildTunnelLaunchItems;
exports.buildAgentLaunchItems = buildAgentLaunchItems;
exports.buildRealtimeStateSnapshot = buildRealtimeStateSnapshot;
const TunnelEndpointRegistry_1 = require("../tunnel/TunnelEndpointRegistry");
const XshellTunnelSetup_1 = require("../tunnel/XshellTunnelSetup");
function endpointCapabilitiesFromProbe(probe) {
    if (!probe || typeof probe !== "object")
        return [];
    const capabilities = probe.capabilities;
    return Array.isArray(capabilities) ? capabilities : capabilities && typeof capabilities === "object" ? capabilities : [];
}
function buildRealtimeEndpoints(deps) {
    const registry = (0, TunnelEndpointRegistry_1.buildTunnelEndpointRegistry)(deps.setupConfig, {
        hub: deps.lastProbe,
        ...(deps.lastWorkerProbes || {}),
    });
    const token = String(deps.tunnelConfig?.token || "");
    return registry.endpoints
        .filter((endpoint) => endpoint.enabled && (deps.topology.hubAllowed || endpoint.role !== "hub_control"))
        .map((endpoint) => {
        const localHost = String(endpoint.tunnel.localHost || "").trim();
        const remoteHost = String(endpoint.tunnel.remoteHost || "").trim();
        const localPort = Number(endpoint.tunnel.localPort);
        const remotePort = Number(endpoint.tunnel.remotePort);
        if (!endpoint.id || !localHost || !remoteHost || !Number.isInteger(localPort) || localPort <= 0
            || !Number.isInteger(remotePort) || remotePort <= 0) {
            throw new Error(`隧道端点 ${endpoint.id || "unknown"} 配置不完整，拒绝创建实时客户端。`);
        }
        return {
            id: endpoint.id,
            role: endpoint.role === "hub_control" ? "hub" : "worker",
            displayName: endpoint.displayName,
            localHost,
            localPort,
            remoteHost,
            remotePort,
            token,
            timeoutMs: 8000,
            capabilities: endpointCapabilitiesFromProbe(endpoint.lastProbe),
        };
    });
}
function buildTunnelLaunchItems(deps) {
    const base = (0, XshellTunnelSetup_1.normalizeXshellSetupConfig)(deps.setupConfig);
    const items = [];
    if (deps.topology.hubAllowed) {
        items.push({
            id: "hub",
            role: "hub",
            config: (0, XshellTunnelSetup_1.normalizeXshellSetupConfig)({
                ...base,
                workerRealtimeMode: "hub_only",
                workerTelemetryMode: "hub_only",
                workerTunnels: [],
            }),
        });
    }
    for (const worker of base.workerTunnels) {
        if (worker.enabled === false)
            continue;
        items.push({
            id: worker.id,
            role: "worker",
            config: (0, XshellTunnelSetup_1.workerTunnelToXshellSetupConfig)(base, worker),
        });
    }
    return items;
}
function buildAgentLaunchItems(deps) {
    return buildTunnelLaunchItems(deps)
        .filter((item) => Boolean(item.config.savedSessionPath))
        .map((item) => ({
        id: `${item.id}-agent`,
        role: item.role,
        displayName: `${item.id} Agent`,
        sessionPath: String(item.config.savedSessionPath || ""),
    }));
}
function buildRealtimeStateSnapshot(deps) {
    return {
        endpoints: buildRealtimeEndpoints(deps),
        launchItems: buildTunnelLaunchItems(deps),
        agentLaunchItems: buildAgentLaunchItems(deps),
        hubAllowed: deps.topology.hubAllowed === true,
        topologyMode: String(deps.topology.mode || ""),
    };
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
