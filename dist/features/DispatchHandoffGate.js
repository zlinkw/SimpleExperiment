"use strict";
/**
 * 代码写入／派发交接 gate。
 *
 * 这里只放纯状态与纯函数：既不等待整轮 tick，也不把 `distributedQueueWritePromise`
 * 或“准入保存已完成”当成安全证据。所有权规则：
 * - 同步请求在任何 await 之前登记“禁止新派发”意图，派发侧进入 gate 时重新查询该意图；
 * - 交接所有权从准入意图落盘开始，覆盖代码证明准备、真实发送或明确未发送、本机回执提交；
 * - 已开始发送或结果未知的所有权只有真实提交或明确未发送证据才能释放，等待超时不释放；
 * - 每个 Worker 的上传状态独立记录，不折叠成“全部成功”的单一布尔。
 * tick 阶段账本与交接所有权分别记录，不混为“派发中”。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HANDOFF_PHASES = void 0;
exports.createGate = createGate;
exports.beginUpload = beginUpload;
exports.noteUploadTarget = noteUploadTarget;
exports.endUpload = endUpload;
exports.uploadBlocksWorker = uploadBlocksWorker;
exports.pendingUnknownCodeWrite = pendingUnknownCodeWrite;
exports.recordUnknownCodeWrite = recordUnknownCodeWrite;
exports.resolveUnknownCodeWrite = resolveUnknownCodeWrite;
exports.uploadYieldsWholeRound = uploadYieldsWholeRound;
exports.markWorkerUploadState = markWorkerUploadState;
exports.beginHandoff = beginHandoff;
exports.hasHandoff = hasHandoff;
exports.advanceHandoff = advanceHandoff;
exports.markHandoffTransmission = markHandoffTransmission;
exports.markHandoffTransportSettled = markHandoffTransportSettled;
exports.markHandoffAwaitingEvidence = markHandoffAwaitingEvidence;
exports.endHandoff = endHandoff;
exports.endRoundHandoffs = endRoundHandoffs;
exports.releaseHandoffsOnObservation = releaseHandoffsOnObservation;
exports.blockingHandoffs = blockingHandoffs;
exports.waitForBlockingClear = waitForBlockingClear;
exports.beginTick = beginTick;
exports.setTickPhase = setTickPhase;
exports.endTick = endTick;
exports.gateSnapshot = gateSnapshot;
exports.tickSnapshot = tickSnapshot;
exports.handoffEvidence = handoffEvidence;
exports.createTargetLeaseTable = createTargetLeaseTable;
exports.targetLeaseFence = targetLeaseFence;
exports.acquireTargetLease = acquireTargetLease;
exports.fenceTargetLease = fenceTargetLease;
exports.releaseTargetLease = releaseTargetLease;
exports.HANDOFF_PHASES = [
    "admission-intent-save", "code-proof-prepare", "transmission", "local-receipt-commit",
];
const RECENT_LIMIT = 8;
const IDENTITY_LIMIT = 16;
function createGate() {
    return {
        uploads: [], workerUploads: new Map(), handoffs: new Map(), unknownWrites: new Map(), recentHandoffs: [],
        ticks: new Map(), recentTicks: [], waiters: new Set(),
    };
}
const workerKey = (root, workerId) => `${String(root || "")}\u0000${String(workerId || "")}`;
const handoffKey = (root, commandId) => `${String(root || "")}\u0000${String(commandId || "")}`;
const unknownKey = (root, targetKey) => `${String(root || "")}\u0000${String(targetKey || "")}`;
function notify(gate) {
    for (const waiter of [...gate.waiters])
        waiter.notify();
}
/** 在任何 await 之前同步登记“禁止新派发进入”的意图。 */
function beginUpload(gate, input) {
    const intent = {
        uploadId: String(input.uploadId),
        root: String(input.root || ""),
        scope: String(input.scope || ""),
        startedAtMs: input.startedAtMs || Date.now(),
        workerIds: [...new Set((input.workerIds || []).map(String).filter(Boolean))],
    };
    gate.uploads.push(intent);
    for (const workerId of intent.workerIds) {
        const key = workerKey(intent.root, workerId);
        const previous = gate.workerUploads.get(key);
        gate.workerUploads.set(key, {
            uploadId: intent.uploadId, root: intent.root, workerId, state: "uploading",
            startedAtMs: previous && previous.uploadId === intent.uploadId ? previous.startedAtMs : intent.startedAtMs,
            updatedAtMs: intent.startedAtMs,
            // 上一轮「结果未知」只保留失败详情，不伪装成本轮结论：本轮仍需自己的真实证据才能放行新派发；
            // 真正的未知写入保留在 unknownWrites 表里，只能由主动查询解除，不靠这里卡住新一轮推进。
            ...(previous && previous.state === "unknown-failed" && previous.uploadId !== intent.uploadId
                ? { previousUnknownError: previous.error } : {}),
        });
    }
    return intent;
}
/** 记下本次写入真正落在哪个实际目标（规范服务器 + 远端 root），别名判定依赖它。 */
function noteUploadTarget(gate, uploadId, root, workerId, targetKey) {
    if (!targetKey)
        return;
    const key = workerKey(root, workerId);
    const existing = gate.workerUploads.get(key);
    if (!existing)
        return;
    if (existing.uploadId !== String(uploadId) && existing.state !== "unknown-failed")
        return;
    existing.targetKey = String(targetKey);
    existing.updatedAtMs = Date.now();
    notify(gate);
}
/** 本次上传结束：只回收本轮身份，其他身份的所有权（含未知）保持不变。 */
function endUpload(gate, uploadId) {
    const index = gate.uploads.findIndex(intent => intent.uploadId === uploadId);
    if (index < 0)
        return;
    gate.uploads.splice(index, 1);
    for (const [key, record] of [...gate.workerUploads]) {
        if (record.uploadId !== uploadId)
            continue;
        // 结果未知的 Worker 保留原所有权记录，不被后续 Worker 的成功覆盖。
        if (record.state === "unknown-failed")
            continue;
        gate.workerUploads.delete(key);
    }
    notify(gate);
}
/** 只有本轮上传中确认写入完成的 Worker 才重新允许新派发。 */
function uploadBlocksWorker(gate, root, workerId, targetKey) {
    const record = gate.workerUploads.get(workerKey(root, workerId));
    const rootKey = String(root || "");
    const wanted = String(workerId || "");
    const key = String(targetKey || "");
    // 写入结果仍未知的目标：不因本轮结束、其他 Worker 成功或换代而解除阻塞。
    if (pendingUnknownCodeWrite(gate, rootKey, { targetKey: key, workerId: wanted }))
        return true;
    for (const intent of gate.uploads) {
        if (intent.root !== rootKey)
            continue;
        // 未被本次写入针对的 Worker 不得被误锁；目标集合为空按失败关闭，不因未给出目标就当作无风险。
        const own = !intent.workerIds.length || intent.workerIds.includes(wanted);
        const ownDone = record?.uploadId === intent.uploadId && record?.state === "uploaded";
        if (own && !ownDone)
            return true;
        if (!key)
            continue;
        // 别名共享同一实际写目标：A 完成不代表同一服务器同一 root 上 B 的写入已结束，不能只凭 A 的记录放行。
        for (const other of gate.workerUploads.values()) {
            if (other.uploadId !== intent.uploadId || other.workerId === wanted)
                continue;
            if (!other.targetKey || other.targetKey !== key)
                continue;
            if (other.state !== "uploaded")
                return true;
        }
    }
    return false;
}
/** 未知写入所属目标：按实际写目标匹配，也允许只按 Worker ID 匹配（身份不可解析时的保留）。 */
function pendingUnknownCodeWrite(gate, root, identity) {
    const rootKey = String(root || "");
    const targetKey = String(identity?.targetKey || "");
    const workerId = String(identity?.workerId || "");
    if (targetKey) {
        const exact = gate.unknownWrites.get(unknownKey(rootKey, targetKey));
        if (exact)
            return exact;
    }
    if (!workerId)
        return undefined;
    return [...gate.unknownWrites.values()]
        .filter(record => record.root === rootKey && record.workerId === workerId)
        .sort((a, b) => a.startedAtMs - b.startedAtMs)[0];
}
/** 写入结果未知：保留原操作身份与目标所有权，不因本轮结束、其他 Worker 成功或新一轮登记而消失。 */
function recordUnknownCodeWrite(gate, input) {
    const key = unknownKey(input.root, input.targetKey || `worker:${input.workerId || ""}`);
    const now = Date.now();
    const record = {
        uploadId: String(input.uploadId || ""), syncId: String(input.syncId || ""), root: String(input.root || ""),
        targetKey: String(input.targetKey || ""), workerId: String(input.workerId || ""), startedAtMs: input.startedAtMs || now,
        updatedAtMs: now, error: String(input.error || "写入结果未知"), transportStarted: input.transportStarted === true,
    };
    gate.unknownWrites.set(key, record);
    // 不淘汰尚未解决的未知写入：所有权只能由主动查询确认结束后释放。
    notify(gate);
    return record;
}
/** 只有主动查询确认写入已结束后才能释放未知写入所有权；调用方必须交出真实查询证据。 */
function resolveUnknownCodeWrite(gate, root, identity) {
    const record = pendingUnknownCodeWrite(gate, root, identity);
    if (!record)
        return undefined;
    for (const [key, value] of [...gate.unknownWrites]) {
        if (value !== record)
            continue;
        gate.unknownWrites.delete(key);
    }
    const key = workerKey(record.root, record.workerId);
    const existing = gate.workerUploads.get(key);
    if (existing && existing.state === "unknown-failed")
        gate.workerUploads.delete(key);
    notify(gate);
    return record;
}
/** 本轮派发是否必须整体让路：所有候选 Worker 都仍被未完成的写入意图挡住。 */
function uploadYieldsWholeRound(gate, root, workers) {
    const entries = (workers || []).map(entry => (typeof entry === "string" ? { workerId: entry } : entry)).filter(entry => entry?.workerId);
    if (!entries.length)
        return false;
    return entries.every(entry => uploadBlocksWorker(gate, root, entry.workerId, entry.targetKey));
}
function markWorkerUploadState(gate, uploadId, root, workerId, state, error) {
    const key = workerKey(root, workerId);
    const existing = gate.workerUploads.get(key);
    if (existing && existing.uploadId !== String(uploadId))
        return;
    const now = Date.now();
    gate.workerUploads.set(key, {
        uploadId: String(uploadId), root: String(root || ""), workerId: String(workerId), state,
        startedAtMs: existing && existing.uploadId === String(uploadId) ? existing.startedAtMs : now,
        updatedAtMs: now, error: state === "unknown-failed" ? String(error || "结果未知") : undefined,
        ...(existing?.targetKey ? { targetKey: existing.targetKey } : {}),
    });
    if (state !== "uploading")
        notify(gate);
}
function beginHandoff(gate, input) {
    const key = handoffKey(input.root, input.commandId);
    const existing = gate.handoffs.get(key);
    if (existing && existing.tickId === String(input.tickId))
        return existing;
    const now = input.startedAtMs || Date.now();
    const record = {
        handoffId: key, tickId: String(input.tickId), generation: Number(input.generation), root: String(input.root || ""),
        projectId: String(input.projectId || ""), workerId: String(input.workerId || ""), planId: String(input.planId || ""),
        planFile: String(input.planFile || ""), jobIndex: Number(input.jobIndex), commandId: String(input.commandId || ""),
        gpuId: String(input.gpuId || ""), attempt: Number(input.attempt || 0), startedAtMs: now,
        phase: "admission-intent-save", phaseIndex: 0, phaseStartedAtMs: now, transmissionStarted: false,
        transportSettled: false, transportOutcome: "", localCommitConfirmed: false, awaitingEvidence: "",
    };
    gate.handoffs.set(key, record);
    return record;
}
function hasHandoff(gate, root, commandId) {
    return gate.handoffs.has(handoffKey(root, commandId));
}
/** 只按顺序推进阶段，逆序说明所有权已被别的轮次接管，直接拒绝。 */
function advanceHandoff(gate, root, commandId, phase) {
    const record = gate.handoffs.get(handoffKey(root, commandId));
    if (!record)
        return undefined;
    const index = exports.HANDOFF_PHASES.indexOf(phase);
    if (index < 0)
        return record;
    if (index < record.phaseIndex)
        return record;
    if (index > record.phaseIndex) {
        record.phase = phase;
        record.phaseIndex = index;
        record.phaseStartedAtMs = Date.now();
    }
    return record;
}
/** 真实传输边界：此后不得按超时释放所有权。 */
function markHandoffTransmission(gate, root, commandId) {
    const record = gate.handoffs.get(handoffKey(root, commandId));
    if (!record)
        return;
    record.transmissionStarted = true;
    record.awaitingEvidence = "transport-in-flight";
    const index = exports.HANDOFF_PHASES.indexOf("transmission");
    if (index >= record.phaseIndex) {
        record.phase = "transmission";
        record.phaseIndex = index;
        record.phaseStartedAtMs = Date.now();
    }
}
/**
 * 底层传输自己落定了（fire-and-forget 的 POST 落定，或同步发送已返回）。
 * 这与“外层调用已返回”是两回事：只有落定之后，精确查询才能用作释放证据。
 */
