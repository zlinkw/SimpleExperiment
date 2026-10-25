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
exports.managedWriteBitsAllowed = exports.MACOS_O_EXLOCK = exports.LATEST_RESULT_FILE = void 0;
exports.resultCoordinationMode = resultCoordinationMode;
exports.resultLockFile = resultLockFile;
exports.resultLockOpenFlags = resultLockOpenFlags;
exports.assertResultLockStats = assertResultLockStats;
exports.acquireResultExlock = acquireResultExlock;
exports.assertResultLockDirectory = assertResultLockDirectory;
exports.readLatestResultExport = readLatestResultExport;
exports.regenerateLatestResultTables = regenerateLatestResultTables;
exports.publishLatestResult = publishLatestResult;
exports.latestResultCatalog = latestResultCatalog;
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
const net = __importStar(require("node:net"));
const StateStore_1 = require("../state/StateStore");
const ProjectResultTables_1 = require("./ProjectResultTables");
const FreshResults_1 = require("./FreshResults");
const ProjectStatePaths_1 = require("../features/ProjectStatePaths");
exports.LATEST_RESULT_FILE = "latest-results.json";
const writers = new Map();
/** macOS (r17-B): O_EXLOCK on a stable empty file inside the CONSUMED project. The kernel drops
 * the lock on close or process death — no stale owner, no recovery record, never unlinked.
 * 0x20 is the NUMERIC macOS open(2) O_EXLOCK; every other bit comes from fs.constants. On other
 * platforms 0x20 is NOT O_EXLOCK — the bit means something else entirely (for reference, Linux
 * O_APPEND is 1024, a different value), so resultLockOpenFlags refuses non-darwin platforms and
 * this path is never executed there — Linux keeps the untouched loopback-TCP coordination below. */
exports.MACOS_O_EXLOCK = 0x20;
function resultCoordinationMode(platform) {
    return platform === "win32" ? "pipe" : platform === "darwin" ? "exlock" : "tcp";
}
function resultLockFile(realRoot, digest) {
    return path.join((0, ProjectStatePaths_1.projectLocksDir)(realRoot, "simple-experiment"), "results", digest + ".lock");
}
function resultLockOpenFlags(constants, platform) {
    if (platform !== "darwin")
        throw Error("O_EXLOCK 仅 macOS 可用；其他平台不得执行该数值位。");
    return (constants.O_RDWR | constants.O_CREAT | constants.O_NOFOLLOW | constants.O_NONBLOCK | exports.MACOS_O_EXLOCK) >>> 0;
}
/** Ownership/hardening checks on the opened lock: ordinary single-hardlink file owned by this
 * uid, path and handle still reference the SAME inode, mode normalized to 0600. */
function assertResultLockStats(held, listed, getuid) {
    if (getuid && held.uid !== getuid())
        throw Error("RESULT_LOCK_PATH_UNSAFE：锁文件不属于当前用户。");
    if (!held.isFile() || !listed.isFile() || held.nlink !== 1 || listed.nlink !== 1
        || held.ino !== listed.ino || held.dev !== listed.dev)
        throw Error("RESULT_LOCK_PATH_UNSAFE：锁文件不是当前路径的普通独占文件。");
    return (held.mode & 0o777) !== 0o600;
}
async function openResultLockHandle(lockFile) {
    const handle = await fs.open(lockFile, resultLockOpenFlags(fs.constants, process.platform), 0o600);
    try {
        const held = await handle.stat({ bigint: false }), listed = await fs.lstat(lockFile);
        if (assertResultLockStats(held, listed, typeof process.getuid === "function" ? process.getuid : undefined))
            await handle.chmod(0o600);
        return { close: () => handle.close() };
    }
    catch (error) {
        await handle.close().catch(() => undefined);
        throw error;
    }
}
/** EAGAIN/EWOULDBLOCK keeps the existing 50ms/5s bounded wait with per-round cancellation;
 * any other open error propagates as-is — never hidden, never a fallback to the TCP channel. */
