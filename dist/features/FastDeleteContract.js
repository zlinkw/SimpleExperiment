"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FAST_DELETE_UPGRADE_MESSAGE = exports.FAST_DELETE_UPGRADE_CODE = exports.FAST_CONFIRMED_BATCH_CAP = void 0;
exports.isFastDeleteUpgradeCode = isFastDeleteUpgradeCode;
exports.fastDeleteUpgradeError = fastDeleteUpgradeError;
exports.assertFastDeletePreviewSafety = assertFastDeletePreviewSafety;
exports.chunkFastDeleteTargets = chunkFastDeleteTargets;
exports.fastDeleteVerifiedBy = fastDeleteVerifiedBy;
/**
 * v1.9 public contract for confirmed-path batched fast deletion.
 *
 * The SimpleSFTP public preview entry (files.cleanup.preview with
 * authorizationMode=confirmed_paths + action=delete) answers with a fast-chain
 * safety block. Anything older than that contract must fail closed as one
 * unified upgrade requirement: A never falls back to the retired per-target
 * delete chain and never treats the refusal as an empty success. A also never
 * probes raw engine batch-inspect to discover capabilities.
 */
exports.FAST_CONFIRMED_BATCH_CAP = 5000;
exports.FAST_DELETE_UPGRADE_CODE = "SFTP_FAST_DELETE_UPGRADE_REQUIRED";
exports.FAST_DELETE_UPGRADE_MESSAGE = "当前 SimpleSFTP 未提供确认路径的批量快速删除链；请更新配套 SimpleSFTP 并重载后重新预览。未执行任何删除，也不会回退旧删除链。";
const FAST_DELETE_FLAGS = ["entryIdentityBind", "batchedFastDelete", "directoryTreeIsolateDelete", "isolationRenameNoReplace"];
/** Error envelope codes that mean "this endpoint predates the fast chain". */
function isFastDeleteUpgradeCode(code) {
    return ["UNKNOWN_ACTION", "UPDATE_REQUIRED", exports.FAST_DELETE_UPGRADE_CODE].includes(String(code || ""));
}
function fastDeleteUpgradeError(detail) {
    throw Object.assign(new Error(detail || exports.FAST_DELETE_UPGRADE_MESSAGE), { apiCode: 2010, apiData: { code: exports.FAST_DELETE_UPGRADE_CODE, detail: detail || exports.FAST_DELETE_UPGRADE_MESSAGE } });
}
/** Reads the fast flags from a confirmed preview answer; returns the server-published batch limit. */
function assertFastDeletePreviewSafety(safety, requested) {
    if (Number(safety?.confirmedPathDeletion) !== 1
        || !FAST_DELETE_FLAGS.every(flag => Number(safety?.[flag]) === 1)
        || !(Number(safety?.fastDeleteBatchLimit) >= 1))
        fastDeleteUpgradeError();
    const limit = Number(safety.fastDeleteBatchLimit);
    if (!(limit >= Math.max(1, requested)))
        fastDeleteUpgradeError(`本批 ${requested} 个目标超过服务器公布的快速删除单请求上限 ${limit}；请按有限批次重新审核。`);
    return limit;
}
/** Splits a confirmed selection into finite public-cap requests. Never one call per file. */
function chunkFastDeleteTargets(items, cap = exports.FAST_CONFIRMED_BATCH_CAP) {
    const chunks = [];
    for (let offset = 0; offset < items.length; offset += cap)
        chunks.push(items.slice(offset, offset + cap));
    return chunks.length ? chunks : [];
}
/** Maps an engine fast-verification observation onto the honest review wording. */
function fastDeleteVerifiedBy(observation) {
    if (observation?.isolationStatus)
        return "isolation_tree_removed";
    return observation?.status === "replaced" ? "same_name_new_data" : "path_absence";
}
