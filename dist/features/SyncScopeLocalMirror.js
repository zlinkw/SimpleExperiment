"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mirrorChosenWorkerVersionToLocal = mirrorChosenWorkerVersionToLocal;
const SyncResolution_1 = require("./SyncResolution");
async function mirrorChosenWorkerVersionToLocal(relative, directory, source, transfer, inventory, remove, report = () => { }) {
    (0, SyncResolution_1.safeSyncPath)(relative);
    const expected = directory ? source : { [relative]: source[relative] };
    if (!directory && !source[relative]?.sha256)
        throw new Error("来源文件缺少 SHA256。");
    for (const [file, info] of Object.entries(expected)) {
        (0, SyncResolution_1.safeSyncPath)(file);
        if (!info?.sha256 || directory && !file.startsWith(`${relative}/`))
            throw new Error(`来源清单路径或 SHA256 无效：${file}`);
    }
    await transfer();
    let actual = await inventory();
    for (const [file, info] of Object.entries(expected))
        if (actual[file]?.sha256?.toLowerCase() !== info.sha256.toLowerCase())
            throw new Error(`本机 ${file} SHA256 校验不一致；保留待同步状态。`);
    if (directory) {
        const stale = Object.keys(actual).filter((file) => !expected[file]);
        for (const [index, file] of stale.entries()) {
            (0, SyncResolution_1.safeSyncPath)(file);
            if (!file.startsWith(`${relative}/`))
                throw new Error(`本机旧文件超出所选目录：${file}`);
            report(`正在清理本机旧文件 ${index + 1}/${stale.length}：${file}`);
            await remove(file);
        }
        actual = await inventory();
        const signature = (files) => JSON.stringify(Object.entries(files).map(([file, info]) => [file, info.sha256.toLowerCase()]).sort());
        if (signature(actual) !== signature(expected))
            throw new Error("本机目录内容校验不一致；保留待同步状态。");
    }
}
