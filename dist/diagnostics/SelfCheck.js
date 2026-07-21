"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.summarizeSelfCheck = summarizeSelfCheck;
exports.selfCheckText = selfCheckText;
function summarizeSelfCheck(checks, startedAt = new Date().toISOString(), finishedAt = new Date().toISOString()) {
    const overall = checks.some((item) => item.status === "failed")
        ? "failed"
        : checks.some((item) => item.status === "warning")
            ? "warning"
            : "ok";
    return { schemaVersion: 1, startedAt, finishedAt, overall, checks };
}
function selfCheckText(result) {
    return [
        `overall=${result.overall}`,
        ...result.checks.map((item) => `[${item.status}] ${item.scope}${item.serverId ? `:${item.serverId}` : ""} ${item.id} - ${item.message}${item.suggestion ? ` (${item.suggestion})` : ""}`),
    ].join("\n");
}
