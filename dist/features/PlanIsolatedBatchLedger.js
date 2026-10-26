"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsolatedBatchLedgerCorruptError = exports.LEDGER_STALE = exports.LEDGER_CORRUPT = void 0;
exports.loadIsolatedBatchLedger = loadIsolatedBatchLedger;
exports.saveIsolatedBatchLedger = saveIsolatedBatchLedger;
exports.withIsolatedBatchLedger = withIsolatedBatchLedger;
exports.mergeIsolatedBatches = mergeIsolatedBatches;
exports.freezeBatchScope = freezeBatchScope;
exports.attachIsolatedCleanup = attachIsolatedCleanup;
exports.markPlanTerminal = markPlanTerminal;
exports.promoteDispatchedPlans = promoteDispatchedPlans;
exports.eligibleIsolatedReviews = eligibleIsolatedReviews;
const node_fs_1 = require("node:fs");
const path = __importStar(require("node:path"));
const node_crypto_1 = require("node:crypto");
const LocalCodeManifestCache_1 = require("./LocalCodeManifestCache");
exports.LEDGER_CORRUPT = "ISOLATED_BATCH_LEDGER_CORRUPT";
/** 裁定 B（2026-10-26）：写前指纹比对失败的新错误码，替代已随锁整体移除的"锁失主"拒绝码。 */
exports.LEDGER_STALE = "ISOLATED_BATCH_LEDGER_STALE";
class IsolatedBatchLedgerCorruptError extends Error {
    detail;
    constructor(detail) { super(`${exports.LEDGER_CORRUPT}：账本内容不可核实，保留原文件且不覆盖、不视为空；隔离区删除审核入口保持关闭（${detail}）。`); this.detail = detail; }
}
exports.IsolatedBatchLedgerCorruptError = IsolatedBatchLedgerCorruptError;
const LEDGER_VERSION = 2;
const STATE_RANK = { frozen: 0, unknown: 0, awaiting_dispatch: 1, void: 2, dispatched: 2 };
const TERMINAL_STATES = ["void", "dispatched"];
function validTarget(row) {
    return !!row && typeof row.nodeId === "string" && typeof row.sourceRelativePath === "string" && typeof row.isolationRelativePath === "string";
}
function validPlan(row) {
    return !!row && typeof row.planFile === "string" && typeof row.submissionOperationId === "string"
        && typeof row.revision === "string" && typeof row.codeFingerprint === "string"
        && typeof row.state === "string" && Object.hasOwn(STATE_RANK, row.state) && Array.isArray(row.cleanup)
        && row.cleanup.every((entry) => !!entry && typeof entry.cleanupOperationId === "string" && Array.isArray(entry.targets) && entry.targets.every(validTarget))
        && (row.jobs === undefined || (Array.isArray(row.jobs) && row.jobs.every((job) => !!job && Number.isInteger(job.jobIndex)
            && typeof job.expectedCommandId === "string"
            && (job.proof === undefined || (!!job.proof && typeof job.proof.observedAt === "string" && typeof job.proof.workerId === "string" && typeof job.proof.source === "string")))));
}
function validBatch(row) {
    return !!row && typeof row.batchId === "string" && typeof row.projectRoot === "string" && typeof row.frozenAt === "string"
        && Array.isArray(row.plans) && row.plans.every(validPlan)
        && (row.reviews === undefined || Array.isArray(row.reviews) && row.reviews.every((event) => event
            && typeof event.eventId === "string" && typeof event.cleanupOperationId === "string" && typeof event.at === "string"
            && ["opened", "preview", "confirmed1", "confirmed2", "executing", "completed", "busy", "failed", "cancelled", "unknown"].includes(event.kind)));
}
/** 读取账本并记身份指纹（CAS 依据）：文件缺失=正常空态（fingerprint=null）；
 * JSON/版本/结构不可核实=抛错并保留原字节（调用方禁止随后写盘）。内容哈希取自已读字节，
 * 慢路径重算复用 sha256File；文件缺失时 stat 先于 readFile，两者之间的变化只会让落盘前
 * 比对落入慢路径按内容裁决，不会静默覆盖。 */
