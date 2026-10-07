"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statisticsComparisonView = statisticsComparisonView;
exports.comparisonQueueIdentity = comparisonQueueIdentity;
exports.comparisonRuns = comparisonRuns;
exports.comparisonFromSummary = comparisonFromSummary;
exports.selectedComparisonCandidates = selectedComparisonCandidates;
const node_crypto_1 = require("node:crypto");
const PlanOutputRetention_1 = require("../features/PlanOutputRetention");
const PlanRunFreshness_1 = require("./PlanRunFreshness");
const ProjectResultTables_1 = require("./ProjectResultTables");
/** Display only: retain adapter values unchanged, combine means and deviations at four decimals. */
function statisticsComparisonView(table) {
    const pairs = new Map();
    for (const [index, name] of table.header.entries())
        if (name.endsWith("_mean")) {
            const base = name.slice(0, -5);
            const deviation = table.header.findIndex(column => column === base + "_sd" || column === base + "_std");
            if (deviation >= 0)
                pairs.set(index, deviation);
        }
    const omitted = new Set(pairs.values());
    const indices = table.header.map((_name, index) => index).filter(index => !omitted.has(index));
    const decimal = (value) => value === undefined || value === null || !String(value).trim()
        || !Number.isFinite(Number(value)) ? "未计算" : Number(value).toFixed(4);
    return { header: indices.map(index => pairs.has(index) ? table.header[index].slice(0, -5) : table.header[index]),
        rows: table.rows.map(row => indices.map(index => pairs.has(index)
            ? `${decimal(row[index])}±${decimal(row[pairs.get(index)])}` : row[index])) };
}
/** Stable review identity excludes sync receipts and our own retirement marks. */
function comparisonQueueIdentity(queue) {
    return (0, node_crypto_1.createHash)("sha256").update(JSON.stringify((queue.plans || []).map((plan) => [
        plan.id, plan.planFile, plan.codeFingerprint, plan.revision, plan.fullPlanJobCount, plan.enqueuedAt,
        (plan.jobs || []).map((job) => [job.index, job.case, job.seed, job.attempt, job.workerId, job.commandId,
            job.outputDir, job.status, job.recoveryConflict, (job.history || []).map((old) => [old.outputDir, old.status, old.workerId])]),
    ]))).digest("hex");
}
function comparisonRuns(queue, candidates) {
    return (queue.plans || []).filter((plan) => plan.jobs?.some((job) => !job.outputRetiredAt && (0, PlanOutputRetention_1.isAttemptOutputDir)(job.outputDir)))
        .map((plan) => {
        const one = { plans: [plan] };
        const complete = (0, PlanRunFreshness_1.selectLatestCompletePlanRunIdentity)(one, plan.planFile, plan.revision);
        const authority = complete || (0, PlanRunFreshness_1.selectLatestPlanRunPreview)(one, plan.planFile, plan.revision);
        // Do not offer partially retired runs or failed/unknown identities for deletion.
        const eligible = Boolean(plan.codeFingerprint && plan.revision && complete && plan.jobs.every((job) => !job.outputRetiredAt
            && candidates.some(candidate => candidate.planFile === plan.planFile && candidate.outputDir === job.outputDir)));
        return { runId: String(plan.id), planFile: String(plan.planFile), code: String(plan.codeFingerprint || "未知代码身份"),
            revision: String(plan.revision || ""), enqueuedAt: String(plan.enqueuedAt || ""), eligible, authority,
            completed: authority?.jobs.length || 0, expected: Number(plan.fullPlanJobCount || plan.planJobCount || plan.jobs.length) };
    }).sort((a, b) => a.planFile.localeCompare(b.planFile) || b.enqueuedAt.localeCompare(a.enqueuedAt));
}
/** Reuse the existing statistics and lossless wrapper views entirely in memory. */
function comparisonFromSummary(run, summary, adapter = {}) {
    if (!run.authority || !summary?.wrapperEvidence || summary.wrapperEvidence.runId !== run.runId
        || summary.runId !== run.runId || summary.planRevision !== run.revision
        || !["formal", "preview"].includes(summary.wrapperEvidence.status))
        throw new Error("审核结果缺少匹配的运行/配置身份；保留该版本。");
    const preview = run.authority.jobs.length !== run.expected || summary.wrapperEvidence.status === "preview";
    const jobs = summary.wrapperEvidence.jobs || [];
    if (!jobs.length || !preview && jobs.length !== run.expected || jobs.some((item) => {
        const job = item.job;
        return !job || job.runId !== run.runId || !run.authority.jobs.some(expected => expected.index === job.index
            && expected.case === job.case && expected.seed === job.seed && expected.attempt === job.attempt
            && expected.outputDir === job.outputDir && expected.workerId === (job.ownerWorkerId || job.workerId));
    }))
        throw new Error("审核 wrapper 作业身份不匹配；保留该版本。");
    if (!preview && (summary.completedMetricFilesMissing?.length || summary.incompleteAggregate))
        throw new Error("该版本必需产物不完整；保留原始结果。");
    const views = [];
    if (!preview && summary.results?.length) {
        const seeds = new Set(run.authority.jobs.map(job => job.seed)).size;
        const registry = (0, ProjectResultTables_1.updateRegistry)((0, ProjectResultTables_1.emptyTableRegistry)(), summary, run.planFile, seeds, adapter.planDatasetMapping || {});
        registry.derivedMetric = adapter.derivedMetric;
        for (const table of Object.values((0, ProjectResultTables_1.buildTables)(registry))) {
            // A version-local table never borrows records from another run or the live registry.
            views.push({ title: `${table.dataset} / ${table.relativePath}`, ...statisticsComparisonView(table) });
        }
    }
    const declared = new Set(summary.wrapperEvidence.views || []);
    for (const file of summary._wrapperFiles || []) {
        if (!declared.has(file.relativePath))
            continue;
        const contents = String(file.contents);
        if (file.relativePath.endsWith(".csv")) {
            const table = (0, ProjectResultTables_1.readCsv)(contents);
            views.push({ title: file.relativePath, header: table.header, rows: table.rows });
        }
        else
            views.push({ title: file.relativePath, text: contents });
    }
    if (!views.length)
        throw new Error("该版本尚无可核验的 wrapper 结果视图；保留原始结果。");
    const sources = (summary.wrapperEvidence.jobs || []).map((job) => ({ job: job.job, checkpointPath: job.checkpointPath, sources: job.sources }));
    return { runId: run.runId, status: preview ? "preview" : "formal", views, sources };
}
/** Selection is an explicit allow-list; retained, protected and failed runs cannot leak into cleanup. */
function selectedComparisonCandidates(runs, results, selected, candidates) {
    if (!Array.isArray(selected) || !selected.length || new Set(selected).size !== selected.length
        || selected.some(id => typeof id !== "string" || !runs.some(run => run.runId === id && run.eligible)
            || results.get(id)?.status !== "formal"))
        throw new Error("版本选择尚未核验或已失效；未删除任何产物。");
    const dirs = new Set(runs.filter(run => selected.includes(run.runId)).flatMap(run => (run.authority.plan.jobs || []).flatMap((job) => [job.outputDir, ...(job.history || []).map((old) => old.outputDir)])));
    return candidates.filter(candidate => dirs.has(candidate.outputDir));
}
