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
exports.PlanRunHost = void 0;
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
const StateStore_1 = require("../state/StateStore");
const PlanCleanup_1 = require("../features/PlanCleanup");
const PlanRunReplacement_1 = require("../features/PlanRunReplacement");
const TaskLifecycle_1 = require("../features/TaskLifecycle");
const DistributedPlanQueue_1 = require("../features/DistributedPlanQueue");
const PlanCodeScopeHost_1 = require("./PlanCodeScopeHost");
/** Local recoverable inputs, never authority for a remote process or a result. */
class PlanRunHost {
    host;
    root;
    constructor(host, root) {
        this.host = host;
        this.root = root;
    }
    file(id) { return path.join(this.host.context.globalStorageUri.fsPath, "run-submissions", (0, PlanCleanup_1.cleanupDigest)(this.root), (0, PlanCleanup_1.cleanupDigest)(id) + ".json"); }
    async load(id) {
        const value = JSON.parse(await fs.readFile(this.file(id), "utf8"));
        if (value.root !== this.root || value.operationId !== id)
            throw Error("提交恢复记录不属于当前项目。");
        return value;
    }
    async save(body) {
        const id = body.submissionOperationIdLocal;
        if (!id)
            return;
        const input = {};
        for (const key of ["workspace", "planFile", "selectedPlanId", "planRevision", "schedulerOwnerWorkerId", "gitProvenance", "options", "schedulingMode",
            "existingOutputCount", "existingOutputChoice", "distributedSkipJobIndices", "assignedExperimentIndices", "submissionWorkflowId"])
            if (body[key] !== undefined)
                input[key] = body[key];
        input.planFile = (0, PlanCleanup_1.cleanupRelative)(body.planFile || body.options?.planFile);
        const safeInput = JSON.parse(JSON.stringify(input, (key, item) => /token|password|credential|privateKey|authorization/i.test(key) ? undefined : item));
        const value = { root: this.root, operationId: id, input: safeInput, recovery: body.runRecovery || {}, replacement: body.runReplacement || {} };
        // Cleanup preview tokens are opaque approvals; server credentials never enter the input.
        if (value.input.options) {
            delete value.input.options.workers;
            delete value.input.options.agentToken;
            delete value.input.options.env;
        }
        await (0, StateStore_1.atomicWriteText)(this.file(id), JSON.stringify(value));
    }
    async replace(plan, body, validation) {
        const h = this.host, cleanup = h.planCleanupHost(), jobs = validation.jobs, context = h.captureProjectContext();
        const currentNodes = () => h.workerActionTargets().map((row) => [row.id, row.host, row.port, row.user, row.project_dir]);
        // Health checks rebuild the client even when its physical targets stay the
        // same. Bind confirmation to the project and actual configured endpoints.
        const connectionKey = () => (0, PlanCleanup_1.cleanupDigest)([h.effectiveConnectionMode(), h.workerActionTargets().map((row) => [row.id, row.host, row.port, row.user, row.project_dir, row.local_agent_url, row.agent_runtime_dir, row.conda_env])]);
        const connection = connectionKey();
        const assertCurrent = () => {
            if (context.root !== this.root || !h.projectContextIsCurrent(context) || connectionKey() !== connection)
                throw Error("工作区或服务器连接配置已变化，未继续运行。");
        };
        const planFile = (0, PlanCleanup_1.cleanupRelative)(body.planFile || body.options?.planFile || plan?.planFile || plan?.file);
        if (body.options?.planFile && body.options.planFile !== planFile)
            throw Error("提交的 PLAN 路径不一致，未删除或提交。");
        body.planFile = planFile;
        const sourcePlan = { ...plan, projectId: plan?.projectId || (0, DistributedPlanQueue_1.canonicalProjectId)(this.root), planFile: body.planFile,
            revision: body.planRevision, codeFingerprint: plan?.codeFingerprint || h.lastCodeSyncState?.fingerprint };
        const executionSource = body.executionSource || await (0, PlanCodeScopeHost_1.resolvePlanExecutionSource)(h, sourcePlan);
        if (executionSource) {
            await (0, PlanCodeScopeHost_1.verifyLocalPlanSource)(this.root, executionSource);
            body.executionSource = executionSource;
        }
        const expectedFingerprint = executionSource?.digest || h.lastCodeSyncState?.fingerprint || "";
        body.runReplacement ||= {};
        // A launch-ready subset cannot prove other servers' outputs absent. Query
        // every enabled Worker before deriving the missing-only deletion scope.
        if (typeof h.readWorkerTaskSnapshot === "function") {
            const declarations = jobs.map((job) => ({ ...job, mode: validation.execution_mode }));
            const snapshots = await Promise.all(h.workerActionTargets().map(async (worker) => {
                try {
                    const snapshot = await h.readWorkerTaskSnapshot(worker.id, { fresh: true, inventoryOnly: true, declarations, signal: AbortSignal.timeout(15000) });
                    if (!snapshot || snapshot.queryComplete !== true || snapshot.error || snapshot.pending)
                        throw Error(snapshot?.error || "查询未完成");
                    if ((snapshot.declaredResults || []).some((row) => row.error))
                        throw Error("声明产物查询失败");
                    if (!declarations.every((job) => (snapshot.declaredResults || []).some((row) => Number(row.index) === Number(job.index) && row.outputDir === job.output_dir && row.collectionResultCsv === job.result_csv)))
                        throw Error("声明产物查询不完整");
                    return snapshot;
                }
                catch (error) {
                    throw Error(worker.id + "：产物状态未核实；未生成删除清单。" + String(error.message || error));
                }
            }));
            assertCurrent();
            body.workerSubmissionSnapshots = snapshots;
        }
        const completed = new Set();
        const tasks = (body.workerSubmissionSnapshots || []).flatMap((snapshot) => snapshot.tasks || []);
        const executionAllowsCompletion = (output, runId) => !tasks.some((task) => {
            if (task.outputDir !== output || !task.observation)
                return false;
            const observed = task.observation, state = (0, TaskLifecycle_1.taskLifecycle)(observed);
            return !!observed.queryError || !!observed.tmux && !observed.tmux.dead
                || task.commandId === runId && ["failed", "unknown"].includes(state.execution);
        });
        for (const snapshot of body.workerSubmissionSnapshots || []) {
            for (const result of snapshot.declaredResults || [])
                if (result.completed === true && executionAllowsCompletion(result.outputDir, result.runId)) {
                    const declaration = jobs.find((row) => Number(row.index) === result.index && row.output_dir === result.outputDir && row.result_csv === result.collectionResultCsv);
                    if (declaration)
                        completed.add(result.index);
                }
            for (const task of snapshot.tasks || [])
                if (task.observation && (0, TaskLifecycle_1.observationMatches)(task.observation, { commandId: task.commandId, workerId: snapshot.workerId, projectId: task.projectId })
                    && (0, TaskLifecycle_1.taskLifecycle)(task.observation).status === "completed" && executionAllowsCompletion(task.outputDir, task.commandId)) {
                    const declaration = jobs.find((row) => row.case === task.case && Number(row.seed) === Number(task.seed)
                        && row.output_dir === task.outputDir && row.result_csv === task.collectionResultCsv);
                    if (declaration)
                        completed.add(Number(declaration.index));
                }
        }
        const key = (0, PlanRunReplacement_1.runReplacementKey)(body.planFile, body.planRevision, expectedFingerprint, jobs, currentNodes());
        const result = await (0, PlanRunReplacement_1.replaceRunOutputs)({
            preview: (job) => cleanup.service.preview({ planFile: body.planFile, action: "delete", verifiedOnly: false, authorizationMode: "confirmed_paths",
                job: { workflowId: "manifest-" + (0, PlanCleanup_1.cleanupDigest)([body.planFile, job.output_dir]), commandId: "manifest-" + (0, PlanCleanup_1.cleanupDigest)(job), index: Number(job.index),
                    purpose: "replace_outputs", manifest: { declarations: [job], replacement: true } } }),
            service: cleanup.service, execute: (id) => cleanup.execute(id),
            ask: (payload) => h.askRunConfirmation(payload, body.submissionOperationIdLocal),
            save: () => this.save(body),
            assertCurrent,
            beforeDelete: async () => {
                // Deletion still requires the complete batch check. Ordinary launch can
                // already use ready Workers while the remaining servers prepare.
                await body.awaitWorkerPreparationLocal?.();
                const current = { ...body };
                await h.refreshLocalPlanMetadataForAction(current);
                h.stampPlanRevision(current);
                if (executionSource)
                    await (0, PlanCodeScopeHost_1.verifyLocalPlanSource)(this.root, executionSource);
                const fingerprint = executionSource?.digest || await h.localDistributedCodeFingerprint(this.root);
                if (current.planRevision !== body.planRevision || fingerprint !== (executionSource ? expectedFingerprint : h.lastCodeSyncState?.fingerprint)
                    || (0, PlanRunReplacement_1.runReplacementKey)(body.planFile, body.planRevision, fingerprint, jobs, currentNodes()) !== key)
                    throw Error("PLAN、代码或服务器配置已变化，请重新运行并确认路径；未删除。");
                await h.assertPlanSubmissionWorkers(body, { validation });
            },
            progress: (text) => body.reportPlanStageLocal?.(text),
            hold: async (selected) => {
                await h.saveDistributedQueue(this.root, undefined, { artifactMutation: true, mutateLatest: (queue) => ({ ...queue,
                        plans: queue.plans.map((old) => ({ ...old, jobs: old.jobs.map((job) => selected.some(row => row.output_dir === job.outputDir && row.result_csv === job.collectionResultCsv)
                                ? { ...job, outputRetiredAt: job.outputRetiredAt || new Date().toISOString(), artifacts: undefined,
                                    mirroredWorkerIds: [], fragmentWorkerIds: [] } : job) })) }) });
            },
        }, body.runReplacement, body.planFile, jobs, [...completed], key);
        body.existingOutputChoice = result.choice;
        body.existingOutputCount = body.runReplacement.previews?.filter((row) => row.preview.rows.some((file) => file.disposition === "delete")).length || 0;
        body.distributedSkipJobIndices = jobs.filter((job) => !result.selectedIndices.includes(Number(job.index))).map((job) => Number(job.index));
        body.assignedExperimentIndices = result.selectedIndices;
        body.outputReplacementOperationIds = body.runReplacement.completed || [];
        body.overwrite = body.overwriteExisting = false;
        body.options = { ...body.options, overwrite: false, overwriteExisting: false };
        await this.save(body);
    }
}
exports.PlanRunHost = PlanRunHost;