async function readLedgerWithFingerprint(file) {
    let rawText;
    let identity;
    try {
        identity = (0, LocalCodeManifestCache_1.identityFromStat)(await node_fs_1.promises.stat(file));
        rawText = await node_fs_1.promises.readFile(file, "utf8");
    }
    catch (error) {
        if (error?.code === "ENOENT")
            return { fingerprint: null, batches: [] };
        if (error instanceof IsolatedBatchLedgerCorruptError)
            throw error;
        throw new IsolatedBatchLedgerCorruptError(String(error?.message || error));
    }
    if (!identity)
        throw new IsolatedBatchLedgerCorruptError("读取前的身份字段（dev/ino/size/时间戳）不完整，不可核实");
    let raw;
    try {
        raw = JSON.parse(rawText);
    }
    catch {
        throw new IsolatedBatchLedgerCorruptError("JSON 解析失败");
    }
    if (!raw || raw.version !== LEDGER_VERSION || !Array.isArray(raw.batches) || !raw.batches.every(validBatch))
        throw new IsolatedBatchLedgerCorruptError("版本或结构不符合可核实形状");
    return { fingerprint: { ...identity, sha256: (0, node_crypto_1.createHash)("sha256").update(rawText, "utf8").digest("hex") },
        batches: raw.batches };
}
/** 只读入口（审核资格等）：语义与既有一致；CAS 写者须走 withIsolatedBatchLedger 携带同一次读取的 basis。 */
async function loadIsolatedBatchLedger(file) {
    return (await readLedgerWithFingerprint(file)).batches;
}
function ledgerStaleMessage(file, expected, actual) {
    return `${exports.LEDGER_STALE}：写盘前比对发现账本已被其他写入者改动；本轮零写入（临时文件保留为证据、不删），原文件保持原样，审核入口本回合关闭。路径: ${file}；期望指纹: ${JSON.stringify(expected ?? "文件缺失")}；写前实况: ${actual}。可能有第二个窗口在写，请只保留一个窗口后重试。`;
}
/** rename 之前的 CAS 比对（复用 sameIdentity/sha256File）：任何不能确认"内容仍等于本次读取依据"
 * 的情形一律抛 ISOLATED_BATCH_LEDGER_STALE，由调用方保持零写入。 */
async function assertLedgerBasisUnchanged(file, basis) {
    const expected = basis.fingerprint;
    let stat;
    try {
        stat = await node_fs_1.promises.stat(file);
    }
    catch (error) {
        if (error?.code === "ENOENT") {
            if (!expected)
                return; // 依据=文件缺失，写前仍缺失：一致。
            throw new Error(ledgerStaleMessage(file, expected, `文件缺失（期望指纹的 ${expected.size} 字节内容不在位）`));
        }
        throw new Error(ledgerStaleMessage(file, expected, `写前身份不可核实（${String(error?.code || error?.message || error)}）`));
    }
    const identity = (0, LocalCodeManifestCache_1.identityFromStat)(stat);
    if (!identity)
        throw new Error(ledgerStaleMessage(file, expected, `身份字段不完整（现 ${stat.size} 字节），不可核实`));
    // Boolean() 取判据值而不让 sameIdentity 的类型守卫在否定分支把 expected 收窄（判据是值比较，不是类型判别）。
    if (Boolean(expected && (0, LocalCodeManifestCache_1.sameIdentity)(expected, identity)))
        return; // 快路径：身份六项全未变 ⇒ 不重算哈希。
    if (!expected) {
        const sha256 = (await (0, LocalCodeManifestCache_1.sha256File)(file)).toLowerCase();
        throw new Error(ledgerStaleMessage(file, null, `文件意外出现（${JSON.stringify(identity)}，${stat.size} 字节，sha256=${sha256}）`));
    }
    const sha256 = (await (0, LocalCodeManifestCache_1.sha256File)(file)).toLowerCase();
    // 哈希期间变化守卫（同 LocalCodeManifestCache 哈希链口径）：前后身份不符则该哈希不可代表写前实况。
    const after = (0, LocalCodeManifestCache_1.identityFromStat)(await node_fs_1.promises.stat(file));
    if (!(0, LocalCodeManifestCache_1.sameIdentity)({ ...identity, sha256 }, after))
        throw new Error(ledgerStaleMessage(file, expected, `文件在哈希期间发生变化（${JSON.stringify(identity)}，${stat.size} 字节，sha256=${sha256}），无法确认写前实际内容`));
    if (sha256 === expected.sha256)
        return; // 身份变了但内容相同（如外部 touch）：仍落盘。
    throw new Error(ledgerStaleMessage(file, expected, `内容不同（${JSON.stringify(identity)}，${stat.size} 字节，sha256=${sha256}）`));
}
/** 原子写：临时文件 fsync + rename + 尽力目录 fsync；rename 之前做写前指纹比对（CAS），
 * 不符即拒绝且绝不碰原文件——临时文件留在原地作为"本欲写入"的证据。 */
