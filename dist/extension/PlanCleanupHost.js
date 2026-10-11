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
const PlanArtifactSync_1 = require("../features/PlanArtifactSync");
const StateStore_1 = require("../state/StateStore");
const PlanCleanupPanel_1 = require("./PlanCleanupPanel");
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
    constructor(host, root) {
        this.host = host;
        this.root = root;
        const storage = host.context.globalStorageUri.fsPath;
        this.service = new PlanCleanup_1.PlanCleanup({ storageRoot: path.join(storage, "plan-cleanup", (0, PlanCleanup_1.cleanupDigest)(root)),
            collect: (file, options) => this.collect(file, false, options?.archivedFiles),
            sftp: async (method, params) => {
                const result = await host.simpleSftpApiCall(method, params);
                if (method === "files.cleanup.preview" && result.safety?.gitRepositoryAncestors !== true)
                    (0, PlanCleanup_1.cleanupError)("SFTP_SAFE_CLEANUP_UPGRADE_REQUIRED", "当前 SimpleSFTP 缺少 Git 祖先仓库预检；请更新配套插件后重新预览。");
                return result;
            },
            restoreGate: (preview, operation) => this.restoreGate(preview, operation),
            updateIndexes: (operation, restore) => this.updateIndexes(operation, restore) });
    }
    assertWorkspace() {
        const current = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (current !== this.root)
            (0, PlanCleanup_1.cleanupError)("WORKSPACE_CHANGED");
    }
    async collect(file, allowMissing = false, archivedFiles) {
        this.assertWorkspace();
        const storage = this.host.context.globalStorageUri.fsPath;
        const queue = await json((0, DistributedPlanQueue_1.distributedQueuePath)(storage, this.root), (0, DistributedPlanQueue_1.emptyDistributedQueue)());
        const ledger = await json((0, PlanArtifactSync_1.planSyncLedgerStoragePath)(storage, this.root), (0, PlanArtifactSync_1.emptyPlanSyncLedger)());
        const registry = await json(path.join(this.root, "simple_cluster/results/project_table_registry.json"), undefined);
        const targets = [];
        // Include disabled Workers: historical ownership never disappears with the current selection.
        for (const worker of this.host.setupConfig.workerTunnels || []) {
            try {
                targets.push(this.host.workerCodeSyncTarget(worker));
            }
            catch {
                targets.push({ id: worker.id, error: "当前服务器身份或项目安全根未核实" });
            }
        }
        try {
            if (this.host.setupConfig.agentProjectDir && this.host.setupConfig.savedSessionPath)
                targets.push(this.host.hubCodeSyncTarget());
        }
        catch {
            targets.push({ id: "hub", error: "当前 Hub 身份或安全根未核实" });
        }
        const nodes = [{ id: "local", kind: "local", root: this.root }, ...targets.map(target => ({ id: target.id, kind: "remote",
                host: target.host, user: target.user, port: target.port, root: target.remotePath || "", ...(target.error ? { error: target.error } : {}) }))];
        const snapshots = await Promise.all(nodes.filter(node => node.kind === "remote").map(async (node) => {
            if (node.error)
                return { workerId: node.id, error: node.error };
            try {
                return { ...await this.host.client.getWorkerTasks(node.id, { signal: AbortSignal.timeout(5000) }), workerId: node.id, fetchedAt: new Date().toISOString() };
            }
            catch {
                return { workerId: node.id, error: "节点当前任务证据不可达" };
            }
        }));
        this.assertWorkspace();
        const state = this.host.buildPlanRuntimeEvidenceState();
        const operations = Object.values(state.operations || {});
        const scope = await (0, PlanCleanupEvidence_1.collectPlanCleanupEvidence)({ root: this.root, planFile: file, queue, ledger, registry, nodes, snapshots, operations, allowMissing, archivedFiles });
        scope.nodes.push({ id: "pluginState", kind: "local", root: storage });
        for (const indexFile of [(0, DistributedPlanQueue_1.distributedQueuePath)(storage, this.root), (0, PlanArtifactSync_1.planSyncLedgerStoragePath)(storage, this.root)]) {
            scope.candidates.push({ nodeId: "pluginState", relativePath: path.relative(storage, indexFile).replace(/\\/g, "/"), type: "file",
                category: "插件缓存/任务索引", owners: [scope.planKey], evidence: ["当前项目的持久化登记与清理生命周期标记"],
                dependencies: ["同项目其他 PLAN 与历史恢复证据"], protectedReason: "共享索引保留，完成后仅追加生命周期标记" });
        }
        for (const document of vscode.workspace.textDocuments.filter(document => document.isDirty && document.uri.scheme === "file")) {
            const relative = path.relative(this.root, document.uri.fsPath).replace(/\\/g, "/");
            if (scope.candidates.some(row => row.nodeId === "local" && (row.relativePath === relative || relative.startsWith(row.relativePath + "/"))))
                scope.blockers.push({ code: "DIRTY_EDITOR_TARGET", detail: document.uri.fsPath });
        }
        scope.revision = (0, PlanCleanup_1.cleanupDigest)([scope.revision, scope.nodes, scope.candidates.filter(row => row.nodeId === "pluginState")]);
        return scope;
    }
    async restoreGate(preview, operation) {
        const archivedFiles = Object.fromEntries(preview.rows.filter(row => row.node.kind === "local" && ["PLAN 文件", "专用配置"].includes(row.category)
            && operation?.targets[row.id]?.state !== "completed")
            .map(row => [row.destination, row.relativePath]));
        const fresh = await this.collect(preview.scope.planFile, true, archivedFiles);
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
        const queue = await this.host.loadDistributedQueue(this.root);
        const ids = new Set(operation.preview.scope.runIds);
        for (const plan of queue.plans)
            if (ids.has(plan.id)) {
                if (restore) {
                    if (plan.cleanup?.operationId === originalId)
                        delete plan.cleanup;
                }
                else
                    plan.cleanup = { operationId: operation.id, state: operation.pendingNodes.length ? "partial" : operation.preview.action === "delete" ? "deleted" : "archived",
                        completedTargets: operation.preview.rows.filter(row => operation.targets[row.id]?.state === "completed").map(row => row.node.id + ":" + row.absolutePath), pendingNodes: operation.pendingNodes };
            }
        await this.host.saveDistributedQueue(this.root, queue);
        await this.host.updatePlanSyncLedger(this.root, (ledger) => {
            for (const entry of Object.values(ledger.entries))
                if (ids.has(entry.runId)) {
                    if (restore) {
                        if (entry.cleanupOperationId === originalId)
                            delete entry.cleanupOperationId;
                    }
                    else
                        entry.cleanupOperationId = operation.id;
                }
            return ledger;
        });
        if (restore) {
            const original = await this.service.status(originalId);
            original.restoredBy = operation.id;
            const storage = path.join(this.host.context.globalStorageUri.fsPath, "plan-cleanup", (0, PlanCleanup_1.cleanupDigest)(this.root), originalId + ".json");
            await (0, StateStore_1.atomicWriteText)(storage, JSON.stringify(original, null, 2));
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
            return await this.host.withHostOperationLease("cleanupPlan", "清除 PLAN 及关联产物", () => this.service.execute(id), { resources: [{ server: "local", project: this.root, target: this.root }] });
        }
        finally {
            this.executing = false;
        }
    }
    open(file) { return (0, PlanCleanupPanel_1.openPlanCleanupPanel)(this, file); }
}
exports.PlanCleanupHost = PlanCleanupHost;
