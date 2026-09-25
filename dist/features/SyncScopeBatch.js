"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncScopeIssueSignature = syncScopeIssueSignature;
exports.expandSyncScopeBatchSelection = expandSyncScopeBatchSelection;
exports.runSyncScopeBatch = runSyncScopeBatch;
const SyncResolution_1 = require("./SyncResolution");
function parentOf(relative) {
    const index = relative.lastIndexOf("/");
    return index < 0 ? "." : relative.slice(0, index);
}
/** Group problems by which copies exist and which copies have equal contents. */
function syncScopeIssueSignature(status, endpoints) {
    if (!status || status.copies || status.unverified || !["different", "remote-only"].includes(status.state))
        return undefined;
    const versions = status.versions || {};
    const groups = new Map();
    const parts = endpoints.map((id) => {
        const hash = versions[id]?.sha256?.toLowerCase();
        if (!hash)
            return "missing";
        if (!groups.has(hash))
            groups.set(hash, groups.size + 1);
        return String(groups.get(hash));
    });
    if (!parts.some((part) => part !== "missing"))
        return undefined;
    const authority = endpoints.map((id) => versions[id]?.latest || "-").join("|");
    return `${parts.join("|")};${authority}`;
}
async function expandSyncScopeBatchSelection(selected, excluded, list, progress = () => { }, knownEntries = []) {
    const paths = [...new Set(selected)];
    const exclusions = [...new Set(excluded.map(SyncResolution_1.safeSyncPath))];
    if (!paths.length)
        throw new Error("请先勾选要批量操作的文件或目录。");
    for (const item of paths)
        if (item !== ".")
            (0, SyncResolution_1.safeSyncPath)(item);
    const cache = new Map();
    const known = new Map(knownEntries.map((entry) => [entry.path, entry]));
    const children = (parent) => {
        if (!cache.has(parent))
            cache.set(parent, list(parent));
        return cache.get(parent);
    };
    const resolve = async (relative) => {
        if (relative === ".")
            return { name: ".", path: ".", directory: true };
        if (known.has(relative))
            return known.get(relative);
        const entry = (await children(parentOf(relative))).find((item) => item.path === relative);
        if (!entry)
            throw new Error(`已勾选路径不存在，请刷新文件树：${relative}`);
        return entry;
    };
    const result = [];
    const expand = async (entry) => {
        const relative = entry.path;
        if (exclusions.some((item) => item === relative || relative.startsWith(`${item}/`)))
            return;
        const hasExcludedChild = exclusions.some((item) => item.startsWith(`${relative}/`));
        if (relative === "." || hasExcludedChild) {
            if (!entry.directory)
                throw new Error(`文件下不能设置排除项：${relative}`);
            for (const child of await children(relative)) {
                if (child.selectable === false)
                    continue;
                (0, SyncResolution_1.safeSyncPath)(child.path);
                if (parentOf(child.path) !== relative)
                    throw new Error(`文件树返回了越级路径：${child.path}`);
                await expand(child);
            }
        }
        else
            result.push(entry);
    };
    const topPaths = paths.filter((relative) => !paths.some((ancestor) => ancestor !== relative && (ancestor === "." || relative.startsWith(`${ancestor}/`))));
    let next = 0;
    let completed = 0;
    await Promise.all(Array.from({ length: Math.min(8, topPaths.length) }, async () => {
        for (;;) {
            const index = next++;
            if (index >= topPaths.length)
                return;
            await expand(await resolve(topPaths[index]));
            progress(++completed, topPaths.length);
        }
    }));
    if (!result.length)
        throw new Error("所选范围内没有可操作的文件或目录。");
    return result.sort((a, b) => a.path.localeCompare(b.path));
}
async function runSyncScopeBatch(items, task, progress, limit = 2, stopOnError = () => false) {
    if (!Number.isInteger(limit) || limit < 1)
        throw new Error("批量并发数无效。");
    const results = Array(items.length);
    let next = 0;
    let completed = 0;
    let stopped = false;
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
        for (;;) {
            const index = next++;
            if (index >= items.length)
                return;
            if (stopped) {
                results[index] = { item: items[index], error: "前一目标安全检查失败，未执行" };
                progress(++completed, items.length);
                continue;
            }
            try {
                await task(items[index], index);
                results[index] = { item: items[index] };
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                results[index] = { item: items[index], error: message };
                if (stopOnError(message))
                    stopped = true;
            }
            progress(++completed, items.length);
        }
    }));
    return results;
}
