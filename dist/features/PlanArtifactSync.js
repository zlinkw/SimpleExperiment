"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emptyPlanSyncLedger = void 0;
exports.migratePlanSyncLedger = migratePlanSyncLedger;
exports.safePlanArtifactPath = safePlanArtifactPath;
exports.planArtifactPaths = planArtifactPaths;
exports.planArtifactDirectories = planArtifactDirectories;
exports.planSyncKey = planSyncKey;
exports.queuePlanSync = queuePlanSync;
exports.markPlanSyncComplete = markPlanSyncComplete;
exports.pendingPlanSyncs = pendingPlanSyncs;
const emptyPlanSyncLedger = () => ({ schemaVersion: 2, entries: {} });
exports.emptyPlanSyncLedger = emptyPlanSyncLedger;
function migratePlanSyncLedger(value) {
    if (!value || !value.entries || typeof value.entries !== "object" || Array.isArray(value.entries))
        throw new Error("Plan 同步记录格式无效。");
    if (value.schemaVersion === 2)
        return value;
    if (value.schemaVersion !== 1)
        throw new Error("Plan 同步记录版本不受支持。");
    return { schemaVersion: 2, entries: Object.fromEntries(Object.entries(value.entries).map(([key, raw]) => {
            const entry = raw;
            return [key, { ...entry, destinations: Object.fromEntries(Object.keys(entry.destinations || {}).map((id) => [id, { status: "pending" }])) }];
        })) };
}
function safePlanArtifactPath(value) {
    const normalized = String(value || "").trim().replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+$/, "");
    if (!normalized || normalized.startsWith("/") || /^[A-Za-z]:/.test(normalized) || /[{}*?\[\]]/.test(normalized))
        return undefined;
    if (normalized.split("/").some((part) => !part || part === "." || part === ".."))
        return undefined;
    return normalized;
}
function planArtifactPaths(plan, summary, sourceWorkerId) {
    const paths = new Set();
    const add = (value) => { const safe = safePlanArtifactPath(value); if (safe)
        paths.add(safe); };
    for (const signal of Array.isArray(plan?.outputSignals) ? plan.outputSignals : []) {
        const match = /^结果目录\s*[:：]\s*(.+)$/.exec(String(signal));
        if (match)
            add(match[1]);
    }
    for (const candidate of Array.isArray(plan?.outputCandidates) ? plan.outputCandidates : []) {
        const safe = safePlanArtifactPath(candidate);
        if (safe?.includes("/"))
            paths.add(safe);
    }
    for (const table of Array.isArray(summary?.workerResultTables) ? summary.workerResultTables : []) {
        if (String(table?.workerId || "").toLowerCase() !== sourceWorkerId.toLowerCase())
            continue;
        for (const key of ["rawResultCsvPath", "aggregateCsvPath", "projectAggregateCsvPath", "finalCsvPath", "projectFinalCsvPath"])
            add(table?.[key]);
    }
    const directories = planArtifactDirectories(plan);
    return [...paths].filter((value) => !directories.some((directory) => value !== directory && value.startsWith(`${directory}/`))).sort();
}
function planArtifactDirectories(plan) {
    return (Array.isArray(plan?.outputSignals) ? plan.outputSignals : []).flatMap((signal) => {
        const match = /^结果目录\s*[:：]\s*(.+)$/.exec(String(signal));
        const safe = match ? safePlanArtifactPath(match[1]) : undefined;
        return safe ? [safe] : [];
    });
}
function planSyncKey(planFile, revision, sourceWorkerId, runId = "historic") {
    return [planFile.replace(/\\/g, "/"), revision, sourceWorkerId.toLowerCase(), runId].join("|");
}
function queuePlanSync(ledger, planFile, revision, sourceWorkerId, artifactPaths, destinationWorkerIds, directoryPaths = [], runId = "historic") {
    const key = planSyncKey(planFile, revision, sourceWorkerId, runId);
    const previous = ledger.entries[key];
    const latestPrior = Object.entries(ledger.entries).filter(([otherKey, entry]) => otherKey !== key && entry.planFile === planFile && entry.sourceWorkerId.toLowerCase() === sourceWorkerId.toLowerCase() && entry.runId !== "historic").at(-1)?.[1];
    const stalePaths = previous?.stalePaths || (latestPrior ? [...new Map([
            ...(latestPrior.stalePaths || []),
            ...latestPrior.artifactPaths.filter((oldPath) => !artifactPaths.includes(oldPath))
                .map((oldPath) => ({ path: oldPath, directory: latestPrior.directoryPaths.includes(oldPath) })),
        ].filter((item) => !artifactPaths.some((next) => next === item.path || item.path.startsWith(`${next}/`)))
            .map((item) => [item.path, item])).values()] : []);
    const newArtifacts = artifactPaths.some((path) => !previous?.artifactPaths.includes(path));
    const destinations = Object.fromEntries(Object.entries(previous?.destinations || {}).map(([id, value]) => [id, newArtifacts ? { status: "pending" } : value]));
    for (const id of destinationWorkerIds) {
        if (id.toLowerCase() !== sourceWorkerId.toLowerCase() && !destinations[id])
            destinations[id] = { status: "pending" };
    }
    return { schemaVersion: 2, entries: { ...ledger.entries, [key]: {
                planFile,
                revision,
                runId,
                sourceWorkerId,
                artifactPaths: [...new Set([...(previous?.artifactPaths || []), ...artifactPaths])].sort(),
                directoryPaths: [...new Set([...(previous?.directoryPaths || []), ...directoryPaths])].sort(),
                stalePaths,
                destinations,
            } } };
}
function markPlanSyncComplete(ledger, key, destinationWorkerId, syncedAt) {
    const entry = ledger.entries[key];
    if (!entry || !entry.destinations[destinationWorkerId])
        throw new Error("待同步记录不存在。");
    return { schemaVersion: 2, entries: { ...ledger.entries, [key]: {
                ...entry,
                destinations: { ...entry.destinations, [destinationWorkerId]: { status: "synced", syncedAt } },
            } } };
}
function pendingPlanSyncs(ledger) {
    const entries = Object.entries(ledger.entries);
    const latest = new Map();
    for (const [key, entry] of entries) {
        const scope = `${entry.planFile}|${entry.sourceWorkerId.toLowerCase()}`;
        if (entry.runId !== "historic" || !latest.has(scope))
            latest.set(scope, key);
    }
    return entries.filter(([key, entry]) => latest.get(`${entry.planFile}|${entry.sourceWorkerId.toLowerCase()}`) === key).flatMap(([key, entry]) => Object.entries(entry.destinations)
        .filter(([, value]) => value.status === "pending")
        .map(([destinationWorkerId]) => ({ key, entry, destinationWorkerId })));
}
