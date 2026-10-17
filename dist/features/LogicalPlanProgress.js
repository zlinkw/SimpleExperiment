"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.composeLogicalPlans = composeLogicalPlans;
/** Read-only composition. Never persist this view or use its anchor as a job's control identity.
 * Self-contained so the webview and host execute precisely the same cohort rules. */
function composeLogicalPlans(plans) {
    const key = (value) => String(value || "").replaceAll(String.fromCharCode(92), "/").toLowerCase();
    const groups = new Map();
    for (const plan of plans || []) {
        const identity = JSON.stringify([String(plan.projectId || ""), key(plan.planFile)]);
        const rows = groups.get(identity) || [];
        rows.push(plan);
        groups.set(identity, rows);
    }
    return [...groups.values()].map(rows => {
        rows.sort((a, b) => String(a.enqueuedAt || "").localeCompare(String(b.enqueuedAt || "")));
        const latest = rows[rows.length - 1];
        const expected = Number(latest.fullPlanJobCount);
        if (!latest.projectId || !latest.revision || !Number.isInteger(expected) || expected <= 0)
            return latest;
        let start = rows.length - 1;
        while (start > 0 && Number(rows[start].planJobCount) < expected) {
            const previous = rows[start - 1];
            if (previous.revision !== latest.revision || Number(previous.fullPlanJobCount) !== expected
                || !previous.enqueuedAt || !rows[start].enqueuedAt || previous.enqueuedAt === rows[start].enqueuedAt)
                break;
            start--;
        }
        if (start === rows.length - 1)
            return latest;
        const slots = new Map();
        let conflict = false;
        for (const plan of rows.slice(start)) {
            if (plan.recoveryConflict)
                conflict = true;
            const indices = new Set();
            for (const job of plan.jobs || []) {
                const previous = slots.get(job.index);
                const identity = (row) => JSON.stringify([row.index, row.case, row.seed, row.outputDir, row.collectionResultCsv || ""]);
                if (!Number.isInteger(job.index) || job.index < 0 || job.index >= expected || !job.case || !job.outputDir
                    || indices.has(job.index) || previous && identity(previous) !== identity(job))
                    conflict = true;
                indices.add(job.index);
                slots.set(job.index, { ...job, sourcePlanId: plan.id, planId: plan.id, enqueuedAt: plan.enqueuedAt,
                    sourceRevision: plan.revision, sourceCodeFingerprint: plan.codeFingerprint });
            }
        }
        const jobs = [...slots.values()].sort((a, b) => a.index - b.index);
        if (new Set(jobs.map(job => JSON.stringify([job.case, job.seed]))).size !== jobs.length)
            conflict = true;
        return { ...latest, jobs, planJobCount: expected, recoveryMissingCount: Math.max(0, expected - jobs.length),
            recoveryConflict: conflict, logicalMerged: true,
            mixedVersions: new Set(jobs.map(job => job.sourceCodeFingerprint).filter(Boolean)).size > 1 };
    });
}