async function acquireResultExlock(deadline, current, openLocked) {
    for (;;) {
        if (!current())
            throw Error("结果导出已取消或工作区已变化");
        try {
            return await openLocked();
        }
        catch (error) {
            if (error?.code !== "EAGAIN" && error?.code !== "EWOULDBLOCK")
                throw error;
            if (Date.now() >= deadline)
                throw Error("结果文件正在其他窗口更新，请稍后重试；未读取旧锁记录。");
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }
}
/** Bit rule single-sourced in ProjectStatePaths (same platform-aware semantics as the managed
 * project tree); re-exported so this module keeps its stable B-contract API. */
var ProjectStatePaths_2 = require("../features/ProjectStatePaths");
Object.defineProperty(exports, "managedWriteBitsAllowed", { enumerable: true, get: function () { return ProjectStatePaths_2.managedWriteBitsAllowed; } });
/** Lock directory must be this user's real directory with no group/other write bit; a foreign
 * or world-writable tree fails closed instead of being silently fixed or bypassed. stat/chmod/
 * getuid are injectable so the SAME rule path is verified on every platform; real POSIX chmod
 * effects remain macOS/Linux native acceptance. */
async function assertResultLockDirectory(dir, deps = {}) {
    const platform = deps.platform ?? process.platform;
    const stat = await (deps.lstat || ((p) => fs.lstat(p)))(dir);
    if (stat.isSymbolicLink() || !stat.isDirectory())
        throw Error("RESULT_LOCK_PATH_UNSAFE：锁目录异常。");
    const getuid = deps.getuid !== undefined ? deps.getuid : (typeof process.getuid === "function" ? process.getuid : undefined);
    if (getuid && stat.uid !== getuid())
        throw Error("RESULT_LOCK_PATH_UNSAFE：锁目录不属于当前用户。");
    if (!(0, ProjectStatePaths_1.managedWriteBitsAllowed)(stat.mode, platform))
        throw Error("RESULT_LOCK_PATH_UNSAFE：锁目录允许组/其他用户写入。");
    if (platform !== "win32" && (stat.mode & 0o777) !== 0o700)
        await (deps.chmod || ((p, m) => fs.chmod(p, m)))(dir, 0o700); // only reachable for our own tree (uid + write-bit checks above)
}
/** Kernel-owned, crash-released coordination. No lease JSON, PID, or recovery record.
 * macOS: project-internal O_EXLOCK empty file. Windows: named pipe. Linux: loopback TCP (unchanged). */
async function withResultWriter(root, directory, current, work) {
    const realRoot = await fs.realpath(root);
    let canonical = path.join(realRoot, (0, FreshResults_1.resultPath)(directory));
    if (process.platform === "win32")
        canonical = canonical.toLowerCase();
    const previous = writers.get(canonical) || Promise.resolve();
    const request = previous.catch(() => undefined).then(async () => {
        const digest = (0, FreshResults_1.resultDigest)(canonical), deadline = Date.now() + 5000;
        if (resultCoordinationMode(process.platform) === "exlock") {
            const lockFile = resultLockFile(realRoot, digest);
            // The WHOLE managed chain (simple_cluster/locks/...) is created segment by segment and
            // each existing segment must be a real directory — a symlinked parent could otherwise
            // drop this project's lock into another project (r17 返修: leaf-only checks are not enough).
            await (0, ProjectStatePaths_1.ensureProjectManagedDirectory)(realRoot, path.dirname(lockFile));
            await assertResultLockDirectory(path.dirname(lockFile));
            const held = await acquireResultExlock(deadline, current, () => openResultLockHandle(lockFile));
            // The lock path is a permanent, EMPTY project member: close() releases the kernel lock;
            // there is deliberately no unlink/rename and nothing to recover after a crash.
            try {
                return await work();
            }
            finally {
                await held.close();
            }
        }
        let server;
        for (;;) {
            if (!current())
                throw Error("结果导出已取消或工作区已变化");
            server = net.createServer(socket => socket.destroy());
            server.unref();
            try {
                await new Promise((resolve, reject) => {
                    server.once("error", reject);
                    // Windows uses a named pipe. The portable fallback is local IPC, never an Agent tunnel endpoint.
                    const address = process.platform === "win32" ? { path: "\\\\.\\pipe\\simpleex-results-" + digest }
                        : { host: "127.0.0.1", port: 49152 + parseInt(digest.slice(0, 4), 16) % 16384, exclusive: true };
                    server.listen(address, () => { server.removeListener("error", reject); resolve(); });
                });
                break;
            }
            catch (error) {
                server.close(() => undefined);
                if (error.code !== "EADDRINUSE")
                    throw error;
                if (Date.now() >= deadline)
                    throw Error("结果文件正在其他窗口更新，请稍后重试；未读取旧锁记录。");
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
        try {
            return await work();
        }
        finally {
            await new Promise(resolve => server.close(() => resolve()));
        }
    });
    writers.set(canonical, request);
    try {
        return await request;
    }
    finally {
        if (writers.get(canonical) === request)
            writers.delete(canonical);
    }
}
async function safeFile(root, directory, relative) {
    const base = await fs.realpath(root), parts = ((0, FreshResults_1.resultPath)(directory) + "/" + (0, FreshResults_1.resultPath)(relative)).split("/");
    let current = base;
    for (const [index, leaf] of parts.entries()) {
        current = path.join(current, leaf);
        const stat = await fs.lstat(current).catch(error => error?.code === "ENOENT" ? undefined : Promise.reject(error));
        if (stat && (stat.isSymbolicLink() || (index < parts.length - 1 ? !stat.isDirectory() : !stat.isFile() || stat.nlink > 1)))
            throw Error("RESULT_EXPORT_PATH_UNSAFE: " + current);
    }
    return current;
}
async function readLatestResultExport(root, directory) {
    const file = await safeFile(root, directory, exports.LATEST_RESULT_FILE);
    const stat = await fs.stat(file).catch(error => error?.code === "ENOENT" ? undefined : Promise.reject(error));
    if (!stat)
        return undefined;
    if (stat.size > 32 * 1024 * 1024)
        throw Error("RESULT_EXPORT_TOO_LARGE");
    const value = JSON.parse(await fs.readFile(file, "utf8"));
    if (value?.schemaVersion !== 1 || value.source !== "active_query" || !Array.isArray(value.jobs) || !Array.isArray(value.tables))
        throw Error("RESULT_EXPORT_INVALID");
    for (const table of value.tables) {
        (0, FreshResults_1.resultPath)(table.relativePath);
        (0, FreshResults_1.resultPath)(table.markdownPath);
        if (!Array.isArray(table.header) || !Array.isArray(table.rows) || typeof table.markdown !== "string")
            throw Error("RESULT_EXPORT_INVALID");
    }
    return value;
}
async function writeTables(root, directory, value, current) {
    const entries = value.tables.flatMap(table => [[table.relativePath, (0, ProjectResultTables_1.writeCsv)(table.header, table.rows)], [table.markdownPath, table.markdown]]);
    if (new Set(entries.map(([relative]) => relative)).size !== entries.length)
        throw Error("RESULT_EXPORT_DUPLICATE_PATH");
    for (let offset = 0; offset < entries.length; offset += 4) {
        const settled = await Promise.allSettled(entries.slice(offset, offset + 4).map(async ([relative, text]) => {
            if (!current())
                throw Error("结果导出已取消或工作区已变化");
            const file = await safeFile(root, directory, relative);
            // Read actual bytes, never timestamps: unchanged tables need no durable flush/rename.
            const expected = Buffer.from(text, "utf8");
            const stat = await fs.stat(file).catch(error => error?.code === "ENOENT" ? undefined : Promise.reject(error));
            const existing = stat?.size === expected.length ? await fs.readFile(file) : undefined;
            if (existing?.equals(expected)) {
                await safeFile(root, directory, relative);
                if (!current())
                    throw Error("结果导出已取消或工作区已变化");
                return;
            }
            await (0, StateStore_1.atomicWriteText)(file, text, { beforeRename: async () => { if (!current())
                    throw Error("结果导出已取消或工作区已变化"); await safeFile(root, directory, relative); } });
        }));
        // Keep the writer until all concurrent writes have drained, including on error.
        const failed = settled.find(row => row.status === "rejected");
        if (failed?.status === "rejected")
            throw failed.reason;
    }
}
async function regenerateLatestResultTables(root, directory, _value, current = () => true) {
    return withResultWriter(root, directory, current, async () => {
        const value = await readLatestResultExport(root, directory);
        if (!value)
            throw Error("最终汇总 JSON 已不存在，请重新查询服务器。");
        await writeTables(root, directory, value, current);
        return value;
    });
}
async function publishLatestResult(root, directory, result, tables, current = () => true) {
    if (!result.querySucceeded)
        return false;
    return withResultWriter(root, directory, current, async () => {
        const value = { schemaVersion: 1, source: "active_query", observedAt: result.observedAt,
            jobs: result.jobs, errors: result.errors, tables: Object.values(tables), runtimeDiagnosticsProtocol: 1 };
        const file = await safeFile(root, directory, exports.LATEST_RESULT_FILE);
        await (0, StateStore_1.atomicWriteText)(file, JSON.stringify(value, null, 2) + "\n", { beforeRename: async () => {
                if (!current())
                    throw Error("结果导出已取消或工作区已变化");
                await safeFile(root, directory, exports.LATEST_RESULT_FILE);
            } });
        await writeTables(root, directory, value, current);
        return true;
    });
}
/** The saved export lists its own tables. Neither a directory scan nor an old registry can add rows. */
async function latestResultCatalog(root, directory) {
    const value = await readLatestResultExport(root, directory);
    const datasets = new Map();
    for (const table of value?.tables || []) {
        let dataset = datasets.get(table.datasetKey);
        if (!dataset) {
            dataset = { dataset: table.dataset, datasetKey: table.datasetKey, tables: [], plans: [] };
            datasets.set(table.datasetKey, dataset);
        }
        const values = {};
        table.header.forEach((field, index) => { values[field] = [...new Set(table.rows.map(row => String(row[index] ?? "")))]; });
        dataset.tables.push({ ...table, path: path.posix.join(directory, table.relativePath), markdownPath: path.posix.join(directory, table.markdownPath), values, rowCount: table.rows.length });
        for (const planFile of values.plan_file || [])
            if (planFile && !dataset.plans.some((plan) => plan.planFile === planFile))
                dataset.plans.push({ planFile, planKey: planFile, artifacts: [], assignment: { kind: table.dataset ? "single" : "unassigned", datasets: table.dataset ? [table.dataset] : [], source: "result-record" } });
    }
    const planDatasets = new Map();
    for (const dataset of datasets.values())
        for (const plan of dataset.plans) {
            if (!planDatasets.has(plan.planFile))
                planDatasets.set(plan.planFile, new Set());
            if (dataset.dataset)
                planDatasets.get(plan.planFile).add(dataset.dataset);
        }
    for (const dataset of datasets.values())
        for (const plan of dataset.plans) {
            const names = [...planDatasets.get(plan.planFile)];
            if (names.length > 1)
                plan.assignment = { kind: "multiple", datasets: names, source: "result-record" };
        }
    return { datasets: [...datasets.values()], legacyTables: [], unassignedPlans: [...datasets.values()].filter(row => !row.dataset).flatMap(row => row.plans),
        multiDatasetPlans: [...planDatasets].filter(([, names]) => names.size > 1).map(([planFile, names]) => ({ planFile, datasets: [...names] })),
        mappingConflicts: [], autoRecoverableCount: 0, observedAt: value?.observedAt, source: "local_export" };
}
