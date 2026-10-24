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
exports.UpdateGate = exports.UPDATE_ACTION = void 0;
exports.parseProcessStartMs = parseProcessStartMs;
exports.parseStartTimesOutput = parseStartTimesOutput;
exports.startTimesCommand = startTimesCommand;
const fs = __importStar(require("node:fs/promises"));
const node_child_process_1 = require("node:child_process");
const node_os_1 = require("node:os");
const node_crypto_1 = require("node:crypto");
const node_util_1 = require("node:util");
const HostOperationLease_1 = require("../core/HostOperationLease");
const ResourceOperationLease_1 = require("../core/ResourceOperationLease");
const execFileAsync = (0, node_util_1.promisify)(node_child_process_1.execFile);
exports.UPDATE_ACTION = "paired-plugin-update";
// Reuse proof requires a trusted, non-future start time later than every known bound by more than this margin.
const REUSE_PROOF_MARGIN_MS = 5_000;
// One bounded batch per wait() run; the probe never extends the 300s budget (R55: timeout = min(cap, remaining)).
const PROBE_TIMEOUT_CAP_MS = 8_000;
const WAIT_BUDGET_MS = 300_000;
const START_TIMES_MAX_BUFFER = 1 << 20;
const START_TIMES_MAX_PIDS = 256;
const MAX_VALID_PID = 2 ** 31 - 1;
function validPid(value) {
    return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= MAX_VALID_PID ? value : undefined;
}
function windowIdPid(windowId) {
    if (typeof windowId !== "string")
        return undefined;
    const segment = windowId.split(":")[1] ?? "";
    if (!/^[0-9]+$/.test(segment))
        return undefined;
    return validPid(Number(segment));
}
/** Only a trusted in-range non-future epoch ms counts (R51/R54). Understands explicit epoch numbers/strings,
 * legacy PowerShell "/Date(ms)/" JSON, and explicit ISO; anything else (including Date.parse of /Date/) is untrusted. */
function parseProcessStartMs(value, nowMs) {
    let ms;
    if (typeof value === "number" && Number.isFinite(value))
        ms = value;
    else if (typeof value === "string") {
        const trimmed = value.trim();
        const dated = /^\/Date\((-?[0-9]+)\)\/$/.exec(trimmed); // host-verified shape "/Date(ms)/" — closing ")" then "/" (r19 fix approved in r16)
        if (/^-?[0-9]+$/.test(trimmed))
            ms = Number(trimmed);
        else if (dated)
            ms = Number(dated[1]);
        else {
            const parsed = Date.parse(trimmed);
            if (Number.isFinite(parsed))
                ms = parsed;
        }
    }
    if (ms === undefined || !Number.isSafeInteger(ms) || ms <= 0 || ms > nowMs)
        return undefined; // non-safe-integer/out-of-range/future never trusted
    return ms;
}
/** Parses the default provider's JSON: [{Id,StartMs}] with StartMs as explicit Unix milliseconds (R51). */
function parseStartTimesOutput(stdout, nowMs) {
    const out = new Map();
    const parsed = JSON.parse(String(stdout).trim() || "[]");
    for (const row of Array.isArray(parsed) ? parsed : [parsed]) {
        const pid = Number.isInteger(row?.Id) ? validPid(row.Id) : validPid(Number(row?.Id));
        const start = parseProcessStartMs(row?.StartMs ?? row?.StartTime, nowMs);
        if (pid !== undefined && start !== undefined)
            out.set(pid, start);
    }
    return out;
}
function startTimesCommand(pids) {
    // Explicit epoch ms: plain StartTime would serialize as /Date(ms)/ which Date.parse cannot read (R51 host proof).
    return `Get-Process -Id ${pids.join(",")} -ErrorAction SilentlyContinue | ` +
        "Select-Object Id,@{n='StartMs';e={([DateTimeOffset]$_.StartTime).ToUnixTimeMilliseconds()}} | ConvertTo-Json -Compress";
}
/** Default Windows provider: exactly ONE bounded async batch per wait() run (never per file, never host snapshots).
 * pids re-validated + sorted + deduplicated; timeout bounded by caller; failure/timeout/abort ⇒ unknown, never an exit proof. */
async function defaultStartTimes(pids, signal, timeoutMs) {
    const batch = [...new Set(pids.filter(pid => Number.isInteger(pid) && pid > 0))].sort((a, b) => a - b).slice(0, START_TIMES_MAX_PIDS);
    const result = new Map(batch.map((pid) => [pid, "unknown"]));
    if (!batch.length || timeoutMs <= 0)
        return result;
    if (process.platform !== "win32")
        return result; // No trustworthy native time source here: stay unknown/wait.
    try {
        const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", startTimesCommand(batch)], { timeout: timeoutMs, maxBuffer: START_TIMES_MAX_BUFFER, signal, windowsHide: true });
        for (const [pid, start] of parseStartTimesOutput(stdout, Date.now()))
            result.set(pid, start);
    }
    catch { /* failure, timeout, abort or oversized output keeps every pid unknown */ }
    return result;
}
/** Upper bound the old owner could not have started after; undefined (no proof possible) if ANY referenced
 * time is missing/invalid (R54: never fabricate a bound with ||0). admissionExpiresAt absent means 0. */
