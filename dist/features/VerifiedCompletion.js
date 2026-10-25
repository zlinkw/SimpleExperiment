"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.completionIdentity = completionIdentity;
exports.hasVerifiedCompletion = hasVerifiedCompletion;
exports.verifiedCompletionProjection = verifiedCompletionProjection;
exports.trustedTerminalProofFor = trustedTerminalProofFor;
exports.hasTrustedTerminalProof = hasTrustedTerminalProof;
exports.nextVerifiedCompletion = nextVerifiedCompletion;
function completionIdentity(plan, job) {
    return JSON.stringify([plan.projectId, plan.id, job.index, job.workerId, job.commandId, job.outputDir, job.collectionResultCsv || ""]);
}
function hasVerifiedCompletion(plan, job) {
    const proof = job.verifiedCompletion;
    return Boolean(!job.unavailable && !job.retainExistingOutputs && job.commandId && plan.projectId && job.workerId && job.outputDir
        && proof?.schemaVersion === 1 && proof.exitCode === 0 && Number.isFinite(Date.parse(proof.verifiedAt))
        && proof.identity === completionIdentity(plan, job));
}
function verifiedCompletionProjection(plan, job) {
    if (!hasVerifiedCompletion(plan, job))
        return {};
    return { status: "completed", executionState: "exited", resultState: "complete", completionState: "verified",
        exitCode: 0, statusQueryError: undefined, error: undefined, blockReason: undefined,
        runtimeDiagnostics: { schemaVersion: 1, commandId: job.commandId, runId: job.commandId,
            state: "clear", count: 0, scanComplete: true } };
}
function trustedTerminalProofFor(plan, job, outcome, now) {
    return { schemaVersion: 1, identity: completionIdentity(plan, job), provenAt: new Date(now).toISOString(), outcome };
}
function hasTrustedTerminalProof(plan, job) {
    const proof = job.trustedTerminalProof;
    return Boolean(proof?.schemaVersion === 1 && ["completed", "failed", "cancelled"].includes(proof.outcome)
        && Number.isFinite(Date.parse(proof.provenAt)) && job.commandId && plan.projectId && job.workerId
        && proof.identity === completionIdentity(plan, job));
}
function nextVerifiedCompletion(plan, job, observation, state, now) {
    const exact = !observation.queryError;
    const confirmed = hasVerifiedCompletion(plan, job);
    const newer = (lane) => !confirmed
        || Date.parse(String(observation.evidence?.[lane]?.networkStartedAt || "")) > Date.parse(job.verifiedCompletion.verifiedAt);
    const artifactIssue = exact && newer("artifacts") && !observation.resultQueryError && (observation.artifactIssue
        || observation.result && (observation.result.runId !== job.commandId || observation.result.identityMatches === false
            || observation.result.status === "failed" || observation.result.present === false || observation.result.artifactsComplete === false));
    const executionIssue = exact && newer("execution") && !observation.executionQueryError && state.execution === "failed";
    const runtimeIssue = exact && newer("logs") && state.runtimeDiagnostics?.count > 0;
    if (artifactIssue || executionIssue || runtimeIssue)
        return undefined;
    if (confirmed)
        return job.verifiedCompletion;
    if (exact && !observation.executionQueryError && !observation.resultQueryError && state.status === "completed"
        && state.result === "complete" && state.completionState === "verified" && state.exitCode === 0)
        return { schemaVersion: 1, identity: completionIdentity(plan, job), verifiedAt: new Date(now).toISOString(), exitCode: 0 };
    return undefined;
}
