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
    maxRequestsPerMinute: 0,
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
    assertLocalhost(text);
    return text.startsWith("[") && text.endsWith("]") ? text.slice(1, -1) : text;
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
        maxRequestsPerMinute: 0,
        pauseWhenHidden: config.pauseWhenWebviewHidden,
    };
}
function localBaseUrl(config) {
    const host = normalizeHost(config.localHost, "127.0.0.1");
    assertLocalhost(host);
    const authorityHost = host.includes(":") ? `[${host}]` : host;
    return `http://${authorityHost}:${normalizePort(config.localPort, exports.defaultTunnelGatewayConfig.localPort)}`;
}
function assertLocalhost(host) {
    const text = String(host || "").trim();
    if (!text)
        throw new Error("Local endpoint host is required.");
    if (/[\s/\\?#@]/.test(text))
        throw new Error("Local endpoint host contains invalid URL characters.");
    const bracketed = text.startsWith("[") || text.endsWith("]");
    if (bracketed && !(text.startsWith("[") && text.endsWith("]")))
        throw new Error("IPv6 endpoint host brackets are incomplete.");
    const address = bracketed ? text.slice(1, -1) : text;
    const probe = address.includes(":") ? `[${address}]` : address;
    let parsed;
    try {
        parsed = new URL(`http://${probe}/`);
    }
    catch {
        throw new Error("Local endpoint host is not a valid hostname or IP address.");
    }
    if (!parsed.hostname || parsed.port || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash)
        throw new Error("Local endpoint host must contain only a hostname or IP address.");
    if (bracketed && !address.includes(":"))
        throw new Error("Bracketed endpoint host must be IPv6.");
}
function normalizePort(value, fallback) {
    const port = Number(value);
    if (!Number.isInteger(port) || port < 1024 || port > 65535)
        return fallback;
    return port;
}
