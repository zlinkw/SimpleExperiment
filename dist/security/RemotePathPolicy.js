"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeRemotePath = normalizeRemotePath;
exports.safeRemoteProjectChild = safeRemoteProjectChild;
exports.isSafeRuntimePath = isSafeRuntimePath;
function normalizeRemotePath(value) {
    return String(value || "").replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/$/, "");
}
function safeRemoteProjectChild(projectDir, child) {
    const root = normalizeRemotePath(projectDir);
    const full = normalizeRemotePath(child.startsWith("/") ? child : `${root}/${child}`);
    if (!root || root === "/" || root === "~")
        throw new Error("invalid projectDir");
    if (full !== root && !full.startsWith(`${root}/`))
        throw new Error(`remote path escapes projectDir: ${child}`);
    if (["/", "/home", "/data", "/mnt", "work_dirs", "zlk_cluster"].includes(full))
        throw new Error(`unsafe remote path: ${full}`);
    return full;
}
function isSafeRuntimePath(projectDir, remotePath) {
    try {
        const full = safeRemoteProjectChild(projectDir, remotePath);
        return /\/zlk_cluster\/runtime\/[^/]+$/.test(full) || /\/zlk_cluster\/runtime\/backups\/[^/]+\/[^/]+$/.test(full);
    }
    catch {
        return false;
    }
}
