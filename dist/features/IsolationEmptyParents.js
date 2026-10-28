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
exports.previewEmptyParents = previewEmptyParents;
exports.confirmEmptyParents = confirmEmptyParents;
exports.executeEmptyParents = executeEmptyParents;
const path = __importStar(require("node:path"));
const PlanCleanup_1 = require("./PlanCleanup");
async function current(ports, node) {
    if (ports.currentNode && (0, PlanCleanup_1.cleanupDigest)({ ...await ports.currentNode(node.id), error: undefined }) !== (0, PlanCleanup_1.cleanupDigest)({ ...node, error: undefined }))
        (0, PlanCleanup_1.cleanupError)("SERVER_IDENTITY_CHANGED");
}
async function previewEmptyParents(ports, preview, forReplacement) {
    if (preview.action !== "isolate")
        (0, PlanCleanup_1.cleanupError)("NOT_ISOLATED_OPERATION");
    const groups = new Map();
    for (const row of preview.rows.filter(row => row.disposition === "isolate")) {
        if (!row.backendToken || !row.rootIdentity || !/^clean_dir\/job-[a-f0-9]{48}\//.test(row.destination))
            (0, PlanCleanup_1.cleanupError)("INVALID_ISOLATION_BINDING");
        const key = (0, PlanCleanup_1.cleanupDigest)([row.node, row.destination.split("/")[1]]);
        const group = groups.get(key);
        if (group)
            group.push(row);
        else
            groups.set(key, [row]);
    }
    const result = [];
    for (const rows of groups.values()) {
        const node = rows[0].node;
        await current(ports, node);
        const sourceIsolationTokens = [...new Set(rows.map(row => row.backendToken))];
        const answer = await ports.sftp("files.cleanup.isolationParentsPreview", { isolationTokens: sourceIsolationTokens, forReplacement });
        if (answer?.eligible === false)
            continue;
        const allowed = new Set();
        const absolute = (relative) => node.kind === "local" ? path.join(node.root, relative) : path.posix.join(node.root, relative);
        for (const row of rows) {
            const parts = (0, PlanCleanup_1.cleanupRelative)(row.destination).split("/");
            parts.pop();
            while (parts.length >= 2) {
                allowed.add(absolute(parts.join("/")));
                parts.pop();
            }
        }
        const parents = Array.isArray(answer?.targets) ? answer.targets : [];
        const expected = [...parents.map((row) => row.absolutePath), ...(forReplacement ? [...new Set(rows.map(row => absolute(row.destination)))] : [])];
        if (answer?.isolationParentCleanup !== true || answer?.safety?.emptyDirectoriesOnly !== 1 || answer?.safety?.doubleConfirmation !== 1
            || answer?.safety?.parentCwdRequired !== 1 || (0, PlanCleanup_1.cleanupDigest)(answer.rootIdentity) !== (0, PlanCleanup_1.cleanupDigest)(rows[0].rootIdentity)
            || (0, PlanCleanup_1.cleanupDigest)(answer.sourceIsolationTokens) !== (0, PlanCleanup_1.cleanupDigest)(sourceIsolationTokens)
            || typeof answer.token !== "string" || typeof answer.digest !== "string" || !Array.isArray(answer.targets) || (!parents.length && !forReplacement)
            || parents.some((row) => row.type !== "directory" || !allowed.has(row.absolutePath))
            || new Set(parents.map((row) => row.absolutePath)).size !== parents.length
            || (0, PlanCleanup_1.cleanupDigest)(answer.confirmationPaths) !== (0, PlanCleanup_1.cleanupDigest)(expected))
            (0, PlanCleanup_1.cleanupError)("SFTP_EMPTY_PARENT_PROTOCOL_REQUIRED", "空目录清理需要 SimpleSFTP 0.2.116 的精确路径双确认协议；未执行删除。");
        result.push({ token: answer.token, digest: answer.digest, node, sourceIsolationTokens, confirmationPaths: expected,
            confirmations: 0, targets: parents.map((row) => ({ absolutePath: row.absolutePath, type: "directory" })),
            confirmationTargets: expected.map(absolutePath => ({ absolutePath,
                type: allowed.has(absolutePath) ? "directory" : rows.find(row => absolute(row.destination) === absolutePath).type })) });
    }
    return result;
}
async function confirmEmptyParents(ports, previews, phase) {
    for (const row of previews) {
        await current(ports, row.node);
        if (row.confirmations === phase)
            continue;
        await ports.sftp("files.cleanup.confirm", { token: row.token, digest: row.digest, phase, confirm: true, exactTargets: row.confirmationPaths });
        row.confirmations = phase;
    }
}
async function executeEmptyParents(ports, previews) {
    let removed = 0;
    for (const row of previews) {
        await current(ports, row.node);
        if (row.confirmations !== 2)
            (0, PlanCleanup_1.cleanupError)("CONFIRM_REQUIRED");
        const result = await ports.sftp("files.cleanup.execute", { token: row.token, digest: row.digest, index: 0 });
        if (result?.state !== "completed")
            (0, PlanCleanup_1.cleanupError)("EMPTY_PARENT_CLEANUP_UNVERIFIED");
        removed += Number(result.receipt?.emptyDirectoriesRemoved || 0);
    }
    return removed;
}
