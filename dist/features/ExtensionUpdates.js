"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SFTP_EXTENSION_ID = exports.EXPERIMENT_EXTENSION_ID = exports.SFTP_UPDATE_REPO = exports.EXPERIMENT_UPDATE_REPO = void 0;
exports.normalizeReleaseVersion = normalizeReleaseVersion;
exports.compareSemanticVersions = compareSemanticVersions;
exports.componentUpdate = componentUpdate;
exports.planPairedUpdates = planPairedUpdates;
exports.EXPERIMENT_UPDATE_REPO = "zlinkw/SimpleExperiment";
exports.SFTP_UPDATE_REPO = "zlinkw/SimpleSFTP";
exports.EXPERIMENT_EXTENSION_ID = "simple-local.simple-experiment";
exports.SFTP_EXTENSION_ID = "simple-local.simple-sftp";
function text(value) {
    return String(value || "").trim();
}
function releaseAssets(release) {
    return Array.isArray(release.assets)
        ? release.assets.flatMap((item) => {
            if (!item || typeof item !== "object")
                return [];
            const record = item;
            const name = text(record.name);
            const url = text(record.browser_download_url) || text(record.url);
            return name && /^https:\/\//i.test(url) ? [{ name, url, size: Number(record.size) || 0 }] : [];
        })
        : [];
}
function normalizeReleaseVersion(value) {
    return text(value).replace(/^v/i, "");
}
function compareSemanticVersions(left, right) {
    const normalize = (value) => normalizeReleaseVersion(value).split(/[.-]/).map((part) => part);
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
function assetForExtension(assets, extensionName, version) {
    const normalized = normalizeReleaseVersion(version).toLowerCase();
    const exact = assets.find((item) => {
        const name = item.name.toLowerCase();
        return name.endsWith(".vsix")
            && name.includes(extensionName.toLowerCase())
            && name.includes(normalized);
    });
    return exact || assets.find((item) => item.name.toLowerCase().endsWith(".vsix"));
}
function checksumFor(asset, assets = []) {
    if (!asset)
        return undefined;
    return assets.find((item) => item.name.toLowerCase() === `${asset.name.toLowerCase()}.sha256`)
        || assets.find((item) => item.name.toLowerCase() === `${asset.name.replace(/\.vsix$/i, "")}.vsix.sha256`);
}
function componentUpdate(id, repo, label, currentVersion, release, extensionName) {
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
function planPairedUpdates(experiment, sftp) {
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
