"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CURRENT_RUNTIME_VERSION = exports.RUNTIME_MANIFEST_SCHEMA_VERSION = void 0;
exports.sha256Text = sha256Text;
exports.buildExpectedRuntimeManifest = buildExpectedRuntimeManifest;
exports.parseRuntimeManifest = parseRuntimeManifest;
exports.isRuntimeManifest = isRuntimeManifest;
exports.runtimeNeedsDeploy = runtimeNeedsDeploy;
exports.verifyRuntimeHashes = verifyRuntimeHashes;
const crypto_1 = require("crypto");
// 单源：CURRENT_RUNTIME_VERSION 为 runtime 真值（远端 py 的 AGENT/RUNTIME/SCHEDULER_VERSION 由 build 动态注入，禁止手改）；pluginVersion 真值来自 package.json#version，自动同步
exports.RUNTIME_MANIFEST_SCHEMA_VERSION = 1;
exports.CURRENT_RUNTIME_VERSION = "0.4.92";
function sha256Text(text) {
    return (0, crypto_1.createHash)("sha256").update(text, "utf8").digest("hex");
}
function buildExpectedRuntimeManifest(pluginVersion, runtimeVersion, components, installedAt) {
    const unified = String(pluginVersion || runtimeVersion || "").trim() || String(runtimeVersion || "").trim();
    return {
        schemaVersion: exports.RUNTIME_MANIFEST_SCHEMA_VERSION,
        pluginVersion,
        runtimeVersion,
        unifiedVersion: unified,
        components: Object.fromEntries(components.map((item) => [
            item.component,
            {
                version: item.version,
                sha256: sha256Text(item.content),
                remotePath: item.remotePath,
                installedAt,
            },
        ])),
    };
}
function parseRuntimeManifest(text) {
    try {
        const parsed = JSON.parse(text);
        return isRuntimeManifest(parsed) ? parsed : undefined;
    }
    catch {
        return undefined;
    }
}
function isRuntimeManifest(value) {
    const item = value;
    const hasUnified = typeof item.unifiedVersion === "string" ? true : typeof item.pluginVersion === "string";
    return Boolean(item)
        && item.schemaVersion === exports.RUNTIME_MANIFEST_SCHEMA_VERSION
        && typeof item.pluginVersion === "string"
        && typeof item.runtimeVersion === "string"
        && hasUnified
        && item.components
        && typeof item.components === "object";
}
function runtimeNeedsDeploy(actual, expected) {
    if (!actual)
        return true;
    if (actual.schemaVersion !== expected.schemaVersion)
        return true;
    if (actual.runtimeVersion !== expected.runtimeVersion)
        return true;
    const actualUnified = String(actual.unifiedVersion || actual.pluginVersion || actual.runtimeVersion || "").trim();
    const expectedUnified = String(expected.unifiedVersion || expected.pluginVersion || expected.runtimeVersion || "").trim();
    if (actualUnified && expectedUnified && actualUnified !== expectedUnified)
        return true;
    for (const [component, info] of Object.entries(expected.components)) {
        const current = actual.components[component];
        if (!current || current.version !== info.version || current.sha256 !== info.sha256 || current.remotePath !== info.remotePath)
            return true;
    }
    return false;
}
function verifyRuntimeHashes(actualHashes, expected, checkedAt = new Date().toISOString()) {
    const components = Object.entries(expected.components).map(([component, info]) => {
        const actualSha256 = actualHashes[info.remotePath] || "";
        const status = !actualSha256 ? "missing" : actualSha256 === info.sha256 ? "ok" : "hash_mismatch";
        return {
            component: component,
            remotePath: info.remotePath,
            expectedSha256: info.sha256,
            actualSha256: actualSha256 || undefined,
            status,
            message: status === "ok" ? undefined : `${component} ${status}`,
        };
    });
    return {
        schemaVersion: exports.RUNTIME_MANIFEST_SCHEMA_VERSION,
        ok: components.every((item) => item.status === "ok"),
        expectedRuntimeVersion: expected.runtimeVersion,
        actualRuntimeVersion: expected.runtimeVersion,
        checkedAt,
        components,
    };
}
