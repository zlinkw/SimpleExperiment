"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertTunnelOnlyMode = assertTunnelOnlyMode;
exports.removeLegacyRemoteFields = removeLegacyRemoteFields;
exports.migrateLegacyRemoteConfig = migrateLegacyRemoteConfig;
function assertTunnelOnlyMode(mode) {
    if (mode !== "mobaxterm_tunnel_realtime" && mode !== "offline_import") {
        throw new Error("Direct remote connection modes have been removed. Configure MobaXterm realtime tunnel or use offline import.");
    }
}
function removeLegacyRemoteFields(input) {
    const value = {};
    const removedFields = [];
    for (const [key, item] of Object.entries(input)) {
        if (/^(ssh|scp|rsync)/i.test(key) || /(control|shell|fallback|workerRefresh)/i.test(key)) {
            removedFields.push(key);
            continue;
        }
        value[key] = item;
    }
    return { value, removedFields };
}
function migrateLegacyRemoteConfig(input) {
    const removed = removeLegacyRemoteFields(input);
    return {
        removedFields: removed.removedFields,
        migratedToTunnel: true,
        warning: "Legacy direct remote connection mode was removed. Configure MobaXterm realtime tunnel.",
    };
}
