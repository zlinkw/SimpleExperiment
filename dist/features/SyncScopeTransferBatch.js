"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SYNC_SCOPE_INVENTORY_ARG_LIMIT = exports.SYNC_SCOPE_INVENTORY_PATH_LIMIT = exports.SYNC_SCOPE_FPSYNC_PATH_LIMIT = void 0;
exports.partitionSyncScopeTransferPaths = partitionSyncScopeTransferPaths;
exports.compressSyncScopeInventoryPaths = compressSyncScopeInventoryPaths;
exports.batchSyncScopeInventoryPaths = batchSyncScopeInventoryPaths;
exports.selectConfirmedScopeFiles = selectConfirmedScopeFiles;
exports.planSyncScopeTransferGroups = planSyncScopeTransferGroups;
exports.scopeInventorySnapshot = scopeInventorySnapshot;
/** SimpleSFTP sync.serverToServerFpsync rejects more than 5000 relative paths per call. */
exports.SYNC_SCOPE_FPSYNC_PATH_LIMIT = 5000;
/** Keep projectInventory scopePaths inside one SSH command. */
exports.SYNC_SCOPE_INVENTORY_PATH_LIMIT = 48;
exports.SYNC_SCOPE_INVENTORY_ARG_LIMIT = 6000;
function snapshotOf(files) {
    return JSON.stringify([...files].sort((a, b) => a[0].localeCompare(b[0])));
}
function recordHash(info, pathName) {
    const hash = String(info?.sha256 || "").toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(hash))
        throw new Error(`来源文件不存在或尚未完成 SHA256 校验：${pathName}`);
    return hash;
}
/** Split a file list into bounded fpsync batches. A single file is never split. */
function partitionSyncScopeTransferPaths(files, limit = exports.SYNC_SCOPE_FPSYNC_PATH_LIMIT) {
    if (!Number.isInteger(limit) || limit < 1)
        throw new Error("批量传输上限无效。");
    const groups = [];
    for (let offset = 0; offset < files.length; offset += limit)
        groups.push(files.slice(offset, offset + limit));
    return groups;
}
function fileInSelection(file, itemPath, directory) {
    return directory ? file.startsWith(`${itemPath}/`) : file === itemPath;
}
function commonInventoryDirectory(paths) {
    if (paths.length < 2)
        return "";
    const parts = paths.map((item) => item.split("/"));
    const shared = [];
    for (let index = 0;; index += 1) {
        const part = parts[0][index];
        if (!part || parts.some((row) => row[index] !== part || row.length === index + 1))
            break;
        shared.push(part);
    }
    return shared.join("/");
}
function parentOf(relative) {
    const index = relative.lastIndexOf("/");
    return index < 0 ? "" : relative.slice(0, index);
}
function dedupeCoveredPaths(paths) {
    const unique = [...new Set(paths)].sort((a, b) => a.length - b.length || a.localeCompare(b));
    return unique.filter((item, index) => !unique.slice(0, index).some((ancestor) => item === ancestor || item.startsWith(`${ancestor}/`)));
}
function inventoryArgLength(paths) {
    return JSON.stringify(paths).length;
}
function inventoryTooLarge(paths, maxPaths, maxArgLength) {
    return paths.length > maxPaths || inventoryArgLength(paths) > maxArgLength;
}
/**
 * Small selections stay on the confirmed file or directory.
 * Larger selections fold siblings into their common directory until the SSH argument fits.
 * A single deep file is never widened to an ancestor.
 */
