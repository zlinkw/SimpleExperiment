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
    constructor(host, context, plans, current, report = () => { }) {
        this.host = host;
        this.context = context;
        this.current = current;
        this.report = report;
        this.revisions = new Map(plans.map(plan => [String(plan.planFile || plan.file).replaceAll("\\", "/"), String(plan.revision || "")]));
    }
    bind(message) { this.check(); bindings.set(message, this); }
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
        await Promise.allSettled([...new Set([...this.shared.values(), ...this.active.values(), ...this.lanes.values()])]);
        this.shared.clear();
        this.active.clear();
        this.lanes.clear();
    }
}
exports.PlanSubmissionBatch = PlanSubmissionBatch;
