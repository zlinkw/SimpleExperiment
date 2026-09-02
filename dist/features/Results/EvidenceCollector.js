"use strict";
/**
 * EvidenceCollector — 从 Results.ts / PlanArchive.ts 提取证据归档逻辑
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceCollector = void 0;
exports.collectEvidence = collectEvidence;
exports.validateBundle = validateBundle;
exports.bundleToManifest = bundleToManifest;
function tryRequire(id) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require(id);
    }
    catch {
        return undefined;
    }
}
function sha256(text) {
    const c = tryRequire("crypto");
    if (c)
        return c.createHash("sha256").update(text).digest("hex");
    return `hash_${text.length}`;
}
function collectEvidence(runKey, files, planFile) {
    const items = Object.entries(files ?? {}).map(([path, content]) => {
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
                const rec = data;
                if (Array.isArray(rec["files"]))
                    for (const f of rec["files"])
                        files[String(f["path"] ?? f["name"] ?? "")] = String(f["content"] ?? "");
                else if (rec["evidence"])
                    Object.assign(files, rec["evidence"]);
                else
                    Object.assign(files, rec);
            }
            return collectEvidence(runKey, files, params["planFile"]);
        }
        catch {
            return { runKey, planFile: params["planFile"], items: [], complete: false, missing: ["remote_fetch_failed"], collectedAt: new Date().toISOString() };
        }
    }
}
exports.EvidenceCollector = EvidenceCollector;
