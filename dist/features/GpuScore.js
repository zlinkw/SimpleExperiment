"use strict";
/**
 * GpuScore - GPU 密集表格评分模型
 * 方案一严格实现：0-100 跑得快=高分，同 plan 内 p5/p95 归一，仅成功 job 计入，卡分=均值，服务器分=卡均值，窗口仅7天且过期直接删盘
 */
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
exports.GPU_SCORE_MAX = exports.GPU_SCORE_MIN = exports.GPU_SCORE_WINDOW_MS = exports.GPU_SCORE_WINDOW_DAYS = void 0;
exports.percentile = percentile;
exports.computeP5P95 = computeP5P95;
exports.computeJobScore = computeJobScore;
exports.scoreJobsByPlan = scoreJobsByPlan;
exports.isSuccessfulJob = isSuccessfulJob;
exports.computeCardScore = computeCardScore;
exports.computeServerScore = computeServerScore;
exports.filterWindow = filterWindow;
exports.pruneExpiredAndUnlink = pruneExpiredAndUnlink;
exports.loadAndPruneScoreDir = loadAndPruneScoreDir;
exports.buildScoreMaps = buildScoreMaps;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
exports.GPU_SCORE_WINDOW_DAYS = 7;
exports.GPU_SCORE_WINDOW_MS = exports.GPU_SCORE_WINDOW_DAYS * 24 * 3600 * 1000;
exports.GPU_SCORE_MIN = 0;
exports.GPU_SCORE_MAX = 100;
// p5/p95 计算
function percentile(sorted, p) {
    if (!sorted.length)
        return 0;
    const idx = (p / 100) * (sorted.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi)
        return sorted[lo];
    const frac = idx - lo;
    return sorted[lo] * (1 - frac) + sorted[hi] * frac;
}
function computeP5P95(durations) {
    if (!durations.length)
        return { p5: 0, p95: 1 };
    const sorted = [...durations].sort((a, b) => a - b);
    return { p5: percentile(sorted, 5), p95: percentile(sorted, 95) };
}
// 单 job 分数：跑得快=高分，p5->100, p95->0，线性归一并 clamp 0-100
function computeJobScore(durationMs, p5, p95) {
    if (!Number.isFinite(durationMs) || !Number.isFinite(p5) || !Number.isFinite(p95))
        return 50;
    if (p95 <= p5)
        return 50;
    if (durationMs <= p5)
        return 100;
    if (durationMs >= p95)
        return 0;
    const score = ((p95 - durationMs) / (p95 - p5)) * 100;
    return Math.max(0, Math.min(100, Math.round(score * 10) / 10));
}
// 对同 plan 内成功 jobs 批量计分
function scoreJobsByPlan(jobs) {
    const byPlan = new Map();
    for (const j of jobs) {
        if (!isSuccessfulJob(j))
            continue;
        const key = String(j.planFile || j.planId || "unknown");
        if (!byPlan.has(key))
            byPlan.set(key, []);
        byPlan.get(key).push(j);
    }
    const scoreMap = new Map();
    for (const [, list] of byPlan) {
        const durations = list.map((x) => x.durationMs).filter((v) => Number.isFinite(v));
        const { p5, p95 } = computeP5P95(durations);
        for (const job of list) {
            scoreMap.set(job.jobId, computeJobScore(job.durationMs, p5, p95));
        }
    }
    return scoreMap;
}
function isSuccessfulJob(job) {
    const s = String(job.status || "").toLowerCase();
    return s === "completed" || s === "success" || s === "succeeded" || s === "done";
}
// 卡分 = 卡上所有成功 job 的 jobScore 均值
function computeCardScore(jobScores) {
    const valid = jobScores.filter((v) => Number.isFinite(v));
    if (!valid.length)
        return null;
    const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
    return Math.max(0, Math.min(100, Math.round(avg * 10) / 10));
}
// 服务器分 = 该服务器下所有卡分的均值
function computeServerScore(cardScores) {
    const valid = cardScores.filter((v) => typeof v === "number" && Number.isFinite(v));
    if (!valid.length)
        return null;
    const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
    return Math.max(0, Math.min(100, Math.round(avg * 10) / 10));
}
// 过滤 7天窗口，仅保留窗口内记录
function filterWindow(records, nowMs = Date.now()) {
    const cutoff = nowMs - exports.GPU_SCORE_WINDOW_MS;
    return records.filter((r) => Number.isFinite(r.finishedAt) && r.finishedAt >= cutoff);
}
// 过期直接删盘 + 内存删记录：返回保留的记录，并对过期记录尝试 unlink
function pruneExpiredAndUnlink(records, nowMs = Date.now()) {
    const cutoff = nowMs - exports.GPU_SCORE_WINDOW_MS;
    const kept = [];
    const pruned = [];
    for (const r of records) {
        if (!Number.isFinite(r.finishedAt) || r.finishedAt < cutoff) {
            pruned.push(r);
            if (r.filePath) {
                try {
                    const fp = path.resolve(String(r.filePath));
                    if (fs.existsSync(fp))
                        fs.unlinkSync(fp);
                }
                catch {
                    // ignore unlink failure
                }
            }
        }
        else {
            kept.push(r);
        }
    }
    // 内存删记录：调用方用 kept 替换原数组（in-place 也清理）
    return { kept, pruned };
}
// 磁盘扫描辅助：从目录加载所有 score json 并做 7天过滤 + unlink 过期文件
function loadAndPruneScoreDir(dir, nowMs = Date.now()) {
    let files = [];
    try {
        files = fs.readdirSync(dir);
    }
    catch {
        return [];
    }
    const records = [];
    for (const f of files) {
        if (!f.endsWith(".json"))
            continue;
        const full = path.join(dir, f);
        try {
            const raw = JSON.parse(fs.readFileSync(full, "utf8"));
            const rec = {
                planFile: String(raw.planFile || raw.plan || ""),
                planId: raw.planId ? String(raw.planId) : undefined,
                jobId: String(raw.jobId || raw.id || f),
                serverId: String(raw.serverId || raw.server || ""),
                gpuId: String(raw.gpuId || raw.gpu_id || ""),
                durationMs: Number(raw.durationMs ?? raw.duration ?? 0),
                status: String(raw.status || "completed"),
                finishedAt: Number(raw.finishedAt ?? raw.finished_at ?? Date.parse(raw.finishedAt || "") ?? nowMs),
                filePath: full,
            };
            records.push(rec);
        }
        catch {
            // corrupted file -> treat as expired and unlink
            try {
                fs.unlinkSync(full);
            }
            catch { }
        }
    }
    const { kept } = pruneExpiredAndUnlink(records, nowMs);
    return kept;
}
// 便捷：计算某次全量记录的卡/服务器分映射（供 UI 消费）
function buildScoreMaps(jobs) {
    const windowed = filterWindow(jobs);
    const jobScores = scoreJobsByPlan(windowed);
    const byCard = new Map();
    const byServer = new Map(); // server -> set of card keys
    for (const j of windowed) {
        if (!isSuccessfulJob(j))
            continue;
        const sc = jobScores.get(j.jobId);
        if (sc === undefined)
            continue;
        const cardKey = `${j.serverId}::${j.gpuId}`;
        if (!byCard.has(cardKey))
            byCard.set(cardKey, []);
        byCard.get(cardKey).push(sc);
        if (!byServer.has(j.serverId))
            byServer.set(j.serverId, new Set());
        byServer.get(j.serverId).add(cardKey);
    }
    const cardScores = new Map();
    for (const [k, arr] of byCard)
        cardScores.set(k, computeCardScore(arr));
    const serverScores = new Map();
    for (const [serverId, cardKeys] of byServer) {
        const scores = [];
        for (const ck of cardKeys)
            scores.push(cardScores.get(ck) ?? null);
        serverScores.set(serverId, computeServerScore(scores));
    }
    return { jobScores, cardScores, serverScores };
}
