"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryScopeMetadata = queryScopeMetadata;
exports.buildScopeMetadataStatuses = buildScopeMetadataStatuses;
/** Each completed endpoint publishes independently; pending/failed endpoints never prove absence. */
async function queryScopeMetadata(endpoints, signal, report = () => { }, publish = () => { }) {
    const inventories = {}, unavailable = new Map(endpoints.map(({ id }) => [id, "正在读取"]));
    const build = () => buildScopeMetadataStatuses(endpoints.map(({ id }) => id), inventories, unavailable);
    await Promise.all(endpoints.map(async ({ id, read }) => {
        try {
            report(`${id}：正在读取递归文件信息`);
            const inventory = await read();
            signal?.throwIfAborted();
            if (inventory?.ok === false || inventory?.error || inventory?.status === "unknown")
                throw new Error(inventory.error || "文件信息查询失败");
            if (inventory.complete === false || inventory.truncated === true)
                throw new Error("文件清单未完整读取，不能确认文件缺失");
            if (!inventory?.files || typeof inventory.files !== "object" || Array.isArray(inventory.files))
                throw new Error("文件信息清单无效");
            for (const [name, file] of Object.entries(inventory.files)) {
                if (name.startsWith("/") || /[\\\x00:]/.test(name) || name.split("/").some(p => !p || p === "." || p === "..")
                    || !file || !Number.isFinite(file.size) || file.size < 0 || !Number.isFinite(file.modifiedAtMs))
                    throw new Error("文件信息清单包含无效路径或属性");
            }
            if (inventory.unverifiedFiles && (typeof inventory.unverifiedFiles !== "object" || Array.isArray(inventory.unverifiedFiles)
                || Object.values(inventory.unverifiedFiles).some(reason => typeof reason !== "string" || !reason)))
                throw new Error("未读取路径清单无效");
            inventories[id] = inventory;
            unavailable.delete(id);
            report(`${id}：已读取 ${Object.keys(inventory.files).length} 个文件`);
        }
        catch (error) {
            signal?.throwIfAborted();
            unavailable.set(id, error instanceof Error ? error.message : String(error));
        }
        if (!signal?.aborted)
            publish(build());
    }));
    signal?.throwIfAborted();
    return build();
}
function buildScopeMetadataStatuses(ids, inventories, unavailable) {
    unavailable = new Map(unavailable);
    for (const id of ids)
        if (!inventories[id] && !unavailable.has(id))
            unavailable.set(id, "未收到本轮文件清单");
    const paths = new Set(Object.values(inventories).flatMap(row => [...Object.keys(row.files), ...Object.keys(row.unverifiedFiles || {})]));
    const statuses = {};
    const folders = new Map();
    for (const name of [...paths].sort()) {
        const metadata = {};
        const present = [], missing = [], unknown = [];
        const groups = new Map();
        for (const id of ids) {
            const inventory = inventories[id], file = inventory?.files[name];
            const uncertain = unavailable.get(id) || (!inventory ? "未收到本轮文件清单" : "") || Object.entries(inventory?.unverifiedFiles || {}).find(([p]) => p === "." || p === name || name.startsWith(p + "/"))?.[1];
            if (uncertain) {
                unknown.push(id);
                metadata[id] = { status: "unknown", error: uncertain };
            }
            else if (!file) {
                missing.push(id);
                metadata[id] = { status: "absent" };
            }
            else {
                present.push(id);
                metadata[id] = { status: "present", directory: false, ...file };
                const key = `${file.size}:${file.modifiedAtMs}`;
                groups.set(key, [...(groups.get(key) || []), id]);
            }
        }
        const different = groups.size > 1;
        const detail = [missing.length ? `缺失：${missing.join("、")}` : "", different ? "大小或修改时间不同" : "", unknown.length ? `查询未完成或失败：${unknown.join("、")}` : "", "仅比较文件信息，内容未比较"].filter(Boolean).join(" · ");
        statuses[name] = { basis: "metadata", state: missing.length || different ? "different" : unknown.length || ids.length < 2 ? "unknown" : "same", detail, metadata,
            issueSignature: missing.length || different || unknown.length ? JSON.stringify({ basis: "metadata", missing, groups: [...groups.values()].sort((a, b) => a.join().localeCompare(b.join())), unknown }) : undefined };
        const parents = [".", ...name.split("/").slice(0, -1).map((_, i, parts) => parts.slice(0, i + 1).join("/"))];
        for (const parent of parents) {
            const row = folders.get(parent) || { total: 0, different: 0, missing: 0, unknown: 0, copies: {} };
            row.total++;
            if (different)
                row.different++;
            if (missing.length)
                row.missing++;
            if (unknown.length)
                row.unknown++;
            for (const id of ids) {
                const copy = row.copies[id] ||= { modifiedAtMs: 0, present: 0, missing: 0, needsSync: 0, conflict: 0, unverified: 0 };
                if (unknown.includes(id))
                    copy.unverified++;
                else if (missing.includes(id))
                    copy.missing++;
                else {
                    copy.present++;
                    copy.modifiedAtMs = Math.max(copy.modifiedAtMs, metadata[id].modifiedAtMs || 0);
                    if (different)
                        copy.needsSync++;
                }
            }
            folders.set(parent, row);
        }
    }
    if (!folders.size)
        folders.set(".", { total: 0, different: 0, missing: 0, unknown: 0, copies: {} });
    for (const [folder, row] of folders)
        statuses[folder] = {
            basis: "metadata", state: row.missing || row.different ? "different" : unavailable.size || row.unknown || ids.length < 2 ? "unknown" : "same",
            detail: `递归文件信息${unavailable.size ? "（查询未完成或失败：" + [...unavailable.keys()].join("、") + "，仅汇总已读结果）" : ""}：${row.total} 个文件 · 缺失 ${row.missing} · 差异 ${row.different} · 未知 ${row.unknown} · 内容未比较${unavailable.size ? " · " + [...unavailable].map(([id, error]) => id + "：" + error).join("；") : ""}`,
            copies: row.copies, unverified: unavailable.size > 0 || row.unknown > 0,
        };
    return statuses;
}
