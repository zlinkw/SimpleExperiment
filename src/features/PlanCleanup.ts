import { createHash, randomBytes } from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { atomicWriteText } from "../state/StateStore";

export type CleanupNode = { id: string; kind: "local" | "remote"; root: string; host?: string; port?: number; user?: string; error?: string };
export type CleanupCandidate = { nodeId: string; relativePath: string; type: "file" | "directory"; category: string;
  owners: string[]; evidence: string[]; protectedReason?: string; dependencies: string[]; expectedSha256?: string;
  expectedOwner?: { workflowId: string; commandId: string; workerId: string; outputDir: string; attempt: number; case: string; seed: number } };
export type CleanupScope = { projectId: string; planKey: string; planFile: string; planHash: string; runIds: string[];
  revision: string; nodes: CleanupNode[]; candidates: CleanupCandidate[]; references?: Record<string, string[]>;
  blockers: Array<{ code: string; nodeId?: string; detail: string }> };
export type CleanupRow = CleanupCandidate & { id: string; node: CleanupNode; destination: string; fingerprint?: string;
  contentFingerprint?: string; size?: number; absolutePath: string; inventory?: any[]; inode?: string; device?: string;
  backendToken?: string; backendDigest?: string; backendIndex?: number; rootIdentity?: Record<string, unknown>;
  disposition: "move" | "delete" | "restore" | "protected" | "unverified" | "absent"; error?: string };
export type CleanupPreview = { token: string; digest: string; action: "move" | "delete" | "restore"; scope: CleanupScope;
  rows: CleanupRow[]; blockers: CleanupScope["blockers"]; verifiedOnly: boolean; expiresAt: number; confirmations: number;
  originalOperationId?: string };
export type CleanupOperation = { id: string; preview: CleanupPreview; state: "ready" | "running" | "paused" | "partial" | "completed" | "blocked";
  targets: Record<string, { state: "pending" | "executing" | "completed"; receipt?: any; error?: string }>;
  pendingNodes: string[]; error?: string; updatedAt: string; indexed?: boolean; restoredBy?: string };
export type CleanupPorts = {
  collect(planFile: string, options?: { archivedFiles: Record<string, string> }): Promise<CleanupScope>;
  sftp(method: string, params: any): Promise<any>;
  updateIndexes(operation: CleanupOperation, restore: boolean): Promise<void>;
  restoreGate(preview: CleanupPreview, operation?: CleanupOperation): Promise<void>;
  storageRoot: string;
};
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
export const cleanupDigest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function cleanupError(code: string, detail = code): never {
  const error = Object.assign(new Error(detail), { apiCode: code === "CONFIRM_REQUIRED" ? 2001 : 2010, apiData: { code, detail } });
  throw error;
}
export function cleanupRelative(value: string): string {
  if (!value || value.length > 4096 || /[\\:\x00-\x1f*?\[\]{}]/.test(value) || value.startsWith("/")
    || value.split("/").some(part => !part || part === "." || part === "..")) cleanupError("UNSAFE_PATH");
  return value;
}
const under = (base: string, file: string) => file === base || file.startsWith(base + "/");

/** Ownership is an explicit registry join. Names, modification times and prefixes are never evidence. */
export function classifyCleanupCandidates(scope: CleanupScope): CleanupCandidate[] {
  return scope.candidates.map(input => {
    const row = clone(input), rel = cleanupRelative(row.relativePath);
    const protectedParts = new Set([".git", "clean_dir", "models", "trainers", "encoders", "data", "datasets", "paper", "splits", "clean", "low_quality", "biomedclip"]);
    if (rel.split("/").some(part => protectedParts.has(part.toLowerCase()))) row.protectedReason ||= "受保护资产";
    if (!row.evidence.length || !row.owners.length || row.owners.some(owner => owner !== scope.planKey)) row.protectedReason ||= "所有权不唯一或证据不足";
    if (row.dependencies.length) row.protectedReason ||= "存在外部引用：" + row.dependencies.join("；");
    return row;
  });
}

