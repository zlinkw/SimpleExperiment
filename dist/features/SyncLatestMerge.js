"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planLatestWorkerMerge = planLatestWorkerMerge;
/** Plan/manual authority wins; otherwise use a unique newest Worker timestamp. */
function planLatestWorkerMerge(statuses, workerIds, completedSourceId) {
    const ids = [...new Set(workerIds)];
    const items = [];
    const skipped = [];
    const skippedPaths = [];
    for (const [path, status] of Object.entries(statuses).sort(([a], [b]) => a.localeCompare(b))) {
        if (path === "." || status.copies || status.state === "same" || status.detail === "当前同步范围外")
            continue;
        const versions = status.versions || {};
        if (status.unverified || status.state === "unknown" && !(completedSourceId && versions[completedSourceId]?.sha256)) {
            skipped.push(`${path}：版本未校验${status.detail ? `（${status.detail.slice(0, 1024)}）` : ""}`);
            skippedPaths.push({ path, kind: "unverified" });
            continue;
        }
        const choices = ids.filter((id) => versions[id]?.sha256 && ["manual", "plan", "candidate", "same"].includes(versions[id].latest || ""));
        const priority = { manual: 0, plan: 1, candidate: 2, same: 3 };
        choices.sort((a, b) => priority[versions[a].latest] - priority[versions[b].latest] || a.localeCompare(b));
        const sourceId = completedSourceId ? versions[completedSourceId]?.sha256 ? completedSourceId : undefined : choices[0];
        if (!sourceId) {
            skipped.push(`${path}：没有可靠的最新版`);
            skippedPaths.push({ path, kind: "no-latest" });
            continue;
        }
        const sourceHash = versions[sourceId].sha256.toLowerCase();
        const destinationIds = ids.filter((id) => id !== sourceId && versions[id]?.sha256?.toLowerCase() !== sourceHash);
        if (destinationIds.length)
            items.push({ path, sourceId, destinationIds });
    }
    return { items, skipped, skippedPaths };
}
