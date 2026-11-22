import * as fs from "node:fs";
import * as path from "node:path";
import { builtInResultPresets, parseResultFile, selectResultPreset } from "../../features/Results";
import { businessError, emit, usageError } from "./Support";

export function resultParse(flags: { file?: string; preset?: string }): number {
  if (!flags.file) throw usageError("result parse needs --file <result file>");
  if (!fs.existsSync(flags.file)) throw businessError(`result file not found: ${flags.file}`);
  const text = fs.readFileSync(flags.file, "utf8");
  const preset = flags.preset === undefined ? selectResultPreset(flags.file, undefined, text) : builtInResultPresets.find(item => item.id === flags.preset);
  if (!preset) throw usageError(`unknown result preset: ${flags.preset}`);
  emit(parseResultFile(text, { path: flags.file, type: path.extname(flags.file).toLowerCase() === ".json" ? "json" : "csv", endpoint: "local" }, preset));
  return 0;
}
