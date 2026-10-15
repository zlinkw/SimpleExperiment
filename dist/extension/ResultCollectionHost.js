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
exports.ResultCollectionHost = void 0;
exports.resultCollectionHost = resultCollectionHost;
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
const FreshResults_1 = require("../results/FreshResults");
const LatestResultExport_1 = require("../results/LatestResultExport");
const hosts = new WeakMap();
function resultCollectionHost(host) {
    let service = hosts.get(host);
    if (!service) {
        service = new ResultCollectionHost(host);
        hosts.set(host, service);
    }
    return service;
}
class ResultCollectionHost {
    h;
    request;
    again = false;
    timer;
    seen = new Set();
    scope = "";
    visibleScope = "";
    constructor(h) {
        this.h = h;
    }
    refreshOnVisible() {
        const context = this.h.captureProjectContext();
        const key = context.root + ":" + context.generation;
        if (this.visibleScope === key)
            return;
        this.visibleScope = key;
        void this.update().catch((error) => this.h.recordActionError?.({ command: "updateResultSummary", message: String(error.message || error) }));
    }
    observe(snapshot) {
        if (snapshot.queryComplete !== true || snapshot.capabilities?.resultCollection !== 1 || this.h.panelDisposed)
            return;
        const scope = this.h.captureProjectContext().root || "";
        if (scope !== this.scope) {
            this.scope = scope;
            this.seen.clear();
        }
        const completed = (snapshot.tasks || []).filter((task) => task.observation?.result?.verified === true
            && task.observation.result.runId === task.commandId && task.observation.result.status === "completed"
            && (!task.observation.tmux || task.observation.tmux.dead === true));
        const keys = completed.map((task) => scope + "\0" + snapshot.workerId + "\0" + task.commandId + ":" + task.runtimeDiagnostics?.state + ":" + task.runtimeDiagnostics?.scanComplete + ":" + task.runtimeDiagnostics?.count);
        const fresh = keys.filter((key) => !this.seen.has(key));
        if (!fresh.length)
            return;
        fresh.forEach((key) => this.seen.add(key));
        this.again = true;
        if (this.timer || this.request)
            return;
        this.timer = setTimeout(() => {
            this.timer = undefined;
            if (this.h.panelDisposed || this.h.captureProjectContext().root !== scope)
                return;
            void this.update().then((report) => { if (!report.current)
                fresh.forEach((key) => this.seen.delete(key)); }).catch((error) => {
                fresh.forEach((key) => this.seen.delete(key));
                this.h.recordActionError?.({ command: "updateResultSummary", message: String(error.message || error) });
            });
        }, 250);
        this.timer.unref?.();
    }
    async update(signal) {
        if (this.request)
            return this.request;
        const run = (async () => {
            let value;
            do {
                this.again = false;
                value = await this.collect(signal);
            } while (this.again && !signal?.aborted && !this.h.panelDisposed);
            return value;
        })();
        this.request = run;
        try {
            return await run;
        }
        finally {
            if (this.request === run)
                this.request = undefined;
        }
    }
    async collect(signal) {
        const h = this.h, context = h.captureProjectContext(), root = context.root;
        if (!root)
            throw Error("请先打开当前实验项目。");
        const targets = h.workerCodeSyncTargets();
        const key = () => JSON.stringify(h.workerCodeSyncTargets().map((row) => [row.id, row.host, row.user, row.port, row.remotePath, row.condaEnv]));
        const binding = key(), client = h.client;
        const current = () => !signal?.aborted && h.projectContextIsCurrent(context) && key() === binding;
        const check = () => { if (!current())
            throw Error("结果查询已取消或项目/服务器配置已变化。"); };
        const inputs = await h.currentResultPlanInputs();
        check();
        const plans = [], declarationErrors = [];
        for (const plan of inputs) {
            let jobs;
            for (const worker of targets) {
                try {
                    const response = await client.getWorkerTasks(worker.id, { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
                        discovery: { planFile: plan.planFile, condaEnv: worker.condaEnv || "", collect: true } });
                    check();
                    if (response.queryComplete !== true || response.capabilities?.resultCollection !== 1)
                        throw Error("请更新此 Worker 的 Agent/Scheduler，以支持直接结果读取");
                    if (!Array.isArray(response.declaredJobs) || !response.declaredJobs.length || response.declaredJobs.some((job) => job.planHash !== plan.revision))
                        throw Error("服务器 PLAN 与当前本机声明不一致，未使用旧路径");
                    jobs = response.declaredJobs;
                    break;
                }
                catch (error) {
                    declarationErrors.push(plan.planFile + " · " + worker.id + "：" + String(error.message || error));
                }
            }
            if (!jobs)
                continue;
            const declared = jobs.map((job) => ({ planFile: (0, FreshResults_1.resultPath)(plan.planFile), index: Number(job.index), case: String(job.case), seed: Number(job.seed),
                output_dir: (0, FreshResults_1.resultPath)(job.output_dir), result_csv: job.result_csv ? (0, FreshResults_1.resultPath)(job.result_csv) : "", mode: plan.mode }));
            if (declared.some((job) => !Number.isInteger(job.index) || !Number.isInteger(job.seed) || !job.case || !["train", "test", "train_test"].includes(job.mode)))
                throw Error("PLAN_JOB_DECLARATION_INVALID");
            plans.push({ ...plan, jobs: declared });
        }
        const declarations = plans.flatMap(plan => plan.jobs.map(job => ({ ...job, collect: true })));
        const snapshots = await Promise.all(targets.map(async (worker) => {
            const values = [];
            try {
                for (let offset = 0; offset < Math.max(1, declarations.length); offset += 500) {
                    const value = await client.getWorkerTasks(worker.id, { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000),
                        queries: [], declarations: declarations.slice(offset, offset + 500) });
                    check();
                    if (value.queryComplete !== true || value.capabilities?.resultCollection !== 1)
                        throw Error(value.error || "请更新 Agent/Scheduler：直接结果查询不可用");
                    values.push(value);
                }
                return { workerId: worker.id, queryComplete: true, tasks: values.flatMap(value => value.tasks || []), declaredResults: values.flatMap(value => value.declaredResults || []) };
            }
            catch (error) {
                return { workerId: worker.id, queryComplete: false, error: String(error.message || error) };
            }
        }));
        check();
        const receive = async (workerId, files) => {
            const capability = await h.simpleSftpCapability("sync.downloadMappedPaths");
            check();
            if (capability.methodOptions?.["sync.downloadMappedPaths"]?.memoryOnly !== true
                || capability.methodOptions?.["sync.downloadMappedPaths"]?.memoryWrapperResults !== true)
                throw Error("请更新 SimpleSFTP：需要内存指标读取能力");
            const server = h.sftpServerOptions(targets.find((row) => row.id === workerId));
            const output = [];
            const batches = [];
            for (const file of files) {
                const batch = batches[batches.length - 1];
                if (batch && batch.reduce((sum, row) => sum + row.bytes, 0) + file.bytes <= 4 * 1024 * 1024)
                    batch.push(file);
                else
                    batches.push([file]);
            }
            for (const batch of batches) {
                const response = await h.simpleSftpApiCall("sync.downloadMappedPaths", { server, localPath: root,
                    entries: batch.map(file => ({ ...file, localRelativePath: file.remotePath })), memoryOnly: true, metricsOnly: true, wrapperResults: true,
                    maxFileBytes: 4 * 1024 * 1024, maxBatchBytes: 4 * 1024 * 1024, confirm: true, pathConfirmed: true, signal });
                check();
                if (!response?.memoryOnly || response.ok === false || response.entries?.length !== batch.length)
                    throw Error("RESULT_MEMORY_READ_INCOMPLETE");
                for (const entry of response.entries) {
                    const file = batch.find(row => row.remotePath === entry.remotePath);
                    if (!file || typeof entry.dataBase64 !== "string" || entry.dataBase64.length > 4 * Math.ceil(file.bytes / 3))
                        throw Error("RESULT_MEMORY_READ_UNDECLARED");
                    const bytes = Buffer.from(entry.dataBase64, "base64");
                    if (bytes.toString("base64") !== entry.dataBase64 || bytes.length !== file.bytes || entry.sha256 !== file.sha256 || entry.bytes !== file.bytes)
                        throw Error("RESULT_CONTENT_CHANGED: " + file.remotePath);
                    output.push({ remotePath: file.remotePath, text: new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes) });
                }
            }
            return output;
        };
        const result = await (0, FreshResults_1.collectFreshResults)(plans, snapshots, receive, (text, job) => h.parseFreshResultMetric(text, job), h.resultAdapterRules().planDatasetMapping || {}, current);
        check();
        // A failed declaration cannot make an entire PLAN silently disappear from a new export.
        result.errors.push(...declarationErrors);
        for (const plan of inputs.filter((row) => !plans.some(item => item.planFile === row.planFile))) {
            result.jobs.push({ planFile: plan.planFile, index: -1, case: "", seed: 0, outputDir: "", state: "unknown", error: "无法核实当前 PLAN 声明" });
        }
        if (inputs.length && !plans.length)
            result.querySucceeded = false;
        for (const plan of inputs) {
            if ((0, FreshResults_1.resultDigest)(await fs.readFile(path.join(root, (0, FreshResults_1.resultPath)(plan.planFile)), "utf8")) !== plan.revision)
                throw Error("PLAN 已变化，未发布过期结果。");
        }
        check();
        const tables = { ...(0, FreshResults_1.freshResultTables)(result, plans, h.resultAdapterRules().derivedMetric),
            ...Object.fromEntries(Object.entries((0, FreshResults_1.freshResultTables)(result, plans, h.resultAdapterRules().derivedMetric, true)).map(([key, value]) => ["review/" + key, value])) };
        const directory = h.resultCsvDirectory || "experiments/results";
        const published = await (0, LatestResultExport_1.publishLatestResult)(root, directory, result, tables, current);
        check();
        const coverage = Object.fromEntries(inputs.map((plan) => [plan.planFile, {
                expected: plans.find(row => row.planFile === plan.planFile)?.jobs.length || plan.jobCount || 0,
                completed: result.jobs.filter(job => job.planFile === plan.planFile && job.state === "complete" && job.completionState === "verified" && job.executionState !== "failed").length,
                artifactsComplete: result.jobs.filter(job => job.planFile === plan.planFile && job.state === "complete").length,
                reviewRequired: result.jobs.filter(job => job.planFile === plan.planFile && job.state === "complete" && (job.completionState !== "verified" || job.executionState === "failed")).length
            }]));
        const report = { source: "active_query", observedAt: result.observedAt, current: published, merged: published, downloaded: result.records.length > 0, planCoverage: coverage,
            plans: plans.map(plan => plan.planFile), discovered: inputs.length, included: [...new Set(result.records.map(row => row.planFile))],
            missing: result.jobs.filter(job => job.state !== "complete").map(job => job.planFile + " · " + job.case + "/" + job.seed + "：" + (job.error || job.state)),
            skipped: result.errors, jobs: result.jobs, completed: result.jobs.filter(job => job.state === "complete" && job.completionState === "verified" && job.executionState !== "failed").length,
            reviewRequired: result.jobs.filter(job => job.state === "complete" && (job.completionState !== "verified" || job.executionState === "failed")).length,
            artifactsComplete: result.jobs.filter(job => job.state === "complete").length, expected: Object.values(coverage).reduce((sum, row) => sum + row.expected, 0),
            tables: Object.values(tables).map(table => ({ tableKey: table.tableKey, dataset: table.dataset, relativePath: table.relativePath, markdownPath: table.markdownPath })),
            results: result.records.map(row => ({ planFile: row.planFile, workerId: row.workerId, runId: row.runId, dimensions: { case: row.case, seed: row.seed, method: row.method,
                    dataset: row.dataset, rate_percent: row.rate, eval_protocol: row.endpoint }, metrics: row.metrics, sourceFiles: [{ path: row.jobDir }],
                completionState: result.jobs.find(job => job.commandId === row.runId)?.completionState,
                runtimeDiagnostics: result.jobs.find(job => job.commandId === row.runId)?.runtimeDiagnostics })) };
        h.resultsSummary = report;
        const { results: _records, tables: _tables, jobs: _jobs, ...brief } = report;
        h.resultSyncReport = brief;
        if (published)
            await h.refreshLocalResultCatalogForProject(context);
        h.postState?.();
        return report;
    }
}
exports.ResultCollectionHost = ResultCollectionHost;
