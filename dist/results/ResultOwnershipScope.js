"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resultPlanPath = resultPlanPath;
exports.scopeResultSummary = scopeResultSummary;
exports.scopeResultOperation = scopeResultOperation;
const object = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const records = ["results", "finalResults", "final_results", "pendingReviewRecords", "pending_review_records"];
const datasets = ["datasetResultTables", "projectDatasetTables", "paperDatasetTables"];
const links = ["payload", "latestEvent", "contractReport"];
function resultPlanPath(value) {
    if (typeof value !== "string" || !value || value === "-" || /[\x00-\x1f\x7f]/.test(value))
        return "";
    const path = value.replace(/\\/g, "/").replace(/^\.\//, "");
    return path.startsWith("/") || /^[A-Za-z]:/.test(path) || path.split("/").some(p => !p || p === "." || p === "..") ? "" : path;
}
const key = (value) => process.platform === "win32" ? value.toLowerCase() : value;
function alias(row, keys, ownerKey, plan) {
    const owners = [row];
    if (row[ownerKey] != null) {
        if (!object(row[ownerKey]))
            throw Error("Invalid receipt owner");
        owners.push(row[ownerKey]);
    }
    const values = [];
    for (const owner of owners)
        for (const name of keys) {
            const value = owner[name];
            if (value === undefined || value === "")
                continue;
            if (typeof value !== "string" || value === "-" || /[\x00-\x1f\x7f]/.test(value))
                throw Error("Invalid receipt identity");
            const normalized = plan ? resultPlanPath(value) : value;
            if (!normalized)
                throw Error("Invalid receipt path");
            values.push(plan ? key(normalized) : normalized);
        }
    if (new Set(values).size > 1)
        throw Error("Conflicting receipt aliases");
    return values[0] || "";
}
/** Exact ownership scopes viewing/temporary reads; it does not modify results or manifests. */
function scopeResultSummary(summary, selectedPlan) {
    if (!object(summary))
        return summary;
    const plan = resultPlanPath(selectedPlan);
    const empty = () => ({ schemaVersion: summary.schemaVersion || 1, planFile: plan, resultCount: 0, parsedResults: 0, finalResultCount: 0, pendingReviewCount: 0,
        results: [], finalResults: [], final_results: [], pendingReviewRecords: [], pending_review_records: [], workerResultTables: [], sources: [], resultScopeSuppressed: true,
        message: "摘要缺少当前 PLAN 的唯一归属；已隐藏混合或匿名产物，请按当前 PLAN 重新汇总。" });
    if (!plan)
        return empty();
    try {
        const identity = (r) => alias(r, ["planFile", "plan_file"], "provenance", true);
        const root = identity(summary);
        if (root && root !== key(plan))
            return empty();
        const rootOwned = root === key(plan), owned = (r, inherit) => {
            if (!object(r))
                return false;
            try {
                const id = identity(r);
                return id ? id === key(plan) : inherit;
            }
            catch {
                return false;
            }
        };
        let changed = !rootOwned;
        const arrays = {};
        for (const name of [...records, ...datasets]) {
            if (summary[name] === undefined)
                continue;
            arrays[name] = Array.isArray(summary[name]) ? summary[name].filter((r) => owned(r, rootOwned)) : [];
            changed ||= !Array.isArray(summary[name]) || arrays[name].length !== summary[name].length;
        }
        if (summary.workerResultTables !== undefined) {
            arrays.workerResultTables = Array.isArray(summary.workerResultTables) ? summary.workerResultTables.filter((r) => owned(r, rootOwned)
                && datasets.every(name => r[name] === undefined || Array.isArray(r[name]) && r[name].every((child) => owned(child, true)))
                && (r.completedJob == null || owned(r.completedJob, true))) : [];
            changed ||= !Array.isArray(summary.workerResultTables) || arrays.workerResultTables.length !== summary.workerResultTables.length;
        }
        for (const name of ["claimEvidence", "claim_evidence"])
            if (summary[name] !== undefined && (!owned(summary[name], rootOwned)
                || ["claims", "preview", "catalog"].some(k => Array.isArray(summary[name][k]) && !summary[name][k].every((r) => !object(r) || owned(r, true)))))
                changed = true;
        if (!changed)
            return summary;
        const out = { ...empty(), ...arrays };
        for (const name of ["planRevision", "plan_revision", "generatedAt", "generated_at", "lastParsedAt", "last_parsed_at", "completedRunId"])
            if (rootOwned && summary[name] !== undefined)
                out[name] = summary[name];
        const rows = arrays.results || [...(arrays.finalResults || arrays.final_results || []), ...(arrays.pendingReviewRecords || arrays.pending_review_records || [])];
        out.results = rows;
        out.resultCount = out.parsedResults = rows.length;
        out.finalResults = rows.filter((r) => String(r.finalEvidenceState || r.final_evidence_state || "").toLowerCase() === "archived");
        out.pendingReviewRecords = rows.filter((r) => !out.finalResults.includes(r));
        out.final_results = out.finalResults;
        out.pending_review_records = out.pendingReviewRecords;
        out.finalResultCount = out.finalResults.length;
        out.pendingReviewCount = out.pendingReviewRecords.length;
        return out;
    }
    catch {
        return empty();
    }
}
function scopeResultOperation(row, selectedPlan) {
    const empty = { payloads: [], contractCheck: false }, plan = resultPlanPath(selectedPlan);
    if (!object(row) || !plan)
        return empty;
    try {
        const payloads = [], revisions = new Set(), active = new Set();
        let nodes = 0, contractCheck = false;
        const planKeys = ["planFile", "plan_file", "plan", "selectedPlanId", "selected_plan_id"], revKeys = ["planRevision", "plan_revision"];
        function visit(item, inherited, contract, depth) {
            if (++nodes > 64 || depth > 8 || active.has(item))
                throw Error("Invalid receipt tree");
            active.add(item);
            const id = alias(item, planKeys, "options", true);
            if (id && id !== key(plan))
                throw Error("Foreign receipt PLAN");
            const owned = Boolean(id || inherited), check = contract || [item.type, item.action].some(v => typeof v === "string" && v.toLowerCase() === "check-output-contract");
            if (owned) {
                const revision = alias(item, revKeys, "options", false);
                if (revision)
                    revisions.add(revision);
                for (const entry of Array.isArray(item.unparseable) ? item.unparseable : [])
                    if (object(entry)) {
                        const entryPlan = alias(entry, planKeys, "options", true);
                        if (entryPlan && entryPlan !== key(plan))
                            throw Error("Foreign result entry");
                        const entryRev = alias(entry, revKeys, "options", false);
                        if (entryRev)
                            revisions.add(entryRev);
                    }
                const copy = { ...item, planFile: plan };
                for (const name of [...links, "options"])
                    delete copy[name];
                if (revision)
                    copy.planRevision = revision;
                payloads.push(copy);
                contractCheck ||= check;
            }
            let descendantOwned = owned;
            for (const name of links)
                if (item[name] != null) {
                    if (!object(item[name]))
                        throw Error("Invalid receipt wrapper");
                    descendantOwned = visit(item[name], owned, check || name === "contractReport", depth + 1) || descendantOwned;
                }
            if (descendantOwned)
                contractCheck ||= check;
            active.delete(item);
            return descendantOwned;
        }
        visit(row, false, false, 0);
        return revisions.size > 1 ? empty : { payloads, contractCheck };
    }
    catch {
        return empty;
    }
}
