"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOPOLOGY_MODES = void 0;
exports.normalizeTopologyMode = normalizeTopologyMode;
exports.assessProjectTopology = assessProjectTopology;
exports.topologyIssues = topologyIssues;
exports.TOPOLOGY_MODES = ["single_worker", "worker_pool", "hub_worker"];
const TOPOLOGY_ALIASES = {
    standalone: "single_worker",
    "single-worker": "single_worker",
    single: "single_worker",
    worker_only: "worker_pool",
    workeronly: "worker_pool",
    "worker-only": "worker_pool",
    multi_worker: "worker_pool",
    workers: "worker_pool",
    hub_available: "hub_worker",
    "hub-available": "hub_worker",
    hub: "hub_worker",
};
function normalizeTopologyMode(value) {
    const mode = String(value || "").trim();
    if (exports.TOPOLOGY_MODES.includes(mode))
        return mode;
    return TOPOLOGY_ALIASES[mode.toLowerCase()];
}
function assessProjectTopology(configuredMode, inventory) {
    const rawMode = String(configuredMode || "").trim();
    const explicitMode = normalizeTopologyMode(rawMode);
    const workerCount = topologyWorkerCount(inventory);
    const hubConfigured = inventory.hubConfigured === true;
    if (rawMode && !explicitMode) {
        return assessment(undefined, "invalid", workerCount, false, [`不支持的拓扑模式：${rawMode}`]);
    }
    if (explicitMode) {
        return assessment(explicitMode, "explicit", workerCount, hubConfigured, topologyIssues(explicitMode, hubConfigured, workerCount));
    }
    if (hubConfigured && workerCount >= 1) {
        return assessment("hub_worker", "legacy_hub_worker", workerCount, true, []);
    }
    return assessment(undefined, "unconfirmed", workerCount, hubConfigured, [
        workerCount > 0
            ? "仅 Worker 项目需要先明确选择单 Worker或仅多 Worker模式。"
            : "需要先选择拓扑模式并配置对应的 Worker。",
    ]);
}
function topologyIssues(mode, hubConfigured, workerCount) {
    const issues = [];
    if (mode === "single_worker") {
        if (hubConfigured)
            issues.push("单 Worker模式不能启用 Hub。");
        if (workerCount !== 1)
            issues.push(`单 Worker模式需要恰好一台启用的 Worker，当前为 ${workerCount} 台。`);
    }
    else if (mode === "worker_pool") {
        if (hubConfigured)
            issues.push("仅多 Worker模式不能启用 Hub。");
        if (workerCount < 2)
            issues.push(`仅多 Worker模式需要至少两台启用的 Worker，当前为 ${workerCount} 台。`);
    }
    else {
        if (!hubConfigured)
            issues.push("Hub 可用模式需要配置 Hub。");
        if (workerCount < 1)
            issues.push("Hub 可用模式需要至少一台启用的 Worker。");
    }
    return issues;
}
function topologyWorkerCount(inventory) {
    if (Array.isArray(inventory.enabledWorkerIds)) {
        return new Set(inventory.enabledWorkerIds.map((value) => String(value || "").trim()).filter(Boolean)).size;
    }
    const count = Number(inventory.enabledWorkerCount || 0);
    return Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0;
}
function assessment(mode, source, workerCount, hubConfigured, issues) {
    const hubAllowed = mode === "hub_worker";
    const schedulerOwner = mode === "single_worker"
        ? "Worker 本机调度"
        : mode === "worker_pool"
            ? "各 Worker 独立分片调度"
            : mode === "hub_worker"
                ? "Hub 全局调度"
                : "尚未确认";
    const stateOwner = mode === "hub_worker" ? "Hub 汇总索引" : mode ? "Worker 本机项目目录" : "尚未确认";
    return {
        mode,
        source,
        valid: issues.length === 0,
        requiresConfirmation: source === "unconfirmed" || source === "invalid",
        hubAllowed,
        workerCount,
        schedulerOwner,
        stateOwner,
        issues,
    };
}
