"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.archiveStatusRank = exports.runStatusRank = void 0;
exports.mergeByStableKey = mergeByStableKey;
exports.mergeArchiveEndpointState = mergeArchiveEndpointState;
exports.experimentTraceKey = experimentTraceKey;
exports.mergeExperimentTracesStable = mergeExperimentTracesStable;
exports.schedulerRowStatusRank = schedulerRowStatusRank;
function mergeByStableKey(previous, incoming, keyOf, mergeOne) {
    const order = [];
    const map = new Map();
    for (const item of previous || []) {
        const key = keyOf(item);
        if (!key)
            continue;
        if (!map.has(key))
            order.push(key);
        map.set(key, item);
    }
    for (const item of incoming || []) {
        const key = keyOf(item);
        if (!key)
            continue;
        if (!map.has(key))
            order.push(key);
        map.set(key, mergeOne(map.get(key), item));
    }
    return order.map((key) => map.get(key)).filter((item) => Boolean(item));
}
exports.runStatusRank = {
    unknown: 0,
    queued: 1,
    pending: 1,
    scheduling: 2,
    running: 3,
    testing: 4,
    completed: 5,
    failed: 6,
    stopped: 6,
};
exports.archiveStatusRank = {
    unknown: 0,
    not_archived: 1,
    archived: 2,
    delete_requested: 3,
    deleting: 4,
    delete_failed: 5,
    deleted: 6,
};
function mergeArchiveEndpointState(prev, next) {
    if (!prev)
        return next;
    const merged = { ...prev, ...next };
    for (const key of ["local_archive_state", "hub_archive_state", "worker_archive_state", "artifact_state"]) {
        const prevValue = String(prev[key] || "unknown");
        const nextValue = String(next[key] || "unknown");
        if ((exports.archiveStatusRank[prevValue] ?? 0) > (exports.archiveStatusRank[nextValue] ?? 0))
            merged[key] = prev[key];
    }
    if (String(prev.archive_status_text || "").includes("3") && String(next.hub_archive_state || "unknown") === "unknown") {
        merged.hub_archive_state = prev.hub_archive_state;
        merged.archive_status_text = prev.archive_status_text;
    }
    return merged;
}
function experimentTraceKey(row) {
    return String(row.archive_key || row.global_job_id || row.run_id || "") + "|" + String(row.hub_job_dir || row.worker_job_dir || row.native_job_dir || "");
}
function mergeExperimentTracesStable(previous, incoming) {
    return mergeByStableKey(previous, incoming, experimentTraceKey, mergeArchiveEndpointState);
}
function schedulerRowStatusRank(value) {
    const text = String(value || "unknown").toLowerCase();
    if (/fail|error|失败/.test(text))
        return exports.runStatusRank.failed;
    if (/stop|中止|停止/.test(text))
        return exports.runStatusRank.stopped;
    if (/complete|done|完成/.test(text))
        return exports.runStatusRank.completed;
    if (/test|测试/.test(text))
        return exports.runStatusRank.testing;
    if (/run|训练|运行/.test(text))
        return exports.runStatusRank.running;
    if (/sched|派发/.test(text))
        return exports.runStatusRank.scheduling;
    if (/queue|pending|等待/.test(text))
        return exports.runStatusRank.queued;
    return exports.runStatusRank.unknown;
}
