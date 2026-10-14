"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withoutRetiredOperations = withoutRetiredOperations;
exports.endedPlanOperationIds = endedPlanOperationIds;
/** Small ID fences survive reconnects; discarded progress payloads do not. */
function withoutRetiredOperations(records, retired) {
    return Object.fromEntries(Object.entries(records || {}).filter(([key, row]) => ![key, row?.operationId, row?.opId, row?.id].some(id => typeof id === "string" && retired.has(id))));
}
function endedPlanOperationIds(records, planFile, exclude = new Set()) {
    const normalize = (value) => String(value || "").replace(/\\/g, "/").replace(/^\.\//, "");
    const terminal = new Set(["completed", "failed", "cancelled", "canceled", "succeeded", "stopped"]);
    return Object.entries(records || {}).flatMap(([key, row]) => {
        const id = String(row?.operationId || row?.opId || row?.id || key);
        const payload = row?.payload || row?.latestEvent?.payload || {};
        if (exclude.has(id) || !terminal.has(String(row?.status || row?.state || "").toLowerCase())
            || normalize(row?.planFile || payload.planFile) !== normalize(planFile))
            return [];
        return [id];
    });
}
