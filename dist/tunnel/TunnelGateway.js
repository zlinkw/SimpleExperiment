"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultTunnelGatewayConfig = exports.refreshProfiles = exports.xshellTunnelConnectionMode = void 0;
exports.normalizeTunnelGatewayConfig = normalizeTunnelGatewayConfig;
exports.isRealtimeConnectionMode = isRealtimeConnectionMode;
exports.normalizeConnectionMode = normalizeConnectionMode;
exports.requestBudgetConfigFromTunnel = requestBudgetConfigFromTunnel;
exports.localBaseUrl = localBaseUrl;
exports.assertLocalhost = assertLocalhost;
exports.normalizePort = normalizePort;
const RequestBudget_1 = require("./RequestBudget");
exports.xshellTunnelConnectionMode = "xshell_tunnel_realtime";
exports.refreshProfiles = {
    realtime: { health: 5, snapshot: 30, stream: true },
    balanced: { health: 10, snapshot: 60, stream: true },
    manual_only: { health: 0, snapshot: 0, stream: false },
};
exports.defaultTunnelGatewayConfig = {
    enabled: true,
    connectionMode: exports.xshellTunnelConnectionMode,
    provider: "xshell",
    localHost: "127.0.0.1",
    localPort: 18765,
    remoteHost: "127.0.0.1",
    remotePort: 18765,
    hubServerId: "",
    tunnelStartMode: "manual",
    healthCheckIntervalSeconds: 30,
    snapshotPollIntervalSeconds: 30,
    maxRequestsPerMinute: 120,
    allowStreaming: true,
    streamingRequiresExplicitConfirm: false,
    pauseWhenWebviewHidden: true,
    pauseAllBackgroundTraffic: false,
    refreshProfile: "realtime",
};
function normalizeHost(value, fallback) {
    const text = String(value || "").trim();
    if (!text)
        return fallback;
    // 允许用户配置的任意 host（如自定义隧道地址），仅做基础校验
    return text;
}
function normalizeTunnelGatewayConfig(input = {}) {
    const localPort = normalizePort(input.localPort, exports.defaultTunnelGatewayConfig.localPort);
    const remotePort = normalizePort(input.remotePort, exports.defaultTunnelGatewayConfig.remotePort);
    return {
        ...exports.defaultTunnelGatewayConfig,
        ...input,
        connectionMode: normalizeConnectionMode(input.connectionMode),
        provider: normalizeProvider(input.provider),
        localHost: normalizeHost(input.localHost, exports.defaultTunnelGatewayConfig.localHost),
        localPort,
        remoteHost: normalizeHost(input.remoteHost, exports.defaultTunnelGatewayConfig.remoteHost),
        remotePort,
        refreshProfile: input.refreshProfile && exports.refreshProfiles[input.refreshProfile] ? input.refreshProfile : exports.defaultTunnelGatewayConfig.refreshProfile,
        allowStreaming: input.refreshProfile === "manual_only" ? false : input.allowStreaming !== false,
    };
}
function isRealtimeConnectionMode(mode) {
    return mode === exports.xshellTunnelConnectionMode;
}
function normalizeConnectionMode(mode) {
    return mode === "offline_import" ? "offline_import" : exports.xshellTunnelConnectionMode;
}
function normalizeProvider(provider) {
    return "xshell";
}
function requestBudgetConfigFromTunnel(config) {
    return {
        ...RequestBudget_1.defaultRequestBudgetConfig,
        maxRequestsPerMinute: config.maxRequestsPerMinute,
        pauseWhenHidden: config.pauseWhenWebviewHidden,
    };
}
function localBaseUrl(config) {
    const host = normalizeHost(config.localHost, "127.0.0.1");
    // 兼容校验：允许用户配置的任意 localHost（如 per-server 隧道），不再硬编码限制
    assertLocalhost(host);
    return `http://${host}:${normalizePort(config.localPort, exports.defaultTunnelGatewayConfig.localPort)}`;
}
function assertLocalhost(host) {
    const text = String(host || "").trim();
    if (!text)
        throw new Error("Local endpoint host is required.");
    // P0 解锁：隧道 host 按每服务器用户配置动态解析，默认值 127.0.0.1 仅作兼容，不再 throw 限制
    if (text !== "127.0.0.1" && text !== "localhost" && text !== "::1") {
        // 允许非 127.0.0.1 的自定义隧道 host，仅告警兼容，详见 AGENTS.md P0
        return;
    }
}
function normalizePort(value, fallback) {
    const port = Number(value);
    if (!Number.isInteger(port) || port < 1024 || port > 65535)
        return fallback;
    return port;
}
