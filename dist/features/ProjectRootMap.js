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
exports.projectIdentityKey = projectIdentityKey;
exports.resolveProjectRootMap = resolveProjectRootMap;
exports.isMachineStateAbsolute = isMachineStateAbsolute;
exports.isMachineStateRelativePath = isMachineStateRelativePath;
const path = __importStar(require("node:path"));
const node_crypto_1 = require("node:crypto");
const POSIX_SEPARATOR = /[\\/]+/;
function normalizeRemotePath(value) {
    const text = String(value || "").trim().replace(/\\/g, "/").replace(/\/{2,}/g, "/");
    const lowered = /^[a-z]:\//i.test(text) ? text[0].toLowerCase() + text.slice(1) : text;
    return lowered.replace(/\/+$/, "") || lowered;
}
/** Stable project identity: an explicit id wins; otherwise the normalized root
 * path hashes identically across separator and drive-letter case drift. */
function projectIdentityKey(input) {
    const explicit = String(input.projectId || "").trim();
    if (explicit)
        return explicit;
    const root = normalizeRemotePath(String(input.projectDir || ""));
    return (0, node_crypto_1.createHash)("sha256").update(root).digest("hex");
}
/** Compatible read over the existing contract shapes; nothing is invented:
 * stateRoot defaults to <installDir>/state exactly like default_agent_state_dir
 * on the Agent, and artifact roots stay relative to the code root. */
function resolveProjectRootMap(input) {
    const codeRoot = normalizeRemotePath(String(input.projectDir || ""));
    const programRoot = normalizeRemotePath(String(input.installDir || ""));
    const stateRoot = normalizeRemotePath(String(input.stateDir || ""))
        || (programRoot ? path.posix.join(programRoot, "state") : "");
    const artifactRoots = [...new Set((input.artifactDirs || [])
            .map(item => normalizeRemotePath(String(item || "")))
            .filter(item => item.length > 0))];
    return { identity: projectIdentityKey(input), programRoot, stateRoot, codeRoot, artifactRoots };
}
/** True when an absolute path lives under the mapped machine state root. */
function isMachineStateAbsolute(roots, target) {
    const stateRoot = roots.stateRoot;
    if (!stateRoot)
        return false;
    const text = normalizeRemotePath(target);
    return text === stateRoot || text.startsWith(stateRoot + "/");
}
/**
 * Single source of truth for relative machine-state paths: the Agent writes
 * project state under <state>/projects/<namespace>/... and the shared GPU
 * collector writes worker state under <state>/workers/<namespace>/... . When an
 * older deployment nests the state dir inside the project directory these show
 * up as project-relative paths, so both the sync scope gate and the cleanup
 * classifier must treat them as machine state. The check is intentionally
 * conservative in the safe direction: a false positive only excludes a path
 * from sync/cleanup selection with an explicit reason; it never deletes or
 * rewrites anything. tmp/result, work_dirs/work_dir and the simple_cluster
 * allowlist keep their existing independent semantics untouched.
 */
function isMachineStateRelativePath(relative) {
    const parts = String(relative || "").replace(/\\/g, "/").split("/").filter(part => part.length > 0);
    for (let index = 0; index + 2 < parts.length; index += 1) {
        if (parts[index] === "state" && (parts[index + 1] === "projects" || parts[index + 1] === "workers"))
            return true;
    }
    return false;
}
