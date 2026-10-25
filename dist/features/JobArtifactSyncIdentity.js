"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobArtifactRetentionKey = jobArtifactRetentionKey;
exports.jobArtifactRunGeneration = jobArtifactRunGeneration;
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
