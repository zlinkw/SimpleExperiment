"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncScopeAgentIndexReader = void 0;
exports.scopeIndexUnsupported = scopeIndexUnsupported;
const node_crypto_1 = require("node:crypto");
const promises_1 = require("node:timers/promises");
function scopeIndexUnsupported(error) {
    return /HTTP 404|SCOPE_INDEX_UNSUPPORTED/.test(error instanceof Error ? error.message : String(error));
}
/** Private to one sync-scope page. A complete, requested generation is the only publishable snapshot. */
class SyncScopeAgentIndexReader {
    rpc;
    viewId;
    snapshot;
    request;
    disposed = false;
    constructor(rpc, viewId = (0, node_crypto_1.randomUUID)().replaceAll("-", "")) {
        this.rpc = rpc;
        this.viewId = viewId;
    }
    read(round, signal, report = (_stage) => { }) {
        if (this.disposed)
            return Promise.reject(new Error("SCOPE_INDEX_VIEW_CLOSED"));
        if (this.request?.round === round)
            return this.request.promise;
        const request = { round, id: (0, node_crypto_1.randomUUID)().replaceAll("-", ""), promise: undefined };
        this.request = request;
        const cancel = () => { void this.rpc({ feature: "project-sync-scope", viewId: this.viewId, requestId: request.id, op: "release" }, {}).catch(() => { }); };
        signal?.addEventListener("abort", cancel, { once: true });
        if (signal?.aborted)
            cancel();
        request.promise = this.load(request, signal, report).finally(() => signal?.removeEventListener("abort", cancel));
        return request.promise;
    }
    async load(request, signal, report = (_stage) => { }) {
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
                entries.set(name, row);
            }
            if (entries.size > 60000)
                throw new Error("SCOPE_INDEX_ENTRY_LIMIT");
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
        const value = { instanceId, generation, entries, observedAt: String(response.observedAt || "") };
        this.snapshot = value;
        return value;
    }
    async inventory(round, signal, report) {
        const snapshot = await this.read(round, signal, report);
        return { files: Object.fromEntries([...snapshot.entries].filter(([, row]) => !row.d).map(([name, row]) => [name, { size: row.s, modifiedAtMs: row.m }])), unverifiedFiles: {} };
    }
    async list(relative, round, signal) {
        const snapshot = await this.read(round, signal);
        const parent = snapshot.entries.get(relative);
        if (!parent)
            return { ok: true, exists: false, entries: [], observedAt: snapshot.observedAt };
        if (!parent.d)
            throw new Error("SCOPE_INDEX_TARGET_NOT_DIRECTORY");
        const prefix = relative === "." ? "" : relative + "/";
        return { ok: true, exists: true, observedAt: snapshot.observedAt,
            entries: [...snapshot.entries.values()].filter(row => row.p !== "." && row.p.startsWith(prefix) && !row.p.slice(prefix.length).includes("/"))
                .map(row => ({ name: row.p.slice(prefix.length), path: row.p, directory: row.d, size: row.s, modifiedAtMs: row.m })) };
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.snapshot = undefined;
        if (this.request)
            void this.rpc({ feature: "project-sync-scope", viewId: this.viewId, requestId: this.request.id, op: "release" }, {}).catch(() => { });
    }
}
exports.SyncScopeAgentIndexReader = SyncScopeAgentIndexReader;
