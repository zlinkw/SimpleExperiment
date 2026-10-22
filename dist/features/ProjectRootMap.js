"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalRemotePath = canonicalRemotePath;
exports.projectIdentityKey = projectIdentityKey;
exports.resolveProjectRootMap = resolveProjectRootMap;
exports.isMachineStateAbsolute = isMachineStateAbsolute;
exports.machineStateGuard = machineStateGuard;
exports.machineStateRelativePrefixes = machineStateRelativePrefixes;
exports.isUnderMachineStatePrefixes = isUnderMachineStatePrefixes;
const node_crypto_1 = require("node:crypto");
const POSIX_SEPARATOR = /[\\/]+/;
/** Canonical absolute remote path per the contract's accepted shapes (POSIX
 * absolute or a Windows drive root with either separator). Every segment is
 * normalized — separators unified, repeats collapsed, "." dropped and ".."
 * folded against the segment stack — and a mapping that would climb above the
 * filesystem/drive root, or that is relative or empty, is REJECTED instead of
 * being mapped to a surprising or empty prefix. Real physical-link checks stay
 * in the existing validation layer; this function only fixes spelling, never
 * resolves symlinks. */
function canonicalRemotePath(value) {
    const raw = String(value || "");
    if (/[\x00-\x1f]/.test(raw) || /^[\\/]{2}/.test(raw))
        return { ok: false, reason: "relative" };
    const text = raw.trim().replace(/\\/g, "/").replace(/\/{2,}/g, "/");
    if (!text)
        return { ok: false, reason: "empty" };
    let rootPrefix = "";
    let body = text;
    if (text.startsWith("/"))
        rootPrefix = "/";
    else if (/^[A-Za-z]:(\/|$)/.test(text)) {
        rootPrefix = text[0].toLowerCase() + ":/";
        body = text.slice(2);
    }
    else
        return { ok: false, reason: "relative" };
    const stack = [];
    for (const part of body.split("/")) {
        if (!part || part === ".")
            continue;
        if (part === "..") {
            if (!stack.length)
                return { ok: false, reason: "escaping" };
            stack.pop();
            continue;
        }
        stack.push(part);
    }
    const result = rootPrefix + stack.join("/");
    return { ok: true, path: rootPrefix === "/" ? result : result.toLowerCase() };
}
function normalizeRemotePath(value) {
    const canonical = canonicalRemotePath(value);
    return canonical.ok ? canonical.path : "";
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
    const unknownFields = [];
    const read = (field, raw, required) => {
        const text = String(raw || "").trim();
        if (!text) {
            // An absent optional root stays neutral; a missing REQUIRED code root
            // leaves the whole mapping unknown (nothing can be relative to it).
            if (required)
                unknownFields.push(field);
            return "";
        }
        const canonical = canonicalRemotePath(text);
        if (!canonical.ok) {
            unknownFields.push(field);
            return "";
        }
        return canonical.path;
    };
    const codeRoot = read("codeRoot", String(input.projectDir || ""), true);
    const programRoot = read("programRoot", String(input.installDir || ""), false);
    const explicitState = String(input.stateDir || "").trim();
    const stateRoot = explicitState
        ? read("stateRoot", explicitState, false)
        : (programRoot ? (programRoot === "/" ? "/state" : programRoot + "/state") : "");
    const artifactRoots = [...new Set((input.artifactDirs || []).reduce((acc, item) => {
            const text = String(item || "").trim();
            if (!text)
                return acc;
            const canonical = canonicalRemotePath(text);
            if (!canonical.ok) {
                unknownFields.push("artifactRoots");
                return acc;
            }
            acc.push(canonical.path);
            return acc;
        }, []))];
    const stateRoots = [...new Set([stateRoot, ...(input.machineStateDirs || []).map(value => read("machineStateDirs", value, true))].filter(Boolean))];
    return { identity: projectIdentityKey(input), programRoot, stateRoot, stateRoots, codeRoot, artifactRoots,
        mapping: unknownFields.length ? "unknown" : "resolved", unknownFields };
}
/** True when an absolute path lives under the mapped machine state root. */
function isMachineStateAbsolute(roots, target) {
    const canonical = canonicalRemotePath(target);
    if (!canonical.ok)
        return false; // invalid absolute targets are not "inside"; callers must not guess
    const text = canonical.path;
    return (roots.stateRoots || [roots.stateRoot]).some(stateRoot => stateRoot && sameRootSpace(text, stateRoot)
        && (text === stateRoot || text.startsWith(stateRoot.endsWith("/") ? stateRoot : stateRoot + "/")));
}
function posixRelative(fromRoot, target) {
    // Returns the code-root-relative form of an absolute state root, or null when
    // the state root lives OUTSIDE the code root (then no relative enumeration can
    // ever reach it and no relative exclusion is needed), or "" when they are equal
    // (a pathological mapping that covers the whole project; callers must treat
    // that as "everything under the code root is machine state"). Both inputs are
    // already canonical (folded, no "..", unified root spelling), so a plain
    // segment-prefix comparison is exact, and a drive root never compares equal
    // to a POSIX root.
    const base = fromRoot.split("/").filter(Boolean);
    const goal = target.split("/").filter(Boolean);
    const baseIsRoot = !base.length; // code root IS the filesystem/drive root
    if (!goal.length)
        return baseIsRoot ? "" : null; // state root at "/" under a deeper code root: outside
    let shared = 0;
    while (shared < base.length && shared < goal.length && base[shared] === goal[shared])
        shared += 1;
    if (!baseIsRoot) {
        if (shared < base.length)
            return null; // state not beneath the code root (different branch or ancestor)
        if (goal.length === base.length)
            return "";
        return goal.slice(base.length).join("/");
    }
    return goal.join("/");
}
/** Same root-space test used for containment: drive-letter roots and POSIX
 * roots are different spaces and never contain one another. */
