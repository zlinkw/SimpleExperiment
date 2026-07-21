"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redactTunnelDiagnostics = redactTunnelDiagnostics;
function redactTunnelDiagnostics(value) {
    return redact(value);
}
function redact(value) {
    if (Array.isArray(value))
        return value.map(redact);
    if (!value || typeof value !== "object")
        return value;
    const out = {};
    for (const [key, item] of Object.entries(value)) {
        if (/token|nonce|authorization|password|passphrase/i.test(key))
            out[key] = "<redacted>";
        else if (/privateKeyPath/i.test(key))
            out[key] = basename(String(item));
        else
            out[key] = redact(item);
    }
    return out;
}
function basename(value) {
    return value.replace(/\\/g, "/").split("/").pop() || value;
}
