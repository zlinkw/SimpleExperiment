import { safeSyncPath } from "./SyncResolution";
import type { ScopeEntry } from "./SyncScopeTree";

function parentOf(relative: string): string {
  const index = relative.lastIndexOf("/");
  return index < 0 ? "." : relative.slice(0, index);
}

export async function expandSyncScopeBatchSelection(
  selected: string[],
  excluded: string[],
  list: (parent: string) => Promise<ScopeEntry[]>,
): Promise<ScopeEntry[]> {
  const paths = [...new Set(selected)];
  const exclusions = [...new Set(excluded.map(safeSyncPath))];
  if (!paths.length) throw new Error("请先勾选要批量操作的文件或目录。");
  for (const item of paths) if (item !== ".") safeSyncPath(item);
  const cache = new Map<string, Promise<ScopeEntry[]>>();
  const children = (parent: string) => {
    if (!cache.has(parent)) cache.set(parent, list(parent));
    return cache.get(parent)!;
  };
  const resolve = async (relative: string): Promise<ScopeEntry> => {
    if (relative === ".") return { name: ".", path: ".", directory: true };
    const entry = (await children(parentOf(relative))).find((item) => item.path === relative);
    if (!entry) throw new Error(`已勾选路径不存在，请刷新文件树：${relative}`);
    return entry;
  };
  const result: ScopeEntry[] = [];
  const expand = async (entry: ScopeEntry): Promise<void> => {
    const relative = entry.path;
    if (exclusions.some((item) => item === relative || relative.startsWith(`${item}/`))) return;
    const hasExcludedChild = exclusions.some((item) => item.startsWith(`${relative}/`));
    if (relative === "." || hasExcludedChild) {
      if (!entry.directory) throw new Error(`文件下不能设置排除项：${relative}`);
      for (const child of await children(relative)) {
        if (child.selectable === false) continue;
        safeSyncPath(child.path);
        if (parentOf(child.path) !== relative) throw new Error(`文件树返回了越级路径：${child.path}`);
        await expand(child);
      }
    } else result.push(entry);
  };
  for (const relative of paths.sort((a, b) => a.length - b.length || a.localeCompare(b))) {
    if (paths.some((ancestor) => ancestor !== relative && (ancestor === "." || relative.startsWith(`${ancestor}/`)))) continue;
    await expand(await resolve(relative));
  }
  if (!result.length) throw new Error("所选范围内没有可操作的文件或目录。");
  return result.sort((a, b) => a.path.localeCompare(b.path));
}

export async function runSyncScopeBatch<T>(
  items: T[],
  task: (item: T, index: number) => Promise<void>,
  progress: (completed: number, total: number) => void,
  limit = 2,
): Promise<Array<{ item: T; error?: string }>> {
  if (!Number.isInteger(limit) || limit < 1) throw new Error("批量并发数无效。");
  const results: Array<{ item: T; error?: string }> = Array(items.length);
  let next = 0;
  let completed = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = next++;
      if (index >= items.length) return;
      try {
        await task(items[index], index);
        results[index] = { item: items[index] };
      } catch (error) {
        results[index] = { item: items[index], error: error instanceof Error ? error.message : String(error) };
      }
      progress(++completed, items.length);
    }
  }));
  return results;
}