async function saveIsolatedBatchLedger(file, batches, basis) {
    if (!basis || !("fingerprint" in basis))
        throw new Error(`${exports.LEDGER_STALE}：缺少写前读取依据（basis），拒绝无指纹落盘；写入必须经 withIsolatedBatchLedger 携带同一次读取的 basis。`);
    await node_fs_1.promises.mkdir(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.${(0, node_crypto_1.randomUUID)()}.tmp`;
    const handle = await node_fs_1.promises.open(temp, "wx");
    try {
        await handle.writeFile(JSON.stringify({ version: LEDGER_VERSION, batches }), "utf8");
        await handle.sync();
    }
    finally {
        await handle.close();
    }
    await assertLedgerBasisUnchanged(file, basis);
    await node_fs_1.promises.rename(temp, file);
    try {
        const dir = await node_fs_1.promises.open(path.dirname(file), "r");
        try {
            await dir.sync();
        }
        finally {
            await dir.close();
        }
    }
    catch { /* 目录 fsync 平台不支持时忽略；rename 已原子落盘 */ }
}
// 进程内串行链（用户裁定 B 保留项）：同一账本文件同一时刻只有一个本进程写入者，
// 每个临界区自带"读一次→改→写前 CAS 比对→rename"的完整依据。跨进程不再互斥：
// 第二写入者的效果只可能是让前者或后者在写前比对处 fail closed（ISOLATED_BATCH_LEDGER_STALE），
// 不存在静默覆盖，也不再有任何锁文件/零字节锁形态。
const localChains = new Map();
/** 账本临界区：进程内链排队 → 读一次账本并记身份指纹 → work 基于该依据修改 → 写盘走 basis 的 CAS 比对。 */
function withIsolatedBatchLedger(file, work) {
    const step = async () => {
        await node_fs_1.promises.mkdir(path.dirname(file), { recursive: true });
        const basis = await readLedgerWithFingerprint(file);
        return work(basis);
    };
    const key = path.resolve(file);
    const previous = localChains.get(key) ?? Promise.resolve();
    const running = previous.then(step, step);
    localChains.set(key, running.then(() => undefined, () => undefined));
    return running;
}
function planKey(row) {
    return `${row.planFile}\0${row.submissionOperationId}`;
}
function cloneBatch(batch) {
    return { ...batch, plans: batch.plans.map(plan => ({ ...plan,
            cleanup: plan.cleanup.map(entry => ({ ...entry, targets: entry.targets.map(t => ({ ...t })) })),
            jobs: plan.jobs?.map(job => ({ ...job, proof: job.proof ? { ...job.proof } : undefined })) })) };
}
function sameTarget(a, b) {
    return a.nodeId === b.nodeId && (a.host || "") === (b.host || "") && a.sourceRelativePath === b.sourceRelativePath && a.isolationRelativePath === b.isolationRelativePath
        && (a.archiveBatch || "") === (b.archiveBatch || "");
}
function sameTargets(a, b) {
    return a.length === b.length && a.every(left => b.some(right => sameTarget(left, right)));
}
/** 锁内合并（导出 API）：只增未见过的批次；绝不扩初始集合；void/dispatched 终局永不改写；
 * 同 cleanupOperationId 目标集不借合并扩张；jobs 仅缺失时补齐。 */
function mergeIsolatedBatches(existing, incoming) {
    const out = existing.map(cloneBatch);
    for (const batch of incoming) {
        const target = out.find(entry => entry.batchId === batch.batchId);
        if (!target) {
            out.push(cloneBatch(batch));
            continue;
        }
        if (target.projectRoot !== batch.projectRoot || target.canonicalProjectId !== batch.canonicalProjectId
            || target.plans.length !== batch.plans.length || !target.plans.every(plan => batch.plans.some(row => planKey(row) === planKey(plan))))
            throw new Error("ISOLATED_BATCH_SCOPE_CONFLICT：合并输入与冻结项目或完整初始集合不一致。");
        for (const plan of batch.plans) {
            const current = target.plans.find(entry => planKey(entry) === planKey(plan));
            const frozenRecords = new Map(current.cleanup.map(record => [record.cleanupOperationId, record]));
            for (const record of plan.cleanup) {
                const seen = frozenRecords.get(record.cleanupOperationId);
                if (seen && !sameTargets(seen.targets, record.targets))
                    throw new Error("ISOLATED_OPERATION_TARGET_CONFLICT");
                if (!seen)
                    frozenRecords.set(record.cleanupOperationId, record);
            }
            if (TERMINAL_STATES.includes(current.state))
                continue; // void/dispatched 不回退、不复活
            if (plan.state === "void")
                current.state = "void";
            else if (plan.state === "awaiting_dispatch" && STATE_RANK[plan.state] > STATE_RANK[current.state])
                current.state = plan.state;
            // dispatched 只能由账本内部逐 job 证明产生，合并输入无权授予。
            if (plan.queuePlanId && !current.queuePlanId)
                current.queuePlanId = plan.queuePlanId;
            if (plan.jobs?.length && !current.jobs?.length)
                current.jobs = plan.jobs.map(job => ({ ...job, proof: job.proof ? { ...job.proof } : undefined }));
            for (const record of plan.cleanup) {
                const seen = current.cleanup.find(entry => entry.cleanupOperationId === record.cleanupOperationId);
                if (!seen)
                    current.cleanup.push({ ...record, targets: record.targets.map(t => ({ ...t })) });
                // 同 operation 目标首写冻结，冲突已经整体拒绝。
            }
        }
    }
    return out;
}
/** 入口冻结：完整初始 PLAN 集合一次写入；同批重入完全幂等（初始集合以第一次冻结为准，绝不增补）。 */
async function freezeBatchScope(file, batchInfo, plans) {
    if (!batchInfo.batchId || !plans.length)
        throw new Error("批次冻结需要批次身份与非空初始 PLAN 集合。");
    return withIsolatedBatchLedger(file, async (basis) => {
        const batches = basis.batches;
        let batch = batches.find(entry => entry.batchId === batchInfo.batchId);
        if (!batch) {
            batch = { batchId: String(batchInfo.batchId), projectRoot: String(batchInfo.projectRoot || ""),
                canonicalProjectId: batchInfo.canonicalProjectId ? String(batchInfo.canonicalProjectId) : undefined,
                frozenAt: new Date().toISOString(),
                plans: plans.map(row => ({ planFile: String(row.planFile), submissionOperationId: String(row.submissionOperationId), revision: "", codeFingerprint: "", state: "frozen", cleanup: [] })) };
            batches.push(batch);
            await saveIsolatedBatchLedger(file, batches, basis);
        }
        else if (batch.projectRoot !== batchInfo.projectRoot || batch.canonicalProjectId !== batchInfo.canonicalProjectId
            || batch.plans.length !== plans.length || !plans.every(row => batch.plans.some(existing => planKey(existing) === planKey(row)))) {
            throw new Error("ISOLATED_BATCH_SCOPE_CONFLICT：同批次项目身份或初始完整集合冲突，保留原记录。");
        }
        return batch;
    });
}
/** 隔离事实：只挂接到本批初始集合内条目；同一 completed operation 的目标集合与 revision/codeFingerprint 首写冻结，
 * 完全相同幂等，冲突整体拒绝并保留原记录；新 operation 只追加不改动既有记录。 */
async function attachIsolatedCleanup(file, batchInfo, row) {
    const state = row.runReplacement || {};
    const completed = Array.isArray(state.completed) ? state.completed : [];
    const records = (Array.isArray(state.previews) ? state.previews : [])
        .map((entry) => entry?.preview)
        .filter((preview) => preview && completed.includes(preview.token) && Array.isArray(preview.rows))
        .map((preview) => ({ cleanupOperationId: String(preview.token),
        targets: (preview.rows || []).filter((entry) => entry.disposition === "isolate" && entry.relativePath && entry.destination)
            .map((entry) => ({ nodeId: String(entry.node?.id || ""), host: String(entry.node?.host || ""),
            sourceRelativePath: String(entry.relativePath), isolationRelativePath: String(entry.destination),
            ...(entry.archiveBatch ? { archiveBatch: String(entry.archiveBatch) } : {}) })) }))
        .filter((entry) => entry.cleanupOperationId && entry.targets.length);
    return withIsolatedBatchLedger(file, async (basis) => {
        const batches = basis.batches;
        const batch = batches.find(entry => entry.batchId === batchInfo.batchId);
        const plan = batch?.plans.find(entry => entry.submissionOperationId === row.submissionOperationId && entry.planFile === row.planFile);
        if (!plan)
            return false; // 不在本批初始集合：别批/迟到记录绝不混入
        if (plan.revision && plan.revision !== String(row.revision || ""))
            return false; // 首写冻结的 revision 冲突：拒收保留
        if (plan.codeFingerprint && plan.codeFingerprint !== String(row.codeFingerprint || ""))
            return false;
        for (const record of records) {
            if (records.some(other => other.cleanupOperationId === record.cleanupOperationId && !sameTargets(other.targets, record.targets)))
                return false;
            const seen = plan.cleanup.find(entry => entry.cleanupOperationId === record.cleanupOperationId);
            if (seen && !sameTargets(seen.targets, record.targets))
                return false; // 同一隔离 operation 目标集不可扩：整体拒收
        }
        let changed = false;
        if (!plan.revision && String(row.revision || "")) {
            plan.revision = String(row.revision);
            changed = true;
        }
        if (!plan.codeFingerprint && String(row.codeFingerprint || "")) {
            plan.codeFingerprint = String(row.codeFingerprint);
            changed = true;
        }
        for (const record of records)
            if (!plan.cleanup.some(entry => entry.cleanupOperationId === record.cleanupOperationId)) {
                plan.cleanup.push({ ...record, targets: record.targets.map(t => ({ ...t })) });
                changed = true;
            }
        if (changed)
            await saveIsolatedBatchLedger(file, batches, basis);
        return true;
    });
}
/** 提交终局（首写为准，幂等不回退）：committed+真实卡身份→awaiting_dispatch；失败/取消→void；其余 unknown。 */
async function markPlanTerminal(file, batchInfo, terminal) {
    return withIsolatedBatchLedger(file, async (basis) => {
        const batches = basis.batches;
        const plan = batches.find(entry => entry.batchId === batchInfo.batchId)?.plans
            .find(entry => entry.submissionOperationId === terminal.submissionOperationId && entry.planFile === terminal.planFile);
        if (!plan || plan.state !== "frozen")
            return; // 迟到/别批/重复回执：不改写已定终局
        if (terminal.status === "failed" || terminal.status === "cancelled")
            plan.state = "void";
        else if (terminal.status === "committed" && terminal.identity?.queuePlanId && terminal.identity.jobs.length
            && terminal.identity.jobs.every(job => Number.isInteger(job.jobIndex) && typeof job.expectedCommandId === "string")) {
            // 落盘点 commandId 可能尚未由派发链生成（enqueuePlan 只建 pending job）：expectedCommandId 允许空串占位，
            // 由首个被接受的原生证明持久绑定；已知则之后必须严格匹配。
            plan.state = "awaiting_dispatch";
            plan.queuePlanId = terminal.identity.queuePlanId;
            plan.jobs = terminal.identity.jobs.map(job => ({ jobIndex: job.jobIndex, expectedCommandId: String(job.expectedCommandId || "") }));
        }
        else
            plan.state = "unknown"; // 没有可核卡片+job 结构的「入队」不足信
        await saveIsolatedBatchLedger(file, batches, basis);
    });
}
// 只有观察到的 running 才是启动证明；queued/pending/dispatching=本机意图，completed/failed/cancelled=终态，
// 一律不得反推「曾启动」（父 2026-10-22 裁决）。
const PROOF_STATUSES = ["running"];
// 无原生来源证明的观察必须有界新鲜；新鲜窗 60s 为自身推导（对齐队列链 30s 判新 + 一轮 tick 余量）。
const OBSERVATION_FRESH_MS = 60_000;
function startupProofMatched(observation, plan, identity, batch, now) {
    if (observation.queuePlanId !== plan.queuePlanId || observation.jobIndex !== identity.jobIndex)
        return false;
    // 已绑定/已知的期望 commandId 必须严格一致；未绑定（派发链尚未生成）时观察必须自带非空 commandId 以便绑定。
    if (identity.expectedCommandId ? observation.commandId !== identity.expectedCommandId : !observation.commandId)
        return false;
    if (batch.canonicalProjectId && observation.projectId !== batch.canonicalProjectId)
        return false;
    if (!observation.workerId || observation.statusQueryError)
        return false;
    if (!PROOF_STATUSES.includes(String(observation.status || "")))
        return false;
    const at = Date.parse(String(observation.lastObservedAt || ""));
    if (!Number.isFinite(at) || now - at < 0)
        return false;
    if (!(observation.source === "worker_snapshot_task_l2" && observation.windowSeen === true)
        && now - at > OBSERVATION_FRESH_MS)
        return false; // 原生粘性证明可持续补登；普通观察须在新鲜窗内
    return true;
}
/** 每个 PLAN 的首个真实原生启动即达到本 PLAN 边界，不等待所有 seed；逐 job 事实继续持久保存。
 * 新 command 与已绑定身份冲突时撤销旧边界并进入 unknown，不把旧事实授权给新执行。 */
async function promoteDispatchedPlans(file, projectRoot, observations, now = Date.now()) {
    if (!observations.length)
        return 0;
    return withIsolatedBatchLedger(file, async (basis) => {
        const batches = basis.batches;
        let promoted = 0, changed = false;
        for (const batch of batches.filter(entry => entry.projectRoot && entry.projectRoot === projectRoot)) {
            for (const plan of batch.plans) {
                if (!["awaiting_dispatch", "dispatched"].includes(plan.state) || !plan.queuePlanId || !plan.jobs?.length)
                    continue;
                const changedIdentity = plan.jobs.some(identity => identity.proof && identity.expectedCommandId && observations.some(observation => observation.queuePlanId === plan.queuePlanId && observation.jobIndex === identity.jobIndex
                    && observation.projectId === batch.canonicalProjectId && observation.commandId
                    && (observation.commandId !== identity.expectedCommandId
                        || !!observation.workerId && observation.workerId !== identity.proof.workerId)));
                if (changedIdentity) {
                    plan.state = "unknown";
                    for (const identity of plan.jobs)
                        identity.proof = undefined;
                    changed = true;
                    continue;
                }
                for (const identity of plan.jobs) {
                    if (identity.proof)
                        continue; // 已核实事实持久保留，重载/等待后续 GPU 不抹掉
                    const matched = observations.find(observation => startupProofMatched(observation, plan, identity, batch, now));
                    if (!matched)
                        continue;
                    if (!identity.expectedCommandId)
                        identity.expectedCommandId = String(matched.commandId); // 首个原生证明持久绑定
                    identity.proof = { observedAt: String(matched.lastObservedAt), workerId: String(matched.workerId),
                        source: matched.source ? String(matched.source) : "registered_poll" };
                    changed = true;
                }
                if (plan.state !== "dispatched" && plan.jobs.some(job => job.proof)) {
                    plan.state = "dispatched";
                    promoted += 1;
                }
            }
        }
        if (changed)
            await saveIsolatedBatchLedger(file, batches, basis);
        return promoted;
    });
}
/** 审核资格：项目匹配、批次非空、每个初始 PLAN 都 dispatched（frozen/void/unknown/awaiting 一律不合格）、且至少一个隔离目标可审。 */
function eligibleIsolatedReviews(batches, projectRoot) {
    return batches.filter(batch => batch.projectRoot && batch.projectRoot === projectRoot && batch.plans.length > 0
        && batch.plans.every(plan => plan.state === "dispatched")
        && batch.plans.some(plan => plan.cleanup.length > 0));
}
