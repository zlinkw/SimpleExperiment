"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultTunnelPorts = void 0;
exports.isValidTunnelPort = isValidTunnelPort;
exports.isPortInRange = isPortInRange;
exports.normalizePortRange = normalizePortRange;
exports.makeTunnelPortConflict = makeTunnelPortConflict;
exports.defaultTunnelPorts = {
    hubLocalPort: 18765,
    workerLocalPortRange: { start: 18766, end: 18999 },
    defaultHubAgentPort: 18765,
    defaultWorkerTelemetryPort: 18765,
};
function isValidTunnelPort(port) {
    return Number.isInteger(port) && port >= 1024 && port <= 65535;
}
function isPortInRange(port, range) {
    return isValidTunnelPort(port) && port >= range.start && port <= range.end;
}
function normalizePortRange(input, fallback = exports.defaultTunnelPorts.workerLocalPortRange) {
    const start = Number(input?.start);
    const end = Number(input?.end);
    if (!isValidTunnelPort(start) || !isValidTunnelPort(end) || start > end)
        return { ...fallback };
    return { start, end };
}
function makeTunnelPortConflict(endpointId, requestedPort, conflictType, severity, message, suggestion) {
    return { endpointId, requestedPort, conflictType, severity, message, suggestion };
}
