import { PlanSyncLedger, latestPlanSyncEntry } from "./PlanArtifactSync";

export type Inventory = Record<string, { sha256: string; size: number }>;
export type MirrorCopy = { sourceWorkerId: string; destinationWorkerId: string; path: string };
export type MirrorPlan = { copies: MirrorCopy[]; conflicts: Array<{ path: string; workers: string[] }>; protectedPaths: string[]; protectedDifferences: string[]; fileCount: number };

function planOwned(path: string, ledger: PlanSyncLedger): boolean {
  const plans = new Set(Object.values(ledger.entries || {}).map((entry) => entry.planFile));
  for (const planFile of plans) {
    const entry = latestPlanSyncEntry(ledger, planFile);
    if (!entry) continue;
    if (entry.artifactPaths.some((item) => path === item || entry.directoryPaths.includes(item) && path.startsWith(`${item}/`))) return true;
    if ((entry.stalePaths || []).some((item) => path === item.path || item.directory && path.startsWith(`${item.path}/`))) return true;
  }
  return false;
}

export function planProjectMirror(inventories: Record<string, Inventory>, codeManifest: Record<string, { sha256: string }>, ledger: PlanSyncLedger): MirrorPlan {
  const workers = Object.keys(inventories).sort();
  const code = new Set(Object.keys(codeManifest));
  const paths = new Set(workers.flatMap((id) => Object.keys(inventories[id] || {})));
  const copies: MirrorCopy[] = [];
  const conflicts: MirrorPlan["conflicts"] = [];
  const protectedPaths: string[] = [];
  const protectedDifferences: string[] = [];
  for (const path of [...paths].sort()) {
    if (code.has(path) || planOwned(path, ledger)) {
      protectedPaths.push(path);
      const hashes = workers.map((id) => inventories[id]?.[path]?.sha256?.toLowerCase() || "");
      if (new Set(hashes).size > 1 || hashes.some((hash) => !hash) || code.has(path) && hashes.some((hash) => hash !== codeManifest[path].sha256.toLowerCase()))
        protectedDifferences.push(path);
      continue;
    }
    const present = workers.filter((id) => inventories[id]?.[path]);
    const hashes = new Set(present.map((id) => inventories[id][path].sha256.toLowerCase()));
    if (hashes.size > 1) { conflicts.push({ path, workers: present }); continue; }
    if (!present.length) continue;
    const sourceWorkerId = present[0];
    for (const destinationWorkerId of workers)
      if (!inventories[destinationWorkerId]?.[path]) copies.push({ sourceWorkerId, destinationWorkerId, path });
  }
  for (const path of code) if (!paths.has(path)) protectedDifferences.push(path);
  return { copies, conflicts, protectedPaths, protectedDifferences, fileCount: paths.size };
}
