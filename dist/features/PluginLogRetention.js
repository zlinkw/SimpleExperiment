"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RETAINED_GENERATIONS = exports.MANAGED_LOG_PREFIXES = void 0;
exports.parseConsoleLogName = parseConsoleLogName;
exports.retentionIndex = retentionIndex;
exports.retentionOwnership = retentionOwnership;
exports.isStaleRetentionRow = isStaleRetentionRow;
exports.admissionPreview = admissionPreview;
const node_crypto_1 = require("node:crypto");
// Local plugin log/cache copies are retained per logical job for at most the current run plus one
// previous run. Candidates are derived from persisted per-attempt queue facts (the same small
// completion facts the reconciler writes before releasing raw text) into an EXACT path ownership
// manifest — never basename substring guesses. Shared files (scheduler logs) are reference-counted:
// a path is proposed only when every referencing generation is terminal AND outside the retained
// window. Active, paused or unknown generations are protected even when a trusted terminal fact
// exists; trusted statuses only refine an already-terminal live status.
exports.MANAGED_LOG_PREFIXES = [
    "simple_cluster/console_logs/",
    "simple_cluster/tmux_logs/",
    "simple_cluster/tmp/cluster_scheduler/",
    "simple_cluster/tmp/tmux_logs/",
    "simple_cluster/tmp/console_logs/",
    "tmp/console_logs/",
    "tmp/tmux_logs/",
    "tmp/cluster_scheduler/",
];
const terminalStates = new Set(["completed", "failed", "cancelled"]);
exports.RETAINED_GENERATIONS = 2;
const normalizeLogPath = (value) => String(value || "").replace(/\\/g, "/").replace(/^\.\//, "");
const isManagedLogPath = (relative) => !relative.split("/").some(part => !part || part === "." || part === "..")
    && exports.MANAGED_LOG_PREFIXES.some(prefix => relative.startsWith(prefix));
// Mirrors cluster_scheduler.slug(): console-log filenames embed slug()ed identity fields.
function slug(value, fallback, limit) {
    const raw = String(value ?? "").trim();
    let text = raw.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^[.-_]+|[.-_]+$/g, "") || fallback;
    if (text.length > limit) {
        const digest = (0, node_crypto_1.createHash)("sha1").update(text).digest("hex").slice(0, 8);
        text = text.slice(0, Math.max(8, limit - 9)).replace(/[.-_]+$/g, "") + "-" + digest;
    }
    return text;
}
// Scheduler runs keep one log per plan file (same spelling the scheduler-log viewer reads).
function schedulerLogPath(planFile) {
    return `simple_cluster/tmp/cluster_scheduler/${String(planFile).replace(/[^a-z0-9]/gi, "_")}.log`;
}
// Structured console-log grammar: exp-…__case-…__seed-…__worker-…__gpu-…__status-…__session-….log
// (the digest fallback keeps the same key=value fields). Parsing yields EXACT field ownership.
function parseConsoleLogName(basename) {
    const stem = basename.replace(/\.log$/i, "");
    const fields = new Map();
    for (const part of stem.split("__")) {
        const split = part.indexOf("-");
        if (split > 0)
            fields.set(part.slice(0, split), part.slice(split + 1));
    }
    const session = fields.get("session");
    if (!session)
        return undefined;
    return { session, index: fields.get("exp"), case: fields.get("case"), seed: fields.get("seed") };
}
/** Logical identity: canonical plan + stable task position; worker, GPU and session churn share one generation. */
function collectGenerations(queue, fold) {
    const tasks = new Map();
    for (const plan of queue?.plans || []) {
        const planFile = normalizeLogPath(String(plan.planFile || ""));
        const at = Date.parse(String(plan.enqueuedAt || "")) || 0;
        const sharedSchedulerLog = schedulerLogPath(planFile);
        for (const job of plan.jobs || []) {
            const taskKey = `${fold(planFile)}|${Number.isInteger(job.index) ? job.index : -1}|${fold(String(job.case ?? ""))}|${fold(String(job.seed ?? ""))}`;
            const generations = tasks.get(taskKey) || new Map();
            tasks.set(taskKey, generations);
            // One generation per STABLE RUN (plan.id): retries and extra batches of the same run merge
            // into that run's single generation instead of adding generations of their own.
            const add = (id, status, attempt, logPath, tmuxSession, workerId) => {
                const liveStatus = String(status || "unknown");
                const terminal = terminalStates.has(liveStatus);
                const generation = {
                    id, taskKey, planFile, at, attempt: Number.isFinite(Number(attempt)) ? Number(attempt) : 0,
                    terminal, active: !terminal,
                    sessions: new Set(), paths: new Set([sharedSchedulerLog]),
                    workers: new Set(),
                };
                const relative = normalizeLogPath(String(logPath || ""));
                if (relative && !/^[A-Za-z]:/.test(relative) && !relative.startsWith("/") && isManagedLogPath(fold(relative)))
                    generation.paths.add(relative);
                const session = String(tmuxSession || "");
                if (session && /^[A-Za-z0-9._-]+$/.test(session)) {
                    generation.sessions.add(fold(session));
                    generation.paths.add(`simple_cluster/tmux_logs/${session}.log`);
                }
                const worker = String(workerId || "").trim();
                if (worker)
                    generation.workers.add(worker);
                const existing = generations.get(id);
                if (!existing)
                    generations.set(id, generation);
                else {
                    existing.sessions = new Set([...existing.sessions, ...generation.sessions]);
                    existing.paths = new Set([...existing.paths, ...generation.paths]);
                    existing.workers = new Set([...existing.workers, ...generation.workers]);
                    existing.attempt = Math.max(existing.attempt, generation.attempt);
                    // A generation is terminal only while every merged observation is terminal; any live or
                    // unknown sibling keeps the whole generation protected regardless of trusted facts.
                    existing.terminal = existing.terminal && terminal;
                    existing.active = existing.active || generation.active;
                    if (generation.active)
                        existing.terminal = false;
                }
            };
            for (const record of job.history || [])
                add(String(plan.id), record.status, record.attempt, record.logPath, record.tmuxSession, record.workerId);
            add(String(plan.id), job.status, job.attempt, job.logPath, job.tmuxSession, job.workerId);
        }
    }
    return tasks;
}
function retentionIndex(queue, options = {}) {
    const caseInsensitive = options.caseInsensitive !== false;
    const fold = (value) => (caseInsensitive ? value.toLowerCase() : value);
    const tasks = collectGenerations(queue, fold);
    const owners = new Map();
    const staleSessions = new Set();
    const protectedSessions = new Set();
    for (const [taskKey, generations] of tasks) {
        const ordered = [...generations.values()]
            .sort((a, b) => b.at - a.at || b.attempt - a.attempt || (b.id > a.id ? 1 : -1));
        ordered.forEach((generation, index) => {
            const stale = index >= exports.RETAINED_GENERATIONS && generation.terminal && !generation.active;
            for (const session of generation.sessions)
                (stale ? staleSessions : protectedSessions).add(session);
            for (const path of generation.paths) {
                const key = fold(normalizeLogPath(path));
                const owner = owners.get(key);
                if (!owner)
                    owners.set(key, { row: { path: normalizeLogPath(path), planFile: generation.planFile, taskKey, reason: "" }, stale, anyProtected: !stale });
                else {
                    owner.stale = owner.stale && stale;
                    owner.anyProtected = owner.anyProtected || !stale;
                }
            }
        });
    }
    const rows = [];
    const byPath = new Map();
    for (const [key, owner] of owners) {
        // Reference-counted: a shared log stays while ANY referencing generation is retained or active.
        if (owner.anyProtected || !owner.stale)
            continue;
        const relative = owner.row.path;
        if (!isManagedLogPath(fold(relative)))
            continue;
        owner.row.reason = `已超出该任务两代保留窗口（当前＋上一次，归属清单精确路径）：${owner.row.taskKey.slice(0, 120)}`;
        rows.push(owner.row);
        byPath.set(key, owner.row);
    }
    rows.sort((a, b) => a.path.localeCompare(b.path));
    const ownedPaths = new Set();
    for (const key of owners.keys())
        if (isManagedLogPath(key))
            ownedPaths.add(key);
    return { rows, byPath, staleSessions, protectedSessions, ownedPaths, caseInsensitive };
}
/** Exact ownership class of one managed path: stale rows may enter candidates, protected rows
 * (current/previous/active generations) must never do so, and unowned managed files are shown
 * read-only — they belong to no generation the manifest can name, so nothing may be deleted. */
