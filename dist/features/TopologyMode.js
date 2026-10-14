"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOPOLOGY_MODES = void 0;
exports.normalizeTopologyMode = normalizeTopologyMode;
exports.assessProjectTopology = assessProjectTopology;
exports.topologyIssues = topologyIssues;
exports.TOPOLOGY_MODES = ["worker_pool"];
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
    if (!mode || ["worker_pool", "single_worker", "hub_worker"].includes(mode) || TOPOLOGY_ALIASES[mode.toLowerCase()])
        return "worker_pool";
    return undefined;
}
function assessProjectTopology(configuredMode, inventory) {
    const rawMode = String(configuredMode || "").trim();
    const explicitMode = normalizeTopologyMode(rawMode);
    const workerCount = topologyWorkerCount(inventory);
    const hubConfigured = false;
    if (inventory.enabledWorkerIds && new Set(inventory.enabledWorkerIds.filter(Boolean)).size !== inventory.enabledWorkerIds.filter(Boolean).length)
        return assessment("worker_pool", "explicit", workerCount, false, ["Worker 标识重复，请为每台服务器设置不同的标识。"]);
    if (rawMode && !explicitMode) {
        return assessment(undefined, "invalid", workerCount, false, [`不支持的拓扑模式：${rawMode}`]);
    }
    if (explicitMode) {
        return assessment("worker_pool", "explicit", workerCount, false, topologyIssues("worker_pool", false, workerCount));
    }
    return assessment("worker_pool", "explicit", workerCount, false, topologyIssues("worker_pool", false, workerCount));
}
function topologyIssues(mode, hubConfigured, workerCount) {
    return workerCount < 1 ? ["尚无启用的 Worker；请先配置执行服务器。"] : [];
}
function topologyWorkerCount(inventory) {
    if (Array.isArray(inventory.enabledWorkerIds)) {
        return new Set(inventory.enabledWorkerIds.map((value) => String(value || "").trim()).filter(Boolean)).size;
    }
    const count = Number(inventory.enabledWorkerCount || 0);
    return Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0;
}
function assessment(mode, source, workerCount, hubConfigured, issues) {
    const hubAllowed = false;
    const schedulerOwner = "各 Worker 独立调度";
    const stateOwner = "Worker 本机项目目录";
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
