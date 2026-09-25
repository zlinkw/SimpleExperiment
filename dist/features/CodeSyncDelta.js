"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryFilesByPath = inventoryFilesByPath;
exports.changedManifestFiles = changedManifestFiles;
function inventoryFilesByPath(inventory) {
    const files = inventory?.files;
    if (!files || typeof files !== "object")
        throw new Error("远端项目清单未返回文件哈希。");
    if (!Array.isArray(files))
        return files;
    const mapped = {};
    for (const row of files) {
        const key = String(row?.path || row?.relativePath || "").replace(/\\/g, "/").replace(/^\.\//, "");
        if (key)
            mapped[key] = { sha256: row.sha256, size: row.size };
    }
    return mapped;
}
function changedManifestFiles(local, remote = {}) {
    const changed = {};
    for (const [file, info] of Object.entries(local || {})) {
        const localHash = String(info?.sha256 || "").toLowerCase();
        const remoteHash = String(remote?.[file]?.sha256 || "").toLowerCase();
        if (!localHash || localHash !== remoteHash)
            changed[file] = info;
    }
    return changed;
}
