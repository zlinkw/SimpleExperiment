import { PlanSyncLedger, latestPlanSyncEntry } from "./PlanArtifactSync";
import { ScopeStatus } from "./SyncScopeTree";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as crypto from "node:crypto";

type File = { sha256: string; size: number };
export type ScopeInventories = { local: Record<string, File>; workers: Record<string, Record<string, File>> };

export function scopeInventoryPathAllowed(relative: string, directory = false): boolean {
  const parts = relative.toLowerCase().split("/");
  if (parts.some((part) => [".git", ".vscode", ".codex", "zlk_cluster", ".venv", "venv", "env", "node_modules", "__pycache__", ".cache", ".pytest_cache", ".mypy_cache", ".ruff_cache", ".tox"].includes(part))) return false;
  if (parts.at(-1)?.startsWith(".env")) return false;
  if (["plan_sync_ledger.json", "project_mirror_state.json"].includes(parts.at(-1) || "")) return false;
  if (parts[0] !== "simple_cluster" || parts.length < 2) return true;
  if (["results", "debug_runs"].includes(parts[1])) return true;
  if (parts[1] !== "tmp") return false;
  if (parts.length === 2 || parts[2] === "tmux_logs") return true;
  if (parts[2] === "cluster_scheduler") return parts.length === 3 && directory || parts[3] === "logs" || parts.length === 4 && parts.at(-1)?.endsWith(".log") === true;
  return false;
}

export async function collectLocalScopeInventory(root: string): Promise<Record<string, File>> {
  const names: string[] = [];
  async function walk(relative: string): Promise<void> {
    const base = relative ? path.join(root, ...relative.split("/")) : root;
    for (const entry of await fs.readdir(base, { withFileTypes: true })) {
      const child = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink() || !scopeInventoryPathAllowed(child, entry.isDirectory())) continue;
      if (entry.isDirectory()) await walk(child);
      else if (entry.isFile()) names.push(child);
    }
  }
  await walk("");
  const files: Record<string, File> = {};
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(8, Math.max(1, names.length)) }, async () => {
    for (;;) {
      const index = next++;
      if (index >= names.length) break;
      const relative = names[index];
      const full = path.join(root, ...relative.split("/"));
      const before = await fs.lstat(full);
      if (!before.isFile() || before.isSymbolicLink()) throw new Error(`本机清单路径发生变化：${relative}`);
      const hash = crypto.createHash("sha256");
      const handle = await fs.open(full, "r");
      try {
        const buffer = Buffer.allocUnsafe(1024 * 1024);
        for (;;) {
          const { bytesRead } = await handle.read(buffer, 0, buffer.length, null);
          if (!bytesRead) break;
          hash.update(buffer.subarray(0, bytesRead));
        }
      } finally { await handle.close(); }
      const after = await fs.lstat(full);
      if (!after.isFile() || after.isSymbolicLink() || before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ino !== after.ino) throw new Error(`本机文件在校验时变更：${relative}`);
      files[relative] = { sha256: hash.digest("hex"), size: after.size };
    }
  }));
  return files;
}

function ownerForPath(path: string, ledger: PlanSyncLedger): string | undefined {
  const plans = new Set(Object.values(ledger.entries || {}).map((entry) => entry.planFile));
  for (const plan of plans) {
    const latest = latestPlanSyncEntry(ledger, plan);
    if (latest && (latest.artifactPaths.includes(path) || latest.directoryPaths.some((directory) => path.startsWith(`${directory}/`))))
      return latest.sourceWorkerId;
  }
  return undefined;
}

