import { PlanSyncLedger, latestPlanSyncEntry } from "./PlanArtifactSync";
import { ScopeStatus } from "./SyncScopeTree";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { SyncHolds, chosenSyncHash, isSyncHeld } from "./SyncResolution";

type File = { sha256: string; size: number; modifiedAtMs?: number };
export function requireCompleteScopeInventory<T extends { unverifiedFiles?: Record<string, string> }>(result: T, location = ""): T {
  const unverified = Object.entries(result.unverifiedFiles || {});
  if (unverified.length)
    throw new Error(`${location ? `${location}：` : ""}清单有 ${unverified.length} 个未验证路径（${unverified[0][0]}：${unverified[0][1]}），请确认该路径后刷新重试。`);
  return result;
}
export type ScopeInventories = {
  local: Record<string, File>;
  workers: Record<string, Record<string, File>>;
  unverified?: Record<string, Record<string, string>>;
};
const localHashCache = new Map<string, { identity: string; file: File }>();

function fileIdentity(stat: { dev: number; ino: number; size: number; mtimeMs: number; ctimeMs: number }): string {
  return `${stat.dev}:${stat.ino}:${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}`;
}

export function scopeInventoryPathAllowed(relative: string, directory = false): boolean {
  const parts = relative.toLowerCase().split("/");
  if (parts[0] === "tmp" || parts.some((part) => [".git", ".vscode", ".codex", ".agents", ".coding-tools", ".local-gpt", ".runtime", "clean_dir", "zlk_cluster", ".venv", "venv", "env", "node_modules", "__pycache__", ".cache", ".pytest_cache", ".mypy_cache", ".ruff_cache", ".tox"].includes(part))) return false;
  if (parts[0] === "experiments" && parts[1] === "results" && parts.at(-1)?.endsWith(".csv.lock")) return false;
  if (parts[0] === "work_dirs" && parts.at(-1) === ".tb_mean.lock") return false;
  if (parts.at(-1)?.startsWith(".env")) return false;
  if (["plan_sync_ledger.json", "project_mirror_state.json"].includes(parts.at(-1) || "")) return false;
  if (parts[0] !== "simple_cluster" || parts.length < 2) return true;
  if (["results", "debug_runs"].includes(parts[1])) return true;
  if (parts[1] !== "tmp") return false;
  if (parts.length === 2 || parts[2] === "tmux_logs") return true;
  if (parts[2] === "cluster_scheduler") return parts.length === 3 && directory || parts[3] === "logs" || parts.length === 4 && parts.at(-1)?.endsWith(".log") === true;
  return false;
}

