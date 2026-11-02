"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_REMOTE_RESOURCE_PREFIX = void 0;
exports.normalizeRemoteResourcePrefix = normalizeRemoteResourcePrefix;
exports.remoteAgentDirectoryName = remoteAgentDirectoryName;
/** Default and normalization shared by remote resource naming consumers. */
exports.DEFAULT_REMOTE_RESOURCE_PREFIX = "simple";
function normalizeRemoteResourcePrefix(value) {
    const prefix = String(value || exports.DEFAULT_REMOTE_RESOURCE_PREFIX)
        .trim().toLowerCase()
        .replace(/[^a-z0-9._-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 32);
    return /^[a-z0-9]/.test(prefix) ? prefix : exports.DEFAULT_REMOTE_RESOURCE_PREFIX;
}
function remoteAgentDirectoryName(prefix) {
    return `${normalizeRemoteResourcePrefix(prefix)}_agent`;
}
