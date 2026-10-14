"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hubControlRequiredEndpoints = exports.hubControlActionEndpoints = void 0;
exports.isHubControlAction = isHubControlAction;
exports.isHubOnlyApiPath = isHubOnlyApiPath;
// Compatibility exports for old clients. Hub cannot deploy or execute any action.
exports.hubControlActionEndpoints = [];
exports.hubControlRequiredEndpoints = [];
function isHubControlAction(action) {
    return false;
}
function isHubOnlyApiPath(path) {
    return path.startsWith("/api/actions/") || path.startsWith("/api/files/");
}
