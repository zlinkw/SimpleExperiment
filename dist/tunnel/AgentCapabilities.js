"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expectedAgentApiVersion = void 0;
exports.validateAgentHealth = validateAgentHealth;
exports.validateAgentCapabilities = validateAgentCapabilities;
exports.validateFileCapabilities = validateFileCapabilities;
exports.checkAgentApiCompatibility = checkAgentApiCompatibility;
exports.expectedAgentApiVersion = "1";
const requiredEndpoints = [
    "health",
    "snapshot",
    "sseEvents",
    "fileList",
    "fileDownload",
    "fileUploadChunk",
    "fileTransferStatus",
    "actions",
];
function validateAgentHealth(value) {
    const item = value;
    return Boolean(item &&
        item.schemaVersion === 1 &&
        item.agentVersion &&
        item.apiVersion &&
        item.mode === "realtime" &&
        item.serverTime &&
        item.status);
}
function validateAgentCapabilities(value) {
    const item = value;
    return Boolean(item && item.schemaVersion === 1 && item.apiVersion && item.agentVersion && item.endpoints && item.limits && item.auth);
}
function validateFileCapabilities(value) {
    const item = value;
    return Boolean(item && item.schemaVersion === 1 && item.rootPolicy === "project_root_only" && Array.isArray(item.safeRoots));
}
function checkAgentApiCompatibility(capabilities, expectedApiVersion = exports.expectedAgentApiVersion) {
    const missingEndpoints = requiredEndpoints.filter((key) => !capabilities.endpoints[key]);
    const unsupportedFeatures = [];
    if (!capabilities.endpoints.websocketEvents)
        unsupportedFeatures.push("websocketEvents");
    if (!capabilities.endpoints.fileRangeDownload)
        unsupportedFeatures.push("fileRangeDownload");
    const expectedMajor = expectedApiVersion.split(".")[0];
    const agentMajor = String(capabilities.apiVersion).split(".")[0];
    const majorCompatible = expectedMajor === agentMajor;
    return {
        pluginExpectedApiVersion: expectedApiVersion,
        agentApiVersion: capabilities.apiVersion,
        compatible: majorCompatible && missingEndpoints.length === 0,
        missingEndpoints,
        unsupportedFeatures,
        requiredAgentUpgrade: !majorCompatible || missingEndpoints.length > 0,
    };
}
