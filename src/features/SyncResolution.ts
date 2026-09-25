import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

export type SyncHold = { endpointId: string; deletedAt: string; directory: boolean; codeOwned?: boolean; status?: "pending" | "resolved"; sha256?: string; fileHashes?: Record<string, string> };
export type SyncHolds = Record<string, SyncHold>;

export function safeSyncPath(relative: string): string {
  const value = String(relative || "").replace(/\\/g, "/");
  if (!value || value.startsWith("/") || /^[a-z]:/i.test(value) || value.split("/").some((part) => !part || part === "." || part === ".."))
    throw new Error(`同步路径不安全：${relative}`);
  return value;
}

export function isSyncHeld(relative: string, holds: SyncHolds): boolean {
  return Object.entries(holds).some(([held, row]) => row.status !== "resolved" && (relative === held || row.directory && relative.startsWith(`${held}/`)));
}

export function chosenSyncHash(relative: string, holds: SyncHolds): string | undefined {
  const exact = holds[relative];
  if (exact?.status === "resolved" && !exact.directory) return exact.sha256;
  for (const [held, row] of Object.entries(holds))
    if (row.status === "resolved" && row.directory && relative.startsWith(`${held}/`)) return row.fileHashes?.[relative];
  return undefined;
}

export function filterHeldFiles<T>(files: Record<string, T>, holds: SyncHolds): Record<string, T> {
  return Object.fromEntries(Object.entries(files).filter(([relative]) => !isSyncHeld(relative, holds)));
}

export function syncHoldsStoragePath(storageRoot: string, projectRoot: string): string {
  const resolved = path.resolve(projectRoot);
  const id = crypto.createHash("sha256").update(process.platform === "win32" ? resolved.toLowerCase() : resolved).digest("hex");
  return path.join(storageRoot, "sync-holds", `${id}.json`);
}

export async function loadSyncHolds(storageRoot: string, projectRoot: string): Promise<SyncHolds> {
  const file = syncHoldsStoragePath(storageRoot, projectRoot);
  const content = await fs.readFile(file, "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return "{}";
    throw error;
  });
  const value = JSON.parse(content);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("同步暂停记录格式无效。");
  for (const [relative, row] of Object.entries(value)) {
    safeSyncPath(relative);
    if (!row || typeof row !== "object" || typeof (row as SyncHold).endpointId !== "string") throw new Error("同步暂停记录条目无效。");
    const item = row as SyncHold;
    if (item.status === "resolved" && (item.directory ? !item.fileHashes || typeof item.fileHashes !== "object" : !/^[a-f0-9]{64}$/i.test(item.sha256 || "")))
      throw new Error("同步保留版本记录无效。");
    for (const [file, hash] of Object.entries(item.fileHashes || {})) if (!safeSyncPath(file) || !/^[a-f0-9]{64}$/i.test(hash)) throw new Error("同步保留目录记录无效。");
  }
  return value;
}

export async function saveSyncHolds(storageRoot: string, projectRoot: string, holds: SyncHolds): Promise<void> {
  const file = syncHoldsStoragePath(storageRoot, projectRoot);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}-${crypto.randomBytes(4).toString("hex")}`;
  await fs.writeFile(temporary, JSON.stringify(holds, null, 2) + "\n", "utf8");
  await fs.rename(temporary, file);
}

function psLiteral(value: string): string { return `'${value.replace(/'/g, "''")}'`; }

export function localDeleteScript(root: string, relative: string): string {
  safeSyncPath(relative);
  const full = path.resolve(root, ...relative.split("/"));
  const parent = path.dirname(full);
  const leaf = `.\\${path.basename(full)}`;
  if (path.relative(root, full).startsWith("..") || full === path.resolve(root)) throw new Error("删除目标超出项目根目录。");
  return `$ErrorActionPreference = 'Stop'; try { Set-Location -LiteralPath ${psLiteral(parent)}; if ((Get-Location).ProviderPath -ne ${psLiteral(parent)}) { throw 'PARENT_CD_FAILED' } } catch { [Console]::Error.WriteLine('PARENT_CD_FAILED'); exit 75 }; Remove-Item -LiteralPath ${psLiteral(leaf)} -Recurse -Force -ErrorAction Stop`;
}

export async function deleteLocalSyncPath(root: string, relative: string): Promise<string> {
  safeSyncPath(relative);
  const full = path.resolve(root, ...relative.split("/"));
  const rootReal = await fs.realpath(root);
  const parentReal = await fs.realpath(path.dirname(full)).catch(() => { throw new Error(`PARENT_CD_FAILED：无法进入父目录 ${path.dirname(full)}；禁止删除。`); });
  const within = path.relative(rootReal, parentReal);
  if (within === ".." || within.startsWith(`..${path.sep}`) || path.isAbsolute(within)) throw new Error("删除目标超出项目根目录。");
  const target = await fs.lstat(full);
  if (target.isSymbolicLink()) throw new Error("禁止删除符号链接。");
  try { await promisify(execFile)("pwsh.exe", ["-NoProfile", "-NonInteractive", "-Command", localDeleteScript(rootReal, relative)], { windowsHide: true, timeout: 30000 }); }
  catch (error) {
    if (String(error).includes("PARENT_CD_FAILED")) throw new Error(`PARENT_CD_FAILED：无法进入父目录 ${parentReal}；禁止删除。`);
    throw error;
  }
  return full;
}
