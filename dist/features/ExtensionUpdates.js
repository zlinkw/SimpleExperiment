"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SFTP_EXTENSION_ID = exports.EXPERIMENT_EXTENSION_ID = exports.SFTP_UPDATE_REPO = exports.EXPERIMENT_UPDATE_REPO = void 0;
exports.normalizeReleaseVersion = normalizeReleaseVersion;
exports.compareSemanticVersions = compareSemanticVersions;
exports.currentTargetPlatform = currentTargetPlatform;
exports.verifyVsixManifest = verifyVsixManifest;
exports.verifyVsixManifestFile = verifyVsixManifestFile;
exports.componentUpdate = componentUpdate;
exports.componentUpdateForInstalledVersion = componentUpdateForInstalledVersion;
exports.refreshStoredPluginUpdatePlan = refreshStoredPluginUpdatePlan;
exports.planPairedUpdates = planPairedUpdates;
const node_zlib_1 = require("node:zlib");
const promises_1 = require("node:fs/promises");
// The build copies only these modules and their dependency closure into VSIX.
const semverCompare = require("../vendor/semver/functions/compare");
const semverValid = require("../vendor/semver/functions/valid");
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
            return name && /^https:\/\//i.test(url) ? [{ name, url, size: Number(record.size) || 0, digest: text(record.digest) }] : [];
        })
        : [];
}
function embeddedSemanticVersion(value) {
    const textValue = text(value);
    const pattern = /(?:^|[^0-9A-Za-z])v?((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?)(?=$|[^0-9A-Za-z])/g;
    const found = pattern.exec(textValue)?.[1] || "";
    return semverValid(found) ? found : "";
}
function normalizeReleaseVersion(value) {
    const raw = text(value).replace(/^v/i, "");
    if (semverValid(raw))
        return raw;
    return embeddedSemanticVersion(raw);
}
function compareSemanticVersions(left, right) {
    const a = text(left).replace(/^v/i, ""), b = text(right).replace(/^v/i, "");
    if (!semverValid(a) || !semverValid(b))
        throw new Error(`无效的 SemVer 版本：${left} / ${right}`);
    return semverCompare(a, b);
}
function currentTargetPlatform(platform = process.platform, architecture = process.arch) {
    const os = platform === "win32" ? "win32" : platform === "darwin" ? "darwin" : platform === "linux" ? "linux" : "";
    const arch = architecture === "x64" ? "x64" : architecture === "arm64" ? "arm64" : architecture === "ia32" ? "ia32" : "";
    return os && arch ? `${os}-${arch}` : "universal";
}
function assetTargetPlatform(name) {
    const stem = String(name || "").replace(/\.vsix$/i, "");
    const match = /-(win32|linux|darwin|alpine|web)-(x64|arm64|armhf|arm|ia32|ppc64le|s390x|riscv64)$/i.exec(stem);
    return match ? `${match[1].toLowerCase()}-${match[2].toLowerCase()}` : "universal";
}
function assetForExtension(assets, extensionId, extensionName, version, targetPlatform) {
    const expectedVersion = normalizeReleaseVersion(version);
    const expectedPlatform = String(targetPlatform || "universal").toLowerCase();
    const expectedNames = new Set([extensionName, extensionId.replace(/\./g, "-"), extensionId.split(".").at(-1) || ""]
        .map((name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""))
        .filter(Boolean));
    const matches = assets.filter((item) => {
        const lower = item.name.toLowerCase();
        if (!lower.endsWith(".vsix"))
            return false;
        const slug = lower.replace(/\.vsix$/i, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        const hasExactIdentity = [...expectedNames].some((name) => slug === name || slug.startsWith(`${name}-`));
        const itemPlatform = assetTargetPlatform(item.name);
        return hasExactIdentity && embeddedSemanticVersion(item.name) === expectedVersion
            && (itemPlatform === expectedPlatform || itemPlatform === "universal");
    });
    const exact = matches.filter((item) => assetTargetPlatform(item.name) === expectedPlatform);
    const preferred = exact.length ? exact : matches.filter((item) => assetTargetPlatform(item.name) === "universal");
    if (preferred.length !== 1)
        return undefined;
    return { ...preferred[0], targetPlatform: assetTargetPlatform(preferred[0].name) };
}
function verifyVsixManifest(bytes, expectedExtensionId, expectedVersion, expectedTargetPlatform = "universal") {
    const archive = Buffer.from(bytes);
    if (archive.length < 22 || archive.length > 128 * 1024 * 1024)
        throw new Error("VSIX 文件大小超出验证范围。");
    const lowerBound = Math.max(0, archive.length - 22 - 0xffff);
    let endOffset = -1;
    for (let offset = archive.length - 22; offset >= lowerBound; offset -= 1) {
        if (archive.readUInt32LE(offset) === 0x06054b50) {
            endOffset = offset;
            break;
        }
    }
    if (endOffset < 0)
        throw new Error("VSIX 缺少有效 ZIP 目录。");
    const entries = archive.readUInt16LE(endOffset + 10);
    const directorySize = archive.readUInt32LE(endOffset + 12);
    const directoryOffset = archive.readUInt32LE(endOffset + 16);
    if (!Number.isSafeInteger(directoryOffset + directorySize) || directoryOffset + directorySize > endOffset)
        throw new Error("VSIX ZIP 目录范围无效。");
    let offset = directoryOffset;
    let manifestOffset = -1;
    let manifestSize = 0;
    for (let index = 0; index < entries; index += 1) {
        if (offset + 46 > archive.length || archive.readUInt32LE(offset) !== 0x02014b50)
            throw new Error("VSIX ZIP 目录条目无效。");
        const flags = archive.readUInt16LE(offset + 8);
        const method = archive.readUInt16LE(offset + 10);
        const compressedSize = archive.readUInt32LE(offset + 20);
        const uncompressedSize = archive.readUInt32LE(offset + 24);
        const nameLength = archive.readUInt16LE(offset + 28);
        const extraLength = archive.readUInt16LE(offset + 30);
        const commentLength = archive.readUInt16LE(offset + 32);
        const localOffset = archive.readUInt32LE(offset + 42);
        const end = offset + 46 + nameLength + extraLength + commentLength;
        if (end > archive.length)
            throw new Error("VSIX ZIP 文件名范围无效。");
        const name = archive.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
        if (name === "extension/package.json") {
            if (flags & 1)
                throw new Error("VSIX manifest 使用了不支持的加密格式。");
            if (uncompressedSize > 1024 * 1024)
                throw new Error("VSIX manifest 超过 1 MiB。");
            if (localOffset + 30 > archive.length || archive.readUInt32LE(localOffset) !== 0x04034b50)
                throw new Error("VSIX manifest ZIP 头无效。");
            const localNameLength = archive.readUInt16LE(localOffset + 26);
            const localExtraLength = archive.readUInt16LE(localOffset + 28);
            manifestOffset = localOffset + 30 + localNameLength + localExtraLength;
            manifestSize = compressedSize;
            if (manifestOffset + manifestSize > archive.length)
                throw new Error("VSIX manifest 数据超出文件范围。");
            const compressed = archive.subarray(manifestOffset, manifestOffset + manifestSize);
            const body = method === 0 ? Buffer.from(compressed)
                : method === 8 ? (0, node_zlib_1.inflateRawSync)(compressed, { maxOutputLength: 1024 * 1024 })
                    : undefined;
            if (!body || body.length !== uncompressedSize)
                throw new Error("VSIX manifest 压缩格式或长度无效。");
            return verifyManifestPackageJson(body, expectedExtensionId, expectedVersion, expectedTargetPlatform);
        }
        offset = end;
    }
    throw new Error("VSIX 缺少 extension/package.json。");
}
async function verifyVsixManifestFile(filePath, expectedExtensionId, expectedVersion, expectedTargetPlatform = "universal") {
    const handle = await (0, promises_1.open)(filePath, "r");
    try {
        const stat = await handle.stat();
        if (stat.size < 22 || stat.size > 128 * 1024 * 1024)
            throw new Error("VSIX 文件大小超出验证范围。");
        const tailLength = Math.min(stat.size, 22 + 0xffff);
        const tail = await readFileRange(handle, stat.size - tailLength, tailLength, "VSIX ZIP 尾部");
        let endOffset = -1;
        for (let offset = tail.length - 22; offset >= Math.max(0, tail.length - 22 - 0xffff); offset -= 1) {
            if (tail.readUInt32LE(offset) === 0x06054b50) {
                endOffset = offset;
                break;
            }
        }
        if (endOffset < 0)
            throw new Error("VSIX 缺少有效 ZIP 目录。");
        const commentLength = tail.readUInt16LE(endOffset + 20);
        if (endOffset + 22 + commentLength !== tail.length)
            throw new Error("VSIX ZIP 尾部长度无效。");
        const entries = tail.readUInt16LE(endOffset + 10);
        const directorySize = tail.readUInt32LE(endOffset + 12);
        const directoryOffset = tail.readUInt32LE(endOffset + 16);
        const endPosition = stat.size - tailLength + endOffset;
        if (directorySize > 16 * 1024 * 1024 || directoryOffset + directorySize > endPosition)
            throw new Error("VSIX ZIP 目录范围无效。");
        const directory = await readFileRange(handle, directoryOffset, directorySize, "VSIX ZIP 目录");
        let offset = 0;
        for (let index = 0; index < entries; index += 1) {
            if (offset + 46 > directory.length || directory.readUInt32LE(offset) !== 0x02014b50)
                throw new Error("VSIX ZIP 目录条目无效。");
            const flags = directory.readUInt16LE(offset + 8);
            const method = directory.readUInt16LE(offset + 10);
            const compressedSize = directory.readUInt32LE(offset + 20);
            const uncompressedSize = directory.readUInt32LE(offset + 24);
            const nameLength = directory.readUInt16LE(offset + 28);
            const extraLength = directory.readUInt16LE(offset + 30);
            const entryCommentLength = directory.readUInt16LE(offset + 32);
            const localOffset = directory.readUInt32LE(offset + 42);
            const entryEnd = offset + 46 + nameLength + extraLength + entryCommentLength;
            if (entryEnd > directory.length)
                throw new Error("VSIX ZIP 文件名范围无效。");
            const name = directory.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
            if (name === "extension/package.json") {
                if (flags & 1)
                    throw new Error("VSIX manifest 使用了不支持的加密格式。");
                if (compressedSize > 2 * 1024 * 1024 || uncompressedSize > 1024 * 1024)
                    throw new Error("VSIX manifest 超过 1 MiB。");
                const localHeader = await readFileRange(handle, localOffset, 30, "VSIX manifest ZIP 头");
                if (localHeader.readUInt32LE(0) !== 0x04034b50)
                    throw new Error("VSIX manifest ZIP 头无效。");
                const localNameLength = localHeader.readUInt16LE(26);
                const localExtraLength = localHeader.readUInt16LE(28);
                const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
                if (dataOffset + compressedSize > stat.size)
                    throw new Error("VSIX manifest 数据超出文件范围。");
                const compressed = await readFileRange(handle, dataOffset, compressedSize, "VSIX manifest 数据");
                const body = method === 0 ? compressed
                    : method === 8 ? (0, node_zlib_1.inflateRawSync)(compressed, { maxOutputLength: 1024 * 1024 })
                        : undefined;
                if (!body || body.length !== uncompressedSize)
                    throw new Error("VSIX manifest 压缩格式或长度无效。");
                return verifyManifestPackageJson(body, expectedExtensionId, expectedVersion, expectedTargetPlatform);
            }
            offset = entryEnd;
        }
        if (offset !== directory.length)
            throw new Error("VSIX ZIP 目录长度与条目数不一致。");
        throw new Error("VSIX 缺少 extension/package.json。");
    }
    finally {
        await handle.close();
    }
}
async function readFileRange(handle, position, length, label) {
    if (!Number.isSafeInteger(position) || !Number.isSafeInteger(length) || position < 0 || length < 0)
        throw new Error(`${label}读取范围无效。`);
    const buffer = Buffer.allocUnsafe(length);
    let offset = 0;
    while (offset < length) {
        const result = await handle.read(buffer, offset, length - offset, position + offset);
        if (!result.bytesRead)
            throw new Error(`${label}未完整读取。`);
        offset += result.bytesRead;
    }
    return buffer;
}
function verifyManifestPackageJson(body, expectedExtensionId, expectedVersion, expectedTargetPlatform) {
    let manifest;
    try {
        manifest = JSON.parse(body.toString("utf8"));
    }
    catch {
        throw new Error("VSIX package.json 无法解析。");
    }
    const extensionId = `${text(manifest.publisher)}.${text(manifest.name)}`;
    const version = normalizeReleaseVersion(text(manifest.version));
    const targetPlatform = text(manifest.__metadata?.targetPlatform) || "universal";
    if (extensionId.toLowerCase() !== text(expectedExtensionId).toLowerCase())
        throw new Error(`VSIX 扩展身份不匹配：${extensionId || "缺失"}。`);
    if (!version || compareSemanticVersions(version, expectedVersion) !== 0)
        throw new Error(`VSIX 版本不匹配：${version || "缺失"}。`);
    if (targetPlatform !== "universal" && targetPlatform.toLowerCase() !== String(expectedTargetPlatform || "universal").toLowerCase())
        throw new Error(`VSIX 目标平台不匹配：${targetPlatform}。`);
    return { extensionId, version, targetPlatform };
}
function checksumFor(asset, assets = []) {
    if (!asset)
        return undefined;
    return assets.find((item) => item.name.toLowerCase() === `${asset.name.toLowerCase()}.sha256`)
        || assets.find((item) => item.name.toLowerCase() === `${asset.name.replace(/\.vsix$/i, "")}.vsix.sha256`);
}
function componentUpdate(id, repo, label, currentVersion, release, extensionName, targetPlatform = currentTargetPlatform()) {
    const latestVersion = normalizeReleaseVersion(text(release.tagName) || text(release.name));
    const assets = releaseAssets(release);
    const vsix = assetForExtension(assets, id, extensionName, latestVersion, targetPlatform);
    return {
        id,
        repo,
        label,
        currentVersion: normalizeReleaseVersion(currentVersion),
        latestVersion,
        targetPlatform,
        updateAvailable: Boolean(latestVersion && vsix && compareSemanticVersions(latestVersion, currentVersion) > 0),
        releaseUrl: text(release.htmlUrl),
        vsix,
        checksum: checksumFor(vsix, assets),
    };
}
function componentUpdateForInstalledVersion(component, currentVersion) {
    return {
        ...component,
        currentVersion: normalizeReleaseVersion(currentVersion),
        updateAvailable: Boolean(component.latestVersion && component.vsix && compareSemanticVersions(component.latestVersion, currentVersion) > 0),
    };
}
function refreshStoredPluginUpdatePlan(plan, currentVersion) {
    if (!plan?.experiment || !plan.sftp || !["update_available", "reload_required"].includes(String(plan.status)))
        return plan;
    const refreshed = planPairedUpdates(componentUpdateForInstalledVersion(plan.experiment, currentVersion(plan.experiment.id)), componentUpdateForInstalledVersion(plan.sftp, currentVersion(plan.sftp.id)));
    return { ...refreshed, checkedAt: text(plan.checkedAt) || refreshed.checkedAt };
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
