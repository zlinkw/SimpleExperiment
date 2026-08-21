"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectAgentRuntimeTargets = selectAgentRuntimeTargets;
function selectAgentRuntimeTargets(targets, serverIds = []) {
    const requested = (Array.isArray(serverIds) ? serverIds : [])
        .map((value) => String(value ?? "").trim().toLowerCase())
        .filter(Boolean);
    if (!requested.length)
        return [...targets];
    const selected = targets.filter((target) => {
        const identities = [target.id, target.label, target.displayName]
            .map((value) => String(value ?? "").trim().toLowerCase())
            .filter(Boolean);
        return identities.some((identity) => requested.includes(identity));
    });
    if (!selected.length) {
        throw new Error(`Agent runtime 部署范围没有匹配目标：${requested.join("、")}。`);
    }
    return selected;
}
