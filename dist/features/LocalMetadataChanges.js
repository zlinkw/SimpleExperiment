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
exports.LocalMetadataChanges = void 0;
const node_fs_1 = require("node:fs");
const node_child_process_1 = require("node:child_process");
const node_util_1 = require("node:util");
const path = __importStar(require("node:path"));
const SyncScopeStatus_1 = require("./SyncScopeStatus");
const drives = new Map();
async function fixedWindowsDrive(root, volume) {
    if (process.platform !== "win32" || !/^[a-z]:\\/i.test(root))
        return false;
    const drive = path.parse(root).root.toUpperCase();
    const key = drive + ":" + volume;
    let result = drives.get(key);
    if (!result) {
        // A mapped network drive cannot provide the same notification guarantees as a local volume.
        result = (0, node_util_1.promisify)(node_child_process_1.execFile)("pwsh.exe", ["-NoProfile", "-NonInteractive", "-Command",
            "$d=[IO.DriveInfo]::new($env:SIMPLEEX_INDEX_DRIVE); if($d.DriveType -eq 'Fixed' -and $d.DriveFormat -in @('NTFS','ReFS')){'LOCAL'}"], { windowsHide: true, timeout: 3000, encoding: "utf8", env: { ...process.env, SIMPLEEX_INDEX_DRIVE: drive } })
            .then(value => value.stdout.trim() === "LOCAL", () => false);
        drives.set(key, result);
        while (drives.size > 64)
            drives.delete(drives.keys().next().value);
    }
    return result;
}
/** A process-local change cursor, never restored from disk. Reloads/gaps reconcile all saved identities.
 * Native notifications accelerate browsing only; PLAN, hashes and destructive previews remain live reads.
 * See node:fs fs.watch caveats: errors, unknown names, remote volumes and root replacement fail closed. */
class LocalMetadataChanges {
    watcher;
    binding = "";
    attempted = false;
    gap = true;
    version = 0;
    dirty = new Set();
    lastReconciled = -Infinity;
    invalidate() { this.gap = true; this.version++; }
    close() { this.invalidate(); this.attempted = false; const watcher = this.watcher; this.watcher = undefined; watcher?.close(); }
    async start(root, identity, volume) {
        if (identity !== this.binding) {
            this.close();
            this.binding = identity;
        }
        if (this.attempted)
            return;
        this.attempted = true;
        if (!await fixedWindowsDrive(root, volume))
            return;
        try {
            const watcher = (0, node_fs_1.watch)(root, { recursive: true, persistent: false }, (_event, filename) => {
                if (!filename) {
                    this.invalidate();
                    return;
                }
                const name = filename.toString().replaceAll("\\", "/");
                if (name.length > 4096 || /[:\x00-\x1f]/.test(name) || name.split("/").some(p => !p || p === "." || p === "..")) {
                    this.invalidate();
                    return;
                }
                if (!(0, SyncScopeStatus_1.scopeInventoryPathAllowed)(name, true))
                    return;
                this.version++;
                if (this.dirty.size >= 10000) {
                    this.dirty.clear();
                    this.invalidate();
                }
                else
                    this.dirty.add(name);
            });
            this.watcher = watcher;
            watcher.on("error", () => this.close());
            watcher.on("close", () => { if (this.watcher === watcher)
                this.close(); });
        }
        catch {
            this.attempted = false;
            this.invalidate();
        }
    }
    async snapshot() {
        // Let ReadDirectoryChangesW completions reach JS before and after each active query.
        await new Promise(resolve => setTimeout(resolve, 5));
        return { version: this.version, dirty: new Set(this.dirty), native: !!this.watcher && !this.gap
                // Keep the defensive full sweep independent of the UI's 30-second browse round.
                // Otherwise every real folder expansion after an idle period degenerates to a full scan.
                && performance.now() - this.lastReconciled < 5 * 60 * 1000 };
    }
    async complete(snapshot, reconciled) {
        await new Promise(resolve => setTimeout(resolve, 5));
        if (snapshot.version !== this.version)
            throw Error("LOCAL_INDEX_DIRECTORY_CHANGED: notifications during validation");
        this.dirty.clear();
        if (reconciled && this.watcher) {
            this.gap = false;
            this.lastReconciled = performance.now();
        }
    }
}
exports.LocalMetadataChanges = LocalMetadataChanges;