/** Shared coordinator for Webview and JSON-RPC. Preview remains entirely read-only. */
export class PlanCleanup {
  private previews = new Map<string, CleanupPreview>();
  private busy = new Set<string>();
  private cancelled = new Set<string>();
  constructor(private readonly ports: CleanupPorts) {}
  private file(id: string) { if (!/^[a-f0-9]{48}$/.test(id)) cleanupError("INVALID_OPERATION_ID"); return path.join(this.ports.storageRoot, id + ".json"); }
  private async save(operation: CleanupOperation) {
    operation.updatedAt = new Date().toISOString();
    await atomicWriteText(this.file(operation.id), JSON.stringify(operation, null, 2));
  }
  async status(id: string): Promise<CleanupOperation> {
    try { return JSON.parse(await fs.readFile(this.file(id), "utf8")); }
    catch (error: any) { if (error.code === "ENOENT") cleanupError("OPERATION_NOT_FOUND"); throw error; }
  }
  async list(): Promise<Array<Pick<CleanupOperation, "id" | "state" | "updatedAt" | "pendingNodes"> & { planFile: string; action: string }>> {
    const names = await fs.readdir(this.ports.storageRoot).catch((error: any) => { if (error.code === "ENOENT") return []; throw error; });
    const rows = [];
    for (const name of names.filter(name => /^[a-f0-9]{48}\.json$/.test(name))) {
      const operation = await this.status(name.slice(0, -5));
      rows.push({ id: operation.id, state: operation.state, updatedAt: operation.updatedAt, pendingNodes: operation.pendingNodes,
        planFile: operation.preview.scope.planFile, action: operation.preview.action });
    }
    return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  async preview(params: { planFile: string; action?: "move" | "delete"; verifiedOnly?: boolean }): Promise<CleanupPreview> {
    for (const [token, preview] of this.previews) if (Date.now() > preview.expiresAt) this.previews.delete(token);
    if (this.previews.size >= 16) this.previews.delete(this.previews.keys().next().value!);
    const action = params.action || "move";
    if (!["move", "delete"].includes(action)) cleanupError("INVALID_ACTION");
    const scope = await this.ports.collect(cleanupRelative(params.planFile));
    const token = randomBytes(24).toString("hex");
    const result: CleanupPreview = { token, digest: "", action, scope, rows: [], blockers: clone(scope.blockers),
      verifiedOnly: params.verifiedOnly === true, expiresAt: Date.now() + 30 * 60 * 1000, confirmations: 0 };
    const candidates = classifyCleanupCandidates(scope);
    for (const candidate of candidates) {
      const node = scope.nodes.find(row => row.id === candidate.nodeId);
      if (!node) { result.blockers.push({ code: "SERVER_IDENTITY_UNVERIFIED", nodeId: candidate.nodeId, detail: candidate.relativePath }); continue; }
      const absolutePath = node.kind === "local" ? path.join(node.root, candidate.relativePath) : path.posix.join(node.root, candidate.relativePath);
      const row: CleanupRow = { ...candidate, id: cleanupDigest([node.id, node.root, candidate.relativePath, candidate.type]), node,
        absolutePath, destination: "clean_dir/" + candidate.relativePath,
        disposition: candidate.protectedReason ? "protected" : node.error ? "unverified" : action };
      result.rows.push(row);
    }
    // Parent targets absorb exact registered children only; evidence is preserved in the parent review.
    for (const row of result.rows) if (row.disposition === action) {
      const child = result.rows.filter(other => other !== row && other.node.id === row.node.id && under(row.relativePath, other.relativePath));
      if (child.some(other => other.disposition === "protected")) { row.disposition = "protected"; row.protectedReason = "包含受保护资产"; }
    }
    for (const row of result.rows) if (row.disposition === action && result.rows.some(parent => parent !== row && parent.node.id === row.node.id
      && parent.type === "directory" && parent.disposition === action && under(parent.relativePath, row.relativePath))) {
      row.disposition = "protected"; row.protectedReason = "由同批精确父目录处理（保留逐项证据）";
    }
    const physical = new Map<string, CleanupRow>();
    for (const node of scope.nodes) {
      const rows = result.rows.filter(row => row.node.id === node.id && row.disposition === action);
      if (node.error) { result.blockers.push({ code: "OFFLINE_NODE", nodeId: node.id, detail: node.error }); continue; }
      if (!rows.length) continue;
      try {
        const backend = await this.ports.sftp("files.cleanup.preview", { node, action, targets: rows.map(row => ({ relativePath: row.relativePath, type: row.type,
          destination: row.destination, expectedSha256: row.expectedSha256, expectedOwner: row.expectedOwner })) });
        rows.forEach((row, index) => {
          const info = backend.targets[index];
          Object.assign(row, { ...info, relativePath: row.relativePath, destination: row.destination,
            backendToken: backend.token, backendDigest: backend.digest, backendIndex: index, rootIdentity: backend.rootIdentity });
          if (info.missing) { row.disposition = "absent"; return; }
          const key = cleanupDigest([backend.rootIdentity, info.device, info.inode]);
          const previous = physical.get(key);
          if (previous) { row.disposition = "protected"; row.protectedReason = "同一物理目标，已由 " + previous.node.id + " 处理"; }
          else physical.set(key, row);
          for (const ref of info.references || []) if (!under(row.relativePath, ref.path) && !result.rows.some(other => other.node.id === node.id && other.relativePath === ref.path)) {
            result.rows.push({ nodeId: node.id, node, relativePath: ref.path, type: ref.type, category: ref.field === "code_backup_ref" || ref.field === "code_backup_path" ? "代码备份引用" : "配置/checkpoint 外部引用",
              owners: [scope.planKey], evidence: ["manifest=" + ref.manifest + " SHA256=" + ref.manifestSha256], dependencies: ["外部共享引用尚未完整证明"],
              protectedReason: "缺少该引用的独占所有权证明", disposition: "protected", id: cleanupDigest([node.id, ref.path]),
              absolutePath: node.kind === "local" ? path.join(node.root, ref.path) : path.posix.join(node.root, ref.path), destination: "clean_dir/" + ref.path });
          }
        });
      } catch (error: any) {
        const code = error.apiData?.code || error.code || "NODE_PREFLIGHT_FAILED";
        result.blockers.push({ code, nodeId: node.id, detail: String(error.message || code) });
        rows.forEach(row => { row.disposition = "unverified"; row.error = code; });
      }
    }
    // Shared/unknown targets remain visible, with hashes when read-only inspection is possible.
    for (const row of result.rows.filter(row => row.disposition === "protected" && !row.fingerprint && row.node.root && !row.node.error)) {
      try {
        const info = await this.ports.sftp("files.cleanup.inspect", { node: row.node, target: { relativePath: row.relativePath, type: row.type } });
        Object.assign(row, info.target);
      } catch { row.error ||= "受保护目标未读取或不存在；不会处理"; }
    }
    result.digest = cleanupDigest({ action, scope, rows: result.rows, verifiedOnly: result.verifiedOnly });
    this.previews.set(token, clone(result));
    return clone(result);
  }
  private assertAllowed(preview: CleanupPreview) {
    if (preview.blockers.some(row => !(preview.verifiedOnly && ["OFFLINE_NODE", "NODE_UNREACHABLE"].includes(row.code))))
      cleanupError("PREFLIGHT_BLOCKED", JSON.stringify(preview.blockers));
    if (!preview.rows.some(row => row.disposition === preview.action)) cleanupError("NO_VERIFIED_TARGETS");
  }
  async confirm(params: { token: string; digest: string; phase: number; confirm: boolean; exactTargets: string[] }): Promise<CleanupOperation> {
    let preview = this.previews.get(params.token);
    if (!preview) preview = (await this.status(params.token)).preview;
    if (Date.now() > preview.expiresAt) cleanupError("PREVIEW_EXPIRED");
    this.assertAllowed(preview);
    const exact = preview.rows.filter(row => row.disposition === preview.action).map(row => row.node.id + ":" + row.absolutePath);
    if (params.confirm !== true || params.digest !== preview.digest || cleanupDigest(params.exactTargets) !== cleanupDigest(exact)
      || params.phase !== preview.confirmations + 1 || params.phase > (preview.action === "delete" ? 2 : 1)) cleanupError("CONFIRM_REQUIRED");
    await this.revalidate(preview);
    for (const [backendToken, row] of new Map(preview.rows.filter(row => row.disposition === preview!.action).map(row => [row.backendToken!, row]))) {
      const backend = await this.ports.sftp("files.cleanup.status", { token: backendToken });
      await this.ports.sftp("files.cleanup.confirm", { token: backendToken, digest: row.backendDigest, phase: params.phase,
        confirm: true, exactTargets: backend.targets.filter((target: any) => !target.missing).map((target: any) => target.absolutePath) });
    }
    preview.confirmations = params.phase;
    const operation: CleanupOperation = { id: preview.token, preview: clone(preview), state: "ready", targets: Object.fromEntries(
      preview.rows.filter(row => row.disposition === preview!.action).map(row => [row.id, { state: "pending" }])),
      pendingNodes: [...new Set(preview.blockers.map(row => row.nodeId).filter(Boolean))] as string[], updatedAt: "" };
    await this.save(operation); this.previews.set(preview.token, clone(preview));
    return clone(operation);
  }
  private async revalidate(preview: CleanupPreview, operation?: CleanupOperation) {
    if (preview.action === "restore") { await this.ports.restoreGate(preview, operation); return; }
    const archivedFiles = Object.fromEntries(preview.rows.filter(row => row.node.kind === "local" && ["PLAN 文件", "专用配置"].includes(row.category)
      && operation?.targets[row.id]?.state === "completed" && preview.action === "move").map(row => [row.relativePath, row.destination]));
    const fresh = await this.ports.collect(preview.scope.planFile, { archivedFiles });
    if (fresh.revision !== preview.scope.revision || fresh.planHash !== preview.scope.planHash) cleanupError("PREVIEW_CHANGED");
    const allowedOffline = new Set(preview.verifiedOnly ? preview.blockers.filter(row => ["OFFLINE_NODE", "NODE_UNREACHABLE"].includes(row.code)).map(row => row.nodeId) : []);
    if (fresh.blockers.some(row => !allowedOffline.has(row.nodeId))) cleanupError("ACTIVE_OR_UNVERIFIED_NODE", JSON.stringify(fresh.blockers));
    for (const row of preview.rows.filter(row => row.disposition === "protected" && row.fingerprint && !row.node.error)) {
      if (operation && preview.rows.some(parent => operation.targets[parent.id]?.state === "completed"
        && (parent.node.id === row.node.id && under(parent.relativePath, row.relativePath)
          || parent.inode === row.inode && parent.device === row.device && cleanupDigest(parent.rootIdentity) === cleanupDigest(row.rootIdentity)))) continue;
      const current = await this.ports.sftp("files.cleanup.inspect", { node: row.node, target: { relativePath: row.relativePath, type: row.type } });
      if (current.target.fingerprint !== row.fingerprint) cleanupError("DEPENDENCY_CHANGED");
    }
  }
  async execute(id: string): Promise<CleanupOperation> {
    if (this.busy.has(id)) cleanupError("OPERATION_BUSY");
    const operation = await this.status(id), preview = operation.preview;
    if (preview.confirmations !== (preview.action === "delete" ? 2 : 1)) cleanupError("CONFIRM_REQUIRED");
    if (operation.state === "completed") return operation;
    this.busy.add(id); this.cancelled.delete(id);
    try {
      // A moved PLAN/config can disappear before its response reaches us. Settle
      // that frozen receipt first; this endpoint cannot launch another move.
      for (const row of preview.rows.filter(row => operation.targets[row.id]?.state === "executing")) {
        const response = await this.ports.sftp("files.cleanup.settle", { token: row.backendToken, digest: row.backendDigest, index: row.backendIndex });
        if (!["completed", "pending"].includes(response.state)) cleanupError("RECEIPT_UNVERIFIED");
        operation.targets[row.id] = response.state === "completed" ? { state: "completed", receipt: response.receipt } : { state: "pending" };
        await this.save(operation);
      }
      for (const row of preview.rows.filter(row => operation.targets[row.id]?.state === "completed"))
        await this.ports.sftp("files.cleanup.verify", { token: row.backendToken, index: row.backendIndex });
      if (Object.values(operation.targets).some(target => target.state !== "completed")) await this.revalidate(preview, operation);
      for (const row of preview.rows.filter(row => row.disposition === "absent")) {
        const check = await this.ports.sftp("files.cleanup.preview", { node: row.node, action: preview.action,
          targets: [{ relativePath: row.relativePath, destination: row.destination, type: row.type }] });
        if (!check.targets[0].missing || cleanupDigest(check.rootIdentity) !== cleanupDigest(row.rootIdentity)) cleanupError("PREVIEW_CHANGED");
      }
      // Recheck every unprocessed node before any mutation; successful targets are never resent.
      for (const row of preview.rows.filter(row => operation.targets[row.id]?.state === "pending")) {
        const check = await this.ports.sftp("files.cleanup.preview", { node: row.node, action: preview.action,
          targets: [{ relativePath: row.relativePath, destination: row.destination, type: row.type }] });
        if (check.targets[0].fingerprint !== row.fingerprint || cleanupDigest(check.rootIdentity) !== cleanupDigest(row.rootIdentity)) cleanupError("PREVIEW_CHANGED");
      }
      operation.state = "running"; delete operation.error; await this.save(operation);
      for (const row of preview.rows.filter(row => operation.targets[row.id])) {
        const state = operation.targets[row.id];
        if (state.state === "completed") continue;
        if (this.cancelled.has(id) || (await this.status(id)).state === "paused") { operation.state = "paused"; await this.save(operation); return operation; }
        state.state = "executing"; await this.save(operation);
        const response = await this.ports.sftp("files.cleanup.execute", { token: row.backendToken, digest: row.backendDigest, index: row.backendIndex });
        state.state = "completed"; state.receipt = response.receipt; delete state.error; await this.save(operation);
      }
      operation.state = operation.pendingNodes.length ? "partial" : "completed";
      if (!operation.indexed) { await this.ports.updateIndexes(operation, preview.action === "restore"); operation.indexed = true; }
      await this.save(operation); return clone(operation);
    } catch (error: any) {
      operation.state = "blocked"; operation.error = String(error.message || error);
      await this.save(operation); throw Object.assign(error, { apiData: { ...error.apiData, operationId: id, state: operation.state } });
    } finally { this.busy.delete(id); }
  }
  async cancel(id: string) {
    const operation = await this.status(id); this.cancelled.add(id);
    if (operation.state !== "completed") { operation.state = "paused"; await this.save(operation); }
    return operation;
  }
  async restorePreview(id: string): Promise<CleanupPreview> {
    const original = await this.status(id);
    if (original.preview.action !== "move" || original.restoredBy) cleanupError("NOT_RESTORABLE");
    // Dependencies and live activity remain gates; original PLAN may be absent after a successful move.
    const preview = clone(original.preview); preview.token = randomBytes(24).toString("hex"); preview.action = "restore";
    preview.originalOperationId = id; preview.confirmations = 0; preview.expiresAt = Date.now() + 30 * 60 * 1000;
    preview.blockers = [];
    preview.rows = [];
    for (const row of original.preview.rows.filter(row => original.targets[row.id]?.state === "completed")) {
      const backend = await this.ports.sftp("files.cleanup.preview", { node: row.node, action: "restore",
        targets: [{ relativePath: row.destination, type: row.type, destination: row.relativePath }] });
      if (backend.targets[0].contentFingerprint !== row.contentFingerprint || backend.targets[0].inode !== row.inode) cleanupError("CONTENT_CHANGED");
      preview.rows.push({ ...row, ...backend.targets[0], relativePath: row.destination, destination: row.relativePath, disposition: "restore",
        backendToken: backend.token, backendDigest: backend.digest, backendIndex: 0, rootIdentity: backend.rootIdentity });
    }
    if (!preview.rows.length) cleanupError("NO_VERIFIED_TARGETS");
    preview.digest = cleanupDigest(preview.rows); this.previews.set(preview.token, clone(preview)); return preview;
  }
}
