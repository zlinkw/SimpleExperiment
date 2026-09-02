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
exports.HostOperationLeaseManager = exports.HostOperationLeaseLostError = exports.HostOperationLeaseConflictError = exports.HOST_OPERATION_LEASE_HEARTBEAT_MS = exports.HOST_OPERATION_LEASE_TTL_MS = exports.HOST_OPERATION_LEASE_FILENAME = exports.HOST_OPERATION_LEASE_DIRECTORY = exports.HOST_OPERATION_LEASE_SCHEMA_VERSION = void 0;
exports.defaultHostOperationLeasePath = defaultHostOperationLeasePath;
exports.parseHostOperationLeaseRecord = parseHostOperationLeaseRecord;
exports.formatHostOperationLeaseConflict = formatHostOperationLeaseConflict;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs/promises"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
exports.HOST_OPERATION_LEASE_SCHEMA_VERSION = 1;
exports.HOST_OPERATION_LEASE_DIRECTORY = "SimpleExperiment";
exports.HOST_OPERATION_LEASE_FILENAME = "host-operation-lease.json";
exports.HOST_OPERATION_LEASE_TTL_MS = 30_000;
exports.HOST_OPERATION_LEASE_HEARTBEAT_MS = 5_000;
const WINDOW_ID_SYMBOL = Symbol.for("simple-local.host-operation-window-id.v1");
const SESSION_MAP_SYMBOL = Symbol.for("simple-local.host-operation-lease-sessions.v1");
class HostOperationLeaseConflictError extends Error {
    current;
    constructor(current) {
        super(formatHostOperationLeaseConflict(current));
        this.name = "HostOperationLeaseConflictError";
        this.current = current;
    }
}
exports.HostOperationLeaseConflictError = HostOperationLeaseConflictError;
class HostOperationLeaseLostError extends Error {
    constructor(message = "宿主操作租约已失效，当前窗口不能继续提交副作用操作。") {
        super(message);
        this.name = "HostOperationLeaseLostError";
    }
}
exports.HostOperationLeaseLostError = HostOperationLeaseLostError;
class HostOperationLeaseManager {
    leasePath;
    ttlMs;
    heartbeatMs;
    windowId;
    processId;
    now;
    constructor(options = {}) {
        this.leasePath = options.leasePath || defaultHostOperationLeasePath();
        this.ttlMs = Math.max(100, Number(options.ttlMs) || exports.HOST_OPERATION_LEASE_TTL_MS);
        this.heartbeatMs = Math.max(0, Number(options.heartbeatMs ?? exports.HOST_OPERATION_LEASE_HEARTBEAT_MS) || 0);
        this.windowId = options.windowId || sharedWindowId();
        this.processId = Number(options.processId ?? process.pid);
        this.now = options.now || Date.now;
    }
    async run(input, operation) {
        const handle = await this.acquire(input);
        try {
            const result = await operation();
            await handle.assertHeld();
            return result;
        }
        finally {
            await handle.release();
        }
    }
    async acquire(input) {
        validateLeaseInput(input);
        await fs.mkdir(path.dirname(this.leasePath), { recursive: true });
        for (let attempt = 0; attempt < 12; attempt += 1) {
            const record = this.createRecord(input);
            try {
                await createExclusiveLeaseFile(this.leasePath, record);
                return this.attachNewSession(record);
            }
            catch (error) {
                if (!hasErrorCode(error, "EEXIST"))
                    throw error;
            }
            const inspection = await this.inspect();
            if (inspection.record?.windowId === this.windowId) {
                const session = sharedSessions().get(sessionKey(this.leasePath));
                if (session?.windowId === this.windowId) {
                    if (session.leaseId === inspection.record.leaseId) {
                        session.refs += 1;
                        return this.createHandle(inspection.record, session);
                    }
                    // 同窗口不同 leaseId：视为重入而非冲突，避免 prepareAgents -> uploadFiles 自死锁
                    if (inspection.expiresAtMs > this.now()) {
                        console.warn("[HostOperationLease] reentrant acquire from same window, reusing", inspection.record.leaseId, "-> nested");
                        session.parentLeaseId = inspection.record.leaseId;
                        session.refs += 1;
                        return this.createHandle(inspection.record, session);
                    }
                    // 已过期则走下面的过期回收逻辑，不抛冲突
                }
                else if (inspection.expiresAtMs > this.now()) {
                    // 同窗口但无本地 session 缓存：仍视为重入，直接复用现有租约而非抛冲突
                    // 该 fallback 不拥有文件心跳，释放时仅清理本地映射，不触碰文件（由原持有者负责过期）
                    console.warn("[HostOperationLease] reentrant acquire from same window without local session, reusing", inspection.record.leaseId);
                    const fallbackSession = {
                        leasePath: this.leasePath,
                        leaseId: inspection.record.leaseId,
                        windowId: inspection.record.windowId,
                        refs: 1,
                        renew: async () => { },
                        expire: async () => {
                            const k = sessionKey(this.leasePath);
                            if (sharedSessions().get(k) === fallbackSession)
                                sharedSessions().delete(k);
                        },
                    };
                    sharedSessions().set(sessionKey(this.leasePath), fallbackSession);
                    return this.createHandle(inspection.record, fallbackSession);
                }
            }
            if (inspection.expiresAtMs > this.now())
                throw new HostOperationLeaseConflictError(inspection.record || malformedLeaseRecord(this.leasePath, inspection.expiresAtMs));
            const movedPath = `${this.leasePath}.expired-${crypto.randomUUID()}`;
            try {
                await fs.rename(this.leasePath, movedPath);
            }
            catch (error) {
                if (hasErrorCode(error, "ENOENT") || hasErrorCode(error, "EACCES") || hasErrorCode(error, "EPERM") || hasErrorCode(error, "EBUSY")) {
                    await shortDelay();
                    continue;
                }
                throw error;
            }
            try {
                await createExclusiveLeaseFile(this.leasePath, record);
                return this.attachNewSession(record);
            }
            catch (error) {
                if (!hasErrorCode(error, "EEXIST"))
                    throw error;
            }
            finally {
                await fs.unlink(movedPath).catch(() => undefined);
            }
            await shortDelay();
        }
        const current = await this.inspect();
        throw new HostOperationLeaseConflictError(current.record || malformedLeaseRecord(this.leasePath, current.expiresAtMs));
    }
    async inspect() {
        try {
            const text = await fs.readFile(this.leasePath, "utf8");
            const record = parseHostOperationLeaseRecord(text);
            if (record) {
                return {
                    record,
                    expiresAtMs: parseTimestamp(record.expiresAt),
                    malformed: false,
                };
            }
            const stat = await fs.stat(this.leasePath);
            return { expiresAtMs: stat.mtimeMs + this.ttlMs, malformed: true };
        }
        catch (error) {
            if (hasErrorCode(error, "ENOENT"))
                return { expiresAtMs: 0, malformed: false };
            throw error;
        }
    }
    createRecord(input) {
        const now = this.now();
        const timestamp = new Date(now).toISOString();
        return {
            schemaVersion: exports.HOST_OPERATION_LEASE_SCHEMA_VERSION,
            leaseId: crypto.randomUUID(),
            pluginId: input.pluginId.trim(),
            windowId: this.windowId,
            processId: this.processId,
            workspaceUri: input.workspaceUri.trim(),
            hostProjectPath: path.win32.normalize(input.hostProjectPath.trim()),
            actionType: input.actionType.trim(),
            actionLabel: String(input.actionLabel || input.actionType).trim(),
            createdAt: timestamp,
            heartbeatAt: timestamp,
            expiresAt: new Date(now + this.ttlMs).toISOString(),
        };
    }
    attachNewSession(record) {
        const key = sessionKey(this.leasePath);
        const session = {
            leasePath: this.leasePath,
            leaseId: record.leaseId,
            windowId: record.windowId,
            refs: 1,
            renew: () => this.updateOwnedLease(record.leaseId, false),
            expire: () => this.updateOwnedLease(record.leaseId, true),
        };
        if (this.heartbeatMs > 0) {
            session.heartbeatTimer = setInterval(() => {
                void session.renew().catch((error) => {
                    if (error instanceof HostOperationLeaseLostError)
                        session.lostError = error;
                });
            }, this.heartbeatMs);
            session.heartbeatTimer.unref?.();
        }
        sharedSessions().set(key, session);
        return this.createHandle(record, session);
    }
    createHandle(record, session) {
        let released = false;
        return {
            record,
            assertHeld: async () => {
                if (session.lostError)
                    throw session.lostError;
                const inspection = await this.inspect();
                if (inspection.record?.leaseId !== session.leaseId || inspection.record.windowId !== session.windowId)
                    throw new HostOperationLeaseLostError();
            },
            release: async () => {
                if (released)
                    return;
                released = true;
                session.refs = Math.max(0, session.refs - 1);
                if (session.refs > 0)
                    return;
                if (session.heartbeatTimer)
                    clearInterval(session.heartbeatTimer);
                const key = sessionKey(session.leasePath);
                if (sharedSessions().get(key) === session)
                    sharedSessions().delete(key);
                await session.expire().catch((error) => {
                    if (!(error instanceof HostOperationLeaseLostError))
                        throw error;
                });
            },
        };
    }
    async updateOwnedLease(leaseId, release) {
        let handle;
        try {
            handle = await fs.open(this.leasePath, "r+");
            const currentText = await handle.readFile("utf8");
            const current = parseHostOperationLeaseRecord(currentText);
            if (!current || current.leaseId !== leaseId || current.windowId !== this.windowId)
                throw new HostOperationLeaseLostError();
            const now = this.now();
            const heartbeatAt = new Date(now).toISOString();
            const expiresAt = new Date(release ? now : now + this.ttlMs).toISOString();
            // Patch fixed-width timestamp fields in place. Truncating first lets another
            // window observe an empty or partial JSON lease during heartbeat renewal.
            await writeLeaseTimestamp(handle, currentText, "heartbeatAt", heartbeatAt);
            await writeLeaseTimestamp(handle, currentText, "expiresAt", expiresAt);
            await handle.sync();
        }
        catch (error) {
            if (hasErrorCode(error, "ENOENT"))
                throw new HostOperationLeaseLostError();
            throw error;
        }
        finally {
            await handle?.close().catch(() => undefined);
        }
    }
}
exports.HostOperationLeaseManager = HostOperationLeaseManager;
async function writeLeaseTimestamp(handle, text, field, value) {
    const match = new RegExp(`"${field}"\\s*:\\s*"([^"]+)"`).exec(text);
    const valueOffset = match ? match.index + match[0].indexOf(match[1]) : -1;
    const offset = valueOffset < 0 ? -1 : Buffer.byteLength(text.slice(0, valueOffset), "utf8");
    if (offset < 0 || match?.[1].length !== value.length)
        throw new HostOperationLeaseLostError("宿主操作租约格式已变化，当前窗口不能继续提交副作用操作。");
    const bytes = Buffer.from(value, "utf8");
    await handle.write(bytes, 0, bytes.length, offset);
}
function defaultHostOperationLeasePath(localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local")) {
    return path.join(localAppData, exports.HOST_OPERATION_LEASE_DIRECTORY, exports.HOST_OPERATION_LEASE_FILENAME);
}
function parseHostOperationLeaseRecord(text) {
    try {
        const value = JSON.parse(text);
        if (value.schemaVersion !== exports.HOST_OPERATION_LEASE_SCHEMA_VERSION)
            return undefined;
        const requiredStrings = [
            "leaseId", "pluginId", "windowId", "workspaceUri", "hostProjectPath", "actionType", "actionLabel", "createdAt", "heartbeatAt", "expiresAt",
        ];
        if (!Number.isInteger(value.processId) || requiredStrings.some((key) => !String(value[key] || "").trim()))
            return undefined;
        if (!Number.isFinite(parseTimestamp(String(value.expiresAt))))
            return undefined;
        return value;
    }
    catch {
        return undefined;
    }
}
function formatHostOperationLeaseConflict(current) {
    return [
        "宿主副作用操作已被另一 VS Code 窗口阻止。",
        `持有插件：${current.pluginId}`,
        `持有窗口：${current.windowId}（PID ${current.processId}）`,
        `工作区：${current.workspaceUri}`,
        `宿主项目：${current.hostProjectPath}`,
        `当前动作：${current.actionLabel || current.actionType}`,
        `最近心跳：${current.heartbeatAt}`,
        `自动恢复：等待当前操作完成；若窗口已崩溃，请在 ${current.expiresAt} 后重试。不得删除活动租约文件。`,
    ].join("\n");
}
async function createExclusiveLeaseFile(leasePath, record) {
    const handle = await fs.open(leasePath, "wx");
    try {
        await handle.writeFile(`${JSON.stringify(record, null, 2)}\n`, "utf8");
        await handle.sync();
    }
    finally {
        await handle.close();
    }
}
function sharedWindowId() {
    const globals = globalThis;
    if (!globals[WINDOW_ID_SYMBOL])
        globals[WINDOW_ID_SYMBOL] = `${os.hostname()}:${process.pid}:${crypto.randomUUID()}`;
    return String(globals[WINDOW_ID_SYMBOL]);
}
function sharedSessions() {
    const globals = globalThis;
    if (!(globals[SESSION_MAP_SYMBOL] instanceof Map))
        globals[SESSION_MAP_SYMBOL] = new Map();
    return globals[SESSION_MAP_SYMBOL];
}
function sessionKey(leasePath) {
    return path.resolve(leasePath).toLowerCase();
}
function validateLeaseInput(input) {
    const required = ["pluginId", "workspaceUri", "hostProjectPath", "actionType"];
    for (const key of required) {
        if (!String(input[key] || "").trim())
            throw new Error(`宿主操作租约缺少 ${key}。`);
    }
}
function malformedLeaseRecord(leasePath, expiresAtMs) {
    const timestamp = new Date(Number.isFinite(expiresAtMs) ? expiresAtMs : Date.now() + exports.HOST_OPERATION_LEASE_TTL_MS).toISOString();
    return {
        schemaVersion: exports.HOST_OPERATION_LEASE_SCHEMA_VERSION,
        leaseId: "malformed",
        pluginId: "unknown",
        windowId: "unknown",
        processId: 0,
        workspaceUri: "unknown",
        hostProjectPath: leasePath,
        actionType: "malformed-lease",
        actionLabel: "无法解析的宿主操作租约",
        createdAt: timestamp,
        heartbeatAt: timestamp,
        expiresAt: timestamp,
    };
}
function parseTimestamp(value) {
    return Date.parse(value);
}
function hasErrorCode(error, code) {
    return Boolean(error && typeof error === "object" && "code" in error && error.code === code);
}
function shortDelay() {
    return new Promise((resolve) => setTimeout(resolve, 10));
}
