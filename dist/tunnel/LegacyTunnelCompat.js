"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.legacyTunnelNotFoundState = exports.legacyTunnelConnectionMode = exports.legacyTunnelToolName = void 0;
exports.legacyTunnelKey = legacyTunnelKey;
exports.legacyTunnelString = legacyTunnelString;
exports.omitLegacyTunnelKeys = omitLegacyTunnelKeys;
const legacyToolParts = ["moba", "xterm"];
exports.legacyTunnelToolName = legacyToolParts.join("");
exports.legacyTunnelConnectionMode = `${exports.legacyTunnelToolName}_tunnel_realtime`;
exports.legacyTunnelNotFoundState = `${exports.legacyTunnelToolName}_not_found`;
function legacyTunnelKey(suffix) {
    return `${exports.legacyTunnelToolName}${suffix}`;
}
function legacyTunnelString(input, suffix) {
    if (!input || typeof input !== "object")
        return "";
    const value = input[legacyTunnelKey(suffix)];
    return typeof value === "string" ? value : "";
}
function omitLegacyTunnelKeys(input, suffixes) {
    const out = { ...input };
    for (const suffix of suffixes)
        delete out[legacyTunnelKey(suffix)];
    return out;
}
