"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSafeRemotePath = isSafeRemotePath;
exports.makeTransferId = makeTransferId;
function isSafeRemotePath(remotePath) {
    const normalized = remotePath.replace(/\\/g, "/").trim();
    if (!normalized || normalized.includes("\0"))
        return false;
    if (normalized.startsWith("/") || /^[A-Za-z]:/.test(normalized))
        return false;
    if (normalized.split("/").some((part) => part === ".."))
        return false;
    if (normalized.split("/").some((part) => /^(id_rsa|id_ed25519|known_hosts|\.ssh)$/i.test(part) || /\.pem$/i.test(part)))
        return false;
    return /^(zlk_cluster|work_dirs|experiments|exports|results|paper)(\/|$)/.test(normalized);
}
function makeTransferId(prefix = "transfer") {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
