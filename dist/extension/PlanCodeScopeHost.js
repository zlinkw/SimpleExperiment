"use strict";
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
exports.supportsPlanCodeScope = exports.planExecutionSourceDigest = void 0;
exports.planManifestPathSafe = planManifestPathSafe;
exports.runSourceManifest = runSourceManifest;
exports.codeInventoryBatches = codeInventoryBatches;
exports.resolvePlanExecutionSource = resolvePlanExecutionSource;
exports.verifyWorkerPlanSource = verifyWorkerPlanSource;
exports.verifyLocalPlanSource = verifyLocalPlanSource;
exports.inspectPlanCodeSlots = inspectPlanCodeSlots;
const node_crypto_1 = require("node:crypto");
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
const resolving = new WeakMap();
// Different Plans on one Worker share execution capacity, never their source facts.
const workerReads = new WeakMap();
function workerRead(host, workerId, signal, read) {
    let lanes = workerReads.get(host);
    if (!lanes) {
        lanes = new Map();
        workerReads.set(host, lanes);
    }
    const previous = lanes.get(workerId) || Promise.resolve();
    const task = previous.catch(() => { }).then(() => { signal?.throwIfAborted(); return read(); });
    lanes.set(workerId, task);
    void task.catch(() => { }).finally(() => { if (lanes.get(workerId) === task)
        lanes.delete(workerId); });
    if (!signal)
        return task;
    return new Promise((resolve, reject) => {
        const abort = () => reject(signal.reason || Error("Plan source read cancelled"));
        if (signal.aborted)
            abort();
        else
            signal.addEventListener("abort", abort, { once: true });
        task.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
    });
}
const digest = (manifest) => (0, node_crypto_1.createHash)("sha256").update(JSON.stringify(Object.keys(manifest).sort().map(key => [key, { size: manifest[key].size, sha256: manifest[key].sha256 }]))).digest("hex");
/** Single source of truth for manifest self-verification (also consumed by the C3 HEAD binding). */
exports.planExecutionSourceDigest = digest;
/** Same relative-path safety rules verifyLocalPlanSource enforces before touching the filesystem. */
function planManifestPathSafe(relative) {
    return Boolean(relative) && !relative.startsWith("/") && !/[:\\\x00-\x1f]/.test(relative) && !relative.split("/").some(p => !p || p === "." || p === "..");
}
const supportsPlanCodeScope = (h, workerId) => h.lastWorkerProbes?.[workerId]?.capabilities?.endpoints?.planCodeScope === 1;
exports.supportsPlanCodeScope = supportsPlanCodeScope;
/** This filter is for automatic execution preparation; manual transfer scopes keep their own semantics. */
function runSourceManifest(manifest) {
    const generated = new Set(["work_dirs", "work_dir", "results", "result", "runs", "logs", "log", "outputs", "output", "tmp", "temp", "__pycache__", ".cache", "cache", ".pytest_cache", ".mypy_cache", ".ruff_cache", "wandb", "tensorboard"]);
    return Object.fromEntries(Object.entries(manifest).filter(([file]) => {
        const parts = file.toLowerCase().split("/");
        return !parts.slice(0, -1).some(p => generated.has(p)) && !/\.(?:pyc|pyo|log|pending|writing)$/.test(file.toLowerCase());
    }));
}
/** Verify every manifest file without widening a file into its top-level directory. */
function codeInventoryBatches(manifest) {
    const batches = [];
    let batch = [], bytes = 2;
    for (const file of Object.keys(manifest).sort()) {
        const size = Buffer.byteLength(JSON.stringify(file), "utf8") + 1;
        if (size + 2 > 1048576)
            throw Error("CODE_INVENTORY_PATH_TOO_LARGE");
        if (batch.length && (batch.length >= 5000 || bytes + size > 1048576)) {
            batches.push(batch);
            batch = [];
            bytes = 2;
        }
        batch.push(file);
        bytes += size;
    }
    if (batch.length)
        batches.push(batch);
    return batches;
}
function query(plan, source) {
    return { projectId: plan.projectId, planFile: plan.planFile, planRevision: plan.revision, codeFingerprint: plan.codeFingerprint,
        ...(source ? { executionSource: source } : {}) };
}
function response(plan, value) {
    if (value?.ok !== true || value.compatible !== true || value.readOnly !== true || value.projectId !== plan.projectId
        || value.planFile !== plan.planFile || value.planRevision !== plan.revision || value.codeFingerprint !== plan.codeFingerprint)
        throw Error(value?.error || "PLAN_SOURCE_QUERY_IDENTITY_MISMATCH");
    const source = value.executionSource;
    if (!source?.manifest || Object.keys(source.manifest).length > 4096 || source.digest !== digest(source.manifest)
        || source.manifest[plan.planFile]?.sha256 !== plan.revision)
        throw Error("PLAN_SOURCE_BASELINE_INVALID");
    return source;
}
async function inspect(h, workerId, plan, source, signal) {
    // The HTTP client owns the user-approved 20s inactivity deadline after admission.
    // A caller's cancellation still covers queueing; queue wait is not network inactivity.
    const options = { signal };
    const target = h.workerActionTargets?.().find((row) => row.id === workerId);
    const index = target && h.projectFileObservationIndex?.(h.sftpServerOptions?.(target));
    const load = async () => {
        const value = await workerRead(h, workerId, signal, () => h.client.getWorkerPlanCodeScope(workerId, query(plan, source), options));
        response(plan, value); // Invalid identity or digest is never published into the shared index.
        return value;
    };
    const value = index ? await index.read({ method: "plan.source", paths: source ? Object.keys(source.manifest) : [plan.planFile],
        binding: { projectId: plan.projectId, runId: plan.id || "", revision: plan.revision, sourceDigest: source?.digest || "" }, signal: options.signal }, load) : await load();
    return response(plan, value);
}
/** Frozen source hashes are execution inputs. All destination observations are queried again. */
async function resolvePlanExecutionSource(h, plan, signal) {
    if (plan.executionSource) {
        if (plan.executionSource.digest !== digest(plan.executionSource.manifest)
            || plan.executionSource.manifest[plan.planFile]?.sha256 !== plan.revision)
            throw Error("PLAN_SOURCE_BASELINE_INVALID");
        return plan.executionSource;
    }
    const active = resolving.get(plan);
    if (active)
        return active;
    const candidates = h.workerActionTargets().filter((w) => (0, exports.supportsPlanCodeScope)(h, w.id) && h.lastWorkerProbes[w.id]?.status === "ok");
    if (!candidates.length)
        return undefined;
    const controller = new AbortController();
    const joined = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
    const request = Promise.any(candidates.map(async (worker) => {
        try {
            return await inspect(h, worker.id, plan, undefined, joined);
        }
        catch (error) {
            throw Error(worker.id + ": " + String(error.message || error));
        }
    })).then(source => plan.executionSource = source).catch((error) => {
        throw Error("所需源码无法核实：" + (error.errors || [error]).map((e) => String(e.message || e)).join("；"));
    }).finally(() => { controller.abort(); resolving.delete(plan); });
    resolving.set(plan, request);
    return request;
}
async function verifyWorkerPlanSource(h, workerId, plan, signal) {
    if (!(0, exports.supportsPlanCodeScope)(h, workerId))
        throw Error(workerId + "：请更新 Agent/Scheduler 以按 PLAN 依赖核实源码；未另行派发。");
    const source = await resolvePlanExecutionSource(h, plan, signal);
    if (!source)
        throw Error("PLAN_SOURCE_ORIGINAL_HASH_UNAVAILABLE");
    const checked = await inspect(h, workerId, plan, source, signal);
    if (checked.digest !== source.digest)
        throw Error("PLAN_SOURCE_BASELINE_CHANGED");
    return source;
}
async function verifyLocalPlanSource(root, source, index) {
    const load = async () => {
        const canonical = await fs.realpath(root);
        for (const [relative, expected] of Object.entries(source.manifest)) {
            if (!planManifestPathSafe(relative))
                throw Error("PLAN_SOURCE_PATH_INVALID");
            let file = canonical;
            for (const part of relative.split("/")) {
                file = path.join(file, part);
                if ((await fs.lstat(file)).isSymbolicLink())
                    throw Error("PLAN_SOURCE_LINK: " + relative);
            }
            const stat = await fs.stat(file);
            if (!stat.isFile() || stat.size !== expected.size || stat.size > 2 * 1024 * 1024
                || (0, node_crypto_1.createHash)("sha256").update(await fs.readFile(file)).digest("hex") !== expected.sha256)
                throw Error("PLAN_SOURCE_CHANGED: " + relative + "；仅核实本 PLAN 所需源码和配置，未删除或派发。");
        }
        return { files: source.manifest };
    };
    if (index)
        await index.read({ method: "plan.local-source", paths: Object.keys(source.manifest), binding: { sourceDigest: source.digest } }, load);
    else
        await load();
}
/** Admission checks cannot turn transfer inventory changes into execution version conflicts. */
async function inspectPlanCodeSlots(h, queue, workers, signal) {
    const reads = h.planCodeScopeReads ||= new Map();
    const wanted = new Set();
    let accepting = true;
    const requests = [];
    const pending = queue.plans.filter((p) => p.projectId && p.resultPathPolicy === "declared" && p.jobs.some((j) => j.status === "pending" && !j.commandId));
    for (const plan of pending) {
        for (const w of workers)
            if (w.online && !(0, exports.supportsPlanCodeScope)(h, w.workerId) && w.codeFingerprint !== plan.codeFingerprint)
                (w.codeScopeErrors ||= {})[plan.id] = w.workerId + "：请更新 Agent/Scheduler（planCodeScope=1）以核实本 PLAN 源码；无需重建 PLAN 或重跑其他 job。";
        const ready = workers.filter(w => w.online && (0, exports.supportsPlanCodeScope)(h, w.workerId)
            && (w.gpuSlots?.length || w.idleGpuIds?.length || plan.schedulingMode === "server_prequeue"));
        if (!ready.length)
            continue;
        for (const w of ready) {
            (w.codeScopePending ||= {})[plan.id] = true;
            const target = h.workerActionTargets().find((r) => r.id === w.workerId);
            const key = JSON.stringify([plan.projectId, plan.id, plan.revision, plan.codeFingerprint, w.workerId, target]);
            wanted.add(key);
            let entry = reads.get(key);
            // A read can finish after this round's bounded wait. Keep that result until
            // a later round consumes it, even when polling exceeds the refresh TTL.
            // The actual launch still verifies the frozen source again before sending.
            if (!entry || entry.signal?.aborted || entry.consumed && entry.at && Date.now() - entry.at > 2000) {
                entry = { at: 0, consumed: false, signal, promise: undefined };
                entry.promise = verifyWorkerPlanSource(h, w.workerId, plan, signal).then(source => ({ source }), error => ({ error })).then(value => { entry.at = Date.now(); return value; });
                reads.set(key, entry);
            }
            requests.push(entry.promise.then(({ source, error }) => {
                if (!accepting || signal?.aborted)
                    return;
                entry.consumed = true;
                delete w.codeScopePending[plan.id];
                if (error)
                    (w.codeScopeErrors ||= {})[plan.id] = w.workerId + ": " + String(error.message || error);
                else {
                    plan.executionSource = source;
                    delete w.codeScopeErrors?.[plan.id];
                    (w.compatiblePlans ||= []).push(plan.id);
                }
            }));
        }
    }
    let timer;
    try {
        await Promise.race([Promise.allSettled(requests), new Promise(resolve => { timer = setTimeout(resolve, 350); })]);
    }
    finally {
        accepting = false;
        if (timer)
            clearTimeout(timer);
    }
    for (const [key, entry] of reads)
        if (!wanted.has(key) || entry.consumed && entry.at && Date.now() - entry.at > 2000)
            reads.delete(key);
}
