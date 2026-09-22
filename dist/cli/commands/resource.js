"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resourceCommand = resourceCommand;
exports.availableResources = availableResources;
const api_1 = require("../api");
const errors_1 = require("../errors");
const format_1 = require("../format");
const experiment_1 = require("./experiment");
async function resourceCommand(action, _rest, flags) {
    if (action !== "available")
        throw (0, errors_1.usageError)(`unknown resource action: ${action || "(missing)"}`);
    const [snapshot, experiments] = await Promise.all([
        (0, api_1.optionalApi)("gpu.list"),
        (0, experiment_1.loadExperiments)().catch(() => []),
    ]);
    const busy = new Set(experiments.filter((row) => row.status === "running" && row.worker_id).map((row) => row.worker_id));
    const rows = availableResources(snapshot, busy);
    if (flags.json)
        (0, format_1.writeJson)(rows, flags.compactJson);
    else
        (0, format_1.writeText)((0, format_1.table)(["server", "gpu", "available", "reason"], rows));
    return 0;
}
function availableResources(snapshot, busyWorkers) {
    const root = asRecord(asRecord(snapshot).gpu || snapshot);
    const rows = [];
    for (const [serverId, value] of Object.entries(root)) {
        if (["source", "gpuHistory"].includes(serverId))
            continue;
        const gpus = gpuRecords(value);
        for (const gpu of gpus) {
            const id = String(gpu.index ?? gpu.gpu_index ?? gpu.id ?? "");
            const utilization = finiteNumber(gpu.utilizationPercent ?? gpu.utilization ?? gpu.gpuUtilPercent);
            const processes = Array.isArray(gpu.processes) ? gpu.processes.length : finiteNumber(gpu.processCount);
            const workerBusy = busyWorkers.has(serverId) || busyWorkers.has(String(gpu.workerId || ""));
            let available = "unknown";
            let reason = "utilization_unknown";
            if (processes !== null && processes > 0) {
                available = "false";
                reason = "process_present";
            }
            else if (workerBusy && id === "") {
                available = "false";
                reason = "worker_running";
            }
            else if (utilization !== null) {
                available = utilization < 5 && (processes === null || processes === 0) ? "true" : "false";
                reason = utilization < 5 ? "utilization_below_5" : "utilization_in_use";
            }
            else if (processes === 0 && !workerBusy) {
                available = "true";
                reason = "no_process";
            }
            rows.push({ server: String(gpu.workerId || serverId), gpu: id, available, reason, utilization: utilization === null ? "" : utilization });
        }
    }
    return rows;
}
function gpuRecords(value) {
    if (Array.isArray(value))
        return value.map(asRecord);
    const record = asRecord(value);
    if (Array.isArray(record.gpus))
        return record.gpus.map(asRecord);
    if (record.index !== undefined || record.gpu_index !== undefined || record.utilizationPercent !== undefined)
        return [record];
    return [];
}
function finiteNumber(value) {
    const numeric = typeof value === "number" ? value : (typeof value === "string" && value.trim() ? Number(value) : NaN);
    return Number.isFinite(numeric) ? numeric : null;
}
function asRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
