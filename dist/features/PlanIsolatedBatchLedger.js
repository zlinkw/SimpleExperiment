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
exports.IsolatedBatchLedgerCorruptError = exports.ABANDONED_ZERO_BYTE_LOCK = exports.LEDGER_LOCK_LOST = exports.LEDGER_CORRUPT = void 0;
exports.loadIsolatedBatchLedger = loadIsolatedBatchLedger;
exports.saveIsolatedBatchLedger = saveIsolatedBatchLedger;
exports.classifyAbandonedZeroByteLock = classifyAbandonedZeroByteLock;
exports.relocateAbandonedLedgerLock = relocateAbandonedLedgerLock;
exports.nextIsolatedLedgerReport = nextIsolatedLedgerReport;
exports.withIsolatedBatchLedger = withIsolatedBatchLedger;
exports.mergeIsolatedBatches = mergeIsolatedBatches;
exports.freezeBatchScope = freezeBatchScope;
exports.attachIsolatedCleanup = attachIsolatedCleanup;
exports.markPlanTerminal = markPlanTerminal;
exports.promoteDispatchedPlans = promoteDispatchedPlans;
exports.eligibleIsolatedReviews = eligibleIsolatedReviews;
const node_fs_1 = require("node:fs");
const os = __importStar(require("node:os"));
const path = __importStar(require("node:path"));
const node_crypto_1 = require("node:crypto");
const node_child_process_1 = require("node:child_process");
const node_util_1 = require("node:util");
exports.LEDGER_CORRUPT = "ISOLATED_BATCH_LEDGER_CORRUPT";
exports.LEDGER_LOCK_LOST = "ISOLATED_BATCH_LEDGER_LOCK_LOST";
/** r109（0.5.415 最小切片①）0 字节废弃锁分类码：锁协议规定活锁必先写 token 才返回所有权，
 * 竞争者与持有者都没有对已存在锁的写入路径，且释放只认 token——所以 0 字节、无身份、久无字节
 * 变化的锁不可能被任何合法持有者持有或释放，与活锁在协议上可严格区分。本分类只读诊断，
 * 永不摘取；移开只发生在用户确认后且仅 rename 保留字节（见 relocateAbandonedLedgerLock）。 */
