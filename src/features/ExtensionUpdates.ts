export const EXPERIMENT_UPDATE_REPO = "zlinkw/SimpleExperiment";
export const SFTP_UPDATE_REPO = "zlinkw/SimpleSFTP";
export const EXPERIMENT_EXTENSION_ID = "simple-local.simple-experiment";
export const SFTP_EXTENSION_ID = "simple-local.simple-sftp";

export interface UpdateRelease {
  tagName?: unknown;
  name?: unknown;
  htmlUrl?: unknown;
  publishedAt?: unknown;
  prerelease?: unknown;
  draft?: unknown;
  assets?: unknown;
}

export interface UpdateAsset {
  name: string;
  url: string;
  size: number;
}

export interface ComponentUpdate {
  id: string;
  repo: string;
  label: string;
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  releaseUrl: string;
  vsix?: UpdateAsset;
  checksum?: UpdateAsset;
}

export interface PluginUpdatePlan {
  status: "unknown" | "checking" | "up_to_date" | "update_available" | "installing" | "reload_required" | "error";
  message: string;
  checkedAt: string;
  experiment?: ComponentUpdate;
  sftp?: ComponentUpdate;
}

function text(value: unknown): string {
  return String(value || "").trim();
}

function releaseAssets(release: UpdateRelease): UpdateAsset[] {
  return Array.isArray(release.assets)
    ? release.assets.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const record = item as Record<string, unknown>;
      const name = text(record.name);
      const url = text(record.browser_download_url) || text(record.url);
      return name && /^https:\/\//i.test(url) ? [{ name, url, size: Number(record.size) || 0 }] : [];
    })
    : [];
}

export function normalizeReleaseVersion(value: string): string {
  return text(value).replace(/^v/i, "");
}

export function compareSemanticVersions(left: string, right: string): number {
  const normalize = (value: string) => normalizeReleaseVersion(value).split(/[.-]/).map((part) => part);
  const leftParts = normalize(left);
  const rightParts = normalize(right);
  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    const a = leftParts[index] || "0";
    const b = rightParts[index] || "0";
    const aNumber = /^\d+$/.test(a) ? Number(a) : undefined;
    const bNumber = /^\d+$/.test(b) ? Number(b) : undefined;
    if (aNumber !== undefined && bNumber !== undefined && aNumber !== bNumber)
      return aNumber > bNumber ? 1 : -1;
    if (a !== b)
      return a > b ? 1 : -1;
  }
  return 0;
}

function assetForExtension(assets: UpdateAsset[], extensionName: string, version: string): UpdateAsset | undefined {
  const normalized = normalizeReleaseVersion(version).toLowerCase();
  const exact = assets.find((item) => {
    const name = item.name.toLowerCase();
    return name.endsWith(".vsix")
      && name.includes(extensionName.toLowerCase())
      && name.includes(normalized);
  });
  return exact || assets.find((item) => item.name.toLowerCase().endsWith(".vsix"));
}

function checksumFor(asset?: UpdateAsset, assets: UpdateAsset[] = []): UpdateAsset | undefined {
  if (!asset) return undefined;
  return assets.find((item) => item.name.toLowerCase() === `${asset.name.toLowerCase()}.sha256`)
    || assets.find((item) => item.name.toLowerCase() === `${asset.name.replace(/\.vsix$/i, "")}.vsix.sha256`);
}

export function componentUpdate(
  id: string,
  repo: string,
  label: string,
  currentVersion: string,
  release: UpdateRelease,
  extensionName: string,
): ComponentUpdate {
  const latestVersion = normalizeReleaseVersion(text(release.tagName) || text(release.name));
  const assets = releaseAssets(release);
  const vsix = assetForExtension(assets, extensionName, latestVersion);
  return {
    id,
    repo,
    label,
    currentVersion: normalizeReleaseVersion(currentVersion),
    latestVersion,
    updateAvailable: Boolean(latestVersion && vsix && compareSemanticVersions(latestVersion, currentVersion) > 0),
    releaseUrl: text(release.htmlUrl),
    vsix,
    checksum: checksumFor(vsix, assets),
  };
}

export function planPairedUpdates(experiment: ComponentUpdate, sftp: ComponentUpdate): PluginUpdatePlan {
  for (const component of [experiment, sftp]) {
    if (!component.latestVersion || !component.vsix) {
      return {
        status: "error",
        message: `${component.label} 最新 Release 缺少可安装的 VSIX。`,
        checkedAt: new Date().toISOString(),
        experiment,
        sftp,
      };
    }
  }
  const updateAvailable = experiment.updateAvailable || sftp.updateAvailable;
  return {
    status: updateAvailable ? "update_available" : "up_to_date",
    message: updateAvailable
      ? `发现配套更新：SimpleExperiment ${experiment.latestVersion}，SimpleSFTP ${sftp.latestVersion}。`
      : `两个插件均已是最新版本：SimpleExperiment ${experiment.currentVersion}，SimpleSFTP ${sftp.currentVersion}。`,
    checkedAt: new Date().toISOString(),
    experiment,
    sftp,
  };
}
