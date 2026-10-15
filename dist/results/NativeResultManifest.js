"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobEvidenceName = jobEvidenceName;
exports.verifyNativeResult = verifyNativeResult;
const node_crypto_1 = require("node:crypto");
function jobEvidenceName(job) {
    return job.lifecycleProtocol === 2 ? "artifact_manifest.json" : "formal_job_owner.json";
}
/** Validate a small final output. No status cache, owner snapshot, or scientific verdict. */
function verifyNativeResult(text, sha256, job, mode, allowFailedExecution = false) {
    if (Buffer.byteLength(text, "utf8") > 1024 * 1024 || (0, node_crypto_1.createHash)("sha256").update(text, "utf8").digest("hex") !== sha256.toLowerCase())
        throw new Error("FINAL_MANIFEST_SHA256_CHANGED");
    const report = JSON.parse(text).simpleExperiment;
    if (!report || report.runId !== job.commandId || !(report.status === "completed" || allowFailedExecution && report.status === "failed") || report.outputDir !== job.outputDir
        || report.job?.index !== job.index || report.job?.case !== job.case || report.job?.seed !== job.seed
        || !["train", "test", "train_test"].includes(report.mode) || mode && report.mode !== mode
        || report.mode !== "train" && report.resultCsv !== job.collectionResultCsv)
        throw new Error("FINAL_MANIFEST_JOB_MISMATCH");
    if (!Array.isArray(report.weights) || report.mode !== "test" && !report.weights.length
        || report.weights.some((file) => typeof file !== "string" || !file.startsWith(job.outputDir + "/")
            || file.split("/").some(part => !part || part === "." || part === "..") || /[:\\\x00-\x1f]/.test(file)))
        throw new Error("FINAL_MANIFEST_WEIGHT_PATH_INVALID");
    return report;
}