function retentionOwnership(index, relativePath) {
    const normalized = normalizeLogPath(relativePath);
    if (!normalized)
        return "unmanaged";
    const fold = (value) => (index.caseInsensitive ? value.toLowerCase() : value);
    if (!isManagedLogPath(fold(normalized)))
        return "unmanaged";
    const key = fold(normalized);
    if (index.byPath.has(key))
        return "stale";
    if (index.ownedPaths.has(key))
        return "protected";
    if (fold(normalized).startsWith("simple_cluster/console_logs/")) {
        const parsed = parseConsoleLogName(normalized.slice(normalized.lastIndexOf("/") + 1));
        if (parsed) {
            const session = fold(parsed.session);
            if (index.protectedSessions.has(session))
                return "protected";
        }
    }
    return "unowned";
}
function isStaleRetentionRow(index, relativePath) {
    const normalized = normalizeLogPath(relativePath);
    if (!normalized)
        return undefined;
    const fold = (value) => (index.caseInsensitive ? value.toLowerCase() : value);
    if (!isManagedLogPath(fold(normalized)))
        return undefined;
    const row = index.byPath.get(fold(normalized));
    if (row)
        return row;
    // Only the persisted exact path manifest may authorize deletion. Console filenames
    // contain no run/project identity; parsing a session string cannot prove ownership.
    return undefined;
}
/**
 * Read-only admission preview for one INCOMING run of a plan file. It virtually joins the new
 * generation first: after landing, the retained window is {incoming, newest existing}, so every
 * older existing generation of each affected taskKey is due to leave the window. Landing is only
 * allowed once every leaving generation satisfies BOTH rules:
 *  - it is terminal: active, paused or unknown generations hold admission even when their files
 *    are already gone (reads/transfers in flight are covered by the deletion executor's recheck);
 *  - every path it owns (and that no retained generation still references) is OBSERVED ABSENT on
 *    the Worker that physically ran that generation. The caller observes exact paths in batches
 *    per leaving generation; a missing, errored or unanswered observation is NEVER "absent".
 * Independent plan files never hold each other: only taskKeys derived from the target plan file
 * are evaluated, and shared paths (per-plan scheduler log) stay reference-counted.
 */
