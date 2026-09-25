import * as path from "path";
import { PlanSyncEntry, safePlanArtifactPath } from "./PlanArtifactSync";

export type SyncTarget = { id: string; host: string; user: string; port: number; remotePath: string; networkHost?: string };
export type SftpCall = (method: string, params: Record<string, unknown>) => Promise<any>;

function checkedRoot(target: SyncTarget): string {
  const root = String(target.remotePath || "").replace(/\/+$/, "");
  if (!root.startsWith("/") || root === "/" || !target.host || !target.user || !Number.isInteger(target.port)) throw new Error(`Worker ${target.id} 缺少安全的项目路径或连接信息。`);
  return root;
}

export function directPlanSyncPreview(entry: PlanSyncEntry, source: SyncTarget, destination: SyncTarget): string[] {
  const sourceRoot = checkedRoot(source);
  const destinationRoot = checkedRoot(destination);
  const copies = entry.artifactPaths.map((raw) => {
    const relative = safePlanArtifactPath(raw);
    if (!relative) throw new Error(`Plan 产物路径不安全：${raw}`);
    return `${path.posix.join(sourceRoot, relative)} → ${path.posix.join(destinationRoot, relative)}`;
  });
  const deletes = (entry.stalePaths || []).map((item) => {
    const relative = safePlanArtifactPath(item.path);
    if (!relative) throw new Error(`旧产物路径不安全：${item.path}`);
    return `清理旧产物：${path.posix.join(destinationRoot, relative)}`;
  });
  return [...deletes, ...copies];
}

const BATCH_FILE_LIMIT = 5000;

export async function transferPlanArtifacts(
  entry: PlanSyncEntry,
  source: SyncTarget,
  destination: SyncTarget,
  sftpCall: SftpCall,
): Promise<{ paths: number }> {
  checkedRoot(source);
  checkedRoot(destination);
  if (!entry.artifactPaths.length) throw new Error("Plan 没有可确认的产物路径，无法同步权重和结果。");
  const destinationTarget = { ...destination, host: destination.networkHost || destination.host };
  let paths = 0;
  for (const stale of entry.stalePaths || []) {
    const relativePath = safePlanArtifactPath(stale.path);
    if (!relativePath || (stale.directory && relativePath.split("/").length < 2)) throw new Error(`旧产物路径不安全：${stale.path}`);
    await sftpCall("sync.serverToServer", {
      source,
      destination: destinationTarget,
      relativePath,
      directory: stale.directory,
      deleteOnly: true,
      confirm: true,
      pathConfirmed: true,
    });
    paths++;
  }
  const files: string[] = [];
  for (const raw of entry.artifactPaths) {
    const relativePath = safePlanArtifactPath(raw);
    if (!relativePath) throw new Error(`Plan 产物路径不安全：${raw}`);
    const directory = entry.directoryPaths.includes(relativePath);
    if (directory && relativePath.split("/").length < 2) throw new Error(`产物目录必须限定到 Plan 独立子目录：${relativePath}`);
    if (path.posix.dirname(relativePath) === "." && !directory) throw new Error(`拒绝对项目根目录执行产物同步：${relativePath}`);
    if (directory) {
      await sftpCall("sync.serverToServerFpsync", {
        source,
        destination: destinationTarget,
        relativePath,
        directory: true,
        confirm: true,
        pathConfirmed: true,
      });
      paths++;
    } else {
      files.push(relativePath);
    }
  }
  const uniqueFiles = [...new Set(files)].sort();
  for (let offset = 0; offset < uniqueFiles.length; offset += BATCH_FILE_LIMIT) {
    const relativePaths = uniqueFiles.slice(offset, offset + BATCH_FILE_LIMIT);
    await sftpCall("sync.serverToServerFpsync", {
      source,
      destination: destinationTarget,
      relativePaths,
      confirm: true,
      pathConfirmed: true,
    });
    paths += relativePaths.length;
  }
  return { paths };
}
