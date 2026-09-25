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
exports.scopeInventoryPathAllowed = scopeInventoryPathAllowed;
exports.collectLocalScopeInventory = collectLocalScopeInventory;
exports.buildScopeStatuses = buildScopeStatuses;
const PlanArtifactSync_1 = require("./PlanArtifactSync");
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
const crypto = __importStar(require("node:crypto"));
const SyncResolution_1 = require("./SyncResolution");
const localHashCache = new Map();
function fileIdentity(stat) {
    return `${stat.dev}:${stat.ino}:${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}`;
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
async function collectLocalScopeInventory(root, relative = ".", recursive = true) {
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
        if (!stat.isDirectory() || stat.isSymbolicLink())
            throw new Error(`本机清单目录不安全：${current}`);
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
    const files = {};
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(8, Math.max(1, names.length)) }, async () => {
        for (;;) {
            const index = next++;
            if (index >= names.length)
                break;
            const relative = names[index];
            const full = path.join(root, ...relative.split("/"));
            const before = await fs.lstat(full);
            if (!before.isFile() || before.isSymbolicLink())
                throw new Error(`本机清单路径发生变化：${relative}`);
            const identity = fileIdentity(before);
            const cached = localHashCache.get(full);
            if (cached?.identity === identity) {
                files[relative] = cached.file;
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
            const after = await fs.lstat(full);
            if (!after.isFile() || after.isSymbolicLink() || identity !== fileIdentity(after))
                throw new Error(`本机文件在校验时变更：${relative}`);
            const file = { sha256: hash.digest("hex"), size: after.size, modifiedAtMs: after.mtimeMs };
            localHashCache.set(full, { identity, file });
            files[relative] = file;
        }
    }));
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
function buildScopeStatuses(inventories, mode, selectedPaths, localDefaultPaths, ledger, offlineWorkerIds = new Set(), holds = {}) {
    const workers = Object.keys(inventories.workers).sort();
    const all = new Set([
        ...Object.keys(inventories.local),
        ...workers.flatMap((id) => Object.keys(inventories.workers[id] || {})),
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
        addVersion("local", inventories.local[path]);
        for (const id of workers)
            if (!offlineWorkerIds.has(id))
                addVersion(id, inventories.workers[id]?.[path]);
        const held = (0, SyncResolution_1.isSyncHeld)(path, holds);
        if (mode === "local-server") {
            const detail = [`本机 ${localHash ? "最新版" : "缺失"}`, ...remote.map(({ id, hash }) => `${id} ${offlineWorkerIds.has(id) ? "未校验，待核对" : !hash ? "待更新" : hash === localHash ? "最新版" : "待更新"}`)].join(" · ");
            const state = localHash && remote.every(({ hash }) => hash === localHash) ? "same" : offlineWorkerIds.size && localHash && remote.every(({ id, hash }) => offlineWorkerIds.has(id) || hash === localHash) ? "unknown" : "different";
            if (versions.local)
                versions.local.latest = "local";
            statuses[path] = { state, detail: held ? `${detail} · 自动同步已暂停` : detail, versions, held };
            continue;
        }
        const owner = ownerForPath(path, ledger);
        const ownerHash = owner ? inventories.workers[owner]?.[path]?.sha256?.toLowerCase() : undefined;
        const present = remote.filter(({ hash }) => hash);
        const unique = new Set(present.map(({ hash }) => hash));
        const manualHash = (0, SyncResolution_1.chosenSyncHash)(path, holds)?.toLowerCase();
        const reference = manualHash || (owner ? ownerHash : unique.size === 1 ? present[0]?.hash : undefined);
        const remoteSame = Boolean(reference) && remote.every(({ hash }) => hash === reference);
        const localSame = localHash === reference;
        const detail = !reference
            ? `${owner && offlineWorkerIds.has(owner) ? `Plan 归属 ${owner} 未校验，待核对` : "内容冲突，无法判定最新版"} · ${remote.map(({ id, hash }) => `${id} ${offlineWorkerIds.has(id) ? "未校验" : hash ? "冲突" : "缺失"}`).join(" · ")}`
            : [manualHash ? "手动保留版本" : owner ? `Plan 归属：${owner}` : "Worker 内容基准", `本机 ${!localHash ? "缺失" : localHash === reference ? "同版" : "不同版"}`,
                ...remote.map(({ id, hash }) => `${id} ${offlineWorkerIds.has(id) ? "未校验，待核对" : hash === reference ? "最新版" : "待更新"}`)].join(" · ");
        const activeMatch = Boolean(reference) && remote.every(({ id, hash }) => offlineWorkerIds.has(id) || hash === reference);
        const state = remoteSame ? localSame ? "same" : "remote-only"
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
    const count = (folder, status) => {
        const row = folders.get(folder) || { total: 0, failed: 0, remoteOnly: 0, unknown: 0 };
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
        count(".", statuses[path]);
        const parts = path.split("/");
        for (let i = 1; i < parts.length; i++)
            count(parts.slice(0, i).join("/"), statuses[path]);
    }
    for (const [folder, { total, failed, remoteOnly, unknown }] of folders) {
        statuses[folder] = { state: failed ? "different" : unknown ? "unknown" : remoteOnly ? "remote-only" : "same", detail: failed ? `${failed} 个文件待更新或冲突` : unknown ? `${unknown} 个文件未确认` : remoteOnly ? `${remoteOnly} 个文件仅 Worker 一致` : `${total} 个文件全部一致`, held: (0, SyncResolution_1.isSyncHeld)(folder, holds) };
    }
    return statuses;
}
