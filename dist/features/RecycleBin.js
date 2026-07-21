"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recycleView = recycleView;
exports.recycleAuditMarkdown = recycleAuditMarkdown;
function recycleView(records) {
    return records.filter((item) => ["deleted", "delete_failed", "residue", "delete_requested"].includes(item.state))
        .sort((a, b) => String(b.deletedAt || "").localeCompare(String(a.deletedAt || "")));
}
function recycleAuditMarkdown(records) {
    return [
        "ArchiveKey | State | DeletedAt | Residue",
        "--- | --- | --- | ---",
        ...recycleView(records).map((item) => [item.archiveKey, item.state, item.deletedAt || "", item.residue?.map((r) => `${r.endpoint}:${r.path}`).join("<br>") || ""].join(" | ")),
    ].join("\n");
}
