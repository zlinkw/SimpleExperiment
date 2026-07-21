"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AGENT_PROTOCOL_VERSION = exports.AGENT_SCHEMA_VERSION = void 0;
exports.validateAgentEvent = validateAgentEvent;
exports.AGENT_SCHEMA_VERSION = 1;
exports.AGENT_PROTOCOL_VERSION = "0.2.0";
const knownTypes = new Set([
    "agent_heartbeat",
    "gpu_snapshot",
    "scheduler_snapshot",
    "experiment_traces",
    "log_tail",
    "worker_health",
    "worker_error",
    "sync_status",
    "agent_warning",
    "agent_error",
]);
function validateAgentEvent(value) {
    const event = typeof value === "string" ? parseJson(value) : value;
    if (!event || typeof event !== "object")
        return { ok: false, code: "bad_json", message: "event is not json object" };
    const item = event;
    if (Number(item.schemaVersion) !== exports.AGENT_SCHEMA_VERSION) {
        return { ok: false, code: "incompatible_schema", message: `unsupported schemaVersion=${item.schemaVersion}`, event: item };
    }
    if (!Number.isFinite(Number(item.seq)) || !item.type || !item.generatedAt || item.source !== "hub_agent") {
        return { ok: false, code: "bad_schema", message: "missing required event fields", event: item };
    }
    if (!knownTypes.has(item.type))
        return { ok: false, code: "unknown_type", message: `unknown event type=${item.type}`, event: item };
    return { ok: true, event: item };
}
function parseJson(text) {
    try {
        return JSON.parse(text);
    }
    catch {
        return undefined;
    }
}