export function buildScopeStatuses(
  inventories: ScopeInventories,
  mode: "local-server" | "server-server",
  selectedPaths: string[],
  localDefaultPaths: Set<string>,
  ledger: PlanSyncLedger,
  offlineWorkerIds = new Set<string>(),
): Record<string, ScopeStatus> {
  const workers = Object.keys(inventories.workers).sort();
  const all = new Set([
    ...Object.keys(inventories.local),
    ...workers.flatMap((id) => Object.keys(inventories.workers[id] || {})),
  ]);
  const statuses: Record<string, ScopeStatus> = {};
  const inSelectedScope = (path: string) => selectedPaths.some((scope) => scope === "." || path === scope || path.startsWith(`${scope}/`));
  for (const path of [...all].sort()) {
    const inScope = mode === "server-server"
      ? inSelectedScope(path)
      : localDefaultPaths.has(path) || inSelectedScope(path);
    if (!inScope) { statuses[path] = { state: "unknown", detail: "当前同步范围外" }; continue; }
    if (!workers.length) { statuses[path] = { state: "unknown", detail: "尚未配置 Worker" }; continue; }
    const localHash = inventories.local[path]?.sha256?.toLowerCase();
    const remote = workers.map((id) => ({ id, hash: inventories.workers[id]?.[path]?.sha256?.toLowerCase() }));
    if (mode === "local-server") {
      const detail = [`本机 ${localHash ? "最新版" : "缺失"}`, ...remote.map(({ id, hash }) => `${id} ${offlineWorkerIds.has(id) ? "未连接，待核对" : !hash ? "待更新" : hash === localHash ? "最新版" : "待更新"}`)].join(" · ");
      const state = localHash && remote.every(({ hash }) => hash === localHash) ? "same" : offlineWorkerIds.size && localHash && remote.every(({ id, hash }) => offlineWorkerIds.has(id) || hash === localHash) ? "unknown" : "different";
      statuses[path] = { state, detail };
      continue;
    }
    const owner = ownerForPath(path, ledger);
    const ownerHash = owner ? inventories.workers[owner]?.[path]?.sha256?.toLowerCase() : undefined;
    const present = remote.filter(({ hash }) => hash);
    const unique = new Set(present.map(({ hash }) => hash));
    const reference = owner ? ownerHash : unique.size === 1 ? present[0]?.hash : undefined;
    const remoteSame = Boolean(reference) && remote.every(({ hash }) => hash === reference);
    const localSame = localHash === reference;
    const detail = !reference
      ? `${owner && offlineWorkerIds.has(owner) ? `Plan 归属 ${owner} 未连接，待核对` : "内容冲突，无法判定最新版"} · ${remote.map(({ id, hash }) => `${id} ${offlineWorkerIds.has(id) ? "未连接" : hash ? "冲突" : "缺失"}`).join(" · ")}`
      : [owner ? `Plan 归属：${owner}` : "Worker 内容基准", `本机 ${!localHash ? "缺失" : localHash === reference ? "同版" : "不同版"}`,
        ...remote.map(({ id, hash }) => `${id} ${offlineWorkerIds.has(id) ? "未连接，待核对" : hash === reference ? "最新版" : "待更新"}`)].join(" · ");
    const activeMatch = Boolean(reference) && remote.every(({ id, hash }) => offlineWorkerIds.has(id) || hash === reference);
    const state = remoteSame ? localSame ? "same" : "remote-only"
      : offlineWorkerIds.size && activeMatch || owner && offlineWorkerIds.has(owner) ? "unknown" : "different";
    statuses[path] = { state, detail };
  }
  const folders = new Map<string, { total: number; failed: number; remoteOnly: number; unknown: number }>();
  const count = (folder: string, status: ScopeStatus) => {
    const row = folders.get(folder) || { total: 0, failed: 0, remoteOnly: 0, unknown: 0 };
    row.total++;
    if (status.state === "different") row.failed++;
    if (status.state === "remote-only") row.remoteOnly++;
    if (status.state === "unknown") row.unknown++;
    folders.set(folder, row);
  };
  for (const path of all) {
    count(".", statuses[path]);
    const parts = path.split("/");
    for (let i = 1; i < parts.length; i++) count(parts.slice(0, i).join("/"), statuses[path]);
  }
  for (const [folder, { total, failed, remoteOnly, unknown }] of folders) {
    statuses[folder] = { state: failed ? "different" : unknown ? "unknown" : remoteOnly ? "remote-only" : "same", detail: failed ? `${failed} 个文件待更新或冲突` : unknown ? `${unknown} 个文件未确认` : remoteOnly ? `${remoteOnly} 个文件仅 Worker 一致` : `${total} 个文件全部一致` };
  }
  return statuses;
}