exports.ABANDONED_ZERO_BYTE_LOCK = "ISOLATED_BATCH_LEDGER_LOCK_ABANDONED_ZERO_BYTE";
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
/** 读取账本：文件缺失=正常空态；JSON/版本/结构不可核实=抛错并保留原字节（调用方禁止随后写盘）。 */
async function loadIsolatedBatchLedger(file) {
    let rawText;
    try {
        rawText = await node_fs_1.promises.readFile(file, "utf8");
    }
    catch (error) {
        if (error?.code === "ENOENT")
            return [];
        throw new IsolatedBatchLedgerCorruptError(String(error?.message || error));
    }
    let raw;
    try {
        raw = JSON.parse(rawText);
    }
    catch {
        throw new IsolatedBatchLedgerCorruptError("JSON 解析失败");
    }
    if (!raw || raw.version !== LEDGER_VERSION || !Array.isArray(raw.batches) || !raw.batches.every(validBatch))
        throw new IsolatedBatchLedgerCorruptError("版本或结构不符合可核实形状");
    return raw.batches;
}
/** 原子写：临时文件 fsync + rename + 尽力目录 fsync；带 fence 时 rename 前复核锁 token，失主拒绝且不碰原文件。 */
async function saveIsolatedBatchLedger(file, batches, fence) {
    if (!fence?.lockPath || !fence.token)
        throw new Error(exports.LEDGER_LOCK_LOST);
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
    if (fence) {
        let ownerToken;
        try {
            ownerToken = JSON.parse(await node_fs_1.promises.readFile(fence.lockPath, "utf8"))?.token;
        }
        catch {
            ownerToken = undefined;
        }
        if (ownerToken !== fence.token) {
            // Preserve the uncommitted temporary bytes as evidence; never clean an
            // absolute path after ownership was lost.
            throw new Error(`${exports.LEDGER_LOCK_LOST}：写盘前复核发现账本锁已易主；本轮零写入，原文件保持原样，审核入口本回合关闭。`);
        }
    }
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
// 跨进程锁：open(wx) 是唯一取得所有权的边界。持有期间任何竞争者都不得移动/删除锁。
// 不自动恢复遗留锁：无法证明原 owner 身份时牺牲本轮审核可用性，不能牺牲互斥性。
const localChains = new Map();
const LOCK_TTL_MS = 15_000, LOCK_RETRY_MS = 20, LOCK_WAIT_MS = 600;
const lockHost = os.hostname();
const releaseOwnedLock = (0, node_util_1.promisify)(node_child_process_1.execFile);
// r109 最小切片①：废弃判定阈值＝150s（10×TTL）。0 字节锁的 mtime 即"身份丢失时刻"（创建后从未成功写入，
// 或写入在 fs 层失败）；外部读取/杀软触碰最多推迟检出，绝不提前。
const ABANDONED_MIN_AGE_MS = 150_000;
// 本实例"open(wx) 已成功、token 写入尚未收尾"的创建窗（按解析路径记起始毫秒）。分类器见此窗直接放弃，
// 保证绝不把自家正在落盘的锁当成废弃锁；60s 兜底防止异常残留把分类永久挡死。
const creatorWindows = new Map();
const CREATOR_WINDOW_GUARD_MS = 60_000;
const releaseScript = `
const fs=require('node:fs'),path=require('node:path');
const [parent,leaf,device,inode,token]=process.argv.slice(1);
const deny=code=>{throw new Error(code)};
if(!leaf||leaf!==path.basename(leaf)||leaf==='.'||leaf==='..')deny('PARENT_CD_FAILED');
if(fs.realpathSync(parent)!==parent)deny('PARENT_CD_FAILED');
process.chdir(parent);
const st=fs.statSync('.');
if(fs.realpathSync(process.cwd())!==parent||String(st.dev)!==device||String(st.ino)!==inode)deny('PARENT_CD_FAILED');
const target='./'+leaf,entry=fs.lstatSync(target);
if(!entry.isFile()||entry.isSymbolicLink()||entry.nlink!==1||entry.dev!==st.dev)deny('ISOLATED_BATCH_LEDGER_LOCK_LOST');
if(JSON.parse(fs.readFileSync(target,'utf8')).token!==token)deny('ISOLATED_BATCH_LEDGER_LOCK_LOST');
fs.unlinkSync(target);
`;
async function acquireLedgerLock(lockPath) {
    const token = (0, node_crypto_1.randomUUID)();
    const parent = path.dirname(lockPath), parentIdentity = await node_fs_1.promises.stat(parent);
    const acquireStarted = Date.now();
    for (;;) {
        let created = false;
        const creatorKey = path.resolve(lockPath);
        try {
            const handle = await node_fs_1.promises.open(lockPath, "wx");
            creatorWindows.set(creatorKey, Date.now()); // 从 open 成功起进入本实例创建窗，token 落盘/失败即关闭
            try {
                await handle.writeFile(JSON.stringify({ token, host: lockHost, pid: process.pid,
                    acquiredAt: new Date().toISOString(), expiresAt: new Date(Date.now() + LOCK_TTL_MS).toISOString() }), "utf8");
                await handle.sync();
                created = true;
            }
            finally {
                await handle.close();
                creatorWindows.delete(creatorKey);
            }
        }
        catch (error) {
            creatorWindows.delete(creatorKey);
            if (error?.code !== "EEXIST")
                throw error;
        }
        if (created)
            return { token, release: async () => {
                    // 先核对再释放；在本协议中其他进程没有摘锁权限，因此不存在回收者插入窗口。
                    // A short file utility has its own cwd; the extension's cwd never changes.
                    // It checks the physical parent and exact owner, then unlinks ./leaf only.
                    await releaseOwnedLock(process.execPath, ["-e", releaseScript, parent, path.basename(lockPath),
                        String(parentIdentity.dev), String(parentIdentity.ino), token], { cwd: parent, windowsHide: true,
                        timeout: 2000, env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" } });
                } };
        if (Date.now() >= acquireStarted + LOCK_WAIT_MS) {
            // r109 最小切片①：只读分类先行——0 字节、无身份、久无字节变化的锁在协议上不可能被任何合法
            // 持有者持有或释放（活锁必先写 token；无写锁路径；释放只认 token），据实上报供用户确认移开。
            // 其余任何形态（含 0 字节未满阈值、目录、链接、有 token 活锁）仍走下面逐字不变的 LOCKED 拒绝。
            const abandoned = await classifyAbandonedZeroByteLock(lockPath);
            if (abandoned)
                throw new Error(`${exports.ABANDONED_ZERO_BYTE_LOCK}：锁文件 0 字节且无身份记录，已 ${Math.floor((Date.now() - Math.max(abandoned.birthtimeMs, abandoned.mtimeMs)) / 1000)} 秒无字节变化——活锁不会呈现该形态，任何合法持有者都无法释放它；原字节保留、未摘取，审核入口本回合关闭（诊断: ${JSON.stringify(abandoned)}）`);
            throw new Error("ISOLATED_BATCH_LEDGER_LOCKED：账本锁仍在位；活锁、遗留锁或未知身份均保留，不自动摘取，审核入口本回合关闭。");
        }
        await new Promise(resolve => setTimeout(resolve, LOCK_RETRY_MS));
    }
}
/** r109 最小切片①：废弃零字节锁的只读分类。判据全部实测：普通文件 ∧ 非链接 ∧ nlink===1 ∧ size===0 ∧
 * max(birthtime,mtime) 距今 ≥150s ∧ 本实例对该路径没有 open(wx) 成功后的在途创建窗。
 * 任何读取异常/字段异常一律返回 null（fail closed 回原 LOCKED 路径），本函数不写、不删、不改任何文件。
 * nowMs 可注入仅用于确定性测试；生产调用使用真实时钟。 */
async function classifyAbandonedZeroByteLock(lockPath, nowMs = Date.now()) {
    const resolved = path.resolve(lockPath);
    const creatorStarted = creatorWindows.get(resolved);
    if (creatorStarted !== undefined && nowMs - creatorStarted < CREATOR_WINDOW_GUARD_MS)
        return null;
    let entry;
    try {
        entry = await node_fs_1.promises.lstat(resolved);
    }
    catch {
        return null;
    }
    if (!entry.isFile() || entry.isSymbolicLink() || entry.nlink !== 1 || entry.size !== 0)
        return null;
    const birth = Number.isFinite(entry.birthtimeMs) && entry.birthtimeMs > 0 ? entry.birthtimeMs : entry.mtimeMs;
    const lastTouched = Math.max(birth, entry.mtimeMs);
    if (!Number.isFinite(lastTouched) || lastTouched > nowMs || nowMs - lastTouched < ABANDONED_MIN_AGE_MS)
        return null;
    return { lockPath: resolved, size: 0, birthtimeMs: birth, mtimeMs: entry.mtimeMs, ino: entry.ino, nlink: entry.nlink,
        classifiedAt: new Date(nowMs).toISOString() };
}
// r109 最小切片②：经用户确认的移开脚本——复用 releaseScript 的父目录身份校验（realpath/chdir/dev/ino）
// 与锁对象校验（普通文件、非链接、nlink===1），并追加"此刻仍 0 字节"复核：token 可解析或字节非 0
// 一律拒绝。只 rename 到 <leaf>.orphan-<stamp>（存在即加 pid 后缀，绝不覆盖、绝不 unlink），
// 输出移开路径与原字节 sha256 供操作日志留痕。
const relocateScript = `
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const [parent,leaf,device,inode,stamp]=process.argv.slice(1);
const deny=code=>{throw new Error(code)};
if(!leaf||leaf!==path.basename(leaf)||leaf==='.'||leaf==='..')deny('PARENT_CD_FAILED');
if(fs.realpathSync(parent)!==parent)deny('PARENT_CD_FAILED');
process.chdir(parent);
const st=fs.statSync('.');
if(fs.realpathSync(process.cwd())!==parent||String(st.dev)!==device||String(st.ino)!==inode)deny('PARENT_CD_FAILED');
const target='./'+leaf,entry=fs.lstatSync(target);
if(!entry.isFile()||entry.isSymbolicLink()||entry.nlink!==1||entry.dev!==st.dev)deny('ABANDONED_LOCK_PRECONDITION_FAILED');
if(entry.size!==0)deny('ABANDONED_LOCK_PRECONDITION_FAILED');
let orphan='./'+leaf+'.orphan-'+stamp;
if(fs.existsSync(orphan)||fs.existsSync('./'+path.basename(orphan)))orphan='./'+leaf+'.orphan-'+stamp+'-'+process.pid;
if(fs.existsSync(orphan))deny('ABANDONED_LOCK_PRECONDITION_FAILED');
const sha=crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
fs.renameSync(target,orphan);
process.stdout.write(JSON.stringify({orphan:path.resolve(orphan),sha}));
`;
/** r109 最小切片②：用户确认后的唯一允许的移开动作。先在进程内重跑只读分类（活锁/未满阈值/目录等
 * 一律拒绝且零操作），再在独立子进程内以父目录身份复核后 rename——保留全部原字节，禁止删除。
 * 返回移开路径与原字节 sha256（0 字节即固定空串哈希，留痕用）。 */
async function relocateAbandonedLedgerLock(lockPath, nowMs = Date.now()) {
    const diagnosis = await classifyAbandonedZeroByteLock(lockPath, nowMs);
    if (!diagnosis)
        throw new Error(`${exports.ABANDONED_ZERO_BYTE_LOCK}：移开前复核未通过——锁不是"0 字节且无身份、久无变化"的废弃形态（或本实例正在创建），未执行任何操作。`);
    const parent = path.dirname(lockPath);
    const parentIdentity = await node_fs_1.promises.stat(parent);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const { stdout } = await releaseOwnedLock(process.execPath, ["-e", relocateScript, parent, path.basename(lockPath),
        String(parentIdentity.dev), String(parentIdentity.ino), stamp], { cwd: parent, windowsHide: true,
        timeout: 2000, env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" } });
    // r114：子进程输出的字段名是 {orphan,sha}——父侧核实必须按同一契约读取（此前误读
    // moved.orphanPath 会把每次合法移开都报成"无法核实"）。两个字段仍全部必须为非空字符串，
    // 任一缺失/类型不符依旧 fail closed 报人工核对，不放松。
    const moved = JSON.parse(String(stdout));
    if (typeof moved.orphan !== "string" || typeof moved.sha !== "string")
        throw new Error(`${exports.ABANDONED_ZERO_BYTE_LOCK}：移开结果无法核实，请按输出人工核对锁与 orphan 文件。`);
    return { orphanPath: moved.orphan, sha256: moved.sha };
}
/** r109 最小切片③：按签名限流——同签名窗口（默认 1 小时）内只放行首条，其后计数；出窗再放行时
 * 携带被抑制条数，保证 action_errors 的 8 条窗口不被每 tick 重复错误淹没。nowMs 可注入仅用于测试。 */
function nextIsolatedLedgerReport(state, signature, windowMs = 3_600_000, nowMs = Date.now()) {
    const prior = state.get(signature);
    if (!prior || nowMs - prior.lastAt >= windowMs) {
        const suppressed = prior ? prior.suppressed : 0;
        state.set(signature, { lastAt: nowMs, suppressed: 0 });
        return { report: true, suppressed };
    }
    prior.suppressed += 1;
    return { report: false, suppressed: prior.suppressed };
}
/** 账本临界区：先进程内链（同实例重入），再跨进程 CAS 锁；锁内写盘一律带 token fencing。 */
function withIsolatedBatchLedger(file, work) {
    const step = async () => {
        await node_fs_1.promises.mkdir(path.dirname(file), { recursive: true });
        const parent = await node_fs_1.promises.realpath(path.dirname(file));
        const physicalFile = path.join(parent, path.basename(file));
        const lockPath = `${physicalFile}.lock`;
        const lock = await acquireLedgerLock(lockPath);
        try {
            return await work({ lockPath, token: lock.token });
        }
        finally {
            await lock.release();
        }
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
    return withIsolatedBatchLedger(file, async (fence) => {
        const batches = await loadIsolatedBatchLedger(file);
        let batch = batches.find(entry => entry.batchId === batchInfo.batchId);
        if (!batch) {
            batch = { batchId: String(batchInfo.batchId), projectRoot: String(batchInfo.projectRoot || ""),
                canonicalProjectId: batchInfo.canonicalProjectId ? String(batchInfo.canonicalProjectId) : undefined,
                frozenAt: new Date().toISOString(),
                plans: plans.map(row => ({ planFile: String(row.planFile), submissionOperationId: String(row.submissionOperationId), revision: "", codeFingerprint: "", state: "frozen", cleanup: [] })) };
            batches.push(batch);
            await saveIsolatedBatchLedger(file, batches, fence);
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
    return withIsolatedBatchLedger(file, async (fence) => {
        const batches = await loadIsolatedBatchLedger(file);
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
            await saveIsolatedBatchLedger(file, batches, fence);
        return true;
    });
}
/** 提交终局（首写为准，幂等不回退）：committed+真实卡身份→awaiting_dispatch；失败/取消→void；其余 unknown。 */
async function markPlanTerminal(file, batchInfo, terminal) {
    return withIsolatedBatchLedger(file, async (fence) => {
        const batches = await loadIsolatedBatchLedger(file);
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
        await saveIsolatedBatchLedger(file, batches, fence);
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
    return withIsolatedBatchLedger(file, async (fence) => {
        const batches = await loadIsolatedBatchLedger(file);
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
            await saveIsolatedBatchLedger(file, batches, fence);
        return promoted;
    });
}
/** 审核资格：项目匹配、批次非空、每个初始 PLAN 都 dispatched（frozen/void/unknown/awaiting 一律不合格）、且至少一个隔离目标可审。 */
function eligibleIsolatedReviews(batches, projectRoot) {
    return batches.filter(batch => batch.projectRoot && batch.projectRoot === projectRoot && batch.plans.length > 0
        && batch.plans.every(plan => plan.state === "dispatched")
        && batch.plans.some(plan => plan.cleanup.length > 0));
}
