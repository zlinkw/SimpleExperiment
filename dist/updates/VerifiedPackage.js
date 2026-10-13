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
exports.PackageStore = void 0;
exports.crc32 = crc32;
exports.inspectVsix = inspectVsix;
exports.verifyVsix = verifyVsix;
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
const node_zlib_1 = require("node:zlib");
const node_crypto_1 = require("node:crypto");
const ExtensionUpdates_1 = require("../features/ExtensionUpdates");
const ReleaseClient_1 = require("./ReleaseClient");
const satisfies = require("../vendor/semver/functions/satisfies");
const validRange = require("../vendor/semver/ranges/valid");
const crcTable = Array.from({ length: 256 }, (_, value) => {
    let crc = value;
    for (let i = 0; i < 8; i++)
        crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    return crc >>> 0;
});
function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes)
        crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
}
/** Mac ZIP integrity gates, adapted to Windows/universal packages. No extraction. */
function inspectVsix(bytes) {
    const zip = Buffer.from(bytes);
    if (zip.length < 22 || zip.length > 128 * 1024 * 1024)
        throw new Error("VSIX 大小无效。");
    let end = -1;
    for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65557); i--)
        if (zip.readUInt32LE(i) === 0x06054b50 && i + 22 + zip.readUInt16LE(i + 20) === zip.length) {
            end = i;
            break;
        }
    if (end < 0 || zip.readUInt16LE(end + 4) || zip.readUInt16LE(end + 6))
        throw new Error("VSIX ZIP 尾部无效。");
    const count = zip.readUInt16LE(end + 10), size = zip.readUInt32LE(end + 12), start = zip.readUInt32LE(end + 16);
    if (!count || count > 10000 || zip.readUInt16LE(end + 8) !== count || start + size !== end)
        throw new Error("VSIX ZIP 目录无效。");
    const names = new Set(), files = new Map();
    let offset = start, total = 0;
    const ranges = [];
    for (let i = 0; i < count; i++) {
        if (offset + 46 > end || zip.readUInt32LE(offset) !== 0x02014b50)
            throw new Error("VSIX ZIP 条目无效。");
        const flags = zip.readUInt16LE(offset + 8), method = zip.readUInt16LE(offset + 10), crc = zip.readUInt32LE(offset + 16);
        const compressed = zip.readUInt32LE(offset + 20), length = zip.readUInt32LE(offset + 24), nameLength = zip.readUInt16LE(offset + 28);
        const local = zip.readUInt32LE(offset + 42), next = offset + 46 + nameLength + zip.readUInt16LE(offset + 30) + zip.readUInt16LE(offset + 32);
        if (next > end || flags & 1 || ![0, 8].includes(method) || length > 32 * 1024 * 1024 || (total += length) > 256 * 1024 * 1024)
            throw new Error("VSIX 压缩条目无效。");
        const name = zip.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
        const key = name.toLowerCase();
        if (!name || name.includes("\\") || name.startsWith("/") || name.includes(":") || name.includes("\0") || name.split("/").some(p => p === ".." || p === ".") || names.has(key))
            throw new Error("VSIX 路径或重复条目无效。");
        const parts = name.endsWith("/") ? name.slice(0, -1).split("/") : name.split("/");
        if (parts.some(p => !p || /[<>"|?*\x00-\x1f]/.test(p) || /[. ]$/.test(p) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p)))
            throw new Error("VSIX 包含 Windows 路径别名或保留名称。");
        names.add(key);
        if ((zip.readUInt32LE(offset + 38) >>> 16 & 0xf000) === 0xa000 || local + 30 > start || zip.readUInt32LE(local) !== 0x04034b50)
            throw new Error("VSIX 本地条目无效。");
        const localName = zip.readUInt16LE(local + 26), dataStart = local + 30 + localName + zip.readUInt16LE(local + 28), dataEnd = dataStart + compressed;
        if (zip.readUInt16LE(local + 8) !== method || zip.readUInt16LE(local + 6) !== flags || dataEnd > start
            || zip.subarray(local + 30, local + 30 + localName).toString("utf8") !== name || ranges.some(([a, b]) => local < b && dataEnd > a))
            throw new Error("VSIX 本地目录不一致。");
        ranges.push([local, dataEnd]);
        const data = zip.subarray(dataStart, dataEnd), body = method === 0 ? data : (0, node_zlib_1.inflateRawSync)(data, { maxOutputLength: Math.max(1, length) });
        if (body.length !== length || crc32(body) !== crc)
            throw new Error("VSIX CRC 或长度不符。");
        if (["extension/package.json", "extension.vsixmanifest"].includes(name))
            files.set(name, body);
        offset = next;
    }
    if (offset !== end)
        throw new Error("VSIX 目录长度不符。");
    const pkg = JSON.parse(files.get("extension/package.json")?.toString("utf8") || "null");
    const xml = files.get("extension.vsixmanifest")?.toString("utf8") || "";
    const identities = [...xml.matchAll(/<Identity\b([^>]*)\/?\s*>/g)];
    if (!pkg || identities.length !== 1)
        throw new Error("VSIX 缺少唯一包身份。");
    const attr = (key) => new RegExp(`\\b${key}="([^"]+)"`).exec(identities[0][1])?.[1];
    if (attr("Publisher") !== pkg.publisher || attr("Id") !== pkg.name || attr("Version") !== pkg.version || !validRange(pkg.engines?.vscode))
        throw new Error("VSIX 包/XML 身份或兼容声明不一致。");
    return { extensionId: `${pkg.publisher}.${pkg.name}`, version: pkg.version, targetPlatform: attr("TargetPlatform") || "universal", vscodeEngine: pkg.engines.vscode };
}
function verifyVsix(bytes, component, vscodeVersion) {
    const asset = component.vsix, expected = /^sha256:([a-f0-9]{64})$/i.exec(asset.digest || "")?.[1];
    if (!expected || bytes.byteLength !== asset.size || (0, node_crypto_1.createHash)("sha256").update(bytes).digest("hex") !== expected.toLowerCase())
        throw new Error("VSIX 大小或 SHA-256 不符。");
    const actual = inspectVsix(bytes), expectedPlatform = asset.targetPlatform || "universal";
    if (actual.extensionId !== component.id || actual.version !== component.latestVersion || actual.targetPlatform !== expectedPlatform
        || !["universal", (0, ExtensionUpdates_1.currentTargetPlatform)()].includes(actual.targetPlatform) || !satisfies(vscodeVersion, actual.vscodeEngine))
        throw new Error("VSIX 身份、版本、平台或 VS Code 版本不兼容。");
    return actual;
}
class PackageStore {
    root;
    client;
    vscodeVersion;
    constructor(root, client, vscodeVersion) {
        this.root = root;
        this.client = client;
        this.vscodeVersion = vscodeVersion;
    }
    async prepare(component) {
        const asset = component.vsix;
        if (!asset || !Number.isSafeInteger(asset.size) || asset.size < 22 || asset.size > 128 * 1024 * 1024)
            throw new Error("更新包声明大小无效。");
        (0, ReleaseClient_1.assertUpdateUrl)(asset.url, component.repo);
        const sha = /^sha256:([a-f0-9]{64})$/i.exec(asset.digest || "")?.[1]?.toLowerCase();
        if (!sha)
            throw new Error("更新批次缺少已确认的 SHA-256，请重新检查更新。");
        await fs.mkdir(this.root, { recursive: true });
        const root = await fs.realpath(this.root), stat = await fs.lstat(this.root);
        if (!stat.isDirectory() || stat.isSymbolicLink() || path.resolve(root).toLowerCase() !== path.resolve(this.root).toLowerCase())
            throw new Error("更新暂存根身份不可信。");
        const file = path.join(root, `${sha}.vsix`);
        const existing = await fs.lstat(file).catch(error => error.code === "ENOENT" ? undefined : Promise.reject(error));
        if (existing) {
            await this.verify(file, component);
            return file;
        }
        const bytes = await this.client.request(asset.url, Math.max(asset.size, 4 * 1024 * 1024 + 1), true);
        verifyVsix(bytes, component, this.vscodeVersion);
        await fs.writeFile(file, bytes, { flag: "wx", mode: 0o600 });
        await this.verify(file, component);
        return file;
    }
    async verify(file, component) {
        const root = await fs.realpath(this.root), stat = await fs.lstat(file);
        if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink > 1 || stat.size > 128 * 1024 * 1024 || path.dirname(await fs.realpath(file)) !== root)
            throw new Error("更新包路径身份发生变化。");
        const handle = await fs.open(file, "r");
        try {
            const before = await handle.stat();
            if (before.ino !== stat.ino || before.dev !== stat.dev)
                throw new Error("更新包文件身份发生变化。");
            verifyVsix(await handle.readFile(), component, this.vscodeVersion);
            const after = await handle.stat();
            const named = await fs.lstat(file);
            if (before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs || named.isSymbolicLink()
                || named.ino !== before.ino || named.dev !== before.dev || named.size !== before.size || path.dirname(await fs.realpath(file)) !== root)
                throw new Error("更新包验证期间发生变化。");
        }
        finally {
            await handle.close();
        }
    }
}
exports.PackageStore = PackageStore;
