"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkpointRecordsFromManifest = checkpointRecordsFromManifest;
const CHECKPOINT_TRUE_TOKENS = new Set(["1", "true", "yes", "on", "paper_ready"]);
function checkpointRecordsFromManifest(value) {
    const records = [];
    const visit = (node, inherited = {}) => {
        if (!node)
            return;
        if (Array.isArray(node)) {
            node.forEach((item) => visit(item, inherited));
            return;
        }
        if (typeof node !== "object")
            return;
        const record = node;
        const path = firstText(record, ["path", "file", "checkpoint", "checkpointPath", "checkpoint_path", "relativePath", "relative_path"]);
        const nextInherited = {
            ...inherited,
            runId: firstText(record, ["runId", "run_id", "runKey", "run_key"]) || inherited.runId,
            resultId: firstText(record, ["resultId", "result_id", "experimentId", "experiment_id"]) || inherited.resultId,
            status: firstText(record, ["status", "state"]) || inherited.status,
        };
        if (path) {
            records.push({
                ...nextInherited,
                path,
                type: firstText(record, ["type", "kind", "checkpointType", "checkpoint_type"]) || inherited.type,
                score: finiteNumber(record.score ?? record.metric ?? record.value ?? record.bestScore ?? record.best_score),
                epoch: finiteNumber(record.epoch ?? record.step),
                createdAt: firstText(record, ["createdAt", "created_at", "mtime", "updatedAt", "updated_at"]),
                updatedAt: firstText(record, ["updatedAt", "updated_at", "mtime"]),
                paperReady: boolValue(record.paperReady ?? record.paper_ready),
                frozen: boolValue(record.frozen),
                size: finiteNumber(record.size),
            });
        }
        for (const key of ["checkpoints", "files", "artifacts", "targets", "runs", "items"])
            visit(record[key], nextInherited);
    };
    visit(value);
    return dedupeCheckpoints(records);
}
function dedupeCheckpoints(rows) {
    const map = new Map();
    rows.filter((row) => row.path).forEach((row) => map.set(row.path.replace(/\\/g, "/"), row));
    return Array.from(map.values());
}
function firstText(record, keys) {
    for (const key of keys) {
        const value = record[key];
        if (value !== undefined && value !== null && String(value).trim())
            return String(value).trim();
    }
    return "";
}
function finiteNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
}
function boolValue(value) {
    if (value === undefined || value === null || value === "")
        return undefined;
    if (typeof value === "boolean")
        return value;
    return CHECKPOINT_TRUE_TOKENS.has(String(value).toLowerCase());
}
