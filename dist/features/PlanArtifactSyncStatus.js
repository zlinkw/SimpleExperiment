"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobArtifactSyncDigest = void 0;
exports.reusableJobArtifactSync = reusableJobArtifactSync;
exports.confirmedPlanArtifactSync = confirmedPlanArtifactSync;
exports.projectJobArtifactSync = projectJobArtifactSync;
exports.latestCompletePlansForSyncCheck = latestCompletePlansForSyncCheck;
exports.pendingCompletedPlanMirrors = pendingCompletedPlanMirrors;
exports.completeFormalPlansForWorkerMirror = completeFormalPlansForWorkerMirror;
exports.completedPlanMirrorIdentity = completedPlanMirrorIdentity;
exports.planArtifactSyncCheckKey = planArtifactSyncCheckKey;
exports.assessPlanArtifactSync = assessPlanArtifactSync;
const node_crypto_1 = require("node:crypto");
const PlanArtifactSync_1 = require("./PlanArtifactSync");
const DistributedJobArtifacts_1 = require("./DistributedJobArtifacts");
const NativeResultManifest_1 = require("../results/NativeResultManifest");
const LogicalPlanProgress_1 = require("./LogicalPlanProgress");
const LatestJobArtifacts_1 = require("./LatestJobArtifacts");
const VerifiedCompletion_1 = require("./VerifiedCompletion");
const planKey = (value) => String(value || "").replace(/\\/g, "/").toLowerCase();
const jobArtifactSyncDigest = (job) => (0, node_crypto_1.createHash)("sha256").update(JSON.stringify(Object.entries(job.artifacts || {}).sort(([a], [b]) => a.localeCompare(b)))).digest("hex");
exports.jobArtifactSyncDigest = jobArtifactSyncDigest;
/** Reuse a confirmed transfer, never its timestamp as a new remote observation. */
function reusableJobArtifactSync(plan, job, targets, selected, holds = {}) {
    const receipt = job.latestArtifactSync, owner = { ...plan, id: job.sourcePlanId || plan.id };
    if (!receipt || receipt.state !== "synced" || !Number.isFinite(Date.parse(receipt.checkedAt)) || !targets.length
        || job.status !== "completed" || job.cleanup || plan.cleanup || job.outputRetiredAt || job.unavailable
        || job.lifecycleProtocol === 2 && (!(0, VerifiedCompletion_1.hasVerifiedCompletion)(owner, job) || job.globalJobId !== `${owner.id}:${job.index}`)
        || receipt.artifactDigest && receipt.artifactDigest !== (0, exports.jobArtifactSyncDigest)(job)
        || ["missing", "incomplete", "conflict"].includes(job.resultState))
        return false;
    try {
        const scopes = (0, LatestJobArtifacts_1.jobArtifactScopes)({ ...job, executionMode: plan.executionMode }, selected);
        const csv = (job.actualExecutionMode || plan.executionMode) === "train" ? "" : job.collectionResultCsv;
        if (!scopes.includes(job.outputDir) || csv && !scopes.some(scope => csv === scope || csv.startsWith(scope + "/"))
            || receipt.key !== (0, LatestJobArtifacts_1.latestJobSyncKey)(owner, job, scopes, targets)
            || !Array.isArray(receipt.scopes) || JSON.stringify(receipt.scopes.slice().sort()) !== JSON.stringify(scopes)
            || targets.some(target => !receipt.workerIds?.includes(target.id)))
            return false;
        const overlaps = (a, b) => a === b || a.startsWith(b + "/") || b.startsWith(a + "/");
        return !Object.entries(holds).some(([file, hold]) => hold.endpointId !== "local"
            && Date.parse(hold.deletedAt || "") >= Date.parse(receipt.checkedAt) && scopes.some(scope => overlaps(scope, file)));
    }
    catch {
        return false;
    }
}
function confirmedPlanArtifactSync(plan, targets, selected, holds = {}) {
    const expected = Number(plan.fullPlanJobCount || plan.planJobCount || plan.jobs.length);
    if (!expected || plan.jobs.length !== expected || plan.recoveryConflict || plan.recoveryMissingCount > 0
        || new Set(plan.jobs.map((job) => job.index)).size !== expected
        || !plan.jobs.every((job) => reusableJobArtifactSync(plan, job, targets, selected, holds)))
        return undefined;
    const checkedAt = plan.jobs.map((job) => job.latestArtifactSync.checkedAt).sort()[0];
    return { runId: plan.id, revision: plan.revision, status: "synced", checkedAt, targetCount: targets.length, syncedCount: targets.length,
        pendingWorkerIds: [], unavailableWorkerIds: [], source: "job_confirmations",
        detail: "复用全部 job 对当前服务器和完整产物范围的同步确认；保留原核实时间，未重复扫描目录。" };
}
/** The job label uses the same context guard as its PLAN. Keep the saved receipt untouched. */
function projectJobArtifactSync(plan, job, targets, selected, holds = {}) {
    if (job.latestArtifactSync?.state !== "synced" || reusableJobArtifactSync(plan, job, targets, selected, holds))
        return job.latestArtifactSync;
    return { ...job.latestArtifactSync, state: "partial", error: "原同步确认不覆盖当前任务、服务器或完整勾选范围，需要重新核实。" };
}
/** Completion is independent of a previous sync ledger; a same-revision rerun is a new generation. */
function latestCompletePlansForSyncCheck(queue, metadata = []) {
    const current = new Map(metadata.map(plan => [planKey(plan.file || plan.planFile), plan]));
    const latest = new Map();
    for (const plan of (0, LogicalPlanProgress_1.composeLogicalPlans)(queue.plans)) {
        const config = current.get(planKey(plan.planFile));
        const configuredCount = config?.cases?.length && config?.seeds?.length ? config.cases.length * config.seeds.length : Number(config?.jobCount);
        const expected = configuredCount > 0 ? configuredCount : Number(plan.fullPlanJobCount || plan.planJobCount || plan.jobs.length);
        if (!plan.id || config?.revision && config.revision !== plan.revision || plan.recoveryConflict || Number(plan.recoveryMissingCount || 0) > 0
            || !expected || plan.jobs.length !== expected || new Set(plan.jobs.map(job => job.index)).size !== expected
            || new Set(plan.jobs.map(job => `${job.case}\0${job.seed}`)).size !== expected
            || plan.jobs.some(job => job.status !== "completed" || job.outputRetiredAt || job.recoveryConflict
                || job.trustedTerminalStatus && job.trustedTerminalStatus !== "completed" || !job.workerId || !job.commandId
                || !job.outputDir || job.outputDir.startsWith("/") || /^[A-Za-z]:/.test(job.outputDir)
                || job.outputDir.includes("\\") || job.outputDir.split("/").some(part => !part || part === "." || part === "..")))
            continue;
        const key = planKey(plan.planFile);
        const old = latest.get(key);
        if (!old || (Date.parse(plan.enqueuedAt) || 0) >= (Date.parse(old.enqueuedAt) || 0))
            latest.set(key, plan);
    }
    return [...latest.values()].slice(0, 500);
}
/** A durable mirror receipt belongs to a complete formal run, never to a partial job or a basename. */
function pendingCompletedPlanMirrors(queue, metadata, workerIds, now = Date.now()) {
    return completeFormalPlansForWorkerMirror(queue, metadata).filter(plan => {
        if (plan.cleanup || plan.resultPathPolicy !== "declared" || !plan.revision || !plan.codeFingerprint
            || plan.jobs.some(job => job.unavailable || job.resultPathPolicy !== "declared" || job.globalJobId !== `${plan.id}:${job.index}`
                || !(0, PlanArtifactSync_1.safePlanArtifactPath)(job.outputDir) || job.outputDir.split("/").length < 2 || job.outputDir.split("/").includes("attempts")
                || job.collectionResultCsv && !(0, PlanArtifactSync_1.safePlanArtifactPath)(job.collectionResultCsv)
                || job.artifactRetryAfter && Date.parse(job.artifactRetryAfter) > now))
            return false;
        return plan.jobs.some(job => !/^[a-f0-9]{64}$/i.test(job.artifacts?.[`${job.outputDir}/${(0, NativeResultManifest_1.jobEvidenceName)(job)}`] || "")
            || job.artifactError || workerIds.some(id => !job.mirroredWorkerIds?.includes(id)));
    });
}
/** Mirror each frozen run, including a run finishing after the on-disk PLAN has advanced. */
function completeFormalPlansForWorkerMirror(queue, metadata) {
    return queue.plans.filter(plan => !plan.cleanup && plan.resultPathPolicy === "declared").flatMap(plan => latestCompletePlansForSyncCheck({ ...queue, plans: [plan] }, metadata.filter(row => row.revision === plan.revision)));
}
/** Excludes changing mirror receipts; includes every execution binding used by a fresh pre-transfer check. */
function completedPlanMirrorIdentity(plan) {
    return JSON.stringify([plan.id, plan.projectId, plan.revision, plan.codeFingerprint, plan.resultPathPolicy, plan.executionMode,
        plan.jobs.map(job => [job.index, job.case, job.seed, job.globalJobId, job.commandId, job.workerId,
            job.outputDir, job.collectionResultCsv, job.actualExecutionMode, job.checkpointSource])]);
}
function planArtifactSyncCheckKey(plans, workerIds, onlineIds) {
    return (0, node_crypto_1.createHash)("sha256").update(JSON.stringify([workerIds.slice().sort(), onlineIds.slice().sort(), plans.map(plan => [
            plan.id, plan.revision, plan.jobs.map(job => [job.index, job.attempt, job.commandId, job.workerId, job.outputDir,
                Object.entries(job.artifacts || {}).sort(([a], [b]) => a.localeCompare(b))]),
        ])])).digest("hex");
}
/** Compare the complete latest attempt directory, including checkpoints, with each configured Worker. */
function assessPlanArtifactSync(plan, workerIds, inventories, requiredPaths, checkedAt = new Date().toISOString()) {
    const pending = new Set();
    const unavailable = new Set();
    let missingSource = false;
    const subtree = (workerId, directory, csv) => {
        const inventory = inventories.get(workerId) || {};
        const files = (0, DistributedJobArtifacts_1.collectDistributedJobArtifacts)(directory, Object.fromEntries(Object.entries(inventory).map(([file, sha256]) => [file, { sha256 }])), false);
        if (csv && /^[a-f0-9]{64}$/i.test(inventory[csv] || ""))
            files[csv] = inventory[csv].toLowerCase();
        return Object.entries(files).sort(([a], [b]) => a.localeCompare(b));
    };
    for (const job of plan.jobs) {
        const csv = job.resultPathPolicy === "declared" ? job.collectionResultCsv : undefined;
        const source = subtree(job.workerId, job.outputDir, csv);
        const expected = new Map(source);
        const known = Object.entries(job.artifacts || {}).filter(([file]) => file.startsWith(job.outputDir + "/") || csv && file === csv);
        const runScopedDirectory = job.outputDir.endsWith(`/attempts/${plan.id}`);
        const hasLegacyRunEvidence = requiredPaths.length > 0 && requiredPaths.every(file => known.some(([name, hash]) => name === `${job.outputDir}/${file}` && /^[a-f0-9]{64}$/i.test(hash)));
        const formalEvidence = job.resultPathPolicy === "declared" && job.globalJobId === `${job.sourcePlanId || plan.id}:${job.index}`
            && known.some(([name, hash]) => name === `${job.outputDir}/${(0, NativeResultManifest_1.jobEvidenceName)(job)}` && /^[a-f0-9]{64}$/i.test(hash));
        if (!(job.resultPathPolicy === "declared" ? formalEvidence : runScopedDirectory || hasLegacyRunEvidence) || !inventories.has(job.workerId) || !source.length
            || requiredPaths.some(file => !expected.has(`${job.outputDir}/${file}`))
            || known.some(([file, hash]) => expected.get(file)?.toLowerCase() !== hash.toLowerCase())) {
            missingSource = true;
            unavailable.add(job.workerId);
            continue;
        }
        const sourceKey = JSON.stringify(source.map(([file, hash]) => [file, hash.toLowerCase()]));
        for (const workerId of workerIds) {
            if (!inventories.has(workerId)) {
                unavailable.add(workerId);
                continue;
            }
            if (JSON.stringify(subtree(workerId, job.outputDir, csv).map(([file, hash]) => [file, hash.toLowerCase()])) !== sourceKey)
                pending.add(workerId);
        }
    }
    const syncedCount = missingSource ? 0 : workerIds.filter(id => !pending.has(id) && !unavailable.has(id)).length;
    return { runId: plan.id, revision: plan.revision, checkedAt, targetCount: workerIds.length, syncedCount,
        status: missingSource ? "unknown" : workerIds.length > 0 && syncedCount === workerIds.length ? "synced" : pending.size ? "partial" : "unknown",
        pendingWorkerIds: [...pending].slice(0, 64), unavailableWorkerIds: [...unavailable].slice(0, 64),
        detail: missingSource ? "最新运行的来源目录缺失、版本不符或尚未读取，不能确认全局同步。"
            : pending.size ? "部分服务器的最新运行目录缺少文件或内容不同；仅检测，未自动传输。"
                : unavailable.size ? "部分服务器暂不可用，不能确认全局同步。" : "最新运行的完整产物目录（包含权重、日志和指标）已在所有已启用 Worker 校验一致。" };
}
