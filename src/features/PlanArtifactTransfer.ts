import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";
import { PlanSyncEntry, safePlanArtifactPath } from "./PlanArtifactSync";

export type SyncTarget = { id: string; host: string; user: string; port: number; remotePath: string };
export type SftpCall = (method: string, params: Record<string, unknown>) => Promise<any>;
type TransferFiles = Pick<typeof fs, "mkdir" | "writeFile" | "stat" | "readdir">;

export function planMirrorRoot(entry: PlanSyncEntry, destination: SyncTarget): string {
  const owner = String(entry.sourceWorkerId).toLowerCase();
  if (!/^[a-z0-9._-]+$/.test(owner)) throw new Error("来源 Worker ID 不安全。");
  // Reuse the mirror for later runs of the same Plan on the same Worker.
  const key = [entry.planFile, entry.sourceWorkerId].join("|");
  const namespace = crypto.createHash("sha256").update(key).digest("hex").slice(0, 16);
  return `${targetRoot(destination)}/simple_cluster/worker_mirrors/${owner}/${namespace}`;
}

function targetRoot(target: SyncTarget): string {
  const root = String(target.remotePath || "").replace(/\/+$/, "");
  if (!root.startsWith("/") || root === "/" || !target.host || !target.user || !Number.isInteger(target.port)) throw new Error(`Worker ${target.id} 缺少安全的 SFTP 项目路径或连接信息。`);
  return root;
}

async function stagedFiles(root: string, directory: boolean, artifact: string, filesApi: TransferFiles): Promise<Array<{ localPath: string; remoteName: string }>> {
  if (!directory) {
    const localPath = path.join(root, path.posix.basename(artifact));
    if (!(await filesApi.stat(localPath).catch(() => null))?.isFile()) throw new Error(`来源 Worker 缺少 Plan 产物：${artifact}`);
    return [{ localPath, remoteName: path.posix.basename(artifact) }];
  }
  const files: Array<{ localPath: string; remoteName: string }> = [];
  async function visit(directoryPath: string, prefix = "") {
    for (const item of await filesApi.readdir(directoryPath, { withFileTypes: true })) {
      if (item.name === ".vscode" || item.name === "simple_cluster") continue;
      const localPath = path.join(directoryPath, item.name);
      const remoteName = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.isSymbolicLink()) throw new Error(`Plan 产物包含符号链接，已阻止同步：${remoteName}`);
      if (item.isDirectory()) await visit(localPath, remoteName);
      else if (item.isFile()) files.push({ localPath, remoteName });
      if (files.length > 10000) throw new Error("单个 Plan 产物超过 10000 个文件，已阻止批量同步。");
    }
  }
  await visit(root);
  if (!files.length) throw new Error(`来源 Worker 的 Plan 产物目录为空：${artifact}`);
  return files;
}

export async function transferPlanArtifacts(
  entry: PlanSyncEntry,
  source: SyncTarget,
  destination: SyncTarget,
  stagingRoot: string,
  sftpCall: SftpCall,
  filesApi: TransferFiles = fs,
): Promise<{ files: number; mirrorRoot: string }> {
  const sourceRoot = targetRoot(source);
  targetRoot(destination);
  if (!entry.artifactPaths.length) throw new Error("Plan 没有可确认的产物路径，不能同步整个项目目录。");
  const key = [entry.planFile, entry.revision, entry.sourceWorkerId, entry.runId || "historic"].join("|");
  const namespace = crypto.createHash("sha256").update(key).digest("hex").slice(0, 16);
  const mirrorRoot = planMirrorRoot(entry, destination);
  let totalFiles = 0;
  for (const [index, rawArtifact] of entry.artifactPaths.entries()) {
    const artifact = safePlanArtifactPath(rawArtifact);
    if (!artifact) throw new Error(`Plan 产物路径不安全：${rawArtifact}`);
    const directory = entry.directoryPaths.includes(artifact);
    const remoteParent = directory ? artifact : path.posix.dirname(artifact);
    if (remoteParent === ".") throw new Error(`拒绝下载整个远端项目来寻找产物：${artifact}`);
    const sourcePath = `${sourceRoot}/${remoteParent === "." ? "" : remoteParent}`.replace(/\/+$/, "");
    const stage = path.join(stagingRoot, namespace, `${index}-${crypto.createHash("sha256").update(artifact).digest("hex").slice(0, 12)}-${crypto.randomBytes(4).toString("hex")}`);
    await filesApi.mkdir(path.join(stage, ".vscode"), { recursive: true });
    await filesApi.writeFile(path.join(stage, ".vscode", "sftp.json"), JSON.stringify({ host: source.host, username: source.user, port: source.port, remotePath: sourcePath }) + "\n", "utf8");
    await sftpCall("sync.fromRemote", { localPath: stage, remotePath: sourcePath, server: { ...source, remotePath: sourcePath }, targetId: source.id, confirm: true, pathConfirmed: true });
    const files = await stagedFiles(stage, directory, artifact, filesApi);
    const destinationPath = `${mirrorRoot}/${directory ? artifact : path.posix.dirname(artifact)}`.replace(/\/+$/, "");
    await sftpCall("upload.files", { localBase: stage, localPath: stage, remotePath: destinationPath, server: { ...destination, remotePath: destinationPath }, targetId: destination.id, files, confirm: true, pathConfirmed: true });
    totalFiles += files.length;
  }
  return { files: totalFiles, mirrorRoot };
}
