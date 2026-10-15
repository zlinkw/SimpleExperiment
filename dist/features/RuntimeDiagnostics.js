"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtimeEvidence = runtimeEvidence;
exports.completionState = completionState;
exports.completionLabel = completionLabel;
function runtimeEvidence(value, commandId) {
    const row = value;
    if (!commandId || row?.schemaVersion !== 1 || row.commandId !== commandId || row.runId !== commandId
        || !Number.isSafeInteger(row.count) || row.count < 0
        || !["clear", "anomalous", "unverified", "scanning"].includes(row.state)
        || row.state === "clear" && (!row.scanComplete || row.count !== 0))
        return { schemaVersion: 1, commandId, runId: commandId, state: "unverified", count: 0,
            scanComplete: false, reason: "尚无本次执行的完整日志分析证据" };
    return row;
}
function completionState(value, commandId) {
    const evidence = runtimeEvidence(value, commandId);
    return evidence.count > 0 || evidence.state === "anomalous" ? "review_required"
        : evidence.state === "clear" && evidence.scanComplete ? "verified" : "unverified";
}
function completionLabel(value, commandId) {
    return { verified: "已完成", review_required: "完成但有异常，待复核", unverified: "产物完整，运行日志待核实" }[completionState(value, commandId)];
}
