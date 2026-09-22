"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gpuCommand = gpuCommand;
const api_1 = require("../api");
const errors_1 = require("../errors");
const format_1 = require("../format");
const experiment_1 = require("./experiment");
async function gpuCommand(action, _rest, flags) {
    if (action !== "status")
        throw (0, errors_1.usageError)(`unknown gpu action: ${action || "(missing)"}`);
    const [snapshot, experiments] = await Promise.all([
        (0, api_1.optionalApi)("gpu.list"),
        (0, experiment_1.loadExperiments)().catch(() => []),
    ]);
    const rows = flattenGpus(snapshot, experiments);
    if (flags.json) {
        (0, format_1.writeJson)(rows, flags.compactJson);
        return 0;
    }
    (0, format_1.writeText)((0, format_1.table)(["server", "gpu", "utilization", "memory", "process", "idle"], rows));
    return 0;
}
function flattenGpus(snapshot, experiments) {
    const record = asRecord(snapshot);
    const gpuRoot = record.gpu && typeof record.gpu === "object" ? record.gpu : record;
    const rows = [];
    for (const [serverId, serverValue] of Object.entries(gpuRoot)) {
        if (["source", "gpuHistory"].includes(serverId))
            continue;
        const gpus = extractGpuList(serverValue);
        if (!gpus.length) {
            rows.push({ server: serverId, gpu: "", utilization: "", memory: "", process: "", idle: "" });
            continue;
        }
        for (const gpu of gpus) {
            const index = gpu.index ?? gpu.gpu_index ?? gpu.id ?? "";
            const used = gpu.memoryUsedMb ?? gpu.memory_used_mb ?? gpu.memoryUsed;
            const total = gpu.memoryTotalMb ?? gpu.memory_total_mb ?? gpu.memoryTotal;
            const utilization = gpu.utilizationPercent ?? gpu.utilization ?? gpu.gpuUtilPercent;
            const processes = Array.isArray(gpu.processes) ? gpu.processes : [];
            const processText = processes.map((proc) => {
                const item = asRecord(proc);
                return [item.pid, item.name || item.processName, item.user || item.username].filter(Boolean).join(":");
            }).join("; ");
            const server = String(gpu.workerId || gpu.server || serverId);
            const running = experiments.filter((row) => row.status === "running" && (row.worker_id === server || String(row.gpu?.id || "") === String(index)));
            rows.push({
                server,
                gpu: String(index),
                utilization: utilization === undefined || utilization === null ? "" : String(utilization),
                memory: used !== undefined || total !== undefined ? `${used ?? "?"}/${total ?? "?"}MB` : "",
                process: processText || String(gpu.processCount ?? gpu.processesTotalCount ?? ""),
                task: running.map((row) => row.id).join(","),
                idle: idleSince(gpu, running),
            });
        }
    }
    return rows;
}
function idleSince(gpu, running) {
    const explicit = gpu.idleSeconds ?? gpu.idle_seconds ?? gpu.idleTime ?? gpu.idle_for;
    if (explicit !== undefined && explicit !== null && String(explicit).trim())
        return String(explicit);
    if (running.length)
        return "";
    const seen = Date.parse(String(gpu.updatedAt || gpu.timestamp || ""));
    if (!Number.isFinite(seen))
        return "";
    return String(Math.max(0, Math.round((Date.now() - seen) / 1000)));
}
function extractGpuList(value) {
    if (Array.isArray(value))
        return value.map(asRecord);
    const record = asRecord(value);
    if (Array.isArray(record.gpus))
        return record.gpus.map(asRecord);
    if (record.index !== undefined || record.gpu_index !== undefined)
        return [record];
    return [];
}
function asRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
