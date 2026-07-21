"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapClusterStoreToWebview = mapClusterStoreToWebview;
exports.redactForDebugBundle = redactForDebugBundle;
const StateSelectors_1 = require("../state/StateSelectors");
function mapClusterStoreToWebview(state) {
    return (0, StateSelectors_1.selectUiState)(state);
}
function redactForDebugBundle(value) {
    if (Array.isArray(value))
        return value.map(redactForDebugBundle);
    if (!value || typeof value !== "object")
        return value;
    const out = {};
    for (const [key, raw] of Object.entries(value)) {
        const lower = key.toLowerCase();
        if (lower.includes("passphrase") || lower.includes("password") || lower.includes("token")) {
            out[key] = "<redacted>";
        }
        else if (lower.includes("identityfile") || lower.includes("privatekey")) {
            const text = String(raw || "");
            out[key] = text ? text.replace(/\\/g, "/").split("/").pop() : "";
        }
        else {
            out[key] = redactForDebugBundle(raw);
        }
    }
    return out;
}
