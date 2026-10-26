"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobArtifactRetentionKey = jobArtifactRetentionKey;
exports.jobArtifactRunGeneration = jobArtifactRunGeneration;
exports.syncScopeStagingIdentity = syncScopeStagingIdentity;
exports.sanitizeArtifactStageBlock = sanitizeArtifactStageBlock;
exports.artifactStageBlockFromError = artifactStageBlockFromError;
exports.stagedSlotReleaseEvidenceReady = stagedSlotReleaseEvidenceReady;
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
function stageBlockHex(value) {
    const text = String(value ?? "");
    return /^[0-9a-f]{64}$/.test(text) ? text : "";
}
/** Whitelist projection of one slot row; unknown fields never enter the queue file. */
function stageBlockSlot(row) {
    const item = row && typeof row === "object" ? row : {};
    const time = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
    return {
        slot: String(item.slot ?? "").slice(0, 128), path: String(item.path ?? "").slice(0, 4096),
        generation: stageBlockHex(item.generation), status: String(item.status ?? "").slice(0, 64),
        createdAt: time(item.createdAt), terminalAt: time(item.terminalAt), updatedAt: time(item.updatedAt),
        timeSource: typeof item.timeSource === "string" ? item.timeSource.slice(0, 128) : null,
        ageMs: Number.isInteger(item.ageMs) ? item.ageMs : null,
        locked: item.locked === true,
        protectedReason: typeof item.protectedReason === "string" ? item.protectedReason.slice(0, 512) : null,
    };
}
/**
 * Sanitizes a raw stage block (error.stageBlock or error.apiData.stageBlock) into the persisted
 * shape. Anything that is not a schemaVersion-1 TRANSFER_STAGE_PENDING block with the expected
 * skeleton returns undefined — the caller then persists no structured evidence and shows no release
 * entry (text compatibility alone). Never guesses: a block without structured fields stays text-only.
 */
function sanitizeArtifactStageBlock(raw) {
    const block = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : undefined;
    if (!block || Number(block.schemaVersion) !== 1 || String(block.code) !== "TRANSFER_STAGE_PENDING")
        return undefined;
    const destination = block.destination && typeof block.destination === "object"
        ? block.destination : {};
    return {
        schemaVersion: 1, code: "TRANSFER_STAGE_PENDING",
        destination: { id: String(destination.id ?? "").slice(0, 256), profile: String(destination.profile ?? "").slice(0, 256),
            host: String(destination.host ?? "").slice(0, 256) },
        scope: String(block.scope ?? "").slice(0, 4096), lane: Number(block.lane) === 1 ? 1 : 0,
        identity: stageBlockHex(block.identity), incomingGeneration: stageBlockHex(block.incomingGeneration),
        slots: (Array.isArray(block.slots) ? block.slots : []).map(stageBlockSlot),
        releaseCandidate: block.releaseCandidate === true,
    };
}
/** Structured evidence of one SimpleSFTP error, either attachment point, sanitized or absent. */
function artifactStageBlockFromError(error) {
    const item = error && typeof error === "object" ? error : undefined;
    if (!item)
        return undefined;
    const apiData = item.apiData && typeof item.apiData === "object" ? item.apiData : undefined;
    return sanitizeArtifactStageBlock(item.stageBlock) || sanitizeArtifactStageBlock(apiData?.stageBlock);
}
/**
 * Real-time capability gate for the "释放旧文件占用" entry (ruling Q6): SE enables it ONLY when the
 * live capabilities carry every ruled flag together — never inferred from a version number. An old
 * SimpleSFTP (no stagedSlots expiry evidence, no stage-block evidence, no background/isolation
 * receipts) keeps the release entry hidden and the plain readable error visible.
 */
function stagedSlotReleaseEvidenceReady(capabilities) {
    const shared = capabilities && typeof capabilities === "object" ? capabilities : undefined;
    const methods = Array.isArray(shared?.methods) ? shared.methods : [];
    const options = shared?.methodOptions && typeof shared.methodOptions === "object"
        ? shared.methodOptions : {};
    const staged = options["files.cleanup.stagedSlots"] || {}, fpsync = options["sync.serverToServerFpsync"] || {}, preview = options["files.cleanup.preview"] || {}, execute = options["files.cleanup.execute"] || {};
    return ["files.cleanup.stagedSlots", "files.cleanup.preview", "files.cleanup.execute"].every(method => methods.includes(method))
        && staged.expiredCommittedReclaim === 1 && staged.structuredBlockEvidence === 1 && staged.releaseConfirmationCount === 1
        && fpsync.claimScopedExpiredReclaim === 1 && fpsync.stageBlockEvidence === 1
        && preview.backgroundIsolatedDelete === 1 && execute.isolationCompletionReceipt === 1;
}
