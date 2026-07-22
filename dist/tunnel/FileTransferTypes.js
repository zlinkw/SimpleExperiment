"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSafeRemotePath = isSafeRemotePath;
exports.makeTransferId = makeTransferId;
function isSafeRemotePath(remotePath) {
    const normalized = remotePath.replace(/\\/g, "/").trim();
    if (!normalized || normalized.includes("\0"))
        return false;
    if (normalized.startsWith("/") || /^[A-Za-z]:/.test(normalized))
        return false;
    if (normalized.split("/").some((part) => part === ".."))
        return false;
    if (normalized.split("/").some((part) => /^(id_rsa|id_ed25519|known_hosts|\.ssh)(\.|$)/i.test(part) || /\.(pem|key)$/i.test(part)))
        return false;
    const parts = normalized.split("/").filter((part) => part && part !== ".");
    const rootResultFiles = new Set([
        "metrics_summary.csv", "metrics_case.csv", "results.csv", "result.csv", "metrics.csv", "summary.csv", "scores.csv", "score.csv",
        "detailed_metrics.csv", "test_metrics.csv", "classification_report.csv", "metrics.json", "summary.json", "result.json", "results.json",
        "classification_report.json", "summary.txt", "result.txt", "results.txt", "classification_report.txt", "stdout.log", "stderr.log",
        "train.log", "test.log", "console.log", "output.out",
    ]);
    if (parts.length === 1)
        return rootResultFiles.has(parts[0].toLowerCase());
    return new Set([
        "zlk_cluster", "work_dirs", "experiments", "exports", "results", "paper", "outputs", "runs", "logs", "test_results",
        "lightning_logs", "custom_results", "reports", "artifacts", "evals", "eval", "evaluation", "predictions", "submissions",
    ]).has(parts[0].toLowerCase());
}
function makeTransferId(prefix = "transfer") {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
