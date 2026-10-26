"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobArtifactRetentionKey = jobArtifactRetentionKey;
exports.jobArtifactRunGeneration = jobArtifactRunGeneration;
exports.syncScopeStagingIdentity = syncScopeStagingIdentity;
const crypto_1 = require("crypto");
/**
 * Staging identity of one completed job's artifact sync (task ui-plan-gpu-progress-20261024 r5).
 * The retentionKey reuses the EXACT five-tuple the dedicated plan chain already sends
 * (syncDistributedJobArtifacts), so both chains treat one job as one logical source. The caller
 * must pass the real queue identity; nothing here is derived from sourceId or outputDir.
 */
function jobArtifactRetentionKey(planFile, index, caseName, seed) {
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
function jobArtifactRunGeneration(planId, commandId, sourceFiles) {
    const manifest = Object.keys(sourceFiles).sort().map(file => [file, String(sourceFiles[file]).toLowerCase()]);
    return (0, crypto_1.createHash)("sha256").update(JSON.stringify(["job-artifact-run", planId, commandId, manifest])).digest("hex");
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
 * r117 (Q5 fix): a scope entry may be a DIRECTORY (manual directory retain legacy.ts:11368 and
 * directory restore :11449 pass the directory path together with an inventory keyed by its contained
 * files). The manifest therefore covers the complete frozen selection: a direct inventory entry is one
 * item; otherwise every inventory descendant "<scope>/…" is an item. Inventory entries outside the
 * scope never enter the hash (they must not open generations), and a directory's descendant SHA,
 * additions or removals always open a new generation. Pure file scopes hash exactly as before.
 */
function syncScopeStagingIdentity(scopePaths, sourceFiles) {
    const scope = [...new Set(scopePaths.map(file => String(file)))].sort();
    const shaOf = (value) => typeof value === "string" ? value.toLowerCase() : String(value?.sha256 ?? "").toLowerCase();
    const frozen = new Map();
    for (const scopePath of scope) {
        const descendants = Object.keys(sourceFiles).filter(file => file.startsWith(scopePath + "/")).sort();
        if (descendants.length)
            for (const file of descendants)
                frozen.set(file, shaOf(sourceFiles[file]));
        else
            frozen.set(scopePath, shaOf(sourceFiles[scopePath]));
    }
    const manifest = [...frozen].sort((left, right) => (left[0] === right[0] ? 0 : left[0] < right[0] ? -1 : 1));
    return { retentionKey: "sync-scope-retain:" + JSON.stringify(scope),
        generation: (0, crypto_1.createHash)("sha256").update(JSON.stringify(["sync-scope-retain", scope, manifest])).digest("hex") };
}
