"use strict";
// @ts-nocheck
/**
 * ResultsFactory — Results 工厂
 * 封装结果解析（parser preset / csv/json 解析 / leaderboard），委托给 features/Results
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultResultsFactory = void 0;
exports.createResultsFactory = createResultsFactory;
class DefaultResultsFactory {
    opts;
    constructor(opts = {}) { this.opts = opts; }
    selectPreset(fileName, presets) {
        try {
            const mod = require("../Results");
            if (mod && typeof mod.selectResultPreset === "function")
                return mod.selectResultPreset(fileName, presets);
            const pm = require("../Results/ResultParser");
            if (pm && typeof pm.selectPreset === "function")
                return pm.selectPreset(fileName, presets);
        }
        catch { }
        return { id: this.opts.defaultPresetId || "generic_metric_wide_csv", format: "wide_csv", filePatterns: ["*.csv"], columnMapping: {}, metricColumns: [] };
    }
    preview(text, sourceFile, preset, parserConfig = {}) {
        const effPreset = preset || this.selectPreset(sourceFile);
        try {
            const mod = require("../Results");
            if (mod && typeof mod.previewResultParse === "function")
                return mod.previewResultParse(text, sourceFile, effPreset, parserConfig);
            const pm = require("../Results/ResultParser");
            if (pm && typeof pm.previewParse === "function")
                return pm.previewParse(text, sourceFile, effPreset, parserConfig);
        }
        catch { }
        return { presetId: effPreset.id, format: effPreset.format, rows: 0, records: 0, columns: [], missingRequiredColumns: [], warnings: [], sampleMetrics: {} };
    }
    previewTextMetrics(text, sourceFile, opts = {}) {
        try {
            const mod = require("../Results");
            if (mod && typeof mod.previewTextMetricParse === "function")
                return mod.previewTextMetricParse(text, sourceFile, opts);
        }
        catch { }
        return { ruleId: "console_regex", sourceFile, lines: text.split(/\r?\n/).length, records: 0, metrics: [], samples: [], warnings: [], parsedAt: new Date().toISOString() };
    }
    parse(text, sourceFile, preset, parserConfig = {}) {
        try {
            const mod = require("../Results");
            if (mod && typeof mod.parseResultFile === "function")
                return mod.parseResultFile(text, sourceFile, preset, parserConfig);
            const pm = require("../Results/ResultParser");
            if (pm && typeof pm.parseFile === "function")
                return pm.parseFile(text, sourceFile, preset, parserConfig);
        }
        catch { }
        return [];
    }
    validate(records, rules) {
        try {
            const mod = require("../Results");
            if (mod && typeof mod.validateResultRecords === "function")
                return mod.validateResultRecords(records, rules);
        }
        catch { }
        return [];
    }
    leaderboard(records, config, issues = []) {
        try {
            const mod = require("../Results");
            if (mod && typeof mod.buildResultLeaderboard === "function")
                return mod.buildResultLeaderboard(records, config, issues);
        }
        catch { }
        return [];
    }
    createParser(presetId) {
        const id = presetId || this.opts.defaultPresetId || "generic_metric_wide_csv";
        return {
            presetId: id,
            parse: (text, sourceFile, cfg) => {
                const preset = this.selectPreset(typeof sourceFile === "string" ? sourceFile : sourceFile?.path || "results.csv");
                const eff = preset.id === id ? preset : { ...preset, id };
                return this.parse(text, typeof sourceFile === "string" ? { path: sourceFile, type: "csv", endpoint: "local" } : sourceFile, eff, cfg);
            },
            preview: (text, sourceFile, cfg) => {
                const preset = this.selectPreset(sourceFile);
                return this.preview(text, sourceFile, preset.id === id ? preset : { ...preset, id }, cfg);
            },
        };
    }
}
exports.DefaultResultsFactory = DefaultResultsFactory;
function createResultsFactory(opts) {
    return new DefaultResultsFactory(opts);
}
