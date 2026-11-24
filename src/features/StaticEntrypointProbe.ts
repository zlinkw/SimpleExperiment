import * as fs from "node:fs/promises";
import * as path from "node:path";

type Report = { ok: boolean; checked?: boolean; error?: string; tail?: string };
const pending = new Map<string, Promise<Report>>();

/** Static Windows entry probe. No imports, interpreter launch or environment management. */
export async function staticEntrypointProbe(root: string, template: string): Promise<Report> {
  const command = String(template || "").trim();
  if (!command) return { ok: false, error: "指令为空" };
  const match = command.match(/^python(?:\d+(?:\.\d+)?)?\s+(?:(?:-u|-B|-E|-I|-s|-S)\s+)*(?:"([^"]+)"|'([^']+)'|([^\s]+))/);
  const script = match?.[1] || match?.[2] || match?.[3] || "";
  if (!script || script.startsWith("-") || /[${}*?]/.test(script) || path.isAbsolute(script)) return { ok: true, checked: false };
  const canonical = await fs.realpath(root), file = path.resolve(canonical, script);
  const relative = path.relative(canonical, file);
  if (!relative || relative === ".." || relative.startsWith(".." + path.sep) || path.isAbsolute(relative)) return { ok: true, checked: false };
  const key = JSON.stringify([canonical, file, command]);
  if (pending.has(key)) return { ...await pending.get(key)! };
  const work = (async (): Promise<Report> => {
    let before;
    try { before = await fs.stat(file, { bigint: true }); }
    catch (error: any) {
      if (error.code !== "ENOENT") throw error;
      return { ok: false, checked: true, error: `入口文件不存在: ${script}`, tail: `${script} not found` };
    }
    if (!before.isFile()) return { ok: false, checked: true, error: `入口不是文件: ${script}` };
    return { ok: true, checked: true };
  })();
  pending.set(key, work);
  try { return { ...await work }; } finally { if (pending.get(key) === work) pending.delete(key); }
}
