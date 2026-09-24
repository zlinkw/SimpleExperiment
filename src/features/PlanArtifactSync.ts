export type PlanSyncEntry = {
  planFile: string;
  revision: string;
  runId: string;
  sourceWorkerId: string;
  artifactPaths: string[];
  directoryPaths: string[];
  destinations: Record<string, { status: "pending" | "synced"; syncedAt?: string }>;
};
export type PlanSyncLedger = { schemaVersion: 1; entries: Record<string, PlanSyncEntry> };

export const emptyPlanSyncLedger = (): PlanSyncLedger => ({ schemaVersion: 1, entries: {} });

export function safePlanArtifactPath(value: unknown): string | undefined {
  const normalized = String(value || "").trim().replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+$/, "");
  if (!normalized || normalized.startsWith("/") || /^[A-Za-z]:/.test(normalized) || /[{}*?\[\]]/.test(normalized)) return undefined;
  if (normalized.split("/").some((part) => !part || part === "." || part === "..")) return undefined;
  return normalized;
}

export function planArtifactPaths(plan: any, summary: any, sourceWorkerId: string): string[] {
  const paths = new Set<string>();
  const add = (value: unknown) => { const safe = safePlanArtifactPath(value); if (safe) paths.add(safe); };
  for (const signal of Array.isArray(plan?.outputSignals) ? plan.outputSignals : []) {
    const match = /^结果目录\s*[:：]\s*(.+)$/.exec(String(signal));
    if (match) add(match[1]);
  }
  for (const candidate of Array.isArray(plan?.outputCandidates) ? plan.outputCandidates : []) {
    const safe = safePlanArtifactPath(candidate);
    if (safe?.includes("/")) paths.add(safe);
  }
  for (const table of Array.isArray(summary?.workerResultTables) ? summary.workerResultTables : []) {
    if (String(table?.workerId || "").toLowerCase() !== sourceWorkerId.toLowerCase()) continue;
    for (const key of ["rawResultCsvPath", "aggregateCsvPath", "projectAggregateCsvPath", "finalCsvPath", "projectFinalCsvPath"]) add(table?.[key]);
  }
  const directories = planArtifactDirectories(plan);
  return [...paths].filter((value) => !directories.some((directory) => value !== directory && value.startsWith(`${directory}/`))).sort();
}

export function planArtifactDirectories(plan: any): string[] {
  return (Array.isArray(plan?.outputSignals) ? plan.outputSignals : []).flatMap((signal: unknown) => {
    const match = /^结果目录\s*[:：]\s*(.+)$/.exec(String(signal));
    const safe = match ? safePlanArtifactPath(match[1]) : undefined;
    return safe ? [safe] : [];
  });
}

export function planSyncKey(planFile: string, revision: string, sourceWorkerId: string, runId = "historic"): string {
  return [planFile.replace(/\\/g, "/"), revision, sourceWorkerId.toLowerCase(), runId].join("|");
}

export function queuePlanSync(
  ledger: PlanSyncLedger,
  planFile: string,
  revision: string,
  sourceWorkerId: string,
  artifactPaths: string[],
  destinationWorkerIds: string[],
  directoryPaths: string[] = [],
  runId = "historic",
): PlanSyncLedger {
  const key = planSyncKey(planFile, revision, sourceWorkerId, runId);
  const previous = ledger.entries[key];
  const newArtifacts = artifactPaths.some((path) => !previous?.artifactPaths.includes(path));
  const destinations = Object.fromEntries(Object.entries(previous?.destinations || {}).map(([id, value]) => [id, newArtifacts ? { status: "pending" as const } : value]));
  for (const id of destinationWorkerIds) {
    if (id.toLowerCase() !== sourceWorkerId.toLowerCase() && !destinations[id]) destinations[id] = { status: "pending" };
  }
  return { schemaVersion: 1, entries: { ...ledger.entries, [key]: {
    planFile,
    revision,
    runId,
    sourceWorkerId,
    artifactPaths: [...new Set([...(previous?.artifactPaths || []), ...artifactPaths])].sort(),
    directoryPaths: [...new Set([...(previous?.directoryPaths || []), ...directoryPaths])].sort(),
    destinations,
  } } };
}

export function markPlanSyncComplete(ledger: PlanSyncLedger, key: string, destinationWorkerId: string, syncedAt: string): PlanSyncLedger {
  const entry = ledger.entries[key];
  if (!entry || !entry.destinations[destinationWorkerId]) throw new Error("待同步记录不存在。");
  return { schemaVersion: 1, entries: { ...ledger.entries, [key]: {
    ...entry,
    destinations: { ...entry.destinations, [destinationWorkerId]: { status: "synced", syncedAt } },
  } } };
}

export function pendingPlanSyncs(ledger: PlanSyncLedger): Array<{ key: string; entry: PlanSyncEntry; destinationWorkerId: string }> {
  const entries = Object.entries(ledger.entries);
  const latest = new Map<string, string>();
  for (const [key, entry] of entries) {
    const scope = `${entry.planFile}|${entry.sourceWorkerId.toLowerCase()}`;
    if (entry.runId !== "historic" || !latest.has(scope)) latest.set(scope, key);
  }
  return entries.filter(([key, entry]) => latest.get(`${entry.planFile}|${entry.sourceWorkerId.toLowerCase()}`) === key).flatMap(([key, entry]) => Object.entries(entry.destinations)
    .filter(([, value]) => value.status === "pending")
    .map(([destinationWorkerId]) => ({ key, entry, destinationWorkerId })));
}
