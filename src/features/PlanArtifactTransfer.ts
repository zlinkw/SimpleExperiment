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

export async function transferPlanArtifacts(
  entry: PlanSyncEntry,
  source: SyncTarget,
  destination: SyncTarget,
  sftpCall: SftpCall,
): Promise<{ paths: number }> {
  checkedRoot(source);
  checkedRoot(destination);
  if (!entry.artifactPaths.length) throw new Error("Plan 没有可确认的产物路径，无法同步权重和结果。");
  let paths = 0;
  for (const stale of entry.stalePaths || []) {
    const relativePath = safePlanArtifactPath(stale.path);
    if (!relativePath || (stale.directory && relativePath.split("/").length < 2)) throw new Error(`旧产物路径不安全：${stale.path}`);
    await sftpCall("sync.serverToServer", {
      source,
      destination: { ...destination, host: destination.networkHost || destination.host },
      relativePath,
      directory: stale.directory,
      deleteOnly: true,
      confirm: true,
      pathConfirmed: true,
    });
    paths++;
  }
  for (const raw of entry.artifactPaths) {
    const relativePath = safePlanArtifactPath(raw);
    if (!relativePath) throw new Error(`Plan 产物路径不安全：${raw}`);
    if (entry.directoryPaths.includes(relativePath) && relativePath.split("/").length < 2) throw new Error(`产物目录必须限定到 Plan 独立子目录：${relativePath}`);
    if (path.posix.dirname(relativePath) === "." && !entry.directoryPaths.includes(relativePath)) throw new Error(`拒绝对项目根目录执行产物同步：${relativePath}`);
    await sftpCall("sync.serverToServer", {
      source,
      destination: { ...destination, host: destination.networkHost || destination.host },
      relativePath,
      directory: entry.directoryPaths.includes(relativePath),
      confirm: true,
      pathConfirmed: true,
    });
    paths++;
  }
  return { paths };
}