function proofBoundMs(record, mtimeMs) {
    let bound = mtimeMs;
    { // R61 (plan r16/r17): admission must be a non-negative safe-integer epoch (0 legal); negative/string/missing ⇒ no exit proof.
        const admission = record.admissionExpiresAt;
        if (!Number.isSafeInteger(admission) || admission < 0)
            return undefined;
        bound = Math.max(bound, admission);
    }
    for (const lease of record.leases)
        for (const key of ["createdAt", "heartbeatAt", "expiresAt"]) {
            const value = Date.parse(String(lease?.[key] ?? ""));
            if (!Number.isFinite(value))
                return undefined;
            bound = Math.max(bound, value);
        }
    return bound;
}
class UpdateGate {
    leasePath;
    ownerAlive;
    deps;
    held;
    constructor(leasePath = (0, HostOperationLease_1.defaultHostOperationLeasePath)(), ownerAlive = pid => {
        try {
            process.kill(pid, 0);
            return true;
        }
        catch (error) {
            return error.code !== "ESRCH";
        }
    }, deps = {}) {
        this.leasePath = leasePath;
        this.ownerAlive = ownerAlive;
        this.deps = deps;
    }
    async begin(storagePath) {
        if (this.held) {
            await this.held.assertHeld();
            return;
        }
        const manager = new HostOperationLease_1.LegacyHostOperationLeaseManager({ leasePath: this.leasePath, windowId: `${(0, node_os_1.hostname)()}:${process.pid}:${exports.UPDATE_ACTION}:${(0, node_crypto_1.randomUUID)()}` });
        this.held = await manager.acquire({ pluginId: "simple-local.simple-experiment", workspaceUri: "untitled://paired-plugin-update", hostProjectPath: storagePath,
            actionType: exports.UPDATE_ACTION, actionLabel: "Windows 配套更新" });
    }
    async end() { const lease = this.held; this.held = undefined; await lease?.release(); }
    async wait(signal) {
        const directory = this.leasePath + ".resources-v2", started = Date.now();
        let proofRun; // at most one batch probe per wait() run
        const remaining = () => WAIT_BUDGET_MS - (Date.now() - started);
        const checkBudget = () => { if (remaining() <= 0)
            throw new Error("本地操作尚未结束；停止更新等待，现有传输继续运行。请稍后重试。"); };
        for (;;) {
            signal?.throwIfAborted();
            checkBudget();
            await this.held?.assertHeld(); // R62 (plan r16): every round re-proves the v1 batch lease
            const names = await fs.readdir(directory).catch(error => error.code === "ENOENT" ? [] : Promise.reject(error));
            signal?.throwIfAborted();
            checkBudget();
            await this.held?.assertHeld();
            // R53: deduplicated union of main slots AND legal ownership sidecars; orphan sidecars are never ignored.
            const slots = [...new Set(names.filter(name => /^[0-9a-f]{64}\.json(|\.ownership)$/.test(name)).map(name => name.replace(/\.ownership$/, "")))].sort();
            let active = false;
            const proofs = [];
            for (const slot of slots) {
                const entry = await (0, ResourceOperationLease_1.readResourceLeaseRegistryWithOwnership)(directory + "/" + slot); // secure reader + ownership recovery; corrupt ⇒ throw 无法核实
                signal?.throwIfAborted();
                if (!entry)
                    continue; // Atomically consumed empty slot (main and sidecar both gone).
                const { record, mtimeMs } = entry;
                if (record.schemaVersion !== 2 || !Array.isArray(record.leases))
                    throw new Error("本地传输租约损坏，已阻止安装。");
                // R54: an explicit key (including null/string/negative/zero/huge) is explicit — only a truly absent key is legacy.
                const hasExplicit = Object.prototype.hasOwnProperty.call(record, "processId");
                let rootPid;
                if (hasExplicit) {
                    rootPid = validPid(record.processId);
                    if (rootPid === undefined)
                        throw new Error("本地传输租约字段无效（进程号非法），已阻止安装。");
                }
                else
                    rootPid = windowIdPid(record.windowId); // legacy writers (1b8acce2..ac3b9836): strict PID segment only
                // R54: inner identity must be fully trustworthy — missing/invalid/contradictory ⇒ reject, never best-effort.
                for (const lease of record.leases) {
                    if (!lease || typeof lease !== "object" || Array.isArray(lease))
                        throw new Error("本地传输租约记录损坏，已阻止安装。");
                    const leasePid = validPid(lease.processId);
                    if (leasePid === undefined)
                        throw new Error("本地传输租约字段无效（内层进程号缺失或非法），已阻止安装。");
                    // R59 (plan r16): the inner PID itself must equal the root PID (explicit or recovered), not just be valid.
                    if (rootPid !== undefined && leasePid !== rootPid)
                        throw new Error("本地传输租约身份字段矛盾，已阻止安装。");
                    if (typeof lease.windowId !== "string" || lease.windowId !== record.windowId)
                        throw new Error("本地传输租约身份字段矛盾，已阻止安装。");
                    const leaseWindowPid = windowIdPid(lease.windowId);
                    if (leaseWindowPid !== undefined && rootPid !== undefined && leaseWindowPid !== rootPid)
                        throw new Error("本地传输租约身份字段矛盾，已阻止安装。");
                }
                const heldFlags = Boolean(record.leases.length || record.choosing || record.ticket);
                // R52/R61 (plan r17 exact expression): a released explicit-idle registry never blocks ONLY under the strict
                // value/type check — null/odd-typed choosing/ticket/admission never take the idle fast path.
                const normalReleasedIdle = hasExplicit && record.leases.length === 0 && record.choosing === false &&
                    Number.isSafeInteger(record.ticket) && record.ticket === 0 &&
                    typeof record.admissionExpiresAt === "number" && record.admissionExpiresAt === 0 &&
                    typeof record.windowId === "string" && record.windowId.length > 0;
                if (normalReleasedIdle)
                    continue;
                if (rootPid === undefined) {
                    active = true;
                    continue;
                } // Owner not derivable: conservative wait, even when idle.
                if (!this.ownerAlive(rootPid))
                    continue; // Only ESRCH proves disappearance (permission failures keep waiting).
                // R52: unified StartTime exit proof for EVERY trustworthy root with a live/unknown owner — explicit modern
                // roots hit PID reuse on the host too (6397137…: PID 35152 reused by Edge identity_helper). Legacy idle
                // without a proven release still waits unless the proof says otherwise (r14 conservative rule).
                proofs.push({ pid: rootPid, boundMs: proofBoundMs(record, mtimeMs) });
            }
            if (proofs.length) {
                const unresolved = [];
                for (const candidate of proofs) {
                    const sync = this.deps.processStartedAt ? this.deps.processStartedAt(candidate.pid) : undefined;
                    const trusted = parseProcessStartMs(sync ?? undefined, Date.now()); // future/invalid sync values are untrusted
                    if (trusted !== undefined) {
                        if (!(candidate.boundMs !== undefined && trusted > candidate.boundMs + REUSE_PROOF_MARGIN_MS))
                            active = true;
                    }
                    else
                        unresolved.push(candidate);
                }
                if (unresolved.length) {
                    proofRun ??= this.collectStartTimes([...new Set(unresolved.map(row => row.pid))].sort((a, b) => a - b), signal, Math.min(PROBE_TIMEOUT_CAP_MS, remaining()));
                    const proof = await proofRun;
                    signal?.throwIfAborted();
                    checkBudget();
                    await this.held?.assertHeld(); // R55/R62: probe completion cannot bypass cancel, budget, or the holding proof
                    for (const { pid, boundMs } of unresolved) {
                        const start = parseProcessStartMs(proof.get(pid) ?? undefined, Date.now());
                        if (boundMs === undefined) {
                            active = true;
                            continue;
                        } // Incomplete bound: no exit proof from partial times.
                        if (start !== undefined && start > boundMs + REUSE_PROOF_MARGIN_MS)
                            continue; // Provably a different process.
                        active = true; // Unknown/untrusted time, probe failure, or plausible original owner keeps waiting.
                    }
                }
            }
            signal?.throwIfAborted();
            checkBudget();
            await this.held?.assertHeld(); // R55/R62: re-check cancel, budget, and holding proof immediately before returning
            if (!active)
                return;
            this.deps.onPoll?.({ probing: proofs.length });
            await new Promise((resolve, reject) => {
                const abort = () => { clearTimeout(timer); signal?.removeEventListener("abort", abort); reject(signal?.reason); };
                const timer = setTimeout(() => { signal?.removeEventListener("abort", abort); resolve(); }, 250);
                signal?.addEventListener("abort", abort, { once: true });
            });
        }
    }
    async collectStartTimes(pids, signal, timeoutMs) {
        try {
            return await (this.deps.processStartTimes ? this.deps.processStartTimes(pids, signal, timeoutMs) : defaultStartTimes(pids, signal, timeoutMs));
        }
        catch {
            return new Map(pids.map(pid => [pid, "unknown"]));
        } // A failed batch is never an exit proof; abort re-checked by caller.
    }
}
exports.UpdateGate = UpdateGate;
