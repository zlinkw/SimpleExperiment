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
exports.projectResultPublicationJournalPath = projectResultPublicationJournalPath;
exports.recoverProjectResultPublication = recoverProjectResultPublication;
exports.assertProjectResultPublicationBaseGeneration = assertProjectResultPublicationBaseGeneration;
exports.publishProjectResultFiles = publishProjectResultFiles;
const node_crypto_1 = require("node:crypto");
const fsNode = __importStar(require("node:fs"));
const node_fs_1 = require("node:fs");
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
const StateStore_1 = require("../state/StateStore");
const JOURNAL_RELATIVE = "simple_cluster/results/project_table_publication.json";
const STAGING_PARENT = "simple_cluster/tmp/result_publication";
const STAGING_DIRECTORY = `${STAGING_PARENT}/current`;
// Generic wrapper bundles include originals, provenance and views for many plans.
const MAX_FILES = 32768;
const MAX_JOURNAL_BYTES = 32 * 1024 * 1024;
const publicationQueues = new Map();
function serializePublication(root, operation) {
    const key = path.resolve(root).toLowerCase();
    const previous = publicationQueues.get(key) || Promise.resolve();
    const work = previous.catch(() => undefined).then(operation);
    const settled = work.then(() => undefined, () => undefined);
    publicationQueues.set(key, settled);
    void settled.then(() => { if (publicationQueues.get(key) === settled)
        publicationQueues.delete(key); });
    return work;
}
function projectResultPublicationJournalPath(root) {
    return path.join(root, ...JOURNAL_RELATIVE.split("/"));
}
function digest(value) {
    return (0, node_crypto_1.createHash)("sha256").update(value).digest("hex");
}
function retryableRenameError(error) {
    return ["EBUSY", "EACCES", "EPERM", "ENOTEMPTY"].includes(String(error?.code || "").toUpperCase());
}
async function renameWithRetry(rename, source, target) {
    let lastError;
    for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
            await rename(source, target);
            return;
        }
        catch (error) {
            lastError = error;
            if (process.platform !== "win32" || !retryableRenameError(error) || attempt === 4)
                throw error;
            await new Promise(resolve => setTimeout(resolve, 20 * (attempt + 1)));
        }
    }
    throw lastError;
}
function safeRelative(root, relative) {
    const parts = String(relative || "").replace(/\\/g, "/").split("/");
    if (!parts.length || parts.some(part => !part || part === "." || part === "..") || path.posix.isAbsolute(String(relative || "")) || /^[A-Za-z]:/.test(String(relative || "")))
        throw new Error("结果发布路径无效：" + relative);
    const full = path.resolve(root, ...parts);
    const fromRoot = path.relative(root, full);
    if (!fromRoot || fromRoot.startsWith("..") || path.isAbsolute(fromRoot))
        throw new Error("结果发布路径超出项目根目录：" + relative);
    return full;
}
function safeResultDirectory(value) {
    const text = String(value || "").replace(/\\/g, "/");
    if (!text || path.posix.isAbsolute(text) || /^[A-Za-z]:/.test(text) || text.split("/").some(part => !part || part === "." || part === ".."))
        throw new Error("结果发布目录无效：" + value);
    return text;
}
function assertAllowedTarget(relative, resultDirectory) {
    if (relative !== "simple_cluster/results/project_table_registry.json" && !relative.startsWith(resultDirectory + "/"))
        throw new Error("结果发布事务包含目录外目标：" + relative);
}
async function verifyPath(root, relative, allowMissingLeaf = true, expectedLeaf = "file") {
    const full = safeRelative(root, relative);
    const parts = path.relative(root, full).split(path.sep);
    let current = root;
    for (const [index, part] of parts.entries()) {
        current = path.join(current, part);
        const stat = await fs.lstat(current).catch(error => error?.code === "ENOENT" ? undefined : Promise.reject(error));
        if (!stat) {
            if (index === parts.length - 1 && !allowMissingLeaf)
                throw new Error("结果发布文件缺失：" + relative);
            continue;
        }
        if (stat.isSymbolicLink() || (index < parts.length - 1 && !stat.isDirectory())
            || (index === parts.length - 1 && (expectedLeaf === "directory" ? !stat.isDirectory() : !stat.isFile())))
            throw new Error("结果发布路径含符号链接或非预期文件类型：" + relative);
    }
    return full;
}
async function writeSlotDurable(fullPath, write) {
    let existing;
    try {
        existing = await fs.lstat(fullPath);
    }
    catch (error) {
        if (error?.code !== "ENOENT")
            throw error;
    }
    if (existing && (!existing.isFile() || existing.isSymbolicLink() || existing.nlink > 1))
        throw new Error(`结果发布固定暂存槽不是普通独占文件：${fullPath}`);
    const flags = fsNode.constants.O_WRONLY | fsNode.constants.O_CREAT | (fsNode.constants.O_NOFOLLOW || 0);
    const handle = await fs.open(fullPath, flags, 0o600);
    try {
        const opened = await handle.stat();
        const current = await fs.lstat(fullPath);
        if (!opened.isFile() || opened.nlink > 1 || current.isSymbolicLink() || !current.isFile() || current.nlink > 1
            || Boolean(existing?.dev && existing.ino && opened.dev && opened.ino && (existing.dev !== opened.dev || existing.ino !== opened.ino))
            || Boolean(current.dev && current.ino && opened.dev && opened.ino && (current.dev !== opened.dev || current.ino !== opened.ino)))
            throw new Error(`结果发布固定暂存槽身份发生变化：${fullPath}`);
        await handle.truncate(0);
        await write(handle);
        await handle.sync();
    }
    finally {
        await handle.close();
    }
}
function writeFileDurable(fullPath, contents) {
    return writeSlotDurable(fullPath, handle => handle.writeFile(contents, "utf8"));
}
function copyFileDurable(source, target) {
    return writeSlotDurable(target, async (handle) => {
        for await (const chunk of (0, node_fs_1.createReadStream)(source)) {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            let offset = 0;
            while (offset < buffer.length) {
                const { bytesWritten } = await handle.write(buffer, offset, buffer.length - offset);
                if (!bytesWritten)
                    throw new Error("结果发布备份写入未取得进展。");
                offset += bytesWritten;
            }
        }
    });
}
async function syncDirectory(fullPath) {
    try {
        const handle = await fs.open(fullPath, "r");
        try {
            await handle.sync();
        }
        finally {
            await handle.close();
        }
    }
    catch { /* Directory fsync is unavailable on some supported platforms. */ }
}
async function writeJournal(root, journal) {
    const target = await verifyPath(root, JOURNAL_RELATIVE);
    const text = JSON.stringify(journal);
    if (Buffer.byteLength(text) > MAX_JOURNAL_BYTES)
        throw new Error("结果发布事务记录过大，未推进发布。");
    await (0, StateStore_1.atomicWriteText)(target, text, { renameRetryBudgetMs: process.platform === "win32" ? 5000 : undefined });
}
async function readJournal(root) {
    const full = await verifyPath(root, JOURNAL_RELATIVE);
    const stat = await fs.lstat(full).catch(error => error?.code === "ENOENT" ? undefined : Promise.reject(error));
    if (!stat)
        return undefined;
    if (stat.size > MAX_JOURNAL_BYTES)
        throw new Error("结果发布事务记录过大，拒绝自动恢复。");
    const value = JSON.parse(await fs.readFile(full, "utf8"));
    if (value?.schemaVersion !== 1 || !/^[a-f0-9-]{36}$/i.test(String(value.id || "")) || !Array.isArray(value.entries) || !value.entries.length || value.entries.length > MAX_FILES || !["preparing", "publishing", "committed", "rolled-back"].includes(value.status))
        throw new Error("结果发布事务记录无效，保留现有文件并停止恢复。");
    if (typeof value.resultDirectory !== "string")
        throw new Error("结果发布事务目录无效。");
    for (const [index, entry] of value.entries.entries()) {
        if (!entry || typeof entry.target !== "string" || typeof entry.staged !== "string" || typeof entry.backup !== "string"
            || !/^[a-f0-9]{64}$/.test(String(entry.nextHash || "")) || typeof entry.hadPrevious !== "boolean")
            throw new Error("结果发布事务条目无效。");
        const legacyStaging = `${STAGING_PARENT}/${value.id}`;
        const currentSlot = STAGING_DIRECTORY;
        if (!([`${legacyStaging}/${index}.new`, `${currentSlot}/${index}.new`].includes(entry.staged))
            || !([`${legacyStaging}/${index}.old`, `${currentSlot}/${index}.old`].includes(entry.backup))
            || (entry.staged.startsWith(legacyStaging + "/") !== entry.backup.startsWith(legacyStaging + "/")))
            throw new Error("结果发布事务暂存路径不属于当前事务，拒绝清理。");
        safeRelative(root, entry.target);
        safeRelative(root, entry.staged);
        safeRelative(root, entry.backup);
        if (entry.hadPrevious && !/^[a-f0-9]{64}$/.test(String(entry.previousHash || "")))
            throw new Error("结果发布备份指纹无效。");
    }
    return value;
}
// Fixed slots and the last settled journal are bounded recovery state, not
// cleanup targets. Successful rename consumes .new; the next transaction
// reuses .old. Legacy random slots remain available for explicit inspection.
async function hashAt(root, relative) {
    const full = await verifyPath(root, relative);
    const hash = (0, node_crypto_1.createHash)("sha256");
    try {
        await new Promise((resolve, reject) => {
            const stream = (0, node_fs_1.createReadStream)(full);
            stream.on("data", chunk => hash.update(chunk));
            stream.on("error", reject);
            stream.on("end", resolve);
        });
        return hash.digest("hex");
    }
    catch (error) {
        if (error?.code === "ENOENT")
            return undefined;
        throw error;
    }
}
async function rollback(root, journal, rename) {
    for (const entry of [...journal.entries].reverse()) {
        const targetHash = await hashAt(root, entry.target);
        if (entry.hadPrevious) {
            if (targetHash === entry.previousHash)
                continue;
            const backupHash = await hashAt(root, entry.backup);
            if (backupHash !== entry.previousHash)
                throw new Error("结果发布无法从备份恢复：" + entry.target);
            const target = await verifyPath(root, entry.target);
            const backup = await verifyPath(root, entry.backup, false);
            await renameWithRetry(rename, backup, target);
        }
        else if (targetHash === entry.nextHash) {
            const target = await verifyPath(root, entry.target, false);
            const staged = await verifyPath(root, entry.staged);
            await renameWithRetry(rename, target, staged);
        }
        else if (targetHash !== undefined) {
            throw new Error("结果发布目标在事务期间被其他操作修改：" + entry.target);
        }
    }
}
async function validateRegistryGeneration(root, journal) {
    const entry = journal.entries.find(item => item.target === "simple_cluster/results/project_table_registry.json");
    if (!entry)
        return;
    const targetHash = await hashAt(root, entry.target);
    const relative = targetHash === entry.nextHash ? entry.target : entry.staged;
    if (await hashAt(root, relative) !== entry.nextHash)
        throw new Error("结果发布 generation 注册表缺失或校验失败。");
    const registry = JSON.parse(await fs.readFile(await verifyPath(root, relative, false), "utf8"));
    if (registry?.schemaVersion !== 1 || !registry.plans || typeof registry.plans !== "object" || registry.publicationGeneration !== journal.id)
        throw new Error("结果发布 generation 注册表身份不匹配。");
}
async function recoverProjectResultPublicationUnlocked(root, resultDirectory, options = {}) {
    const allowedDirectory = safeResultDirectory(resultDirectory);
    const rename = options.rename || fs.rename;
    const journal = await readJournal(root);
    if (!journal)
        return "clean";
    if (safeResultDirectory(journal.resultDirectory) !== allowedDirectory)
        throw new Error("结果发布事务与当前结果目录设置不一致，保留事务供人工检查。");
    for (const [index, entry] of journal.entries.entries()) {
        assertAllowedTarget(entry.target, allowedDirectory);
        if (entry.target === "simple_cluster/results/project_table_registry.json" && index !== journal.entries.length - 1)
            throw new Error("结果发布事务的注册表必须是最后提交的 generation 标记。");
    }
    if (journal.status === "committed" || journal.status === "rolled-back")
        return "clean";
    if (journal.status === "preparing") {
        journal.status = "rolled-back";
        await writeJournal(root, journal);
        return "rolled-back";
    }
    try {
        await validateRegistryGeneration(root, journal);
        for (const entry of journal.entries) {
            if (await hashAt(root, entry.target) === entry.nextHash)
                continue;
            if (await hashAt(root, entry.staged) !== entry.nextHash)
                throw new Error("结果发布暂存文件缺失或损坏：" + entry.target);
            const target = await verifyPath(root, entry.target);
            const staged = await verifyPath(root, entry.staged, false);
            await fs.mkdir(path.dirname(target), { recursive: true });
            await renameWithRetry(rename, staged, target);
            await syncDirectory(path.dirname(target));
        }
        journal.status = "committed";
        await writeJournal(root, journal);
    }
    catch (publishError) {
        await rollback(root, journal, rename);
        journal.status = "rolled-back";
        await writeJournal(root, journal);
        return "rolled-back";
    }
    return "recovered";
}
function recoverProjectResultPublication(root, resultDirectory, options = {}) {
    return serializePublication(root, () => recoverProjectResultPublicationUnlocked(root, resultDirectory, options));
}
async function assertProjectResultPublicationBaseGeneration(root, expectedGeneration) {
    const relative = "simple_cluster/results/project_table_registry.json";
    const full = await verifyPath(root, relative);
    const source = await fs.readFile(full, "utf8").catch(error => error?.code === "ENOENT" ? "" : Promise.reject(error));
    let actual = "";
    if (source) {
        const registry = JSON.parse(source);
        if (registry?.schemaVersion !== 1 || !registry.plans || typeof registry.plans !== "object")
            throw new Error("全项目结果注册表格式无效，拒绝覆盖。");
        actual = String(registry.publicationGeneration || "");
    }
    const expected = String(expectedGeneration || "");
    if (actual !== expected) {
        const error = new Error("结果表已在另一窗口更新；本次基于旧注册表的写入已拒绝，请刷新后重试。");
        error.code = "RESULT_REGISTRY_CONFLICT";
        throw error;
    }
}
function publishProjectResultFiles(root, resultDirectory, files, options = {}) {
    return serializePublication(root, async () => {
        if (!Array.isArray(files) || !files.length || files.length > MAX_FILES)
            throw new Error("结果发布文件数无效（上限 " + MAX_FILES + "）。");
        const allowedDirectory = safeResultDirectory(resultDirectory);
        const rename = options.rename || fs.rename;
        const recovered = await recoverProjectResultPublicationUnlocked(root, allowedDirectory, options);
        const id = String(options.generationId || (0, node_crypto_1.randomUUID)());
        if (!/^[a-f0-9-]{36}$/i.test(id))
            throw new Error("结果发布 generationId 无效。");
        const stagingDirectory = STAGING_DIRECTORY;
        const entries = [];
        const seen = new Set();
        const changed = [], unchanged = [];
        const registryInput = files.findIndex(file => file.relativePath === "simple_cluster/results/project_table_registry.json");
        if (registryInput >= 0 && registryInput !== files.length - 1)
            throw new Error("结果注册表必须是最后提交的 generation 标记。");
        if (registryInput >= 0) {
            const registry = JSON.parse(files[registryInput].contents.toString());
            if (registry?.schemaVersion !== 1 || !registry.plans || typeof registry.plans !== "object" || registry.publicationGeneration !== id)
                throw new Error("结果注册表 generation 与发布事务不一致。");
        }
        for (const file of files) {
            const targetRelative = String(file.relativePath || "").replace(/\\/g, "/");
            assertAllowedTarget(targetRelative, allowedDirectory);
            const targetKey = targetRelative.toLowerCase();
            if (seen.has(targetKey))
                throw new Error("结果发布包含重复目标：" + targetRelative);
            seen.add(targetKey);
            await verifyPath(root, targetRelative);
            const targetHash = await hashAt(root, targetRelative);
            const nextHash = digest(file.contents);
            if (targetHash === nextHash) {
                unchanged.push({ target: targetRelative, hash: nextHash });
                continue;
            }
            const staged = `${stagingDirectory}/${entries.length}.new`;
            const backup = `${stagingDirectory}/${entries.length}.old`;
            entries.push({ target: targetRelative, staged, backup, hadPrevious: targetHash !== undefined, nextHash, ...(targetHash ? { previousHash: targetHash } : {}) });
            changed.push(file);
        }
        if (!entries.length)
            return { generationId: id, recoveredPrevious: recovered !== "clean", cleanupPending: false };
        files = changed;
        const journal = { schemaVersion: 1, id, resultDirectory: allowedDirectory, status: "preparing", entries };
        const stagingPath = await verifyPath(root, stagingDirectory, true, "directory");
        await fs.mkdir(path.dirname(stagingPath), { recursive: true });
        await fs.mkdir(stagingPath, { recursive: true });
        await writeJournal(root, journal);
        try {
            for (const [index, file] of files.entries()) {
                const entry = entries[index];
                const staged = await verifyPath(root, entry.staged);
                const target = await verifyPath(root, entry.target);
                const backup = await verifyPath(root, entry.backup);
                await fs.mkdir(path.dirname(target), { recursive: true });
                await writeFileDurable(staged, file.contents);
                if (entry.hadPrevious) {
                    await copyFileDurable(target, backup);
                    if (await hashAt(root, entry.backup) !== entry.previousHash)
                        throw new Error("结果发布备份校验失败：" + entry.target);
                }
            }
            await syncDirectory(stagingPath);
            for (const file of unchanged)
                if (await hashAt(root, file.target) !== file.hash)
                    throw new Error("复用的结果在发布期间变化：" + file.target);
            journal.status = "publishing";
            await writeJournal(root, journal);
            for (const entry of entries) {
                if (await hashAt(root, entry.staged) !== entry.nextHash)
                    throw new Error("结果发布暂存校验失败：" + entry.target);
                const target = await verifyPath(root, entry.target);
                const staged = await verifyPath(root, entry.staged, false);
                await renameWithRetry(rename, staged, target);
                await syncDirectory(path.dirname(target));
            }
            journal.status = "committed";
            await writeJournal(root, journal);
        }
        catch (error) {
            // All targets, including the generation marker, are already committed. Leave the
            // on-disk publishing journal recoverable if its final status write was locked.
            if (journal.status === "committed")
                throw error;
            if (journal.status === "publishing")
                await rollback(root, journal, rename);
            journal.status = "rolled-back";
            await writeJournal(root, journal);
            throw error;
        }
        return { generationId: id, recoveredPrevious: recovered !== "clean", cleanupPending: false };
    });
}
