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
exports.managedWriteBitsAllowed = managedWriteBitsAllowed;
exports.projectManagedRoot = projectManagedRoot;
exports.projectStateDir = projectStateDir;
exports.projectCacheDir = projectCacheDir;
exports.projectLogsDir = projectLogsDir;
exports.projectTmpDir = projectTmpDir;
exports.projectLocksDir = projectLocksDir;
exports.projectManagedDirs = projectManagedDirs;
exports.projectStateFile = projectStateFile;
exports.projectStateId = projectStateId;
exports.ensureProjectManagedDirectory = ensureProjectManagedDirectory;
exports.ensureProjectManagedCacheFileDirectory = ensureProjectManagedCacheFileDirectory;
exports.ensureProjectDirectorySnapshotsMigrated = ensureProjectDirectorySnapshotsMigrated;
exports.withProjectStateMigrationLease = withProjectStateMigrationLease;
exports.releaseMigratedProjectSnapshotRecord = releaseMigratedProjectSnapshotRecord;
exports.ensureProjectSnapshotMigrated = ensureProjectSnapshotMigrated;
exports.projectTempName = projectTempName;
exports.releaseProjectTempPath = releaseProjectTempPath;
const crypto = __importStar(require("node:crypto"));
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
const HostOperationLease_1 = require("../core/HostOperationLease");
/** POSIX write bits only govern macOS/Linux; Windows st_mode carries no NTFS ACL semantics, so
 * the bit rule is platform-aware (parent r17 返修: a Mac-only permission rule must NEVER reject
 * a Windows project-state write). Real ACL/POSIX enforcement stays platform-native acceptance. */
function managedWriteBitsAllowed(mode, platform) {
    return platform === "win32" || (mode & 0o022) === 0;
}
function projectManagedRoot(projectRoot) {
    // An empty root NEVER falls back to cwd or any shared folder — derivation fails closed.
    if (!String(projectRoot || "").trim())
        throw Error("缺少有效项目根，未推导项目路径。");
    // r17 返修#1: consumed-project roots are runtime-absolute. A RELATIVE root would let the same
    // logical project derive different trees from different cwds, breaking per-project isolation
    // (清理A触不到B). Only the legacy identity algorithm below keeps path.resolve semantics.
    if (!path.isAbsolute(projectRoot))
        throw Error("项目根必须是运行时已解析的绝对路径，未推导项目路径。");
    return path.join(projectRoot, "simple_cluster");
}
function managedSubdir(projectRoot, bucket, plugin) {
    return path.join(projectManagedRoot(projectRoot), bucket, plugin);
}
function projectStateDir(projectRoot, plugin) {
    return managedSubdir(projectRoot, "state", plugin);
}
function projectCacheDir(projectRoot, plugin) {
    return managedSubdir(projectRoot, "cache", plugin);
}
function projectLogsDir(projectRoot, plugin) {
    return managedSubdir(projectRoot, "logs", plugin);
}
function projectTmpDir(projectRoot, plugin) {
    return managedSubdir(projectRoot, "tmp", plugin);
}
function projectLocksDir(projectRoot, plugin) {
    return managedSubdir(projectRoot, "locks", plugin);
}
/** Every plugin-managed subtree for one project; consumed by the machine-state guard so
 * these paths never enter code-sync scopes as ordinary local differences. */
function projectManagedDirs(projectRoot) {
    // Empty/relative roots stay neutral for the machine-state guard (it never guesses a cwd), and
    // an absolute-but-invalid root is impossible here: derivation shares the same root contract.
    if (!String(projectRoot || "").trim() || !path.isAbsolute(projectRoot))
        return [];
    const plugins = ["simple-experiment", "simple-sftp"];
    const dirs = [];
    for (const plugin of plugins)
        dirs.push(projectStateDir(projectRoot, plugin), projectCacheDir(projectRoot, plugin), projectLogsDir(projectRoot, plugin), projectTmpDir(projectRoot, plugin), projectLocksDir(projectRoot, plugin));
    return dirs;
}
function projectStateFile(projectRoot, plugin, group, fileName) {
    return path.join(projectStateDir(projectRoot, plugin), group, fileName);
}
/** Same identity derivation the legacy globalStorage layout used (win32 case-folded). */
function projectStateId(projectRoot) {
    const resolved = path.resolve(projectRoot);
    return crypto.createHash("sha256")
        .update(process.platform === "win32" ? resolved.toLowerCase() : resolved).digest("hex");
}
/** r17 返修#2: every managed segment under the project root must be a REAL directory created
 * level by level — never a recursive mkdir through a symlink/junction. A linked managed tree
 * would write THIS project's facts into another project (cross-root), which the per-project
 * cleanup-isolation contract refuses outright. Managed segments also reject group/other write
 * bits (any group member could swap a subtree for a link between checks) — on POSIX only;
 * Windows st_mode does not carry ACL semantics, so the bit rule is platform-aware there. */
