import * as path from "node:path";
import { createHash } from "node:crypto";

/**
 * Four-root map per stable project identity: program root (deployed runtime
 * install), machine state root (agent/collector state; never a scientific
 * artifact), code root (the synced project) and the declared artifact roots
 * (work_dirs/results style directories the plan declares). This module is a
 * compatible READ-ONLY view over the existing contract fields (projectDir /
 * installDir / stateDir as already carried by lifecycle contracts) plus the
 * declared output directories; it never moves, copies or deletes history and
 * never re-decides sync/cleanup semantics. The exclusion predicate here is the
 * single source of truth for "this relative path is machine state": the sync
 * scope gate and the cleanup classifier both consult it, so new machine state
 * (for example the shared GPU collector frames written under
 * <stateRoot>/workers/<namespace>/gpu_frame.json) can never be selected as a
 * scientific sync or cleanup candidate even when an older deployment nests the
 * state dir inside the project directory.
 */
export type ProjectRootMap = {
  identity: string;
  programRoot: string;
  stateRoot: string;
  codeRoot: string;
  artifactRoots: string[];
};

export type ProjectRootMapInput = {
  projectId?: string;
  projectDir?: string;
  installDir?: string;
  stateDir?: string;
  artifactDirs?: string[];
};

const POSIX_SEPARATOR = /[\\/]+/;

function normalizeRemotePath(value: string): string {
  const text = String(value || "").trim().replace(/\\/g, "/").replace(/\/{2,}/g, "/");
  const lowered = /^[a-z]:\//i.test(text) ? text[0].toLowerCase() + text.slice(1) : text;
  return lowered.replace(/\/+$/, "") || lowered;
}

/** Stable project identity: an explicit id wins; otherwise the normalized root
 * path hashes identically across separator and drive-letter case drift. */
export function projectIdentityKey(input: ProjectRootMapInput): string {
  const explicit = String(input.projectId || "").trim();
  if (explicit) return explicit;
  const root = normalizeRemotePath(String(input.projectDir || ""));
  return createHash("sha256").update(root).digest("hex");
}

/** Compatible read over the existing contract shapes; nothing is invented:
 * stateRoot defaults to <installDir>/state exactly like default_agent_state_dir
 * on the Agent, and artifact roots stay relative to the code root. */
export function resolveProjectRootMap(input: ProjectRootMapInput): ProjectRootMap {
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
export function isMachineStateAbsolute(roots: ProjectRootMap, target: string): boolean {
  const stateRoot = roots.stateRoot;
  if (!stateRoot) return false;
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
export function isMachineStateRelativePath(relative: string): boolean {
  const parts = String(relative || "").replace(/\\/g, "/").split("/").filter(part => part.length > 0);
  for (let index = 0; index + 2 < parts.length; index += 1) {
    if (parts[index] === "state" && (parts[index + 1] === "projects" || parts[index + 1] === "workers")) return true;
  }
  return false;
}
