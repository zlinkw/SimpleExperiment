import { createHash } from "crypto";

/**
 * Staging identity of one completed job's artifact sync (task ui-plan-gpu-progress-20261024 r5).
 * The retentionKey reuses the EXACT five-tuple the dedicated plan chain already sends
 * (syncDistributedJobArtifacts), so both chains treat one job as one logical source. The caller
 * must pass the real queue identity; nothing here is derived from sourceId or outputDir.
 */
export function jobArtifactRetentionKey(planFile: string, index: number, caseName: unknown, seed: unknown): string {
  return JSON.stringify(["job-artifacts", planFile, index, caseName, seed]);
}

/**
 * Generation = run identity (plan.id + job.commandId) bound to the frozen source manifest
 * (canonical sorted path + source SHA256, hex lower-cased). Retries and reloads over identical
 * source content resume their own generation; a new dispatch, a new plan run, a changed hash or a
 * changed file set always opens a new one. Destination-side sync progress is not an input, so a
 * partially synced destination never changes the generation of identical inputs. The 64-hex output
 * passes the receiver's transferScope64 unchanged, and the receiver reuses one generation across
 * the retry/extra batches of one run (staged-tar-receive claim: own-generation slots resume).
 */
export function jobArtifactRunGeneration(planId: string, commandId: string, sourceFiles: Record<string, string>): string {
  const manifest = Object.keys(sourceFiles).sort().map(file => [file, String(sourceFiles[file]).toLowerCase()]);
  return createHash("sha256").update(JSON.stringify(["job-artifact-run", planId, commandId, manifest])).digest("hex");
}

/**
 * Staging identity of the shared version-retain/merge lanes (task ui-plan-gpu-progress-20261024 r112).
 * These lanes previously sent no retentionKey/generation, so every attempt fell back to the shared
 * "project-files"/"directory:*" scope with a fresh per-transfer generation (simple-sftp
 * stagedLogicalKey/claim), which jams the two-generation window with TRANSFER_STAGE_PENDING once the
 * first committed pair occupies it — proven live on nwpu3 (d-47be3d71… = sha256(["project-files",0])
 * and d-008f3730… lane both held fully by this same source's committed generations).
 * The same-input rule mirrors jobArtifactRunGeneration: an identical batch path set with an identical
 * frozen source manifest reuses ONE generation, so a retry resumes its own slot (receiver
 * own-generation resume) instead of forcing a third generation; any changed path or SHA opens a new
 * one. The retentionKey carries no source/worker/node identity — it is the sorted deduplicated batch
 * path list, making one logical batch one logical source. Job artifact chain parameters are untouched.
 */
export function syncScopeStagingIdentity(scopePaths: readonly string[],
  sourceFiles: Record<string, string | { sha256?: unknown }>): { retentionKey: string; generation: string } {
  const scope = [...new Set(scopePaths.map(file => String(file)))].sort();
  const manifest = scope.map(file => {
    const value = sourceFiles[file];
    return [file, typeof value === "string" ? value.toLowerCase() : String(value?.sha256 ?? "").toLowerCase()];
  });
  return { retentionKey: "sync-scope-retain:" + JSON.stringify(scope),
    generation: createHash("sha256").update(JSON.stringify(["sync-scope-retain", scope, manifest])).digest("hex") };
}
