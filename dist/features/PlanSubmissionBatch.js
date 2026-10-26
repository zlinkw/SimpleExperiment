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
exports.PlanSubmissionBatch = exports.planSubmissionBatchFor = void 0;
const node_crypto_1 = require("node:crypto");
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
const bindings = new WeakMap();
const planSubmissionBatchFor = (message) => bindings.get(message);
exports.planSubmissionBatchFor = planSubmissionBatchFor;
/** One live batch. Only common preparation is memoized; PLAN/result observations stay fresh. */
class PlanSubmissionBatch {
    host;
    context;
    current;
    report;
    shared = new Map();
    active = new Map();
    lanes = new Map();
    closed = false;
    code;
    revisions;
    workerAssignments = new Map();
    constructor(host, context, plans, current, report = () => { }) {
        this.host = host;
        this.context = context;
        this.current = current;
        this.report = report;
        this.revisions = new Map(plans.map(plan => [String(plan.planFile || plan.file).replaceAll("\\", "/"), String(plan.revision || "")]));
    }
    bind(message) { this.check(); bindings.set(message, this); }
    selectWorker(body, candidates) {
        this.check();
        const file = String(body.planFile || body.options?.planFile || "");
        const assigned = this.workerAssignments.get(file);
        if (assigned && candidates.includes(assigned))
            return assigned;
        const ordered = [...new Set(candidates)].sort((a, b) => [...this.workerAssignments.values()].filter(id => id === a).length - [...this.workerAssignments.values()].filter(id => id === b).length);
        if (!ordered.length)
            throw Error("没有可校验本批 PLAN 的 Worker。");
        this.workerAssignments.set(file, ordered[0]);
        return ordered[0];
    }
    async start() { this.code = await this.verify(); }
    check() { this.current(); if (this.closed)
        throw Error("本批提交已结束，不能复用准备结果。"); }
    memo(map, key, work) {
        this.check();
        let value = map.get(key);
        if (!value) {
            value = Promise.resolve().then(() => { this.check(); return work(); }).then(result => { this.check(); return result; });
            map.set(key, value);
        }
        return value.then(result => { this.check(); return result; });
    }
    once(key, work) { return this.memo(this.shared, key, work); }
    fresh(key, work) {
        const result = this.memo(this.active, key, work);
        const pending = this.active.get(key);
        void result.finally(() => { if (this.active.get(key) === pending)
            this.active.delete(key); }).catch(() => { });
        return result;
    }
    serial(key, work) {
        const next = (this.lanes.get(key) || Promise.resolve()).catch(() => { }).then(async () => {
            this.check();
            const result = await work();
            this.check();
            return result;
        });
        this.lanes.set(key, next);
        return next;
    }
    // 同批隔离机械 I/O 读写协调（2026-10-25 同批互挡根因）：读=预检观察链（配套 SimpleSFTP 生产证明的
    // 只读观测，读者之间可并发）；写=在 SFTP 计忙的段（confirmed 前置预检；单 token 的 execute/status/verify）。
    // 队列严格 FIFO：后到的读者不得越过队首写者（无饥饿），相邻写段之间已排队读者可前进。等待只发生在
    // 本活批自己的临界段——外部传输不经此道，SFTP 忙照旧即时拒绝 fail-closed；人工确认走 confirmGateLocal、
    // 本地回执 save 与其它与当前资源无关的等待绝不进这条机械锁。
    isolationWriter = false;
    isolationReaders = 0;
    isolationWaiters = [];
    // close 结算跟踪的是每次 isolation 调用的完整生命周期（等 grant→本体→finally 释放），不是只等 grant：
    // 立即获准/正在执行的工作同样被 close 等到，绝不出现"close 返回而 rename 还在途"。
    isolationPending = new Set();
    isolationCanGrant(kind) { return kind === "read" ? !this.isolationWriter : !this.isolationWriter && this.isolationReaders === 0; }
    isolationPump() {
        while (this.isolationWaiters.length && this.isolationCanGrant(this.isolationWaiters[0].kind)) {
            const head = this.isolationWaiters.shift();
            if (head.kind === "read")
                this.isolationReaders += 1;
            else
                this.isolationWriter = true;
            head.grant();
        }
    }
    isolationRelease(kind) {
        if (kind === "read")
            this.isolationReaders -= 1;
        else
            this.isolationWriter = false;
        this.isolationPump();
    }
    /** 批内隔离机械 I/O 的读（kind="read"）/写（kind="write"）协调。每次已获占用后，无论 check 还是
     * 原 work 在何处抛错，都经同一 finally 释放；获准与 work 开始之间不设无检查窗口。 */
    isolation(kind, work) {
        const lifecycle = (async () => {
            let acquired = false;
            try {
                this.check();
                if (!this.isolationWaiters.length && this.isolationCanGrant(kind)) {
                    if (kind === "read")
                        this.isolationReaders += 1;
                    else
                        this.isolationWriter = true;
                    acquired = true;
                }
                else {
                    const granted = new Promise((resolve, reject) => this.isolationWaiters.push({ kind, grant: resolve, reject }));
                    await granted;
                    acquired = true; // 名额由 pump 在 grant 时记账；此后任何抛错（含紧随的 check）都必须释放
                }
                this.check(); // 排队获准瞬间上下文已变化/批关闭 ⇒ 不运行 work，走 finally 释放，活计数归零
                return await work();
            }
            finally {
                if (acquired)
                    this.isolationRelease(kind);
            }
        })();
        this.isolationPending.add(lifecycle);
        void lifecycle.catch(() => { }).finally(() => this.isolationPending.delete(lifecycle));
        return lifecycle;
    }
    async verify(body) {
        this.check();
        if (body) {
            const file = String(body.planFile || body.options?.planFile || "").replaceAll("\\", "/");
            const revision = this.revisions.get(file);
            if (!revision || body.planRevision !== revision)
                throw Error("PLAN 版本与本批快照不一致，未提交：" + file);
            const text = await fs.readFile(path.join(this.context.root, file), "utf8");
            if ((0, node_crypto_1.createHash)("sha256").update(text).digest("hex") !== revision)
                throw Error("PLAN 已修改，请重新提交本批：" + file);
        }
        const actual = await this.fresh("code-observation", async () => {
            const value = await this.host.localDistributedCodeFingerprint(this.context.root);
            if (typeof value !== "string" || !value)
                throw Error("代码指纹未完成，未复用本批检查。");
            return value;
        });
        if (this.code && actual !== this.code)
            throw Error("代码或同步范围已变化，请重新提交本批；未复用旧校验。");
        this.check();
        return actual;
    }
    async prepareCode(body) {
        await this.once("code-sync", async () => {
            this.code = await this.verify();
            this.report("同版本代码正在统一同步到全部已启用 Worker…");
            await this.host.ensureCodeReadyForRun(this.context, [], this.report);
            if (this.host.lastCodeSyncState?.fingerprint !== this.code || !this.host.enabledWorkerConfigs().every((worker) => this.host.lastCodeSyncState?.workerVersions?.[worker.id]?.fingerprint === this.code))
                throw Error("本批代码同步未在全部 Worker 完成，未开始批量校验。");
            await this.verify();
        });
        await this.verify(body);
        return this.code;
    }
    async close() {
        this.closed = true;
        // 先拒绝全部未获准的隔离读写等待（绝不悬挂、醒后也绝不运行 work），再等待完整在途调用
        //（等 grant→work→finally 释放的生命周期 Promise）自然结算；shared/active/lanes 原结算语义保留，
        // 无取消重放写入——失败/取消只会关闭批次，不放行任何后续段。
        for (const waiter of this.isolationWaiters.splice(0))
            waiter.reject(Error("本批提交已结束，不能复用准备结果。"));
        await Promise.allSettled([...new Set([...this.shared.values(), ...this.active.values(), ...this.lanes.values(), ...this.isolationPending])]);
        this.shared.clear();
        this.active.clear();
        this.lanes.clear();
        this.workerAssignments.clear();
    }
}
exports.PlanSubmissionBatch = PlanSubmissionBatch;
