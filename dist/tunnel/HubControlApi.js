"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hubControlRequiredEndpoints = exports.hubControlActionEndpoints = void 0;
exports.isHubControlAction = isHubControlAction;
exports.isHubOnlyApiPath = isHubOnlyApiPath;
const TunnelClient_1 = require("./TunnelClient");
exports.hubControlActionEndpoints = TunnelClient_1.tunnelActions.map((action) => `/api/actions/${action}`);
exports.hubControlRequiredEndpoints = [
    "/api/health",
    "/api/capabilities",
    "/api/snapshot",
    "/api/gpu",
    "/api/scheduler",
    "/api/traces",
    "/api/results/summary",
    "/api/diagnostics",
    "/api/audit/tail",
    "WS /api/events?since=<seq>",
    "GET /api/events/sse?since=<seq>",
    "GET /api/files/list?path=<path>",
    "GET /api/files/download?path=<path>",
    "POST /api/files/upload/init",
    "POST /api/files/upload/chunk",
    "POST /api/files/upload/complete",
    ...exports.hubControlActionEndpoints,
];
function isHubControlAction(action) {
    return TunnelClient_1.tunnelActions.includes(action);
}
function isHubOnlyApiPath(path) {
    return path.startsWith("/api/actions/") || path.startsWith("/api/files/");
}