async function ensureRealManagedDirectory(dir) {
    try {
        await fs.mkdir(dir, { mode: 0o700 });
    }
    catch (error) {
        if (error?.code !== "EEXIST")
            throw error;
    }
    const stat = await fs.lstat(dir);
    if (stat.isSymbolicLink() || !stat.isDirectory())
        throw Error("项目受管目录不得为链接或非目录：" + dir);
    if (!managedWriteBitsAllowed(stat.mode, process.platform))
        throw Error("项目受管目录允许组/其他用户写入：" + dir);
}
async function ensureProjectManagedDirectory(projectRoot, targetDir) {
    const managedRoot = projectManagedRoot(projectRoot);
    const relative = path.relative(managedRoot, targetDir);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative))
        throw Error("迁移目标不在项目受管子树内。");
    let current = managedRoot;
    await ensureRealManagedDirectory(current);
    for (const part of relative.split(path.sep)) {
        current = path.join(current, part);
        await ensureRealManagedDirectory(current);
    }
}
/** r18#5: recomputable per-project caches (code manifest / scope hash) now live INSIDE the
 * consumed project's cache bucket. Their writers pass through this guard: a cache file derived
 * from this project's managed tree gets the same segment-by-segment link/write-bit protection as
 * every other managed write (a symlinked simple_cluster fails closed); a cache path outside this
 * project's managed tree (legacy fixture, arbitrary temp root) is not a project-managed write
 * and keeps its original behavior — it is never silently rewritten into another location. */
async function ensureProjectManagedCacheFileDirectory(projectRoot, cacheFile) {
    const managedRoot = projectManagedRoot(projectRoot);
    if (!path.isAbsolute(cacheFile) || !cacheFile.startsWith(managedRoot + path.sep))
        return;
    await ensureProjectManagedDirectory(projectRoot, path.dirname(cacheFile));
}
/** Delete ONLY a temp this call actually created; a failed delete is reported as-is — an
 * unconditional swallowed rm would claim a clean tree that still holds in-flight bytes. */
async function releaseOwnTemp(created, temp) {
    if (!created)
        return;
    await fs.rm(temp, { force: true });
}
/** Byte-exact one-time copy of whitelisted record files from a KNOWN legacy directory.
 * No business parsing: each copied file keeps its original bytes so the reader keeps its
 * own corrupt-state error semantics. Per-file hard-link publish makes two windows migrating
 * concurrently unable to clobber each other; files already at the target win.
 * r17 返修#3 (journal protocol superseded by parent r18): the completion fact is PERSISTED (one
 * fixed file per directory group — never a per-token tombstone) AND the whole
 * check→import→publish window is serialized on the project's EXISTING cross-process resource
 * lease (HostOperationLease, same withPluginStateFileLease scope formula project=dirname(marker),
 * target=marker). A marker EEXIST can never "continue" a second import, a mid-import failure can
 * never mark done, and a terminal-state release taking the SAME marker scope cannot delete while
 * any import is in flight — so a released record cannot be resurrected by a fresh host or a
 * second window. The lease is bounded (TTL + verified stale takeover), no pid/heartbeat guessing. */
async function ensureProjectDirectorySnapshotsMigrated(projectRoot, legacyDir, targetDir, fileNamePattern, markerFile, onFilePublished) {
    if (!markerFile)
        return await migrateDirectorySnapshotOnce(projectRoot, legacyDir, targetDir, fileNamePattern, onFilePublished);
    return await withProjectStateMigrationLease(projectRoot, markerFile, "project-state-migrate", "导入项目旧快照记录", async () => {
        await ensureProjectManagedDirectory(projectRoot, path.dirname(markerFile));
        if (await fs.stat(markerFile).catch(() => undefined))
            return; // completion re-check INSIDE the lease
        await migrateDirectorySnapshotOnce(projectRoot, legacyDir, targetDir, fileNamePattern, onFilePublished);
        await publishMigrationMarker(markerFile); // only reachable when every whitelisted file completed
    });
}
/** Same scope formula as the host's withPluginStateFileLease (legacy.ts) so migration, release
 * and any marker-scoped work serialize on ONE lease per (project, marker) group, cross-window. */
async function withProjectStateMigrationLease(projectRoot, markerFile, actionType, actionLabel, work) {
    return await new HostOperationLease_1.HostOperationLeaseManager().run({
        pluginId: "simple-local.simple-experiment",
        workspaceUri: String(projectRoot),
        hostProjectPath: projectRoot,
        actionType, actionLabel, waitForConflict: true,
        resources: [{ server: "local", project: path.dirname(markerFile), target: markerFile }],
    }, work);
}
/** Release one migrated record ONLY inside the same marker scope and only when the completion
 * fact exists; a missing marker means an import may still run — refuse, never guess. */
