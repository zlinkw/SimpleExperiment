import * as crypto from "crypto";
import * as fs from "fs/promises";
import * as fsNode from "fs";
import * as path from "path";

export type LocalCodeManifestEntry = { size: number; sha256: string };
export type LocalCodeManifest = Record<string, LocalCodeManifestEntry>;
export type LocalCodeManifestStats = { listed: number; reused: number; hashed: number; pruned: number };

type CacheIdentity = { dev: string; ino: string; size: number; mtimeMs: number; ctimeMs: number; birthtimeMs: number };
type CacheRow = CacheIdentity & { sha256: string };
type CacheDocument = { schemaVersion: 1; files: Record<string, CacheRow> };

const CACHE_SCHEMA_VERSION = 1;

function bigintString(value: unknown): string {
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "number" && Number.isFinite(value)) return Number.isSafeInteger(value) ? String(value) : value.toFixed(0);
  return "";
}

function finiteTime(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function identityFromStat(stat: fsNode.Stats): CacheIdentity | undefined {
  const dev = bigintString(stat.dev);
  const ino = bigintString(stat.ino);
  const mtimeMs = finiteTime(stat.mtimeMs);
  const ctimeMs = finiteTime(stat.ctimeMs);
  const birthtimeMs = finiteTime(stat.birthtimeMs);
  if (!dev || !ino || mtimeMs === undefined || ctimeMs === undefined || birthtimeMs === undefined || !Number.isSafeInteger(stat.size)) return undefined;
  return { dev, ino, size: stat.size, mtimeMs, ctimeMs, birthtimeMs };
}

function sameIdentity(row: CacheRow | undefined, identity: CacheIdentity | undefined): row is CacheRow {
  return Boolean(row && identity
    && row.dev === identity.dev
    && row.ino === identity.ino
    && row.size === identity.size
    && row.mtimeMs === identity.mtimeMs
    && row.ctimeMs === identity.ctimeMs
    && row.birthtimeMs === identity.birthtimeMs
    && /^[a-f0-9]{64}$/i.test(String(row.sha256 || "")));
}

export function localCodeManifestCachePath(storageRoot: string, projectRoot: string): string {
  const resolved = path.resolve(projectRoot);
  const id = crypto.createHash("sha256").update(process.platform === "win32" ? resolved.toLowerCase() : resolved).digest("hex");
  return path.join(storageRoot, "code-manifest-cache", `${id}.json`);
}

async function readCache(file: string): Promise<CacheDocument> {
  try {
    const parsed = JSON.parse(await fs.readFile(file, "utf8"));
    if (parsed?.schemaVersion === CACHE_SCHEMA_VERSION && parsed.files && typeof parsed.files === "object" && !Array.isArray(parsed.files)) {
      return { schemaVersion: CACHE_SCHEMA_VERSION, files: parsed.files };
    }
  }
  catch {
    // A missing or unreadable cache only forces a full hash; it never changes the manifest.
  }
  return { schemaVersion: CACHE_SCHEMA_VERSION, files: {} };
}

async function writeCache(file: string, document: CacheDocument): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temp, JSON.stringify(document), "utf8");
  await fs.rename(temp, file);
}

export async function sha256File(file: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const input = fsNode.createReadStream(file);
    input.on("data", (chunk) => hash.update(chunk));
    input.on("error", reject);
    input.on("end", () => resolve(hash.digest("hex")));
  });
}

export async function hashLocalCodeFiles(
  root: string,
  files: string[],
  cacheFile?: string,
  onProgress?: (stats: LocalCodeManifestStats) => void,
): Promise<{ manifest: LocalCodeManifest; stats: LocalCodeManifestStats }> {
  const cache: CacheDocument = cacheFile ? await readCache(cacheFile) : { schemaVersion: CACHE_SCHEMA_VERSION, files: {} };
  const manifest: LocalCodeManifest = {};
  const nextFiles: Record<string, CacheRow> = {};
  const stats: LocalCodeManifestStats = { listed: files.length, reused: 0, hashed: 0, pruned: 0 };
  const concurrency = 12;
  let nextIndex = 0;
  let completed = 0;
  const progressEvery = Math.max(25, Math.ceil(files.length / 20));
  async function worker() {
    while (true) {
      const index = nextIndex++;
      if (index >= files.length) break;
      const relative = files[index].replace(/\\/g, "/");
      const full = path.join(root, relative);
      const stat = await fs.stat(full);
      const identity = identityFromStat(stat);
      const cached = cache.files[relative];
      if (sameIdentity(cached, identity)) {
        manifest[relative] = { size: stat.size, sha256: cached.sha256.toLowerCase() };
        nextFiles[relative] = cached;
        stats.reused++;
      }
      else {
        const before = identityFromStat(await fs.stat(full));
        const sha256 = (await sha256File(full)).toLowerCase();
        const after = identityFromStat(await fs.stat(full));
        if (!before || !after || !sameIdentity({ ...before, sha256: "0".repeat(64) }, after) || before.size !== stat.size) {
          throw new Error(`本地文件在哈希期间发生变化：${relative}`);
        }
        manifest[relative] = { size: after.size, sha256 };
        nextFiles[relative] = { ...after, sha256 };
        stats.hashed++;
      }
      completed++;
      if (onProgress && (completed === files.length || completed % progressEvery === 0)) onProgress({ ...stats });
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(1, files.length)) }, () => worker()));
  if (cacheFile) {
    stats.pruned = Object.keys(cache.files).filter((file) => !Object.prototype.hasOwnProperty.call(nextFiles, file)).length;
    try {
      await writeCache(cacheFile, { schemaVersion: CACHE_SCHEMA_VERSION, files: nextFiles });
    }
    catch (error) {
      console.warn(`[SimpleExperiment] local code manifest cache write failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { manifest, stats };
}
