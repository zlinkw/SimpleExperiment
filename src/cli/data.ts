import * as fs from "fs";
import * as path from "path";

export const EXPERIMENT_INDEX_REL = path.join("simple_cluster", "experiment_index.json");
export const PLAN_REGISTRY_REL = path.join("simple_cluster", "plans", "plan_registry.json");
export const RESULT_REGISTRY_REL = path.join("simple_cluster", "results", "result_registry.json");
export const RESULT_REGISTRY_LOCAL_REL = path.join("simple_cluster", "results", "result_registry.local.json");
export const DEFAULT_PLAN_DIR = path.join("experiments", "plans");
export const RUNS_DIR = path.join("experiments", "runs");

export function projectRoot(): string {
  return process.cwd();
}

export function resolveProjectPath(...parts: string[]): string {
  return path.resolve(projectRoot(), ...parts);
}

export function readJsonFile<T>(file: string, fallback: T): T {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export function readTextFile(file: string): string {
  return fs.readFileSync(file, "utf8");
}

export function fileExists(file: string): boolean {
  try {
    return fs.existsSync(file);
  } catch {
    return false;
  }
}

export function listFilesRecursive(dir: string, matcher: (name: string) => boolean, depth = 3): string[] {
  if (!fileExists(dir) || depth < 0) return [];
  const out: string[] = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    let stat: fs.Stats;
    try {
      stat = fs.statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) out.push(...listFilesRecursive(full, matcher, depth - 1));
    else if (matcher(name)) out.push(full);
  }
  return out;
}

export function readTail(file: string, maxLines = 20): string {
  if (!fileExists(file)) return "";
  const text = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  return lines.slice(Math.max(0, lines.length - maxLines)).join("\n");
}

export function copyFile(src: string, dest: string): void {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

export function packageMeta(): { name: string; version: string } {
  const candidates = [
    path.join(__dirname, "..", "..", "package.json"),
    path.join(__dirname, "..", "package.json"),
  ];
  for (const file of candidates) {
    if (!fileExists(file)) continue;
    const json = readJsonFile<Record<string, unknown>>(file, {});
    return { name: String(json.name || "simple-experiment"), version: String(json.version || "") };
  }
  return { name: "simple-experiment", version: "" };
}
