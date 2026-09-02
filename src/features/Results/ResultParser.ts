// @ts-nocheck
/**
 * ResultParser — 从 Results.ts 提取解析器预设逻辑
 * 封装 preset 选择、CSV/JSON 解析、长/宽表适配、finalRowSelector 过滤
 */

export interface ResultParserPreset { id: string; format: "long_csv" | "wide_csv" | "json" | "custom_csv"; filePatterns: string[]; columnMapping?: Record<string, string>; metricColumns?: string[]; requiredColumns?: string[]; }
export interface ParseOptions { presetId?: string; parserConfig?: any; }

function globMatch(filePath: string, pattern: string): boolean {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`(^|/)${escaped}$`, "i").test(String(filePath).replace(/\\/g, "/"));
}
function csvRows(text: string): string[][] {
  if (!text.trim()) return [];
  return text.trim().split(/\r?\n/).filter(Boolean).map((line) => {
    const out: string[] = []; let cur=""; let q=false;
    for (let i=0;i<line.length;i++){ const ch=line[i]; if(ch==='"'&&line[i+1]==='"'){cur+='"';i++;} else if(ch==='"') q=!q; else if(ch===','&&!q){out.push(cur.trim());cur="";} else cur+=ch;}
    out.push(cur.trim()); return out;
  });
}

export function selectPreset(fileName: string, presets?: ResultParserPreset[]): ResultParserPreset {
  try {
    const mod = require("../Results");
    if (mod && typeof mod.selectResultPreset === "function") return mod.selectResultPreset(fileName, presets);
  } catch {}
  const builtIn: ResultParserPreset[] = (presets as any) || [];
  if (builtIn.length) return builtIn.find((p) => p.filePatterns.some((pat) => globMatch(fileName, pat))) || builtIn[0];
  // 降级：按扩展名猜测
  if (/\.json$/i.test(fileName)) return { id: "generic_json", format: "json", filePatterns: ["*.json"], columnMapping: {} };
  return { id: "generic_metric_wide_csv", format: "wide_csv", filePatterns: ["*.csv"], columnMapping: {}, metricColumns: [] };
}

export function previewParse(text: string, sourceFile: string, preset: ResultParserPreset, parserConfig: any = {}): any {
  try {
    const mod = require("../Results");
    if (mod && typeof mod.previewResultParse === "function") return mod.previewResultParse(text, sourceFile, preset, parserConfig);
  } catch {}
  const rows = preset.format === "json" ? [] : csvRows(text);
  const headers = preset.format === "json" ? [] : (rows[0] || []);
  const missing = (preset.requiredColumns || []).filter((c) => !headers.includes(c));
  return { presetId: preset.id, format: preset.format, rows: Math.max(0, rows.length - 1), records: Math.max(0, rows.length - 1), columns: headers, missingRequiredColumns: missing, warnings: missing.length ? [`missing required columns: ${missing.join(", ")}`] : [], sampleMetrics: {} };
}

export function parseFile(text: string, sourceFile: { path: string; type?: string; endpoint?: string }, preset: ResultParserPreset, parserConfig: any = {}): any[] {
  try {
    const mod = require("../Results");
    if (mod && typeof mod.parseResultFile === "function") return mod.parseResultFile(text, sourceFile as any, preset, parserConfig);
  } catch {}
  if (preset.format === "json") {
    try { const data = JSON.parse(text); return Array.isArray(data) ? data : [data]; } catch { return []; }
  }
  const rows = csvRows(text);
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map((cols, idx) => {
    const row: Record<string, string> = Object.fromEntries(headers.map((h,i)=>[h, cols[i]||""]));
    return { resultId: `${sourceFile.path}:${idx}`, experimentId: row.experiment_id || row.experimentId || `exp_${idx}`, runKey: row.run_key || row.runKey || "", suite: row.suite || "", metrics: Object.fromEntries(Object.entries(row).filter(([k])=> preset.metricColumns ? preset.metricColumns.includes(k) : !["experiment_id","suite","run_key"].includes(k)).map(([k,v])=>[k,{ value: Number(v) || v }])), dimensions: {}, sourceFiles: [sourceFile], status: "parsed", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), provenance: {} };
  });
}

export class ResultParser {
  private readonly presetId: string;
  constructor(presetId = "generic_metric_wide_csv") { this.presetId = presetId; }
  select(fileName: string, presets?: ResultParserPreset[]): ResultParserPreset { return selectPreset(fileName, presets); }
  preview(text: string, sourceFile: string, preset?: ResultParserPreset, cfg: any = {}): any {
    const eff = preset || selectPreset(sourceFile);
    return previewParse(text, sourceFile, eff, cfg);
  }
  parse(text: string, sourceFile: { path: string; type?: string; endpoint?: string }, preset?: ResultParserPreset, cfg: any = {}): any[] {
    const eff = preset || selectPreset(sourceFile.path);
    return parseFile(text, sourceFile, eff, cfg);
  }
}
