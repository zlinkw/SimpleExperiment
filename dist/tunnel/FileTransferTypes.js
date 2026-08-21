"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSafeRemotePath = isSafeRemotePath;
exports.makeTransferId = makeTransferId;
const ROOT_RESULT_FILES = new Set([
    "metrics_summary.csv", "metrics_case.csv", "results.csv", "result.csv", "metrics.csv", "summary.csv", "scores.csv", "score.csv",
    "detailed_metrics.csv", "test_metrics.csv", "classification_report.csv", "metrics.json", "summary.json", "result.json", "results.json",
    "classification_report.json", "summary.txt", "result.txt", "results.txt", "classification_report.txt", "stdout.log", "stderr.log",
    "train.log", "test.log", "console.log", "output.out",
]);
const ALLOWED_REMOTE_PATH_ROOTS = new Set([
    "simple_cluster", "work_dirs", "experiments", "exports", "results", "paper", "outputs", "runs", "logs", "test_results",
    "lightning_logs", "custom_results", "reports", "artifacts", "evals", "eval", "evaluation", "predictions", "submissions",
]);
function isSafeRemotePath(remotePath) {
    const normalized = remotePath.replace(/\\/g, "/").trim();
    if (!normalized || normalized.includes("\0"))
        return false;
    if (normalized.startsWith("/") || /^[A-Za-z]:/.test(normalized))
        return false;
    const segments = normalized.split("/");
    if (segments.some((part) => part === ".."))
        return false;
    if (segments.some((part) => /^(id_rsa|id_ed25519|known_hosts|\.ssh)(\.|$)/i.test(part) || /\.(pem|key)$/i.test(part)))
        return false;
    const parts = segments.filter((part) => part && part !== ".");
    if (!parts.length)
        return false;
    if (parts.length === 1)
        return ROOT_RESULT_FILES.has(parts[0].toLowerCase());
    return ALLOWED_REMOTE_PATH_ROOTS.has(parts[0].toLowerCase());
}
function makeTransferId(prefix = "transfer") {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
