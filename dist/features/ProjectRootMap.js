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
exports.machineStateRelativePrefixes = machineStateRelativePrefixes;
exports.isUnderMachineStatePrefixes = isUnderMachineStatePrefixes;
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
function posixRelative(fromRoot, target) {
    // Returns the code-root-relative form of an absolute state root, or null when
    // the state root lives OUTSIDE the code root (then no relative enumeration can
    // ever reach it and no relative exclusion is needed), or "" when they are equal
    // (a pathological mapping that covers the whole project; callers must treat
    // that as "everything under the code root is machine state").
    const base = normalizeRemotePath(fromRoot).split("/").filter(Boolean);
    const goal = normalizeRemotePath(target).split("/").filter(Boolean);
    if (!goal.length)
        return null;
    let shared = 0;
    while (shared < base.length && shared < goal.length && base[shared] === goal[shared])
        shared += 1;
    if (!shared)
        return null;
    const up = base.length - shared;
    const rest = goal.slice(shared);
    if (up > 0)
        return null; // outside the code root on a different branch
    return rest.join("/");
}
/**
 * Machine-state relative prefixes derived from the VERIFIED absolute mapping —
 * never from directory-name guessing. A project legitimately containing
 * work_dirs/run/state/projects/x keeps syncing (it is not under the mapped state
 * root), while a custom stateDir nested anywhere inside the code directory is
 * excluded exactly by its mapped prefix. An empty list means the state root is
 * outside the code root and relative enumeration cannot reach it.
 */
function machineStateRelativePrefixes(map) {
    if (!map.stateRoot || !map.codeRoot)
        return [];
    const rel = posixRelative(map.codeRoot, map.stateRoot);
    if (rel === null)
        return [];
    return [rel];
}
/**
 * True when `relative` lies under one of the mapped machine-state prefixes.
 * With includeAncestors the reverse direction also matches: deleting an ANCESTOR
 * directory of the state root would destroy machine state, so cleanup must treat
 * it as protected too. tmp/result, work_dirs/work_dir and the simple_cluster
 * allowlist keep their existing independent semantics untouched: this predicate
 * only ever sees mapped absolute state roots, not path substrings.
 */
function isUnderMachineStatePrefixes(relative, prefixes, includeAncestors = false) {
    const rel = String(relative || "").replace(/\\/g, "/").split("/").filter(part => part.length > 0 && part !== ".");
    if (rel.some(part => part === ".."))
        return includeAncestors; // unresolvable: fail closed for cleanup
    for (const raw of prefixes) {
        const prefix = String(raw || "").replace(/\\/g, "/").split("/").filter(part => part.length > 0 && part !== ".");
        if (prefix.length === 0)
            return true; // the whole code root is the mapped state root
        const under = rel.length >= prefix.length && prefix.every((part, index) => rel[index] === part);
        if (under)
            return true;
        if (includeAncestors && rel.length < prefix.length && rel.every((part, index) => prefix[index] === part))
            return true;
    }
    return false;
}
