"use strict";

const crypto = require("node:crypto");

function parseInstalledVersion(output, extensionId) {
  const prefix = `${extensionId.toLowerCase()}@`;
  const row = String(output || "").split(/\r?\n/).find((line) => line.trim().toLowerCase().startsWith(prefix));
  return row ? row.trim().slice(prefix.length) : "";
}

function compareVersions(left, right) {
  const parse = (value) => {
    const match = String(value).trim().match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/);
    if (!match) throw new Error(`Invalid extension version: ${value}`);
    return { numbers: match.slice(1, 4).map(Number), prerelease: match[4] ? match[4].split(".") : [] };
  };
  const a = parse(left), b = parse(right);
  for (let i = 0; i < 3; i++) if (a.numbers[i] !== b.numbers[i]) return a.numbers[i] < b.numbers[i] ? -1 : 1;
  if (!a.prerelease.length || !b.prerelease.length) return a.prerelease.length === b.prerelease.length ? 0 : a.prerelease.length ? -1 : 1;
  for (let i = 0; i < Math.max(a.prerelease.length, b.prerelease.length); i++) {
    if (a.prerelease[i] === undefined) return -1;
    if (b.prerelease[i] === undefined) return 1;
    if (a.prerelease[i] === b.prerelease[i]) continue;
    const an = /^\d+$/.test(a.prerelease[i]), bn = /^\d+$/.test(b.prerelease[i]);
    if (an && bn) return Number(a.prerelease[i]) < Number(b.prerelease[i]) ? -1 : 1;
    if (an !== bn) return an ? -1 : 1;
    return a.prerelease[i] < b.prerelease[i] ? -1 : 1;
  }
  return 0;
}

async function acquireInstallLock({ fsApi, lockPath, targetVersion, pid, isProcessAlive }) {
  let handle;
  try {
    handle = await fsApi.open(lockPath, "wx", 0o600);
    const lockId = crypto.randomUUID();
    await handle.writeFile(JSON.stringify({ pid, targetVersion, startedAt: new Date().toISOString(), lockId }), "utf8");
    return async () => {
      await handle.close().catch(() => undefined);
      try {
        const owner = JSON.parse(await fsApi.readFile(lockPath, "utf8"));
        if (Number(owner.pid) === pid && owner.targetVersion === targetVersion && owner.lockId === lockId) await fsApi.unlink(lockPath);
      } catch { /* The lock was already released or replaced. */ }
    };
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    let owner;
    try { owner = JSON.parse(await fsApi.readFile(lockPath, "utf8")); } catch { owner = undefined; }
    if (owner && Number.isInteger(Number(owner.pid)) && !isProcessAlive(Number(owner.pid))) {
      throw new Error(`Found a stale install lock for pid ${owner.pid} (${owner.targetVersion || "unknown"}); inspect and remove ${lockPath} before retrying.`);
    }
    throw new Error(`Another install:latest process holds the lock${owner?.pid ? ` (pid ${owner.pid}, target ${owner.targetVersion || "unknown"})` : ""}: ${lockPath}`);
  }
}

async function runInstallLatest({ targetVersion, extensionId, vsixPath, listExtensions, install, dryRun = false, fsApi = require("node:fs/promises"), lockPath, pid = process.pid, isProcessAlive = (candidate) => { try { process.kill(candidate, 0); return true; } catch (error) { return error.code === "EPERM"; } } }) {
  const decide = async () => {
    const installedVersion = parseInstalledVersion(await listExtensions(), extensionId);
    if (installedVersion) {
      const comparison = compareVersions(installedVersion, targetVersion);
      if (comparison === 0) return { status: "skip", decision: "already-installed", version: targetVersion, installedVersion };
      if (comparison > 0) throw new Error(`Refusing to downgrade ${extensionId} from ${installedVersion} to ${targetVersion}.`);
    }
    return { status: "install", decision: installedVersion ? "upgrade" : "install", installedVersion };
  };
  if (dryRun) {
    const decision = await decide();
    return { ...decision, status: "dry-run", targetVersion, vsixPath };
  }
  if (!lockPath) throw new Error("An install lock path is required.");
  const release = await acquireInstallLock({ fsApi, lockPath, targetVersion, pid, isProcessAlive });
  try {
    const decision = await decide();
    if (decision.status === "skip") return { status: "skip", version: targetVersion };
    await install(vsixPath);
    const verifiedVersion = parseInstalledVersion(await listExtensions(), extensionId);
    if (verifiedVersion !== targetVersion) {
      throw new Error(`Install verification failed: expected ${extensionId}@${targetVersion}, found ${verifiedVersion || "not installed"}.`);
    }
    return { status: "installed", version: targetVersion };
  } finally {
    await release();
  }
}

module.exports = { acquireInstallLock, compareVersions, parseInstalledVersion, runInstallLatest };
