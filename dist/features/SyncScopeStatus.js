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
exports.localScopeHashCachePath = localScopeHashCachePath;
exports.requireCompleteScopeInventory = requireCompleteScopeInventory;
exports.scopeInventoryPathAllowed = scopeInventoryPathAllowed;
exports.collectLocalScopeInventory = collectLocalScopeInventory;
exports.collectSelectedLocalScopeFiles = collectSelectedLocalScopeFiles;
exports.hashLocalScopeNames = hashLocalScopeNames;
exports.buildScopeStatuses = buildScopeStatuses;
const PlanArtifactSync_1 = require("./PlanArtifactSync");
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
const crypto = __importStar(require("node:crypto"));
const SyncResolution_1 = require("./SyncResolution");
const SCOPE_HASH_SCHEMA_VERSION = 1;
/** Process-local mirror. Persistence lives beside the code-manifest cache and is the restart source. */
const localHashCache = new Map();
function localScopeHashCachePath(storageRoot, projectRoot) {
    const resolved = path.resolve(projectRoot);
    const id = crypto.createHash("sha256").update(process.platform === "win32" ? resolved.toLowerCase() : resolved).digest("hex");
    return path.join(storageRoot, "scope-hash-cache", `${id}.json`);
}
function bigintString(value) {
    if (typeof value === "bigint")
        return value.toString();
    if (typeof value === "number" && Number.isFinite(value))
        return Number.isSafeInteger(value) ? String(value) : value.toFixed(0);
    return "";
}
function finiteTime(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
function scopeHashIdentity(stat) {
    const dev = bigintString(stat.dev);
    const ino = bigintString(stat.ino);
    const mtimeMs = finiteTime(stat.mtimeMs);
    const ctimeMs = finiteTime(stat.ctimeMs);
    const birthtimeMs = finiteTime(stat.birthtimeMs);
    if (!dev || !ino || mtimeMs === undefined || ctimeMs === undefined || birthtimeMs === undefined || !Number.isSafeInteger(stat.size))
        return undefined;
    return { dev, ino, size: stat.size, mtimeMs, ctimeMs, birthtimeMs };
}
function scopeHashIdentityKey(identity) {
    return `${identity.dev}:${identity.ino}:${identity.size}:${identity.mtimeMs}:${identity.ctimeMs}:${identity.birthtimeMs}`;
}
function sameScopeHashIdentity(row, identity) {
    return Boolean(row && identity
        && row.dev === identity.dev
        && row.ino === identity.ino
        && row.size === identity.size
        && row.mtimeMs === identity.mtimeMs
        && row.ctimeMs === identity.ctimeMs
        && row.birthtimeMs === identity.birthtimeMs
        && /^[a-f0-9]{64}$/i.test(String(row.sha256 || "")));
}
async function readScopeHashCache(file) {
    try {
        const parsed = JSON.parse(await fs.readFile(file, "utf8"));
        if (parsed?.schemaVersion === SCOPE_HASH_SCHEMA_VERSION && parsed.files && typeof parsed.files === "object" && !Array.isArray(parsed.files)) {
            return { schemaVersion: SCOPE_HASH_SCHEMA_VERSION, files: parsed.files };
        }
    }
    catch {
        // A missing or damaged cache only forces a rehash.
    }
    return { schemaVersion: SCOPE_HASH_SCHEMA_VERSION, files: {} };
}
async function writeScopeHashCache(file, document) {
    await fs.mkdir(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.tmp`;
    await fs.writeFile(temp, JSON.stringify(document), "utf8");
    await fs.rename(temp, file);
}
function requireCompleteScopeInventory(result, location = "") {
    const unverified = Object.entries(result.unverifiedFiles || {});
    if (unverified.length)
        throw new Error(`${location ? `${location}：` : ""}清单有 ${unverified.length} 个未验证路径（${unverified[0][0]}：${unverified[0][1]}），请确认该路径后刷新重试。`);
    return result;
}
function scopeInventoryPathAllowed(relative, directory = false) {
    const parts = relative.toLowerCase().split("/");
    if (parts[0] === "tmp" || parts.some((part) => [".git", ".vscode", ".codex", ".agents", ".coding-tools", ".local-gpt", ".runtime", "clean_dir", "zlk_cluster", ".venv", "venv", "env", "node_modules", "__pycache__", ".cache", ".pytest_cache", ".mypy_cache", ".ruff_cache", ".tox"].includes(part)))
        return false;
    if (parts[0] === "experiments" && parts[1] === "results" && parts.at(-1)?.endsWith(".csv.lock"))
        return false;
    if (parts[0] === "work_dirs" && parts.at(-1) === ".tb_mean.lock")
        return false;
    if (parts.at(-1)?.startsWith(".env"))
        return false;
    if (["plan_sync_ledger.json", "project_mirror_state.json"].includes(parts.at(-1) || ""))
        return false;
    if (parts[0] !== "simple_cluster" || parts.length < 2)
        return true;
    if (["results", "debug_runs"].includes(parts[1]))
        return true;
    if (parts[1] !== "tmp")
        return false;
    if (parts.length === 2 || parts[2] === "tmux_logs")
        return true;
    if (parts[2] === "cluster_scheduler")
        return parts.length === 3 && directory || parts[3] === "logs" || parts.length === 4 && parts.at(-1)?.endsWith(".log") === true;
    return false;
}
async function collectLocalScopeInventory(root, relative = ".", recursive = true, onUnverified, cacheFile) {
    if (relative !== "." && (relative.startsWith("/") || /^[a-z]:/i.test(relative) || relative.split("/").some((part) => !part || part === "." || part === "..")))
        throw new Error(`本机清单路径不安全：${relative}`);
    const names = [];
    async function walk(current) {
        const base = current ? path.join(root, ...current.split("/")) : root;
        const stat = await fs.lstat(base).catch((error) => {
            if (error.code === "ENOENT")
                return undefined;
            throw error;
        });
        if (!stat)
            return;
        if (stat.isSymbolicLink())
            throw new Error(`本机清单路径不安全：${current}`);
        if (stat.isFile() && current) {
            if (scopeInventoryPathAllowed(current, false))
                names.push(current);
            return;
        }
        if (!stat.isDirectory())
            throw new Error(`本机清单路径不安全：${current}`);
        for (const entry of await fs.readdir(base, { withFileTypes: true })) {
            const child = current ? `${current}/${entry.name}` : entry.name;
            if (entry.isSymbolicLink() || !scopeInventoryPathAllowed(child, entry.isDirectory()))
                continue;
            if (entry.isDirectory() && recursive)
                await walk(child);
            else if (entry.isFile())
                names.push(child);
        }
    }
    await walk(relative === "." ? "" : relative);
    return hashLocalScopeNames(root, names, onUnverified, cacheFile);
}
/** One hash pool for every confirmed file and directory. Directory walks only list names. */
async function collectSelectedLocalScopeFiles(root, items, cacheFile) {
    const names = [];
    for (const item of items) {
        if (item.directory) {
            const found = await listLocalScopeFileNames(root, item.path);
            if (!found.length)
                throw new Error(`来源目录没有可同步文件：${item.path}`);
            names.push(...found);
        }
        else
            names.push(item.path);
    }
    return hashLocalScopeNames(root, [...new Set(names)], undefined, cacheFile);
}
async function listLocalScopeFileNames(root, relative) {
    const names = [];
    async function walk(current) {
        const base = current ? path.join(root, ...current.split("/")) : root;
        const stat = await fs.lstat(base);
        if (stat.isSymbolicLink())
            throw new Error(`本机清单路径不安全：${current || relative}`);
        if (stat.isFile()) {
            if (current && scopeInventoryPathAllowed(current, false))
                names.push(current);
            return;
        }
        if (!stat.isDirectory())
            throw new Error(`本机来源目录不存在或是符号链接。`);
        for (const entry of await fs.readdir(base, { withFileTypes: true })) {
            const child = current ? `${current}/${entry.name}` : entry.name;
            if (entry.isSymbolicLink() || !scopeInventoryPathAllowed(child, entry.isDirectory()))
                continue;
            if (entry.isDirectory())
                await walk(child);
            else if (entry.isFile())
                names.push(child);
        }
    }
    await walk(relative);
    return names;
}
async function hashLocalScopeNames(root, names, onUnverified, cacheFile) {
    const persisted = cacheFile ? await readScopeHashCache(cacheFile) : { schemaVersion: SCOPE_HASH_SCHEMA_VERSION, files: {} };
    const nextRows = { ...persisted.files };
    const files = {};
    let next = 0;
    let failed = false;
    await Promise.all(Array.from({ length: Math.min(8, Math.max(1, names.length)) }, async () => {
        for (;;) {
            const index = next++;
            if (index >= names.length)
                break;
            const relative = names[index].replace(/\\/g, "/");
            const full = path.join(root, ...relative.split("/"));
            try {
                const beforeStat = await fs.lstat(full);
                if (!beforeStat.isFile() || beforeStat.isSymbolicLink())
                    throw new Error(`本机清单路径发生变化：${relative}`);
                const before = scopeHashIdentity(beforeStat);
                if (!before)
                    throw new Error(`本机文件身份不完整，无法复用哈希：${relative}`);
                const identity = scopeHashIdentityKey(before);
                const memory = localHashCache.get(full);
                const stored = persisted.files[relative];
                const reusable = memory?.identity === identity
                    ? memory.file
                    : sameScopeHashIdentity(stored, before)
                        ? { sha256: stored.sha256.toLowerCase(), size: stored.size, modifiedAtMs: Number.isFinite(stored.modifiedAtMs) ? stored.modifiedAtMs : before.mtimeMs }
                        : undefined;
                if (reusable) {
                    files[relative] = reusable;
                    nextRows[relative] = { ...before, sha256: reusable.sha256, modifiedAtMs: reusable.modifiedAtMs };
                    localHashCache.set(full, { identity, file: reusable });
                    continue;
                }
                const hash = crypto.createHash("sha256");
                const handle = await fs.open(full, "r");
                try {
                    const buffer = Buffer.allocUnsafe(1024 * 1024);
                    for (;;) {
                        const { bytesRead } = await handle.read(buffer, 0, buffer.length, null);
                        if (!bytesRead)
                            break;
                        hash.update(buffer.subarray(0, bytesRead));
                    }
                }
                finally {
                    await handle.close();
                }
                const afterStat = await fs.lstat(full);
                const after = scopeHashIdentity(afterStat);
                if (!afterStat.isFile() || afterStat.isSymbolicLink() || !after || !sameScopeHashIdentity({ ...before, sha256: "0".repeat(64) }, after))
                    throw new Error(`本机文件在校验时变更：${relative}`);
                const file = { sha256: hash.digest("hex"), size: after.size, modifiedAtMs: afterStat.mtimeMs };
                localHashCache.set(full, { identity, file });
                nextRows[relative] = { ...after, sha256: file.sha256, modifiedAtMs: file.modifiedAtMs };
                files[relative] = file;
            }
            catch (error) {
                const missing = error?.code === "ENOENT";
                if (missing)
                    delete nextRows[relative];
                else
                    failed = true;
                if (!onUnverified)
                    throw error;
                onUnverified(relative, error instanceof Error ? error.message : String(error));
            }
        }
    }));
    if (cacheFile && !failed) {
        try {
            await writeScopeHashCache(cacheFile, { schemaVersion: SCOPE_HASH_SCHEMA_VERSION, files: nextRows });
        }
        catch (error) {
            console.warn(`[SimpleExperiment] local scope hash cache write failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    return files;
}
function ownerForPath(path, ledger) {
    const plans = new Set(Object.values(ledger.entries || {}).map((entry) => entry.planFile));
    for (const plan of plans) {
        const latest = (0, PlanArtifactSync_1.latestPlanSyncEntry)(ledger, plan);
        if (latest && (latest.artifactPaths.includes(path) || latest.directoryPaths.some((directory) => path.startsWith(`${directory}/`))))
            return latest.sourceWorkerId;
    }
    return undefined;
}
function buildScopeStatuses(inventories, mode, selectedPaths, localDefaultPaths, ledger, offlineWorkerIds = new Set(), holds = {}, authoritativeWorkers = {}) {
    const workers = Object.keys(inventories.workers).sort();
    const all = new Set([
        ...(mode === "local-server" ? Object.keys(inventories.local) : []),
        ...workers.flatMap((id) => Object.keys(inventories.workers[id] || {})),
        ...Object.entries(inventories.unverified || {}).flatMap(([id, files]) => id === "local" && mode === "server-server" ? [] : Object.keys(files)),
    ]);
    const statuses = {};
    const inSelectedScope = (path) => selectedPaths.some((scope) => scope === "." || path === scope || path.startsWith(`${scope}/`));
    for (const path of [...all].sort()) {
        const inScope = mode === "server-server"
            ? inSelectedScope(path)
            : localDefaultPaths.has(path) || inSelectedScope(path);
        if (!inScope) {
            statuses[path] = { state: "unknown", detail: "当前同步范围外" };
            continue;
        }
        if (!workers.length) {
            statuses[path] = { state: "unknown", detail: "尚未配置 Worker" };
            continue;
        }
        const localHash = inventories.local[path]?.sha256?.toLowerCase();
        const remote = workers.map((id) => ({ id, hash: inventories.workers[id]?.[path]?.sha256?.toLowerCase() }));
        const versions = {};
        const addVersion = (id, file) => { if (file?.sha256)
            versions[id] = { sha256: file.sha256, modifiedAtMs: Number(file.modifiedAtMs || 0) }; };
        if (mode === "local-server")
            addVersion("local", inventories.local[path]);
        for (const id of workers)
            if (!offlineWorkerIds.has(id))
                addVersion(id, inventories.workers[id]?.[path]);
        const held = (0, SyncResolution_1.isSyncHeld)(path, holds);
        const unstable = Object.entries(inventories.unverified || {}).filter(([id, files]) => (mode === "local-server" || id !== "local") && files[path]);
        if (unstable.length) {
            const detail = unstable.map(([id, files]) => `${id === "local" ? "本机" : id} ${files[path]}，待重试`).join(" · ");
            statuses[path] = { state: "unknown", detail, versions, held, unverified: true };
            continue;
        }
        if (mode === "local-server") {
            const detail = [`本机 ${localHash ? "最新版" : "缺失"}`, ...remote.map(({ id, hash }) => `${id} ${offlineWorkerIds.has(id) ? "未校验，待核对" : !hash ? "待更新" : hash === localHash ? "最新版" : "待更新"}`)].join(" · ");
            const state = localHash && remote.every(({ hash }) => hash === localHash) ? "same" : offlineWorkerIds.size && localHash && remote.every(({ id, hash }) => offlineWorkerIds.has(id) || hash === localHash) ? "unknown" : "different";
            if (versions.local)
                versions.local.latest = "local";
            statuses[path] = { state, detail: held ? `${detail} · 自动同步已暂停` : detail, versions, held };
            continue;
        }
        const owner = authoritativeWorkers[path] || ownerForPath(path, ledger);
        const ownerHash = owner ? inventories.workers[owner]?.[path]?.sha256?.toLowerCase() : undefined;
        const present = remote.filter(({ hash }) => hash);
        const unique = new Set(present.map(({ hash }) => hash));
        const manualHash = (0, SyncResolution_1.chosenSyncHash)(path, holds)?.toLowerCase();
        const reference = manualHash || (owner ? ownerHash : unique.size === 1 ? present[0]?.hash : undefined);
        const remoteSame = Boolean(reference) && remote.every(({ hash }) => hash === reference);
        const detail = !reference
            ? `${owner && offlineWorkerIds.has(owner) ? `Plan 归属 ${owner} 未校验，待核对` : "内容冲突，无法判定最新版"} · ${remote.map(({ id, hash }) => `${id} ${offlineWorkerIds.has(id) ? "未校验" : hash ? "冲突" : "缺失"}`).join(" · ")}`
            : [manualHash ? "手动保留版本" : owner ? `Plan 归属：${owner}` : "Worker 内容基准",
                ...remote.map(({ id, hash }) => `${id} ${offlineWorkerIds.has(id) ? "未校验，待核对" : hash === reference ? "最新版" : "待更新"}`)].join(" · ");
        const activeMatch = Boolean(reference) && remote.every(({ id, hash }) => offlineWorkerIds.has(id) || hash === reference);
        const state = remoteSame ? "same"
            : offlineWorkerIds.size && activeMatch || owner && offlineWorkerIds.has(owner) ? "unknown" : "different";
        if (manualHash) {
            for (const file of Object.values(versions))
                if (file.sha256.toLowerCase() === manualHash)
                    file.latest = "manual";
        }
        else if (owner && versions[owner])
            versions[owner].latest = "plan";
        else if (!owner && unique.size > 1) {
            const candidates = Object.entries(versions).filter(([id]) => id !== "local");
            const newest = Math.max(...candidates.map(([, file]) => file.modifiedAtMs));
            if (newest > 0 && candidates.filter(([, file]) => file.modifiedAtMs === newest).length === 1)
                for (const [, file] of candidates)
                    if (file.modifiedAtMs === newest)
                        file.latest = "candidate";
        }
        else if (!owner && unique.size === 1)
            for (const [id, file] of Object.entries(versions))
                if (id !== "local" && file.sha256.toLowerCase() === reference)
                    file.latest = "same";
        statuses[path] = { state, detail: held ? `${detail} · 自动同步已暂停` : detail, versions, held };
    }
    const folders = new Map();
    const count = (folder, path, status) => {
        const row = folders.get(folder) || { total: 0, failed: 0, remoteOnly: 0, unknown: 0, outside: 0, copies: {} };
        const reference = Object.values(status.versions || {}).find((version) => version.latest && version.latest !== "candidate")?.sha256.toLowerCase();
        for (const id of mode === "local-server" ? ["local", ...workers] : workers) {
            const copy = row.copies[id] || { modifiedAtMs: 0, present: 0, missing: 0, needsSync: 0, conflict: 0, unverified: 0 };
            const file = id === "local" ? inventories.local[path] : inventories.workers[id]?.[path];
            if (file)
                copy.modifiedAtMs = Math.max(copy.modifiedAtMs, Number(file.modifiedAtMs || 0));
            if (status.detail !== "当前同步范围外") {
                if (id !== "local" && offlineWorkerIds.has(id) || inventories.unverified?.[id]?.[path])
                    copy.unverified++;
                else if (!file)
                    copy.missing++;
                else {
                    copy.present++;
                    if (reference && file.sha256.toLowerCase() !== reference)
                        copy.needsSync++;
                    else if (!reference && mode === "server-server" && status.state === "different")
                        copy.conflict++;
                }
            }
            row.copies[id] = copy;
        }
        if (status.detail === "当前同步范围外") {
            row.outside++;
            folders.set(folder, row);
            return;
        }
        row.total++;
        if (status.state === "different")
            row.failed++;
        if (status.state === "remote-only")
            row.remoteOnly++;
        if (status.state === "unknown")
            row.unknown++;
        folders.set(folder, row);
    };
    for (const path of all) {
        count(".", path, statuses[path]);
        const parts = path.split("/");
        for (let i = 1; i < parts.length; i++)
            count(parts.slice(0, i).join("/"), path, statuses[path]);
    }
    for (const [folder, { total, failed, remoteOnly, unknown, outside, copies }] of folders) {
        const same = total - failed - remoteOnly - unknown;
        statuses[folder] = {
            state: !total ? "unknown" : failed ? "different" : unknown ? "unknown" : remoteOnly ? "remote-only" : "same",
            detail: total ? `同步范围内 ${total} 个文件 · ${same} 一致 · ${failed} 待更新或冲突 · ${remoteOnly} 仅 Worker 一致 · ${unknown} 未确认${outside ? ` · ${outside} 范围外` : ""}`
                : `当前同步范围外 · ${outside} 个文件`,
            copies,
            held: (0, SyncResolution_1.isSyncHeld)(folder, holds),
            unverified: unknown > 0,
        };
    }
    return statuses;
}
