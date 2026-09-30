"use strict";

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

async function runInstallLatest({ targetVersion, extensionId, vsixPath, listExtensions, install }) {
  const installedVersion = parseInstalledVersion(await listExtensions(), extensionId);
  if (installedVersion) {
    const comparison = compareVersions(installedVersion, targetVersion);
    if (comparison === 0) return { status: "skip", version: targetVersion };
    if (comparison > 0) throw new Error(`Refusing to downgrade ${extensionId} from ${installedVersion} to ${targetVersion}.`);
  }
  await install(vsixPath);
  const verifiedVersion = parseInstalledVersion(await listExtensions(), extensionId);
  if (verifiedVersion !== targetVersion) {
    throw new Error(`Install verification failed: expected ${extensionId}@${targetVersion}, found ${verifiedVersion || "not installed"}.`);
  }
  return { status: "installed", version: targetVersion };
}

module.exports = { compareVersions, parseInstalledVersion, runInstallLatest };
