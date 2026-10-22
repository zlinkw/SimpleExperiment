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
exports.PlanCleanupHost = void 0;
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
const vscode = __importStar(require("vscode"));
const PlanCleanup_1 = require("../features/PlanCleanup");
const PlanCleanupEvidence_1 = require("../features/PlanCleanupEvidence");
const DistributedPlanQueue_1 = require("../features/DistributedPlanQueue");
const PlanOutputReplacement_1 = require("../features/PlanOutputReplacement");
const PlanArtifactSync_1 = require("../features/PlanArtifactSync");
const StateStore_1 = require("../state/StateStore");
const PlanCleanupPanel_1 = require("./PlanCleanupPanel");
const FastDeleteContract_1 = require("../features/FastDeleteContract");
const ManifestCleanup_1 = require("../features/ManifestCleanup");
const PlanIsolatedBatchLedger_1 = require("../features/PlanIsolatedBatchLedger");
const PlanIsolatedReview_1 = require("../features/PlanIsolatedReview");
async function json(file, fallback) {
    const text = await fs.readFile(file, "utf8").catch((error) => { if (error.code === "ENOENT")
        return ""; throw error; });
    return text ? JSON.parse(text) : fallback;
}
/** Host adapter deliberately reads original ledgers, without refreshing/migrating project files. */
class PlanCleanupHost {
    host;
    root;
    service;
    executing = false;
    independentExecuting = false;
    get blocksTaskScheduling() { return this.executing && !this.independentExecuting; }
    constructor(host, root) {
        this.host = host;
        this.root = root;
        const storage = host.context.globalStorageUri.fsPath;
        this.service = new PlanCleanup_1.PlanCleanup({ storageRoot: path.join(storage, "plan-cleanup", (0, PlanCleanup_1.cleanupDigest)(root)),
            collect: (file, options) => this.collect(file, Boolean(options?.removedMetadata), options?.archivedFiles, options?.removedMetadata, options?.onProgress, options?.job, options?.nativeDeclarations, options?.authorizationMode),
            sftp: async (method, params) => {
                let result;
                try {
                    result = await host.simpleSftpApiCall(method, params);
                }
                catch (error) {
                    // 旧引擎以 UNKNOWN_ACTION / UPDATE_REQUIRED 拒绝确认快速链时：统一"需要更新"错误，零确认零执行。
                    if (method === "files.cleanup.preview" && params.authorizationMode === "confirmed_paths" && params.action === "delete"
                        && (0, FastDeleteContract_1.isFastDeleteUpgradeCode)(error?.apiData?.code ?? error?.code))
                        (0, FastDeleteContract_1.fastDeleteUpgradeError)();
                    throw error;
                }
                if (method === "files.cleanup.preview" && params.authorizationMode === "confirmed_paths" && params.action === "delete") {
                    // v1.9：确认路径快速链以其应答的快标志块为唯一契约；旧通用链门禁（managedObservation、
                    // Git 祖先预检、归档批次、正式 job 属主）属于已退役链路，快速路径不再套用。
                    (0, FastDeleteContract_1.assertFastDeletePreviewSafety)(result?.safety, Array.isArray(params.targets) ? params.targets.length : 0);
                    return result;
                }
                if (method === "files.cleanup.preview" && params.observationMode === "managed_tmux" && result.safety?.managedObservation !== 1)
                    (0, PlanCleanup_1.cleanupError)("SFTP_MANAGED_OBSERVATION_REQUIRED", "请更新配套 SimpleSFTP；尚未执行清理。");
                if (method === "files.cleanup.preview" && (result.safety?.gitRepositoryAncestors !== true || result.safety?.readOnlyReceiptCheck !== true))
                    (0, PlanCleanup_1.cleanupError)("SFTP_SAFE_CLEANUP_UPGRADE_REQUIRED", "当前 SimpleSFTP 缺少 Git 祖先仓库预检或只读回执核查；请更新配套插件后重新预览。");
                if (method === "files.cleanup.preview" && params.targets?.some((target) => target.expectedOwner?.resultPathPolicy === "declared") && result.safety?.formalJobOwner !== true)
                    (0, PlanCleanup_1.cleanupError)("SFTP_FORMAL_OWNER_UPGRADE_REQUIRED", "需要支持正式 job 身份核验的 SimpleSFTP，尚未执行任何清理。");
                if (method === "files.cleanup.preview" && params.targets?.some((target) => target.archiveBatch) && result.safety?.immutableArchiveBatch !== true)
                    (0, PlanCleanup_1.cleanupError)("SFTP_ARCHIVE_BATCH_UPGRADE_REQUIRED", "需要支持预先确定的归档批次布局的 SimpleSFTP，尚未执行任何清理。");
                if (method === "files.cleanup.preview" && params.targets?.some((target) => target.expectedOwner?.expectedState === "completed")
                    && !(Number(result.safety?.batchPreviewCapacity) >= 4096))
                    (0, PlanCleanup_1.cleanupError)("SFTP_BATCH_PREVIEW_UPGRADE_REQUIRED", "需要 SimpleSFTP 0.2.79 的批次预览保留能力，未执行清理。");
                return result;
            },
            restoreGate: (preview, operation) => this.restoreGate(preview, operation),
            currentNode: async (id) => this.currentNode(id),
            validateScope: async (scope) => {
                this.assertWorkspace();
                if (scope.candidates.some(row => row.category === "PLAN 文件" && !row.scopeProtectedReason))
                    (0, PlanCleanup_1.cleanupError)("PLAN_CLEANUP_SCOPE_CHANGED", "旧审核包含 PLAN 文件，请重新审核；本次不会处理 PLAN 或共享配置。");
                const configs = scope.candidates.filter(row => !row.scopeProtectedReason && ["专用配置", "远端配置同步副本"].includes(row.category));
                if (!configs.length)
                    return;
                const fresh = await (0, PlanCleanupEvidence_1.collectPlanCleanupEvidence)({ root: this.root, planFile: scope.planFile, queue: (0, DistributedPlanQueue_1.emptyDistributedQueue)(),
                    ledger: (0, PlanArtifactSync_1.emptyPlanSyncLedger)(), nodes: scope.nodes, snapshots: [], activityMode: "managed_tmux" });
                for (const config of configs) {
                    const proof = fresh.candidates.find(row => row.nodeId === "local" && row.relativePath === config.relativePath && row.category === "专用配置");
                    if (!proof || proof.protectedReason || proof.dependencies.length || proof.owners.some(owner => owner !== fresh.planKey)
                        || proof.expectedSha256 !== config.expectedSha256)
                        (0, PlanCleanup_1.cleanupError)("CONFIG_SCOPE_CHANGED", config.relativePath + "：配置已变化或已被其他 PLAN 引用，请重新审核");
                }
            },
            validateIsolationReview: async (id) => { await this.assertIsolatedReview(id); },
            updateIndexes: (operation, restore) => this.updateIndexes(operation, restore) });
    }
    assertWorkspace() {
        const current = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (current !== this.root)
            (0, PlanCleanup_1.cleanupError)("WORKSPACE_CHANGED");
    }
    currentNode(id) {
        this.assertWorkspace();
        if (id === "local")
            return { id, kind: "local", root: this.root };
        const worker = (this.host.setupConfig.workerTunnels || []).find((row) => row.id === id);
        const target = worker && worker.enabled !== false && this.host.workerCodeSyncTarget(worker);
        if (!target)
            (0, PlanCleanup_1.cleanupError)("SERVER_IDENTITY_UNVERIFIED");
        return { id, kind: "remote", host: target.host, user: target.user, port: target.port, root: target.remotePath };
    }
    /** Retired compatibility hook. File review is explicitly requested, never triggered by a connection. */
    observeConnections(_endpoints) {
        return Promise.resolve();
    }
    /**
     * 返修（2026-10-21）P0：单 job「删除并重新排队」的逐目标不存在核验。
     * 缺失的声明目录不会进候选（ManifestCleanup 只报告存在的产物）——「候选缺失」不等于「已删除」。
     * 本方法是唯一被允许的 absence 证据来源：对原预览冻结的物理节点集合 × 完整声明路径逐一
     * files.cleanup.inspect（只读），节点身份必须先与当前配置一致（endpoint/安全根漂移即 error）；
     * 后端必须回 target.missing===true 才算 absent；任何异常/含糊应答都是 error，绝不推断不存在。
     * 它不产生删除候选、不改变审核范围，也不替代预览。
     */
    async verifyDeclaredTargets(params) {
        this.assertWorkspace();
        const verdicts = [];
        const blockers = [];
        for (const frozen of params.nodes) {
            if (frozen.error) {
                blockers.push({ code: "OFFLINE_NODE", nodeId: String(frozen.id), detail: String(frozen.error) });
                continue;
            }
            let live;
            try {
                live = this.currentNode(String(frozen.id));
            }
            catch (error) {
                blockers.push({ code: "SERVER_IDENTITY_UNVERIFIED", nodeId: String(frozen.id), detail: String(error?.message || error) });
                continue;
            }
            if ((0, PlanCleanup_1.cleanupDigest)({ ...live, error: undefined }) !== (0, PlanCleanup_1.cleanupDigest)({ ...frozen, error: undefined }))
                blockers.push({ code: "SERVER_IDENTITY_CHANGED", nodeId: String(frozen.id), detail: "节点身份或安全根与预览时不一致；重新预览前不作任何存在性结论" });
            for (const target of params.declared) {
                if (frozen.error || blockers.some(row => row.nodeId === String(frozen.id)))
                    continue;
                try {
                    const info = await this.host.simpleSftpApiCall("files.cleanup.inspect", { node: live,
                        target: { relativePath: target.relativePath, type: target.type }, allowMissing: true, manifestOnly: true, presenceOnly: true });
                    if (info?.target?.missing === true)
                        verdicts.push({ nodeId: live.id, relativePath: target.relativePath, type: target.type, state: "absent", rootIdentity: info.rootIdentity });
                    else if (info?.target && (info.target.missing === false || typeof info.target.absolutePath === "string"))
                        verdicts.push({ nodeId: live.id, relativePath: target.relativePath, type: target.type, state: "present", rootIdentity: info.rootIdentity });
                    else
                        verdicts.push({ nodeId: live.id, relativePath: target.relativePath, type: target.type, state: "error", error: "UNVERIFIED_RESPONSE" });
                }
                catch (error) {
                    verdicts.push({ nodeId: live.id, relativePath: target.relativePath, type: target.type, state: "error", error: String(error?.message || error) });
                }
            }
        }
        return { verdicts, blockers };
    }
    async replacementGroups(queue, file, declarations, projectId, stablePlanId) {
        this.assertWorkspace();
        if (this.host.taskLifecycleProtocol === 2)
            return declarations.map(row => [{
                    workflowId: "manifest-" + (0, PlanCleanup_1.cleanupDigest)([file, row.output_dir]), index: Number(row.index),
                    commandId: "manifest-" + (0, PlanCleanup_1.cleanupDigest)([file, row.output_dir, row.result_csv]), purpose: "replace_outputs",
                    manifest: { declarations: [row], replacement: true }
                }]);
        const workers = [...new Set((queue.clearedJobs || []).filter(entry => entry.projectId === projectId && entry.resultPathPolicy === "declared"
                && declarations.some(job => job.output_dir === entry.outputDir && job.case === entry.case && Number(job.seed) === entry.seed))
                .map(entry => entry.workerId))];
        const snapshots = await Promise.all(workers.map(async (workerId) => {
            const retiredCommandIds = (queue.clearedJobs || []).filter(entry => entry.workerId === workerId && entry.planFile === file).map(entry => entry.commandId);
            try {
                return { ...await this.host.client.getWorkerTasks(workerId, { signal: AbortSignal.timeout(5000), retiredCommandIds }), workerId, fetchedAt: new Date().toISOString() };
            }
            catch {
                return { workerId, error: "历史 job 当前任务证据不可达" };
            }
        }));
        this.assertWorkspace();
        return (0, PlanOutputReplacement_1.replacementJobGroups)((0, PlanOutputReplacement_1.replacementEvidenceQueue)(queue, snapshots, projectId), file, declarations, projectId, stablePlanId);
    }
    async collect(file, allowMissing = false, archivedFiles, removedMetadata, onProgress, job, nativeDeclarations, authorizationMode) {
        if (this.host.taskLifecycleProtocol === 2 || authorizationMode === "confirmed_paths")
            return this.collectManaged(file, allowMissing, archivedFiles, removedMetadata, onProgress, job, nativeDeclarations, authorizationMode);
        this.assertWorkspace();
        const storage = this.host.context.globalStorageUri.fsPath;
        const queue = await json((0, DistributedPlanQueue_1.distributedQueuePath)(storage, this.root), (0, DistributedPlanQueue_1.emptyDistributedQueue)());
        const ledger = await json((0, PlanArtifactSync_1.planSyncLedgerStoragePath)(storage, this.root), (0, PlanArtifactSync_1.emptyPlanSyncLedger)());
        const registry = await json(path.join(this.root, "simple_cluster/results/project_table_registry.json"), undefined);
        const targets = [];
        // Include disabled Workers: historical ownership never disappears with the current selection.
        for (const worker of (this.host.setupConfig.workerTunnels || []).filter((row) => row.enabled !== false)) {
            try {
                targets.push(this.host.workerCodeSyncTarget(worker));
            }
            catch {
                targets.push({ id: worker.id, error: "当前服务器身份或项目安全根未核实" });
            }
        }
        const nodes = [{ id: "local", kind: "local", root: this.root }, ...targets.map(target => ({ id: target.id, kind: "remote",
                host: target.host, user: target.user, port: target.port, root: target.remotePath || "", ...(target.error ? { error: target.error } : {}) }))];
        const remoteNodes = nodes.filter(node => node.kind === "remote");
        let checkedNodes = 0;
        onProgress?.({ phase: "tasks", message: "并行读取各节点当前任务与传输状态…", completed: 0, total: remoteNodes.length });
        const snapshots = await Promise.all(remoteNodes.map(async (node) => {
            if (node.error) {
                onProgress?.({ phase: "tasks", message: node.id + "：身份未核实，保留", completed: ++checkedNodes, total: remoteNodes.length });
                return { workerId: node.id, error: node.error };
            }
            try {
                return { ...await this.host.client.getWorkerTasks(node.id, { signal: AbortSignal.timeout(5000), retiredCommandIds: job ? [job.commandId] : [] }), workerId: node.id, fetchedAt: new Date().toISOString() };
            }
            catch {
                return { workerId: node.id, error: "节点当前任务证据不可达" };
            }
            finally {
                onProgress?.({ phase: "tasks", message: node.id + "：任务状态检查已返回", completed: ++checkedNodes, total: remoteNodes.length });
            }
        }));
        this.assertWorkspace();
        // Panel/journal rows are history, not evidence that code is still executing.
        // Use current Agent action registries and live cross-window resource leases.
        // Excluding our async call's lease lineage prevents runPlan's replacement
        // review from blocking itself; sibling/concurrent calls remain visible.
        const operations = snapshots.flatMap(snapshot => snapshot.error ? [] : (snapshot.activeOperations || [])
            .map((operation) => ({ ...operation, nodeId: snapshot.workerId })));
        const leases = await this.host.hostOperationLease?.inspect({ excludeCurrent: true });
        for (const lease of leases?.records || []) {
            for (const node of nodes) {
                const server = node.kind === "local" ? "local" : String(node.host).toLowerCase() + ":" + node.port;
                const spelling = (value) => node.kind === "local" ? value.replace(/\\/g, "/").toLowerCase() : value;
                const paths = (lease.resources || []).filter((resource) => String(resource.server).toLowerCase() === server
                    && spelling(resource.project) === spelling(node.root)).map((resource) => ({ targetPath: resource.target || resource.project }));
                if (paths.length)
                    operations.push({ nodeId: node.id, operationId: lease.leaseId, commandId: lease.leaseId, status: "running", targets: paths });
            }
        }
        onProgress?.({ phase: "references", message: "核对 PLAN/attempt 所有权、共享引用与受保护资产…" });
        const evidenceQueue = job?.purpose === "replace_outputs" ? (0, PlanOutputReplacement_1.replacementEvidenceQueue)(queue, snapshots, (0, DistributedPlanQueue_1.canonicalProjectId)(this.root)) : queue;
        const scope = await (0, PlanCleanupEvidence_1.collectPlanCleanupEvidence)({ root: this.root, planFile: file, queue: evidenceQueue, ledger, registry,
            resultDir: this.host.resultCsvDirectory || "experiments/results", nodes, snapshots: snapshots.map(PlanOutputReplacement_1.cleanupTaskEvidence), operations, allowMissing, archivedFiles, removedMetadata, job });
        if (job?.purpose === "replace_outputs") {
            const owner = evidenceQueue.plans.find((plan) => plan.id === job.workflowId)?.jobs.find((row) => row.commandId === job.commandId);
            const snapshot = snapshots.find(row => row.workerId === owner?.workerId);
            if (!snapshot?.error && snapshot?.capabilities?.controlStateRetirement !== 1)
                scope.blockers.push({ code: "STATE_RETIREMENT_CAPABILITY_REQUIRED", nodeId: owner?.workerId,
                    detail: "原 Worker 尚不支持旧状态回收；更新 Agent 后再预览。未删除产物，不影响单独停止任务。" });
        }
        if (!job) {
            scope.nodes.push({ id: "pluginState", kind: "local", root: storage });
            for (const indexFile of [(0, DistributedPlanQueue_1.distributedQueuePath)(storage, this.root), (0, PlanArtifactSync_1.planSyncLedgerStoragePath)(storage, this.root)]) {
                scope.candidates.push({ nodeId: "pluginState", relativePath: path.relative(storage, indexFile).replace(/\\/g, "/"), type: "file",
                    category: "插件缓存/任务索引", owners: [scope.planKey], evidence: ["当前项目的持久化登记与清理生命周期标记"],
                    dependencies: ["同项目其他 PLAN 与历史恢复证据"], protectedReason: "共享索引保留，完成后仅追加生命周期标记" });
            }
        }
        for (const document of vscode.workspace.textDocuments.filter(document => document.isDirty && document.uri.scheme === "file")) {
            const relative = path.relative(this.root, document.uri.fsPath).replace(/\\/g, "/");
            if (scope.candidates.some(row => row.nodeId === "local" && (row.relativePath === relative || relative.startsWith(row.relativePath + "/"))))
                scope.blockers.push({ code: "DIRTY_EDITOR_TARGET", detail: document.uri.fsPath });
        }
        scope.revision = (0, PlanCleanup_1.cleanupDigest)([scope.revision, scope.nodes, scope.candidates.filter(row => row.nodeId === "pluginState")]);
        return scope;
    }
    managedNodes() {
        const nodes = [{ id: "local", kind: "local", root: this.root }];
        for (const worker of this.host.setupConfig.workerTunnels || []) {
            if (worker.enabled === false)
                continue;
            try {
                nodes.push({ ...this.currentNode(worker.id) });
            }
            catch {
                nodes.push({ id: worker.id, kind: "remote", root: "", error: "当前服务器身份或安全根未核实" });
            }
        }
        return nodes;
    }
    async collectManaged(file, allowMissing, archivedFiles, removedMetadata, onProgress, job, nativeDeclarations, authorizationMode) {
        this.assertWorkspace();
        const storage = this.host.context.globalStorageUri.fsPath;
        const queue = await json((0, DistributedPlanQueue_1.distributedQueuePath)(storage, this.root), (0, DistributedPlanQueue_1.emptyDistributedQueue)());
        const ledger = await json((0, PlanArtifactSync_1.planSyncLedgerStoragePath)(storage, this.root), (0, PlanArtifactSync_1.emptyPlanSyncLedger)());
        const registry = await json(path.join(this.root, "simple_cluster/results/project_table_registry.json"), undefined);
        const nodes = this.managedNodes();
        let declarations = nativeDeclarations || job?.manifest?.declarations;
        if (job && !declarations) {
            const plan = queue.plans.find((row) => row.id === job.workflowId);
            const entry = plan?.jobs.find((row) => row.index === job.index && row.commandId === job.commandId);
            const retired = queue.clearedJobs?.find((row) => row.workflowId === job.workflowId && row.commandId === job.commandId && row.experimentIndex === job.index);
            const source = entry || retired;
            if (!source)
                (0, PlanCleanup_1.cleanupError)("JOB_DECLARATIONS_UNVERIFIED");
            declarations = [{ index: job.index, case: source.case, seed: source.seed, output_dir: source.outputDir, result_csv: source.collectionResultCsv }];
        }
        onProgress?.({ phase: "manifests", message: "读取声明目录内的产物清单…" });
        const discovered = await (0, ManifestCleanup_1.discoverManifestCandidates)(this.host, this.root, file, nodes, queue, declarations, authorizationMode === "confirmed_paths", onProgress);
        this.assertWorkspace();
        // Retain the original config/reference graph, without importing cached task activity.
        const scope = await (0, PlanCleanupEvidence_1.collectPlanCleanupEvidence)({ root: this.root, planFile: file, queue: (0, DistributedPlanQueue_1.emptyDistributedQueue)(), ledger,
            registry, resultDir: this.host.resultCsvDirectory || "experiments/results", nodes, snapshots: [], operations: [],
            allowMissing: allowMissing || authorizationMode === "confirmed_paths", archivedFiles, removedMetadata, activityMode: "managed_tmux" });
        const configuration = scope.candidates.filter(row => ["PLAN 文件", "专用配置"].includes(row.category))
            .map(row => [row.relativePath, row.expectedSha256, row.dependencies, row.protectedReason]);
        scope.nodes = [...nodes, ...scope.nodes.filter(node => !nodes.some(row => row.id === node.id))];
        if (job)
            scope.candidates = [];
        else
            scope.candidates = scope.candidates.filter(row => ["PLAN 文件", "专用配置", "远端配置同步副本"].includes(row.category));
        for (const candidate of scope.candidates) {
            if (candidate.category === "PLAN 文件")
                candidate.scopeProtectedReason = "保留 PLAN；仅清理独占配置与关联产物";
            else if (candidate.protectedReason || candidate.dependencies.length || candidate.owners.some(owner => owner !== scope.planKey))
                candidate.scopeProtectedReason = candidate.protectedReason || "共享配置，保留";
        }
        const preserved = new Map(scope.candidates.map(row => [row.nodeId + ":" + row.relativePath, row]));
        for (const candidate of discovered.candidates) {
            const key = candidate.nodeId + ":" + candidate.relativePath, existing = preserved.get(key);
            if (existing) {
                existing.evidence.push(...candidate.evidence);
                continue;
            }
            candidate.owners = candidate.owners.length ? [scope.planKey] : [];
            for (const [reference, owners] of Object.entries(scope.references || {}))
                if (owners.some(owner => owner !== scope.planKey) && (reference === candidate.relativePath || reference.startsWith(candidate.relativePath + "/")))
                    candidate.dependencies.push("其他 PLAN 引用：" + reference);
            scope.candidates.push(candidate);
            preserved.set(key, candidate);
        }
        scope.blockers.push(...discovered.blockers);
        scope.notices.push(...discovered.notices);
        scope.associationBlockers = [...scope.blockers];
        if (authorizationMode === "confirmed_paths") {
            scope.authorizationMode = authorizationMode;
            const pathErrors = new Set(["UNSAFE_DECLARED_PATH", "NODE_UNREACHABLE", "OFFLINE_NODE"]);
            scope.notices.push(...scope.blockers.filter(row => !pathErrors.has(row.code)));
            scope.blockers = scope.blockers.filter(row => pathErrors.has(row.code));
        }
        scope.runIds = queue.plans.filter((plan) => plan.planFile === file).map((plan) => plan.id);
        scope.observationMode = "managed_tmux";
        scope.nativeDeclarations = discovered.declarations;
        if (job)
            scope.job = { ...job, manifest: { declarations: discovered.declarations, replacement: true } };
        for (const document of vscode.workspace.textDocuments.filter(document => document.isDirty && document.uri.scheme === "file")) {
            const relative = path.relative(this.root, document.uri.fsPath).replace(/\\/g, "/");
            if (scope.candidates.some(row => !row.scopeProtectedReason && row.nodeId === "local" && (row.relativePath === relative || relative.startsWith(row.relativePath + "/")))) {
                const blocker = { code: "DIRTY_EDITOR_TARGET", detail: document.uri.fsPath };
                scope.blockers.push(blocker);
                scope.associationBlockers.push(blocker);
            }
        }
        scope.revision = (0, PlanCleanup_1.cleanupDigest)([file, scope.planHash, configuration, discovered.declarations,
            nodes.map(({ error, ...node }) => node)]);
        return scope;
    }
    async restoreGate(preview, operation) {
        const archivedFiles = Object.fromEntries(preview.rows.filter(row => row.node.kind === "local" && ["PLAN 文件", "专用配置"].includes(row.category)
            && operation?.targets[row.id]?.state !== "completed")
            .map(row => [row.destination, row.relativePath]));
        const fresh = await this.collect(preview.scope.planFile, true, archivedFiles, undefined, undefined, preview.scope.job, preview.scope.nativeDeclarations);
        if (fresh.blockers.length)
            (0, PlanCleanup_1.cleanupError)("RESTORE_PREFLIGHT_BLOCKED", JSON.stringify(fresh.blockers));
        for (const row of preview.rows) {
            const node = fresh.nodes.find(node => node.id === row.node.id);
            if (!node || (0, PlanCleanup_1.cleanupDigest)({ ...node, error: undefined }) !== (0, PlanCleanup_1.cleanupDigest)({ ...row.node, error: undefined }))
                (0, PlanCleanup_1.cleanupError)("SERVER_IDENTITY_CHANGED");
            const original = row.destination;
            if ((fresh.references?.[original] || []).some(owner => owner !== preview.scope.planKey))
                (0, PlanCleanup_1.cleanupError)("SHARED_DEPENDENCY");
            if (fresh.candidates.some(candidate => candidate.relativePath === original && candidate.nodeId === node.id && candidate.dependencies.length))
                (0, PlanCleanup_1.cleanupError)("SHARED_DEPENDENCY");
        }
    }
    async updateIndexes(operation, restore) {
        this.assertWorkspace();
        // An old registered isolation tree has no authority to retire, clear or rewrite the new PLAN/job.
        if (operation.preview.registeredIsolationOperationId)
            return;
        const originalId = operation.preview.originalOperationId || operation.id;
        const restoreChain = restore ? await this.service.history(originalId) : [];
        const restoreIds = new Set(restoreChain.map(row => row.id));
        const queue = await this.host.loadDistributedQueue(this.root);
        const ids = new Set(operation.preview.scope.runIds);
        const selection = operation.preview.scope.job;
        const deletedRows = (operation.preview.rows || []).filter(row => row.nodeId !== "pluginState" && row.disposition !== "protected");
        const absentDeletion = operation.preview.action === "delete" && deletedRows.length > 0 && deletedRows.every(row => operation.targets[row.id]?.state === "completed" && operation.targets[row.id]?.receipt?.verifiedBy === "path_absence");
        if (operation.preview.scope.observationMode === "managed_tmux") {
            const declarations = operation.preview.scope.nativeDeclarations || [];
            const matches = (record) => declarations.some(row => row.output_dir === record.outputDir
                && row.result_csv === record.collectionResultCsv);
            for (const plan of queue.plans)
                if (plan.planFile === operation.preview.scope.planFile && (ids.has(plan.id) || selection?.workflowId === plan.id)) {
                    for (const record of plan.jobs.filter(matches)) {
                        if (restore) {
                            if (restoreIds.has(record.cleanup?.operationId)) {
                                delete record.cleanup;
                                delete record.outputRetiredAt;
                            }
                        }
                        else {
                            record.cleanup = { operationId: operation.id, state: operation.pendingNodes.length ? "partial" : operation.preview.action === "delete" ? "deleted" : "archived",
                                completedTargets: operation.preview.rows.filter(row => operation.targets[row.id]?.state === "completed").map(row => row.node.id + ":" + row.absolutePath), pendingNodes: operation.pendingNodes };
                            record.outputRetiredAt = new Date().toISOString();
                        }
                    }
                }
            // Local lifecycle markers are audit only. No Worker acknowledgement or retired status file is required.
        }
        else if (selection) {
            const plan = queue.plans.find((plan) => plan.id === selection.workflowId);
            const job = plan?.jobs.find((job) => job.index === selection.index && job.commandId === selection.commandId
                && (selection.purpose === "replace_outputs" ? ["failed", "completed"].includes(job.status) : job.status === "failed"));
            const record = job || (0, PlanOutputReplacement_1.replacementLifecycleJob)(queue, selection);
            if (!record && !absentDeletion)
                (0, PlanCleanup_1.cleanupError)("JOB_SCOPE_CHANGED");
            if (record && restore) {
                if (restoreIds.has(record.cleanup?.operationId)) {
                    delete record.cleanup;
                    delete record.outputRetiredAt;
                }
            }
            else if (record) {
                const retiringState = !absentDeletion && selection.purpose === "replace_outputs" && operation.preview.action === "delete";
                const ownerWorker = job?.workerId || queue.clearedJobs?.find((row) => row.commandId === selection.commandId && row.workflowId === selection.workflowId)?.workerId;
                record.cleanup = { operationId: operation.id, state: operation.pendingNodes.length || retiringState ? "partial" : operation.preview.action === "delete" ? "deleted" : "archived",
                    completedTargets: operation.preview.rows.filter(row => operation.targets[row.id]?.state === "completed").map(row => row.node.id + ":" + row.absolutePath),
                    pendingNodes: retiringState ? [...new Set([...operation.pendingNodes, ...[ownerWorker].filter(Boolean)])] : operation.pendingNodes };
                if (retiringState && !operation.pendingNodes.length && Object.values(operation.targets).every(row => row.state === "completed")) {
                    operation.retirementPendingNodes = [ownerWorker].filter(Boolean);
                    operation.state = "partial";
                }
            }
        }
        else {
            for (const plan of queue.plans)
                if (ids.has(plan.id)) {
                    if (restore) {
                        if (restoreIds.has(plan.cleanup?.operationId))
                            delete plan.cleanup;
                    }
                    else
                        plan.cleanup = { operationId: operation.id, state: operation.pendingNodes.length ? "partial" : operation.preview.action === "delete" ? "deleted" : "archived",
                            completedTargets: operation.preview.rows.filter(row => operation.targets[row.id]?.state === "completed").map(row => row.node.id + ":" + row.absolutePath), pendingNodes: operation.pendingNodes };
                }
        }
        await this.host.saveDistributedQueue(this.root, queue);
        if (!selection)
            await this.host.updatePlanSyncLedger(this.root, (ledger) => {
                for (const entry of Object.values(ledger.entries))
                    if (ids.has(entry.runId)) {
                        if (restore) {
                            if (restoreIds.has(entry.cleanupOperationId))
                                delete entry.cleanupOperationId;
                        }
                        else
                            entry.cleanupOperationId = operation.id;
                    }
                return ledger;
            });
        if (restore) {
            for (const original of restoreChain) {
                original.restoredBy = operation.id;
                const storage = path.join(this.host.context.globalStorageUri.fsPath, "plan-cleanup", (0, PlanCleanup_1.cleanupDigest)(this.root), original.id + ".json");
                await (0, StateStore_1.atomicWriteText)(storage, JSON.stringify(original, null, 2));
            }
        }
        this.host.localPlanMetadataUpdatedAt = 0;
        this.host.postState();
    }
    async execute(id) {
        if (this.executing)
            (0, PlanCleanup_1.cleanupError)("OPERATION_BUSY");
        this.executing = true;
        try {
            const registered = await this.service.registeredIsolationSource(id);
            this.independentExecuting = Boolean(registered);
            const initial = await this.service.status(id);
            const independent = initial.preview.registeredIsolationOperationId;
            if (independent !== registered)
                (0, PlanCleanup_1.cleanupError)("ISOLATED_OPERATION_IDENTITY_CHANGED");
            if (independent) {
                await this.assertIsolatedReview(independent);
                if (initial.state === "completed") {
                    await this.verifyIsolatedAbsence(independent);
                    await this.isolatedReviewEvent(independent, "completed", id);
                    return initial;
                }
                if (initial.state === "paused")
                    (0, PlanCleanup_1.cleanupError)("ISOLATED_DELETE_RECONFIRM_REQUIRED", "该审核已取消；请重新预览并两次确认，不沿用旧授权执行。");
                if (initial.executionRequestedAt)
                    (0, PlanCleanup_1.cleanupError)("ISOLATED_DELETE_QUERY_REQUIRED", "该删除请求已经发出；本次只允许刷新核实，不重复发送。重新审核仍须两次确认。");
                this.host.assertArtifactSyncPathsIdle?.(this.root, initial.preview.rows.filter(row => row.disposition === "delete").map(row => row.relativePath));
                await this.isolatedReviewEvent(independent, "executing", id);
                try {
                    const result = await this.service.execute(id);
                    if (result.state === "completed")
                        await this.verifyIsolatedAbsence(independent);
                    await this.isolatedReviewEvent(independent, result.state === "completed" ? "completed" : result.state === "paused" ? "cancelled"
                        : /BUSY/.test(result.error || "") ? "busy" : result.state === "blocked" ? "failed" : "unknown", id, result.error);
                    return result;
                }
                catch (error) {
                    await this.isolatedReviewEvent(independent, /BUSY/.test(String(error?.apiData?.code || error.message)) ? "busy" : "failed", id, String(error.message || error)).catch(() => undefined);
                    throw error;
                }
            }
            const pending = this.host.distributedQueueTickPromise;
            if (pending)
                await pending;
            const operation = await this.service.status(id);
            if (operation.state === "completed")
                return operation;
            this.host.assertArtifactSyncPathsIdle?.(this.root, operation.preview.rows
                .filter(row => ["delete", "move", "isolate"].includes(row.disposition)).map(row => row.relativePath));
            if (operation.preview.scope.observationMode === "managed_tmux")
                return await this.service.execute(id);
            if (operation.preview.scope.job?.purpose === "replace_outputs") {
                await this.service.preflightConfirmed(id);
                const selection = operation.preview.scope.job;
                const queue = await this.host.loadDistributedQueue(this.root);
                const job = (0, PlanOutputReplacement_1.replacementLifecycleJob)(queue, selection);
                if (!job)
                    (0, PlanCleanup_1.cleanupError)("JOB_SCOPE_CHANGED");
                const priorIds = new Set((await this.service.history(id)).map(row => row.id));
                if (job.cleanup?.state === "partial" && !priorIds.has(job.cleanup.operationId))
                    (0, PlanCleanup_1.cleanupError)("OUTPUT_REPLACEMENT_PENDING");
                job.outputRetiredAt ||= new Date().toISOString();
                job.cleanup = { operationId: id, state: "partial", completedTargets: [], pendingNodes: operation.preview.scope.nodes.map(node => node.id) };
                await this.host.saveDistributedQueue(this.root, queue);
            }
            const result = await this.host.withHostOperationLease("cleanupPlan", "清除 PLAN 及关联产物", () => this.service.execute(id), { resources: [{ server: "local", project: this.root, target: this.root }] });
            if (operation.preview.action === "delete")
                return await this.service.status(id);
            return result;
        }
        finally {
            this.executing = false;
            this.independentExecuting = false;
        }
    }
    async assertIsolatedReview(id) {
        this.assertWorkspace();
        const file = this.host.isolatedReplacementLedgerFileLocal?.();
        if (!file)
            (0, PlanCleanup_1.cleanupError)("ISOLATED_BATCH_LEDGER_UNAVAILABLE");
        const queue = await this.host.loadDistributedQueue(this.root);
        const binding = await (0, PlanIsolatedReview_1.resolveIsolatedBatchReview)(file, this.root, id, queue, operationId => this.service.status(operationId));
        const original = binding?.operation || await this.service.status(id);
        if (original.preview.action !== "isolate" || !original.preview.rows.some(row => row.disposition === "isolate"))
            (0, PlanCleanup_1.cleanupError)("NOT_ISOLATED_OPERATION");
        for (const row of original.preview.rows.filter(row => row.disposition === "isolate")) {
            const current = this.currentNode(row.node.id);
            if ((0, PlanCleanup_1.cleanupDigest)({ ...current, error: undefined }) !== (0, PlanCleanup_1.cleanupDigest)({ ...row.node, error: undefined }))
                (0, PlanCleanup_1.cleanupError)("SERVER_IDENTITY_CHANGED");
        }
        this.assertWorkspace();
        return binding;
    }
    async isolatedReviewEvent(originalId, kind, reviewId, detail) {
        const file = this.host.isolatedReplacementLedgerFileLocal?.();
        if (!file)
            (0, PlanCleanup_1.cleanupError)("ISOLATED_BATCH_LEDGER_UNAVAILABLE");
        const batches = await (0, PlanIsolatedBatchLedger_1.loadIsolatedBatchLedger)(file);
        const matches = batches.filter(batch => batch.projectRoot === this.root && batch.plans.some(plan => plan.cleanup.some(record => record.cleanupOperationId === originalId)));
        if (!matches.length)
            return; // Standalone isolation keeps its ordinary operation history.
        if (matches.length !== 1)
            (0, PlanCleanup_1.cleanupError)("ISOLATED_OPERATION_BATCH_CONFLICT");
        await (0, PlanIsolatedReview_1.recordIsolatedReviewEvent)(file, matches[0].batchId, originalId, { kind, reviewOperationId: reviewId, detail });
    }
    async verifyIsolatedAbsence(originalId) {
        const binding = await this.assertIsolatedReview(originalId);
        const original = binding?.operation || await this.service.status(originalId);
        for (const row of original.preview.rows.filter(row => row.disposition === "isolate")) {
            const proof = await this.host.simpleSftpApiCall("files.cleanup.inspect", { node: row.node,
                target: { relativePath: row.destination, type: row.type }, allowMissing: true, presenceOnly: true, observeExecutors: true });
            if (proof?.ok !== true || proof.executorsChecked !== true || !Array.isArray(proof.executors) || proof.executors.length
                || proof.target?.missing !== true || !row.rootIdentity || !proof.rootIdentity || (0, PlanCleanup_1.cleanupDigest)(proof.rootIdentity) !== (0, PlanCleanup_1.cleanupDigest)(row.rootIdentity))
                (0, PlanCleanup_1.cleanupError)("ISOLATED_DELETE_UNVERIFIED", "隔离目标仍存在、执行窗口未退出或身份未知；保留记录，不自动重发。");
        }
    }
    async openIsolatedBatchReviews() {
        this.assertWorkspace();
        const file = this.host.isolatedReplacementLedgerFileLocal?.();
        if (!file)
            (0, PlanCleanup_1.cleanupError)("ISOLATED_BATCH_LEDGER_UNAVAILABLE");
        const batches = await (0, PlanIsolatedBatchLedger_1.loadIsolatedBatchLedger)(file);
        const queue = await this.host.loadDistributedQueue(this.root);
        const items = [];
        for (const batch of (0, PlanIsolatedBatchLedger_1.eligibleIsolatedReviews)(batches, this.root)) {
            try {
                (0, PlanIsolatedReview_1.assertLiveIsolatedBoundary)(batch, this.root, queue);
            }
            catch {
                continue;
            }
            for (const plan of batch.plans)
                for (const record of plan.cleanup) {
                    const events = batch.reviews?.filter(event => event.cleanupOperationId === record.cleanupOperationId) || [];
                    const last = events.at(-1);
                    if (events.some(event => event.kind === "completed"))
                        continue;
                    // Explicitly opening this review queries only the registered destinations.
                    // External removal has no delete receipt; fresh per-target absence still consumes it.
                    let absent = false;
                    try {
                        await this.verifyIsolatedAbsence(record.cleanupOperationId);
                        absent = true;
                    }
                    catch { /* Present or unknown: retain for review. */ }
                    if (absent) {
                        await this.isolatedReviewEvent(record.cleanupOperationId, "completed");
                        continue;
                    }
                    const labels = { opened: "已打开", preview: "待确认", confirmed1: "等待第二次确认", confirmed2: "已确认待执行",
                        executing: "执行结果待核实", busy: "服务器忙，未自动重试", failed: "审核失败", cancelled: "已取消", unknown: "结果待核实" };
                    items.push({ label: plan.planFile, description: `${record.targets.length} 项隔离产物 · ${last ? labels[last.kind] || "待审核" : "待审核"}`,
                        detail: record.targets.map(target => target.nodeId + ":" + target.isolationRelativePath).join("；"),
                        operationId: record.cleanupOperationId, initialId: [...events].reverse().find(event => event.reviewOperationId)?.reviewOperationId || record.cleanupOperationId, planFile: plan.planFile });
                }
        }
        if (!items.length) {
            await vscode.window.showInformationMessage("暂无已核实全部初始 PLAN 启动且仍待审核的隔离产物；未删除任何文件。");
            return;
        }
        const selected = await vscode.window.showQuickPick(items, { title: "隔离产物独立永久删除审核", placeHolder: "选择已登记隔离操作；下一页显示精确节点与完整路径，删除须另行两次确认" });
        if (!selected)
            return;
        await this.assertIsolatedReview(selected.operationId);
        await this.isolatedReviewEvent(selected.operationId, "opened");
        return this.open(selected.planFile, selected.initialId, undefined, selected.operationId);
    }
    open(file, operationId, job, isolatedOperationId) { return (0, PlanCleanupPanel_1.openPlanCleanupPanel)(this, file, operationId, job, isolatedOperationId); }
    openJob(file, job) { return this.open(file, undefined, job); }
}
exports.PlanCleanupHost = PlanCleanupHost;
