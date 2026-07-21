"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAgentSnapshot = parseAgentSnapshot;
exports.agentSnapshotFreshness = agentSnapshotFreshness;
exports.snapshotPath = snapshotPath;
function parseAgentSnapshot(raw) { try {
    const parsed = JSON.parse(raw);
    if (!parsed || Number(parsed.schemaVersion) !== 1 || !parsed.generatedAt)
        return undefined;
    return { ...parsed, source: "hub_agent" };
}
catch {
    return undefined;
} }
function agentSnapshotFreshness(snapshot, defaultTtlSeconds) { if (!snapshot)
    return { fresh: false, ageMs: Number.POSITIVE_INFINITY, reason: "missing" }; const generated = Date.parse(String(snapshot.generatedAt || "")); if (!Number.isFinite(generated))
    return { fresh: false, ageMs: Number.POSITIVE_INFINITY, reason: "bad_generatedAt" }; const ageMs = Date.now() - generated; const expires = Date.parse(String(snapshot.expiresAt || "")); if (Number.isFinite(expires) && Date.now() > expires)
    return { fresh: false, ageMs, reason: "expired" }; const ttlMs = Math.max(1, Number(snapshot.ttlSeconds || defaultTtlSeconds || 10)) * 1000; if (ageMs > ttlMs)
    return { fresh: false, ageMs, reason: "ttl_expired" }; return { fresh: true, ageMs }; }
function snapshotPath(kind) { const file = kind === "cluster" ? "cluster_snapshot.json" : kind === "gpu" ? "gpu_snapshot.json" : kind === "traces" ? "experiment_traces_snapshot.json" : "health_snapshot.json"; return `zlk_cluster/tmp/cluster_agent/${file}`; }