async function admissionPreview(queue, planFile, options) {
    const caseInsensitive = options.caseInsensitive !== false;
    const fold = (value) => (caseInsensitive ? value.toLowerCase() : value);
    const target = fold(normalizeLogPath(planFile));
    const tasks = collectGenerations(queue, fold);
    const affected = new Set();
    const orderedByTask = new Map();
    for (const [taskKey, generations] of tasks) {
        const ordered = [...generations.values()].sort((a, b) => b.at - a.at || b.attempt - a.attempt || (b.id > a.id ? 1 : -1));
        orderedByTask.set(taskKey, ordered);
        if (ordered.length && fold(normalizeLogPath(ordered[0].planFile)) === target)
            affected.add(taskKey);
    }
    if (!affected.size)
        return { allowed: true, taskKeys: [] };
    // Retained references: newest existing generation per affected taskKey (kept next to incoming)
    // plus every generation of unaffected taskKeys (their windows are untouched by this run).
    const retainedPaths = new Set();
    for (const [taskKey, ordered] of orderedByTask) {
        const generations = taskKey && affected.has(taskKey) ? ordered.slice(0, 1) : ordered;
        for (const generation of generations)
            for (const path of generation.paths)
                retainedPaths.add(fold(normalizeLogPath(path)));
    }
    const pending = [];
    for (const taskKey of affected) {
        const leaving = (orderedByTask.get(taskKey) || []).slice(1);
        for (const generation of leaving) {
            if (!generation.terminal || generation.active) {
                pending.push({ taskKey, planFile, reason: "old-generation-active", paths: [], workers: [...generation.workers] });
                continue;
            }
            const present = [];
            const failed = [];
            const checked = [];
            for (const path of generation.paths) {
                const key = fold(normalizeLogPath(path));
                if (!retainedPaths.has(key))
                    checked.push(path);
            }
            if (checked.length) {
                const outcomes = await options.observe(checked, { workers: [...generation.workers] });
                for (const path of checked) {
                    const outcome = outcomes.get(path);
                    if (outcome === "present")
                        present.push(path);
                    else if (outcome !== "absent")
                        failed.push(path);
                }
            }
            if (failed.length)
                pending.push({ taskKey, planFile, reason: "existence-check-failed", paths: failed, workers: [...generation.workers] });
            else if (present.length)
                pending.push({ taskKey, planFile, reason: "old-generation-still-present", paths: present, workers: [...generation.workers] });
        }
    }
    if (!pending.length)
        return { allowed: true, taskKeys: [...affected] };
    return { allowed: false, pending };
}
