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
const ManifestCleanup_1 = require("../features/ManifestCleanup");
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
    connections = new Map();
    pendingReconnects = new Set();
    reconnectWork;
    notices = new Set();
    constructor(host, root) {
        this.host = host;
        this.root = root;
        const storage = host.context.globalStorageUri.fsPath;
        this.service = new PlanCleanup_1.PlanCleanup({ storageRoot: path.join(storage, "plan-cleanup", (0, PlanCleanup_1.cleanupDigest)(root)),
            collect: (file, options) => this.collect(file, Boolean(options?.removedMetadata), options?.archivedFiles, options?.removedMetadata, options?.onProgress, options?.job, options?.nativeDeclarations, options?.authorizationMode),
            sftp: async (method, params) => {
                const result = await host.simpleSftpApiCall(method, params);
                if (method === "files.cleanup.preview" && params.authorizationMode === "confirmed_paths" && result.safety?.confirmedPathDeletion !== 1)
                    (0, PlanCleanup_1.cleanupError)("SFTP_CONFIRMED_PATH_DELETE_REQUIRED", "请更新 SimpleSFTP 后重载窗口，以使用按确认路径删除。");
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
    /** Edge-triggered on initial connection/reconnection, never on ordinary telemetry heartbeats. */
    observeConnections(endpoints) {
        const present = new Set(endpoints.map(endpoint => endpoint.id));
        for (const id of this.connections.keys())
            if (!present.has(id))
                this.connections.delete(id);
        for (const endpoint of endpoints) {
            const online = ["websocket", "sse", "polling"].includes(endpoint.streamStatus), count = endpoint.reconnectCount || 0;
            const before = this.connections.get(endpoint.id);
            this.connections.set(endpoint.id, { online, count });
            if (online && (!before?.online || before.count !== count))
                this.pendingReconnects.add(endpoint.id);
        }
        return this.drainReconnects();
    }
    drainReconnects() {
        if (this.reconnectWork)
            return this.reconnectWork;
        if (this.executing)
            return Promise.resolve();
        this.reconnectWork = (async () => {
            while (this.pendingReconnects.size && !this.executing) {
                const nodeId = this.pendingReconnects.values().next().value;
                this.pendingReconnects.delete(nodeId);
                if (!this.connections.get(nodeId)?.online)
                    continue;
                this.assertWorkspace();
                const reports = await this.service.recheckNode(nodeId);
                this.assertWorkspace();
                // A failed read says nothing about files being present. Surface query
                // errors in the review page, never as a startup deletion reminder.
                const actionable = reports.filter(report => report.state !== "blocked"
                    && report.targets.some(target => target.state === "pending"));
                if (!actionable.length || this.notices.has(nodeId))
                    continue;
                this.notices.add(nodeId);
                void Promise.resolve(vscode.window.showWarningMessage(`${nodeId} 仍有 ${actionable.length} 个 PLAN 的文件尚未清除，可查看完整路径。`, "审核未完成清理", "稍后"))
                    .then(async (choice) => {
                    this.assertWorkspace();
                    if (choice === "审核未完成清理") {
                        const operation = await this.service.status(actionable[0].operationId);
                        await this.open(operation.preview.scope.planFile, operation.id, operation.preview.scope.job);
                    }
                }).catch(() => undefined).finally(() => this.notices.delete(nodeId));
            }
        })().finally(() => { this.reconnectWork = undefined; });
        return this.reconnectWork;
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
            const pending = this.host.distributedQueueTickPromise;
            if (pending)
                await pending;
            const operation = await this.service.status(id);
            if (operation.state === "completed")
                return operation;
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
            void this.drainReconnects().catch(() => undefined);
        }
    }
    open(file, operationId, job) { return (0, PlanCleanupPanel_1.openPlanCleanupPanel)(this, file, operationId, job); }
    openJob(file, job) { return this.open(file, undefined, job); }
}
exports.PlanCleanupHost = PlanCleanupHost;
