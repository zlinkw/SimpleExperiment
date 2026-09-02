"use strict";
/**
 * ResultParser — 从 Results.ts 提取解析器预设逻辑
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResultParser = void 0;
exports.selectPreset = selectPreset;
exports.previewParse = previewParse;
exports.parseFile = parseFile;
function tryRequire(id) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require(id);
    }
    catch {
        return undefined;
    }
}
function globMatch(filePath, pattern) {
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    return new RegExp(`(^|/)${escaped}$`, "i").test(String(filePath).replace(/\\/g, "/"));
}
function csvRows(text) {
    if (!text.trim())
        return [];
    return text.trim().split(/\r?\n/).filter(Boolean).map((line) => {
        const out = [];
        let cur = "";
        let q = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"' && line[i + 1] === '"') {
                cur += '"';
                i++;
            }
            else if (ch === '"')
                q = !q;
            else if (ch === ',' && !q) {
                out.push(cur.trim());
                cur = "";
            }
            else
                cur += ch;
        }
        out.push(cur.trim());
        return out;
    });
}
function selectPreset(fileName, presets) {
    const mod = tryRequire("../Results");
    if (mod?.selectResultPreset)
        return mod.selectResultPreset(fileName, presets);
    const builtIn = presets ?? [];
    if (builtIn.length)
        return builtIn.find((p) => p.filePatterns.some((pat) => globMatch(fileName, pat))) ?? builtIn[0];
    if (/\.json$/i.test(fileName))
        return { id: "generic_json", format: "json", filePatterns: ["*.json"], columnMapping: {} };
    return { id: "generic_metric_wide_csv", format: "wide_csv", filePatterns: ["*.csv"], columnMapping: {}, metricColumns: [] };
}
function previewParse(text, sourceFile, preset, parserConfig = {}) {
    const mod = tryRequire("../Results");
    if (mod?.previewResultParse)
        return mod.previewResultParse(text, sourceFile, preset, parserConfig);
    const rows = preset.format === "json" ? [] : csvRows(text);
    const headers = preset.format === "json" ? [] : (rows[0] ?? []);
    const missing = (preset.requiredColumns ?? []).filter((c) => !headers.includes(c));
    return { presetId: preset.id, format: preset.format, rows: Math.max(0, rows.length - 1), records: Math.max(0, rows.length - 1), columns: headers, missingRequiredColumns: missing, warnings: missing.length ? [`missing required columns: ${missing.join(", ")}`] : [], sampleMetrics: {} };
}
function parseFile(text, sourceFile, preset, parserConfig = {}) {
    const mod = tryRequire("../Results");
    if (mod?.parseResultFile)
        return mod.parseResultFile(text, sourceFile, preset, parserConfig);
    if (preset.format === "json") {
        try {
            const data = JSON.parse(text);
            return Array.isArray(data) ? data : [data];
        }
        catch {
            return [];
        }
    }
    const rows = csvRows(text);
    if (rows.length < 2)
        return [];
    const headers = rows[0];
    return rows.slice(1).map((cols, idx) => {
        const row = Object.fromEntries(headers.map((h, i) => [h, cols[i] ?? ""]));
        return { resultId: `${sourceFile.path}:${idx}`, experimentId: row["experiment_id"] ?? row["experimentId"] ?? `exp_${idx}`, runKey: row["run_key"] ?? row["runKey"] ?? "", suite: row["suite"] ?? "", metrics: Object.fromEntries(Object.entries(row).filter(([k]) => preset.metricColumns ? preset.metricColumns.includes(k) : !["experiment_id", "suite", "run_key"].includes(k)).map(([k, v]) => [k, { value: Number(v) || v }])), dimensions: {}, sourceFiles: [sourceFile], status: "parsed", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), provenance: {} };
    });
}
class ResultParser {
    presetId;
    constructor(presetId = "generic_metric_wide_csv") { this.presetId = presetId; }
    select(fileName, presets) { return selectPreset(fileName, presets); }
    preview(text, sourceFile, preset, cfg = {}) {
        const eff = preset ?? selectPreset(sourceFile);
        return previewParse(text, sourceFile, eff, cfg);
    }
    parse(text, sourceFile, preset, cfg = {}) {
        const eff = preset ?? selectPreset(sourceFile.path);
        return parseFile(text, sourceFile, eff, cfg);
    }
}
exports.ResultParser = ResultParser;
