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
exports.IncrementalLocalMetadata = void 0;
exports.incrementalLocalMetadata = incrementalLocalMetadata;
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const StateStore_1 = require("../state/StateStore");
const SyncScopeStatus_1 = require("./SyncScopeStatus");
const signature = (row) => JSON.stringify(row);
const digest = (value) => (0, node_crypto_1.createHash)("sha256").update(JSON.stringify(value)).digest("hex");
const parent = (name) => name.includes("/") ? name.slice(0, name.lastIndexOf("/")) : ".";
const safe = (name) => name === "." || !/[\\:\x00-\x1f]/.test(name) && name.length <= 4096 && name.split("/").every(p => p && p !== "." && p !== "..");
const fact = (s) => ({ directory: s.isDirectory(), size: s.isDirectory() ? 0 : s.size,
    modifiedAtMs: s.mtimeMs, changedAtMs: s.ctimeMs, device: String(s.dev), inode: String(s.ino) });
async function parallel(values, run) {
    let next = 0;
    const results = await Promise.allSettled(Array.from({ length: Math.min(16, values.length) }, async () => {
        while (next < values.length)
            await run(values[next++]);
    }));
    const failure = results.find(r => r.status === "rejected");
    if (failure)
        throw failure.reason;
}
/** Notifications alone cannot prove freshness on Windows/network mounts. Revalidate saved identities,
 * enumerate only changed directories, and batch file stats. No persisted negative is authoritative. */
