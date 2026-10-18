"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncScopeAgentIndexReader = void 0;
exports.scopeIndexUnsupported = scopeIndexUnsupported;
const node_crypto_1 = require("node:crypto");
const promises_1 = require("node:timers/promises");
function scopeIndexUnsupported(error) {
    return /HTTP 404|SCOPE_INDEX_UNSUPPORTED/.test(error instanceof Error ? error.message : String(error));
}
/** One page or operation owns its requested generation. A saved cursor needs a live refresh before use. */
class SyncScopeAgentIndexReader {
    rpc;
    viewId;
    index;
    snapshot;
    request;
    directorySnapshot;
    directories = new Map();
    disposed = false;
    constructor(rpc, viewId = (0, node_crypto_1.randomUUID)().replaceAll("-", ""), index) {
        this.rpc = rpc;
        this.viewId = viewId;
        this.index = index;
    }
    read(round, signal, report) {
        if (this.disposed)
            return Promise.reject(new Error("SCOPE_INDEX_VIEW_CLOSED"));
        if (this.request?.round === round) {
            if (report)
                this.request.reports.add(report);
            if (this.request.stage)
                report?.(this.request.stage);
            return this.request.promise;
        }
        const request = { round, id: (0, node_crypto_1.randomUUID)().replaceAll("-", ""), promise: undefined, reports: new Set(report ? [report] : []), stage: "" };
        this.request = request;
        const cancel = () => { void this.rpc({ feature: "project-sync-scope", viewId: this.viewId, requestId: request.id, op: "release" }, {}).catch(() => { }); };
        signal?.addEventListener("abort", cancel, { once: true });
        if (signal?.aborted)
            cancel();
        request.promise = this.load(request, signal, stage => {
            request.stage = stage;
            for (const listener of request.reports)
                listener(stage);
        }).finally(() => { signal?.removeEventListener("abort", cancel); request.reports.clear(); });
        return request.promise;
    }
    async load(request, signal, report = (_stage) => { }) {
        if (this.index) {
            const saved = await this.index?.readBaseline();
            signal?.throwIfAborted();
            if (this.disposed || this.request !== request)
                throw new Error("SCOPE_INDEX_REQUEST_SUPERSEDED");
            // Another page or operation may have advanced this shared cursor. Prefer its newer baseline
            // as a transport hint; the next live refresh still has to acknowledge it before any facts are used.
            if (saved && typeof saved.instanceId === "string" && Number.isSafeInteger(saved.generation) && saved.generation > 0
                && Array.isArray(saved.entries) && saved.entries.length <= 60000
                && (!this.snapshot || saved.instanceId === this.snapshot.instanceId && saved.generation > this.snapshot.generation))
                this.snapshot = { ...saved, entries: new Map(saved.entries) };
        }
        const previous = this.snapshot;
        const identity = { feature: "project-sync-scope", viewId: this.viewId, requestId: request.id };
        const current = () => {
            signal?.throwIfAborted();
            if (this.disposed || this.request !== request)
                throw new Error("SCOPE_INDEX_REQUEST_SUPERSEDED");
        };
        current();
        let response = await this.rpc({ ...identity, op: "refresh", afterGeneration: previous?.generation, instanceId: previous?.instanceId }, { signal });
        current();
        let instanceId = String(response.instanceId || "");
        while (["queued", "scanning"].includes(response.status)) {
            if (!instanceId || response.requestId !== request.id)
                throw new Error("SCOPE_INDEX_RESPONSE_IDENTITY_INVALID");
            report(`Agent 目录索引：${response.status === "queued" ? "等待更新" : "更新中"} · ${Number(response.processedEntries || 0)} 项`);
            await (0, promises_1.setTimeout)(250, undefined, { signal });
            current();
            response = await this.rpc({ ...identity, op: "read" }, { signal });
            current();
            if (response.instanceId !== instanceId)
                throw new Error("SCOPE_INDEX_INSTANCE_CHANGED");
        }
        if (response.status !== "ready" || response.ok !== true)
            throw new Error(String(response.error || "SCOPE_INDEX_QUERY_UNKNOWN"));
        if (!instanceId || response.instanceId !== instanceId || response.requestId !== request.id || !Number.isSafeInteger(response.generation) || response.generation < 1)
            throw new Error("SCOPE_INDEX_RESPONSE_IDENTITY_INVALID");
        const generation = response.generation, reset = response.reset;
        if (previous?.instanceId === instanceId && generation <= previous.generation)
            throw new Error("SCOPE_INDEX_GENERATION_NOT_ADVANCED");
        if (typeof reset !== "boolean" || !reset && (!previous || previous.instanceId !== instanceId))
            throw new Error("SCOPE_INDEX_BASE_MISMATCH");
        const entries = reset ? new Map() : new Map(previous.entries);
        let offset = 0;
        while (true) {
            current();
            if (response.status !== "ready" || response.ok !== true || response.instanceId !== instanceId || response.requestId !== request.id
                || response.generation !== generation || response.reset !== reset || !Array.isArray(response.entries) || response.entries.length > 512)
                throw new Error("SCOPE_INDEX_PAGE_IDENTITY_INVALID");
            for (const row of response.entries) {
                const name = row?.p;
                if (typeof name !== "string" || name.length > 4096 || name.includes(String.fromCharCode(92)) || name.includes(String.fromCharCode(0)) || name !== "." && (name.startsWith("/") || /^[A-Za-z]:/.test(name) || name.split("/").some(part => !part || part === "." || part === "..")))
                    throw new Error("SCOPE_INDEX_PATH_INVALID");
                if (row.x === true) {
                    entries.delete(name);
                    continue;
                }
                if (typeof row.d !== "boolean" || !Number.isFinite(row.m) || !row.d && (!Number.isSafeInteger(row.s) || row.s < 0))
                    throw new Error("SCOPE_INDEX_ENTRY_INVALID");
                if (row.c !== undefined && !Number.isFinite(row.c) || [row.v, row.i].some(value => value !== undefined && (typeof value !== "string" || !/^[0-9]{1,64}$/.test(value))))
                    throw new Error("SCOPE_INDEX_ENTRY_IDENTITY_INVALID");
                entries.set(name, row);
            }
            if (entries.size > 60000)
                throw new Error("SCOPE_INDEX_ENTRY_LIMIT");
            report(`正在接收目录索引 · 已处理 ${offset + response.entries.length} 项`);
            if (response.nextCursor === null)
                break;
            if (!Number.isSafeInteger(response.nextCursor) || response.nextCursor !== offset + response.entries.length || response.nextCursor <= offset || response.nextCursor > 120000)
                throw new Error("SCOPE_INDEX_CURSOR_INVALID");
            offset = response.nextCursor;
            response = await this.rpc({ ...identity, op: "read", cursor: offset }, { signal });
        }
        current();
        if (!entries.get(".")?.d)
            throw new Error("SCOPE_INDEX_ROOT_MISSING");
        for (const name of entries.keys())
            if (name !== ".") {
                const parent = name.includes("/") ? name.slice(0, name.lastIndexOf("/")) : ".";
                if (!entries.get(parent)?.d)
                    throw new Error("SCOPE_INDEX_PARENT_MISSING");
            }
        const value = { instanceId, generation, entries, observedAt: String(response.observedAt || ""), acceleration: response.acceleration };
        this.snapshot = value;
        await this.index?.writeBaseline({ ...value, entries: [...entries] });
        current();
        report(`目录索引已接收 · ${entries.size} 项`);
        return value;
    }
    async inventory(round, signal, report, binding = {}) {
        const snapshot = await this.read(round, signal, report);
        const identity = (row) => ({ modifiedAtMs: row.m, changedAtMs: row.c, device: row.v, inode: row.i });
        const load = async () => ({ files: Object.fromEntries([...snapshot.entries].filter(([, row]) => !row.d).map(([name, row]) => [name, { size: row.s, ...identity(row) }])),
            directories: Object.fromEntries([...snapshot.entries].filter(([, row]) => row.d).map(([name, row]) => [name, identity(row)])),
            unverifiedFiles: {}, observedAt: snapshot.observedAt, agentInstanceId: snapshot.instanceId, indexGeneration: snapshot.generation, acceleration: snapshot.acceleration });
        return this.index ? this.index.read({ method: "agent.metadata", metadataOnly: true, recursive: true, backgroundPersistence: true, round: this.viewId + ":" + round, signal,
            binding: { ...binding, agentInstanceId: snapshot.instanceId, indexGeneration: snapshot.generation } }, load) : load();
    }
    async list(relative, round, signal) {
        const snapshot = await this.read(round, signal);
        const parent = snapshot.entries.get(relative);
        if (!parent)
            return { ok: true, exists: false, entries: [], observedAt: snapshot.observedAt };
        if (!parent.d)
            throw new Error("SCOPE_INDEX_TARGET_NOT_DIRECTORY");
        const prefix = relative === "." ? "" : relative + "/";
        if (this.directorySnapshot !== snapshot) {
            this.directories.clear();
            for (const row of snapshot.entries.values())
                if (row.p !== ".") {
                    const parent = row.p.includes("/") ? row.p.slice(0, row.p.lastIndexOf("/")) : ".";
                    const children = this.directories.get(parent) || [];
                    children.push(row);
                    this.directories.set(parent, children);
                }
            this.directorySnapshot = snapshot;
        }
        return { ok: true, exists: true, observedAt: snapshot.observedAt,
            entries: (this.directories.get(relative) || [])
                .map(row => ({ name: row.p.slice(prefix.length), path: row.p, directory: row.d, size: row.s, modifiedAtMs: row.m })) };
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.snapshot = undefined;
        this.directorySnapshot = undefined;
        this.directories.clear();
        if (this.request)
            void this.rpc({ feature: "project-sync-scope", viewId: this.viewId, requestId: this.request.id, op: "release" }, {}).catch(() => { });
    }
}
exports.SyncScopeAgentIndexReader = SyncScopeAgentIndexReader;