function markHandoffTransportSettled(gate, root, commandId, outcome) {
    const record = gate.handoffs.get(handoffKey(root, commandId));
    if (!record || !record.transmissionStarted || record.transportSettled)
        return record;
    record.transportSettled = true;
    record.transportOutcome = outcome;
    record.awaitingEvidence = outcome === "ok" ? "awaiting-exact-query-or-local-commit" : "awaiting-exact-query";
    notify(gate);
    return record;
}
/** 本机提交/退回尚未可靠落盘：不删除所有权，只记录当前在等哪一种证据。 */
function markHandoffAwaitingEvidence(gate, root, commandId, reason) {
    const record = gate.handoffs.get(handoffKey(root, commandId));
    if (!record)
        return undefined;
    record.awaitingEvidence = String(reason || "awaiting-evidence");
    notify(gate);
    return record;
}
/**
 * 释放只在真实证据上发生：
 * - `committed` 要求本机落盘真的成功（由调用方保证）；
 * - `transport-handed-off` / `transport-not-observed` 要求传输已落定后的完整无错查询（由调用方保证）；
 * - 已发送的记录在任何其他结局下都不得删除，包括“外层已返回 / 整轮结束 / 异常 / 换代”，
 *   也不管传输是否已落定：传输失败落定不等于本机状态已移交，更不等于已查过远端。
 *   否则一次 fresh 查询的 missing 或一次换代就能把在途写入的所有权抹掉。
 */
