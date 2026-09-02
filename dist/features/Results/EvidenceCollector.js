"use strict";
// @ts-nocheck
/**
 * EvidenceCollector — 从 Results.ts / PlanArchive.ts 提取证据归档逻辑
 * 负责 run evidence 收集、checkpoint 快照、归档校验与证据链完整性检查
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceCollector = void 0;
exports.collectEvidence = collectEvidence;
exports.validateBundle = validateBundle;
exports.bundleToManifest = bundleToManifest;
const requiredKindsByPlan = {
    default: ["result", "config"],
};
function sha256(text) {
    try {
        const c = require("crypto");
        return c.createHash("sha256").update(text).digest("hex");
    }
    catch {
        return `hash_${text.length}`;
    }
}
function collectEvidence(runKey, files, planFile) {
    const items = Object.entries(files || {}).map(([path, content]) => {
        const kind = /\.csv$/i.test(path) ? "result" : /(checkpoint|ckpt)/i.test(path) ? "checkpoint" : /\.log$/i.test(path) ? "log" : /(config\.ya?ml|\.json$)/i.test(path) ? "config" : "env";
        return { kind, path, sha256: sha256(String(content).slice(0, 4096)), size: String(content).length, mtime: new Date().toISOString(), valid: true };
    });
    const hasResult = items.some((i) => i.kind === "result");
    const hasConfig = items.some((i) => i.kind === "config");
    const missing = [];
    if (!hasResult)
        missing.push("result_csv");
    if (!hasConfig)
        missing.push("config_snapshot");
    return { runKey, planFile, items, complete: missing.length === 0, missing, collectedAt: new Date().toISOString() };
}
function validateBundle(bundle) {
    const issues = [];
    if (!bundle.items.length)
        issues.push({ severity: "critical", message: "证据为空" });
    if (bundle.missing.length)
        issues.push({ severity: "critical", message: `缺失证据: ${bundle.missing.join(", ")}` });
    for (const item of bundle.items)
        if (item.valid === false)
            issues.push({ severity: "warning", message: `证据无效: ${item.path}` });
    // 校验 planArchive 的 restore 完整性：若存在 archivedPlanFile，应具备环境快照
    if (bundle.planFile && !bundle.items.some((i) => i.kind === "env"))
        issues.push({ severity: "warning", message: "缺少 env_snapshot，复现可能不完全" });
    return { ok: issues.filter((i) => i.severity === "critical").length === 0, issues };
}
function bundleToManifest(bundle) {
    return JSON.stringify({ schemaVersion: 1, runKey: bundle.runKey, planFile: bundle.planFile, collectedAt: bundle.collectedAt, complete: bundle.complete, missing: bundle.missing, items: bundle.items.map((i) => ({ kind: i.kind, path: i.path, sha256: i.sha256, size: i.size })) }, null, 2);
}
class EvidenceCollector {
    collect(runKey, files, planFile) { return collectEvidence(runKey, files, planFile); }
    validate(bundle) { return validateBundle(bundle); }
    manifest(bundle) { return bundleToManifest(bundle); }
    async collectFromRemote(runKey, getRunEvidence, params = {}) {
        try {
            const data = await getRunEvidence({ ...params, runKey });
            const files = {};
            if (data && typeof data === "object") {
                if (Array.isArray(data.files))
                    for (const f of data.files)
                        files[String(f.path || f.name)] = String(f.content || "");
                else if (data.evidence)
                    Object.assign(files, data.evidence);
                else
                    Object.assign(files, data);
            }
            return collectEvidence(runKey, files, params.planFile);
        }
        catch (e) {
            return { runKey, planFile: params.planFile, items: [], complete: false, missing: ["remote_fetch_failed"], collectedAt: new Date().toISOString() };
        }
    }
}
exports.EvidenceCollector = EvidenceCollector;
