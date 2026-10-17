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
exports.resultDigest = void 0;
exports.resultPath = resultPath;
exports.collectFreshResults = collectFreshResults;
exports.freshResultTables = freshResultTables;
const node_crypto_1 = require("node:crypto");
const NativeResultManifest_1 = require("./NativeResultManifest");
const Tables = __importStar(require("./ProjectResultTables"));
const RuntimeDiagnostics_1 = require("../features/RuntimeDiagnostics");
function resultPath(value) {
    if (!value || value.startsWith("/") || /[:\\\x00-\x1f*?]/.test(value)
        || value.split("/").some(part => !part || [".", "..", ".git", "clean_dir"].includes(part)))
        throw Error("RESULT_PATH_INVALID: " + value);
    return value;
}
const resultDigest = (text) => (0, node_crypto_1.createHash)("sha256").update(text, "utf8").digest("hex");
exports.resultDigest = resultDigest;
/** Coalesce only simultaneous reads in this invocation; failed batches are isolated per job.
 * No cached bytes survive a chunk, and every consumer still verifies its own exact proof. */
function batchResultReads(receive, current) {
    let pending = [];
    return (worker, files) => new Promise((resolve, reject) => {
        pending.push({ worker, files, resolve, reject });
        if (pending.length !== 1)
            return;
        queueMicrotask(() => {
            const requests = pending;
            pending = [];
            const groups = new Map();
            for (const request of requests) {
                const group = groups.get(request.worker) || [];
                group.push(request);
                groups.set(request.worker, group);
            }
            for (const [id, group] of groups)
                void (async () => {
                    const batches = [];
                    let bytes = 0;
                    for (const request of group) {
                        const size = request.files.reduce((sum, file) => sum + file.bytes, 0);
                        if (!batches.length || bytes + size > 4 * 1024 * 1024) {
                            batches.push([]);
                            bytes = 0;
                        }
                        batches[batches.length - 1].push(request);
                        bytes += size;
                    }
                    for (const batch of batches) {
                        try {
                            if (!current())
                                throw Error("结果查询已取消或工作区已变化");
                            const values = await receive(id, batch.flatMap(request => request.files));
                            // Exact membership/count is checked per consumer; never hide duplicates or undeclared files.
                            const expected = new Set(batch.flatMap(request => request.files.map(file => file.remotePath)));
                            if (values.some(value => !expected.has(value.remotePath)))
                                throw Error("RESULT_MEMORY_READ_UNDECLARED");
                            for (const request of batch)
                                request.resolve(values.filter(value => request.files.some(file => file.remotePath === value.remotePath)));
                        }
                        catch (error) {
                            for (const request of batch) {
                                if (batch.length === 1 || !current()) {
                                    request.reject(error);
                                    continue;
                                }
                                try {
                                    request.resolve(await receive(id, request.files));
                                }
                                catch (isolated) {
                                    request.reject(isolated);
                                }
                            }
                        }
                    }
                })().catch(error => group.forEach(request => request.reject(error)));
        });
    });
}
/** Each invocation owns its inputs. No disk registry, previous rows, or queue can fill a missing result. */
async function collectFreshResults(plans, snapshots, receive, parse, mappings = {}, current = () => true) {
    const result = { observedAt: new Date().toISOString(), jobs: [], records: [], errors: [], querySucceeded: false };
    const online = snapshots.filter(row => row.queryComplete === true && !row.error);
    result.errors = snapshots.filter(row => !online.includes(row)).map(row => row.workerId + "：" + (row.error || "实时查询未完成"));
    result.querySucceeded = online.length > 0;
    const read = batchResultReads(receive, current);
    const entries = plans.flatMap(plan => plan.jobs.map(job => ({ plan, job })));
    // At most sixteen jobs retain raw bytes at once; preserve declaration order after joining.
    for (let offset = 0; offset < entries.length; offset += 16) {
        const settled = await Promise.allSettled(entries.slice(offset, offset + 16).map(async ({ plan, job }) => {
            const result = { observedAt: "", jobs: [], records: [], errors: [], querySucceeded: true };
            if (!current())
                throw Error("结果查询已取消或工作区已变化");
            resultPath(job.output_dir);
            if (job.result_csv)
                resultPath(job.result_csv);
            const item = { planFile: plan.planFile, index: job.index, case: job.case, seed: job.seed, outputDir: job.output_dir, state: "unknown" };
            result.jobs.push(item);
            const tasks = online.flatMap(snapshot => (snapshot.tasks || []).filter((task) => task.outputDir === job.output_dir));
            if (tasks.some(task => task.observation?.queryError || task.observation?.tmux && !task.observation.tmux.dead)) {
                item.state = "incomplete";
                item.executionState = tasks.some(task => task.observation?.queryError) ? "unknown" : "running";
                return result;
            }
            const candidates = online.flatMap(snapshot => (snapshot.declaredResults || [])
                .filter((row) => row.outputDir === job.output_dir && row.index === job.index)
                .map((row) => ({ ...row, workerId: snapshot.workerId })));
            const valid = candidates.filter(row => row.completed === true && row.runId && Array.isArray(row.files) && row.files.length);
            if (!valid.length) {
                const issues = candidates.filter(row => row.error);
                item.state = issues.length || candidates.length < snapshots.length ? "unknown"
                    : candidates.every(row => row.resultState === "missing") ? "missing" : "incomplete";
                item.error = issues.map(row => row.workerId + "：" + row.error).join("；") || undefined;
                return result;
            }
            const signatures = new Set(valid.map(row => JSON.stringify([row.runId, row.files.map((file) => [file.remotePath, file.bytes, file.sha256])])));
            if (signatures.size !== 1) {
                item.state = "conflict";
                item.error = "服务器副本的执行身份或指标内容冲突";
                return result;
            }
            for (const source of valid) {
                try {
                    const manifestPath = job.output_dir + "/artifact_manifest.json";
                    const needed = [manifestPath, ...(job.mode === "train" ? [] : [job.result_csv])];
                    if (source.files.length !== needed.length || source.files.some((file) => !needed.includes(resultPath(file.remotePath))
                        || !Number.isSafeInteger(file.bytes) || file.bytes <= 0 || file.bytes > 4 * 1024 * 1024 || !/^[a-f0-9]{64}$/.test(file.sha256)))
                        throw Error("RESULT_FILES_INVALID");
                    const files = await read(source.workerId, source.files);
                    if (files.length !== needed.length || new Set(files.map(file => file.remotePath)).size !== needed.length)
                        throw Error("RESULT_FILES_INCOMPLETE");
                    for (const file of files) {
                        const expected = source.files.find((row) => row.remotePath === file.remotePath);
                        if (!expected || typeof file.text !== "string" || Buffer.byteLength(file.text, "utf8") !== expected.bytes || (0, exports.resultDigest)(file.text) !== expected.sha256)
                            throw Error("RESULT_CONTENT_CHANGED: " + file.remotePath);
                    }
                    const manifest = files.find(file => file.remotePath === manifestPath);
                    const report = (0, NativeResultManifest_1.verifyNativeResult)(manifest.text, (0, exports.resultDigest)(manifest.text), { commandId: source.runId, index: job.index, case: job.case,
                        seed: job.seed, outputDir: job.output_dir, collectionResultCsv: job.result_csv }, job.mode, true);
                    if (report.planFile && report.planFile !== job.planFile)
                        throw Error("RESULT_MANIFEST_PLAN_MISMATCH");
                    const metricProof = source.files.find((file) => file.remotePath === job.result_csv);
                    if (metricProof && report.sha256?.[job.result_csv] && report.sha256[job.result_csv] !== metricProof.sha256)
                        throw Error("RESULT_METRIC_HASH_CHANGED");
                    const rows = job.mode === "train" ? [] : parse(files.find(file => file.remotePath === job.result_csv).text, job);
                    if (job.mode !== "train" && !rows.length)
                        throw Error("RESULT_METRICS_EMPTY");
                    const records = rows.map(row => {
                        const dims = row.dimensions || {};
                        if (String(dims.case) !== job.case || String(dims.seed) !== String(job.seed))
                            throw Error("RESULT_METRIC_JOB_MISMATCH");
                        const metrics = {};
                        for (const [key, raw] of Object.entries(row.metrics || {})) {
                            const value = raw?.value ?? raw;
                            if (value !== "" && value != null && Number.isFinite(Number(value)))
                                metrics[key] = Number(value);
                        }
                        const trainRate = Number(dims.train_rate);
                        const rate = dims.rate_percent || (dims.train_rate !== "" && dims.train_rate != null && Number.isFinite(trainRate)
                            ? String(Number((trainRate * (Math.abs(trainRate) <= 1 ? 100 : 1)).toPrecision(12))) : "");
                        const mapped = mappings[plan.planFile]?.datasets;
                        return { planFile: plan.planFile, workerId: source.workerId, case: job.case, seed: String(job.seed),
                            method: dims.method || plan.planFile.split("/").pop().replace(/\.ya?ml$/i, ""),
                            dataset: dims.dataset || (mapped?.length === 1 ? mapped[0] : ""), rate, endpoint: dims.eval_protocol || dims.split || "",
                            metrics, runId: source.runId, revision: plan.revision, jobDir: job.output_dir };
                    });
                    if (records.length) {
                        const check = Tables.emptyTableRegistry();
                        check.plans[plan.planFile] = { revision: plan.revision, expectedSeeds: 1, records };
                        Tables.buildTables(check, { partial: true });
                    }
                    item.state = "complete";
                    item.commandId = source.runId;
                    item.workerId = source.workerId;
                    item.sources = source.files;
                    const panes = tasks.filter(task => task.commandId === source.runId).map(task => task.observation?.tmux).filter(Boolean);
                    item.executionState = panes.some(pane => pane.exitCode != null && pane.exitCode !== 0) ? "failed"
                        : panes.length ? "exited" : "missing";
                    item.exitCode = panes.find(pane => pane.exitCode != null && pane.exitCode !== 0)?.exitCode ?? panes.find(pane => pane.exitCode != null)?.exitCode ?? source.exitCode;
                    if (Number.isInteger(item.exitCode))
                        item.executionState = item.exitCode === 0 ? "exited" : "failed";
                    // Prefer positive anomaly evidence from any verified replica. A copied
                    // manifest cannot certify that the source console log was inspected.
                    const evidence = valid.map(row => (0, RuntimeDiagnostics_1.runtimeEvidence)(row.runtimeDiagnostics, source.runId));
                    item.runtimeDiagnostics = evidence.find(row => row.count > 0) || evidence.find(row => row.state === "clear" && row.scanComplete)
                        || (0, RuntimeDiagnostics_1.runtimeEvidence)(source.runtimeDiagnostics, source.runId);
                    item.completionState = (0, RuntimeDiagnostics_1.completionState)(item.runtimeDiagnostics, source.runId);
                    if (source.executionStatus === "failed" && item.exitCode == null) {
                        if (item.completionState === "verified")
                            item.completionState = "unverified";
                        result.errors.push(plan.planFile + " · " + job.case + "/" + job.seed + "：原清单记录 failed，但未取得退出码；不判为非零失败，也不计入无异常成功，指标保留待复核。");
                    }
                    if (item.completionState !== "verified")
                        result.errors.push(plan.planFile + " · " + job.case + "/" + job.seed + "：" +
                            (item.completionState === "review_required" ? "完成但有异常，待复核" : "运行日志尚未完整核实") + "；指标保留在待复核表，不自动判为无效。");
                    if (item.executionState === "failed")
                        result.errors.push(plan.planFile + " · " + job.case + "/" + job.seed + "：执行以非零退出码结束；产物状态单独显示为完整。");
                    result.records.push(...records);
                    item.error = undefined;
                    break;
                }
                catch (error) {
                    item.state = "unknown";
                    item.error = source.workerId + "：" + String(error.message || error);
                }
            }
            if (!current())
                throw Error("结果查询已取消或工作区已变化");
            return result;
        }));
        // Drain every in-flight read before cancellation/publication can release its owner.
        const failed = settled.find(row => row.status === "rejected");
        if (failed?.status === "rejected")
            throw failed.reason;
        for (const row of settled)
            if (row.status === "fulfilled") {
                result.jobs.push(...row.value.jobs);
                result.records.push(...row.value.records);
                result.errors.push(...row.value.errors);
            }
    }
    return result;
}
/** Reuse the established metric aliases, grouping, derived metrics and sample standard deviation. */
function freshResultTables(result, plans, derivedMetric, review = false) {
    const registry = Tables.emptyTableRegistry();
    registry.derivedMetric = derivedMetric;
    for (const plan of plans)
        registry.plans[plan.planFile] = { revision: plan.revision, expectedSeeds: plan.seeds.length,
            records: result.records.filter(row => row.planFile === plan.planFile && result.jobs.some(job => job.planFile === row.planFile
                && job.commandId === row.runId && job.case === row.case && String(job.seed) === String(row.seed)
                && (review ? job.completionState !== "verified" || job.executionState === "failed" : job.completionState === "verified" && job.executionState !== "failed"))) };
    const tables = Tables.buildTables(registry, { partial: true });
    if (review)
        for (const table of Object.values(tables)) {
            table.tableKey = "review/" + table.tableKey;
            table.relativePath = "review/" + table.relativePath;
            table.markdownPath = "review/" + table.markdownPath;
            table.name = "待复核 · " + table.name;
            table.markdown = "> 待复核结果：运行异常、执行失败或日志未核实。指标保留，不代表已判定无效；未计入正式无异常汇总。\n\n" + table.markdown;
        }
    return tables;
}