function sameRootSpace(left, right) {
    return /^[a-z]:\//i.test(left) === /^[a-z]:\//i.test(right);
}
/**
 * Machine-state relative prefixes derived from the VERIFIED absolute mapping —
 * never from directory-name guessing. A project legitimately containing
 * work_dirs/run/state/projects/x keeps syncing (it is not under the mapped state
 * root), while a custom stateDir nested anywhere inside the code directory is
 * excluded exactly by its mapped prefix. An empty list means the state root is
 * outside the code root and relative enumeration cannot reach it.
 */
/** Full guard view: the derived relative prefixes PLUS whether the mapping is
 * unknown (an explicitly supplied root was invalid). Exclusion consumers may
 * use `prefixes`; any consumer that WRITES to or DELETES at a state-adjacent
 * location must consult `unknown` and fail closed instead of reading an empty
 * prefix list as "nothing is machine state here". */
function machineStateGuard(map) {
    const unknown = map.mapping === "unknown";
    const prefixes = [];
    for (const state of map.stateRoots || [map.stateRoot]) {
        if (!state || !map.codeRoot || !sameRootSpace(state, map.codeRoot))
            continue;
        // A code root nested in machine state is entirely protected too.
        const ancestor = posixRelative(state, map.codeRoot);
        const rel = ancestor !== null ? "" : posixRelative(map.codeRoot, state);
        if (rel !== null)
            prefixes.push(rel);
    }
    return { prefixes: [...new Set(prefixes)], unknown };
}
function machineStateRelativePrefixes(map) {
    return machineStateGuard(map).prefixes;
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
    // Relative callers include Windows aliases. Conservatively protect case
    // aliases on every endpoint instead of allowing a host-side casing change to
    // bypass a machine-state boundary (POSIX aliases may be over-protected).
    const rel = String(relative || "").replace(/\\/g, "/").split("/").filter(part => part.length > 0 && part !== ".").map(part => part.toLowerCase());
    if (rel.some(part => part === ".."))
        return includeAncestors; // unresolvable: fail closed for cleanup
    for (const raw of prefixes) {
        const prefix = String(raw || "").replace(/\\/g, "/").split("/").filter(part => part.length > 0 && part !== ".").map(part => part.toLowerCase());
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