async function releaseMigratedProjectSnapshotRecord(projectRoot, markerFile, recordFile) {
    return await withProjectStateMigrationLease(projectRoot, markerFile, "project-state-release", "释放已迁移的项目记录", async () => {
        if (!await fs.stat(markerFile).catch(() => undefined))
            return "pending-migration";
        try {
            await fs.rm(recordFile);
            return "released";
        }
        catch (error) {
            if (error?.code === "ENOENT")
                return "not-found";
            throw error;
        }
    });
}
async function migrateDirectorySnapshotOnce(projectRoot, legacyDir, targetDir, fileNamePattern, onFilePublished) {
    let names;
    try {
        names = await fs.readdir(legacyDir);
    }
    catch (error) {
        if (error?.code === "ENOENT")
            return;
        throw error;
    }
    await ensureProjectManagedDirectory(projectRoot, targetDir);
    for (const name of names.filter(entry => fileNamePattern.test(entry))) {
        const temp = path.join(targetDir, `.migrating-${process.pid}-${Math.random().toString(36).slice(2, 10)}.tmp`);
        let created = false;
        try {
            // COPYFILE_EXCL: never reuse a surviving temp of any kind (own or foreign).
            await fs.copyFile(path.join(legacyDir, name), temp, fs.constants.COPYFILE_EXCL);
            created = true;
            try {
                await fs.link(temp, path.join(targetDir, name));
            }
            catch (error) {
                if (error?.code !== "EEXIST")
                    throw error;
            }
        }
        finally {
            await releaseOwnTemp(created, temp);
        }
        if (onFilePublished)
            await onFilePublished(name); // test seam: controllable scheduling INSIDE the lease
    }
}
async function publishMigrationMarker(markerFile) {
    if (!markerFile)
        return;
    try {
        await fs.writeFile(markerFile, JSON.stringify({ schemaVersion: 1, migratedAt: new Date().toISOString() }) + "\n", { flag: "wx" });
    }
    catch (error) {
        if (error?.code !== "EEXIST")
            throw error; // another window finished the same one-time import
    }
}
/**
 * One-time, race-safe copy of a KNOWN legacy snapshot into the project location.
 * - New file present (even mid-write elsewhere): never overwrite; the new value wins.
 * - Legacy missing: absent. Legacy unreadable as JSON: invalid-legacy is REPORTED so the
 *   caller keeps the original corrupt-state error semantics instead of a silent empty.
 * - Atomic publish without truncation: content lands in a same-directory temp file and is
 *   hard-linked onto the target; link() fails with EEXIST when another window published
 *   first, so two windows migrating at once cannot clobber each other.
 * The legacy file is only ever read; it is never modified, truncated, or deleted.
 */
async function ensureProjectSnapshotMigrated(projectRoot, legacyFile, targetFile, validate) {
    try {
        await fs.lstat(targetFile);
        return "present";
    }
    catch (error) {
        if (error?.code !== "ENOENT")
            throw error;
    }
    let text;
    try {
        text = await fs.readFile(legacyFile, "utf8");
    }
    catch (error) {
        if (error?.code === "ENOENT")
            return "absent";
        throw error;
    }
    let value;
    try {
        value = JSON.parse(text);
    }
    catch {
        return "invalid-legacy";
    }
    if (validate && !validate(value))
        return "invalid-legacy";
    await ensureProjectManagedDirectory(projectRoot, path.dirname(targetFile));
    const temp = path.join(path.dirname(targetFile), `.migrating-${process.pid}-${Math.random().toString(36).slice(2, 10)}.json`);
    let created = false;
    try {
        await fs.writeFile(temp, text, { flag: "wx" }); // exclusive: never reuse any surviving temp file
        created = true;
        try {
            await fs.link(temp, targetFile);
        }
        catch (error) {
            if (error?.code === "EEXIST")
                return "present";
            throw error;
        }
        return "migrated";
    }
    finally {
        await releaseOwnTemp(created, temp);
    }
}
/** Temp names for plugin-owned in-flight files; deletion is only ever attempted on paths
 * THIS call built (unique random suffix, exact directory), never on a scan result. */
function projectTempName(prefix) {
    return `${prefix}-${process.pid}-${Math.random().toString(36).slice(2, 10)}`;
}
/** Best-effort release of ONE path this operation created. Ownership (that we created
 * this exact path) is the caller's precondition; anything else must not call this. */
async function releaseProjectTempPath(exactPath) {
    await fs.rm(exactPath, { force: true });
}
