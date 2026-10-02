"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.withValidatedPlanJobCounts = withValidatedPlanJobCounts;
exports.plansForOutputSync = plansForOutputSync;
exports.isAttemptOutputDir = isAttemptOutputDir;
exports.outputRetirementCandidates = outputRetirementCandidates;
exports.validateOutputInspection = validateOutputInspection;
exports.retirementIdentity = retirementIdentity;
exports.markOutputsRetired = markOutputsRetired;
exports.retirePlanOutputs = retirePlanOutputs;
const node_crypto_1 = require("node:crypto");
const path = __importStar(require("node:path"));
const DistributedPlanQueue_1 = require("./DistributedPlanQueue");
const PlanRunFreshness_1 = require("../results/PlanRunFreshness");
const terminal = new Set(["completed", "failed", "cancelled"]);
const normalizePlan = (value) => String(value || "").replace(/\\/g, "/").replace(/^\.\//, "").toLowerCase();
const ordered = (plans) => plans.map((plan, index) => ({ plan, index }))
    .sort((a, b) => (Date.parse(a.plan.enqueuedAt) || 0) - (Date.parse(b.plan.enqueuedAt) || 0) || a.index - b.index)
    .map(({ plan }) => plan);
/** Upgrade legacy subset counts only from an exact current revision, without touching the display cache. */
function withValidatedPlanJobCounts(queue, metadata = []) {
    const next = (0, DistributedPlanQueue_1.cloneDistributedQueue)(queue);
    for (const plan of next.plans) {
        const current = metadata.find((row) => normalizePlan(row.planFile || row.file) === normalizePlan(plan.planFile) && row.revision === plan.revision);
        if (!current)
            continue;
        const cases = Array.isArray(current.cases) ? current.cases.length : Number(current.caseCount || current.case_count);
        const seeds = Array.isArray(current.seeds) ? current.seeds.length : Number(current.seedCount || current.seed_count);
        const count = cases > 0 && seeds > 0 ? cases * seeds : Number(current.jobCount || current.job_count);
        if (Number.isInteger(count) && count > 0)
            plan.fullPlanJobCount = count;
    }
    return next;
}
/** Only the complete authority and newer staging runs need artifact transfer. History is metadata. */
function plansForOutputSync(queue) {
    const keep = new Set();
    for (const file of new Set(queue.plans.map((plan) => normalizePlan(plan.planFile)))) {
        const plans = ordered(queue.plans.filter((plan) => normalizePlan(plan.planFile) === file));
        const complete = (0, PlanRunFreshness_1.selectLatestCompletePlanRun)({ plans }, file);
        if (complete)
            keep.add(complete.runId);
        const latest = plans.at(-1);
        if (latest)
            keep.add(latest.id);
        for (const plan of plans)
            if (plan.jobs.some((job) => !terminal.has(job.status)))
                keep.add(plan.id);
    }
    return queue.plans.filter((plan) => keep.has(plan.id));
}
/** Only a single literal attempt leaf can ever be retired, never the Plan/job/project root. */
function isAttemptOutputDir(value) {
    const parts = String(value || "").split("/");
    return parts.length >= 4 && parts.at(-2) === "attempts"
        && parts.every((part) => /^[A-Za-z0-9_.-]+$/.test(part) && part !== "." && part !== "..")
        && ["work_dirs", "experiments"].includes(parts[0])
        && (parts[0] !== "experiments" || parts[1] === "runs")
        && !parts.some((part) => [".git", "clean_dir", "simple_cluster", ".runtime"].includes(part));
}
function outputRetirementCandidates(queue, publishedRunIds, requiredPaths) {
    const candidates = new Map();
    const protectedDirs = queue.plans.flatMap((plan) => plan.jobs.filter((job) => !terminal.has(job.status)).map((job) => job.outputDir));
    for (const id of publishedRunIds) {
        const plan = queue.plans.find((row) => row.id === id);
        // A legacy missing-job submission may report only its subset count. Do not retire a full fallback without the validation count.
        if (!plan || typeof plan.fullPlanJobCount !== "number" || !Number.isInteger(plan.fullPlanJobCount) || !(plan.fullPlanJobCount > 0))
            continue;
        const plans = ordered(queue.plans.filter((row) => normalizePlan(row.planFile) === normalizePlan(plan.planFile)));
        const complete = (0, PlanRunFreshness_1.selectLatestCompletePlanRun)({ plans }, plan.planFile);
        if (!complete || complete.runId !== id || plan.jobs.some((job) => job.outputRetiredAt
            || !requiredPaths.every((file) => /^[a-f0-9]{64}$/i.test(job.artifacts?.[`${job.outputDir}/${file}`] || ""))))
            continue;
        const completeIndex = plans.findIndex((row) => row.id === id);
        const retained = [...protectedDirs, ...plans.slice(completeIndex).flatMap((row) => row.jobs.map((job) => job.outputDir))];
        const add = (outputDir, workerIds, status, retiredAt) => {
            if (retiredAt || !terminal.has(status) || !isAttemptOutputDir(outputDir))
                return;
            if (retained.some((current) => current === outputDir || current.startsWith(outputDir + "/") || outputDir.startsWith(current + "/")))
                return;
            if (queue.plans.some((row) => normalizePlan(row.planFile) !== normalizePlan(plan.planFile)
                && row.jobs.flatMap((job) => [job, ...(job.history || [])]).some((job) => job.outputDir === outputDir
                    || job.outputDir.startsWith(outputDir + "/") || outputDir.startsWith(job.outputDir + "/"))))
                throw new Error("旧 attempt 被其他 Plan 引用；禁止自动替换。");
            const existing = candidates.get(outputDir);
            if (existing && existing.planFile !== plan.planFile)
                throw new Error("不同 Plan 共享旧 attempt 路径；禁止自动替换。");
            candidates.set(outputDir, { planFile: plan.planFile, replacementRunId: id, outputDir, type: "directory",
                workerIds: [...new Set([...(existing?.workerIds || []), ...workerIds].filter((id) => Boolean(id)))] });
        };
        for (const old of plans.slice(0, completeIndex + 1))
            for (const job of old.jobs) {
                add(job.outputDir, [job.workerId, ...(job.mirroredWorkerIds || []), ...(job.fragmentWorkerIds || [])], job.status, job.outputRetiredAt);
                for (const history of job.history || [])
                    add(history.outputDir, [history.workerId], history.status, history.outputRetiredAt);
            }
    }
    return [...candidates.values()];
}
function validateOutputInspection(candidate, proof, root) {
    if (!isAttemptOutputDir(candidate.outputDir) || !root || root === "/" || !root.startsWith("/")
        || path.posix.normalize(root) !== root || proof.remoteRoot !== root
        || proof.relativePath !== candidate.outputDir || proof.type !== "directory"
        || proof.absolutePath !== `${root}/${candidate.outputDir}` || proof.parent !== path.posix.dirname(proof.absolutePath)
        || proof.child !== `./${path.posix.basename(candidate.outputDir)}` || !proof.safeForDeletion
        || !/^[a-f0-9]{64}$/i.test(proof.fingerprint) || !Number.isSafeInteger(proof.bytes) || proof.bytes < 0
        || !Number.isSafeInteger(proof.fileCount) || proof.fileCount < 0)
        throw new Error(`旧 attempt 安全检查不通过：${candidate.outputDir}`);
}
function retirementIdentity(candidates) {
    return (0, node_crypto_1.createHash)("sha256").update(JSON.stringify([...candidates].sort((a, b) => a.outputDir.localeCompare(b.outputDir)))).digest("hex");
}
function markOutputsRetired(queue, candidate, retiredAt) {
    const next = (0, DistributedPlanQueue_1.cloneDistributedQueue)(queue);
    for (const plan of next.plans)
        for (const job of plan.jobs) {
            if (normalizePlan(plan.planFile) !== normalizePlan(candidate.planFile))
                continue;
            if (job.outputDir === candidate.outputDir) {
                job.outputRetiredAt = retiredAt;
                job.artifacts = undefined;
                job.mirroredWorkerIds = undefined;
                job.fragmentWorkerIds = undefined;
            }
            for (const history of job.history || [])
                if (history.outputDir === candidate.outputDir)
                    history.outputRetiredAt = retiredAt;
        }
    return next;
}
/** All-target preflight, two-stage UI approval, then a fresh proof before each exact delete. */
async function retirePlanOutputs(candidates, ports) {
    const result = { retired: 0, copies: 0, bytes: 0, cancelled: false };
    const records = [];
    await ports.assertCurrent();
    for (const candidate of candidates) {
        if (candidate.workerIds.some((id) => !ports.workerIds.includes(id)))
            throw new Error("旧 attempt 的 Worker 配置已移除；保留产物，无法安全替换。");
        for (const workerId of ports.workerIds)
            records.push({ ...candidate, workerId, inspection: await ports.inspect(candidate, workerId) });
    }
    const existing = records.filter((record) => record.inspection.exists);
    if (existing.length && !await ports.confirm(existing))
        return { ...result, cancelled: true };
    await ports.assertCurrent();
    // Revalidate the entire batch before the first mutation: one changed target aborts all deletes.
    for (const record of records) {
        const current = await ports.inspect(record, record.workerId);
        if (current.fingerprint !== record.inspection.fingerprint || current.exists !== record.inspection.exists)
            throw new Error(`旧 attempt 在审核期间发生变化；未删除：${record.outputDir}`);
    }
    for (const candidate of candidates) {
        await ports.assertCurrent();
        await ports.hold(candidate);
        for (const record of records.filter((row) => row.outputDir === candidate.outputDir && row.inspection.exists)) {
            await ports.assertCurrent();
            const current = await ports.inspect(record, record.workerId);
            if (current.fingerprint !== record.inspection.fingerprint || !current.exists)
                throw new Error(`删除前旧 attempt 身份发生变化：${record.outputDir}`);
            await ports.remove(record);
            if ((await ports.inspect(record, record.workerId)).exists)
                throw new Error(`旧 attempt 删除未完成：${record.outputDir}`);
            result.copies++;
            result.bytes += record.inspection.bytes;
        }
        await ports.retired(candidate);
        result.retired++;
    }
    return result;
}