function compressSyncScopeInventoryPaths(paths, options = {}) {
    const maxPaths = options.maxPaths ?? exports.SYNC_SCOPE_INVENTORY_PATH_LIMIT;
    const maxArgLength = options.maxArgLength ?? exports.SYNC_SCOPE_INVENTORY_ARG_LIMIT;
    if (!Number.isInteger(maxPaths) || maxPaths < 1 || !Number.isInteger(maxArgLength) || maxArgLength < 2)
        throw new Error("清单范围上限无效。");
    let current = dedupeCoveredPaths(paths);
    while (inventoryTooLarge(current, maxPaths, maxArgLength)) {
        const grouped = new Map();
        for (const item of current) {
            const parent = parentOf(item);
            if (!parent)
                continue;
            grouped.set(parent, [...(grouped.get(parent) || []), item]);
        }
        const merge = [...grouped.entries()].filter(([, children]) => children.length >= 2)
            .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))[0];
        if (!merge) {
            const common = commonInventoryDirectory(current);
            if (!common)
                break;
            current = [common];
            continue;
        }
        const [parent, children] = merge;
        current = dedupeCoveredPaths(current.filter((item) => !children.includes(item)).concat(parent));
    }
    return current.sort((a, b) => a.localeCompare(b));
}
/** Split a still-too-long scope list into SSH-sized inventory calls. */
function batchSyncScopeInventoryPaths(paths, options = {}) {
    const maxPaths = options.maxPaths ?? exports.SYNC_SCOPE_INVENTORY_PATH_LIMIT;
    const maxArgLength = options.maxArgLength ?? exports.SYNC_SCOPE_INVENTORY_ARG_LIMIT;
    const compressed = compressSyncScopeInventoryPaths(paths, options);
    if (!inventoryTooLarge(compressed, maxPaths, maxArgLength))
        return [compressed];
    const batches = [];
    let batch = [];
    for (const item of compressed) {
        const next = [...batch, item];
        if (batch.length && inventoryTooLarge(next, maxPaths, maxArgLength)) {
            batches.push(batch);
            batch = [item];
        }
        else
            batch = next;
    }
    if (batch.length)
        batches.push(batch);
    return batches;
}
/**
 * Keep only files inside the confirmed selection.
 * A shared inventory may contain siblings; those siblings stay out of the archive.
 */
function selectConfirmedScopeFiles(files, items) {
    const selected = {};
    const directoryDeletes = [];
    for (const item of items) {
        if (item.directory) {
            directoryDeletes.push(item.path);
            const children = Object.keys(files).filter((file) => fileInSelection(file, item.path, true)).sort();
            if (!children.length)
                throw new Error(`来源目录没有可同步文件：${item.path}`);
            for (const file of children)
                selected[file] = { sha256: recordHash(files[file], file), size: files[file]?.size };
        }
        else {
            selected[item.path] = { sha256: recordHash(files[item.path], item.path), size: files[item.path]?.size };
        }
    }
    if (!Object.keys(selected).length)
        throw new Error("所选范围内没有可同步的文件。");
    return { files: selected, directoryDeletes: [...new Set(directoryDeletes)].sort() };
}
/**
 * Directories and loose files share one relative-path archive, split only at the fpsync cap.
 * Directory replacement stays a separate confirmed delete list; it is not one transfer per directory.
 */
function planSyncScopeTransferGroups(items, files, pathLimit = exports.SYNC_SCOPE_FPSYNC_PATH_LIMIT) {
    const selected = selectConfirmedScopeFiles(files, items);
    const slices = partitionSyncScopeTransferPaths(Object.keys(selected.files).sort(), pathLimit);
    const groups = slices.map((paths, index) => {
        const rows = paths.map((file) => [file, selected.files[file].sha256]);
        return {
            kind: "files",
            files: paths,
            directories: selected.directoryDeletes.filter((directory) => paths.some((file) => file.startsWith(`${directory}/`))),
            manifest: Object.fromEntries(paths.map((file) => [file, { size: selected.files[file].size, sha256: selected.files[file].sha256 }])),
            sourceSnapshot: snapshotOf(rows),
            expectedByPath: Object.fromEntries(rows),
            batch: index + 1,
            batchCount: slices.length,
        };
    });
    return { groups, directoryDeletes: selected.directoryDeletes, files: selected.files };
}
function scopeInventorySnapshot(files, paths) {
    return snapshotOf(paths.map((file) => [file, String(files[file]?.sha256 || "").toLowerCase()]));
}