class IncrementalLocalMetadata {
    root;
    file;
    rows = new Map();
    loaded = false;
    sequence = 0;
    journalBytes = 0;
    queue = Promise.resolve();
    constructor(root, file) {
        this.root = root;
        this.file = file;
    }
    read(signal, report = (_stage) => { }) {
        const result = this.queue.catch(() => { }).then(() => this.scan(signal, report)).catch(error => {
            this.rows.clear();
            this.sequence = 0;
            this.journalBytes = 0;
            throw error;
        });
        this.queue = result;
        return result;
    }
    async scan(signal, report = (_stage) => { }) {
        signal?.throwIfAborted();
        const root = await fs.realpath(this.root), rootStat = await fs.lstat(this.root);
        if (rootStat.isSymbolicLink() || !rootStat.isDirectory() || path.resolve(root).toLowerCase() !== path.resolve(this.root).toLowerCase())
            throw Error("LOCAL_INDEX_ROOT_UNSAFE");
        const identity = { root, device: String(rootStat.dev), inode: String(rootStat.ino), policy: 1 };
        let restored = false;
        if (!this.loaded) {
            this.loaded = true;
            if (this.file)
                try {
                    const stat = await fs.lstat(this.file);
                    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 64 * 1024 * 1024)
                        throw Error("LOCAL_INDEX_CACHE_INVALID");
                    const text = await fs.readFile(this.file, "utf8");
                    if (!text.endsWith("\n"))
                        throw Error("LOCAL_INDEX_JOURNAL_INCOMPLETE");
                    for (const line of text.trimEnd().split("\n")) {
                        const { checksum, ...record } = JSON.parse(line);
                        if (checksum !== digest(record) || record.schema !== 1 || JSON.stringify(record.identity) !== JSON.stringify(identity)
                            || record.sequence !== this.sequence + 1 || !Array.isArray(record.changes))
                            throw Error("LOCAL_INDEX_JOURNAL_INVALID");
                        for (const [name, row] of record.changes) {
                            if (typeof name !== "string" || !safe(name) || row && (typeof row.directory !== "boolean" || !Number.isFinite(row.size)
                                || row.size < 0 || !Number.isFinite(row.modifiedAtMs) || !Number.isFinite(row.changedAtMs)
                                || typeof row.device !== "string" || typeof row.inode !== "string"))
                                throw Error("LOCAL_INDEX_CACHE_INVALID");
                            if (row)
                                this.rows.set(name, row);
                            else
                                this.rows.delete(name);
                        }
                        if (this.rows.size > 60000)
                            throw Error("LOCAL_INDEX_ENTRY_LIMIT");
                        this.sequence = record.sequence;
                    }
                    for (const [name] of this.rows)
                        if (name !== "." && (!this.rows.get(parent(name))?.directory || !(0, SyncScopeStatus_1.scopeInventoryPathAllowed)(name, this.rows.get(name).directory)))
                            throw Error("LOCAL_INDEX_CACHE_PARENT_INVALID");
                    if (!this.rows.get(".")?.directory)
                        throw Error("LOCAL_INDEX_CACHE_ROOT_INVALID");
                    this.journalBytes = stat.size;
                    restored = true;
                }
                catch {
                    this.rows.clear();
                    this.sequence = 0;
                    this.journalBytes = 0;
                }
        }
        const before = this.rows, rows = new Map(before), validated = new Map();
        const childDirectories = new Map();
        for (const [name, row] of before)
            if (name !== "." && row.directory) {
                const list = childDirectories.get(parent(name)) || [];
                list.push(name);
                childDirectories.set(parent(name), list);
            }
        let statCalls = 0, enumeratedDirectories = 0, reusedEntries = 0, listedEntries = 0;
        const full = (name) => name === "." ? root : path.join(root, ...name.split("/"));
        const check = async (name) => {
            signal?.throwIfAborted();
            statCalls++;
            try {
                const s = await fs.lstat(full(name));
                if (s.isSymbolicLink() || String(s.dev) !== identity.device || !s.isDirectory() && !s.isFile())
                    throw Error("LOCAL_INDEX_UNSAFE_ENTRY: " + name);
                return fact(s);
            }
            catch (error) {
                if (name !== "." && error.code === "ENOENT")
                    return undefined;
                throw error;
            }
        };
        const remove = (name) => { for (const key of rows.keys())
            if (key === name || key.startsWith(name + "/"))
                rows.delete(key); };
        const pending = ["."];
        const visited = new Set();
        const checkedFiles = new Set();
        while (pending.length) {
            const names = pending.splice(0, 16);
            await parallel(names, async (name) => {
                if (visited.has(name))
                    return;
                visited.add(name);
                if (visited.size > 10000)
                    throw Error("LOCAL_INDEX_DIRECTORY_LIMIT");
                const current = await check(name), old = before.get(name);
                if (!current) {
                    remove(name);
                    return;
                }
                if (!current.directory) {
                    remove(name);
                    rows.set(name, current);
                    return;
                }
                if (await fs.realpath(full(name)) !== full(name))
                    throw Error("LOCAL_INDEX_DIRECTORY_UNSAFE: " + name);
                validated.set(name, current);
                rows.set(name, current);
                if (!old?.directory || signature(old) !== signature(current)) {
                    enumeratedDirectories++;
                    const found = new Set();
                    const directory = await fs.opendir(full(name), { bufferSize: 128 });
                    try {
                        const children = [];
                        for await (const entry of directory) {
                            if (++listedEntries > 100000)
                                throw Error("LOCAL_INDEX_ENTRY_LIMIT");
                            const child = name === "." ? entry.name : name + "/" + entry.name;
                            if (!safe(child))
                                throw Error("LOCAL_INDEX_PATH_INVALID");
                            if ((0, SyncScopeStatus_1.scopeInventoryPathAllowed)(child, entry.isDirectory()))
                                children.push(child);
                        }
                        await parallel(children, async (child) => {
                            const row = await check(child);
                            if (!row)
                                throw Error("LOCAL_INDEX_DIRECTORY_CHANGED: " + name);
                            found.add(child);
                            if (rows.get(child)?.directory && !row.directory)
                                remove(child);
                            rows.set(child, row);
                            if (row.directory)
                                pending.push(child);
                            else
                                checkedFiles.add(child);
                        });
                    }
                    finally {
                        await directory.close().catch(() => { });
                    }
                    for (const child of rows.keys())
                        if (child !== "." && parent(child) === name && !found.has(child))
                            remove(child);
                }
                else {
                    reusedEntries++;
                    pending.push(...(childDirectories.get(name) || []));
                }
                report(`增量校验 · ${statCalls} 项 · 读取 ${enumeratedDirectories} 个变化目录`);
            });
        }
        // A directory mtime does not detect edits to existing files, nor changes made while the host was closed.
        // Fresh batched stats are mandatory without a durable, continuous filesystem journal.
        await parallel([...before].filter(([name, row]) => !row.directory && rows.has(name) && !checkedFiles.has(name)).map(([name]) => name), async (name) => {
            const row = await check(name);
            if (!row)
                rows.delete(name);
            else if (row.directory)
                throw Error("LOCAL_INDEX_TYPE_CHANGED: " + name);
            else {
                if (signature(row) === signature(before.get(name)))
                    reusedEntries++;
                rows.set(name, row);
            }
            if (statCalls % 128 === 0)
                report(`增量校验 · ${statCalls} 项 · 读取 ${enumeratedDirectories} 个变化目录`);
        });
        await parallel([...validated], async ([name, row]) => {
            const current = await check(name);
            if (!current || signature(row) !== signature(current))
                throw Error("LOCAL_INDEX_DIRECTORY_CHANGED: " + name);
        });
        signal?.throwIfAborted();
        if (rows.size > 60000)
            throw Error("LOCAL_INDEX_ENTRY_LIMIT");
        if ([...rows.values()].filter(row => !row.directory).length > 50000)
            throw Error("LOCAL_INDEX_FILE_LIMIT");
        const changes = [];
        for (const [name, row] of rows)
            if (!before.has(name) || signature(before.get(name)) !== signature(row))
                changes.push([name, row]);
        for (const name of before.keys())
            if (!rows.has(name))
                changes.push([name, null]);
        this.rows = rows;
        if (this.file && (changes.length || !this.sequence))
            try {
                const compact = !this.sequence || this.sequence >= 64 || this.journalBytes > 16 * 1024 * 1024;
                const record = { schema: 1, identity, sequence: compact ? 1 : this.sequence + 1, changes: compact ? [...rows] : changes };
                const text = JSON.stringify({ ...record, checksum: digest(record) }) + "\n";
                if (compact)
                    await (0, StateStore_1.atomicWriteText)(this.file, text);
                else {
                    const handle = await fs.open(this.file, node_fs_1.constants.O_WRONLY | node_fs_1.constants.O_APPEND | (node_fs_1.constants.O_NOFOLLOW || 0));
                    try {
                        const opened = await handle.stat(), current = await fs.lstat(this.file);
                        if (!current.isFile() || current.isSymbolicLink() || opened.nlink !== 1 || current.dev !== opened.dev || current.ino !== opened.ino)
                            throw Error("LOCAL_INDEX_JOURNAL_UNSAFE");
                        await handle.writeFile(text, "utf8");
                        await handle.sync();
                    }
                    finally {
                        await handle.close();
                    }
                }
                this.sequence = record.sequence;
                this.journalBytes = (compact ? 0 : this.journalBytes) + Buffer.byteLength(text);
            }
            catch {
                this.sequence = 0;
                this.journalBytes = 0;
            }
        const files = {}, directories = {};
        for (const [name, { directory, ...row }] of rows)
            (directory ? directories : files)[name] = { ...row, modifiedAtMs: Math.floor(row.modifiedAtMs) };
        return { files, directories, unverifiedFiles: {}, observedAt: new Date().toISOString(),
            acceleration: { restored, reusedEntries, statCalls, enumeratedDirectories, changedEntries: changes.length, mode: "live-stat-with-directory-deltas" } };
    }
}
exports.IncrementalLocalMetadata = IncrementalLocalMetadata;
const indexes = new Map();
function incrementalLocalMetadata(root, file) {
    const key = JSON.stringify([path.resolve(root), file]);
    let index = indexes.get(key);
    if (!index) {
        index = new IncrementalLocalMetadata(root, file);
        indexes.set(key, index);
    }
    while (indexes.size > 32)
        indexes.delete(indexes.keys().next().value);
    return index;
}
