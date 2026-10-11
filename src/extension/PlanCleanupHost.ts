import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import { PlanCleanup, cleanupDigest, cleanupError, type CleanupOperation, type CleanupPreview } from "../features/PlanCleanup";
import { collectPlanCleanupEvidence } from "../features/PlanCleanupEvidence";
import { distributedQueuePath, emptyDistributedQueue } from "../features/DistributedPlanQueue";
import { planSyncLedgerStoragePath, emptyPlanSyncLedger } from "../features/PlanArtifactSync";
import { atomicWriteText } from "../state/StateStore";
import { openPlanCleanupPanel } from "./PlanCleanupPanel";

async function json(file: string, fallback: any): Promise<any> {
  const text = await fs.readFile(file, "utf8").catch((error: any) => { if (error.code === "ENOENT") return ""; throw error; });
  return text ? JSON.parse(text) : fallback;
}

/** Host adapter deliberately reads original ledgers, without refreshing/migrating project files. */
export class PlanCleanupHost {
  readonly service: PlanCleanup;
  executing = false;
  constructor(private readonly host: any, readonly root: string) {
    const storage = host.context.globalStorageUri.fsPath;
    this.service = new PlanCleanup({ storageRoot: path.join(storage, "plan-cleanup", cleanupDigest(root)),
      collect: (file, options) => this.collect(file, false, options?.archivedFiles),
      sftp: async (method, params) => {
        const result = await host.simpleSftpApiCall(method, params);
        if (method === "files.cleanup.preview" && result.safety?.gitRepositoryAncestors !== true)
          cleanupError("SFTP_SAFE_CLEANUP_UPGRADE_REQUIRED", "当前 SimpleSFTP 缺少 Git 祖先仓库预检；请更新配套插件后重新预览。");
        return result;
      },
      restoreGate: (preview, operation) => this.restoreGate(preview, operation),
      updateIndexes: (operation, restore) => this.updateIndexes(operation, restore) });
  }
  private assertWorkspace() {
    const current = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (current !== this.root) cleanupError("WORKSPACE_CHANGED");
  }
  async collect(file: string, allowMissing = false, archivedFiles?: Record<string, string>) {
    this.assertWorkspace();
    const storage = this.host.context.globalStorageUri.fsPath;
    const queue = await json(distributedQueuePath(storage, this.root), emptyDistributedQueue());
    const ledger = await json(planSyncLedgerStoragePath(storage, this.root), emptyPlanSyncLedger());
    const registry = await json(path.join(this.root, "simple_cluster/results/project_table_registry.json"), undefined);
    const targets: any[] = [];
    // Include disabled Workers: historical ownership never disappears with the current selection.
    for (const worker of this.host.setupConfig.workerTunnels || []) {
      try { targets.push(this.host.workerCodeSyncTarget(worker)); }
      catch { targets.push({ id: worker.id, error: "当前服务器身份或项目安全根未核实" }); }
    }
    try { if (this.host.setupConfig.agentProjectDir && this.host.setupConfig.savedSessionPath) targets.push(this.host.hubCodeSyncTarget()); }
    catch { targets.push({ id: "hub", error: "当前 Hub 身份或安全根未核实" }); }
    const nodes: any[] = [{ id: "local", kind: "local", root: this.root }, ...targets.map(target => ({ id: target.id, kind: "remote",
      host: target.host, user: target.user, port: target.port, root: target.remotePath || "", ...(target.error ? { error: target.error } : {}) }))];
    const snapshots = await Promise.all(nodes.filter(node => node.kind === "remote").map(async node => {
      if (node.error) return { workerId: node.id, error: node.error };
      try { return { ...await this.host.client.getWorkerTasks(node.id, { signal: AbortSignal.timeout(5000) }), workerId: node.id, fetchedAt: new Date().toISOString() }; }
      catch { return { workerId: node.id, error: "节点当前任务证据不可达" }; }
    }));
    this.assertWorkspace();
    const state = this.host.buildPlanRuntimeEvidenceState();
    const operations = Object.values(state.operations || {});
    const scope = await collectPlanCleanupEvidence({ root: this.root, planFile: file, queue, ledger, registry, nodes, snapshots, operations, allowMissing, archivedFiles });
    scope.nodes.push({ id: "pluginState", kind: "local", root: storage });
    for (const indexFile of [distributedQueuePath(storage, this.root), planSyncLedgerStoragePath(storage, this.root)]) {
      scope.candidates.push({ nodeId: "pluginState", relativePath: path.relative(storage, indexFile).replace(/\\/g, "/"), type: "file",
        category: "插件缓存/任务索引", owners: [scope.planKey], evidence: ["当前项目的持久化登记与清理生命周期标记"],
        dependencies: ["同项目其他 PLAN 与历史恢复证据"], protectedReason: "共享索引保留，完成后仅追加生命周期标记" });
    }
    for (const document of vscode.workspace.textDocuments.filter(document => document.isDirty && document.uri.scheme === "file")) {
      const relative = path.relative(this.root, document.uri.fsPath).replace(/\\/g, "/");
      if (scope.candidates.some(row => row.nodeId === "local" && (row.relativePath === relative || relative.startsWith(row.relativePath + "/"))))
        scope.blockers.push({ code: "DIRTY_EDITOR_TARGET", detail: document.uri.fsPath });
    }
    scope.revision = cleanupDigest([scope.revision, scope.nodes, scope.candidates.filter(row => row.nodeId === "pluginState")]);
    return scope;
  }
  private async restoreGate(preview: CleanupPreview, operation?: CleanupOperation) {
    const archivedFiles = Object.fromEntries(preview.rows.filter(row => row.node.kind === "local" && ["PLAN 文件", "专用配置"].includes(row.category)
      && operation?.targets[row.id]?.state !== "completed")
      .map(row => [row.destination, row.relativePath]));
    const fresh = await this.collect(preview.scope.planFile, true, archivedFiles);
    if (fresh.blockers.length) cleanupError("RESTORE_PREFLIGHT_BLOCKED", JSON.stringify(fresh.blockers));
    for (const row of preview.rows) {
      const node = fresh.nodes.find(node => node.id === row.node.id);
      if (!node || cleanupDigest({ ...node, error: undefined }) !== cleanupDigest({ ...row.node, error: undefined })) cleanupError("SERVER_IDENTITY_CHANGED");
      const original = row.destination;
      if ((fresh.references?.[original] || []).some(owner => owner !== preview.scope.planKey)) cleanupError("SHARED_DEPENDENCY");
      if (fresh.candidates.some(candidate => candidate.relativePath === original && candidate.nodeId === node.id && candidate.dependencies.length))
        cleanupError("SHARED_DEPENDENCY");
    }
  }
  private async updateIndexes(operation: CleanupOperation, restore: boolean) {
    this.assertWorkspace();
    const originalId = operation.preview.originalOperationId || operation.id;
    const queue = await this.host.loadDistributedQueue(this.root);
    const ids = new Set(operation.preview.scope.runIds);
    for (const plan of queue.plans) if (ids.has(plan.id)) {
      if (restore) { if (plan.cleanup?.operationId === originalId) delete plan.cleanup; }
      else plan.cleanup = { operationId: operation.id, state: operation.pendingNodes.length ? "partial" : operation.preview.action === "delete" ? "deleted" : "archived",
        completedTargets: operation.preview.rows.filter(row => operation.targets[row.id]?.state === "completed").map(row => row.node.id + ":" + row.absolutePath), pendingNodes: operation.pendingNodes };
    }
    await this.host.saveDistributedQueue(this.root, queue);
    await this.host.updatePlanSyncLedger(this.root, (ledger: any) => {
      for (const entry of Object.values(ledger.entries) as any[]) if (ids.has(entry.runId)) {
        if (restore) { if (entry.cleanupOperationId === originalId) delete entry.cleanupOperationId; }
        else entry.cleanupOperationId = operation.id;
      }
      return ledger;
    });
    if (restore) {
      const original = await this.service.status(originalId); original.restoredBy = operation.id;
      const storage = path.join(this.host.context.globalStorageUri.fsPath, "plan-cleanup", cleanupDigest(this.root), originalId + ".json");
      await atomicWriteText(storage, JSON.stringify(original, null, 2));
    }
    this.host.localPlanMetadataUpdatedAt = 0;
    this.host.postState();
  }
  async execute(id: string) {
    if (this.executing) cleanupError("OPERATION_BUSY");
    this.executing = true;
    try {
      const pending = this.host.distributedQueueTickPromise;
      if (pending) await pending;
      return await this.host.withHostOperationLease("cleanupPlan", "清除 PLAN 及关联产物", () => this.service.execute(id),
        { resources: [{ server: "local", project: this.root, target: this.root }] });
    } finally { this.executing = false; }
  }
  open(file: string) { return openPlanCleanupPanel(this, file); }
}
