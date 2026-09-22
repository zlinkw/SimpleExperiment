"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serverCommand = serverCommand;
const api_1 = require("../api");
const errors_1 = require("../errors");
const format_1 = require("../format");
async function serverCommand(action, _rest, flags) {
    if (action !== "list")
        throw (0, errors_1.usageError)(`unknown server action: ${action || "(missing)"}`);
    const [status, gpu, config] = await Promise.all([
        (0, api_1.optionalApi)("status"),
        (0, api_1.optionalApi)("gpu.list"),
        (0, api_1.optionalApi)("config.list"),
    ]);
    const rows = collectServers(status, gpu, config);
    if (flags.json) {
        (0, format_1.writeJson)(rows, flags.compactJson);
        return 0;
    }
    (0, format_1.writeText)((0, format_1.table)(["id", "online", "ssh", "gpu"], rows));
    return 0;
}
function collectServers(status, gpu, config) {
    const byId = new Map();
    const upsert = (id, patch) => {
        if (!id)
            return;
        const prev = byId.get(id) || { id, online: "unknown", ssh: "unknown", gpu: "unknown" };
        byId.set(id, { ...prev, ...patch, id });
    };
    const statusRecord = asRecord(status);
    const topology = asRecord(statusRecord.topology);
    for (const item of arrayOf(topology.workers || topology.endpoints || topology.servers)) {
        const record = asRecord(item);
        upsert(String(record.id || record.displayName || ""), {
            online: String(record.online ?? record.reachable ?? record.status ?? "unknown"),
        });
    }
    const gpuRecord = asRecord(asRecord(gpu).gpu || gpu);
    for (const [id, value] of Object.entries(gpuRecord)) {
        if (["source", "gpuHistory"].includes(id))
            continue;
        const gpus = Array.isArray(value) ? value : asRecord(value).gpus;
        const count = Array.isArray(gpus) ? gpus.length : (value ? 1 : 0);
        upsert(id, { gpu: count ? `${count}` : "unknown", online: count ? "online" : "unknown" });
    }
    const configRecord = asRecord(config);
    for (const item of arrayOf(configRecord.servers || configRecord.workerTunnels || configRecord.values)) {
        const record = asRecord(item);
        const id = String(record.id || record.key || record.displayName || "");
        upsert(id, {
            ssh: String(record.sshConfigAlias || record.savedSessionPath || record.host || record.ssh || "configured"),
        });
    }
    if (!byId.size) {
        upsert("local", { online: status ? "online" : "offline", ssh: "n/a", gpu: "unknown" });
    }
    return Array.from(byId.values());
}
function arrayOf(value) {
    return Array.isArray(value) ? value : [];
}
function asRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
