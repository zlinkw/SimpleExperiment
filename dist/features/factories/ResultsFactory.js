"use strict";
/**
 * ResultsFactory — Results 工厂
 * 封装结果解析（parser preset / csv/json 解析 / leaderboard），委托给 features/Results
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultResultsFactory = void 0;
exports.createResultsFactory = createResultsFactory;
function tryRequire(id) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require(id);
    }
    catch {
        return undefined;
    }
}
class DefaultResultsFactory {
    opts;
    constructor(opts = {}) { this.opts = opts; }
    selectPreset(fileName, presets) {
        const mod = tryRequire("../Results");
        if (mod?.selectResultPreset)
            return mod.selectResultPreset(fileName, presets);
        const pm = tryRequire("../Results/ResultParser");
        if (pm?.selectPreset)
            return pm.selectPreset(fileName, presets);
        throw new Error("结果解析 preset 实现不可用。");
    }
    preview(text, sourceFile, preset, parserConfig = {}) {
        const effPreset = (preset ?? this.selectPreset(sourceFile));
        const mod = tryRequire("../Results");
        if (mod?.previewResultParse)
            return mod.previewResultParse(text, sourceFile, effPreset, parserConfig);
        const pm = tryRequire("../Results/ResultParser");
        if (pm?.previewParse)
            return pm.previewParse(text, sourceFile, effPreset, parserConfig);
        throw new Error("结果解析预览实现不可用。");
    }
    previewTextMetrics(text, sourceFile, opts = {}) {
        const mod = tryRequire("../Results");
        if (mod?.previewTextMetricParse)
            return mod.previewTextMetricParse(text, sourceFile, opts);
        throw new Error("文本指标解析预览实现不可用。");
    }
    parse(text, sourceFile, preset, parserConfig = {}) {
        const mod = tryRequire("../Results");
        if (mod?.parseResultFile)
            return mod.parseResultFile(text, sourceFile, preset, parserConfig);
        const pm = tryRequire("../Results/ResultParser");
        if (pm?.parseFile)
            return pm.parseFile(text, sourceFile, preset, parserConfig);
        throw new Error("结果文件解析实现不可用。");
    }
    validate(records, rules) {
        const mod = tryRequire("../Results");
        if (mod?.validateResultRecords)
            return mod.validateResultRecords(records, rules);
        throw new Error("结果记录校验实现不可用。");
    }
    leaderboard(records, config, issues = []) {
        const mod = tryRequire("../Results");
        if (mod?.buildResultLeaderboard)
            return mod.buildResultLeaderboard(records, config, issues);
        throw new Error("结果排行榜构建实现不可用。");
    }
    createParser(presetId) {
        const id = presetId ?? this.opts.defaultPresetId ?? "generic_metric_wide_csv";
        return {
            presetId: id,
            parse: (text, sourceFile, cfg) => {
                const name = typeof sourceFile === "string" ? sourceFile : sourceFile?.["path"] ?? "results.csv";
                const preset = this.selectPreset(name);
                const eff = preset["id"] === id ? preset : { ...preset, id };
                const src = typeof sourceFile === "string" ? { path: sourceFile, type: "csv", endpoint: "local" } : sourceFile;
                return this.parse(text, src, eff, cfg);
            },
            preview: (text, sourceFile, cfg) => {
                const preset = this.selectPreset(sourceFile);
                return this.preview(text, sourceFile, preset["id"] === id ? preset : { ...preset, id }, cfg);
            },
        };
    }
}
exports.DefaultResultsFactory = DefaultResultsFactory;
function createResultsFactory(opts) {
    return new DefaultResultsFactory(opts);
}