const EVIDENCED_RELEASE_OUTCOMES = ["committed", "transport-handed-off", "transport-not-observed"];
function endHandoff(gate, root, commandId, outcome) {
    const key = handoffKey(root, commandId);
    const record = gate.handoffs.get(key);
    if (!record)
        return false;
    if (record.transmissionStarted && !EVIDENCED_RELEASE_OUTCOMES.includes(outcome)) {
        // 已发送但未拿到可靠移交/查询证据：保留所有权，只标注当前在等哪一种证据。
        record.awaitingEvidence = record.transportSettled
            ? `${outcome}-deferred-awaiting-commit-or-query`
            : `${outcome}-deferred-transport-in-flight`;
        notify(gate);
        return false;
    }
    gate.handoffs.delete(key);
    gate.recentHandoffs.unshift({
        handoffId: record.handoffId, commandId: record.commandId, workerId: record.workerId, phase: record.phase,
        outcome, sent: record.transmissionStarted, endedAtMs: Date.now(),
    });
    if (gate.recentHandoffs.length > RECENT_LIMIT)
        gate.recentHandoffs.length = RECENT_LIMIT;
    notify(gate);
    return true;
}
/**
 * 整轮结束或换代：从未发送的登记按真实结局回收；已发送的登记不能靠 generation 或轮次抹掉，
 * 它们留在表内并标注待证证据，由精确查询/可靠移交释放。
 */