export async function collectLocalScopeInventory(
  root: string, relative = ".", recursive = true, onUnverified?: (relative: string, reason: string) => void,
): Promise<Record<string, File>> {
  if (relative !== "." && (relative.startsWith("/") || /^[a-z]:/i.test(relative) || relative.split("/").some((part) => !part || part === "." || part === "..")))
    throw new Error(`本机清单路径不安全：${relative}`);
  const names: string[] = [];
  async function walk(current: string): Promise<void> {
    const base = current ? path.join(root, ...current.split("/")) : root;
    const stat = await fs.lstat(base).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return undefined;
      throw error;
    });
    if (!stat) return;
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`本机清单目录不安全：${current}`);
    for (const entry of await fs.readdir(base, { withFileTypes: true })) {
      const child = current ? `${current}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink() || !scopeInventoryPathAllowed(child, entry.isDirectory())) continue;
      if (entry.isDirectory() && recursive) await walk(child);
      else if (entry.isFile()) names.push(child);
    }
  }
  await walk(relative === "." ? "" : relative);
  const files: Record<string, File> = {};
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(8, Math.max(1, names.length)) }, async () => {
    for (;;) {
      const index = next++;
      if (index >= names.length) break;
      const relative = names[index];
      const full = path.join(root, ...relative.split("/"));
      try {
      const before = await fs.lstat(full);
      if (!before.isFile() || before.isSymbolicLink()) throw new Error(`本机清单路径发生变化：${relative}`);
      const identity = fileIdentity(before);
      const cached = localHashCache.get(full);
      if (cached?.identity === identity) { files[relative] = cached.file; continue; }
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
      if (!after.isFile() || after.isSymbolicLink() || identity !== fileIdentity(after)) throw new Error(`本机文件在校验时变更：${relative}`);
      const file = { sha256: hash.digest("hex"), size: after.size, modifiedAtMs: after.mtimeMs };
      localHashCache.set(full, { identity, file });
      files[relative] = file;
      } catch (error) {
        if (!onUnverified) throw error;
        onUnverified(relative, error instanceof Error ? error.message : String(error));
      }
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
  holds: SyncHolds = {},
): Record<string, ScopeStatus> {
  const workers = Object.keys(inventories.workers).sort();
  const all = new Set([
    ...Object.keys(inventories.local),
    ...workers.flatMap((id) => Object.keys(inventories.workers[id] || {})),
    ...Object.values(inventories.unverified || {}).flatMap((files) => Object.keys(files)),
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
    const versions: NonNullable<ScopeStatus["versions"]> = {};
    const addVersion = (id: string, file?: File) => { if (file?.sha256) versions[id] = { sha256: file.sha256, modifiedAtMs: Number(file.modifiedAtMs || 0) }; };
    addVersion("local", inventories.local[path]);
    for (const id of workers) if (!offlineWorkerIds.has(id)) addVersion(id, inventories.workers[id]?.[path]);
    const held = isSyncHeld(path, holds);
    const unstable = Object.entries(inventories.unverified || {}).filter(([, files]) => files[path]);
    if (unstable.length) {
      const detail = unstable.map(([id, files]) => `${id === "local" ? "本机" : id} ${files[path]}，待重试`).join(" · ");
      statuses[path] = { state: "unknown", detail, versions, held, unverified: true };
      continue;
    }
    if (mode === "local-server") {
      const detail = [`本机 ${localHash ? "最新版" : "缺失"}`, ...remote.map(({ id, hash }) => `${id} ${offlineWorkerIds.has(id) ? "未校验，待核对" : !hash ? "待更新" : hash === localHash ? "最新版" : "待更新"}`)].join(" · ");
      const state = localHash && remote.every(({ hash }) => hash === localHash) ? "same" : offlineWorkerIds.size && localHash && remote.every(({ id, hash }) => offlineWorkerIds.has(id) || hash === localHash) ? "unknown" : "different";
      if (versions.local) versions.local.latest = "local";
      statuses[path] = { state, detail: held ? `${detail} · 自动同步已暂停` : detail, versions, held };
      continue;
    }
    const owner = ownerForPath(path, ledger);
    const ownerHash = owner ? inventories.workers[owner]?.[path]?.sha256?.toLowerCase() : undefined;
    const present = remote.filter(({ hash }) => hash);
    const unique = new Set(present.map(({ hash }) => hash));
    const manualHash = chosenSyncHash(path, holds)?.toLowerCase();
    const reference = manualHash || (owner ? ownerHash : unique.size === 1 ? present[0]?.hash : undefined);
    const remoteSame = Boolean(reference) && remote.every(({ hash }) => hash === reference);
    const localSame = localHash === reference;
    const detail = !reference
      ? `${owner && offlineWorkerIds.has(owner) ? `Plan 归属 ${owner} 未校验，待核对` : "内容冲突，无法判定最新版"} · ${remote.map(({ id, hash }) => `${id} ${offlineWorkerIds.has(id) ? "未校验" : hash ? "冲突" : "缺失"}`).join(" · ")}`
      : [manualHash ? "手动保留版本" : owner ? `Plan 归属：${owner}` : "Worker 内容基准", `本机 ${!localHash ? "缺失" : localHash === reference ? "同版" : "不同版"}`,
        ...remote.map(({ id, hash }) => `${id} ${offlineWorkerIds.has(id) ? "未校验，待核对" : hash === reference ? "最新版" : "待更新"}`)].join(" · ");
    const activeMatch = Boolean(reference) && remote.every(({ id, hash }) => offlineWorkerIds.has(id) || hash === reference);
    const state = remoteSame ? localSame ? "same" : "remote-only"
      : offlineWorkerIds.size && activeMatch || owner && offlineWorkerIds.has(owner) ? "unknown" : "different";
    if (manualHash) {
      for (const file of Object.values(versions)) if (file.sha256.toLowerCase() === manualHash) file.latest = "manual";
    } else if (owner && versions[owner]) versions[owner].latest = "plan";
    else if (!owner && unique.size > 1) {
      const candidates = Object.entries(versions).filter(([id]) => id !== "local");
      const newest = Math.max(...candidates.map(([, file]) => file.modifiedAtMs));
      if (newest > 0 && candidates.filter(([, file]) => file.modifiedAtMs === newest).length === 1)
        for (const [, file] of candidates) if (file.modifiedAtMs === newest) file.latest = "candidate";
    } else if (!owner && unique.size === 1) for (const [id, file] of Object.entries(versions)) if (id !== "local" && file.sha256.toLowerCase() === reference) file.latest = "same";
    statuses[path] = { state, detail: held ? `${detail} · 自动同步已暂停` : detail, versions, held };
  }
  const folders = new Map<string, { total: number; failed: number; remoteOnly: number; unknown: number; outside: number; copies: NonNullable<ScopeStatus["copies"]> }>();
  const count = (folder: string, path: string, status: ScopeStatus) => {
    const row = folders.get(folder) || { total: 0, failed: 0, remoteOnly: 0, unknown: 0, outside: 0, copies: {} };
    const reference = Object.values(status.versions || {}).find((version) => version.latest && version.latest !== "candidate")?.sha256.toLowerCase();
    for (const id of ["local", ...workers]) {
      const copy = row.copies[id] || { modifiedAtMs: 0, present: 0, missing: 0, needsSync: 0, conflict: 0, unverified: 0 };
      const file = id === "local" ? inventories.local[path] : inventories.workers[id]?.[path];
      if (file) copy.modifiedAtMs = Math.max(copy.modifiedAtMs, Number(file.modifiedAtMs || 0));
      if (status.detail !== "当前同步范围外") {
        if (id !== "local" && offlineWorkerIds.has(id) || inventories.unverified?.[id]?.[path]) copy.unverified++;
        else if (!file) copy.missing++;
        else {
          copy.present++;
          if (reference && file.sha256.toLowerCase() !== reference) copy.needsSync++;
          else if (!reference && mode === "server-server" && status.state === "different") copy.conflict++;
        }
      }
      row.copies[id] = copy;
    }
    if (status.detail === "当前同步范围外") { row.outside++; folders.set(folder, row); return; }
    row.total++;
    if (status.state === "different") row.failed++;
    if (status.state === "remote-only") row.remoteOnly++;
    if (status.state === "unknown") row.unknown++;
    folders.set(folder, row);
  };
  for (const path of all) {
    count(".", path, statuses[path]);
    const parts = path.split("/");
    for (let i = 1; i < parts.length; i++) count(parts.slice(0, i).join("/"), path, statuses[path]);
  }
  for (const [folder, { total, failed, remoteOnly, unknown, outside, copies }] of folders) {
    const same = total - failed - remoteOnly - unknown;
    statuses[folder] = {
      state: !total ? "unknown" : failed ? "different" : unknown ? "unknown" : remoteOnly ? "remote-only" : "same",
      detail: total ? `同步范围内 ${total} 个文件 · ${same} 一致 · ${failed} 待更新或冲突 · ${remoteOnly} 仅 Worker 一致 · ${unknown} 未确认${outside ? ` · ${outside} 范围外` : ""}`
        : `当前同步范围外 · ${outside} 个文件`,
      copies,
      held: isSyncHeld(folder, holds),
      unverified: unknown > 0,
    };
  }
  return statuses;
}
