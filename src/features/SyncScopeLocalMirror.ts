import { safeSyncPath } from "./SyncResolution";

type FileHash = { sha256: string };

export async function mirrorChosenWorkerVersionToLocal(
  relative: string,
  directory: boolean,
  source: Record<string, FileHash>,
  transfer: () => Promise<void>,
  inventory: () => Promise<Record<string, FileHash>>,
  remove: (relative: string) => Promise<void>,
  report: (stage: string) => void = () => {},
  expectedFiles?: string[],
): Promise<void> {
  safeSyncPath(relative);
  const expected = directory ? source : expectedFiles?.length
    ? Object.fromEntries(expectedFiles.map((file) => [file, source[file]]))
    : { [relative]: source[relative] };
  if (!directory && !source[relative]?.sha256) throw new Error("来源文件缺少 SHA256。");
  for (const [file, info] of Object.entries(expected)) {
    safeSyncPath(file);
    if (!info?.sha256 || directory && !file.startsWith(`${relative}/`)) throw new Error(`来源清单路径或 SHA256 无效：${file}`);
  }
  await transfer();
  let actual = await inventory();
  for (const [file, info] of Object.entries(expected))
    if (actual[file]?.sha256?.toLowerCase() !== info.sha256.toLowerCase()) throw new Error(`本机 ${file} SHA256 校验不一致；保留待同步状态。`);
  if (directory) {
    const stale = Object.keys(actual).filter((file) => !expected[file]);
    for (const [index, file] of stale.entries()) {
      safeSyncPath(file);
      if (!file.startsWith(`${relative}/`)) throw new Error(`本机旧文件超出所选目录：${file}`);
      report(`正在清理本机旧文件 ${index + 1}/${stale.length}：${file}`);
      await remove(file);
    }
    actual = await inventory();
    const signature = (files: Record<string, FileHash>) => JSON.stringify(Object.entries(files).map(([file, info]) => [file, info.sha256.toLowerCase()]).sort());
    if (signature(actual) !== signature(expected)) throw new Error("本机目录内容校验不一致；保留待同步状态。");
  }
}
