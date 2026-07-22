"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertTunnelOnlyMode = assertTunnelOnlyMode;
exports.removeLegacyRemoteFields = removeLegacyRemoteFields;
exports.migrateLegacyRemoteConfig = migrateLegacyRemoteConfig;
const TunnelGateway_1 = require("./TunnelGateway");
function assertTunnelOnlyMode(mode) {
    if (!(0, TunnelGateway_1.isRealtimeConnectionMode)(mode) && mode !== "offline_import") {
        throw new Error("直接远程连接模式已移除。请配置实时隧道或使用离线导入。");
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
        warning: "旧版直接远程连接模式已移除。请配置 Xshell 本地隧道；原 MobaXterm 实时隧道配置仅保留兼容迁移。",
    };
}