function endRoundHandoffs(gate, tickId, outcome) {
    const stale = [...gate.handoffs.values()].filter(record => record.tickId === String(tickId));
    let ended = 0;
    for (const record of stale) {
        if (endHandoff(gate, record.root, record.commandId, outcome))
            ended += 1;
    }
    return ended;
}
/**
 * 精确查询后的释放：一次完整、无错误的 Worker 任务观测才能当证据。
 * 传输仍在途的登记任何情况下都不释放；查询失败或 queryComplete 不为 true 同样不释放。
 */
function releaseHandoffsOnObservation(gate, root, workerId, snapshot) {
    if (!snapshot || snapshot.error || snapshot.queryComplete !== true)
        return 0;
    const observed = new Set((Array.isArray(snapshot.tasks) ? snapshot.tasks : [])
        .map((task) => String(task?.commandId || "")).filter(Boolean));
    const rootKey = String(root || "");
    const wanted = String(workerId || "");
    let released = 0;
    for (const record of [...gate.handoffs.values()]) {
        if (record.root !== rootKey || record.workerId !== wanted)
            continue;
        if (!record.transmissionStarted || !record.transportSettled)
            continue;
        const outcome = observed.has(record.commandId) ? "transport-handed-off" : "transport-not-observed";
        if (endHandoff(gate, rootKey, record.commandId, outcome))
            released += 1;
    }
    return released;
}
function blockingHandoffs(gate, root, workerIds) {
    const wanted = new Set((workerIds || []).map(String));
    return [...gate.handoffs.values()]
        .filter(record => record.root === String(root || "") && (!wanted.size || wanted.has(record.workerId)))
        .sort((a, b) => a.startedAtMs - b.startedAtMs);
}
function waitForBlockingClear(gate, root, workerIds, timeoutMs) {
    const startedAt = Date.now();
    const initial = blockingHandoffs(gate, root, workerIds);
    if (!initial.length)
        return Promise.resolve({ safe: true, waitedMs: 0, timedOut: false, blocking: [] });
    return new Promise(resolve => {
        let settled = false;
        const waiter = { notify: () => { void check(); } };
        const timer = setTimeout(() => finish(false, true), Math.max(0, Number(timeoutMs) || 0));
        timer.unref?.();
        const finish = (safe, timedOut) => {
            if (settled)
                return;
            settled = true;
            gate.waiters.delete(waiter);
            clearTimeout(timer);
            resolve({ safe, waitedMs: Math.max(0, Date.now() - startedAt), timedOut, blocking: blockingHandoffs(gate, root, workerIds) });
        };
        const check = () => { if (!blockingHandoffs(gate, root, workerIds).length)
            finish(true, false); };
        gate.waiters.add(waiter);
        check();
    });
}
function beginTick(gate, input) {
    const now = input.startedAtMs || Date.now();
    const record = {
        tickId: String(input.tickId), root: String(input.root || ""), generation: Number(input.generation),
        startedAtMs: now, updatedAtMs: now, phase: "begin", phaseIndex: 0, phaseStartedAtMs: now,
        phases: ["begin"], workerId: "", planId: "", jobIndex: 0, commandId: "", sent: false, outcome: "in-flight", error: "",
    };
    gate.ticks.set(record.tickId, record);
    for (const [tickId, stale] of [...gate.ticks]) {
        if (stale.outcome !== "in-flight" && tickId !== record.tickId)
            gate.ticks.delete(tickId);
    }
    while (gate.ticks.size > IDENTITY_LIMIT) {
        const oldest = [...gate.ticks.values()].sort((a, b) => a.startedAtMs - b.startedAtMs)[0];
        if (!oldest || oldest.tickId === record.tickId)
            break;
        gate.ticks.delete(oldest.tickId);
    }
    return record;
}
function setTickPhase(gate, tickId, phase, detail) {
    const record = gate.ticks.get(String(tickId));
    if (!record)
        return;
    const now = Date.now();
    if (record.phase !== String(phase)) {
        record.phase = String(phase);
        record.phaseIndex += 1;
        record.phaseStartedAtMs = now;
        record.phases.push(record.phase);
        if (record.phases.length > 40)
            record.phases.splice(0, record.phases.length - 40);
    }
    record.updatedAtMs = now;
    if (detail?.workerId !== undefined)
        record.workerId = String(detail.workerId || "");
    if (detail?.planId !== undefined)
        record.planId = String(detail.planId || "");
    if (detail?.jobIndex !== undefined)
        record.jobIndex = Number(detail.jobIndex) || 0;
    if (detail?.commandId !== undefined)
        record.commandId = String(detail.commandId || "");
    if (detail?.sent !== undefined)
        record.sent = detail.sent === true;
}
function endTick(gate, tickId, outcome, error) {
    const record = gate.ticks.get(String(tickId));
    if (!record)
        return;
    const now = Date.now();
    record.outcome = String(outcome || "completed");
    record.error = error ? String(error) : "";
    record.updatedAtMs = now;
    gate.recentTicks.unshift({
        tickId: record.tickId, generation: record.generation, phase: record.phase, phaseIndex: record.phaseIndex,
        elapsedMs: Math.max(0, now - record.startedAtMs), outcome: record.outcome,
    });
    if (gate.recentTicks.length > RECENT_LIMIT)
        gate.recentTicks.length = RECENT_LIMIT;
}
/** 交接 gate 快照：有界、无密钥、无文件清单。 */
function gateSnapshot(gate, root) {
    const scoped = (value) => !root || value === String(root);
    const workerUploads = [...gate.workerUploads.values()].filter(record => scoped(record.root)).slice(-IDENTITY_LIMIT)
        .map(record => ({ workerId: record.workerId, uploadId: record.uploadId, state: record.state,
        ...(record.targetKey ? { targetKey: record.targetKey } : {}),
        ageMs: Math.max(0, Date.now() - record.updatedAtMs), ...(record.error ? { error: record.error.slice(0, 240) } : {}) }));
    const active = [...gate.handoffs.values()].filter(record => scoped(record.root))
        .map(record => ({ handoffId: record.handoffId, tickId: record.tickId, generation: record.generation, workerId: record.workerId,
        planId: record.planId, planFile: record.planFile, jobIndex: record.jobIndex, commandId: record.commandId,
        gpuId: record.gpuId, attempt: record.attempt, phase: record.phase, phaseIndex: record.phaseIndex,
        phaseElapsedMs: Math.max(0, Date.now() - record.phaseStartedAtMs), elapsedMs: Math.max(0, Date.now() - record.startedAtMs),
        sent: record.transmissionStarted, transportSettled: record.transportSettled, transportOutcome: record.transportOutcome,
        localCommitConfirmed: record.localCommitConfirmed, awaitingEvidence: record.awaitingEvidence }))
        .sort((a, b) => b.elapsedMs - a.elapsedMs);
    const unknownWrites = [...gate.unknownWrites.values()].filter(record => scoped(record.root))
        .sort((a, b) => b.updatedAtMs - a.updatedAtMs).slice(0, IDENTITY_LIMIT)
        .map(record => ({ targetKey: record.targetKey, workerId: record.workerId, uploadId: record.uploadId,
        ageMs: Math.max(0, Date.now() - record.updatedAtMs), transportStarted: record.transportStarted,
        error: String(record.error || "").slice(0, 240) }));
    return {
        status: active.length ? "handoff-in-flight" : unknownWrites.length ? "unknown-write-retained"
            : gate.uploads.length ? "upload-in-flight" : "idle",
        uploadIntents: gate.uploads.filter(intent => scoped(intent.root)).slice(0, IDENTITY_LIMIT)
            .map(intent => ({ uploadId: intent.uploadId, scope: intent.scope, workerCount: intent.workerIds.length,
            workerIds: intent.workerIds.slice(0, 8), ageMs: Math.max(0, Date.now() - intent.startedAtMs) })),
        workerUploads,
        unknownWrites,
        activeHandoffs: active.slice(0, IDENTITY_LIMIT),
        activeHandoffCount: active.length,
        recentHandoffs: gate.recentHandoffs.slice(0, RECENT_LIMIT),
    };
}
/** tick 阶段账本快照：与 gate 状态分开，不折叠成“派发中”。 */
function tickSnapshot(gate, root) {
    const records = [...gate.ticks.values()].filter(record => scopedRoot(record.root, root))
        .sort((a, b) => b.startedAtMs - a.startedAtMs).slice(0, IDENTITY_LIMIT)
        .map(record => ({ tickId: record.tickId, generation: record.generation, phase: record.phase, phaseIndex: record.phaseIndex,
        phaseElapsedMs: Math.max(0, Date.now() - record.phaseStartedAtMs), elapsedMs: Math.max(0, Date.now() - record.startedAtMs),
        phases: record.phases.slice(-24), workerId: record.workerId, planId: record.planId, jobIndex: record.jobIndex,
        commandId: record.commandId, sent: record.sent, outcome: record.outcome, ...(record.error ? { error: record.error.slice(0, 240) } : {}) }));
    return { status: records.some(record => record.outcome === "in-flight") ? "ticking" : "idle",
        ticks: records, recent: gate.recentTicks.slice(0, RECENT_LIMIT) };
}
const scopedRoot = (value, root) => !root || value === String(root);
/** 超时证据：只描述 gate 与本轮阶段，供既有可持久化错误通道记录。 */
function handoffEvidence(gate, root, blocking) {
    return {
        waitedFor: "dispatch-handoff",
        reason: blocking.length ? "active-handoff" : "no-progress",
        blocking: blocking.slice(0, 8).map(record => ({ tickId: record.tickId, generation: record.generation, workerId: record.workerId,
            planFile: record.planFile, jobIndex: record.jobIndex, commandId: record.commandId, phase: record.phase,
            phaseElapsedMs: Math.max(0, Date.now() - record.phaseStartedAtMs), elapsedMs: Math.max(0, Date.now() - record.startedAtMs),
            sent: record.transmissionStarted, transportSettled: record.transportSettled, transportOutcome: record.transportOutcome,
            localCommitConfirmed: record.localCommitConfirmed, awaitingEvidence: record.awaitingEvidence })),
        tick: tickSnapshot(gate, root),
        gate: gateSnapshot(gate, root),
    };
}
function createTargetLeaseTable() {
    return { held: new Map(), waiters: new Map(), fenced: new Map() };
}
/** 目标当前是否处于「写入结果未知、写锁保留」状态。 */
function targetLeaseFence(table, key) {
    return (table.fenced || new Map()).get(String(key || ""));
}
const deferredLeaseResult = (key, ownerId, fence) => ({
    key, ownerId,
    deferred: {
        owner: fence.ownerId,
        reason: fence.reason || "上一次写入结果未确认结束",
        heldMs: Math.max(0, Date.now() - fence.startedAtMs),
    },
});
function acquireTargetLease(table, key, ownerId, waiters) {
    const fences = table.fenced || (table.fenced = new Map());
    const claim = () => {
        if (table.held.has(key))
            return undefined;
        table.held.set(key, { ownerId, startedAtMs: Date.now() });
        return { key, ownerId };
    };
    // 目标已被未确认写入围栏：新到的等待者也立刻拿到「未开始、需核实」，不去空等一把只能由查询证据释放的锁。
    const fenceAtEntry = fences.get(key);
    if (fenceAtEntry)
        return Promise.resolve(deferredLeaseResult(key, ownerId, fenceAtEntry));
    const immediate = claim();
    if (immediate)
        return Promise.resolve(immediate);
    return new Promise((resolve, reject) => {
        let settled = false;
        const wake = () => {
            if (settled)
                return;
            const fence = fences.get(key);
            if (!fence) {
                const token = claim();
                if (!token)
                    return;
                settled = true;
                leaveQueue();
                waiters?.signal?.removeEventListener?.("abort", abort);
                resolve(token);
                return;
            }
            // 排队期间目标进入未知状态：结束本次等待并明确「未开始、需核实」，不接管写入、不空等、不裁状态。
            settled = true;
            leaveQueue();
            waiters?.signal?.removeEventListener?.("abort", abort);
            resolve(deferredLeaseResult(key, ownerId, fence));
        };
        const leaveQueue = () => {
            const queue = (table.waiters.get(key) || []).filter(item => item !== wake);
            if (queue.length)
                table.waiters.set(key, queue);
            else
                table.waiters.delete(key);
        };
        const abort = () => {
            if (settled)
                return;
            settled = true;
            leaveQueue();
            reject(Object.assign(new Error("代码写入目标租约等待已取消，未开始写入。"), { dispatchNotSent: true }));
        };
        const queue = table.waiters.get(key) || [];
        queue.push(wake);
        table.waiters.set(key, queue);
        if (waiters?.signal?.aborted) {
            abort();
            return;
        }
        waiters?.signal?.addEventListener?.("abort", abort, { once: true });
    });
}
/**
 * 目标写入结果未知：保留写锁不放，并把已经排在该目标上的等待者全部唤醒，
 * 让它们以「未开始、需核实」结束本次等待，整批因此能正常失败收敛。
 * 这不是交出所有权：围栏与保留租约只能由真实查询证据后的 releaseTargetLease 解除。
 */
function fenceTargetLease(table, token, reason) {
    if (!token)
        return false;
    const held = table.held.get(token.key);
    if (!held || held.ownerId !== token.ownerId)
        return false;
    const fences = table.fenced || (table.fenced = new Map());
    fences.set(token.key, { ownerId: token.ownerId, reason: String(reason || ""), startedAtMs: Date.now() });
    for (const wake of [...(table.waiters.get(token.key) || [])])
        wake();
    return true;
}
function releaseTargetLease(table, token) {
    if (!token)
        return false;
    const held = table.held.get(token.key);
    if (!held || held.ownerId !== token.ownerId)
        return false;
    table.held.delete(token.key);
    // 只有持有者本人交出这把锁（未知写入路径即“查询已确认结束”）才解除围栏，随后排队者才能重新取锁。
    if (table.fenced?.get(token.key)?.ownerId === held.ownerId)
        table.fenced.delete(token.key);
    const queue = table.waiters.get(token.key) || [];
    const next = queue.shift();
    if (queue.length)
        table.waiters.set(token.key, queue);
    else
        table.waiters.delete(token.key);
    next?.();
    return true;
}
