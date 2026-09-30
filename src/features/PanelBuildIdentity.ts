import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

export type PanelBuildFile = "extension" | "panel" | "recovery";
export type PanelBuildFileStats = { size: number; mtimeMs: number } | null;
export type PanelBuildIdentity = {
  version: string;
  fingerprint: string;
  files: Record<PanelBuildFile, string>;
  stats: { package: PanelBuildFileStats } & Record<PanelBuildFile, PanelBuildFileStats>;
  exists: boolean;
};
export type PanelBuildRegistryState = "match" | "version_mismatch" | "content_mismatch" | "unknown" | "extension_missing";

const FILES: Record<PanelBuildFile, string> = {
  extension: "dist/extension.js",
  panel: "dist/ui/PanelHtml.js",
  recovery: "dist/ui/PanelRecoveryHtml.js",
};

type PanelBuildFs = Pick<typeof fs, "statSync" | "readFileSync">;

function statFile(file: string, fsApi: PanelBuildFs): PanelBuildFileStats {
  try {
    const stat = fsApi.statSync(file);
    return { size: Number(stat.size), mtimeMs: Number(stat.mtimeMs) };
  } catch {
    return null;
  }
}

function sameStats(left: PanelBuildFileStats, right: PanelBuildFileStats): boolean {
  return left === null ? right === null : Boolean(right && left.size === right.size && left.mtimeMs === right.mtimeMs);
}

function digest(content: Buffer | string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function computeFingerprint(version: string, files: Record<PanelBuildFile, string>): string {
  return digest([version, ...(["extension", "panel", "recovery"] as PanelBuildFile[]).map((key) => `${key}:${files[key]}`)].join("\n"));
}

/** Reads an installed build, reusing hashes whenever size and mtime are unchanged. */
export function readPanelBuildIdentity(extensionPath: string, previous?: PanelBuildIdentity, versionHint = "", fsApi: PanelBuildFs = fs): PanelBuildIdentity {
  const packagePath = path.join(extensionPath, "package.json");
  const packageStats = statFile(packagePath, fsApi);
  const fileStats = {} as Record<PanelBuildFile, PanelBuildFileStats>;
  const packageChanged = !previous || !sameStats(previous.stats.package, packageStats);
  let changed = packageChanged;
  for (const key of Object.keys(FILES) as PanelBuildFile[]) {
    fileStats[key] = statFile(path.join(extensionPath, FILES[key]), fsApi);
    if (!previous || !sameStats(previous.stats[key], fileStats[key])) changed = true;
  }
  if (!changed && previous) return previous;

  let version = String(versionHint || (packageChanged ? "" : previous?.version) || "");
  if (!version) {
    try {
      const manifest = JSON.parse(fsApi.readFileSync(packagePath, "utf8"));
      version = String(manifest.version || version);
    } catch {
      // A missing/partially replaced manifest is represented by an incomplete identity below.
    }
  }
  const files = {} as Record<PanelBuildFile, string>;
  for (const key of Object.keys(FILES) as PanelBuildFile[]) {
    if (previous && sameStats(previous.stats[key], fileStats[key])) {
      files[key] = previous.files[key];
      continue;
    }
    try {
      files[key] = digest(fsApi.readFileSync(path.join(extensionPath, FILES[key])));
    } catch {
      files[key] = "";
    }
  }
  return {
    version,
    fingerprint: computeFingerprint(version, files),
    files,
    stats: { package: packageStats, ...fileStats },
    exists: Boolean(packageStats && Object.values(fileStats).every(Boolean)),
  };
}

export function freezePanelBuildIdentity(identity: PanelBuildIdentity): PanelBuildIdentity {
  Object.freeze(identity.files);
  Object.freeze(identity.stats);
  return Object.freeze(identity);
}

export function classifyPanelBuildIdentity(input: {
  running: PanelBuildIdentity;
  disk: PanelBuildIdentity;
  installedVersion?: string;
  registryAvailable: boolean;
  missingConfirmed?: boolean;
}): { registryState: PanelBuildRegistryState; reloadRequired: boolean; runningVersion: string; installedVersion: string; runningFingerprint: string; diskFingerprint: string } {
  const runningVersion = String(input.running.version || "");
  const installedVersion = String(input.registryAvailable ? input.installedVersion || "" : "");
  let registryState: PanelBuildRegistryState = "unknown";
  if (input.registryAvailable) {
    if (runningVersion !== installedVersion) registryState = "version_mismatch";
    else if (!input.disk.exists || input.running.fingerprint !== input.disk.fingerprint) registryState = "content_mismatch";
    else registryState = "match";
  } else if (input.missingConfirmed && !input.disk.exists) {
    registryState = "extension_missing";
  }
  return {
    registryState,
    reloadRequired: registryState === "version_mismatch" || registryState === "content_mismatch" || registryState === "extension_missing",
    runningVersion,
    installedVersion,
    runningFingerprint: input.running.fingerprint,
    diskFingerprint: input.disk.fingerprint,
  };
}

export async function stablePanelExtensionProbe<T>(options: {
  getExtension: () => T | undefined;
  delay: (milliseconds: number) => Promise<void>;
  readDiskIdentity: () => PanelBuildIdentity;
  debounceMs?: number;
}): Promise<{ extension?: T; missingConfirmed: boolean; diskIdentity: PanelBuildIdentity }> {
  const first = options.getExtension();
  if (first) return { extension: first, missingConfirmed: false, diskIdentity: options.readDiskIdentity() };
  await options.delay(Math.max(0, Number(options.debounceMs ?? 350)));
  const second = options.getExtension();
  const diskIdentity = options.readDiskIdentity();
  return { extension: second, missingConfirmed: !second && !diskIdentity.exists, diskIdentity };
}
