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
exports.replaceResultDirectory = replaceResultDirectory;
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
const crypto = __importStar(require("node:crypto"));
const node_fs_1 = require("node:fs");
function child(root, relative) {
    if (!relative || path.isAbsolute(relative) || relative.includes(":") || /[?*]/.test(relative)
        || relative.replace(/\\/g, "/").split("/").some(part => !part || part === "." || part === ".."))
        throw new Error("结果重建路径不安全。");
    const full = path.resolve(root, relative);
    if (!full.startsWith(root + path.sep))
        throw new Error("结果重建路径超出项目。");
    return full;
}
async function checkedParents(root, full) {
    const relative = path.relative(root, full);
    const device = (await fs.lstat(root)).dev;
    let current = root;
    for (const part of relative.split(path.sep)) {
        current = path.join(current, part);
        const stat = await fs.lstat(current).catch(error => { if (error.code === "ENOENT")
            return undefined; throw error; });
        if (stat?.isSymbolicLink())
            throw new Error("结果重建拒绝链接：" + current);
        if (stat && stat.dev !== device)
            throw new Error("结果重建拒绝挂载边界：" + current);
        if (stat && await fs.realpath(current) !== current)
            throw new Error("结果重建路径身份不一致：" + current);
    }
}
async function inventory(root) {
    const rows = [];
    const device = (await fs.lstat(root)).dev;
    const visit = async (full, relative) => {
        const stat = await fs.lstat(full);
        if (stat.dev !== device || relative.split("/").some(part => [".git", "clean_dir"].includes(part.toLowerCase())))
            throw new Error("结果目录含受保护路径或挂载边界，未替换：" + full);
        if (stat.isSymbolicLink())
            throw new Error("结果目录含链接，未替换：" + full);
        if (rows.length >= 20000)
            throw new Error("结果目录超过 20000 项，未替换。");
        if (stat.isDirectory()) {
            rows.push({ path: relative, type: "directory", dev: stat.dev, ino: stat.ino });
            for (const entry of (await fs.readdir(full)).sort())
                await visit(path.join(full, entry), relative ? relative + "/" + entry : entry);
        }
        else if (stat.isFile()) {
            const hash = crypto.createHash("sha256");
            for await (const chunk of (0, node_fs_1.createReadStream)(full))
                hash.update(chunk);
            const after = await fs.lstat(full);
            if (after.isSymbolicLink() || after.size !== stat.size || after.mtimeMs !== stat.mtimeMs || after.ino !== stat.ino)
                throw new Error("结果文件校验期间发生变化：" + full);
            rows.push({ path: relative, type: "file", size: stat.size, sha256: hash.digest("hex"), dev: stat.dev, ino: stat.ino, mtimeMs: stat.mtimeMs });
        }
        else
            throw new Error("结果目录含非普通文件，未替换：" + full);
    };
    await visit(root, "");
    return rows;
}
/** The caller prepares and validates every new result before moving any old output. */
async function replaceResultDirectory(options) {
    const root = await fs.realpath(options.root);
    const resultDir = options.resultDir.replace(/\\/g, "/");
    if (String(options.gitStatus || "").split(/\r?\n/).some(line => line.trim() && !line.startsWith("??")) && !options.allowDirtyResults)
        throw new Error("结果目录有未提交的已跟踪修改，未获准备份。");
    if (["experiments/plans", "experiments/runs", "experiments/simple_project.yaml"].some(protectedPath => protectedPath.startsWith(resultDir + "/")))
        throw new Error("结果目录包含受保护实验区域，未替换。");
    if (resultDir.split("/").some(part => [".git", "clean_dir", "simple_cluster", "paper", "src", "configs", "models"].includes(part.toLowerCase())))
        throw new Error("结果目录与受保护区域重叠，未替换。");
    if (!/^[a-zA-Z0-9_-]+$/.test(options.batchId))
        throw new Error("重建批次标识无效。");
    const source = child(root, resultDir);
    const stage = child(root, options.stagedDir.replace(/\\/g, "/"));
    if (source === stage || stage.startsWith(source + path.sep) || source.startsWith(stage + path.sep))
        throw new Error("暂存目录与结果目录重叠，未替换。");
    const backup = child(root, "clean_dir/" + resultDir);
    const superseded = child(root, "clean_dir/_superseded/" + options.batchId + "/" + resultDir);
    const manifest = child(root, "clean_dir/MANIFEST.md");
    for (const target of [source, stage, backup, superseded, manifest])
        await checkedParents(root, target);
    const sourceInventory = await inventory(source);
    const stageInventory = await inventory(stage);
    if (!stageInventory.some(row => row.type === "file" && /(?:^|\/)final\/final\.csv$/.test(row.path)))
        throw new Error("新结果没有数据集总表，旧目录保留。");
    const previous = await fs.lstat(backup).catch(error => { if (error.code === "ENOENT")
        return undefined; throw error; });
    if (previous && !options.allowSuperseded)
        throw new Error("备份目标已存在，未替换：" + backup);
    const previousInventory = previous ? await inventory(backup) : undefined;
    if (await fs.lstat(superseded).then(() => true, error => { if (error.code === "ENOENT")
        return false; throw error; }))
        throw new Error("历史备份目标已存在，未替换。");
    const verify = async (full, expected, checkCurrent = true) => {
        if (checkCurrent && options.isCurrent?.() === false)
            throw new Error("工作区已切换，结果重建取消。");
        await checkedParents(root, full);
        if (JSON.stringify(await inventory(full)) !== JSON.stringify(expected))
            throw new Error("结果目录校验后发生变化，未替换：" + full);
    };
    const absent = async (full) => {
        if (await fs.lstat(full).then(() => true, error => { if (error.code === "ENOENT")
            return false; throw error; }))
            throw new Error("结果重建目标已存在：" + full);
    };
    const move = async (from, to, expected) => {
        await verify(from, expected);
        await checkedParents(root, to);
        await absent(to);
        await fs.mkdir(path.dirname(to), { recursive: true });
        await checkedParents(root, to);
        await verify(from, expected);
        await absent(to);
        await fs.rename(from, to);
        await absent(from);
        await verify(to, expected);
        await checkedParents(root, manifest);
        await fs.appendFile(manifest, JSON.stringify({ source: from, destination: to, type: "directory", timestamp: new Date().toISOString(), batchId: options.batchId, reason: "完整重建本机结果目录", gitStatus: options.gitStatus || "", inventory: expected }) + "\n", "utf8");
    };
    // Preflight the whole batch, including an existing backup, before the first move.
    await verify(source, sourceInventory);
    await verify(stage, stageInventory);
    if (previousInventory)
        await move(backup, superseded, previousInventory);
    try {
        await move(source, backup, sourceInventory);
        await verify(stage, stageInventory);
        await absent(source);
        await fs.rename(stage, source);
        await verify(source, stageInventory);
    }
    catch (error) {
        // If publication never created a destination, restore the verified original.
        if (!await fs.lstat(source).then(() => true, error => { if (error.code === "ENOENT")
            return false; throw error; })) {
            await verify(backup, sourceInventory, false);
            await fs.rename(backup, source);
            await fs.appendFile(manifest, JSON.stringify({ source: backup, destination: source, type: "directory", timestamp: new Date().toISOString(), reason: "发布失败，恢复旧结果" }) + "\n", "utf8");
        }
        throw error;
    }
    return { source, backup, ...(previousInventory ? { superseded } : {}) };
}
