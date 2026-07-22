"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.builtInPaperTableTemplates = exports.builtInResultSchemas = exports.finalResultInclusionPolicy = exports.defaultInclusionPolicy = exports.defaultValidationRules = exports.builtInResultPresets = exports.classificationMetricDirections = exports.segmentationMetricDirections = exports.defaultTextMetricPattern = exports.RESULT_EXPORT_DIR = exports.RESULT_REGISTRY_LOCAL_PATH = exports.RESULT_REGISTRY_PATH = void 0;
exports.selectResultPreset = selectResultPreset;
exports.previewResultParse = previewResultParse;
exports.previewTextMetricParse = previewTextMetricParse;
exports.parseResultFile = parseResultFile;
exports.upsertExperimentResults = upsertExperimentResults;
exports.validateResultRecords = validateResultRecords;
exports.buildResultLeaderboard = buildResultLeaderboard;
exports.leaderboardToCsv = leaderboardToCsv;
exports.leaderboardToMarkdownTable = leaderboardToMarkdownTable;
exports.exportPaperTable = exportPaperTable;
exports.readResultConfigJson = readResultConfigJson;
exports.normalizeMetricKey = normalizeMetricKey;
exports.detectMetricAliasConflicts = detectMetricAliasConflicts;
exports.applyResultSchema = applyResultSchema;
exports.extractDimension = extractDimension;
exports.createResultRevision = createResultRevision;
exports.applyResultRevision = applyResultRevision;
exports.reparseResultRecords = reparseResultRecords;
exports.explainInclusion = explainInclusion;
exports.filterByInclusionPolicy = filterByInclusionPolicy;
exports.aggregateMetricValues = aggregateMetricValues;
exports.buildAdvancedLeaderboard = buildAdvancedLeaderboard;
exports.renderPaperTableTemplate = renderPaperTableTemplate;
exports.buildResultDashboard = buildResultDashboard;
exports.filterResultsByDsl = filterResultsByDsl;
exports.exportResultBundle = exportResultBundle;
exports.importResultBundle = importResultBundle;
exports.checkResultConsistency = checkResultConsistency;
const crypto_1 = require("crypto");
exports.RESULT_REGISTRY_PATH = "zlk_cluster/results/result_registry.json";
exports.RESULT_REGISTRY_LOCAL_PATH = "zlk_cluster/results/result_registry.local.json";
exports.RESULT_EXPORT_DIR = "zlk_cluster/results/exports";
exports.defaultTextMetricPattern = /\b(?<metric>(?:accuracy|acc|auc|auroc|roc_auc|auprc|f1|precision|recall|sensitivity|specificity|balanced_accuracy|loss|dice|dsc|iou|hd95|asd|mae|mse|rmse|r2))\b\s*[:=]\s*(?<value>-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)(?:\s*%)?/gi;
exports.segmentationMetricDirections = {
    DSC: "higher",
    Dice: "higher",
    ASD: "lower",
    HD95: "lower",
    IoU: "higher",
    precision: "higher",
    recall: "higher",
};
exports.classificationMetricDirections = {
    accuracy: "higher",
    AUC: "higher",
    AUROC: "higher",
    ROC_AUC: "higher",
    AUPRC: "higher",
    F1: "higher",
    precision: "higher",
    recall: "higher",
    sensitivity: "higher",
    specificity: "higher",
    balanced_accuracy: "higher",
    macro_f1: "higher",
    micro_f1: "higher",
    mcc: "higher",
    kappa: "higher",
    ece: "lower",
    brier: "lower",
    loss: "lower",
};
exports.builtInResultPresets = [
    preset("classification_long_csv", "Classification long CSV", "long_csv", exports.classificationMetricDirections, ["accuracy", "AUC", "AUROC", "ROC_AUC", "AUPRC", "F1", "precision", "recall", "sensitivity", "specificity", "balanced_accuracy", "loss"]),
    preset("classification_wide_csv", "Classification wide CSV", "wide_csv", exports.classificationMetricDirections, ["accuracy", "AUC", "AUROC", "ROC_AUC", "AUPRC", "F1", "precision", "recall", "sensitivity", "specificity", "balanced_accuracy", "loss"]),
    preset("medical_segmentation_long_csv", "Medical segmentation long CSV", "long_csv", exports.segmentationMetricDirections, ["DSC", "ASD", "HD95", "IoU", "Dice"]),
    preset("medical_segmentation_wide_csv", "Medical segmentation wide CSV", "wide_csv", exports.segmentationMetricDirections, ["DSC", "ASD", "HD95", "IoU", "Dice"]),
    preset("regression_wide_csv", "Regression wide CSV", "wide_csv", { MAE: "lower", MSE: "lower", RMSE: "lower", R2: "higher", loss: "lower" }, ["MAE", "MSE", "RMSE", "R2", "loss"]),
    preset("generic_metric_long_csv", "Generic metric long CSV", "long_csv", {}, []),
    preset("generic_metric_wide_csv", "Generic metric wide CSV", "wide_csv", {}, []),
];
exports.defaultValidationRules = [
    ...["accuracy", "AUC", "AUROC", "ROC_AUC", "AUPRC", "F1", "precision", "recall", "sensitivity", "specificity", "balanced_accuracy", "DSC", "Dice", "IoU"].map((metric) => ({ id: `${metric}_range`, enabled: true, metric, check: { type: "range", min: 0, max: 1 }, severity: "warning", message: `${metric} should be in [0,1]` })),
    ...["loss", "ASD", "HD95", "ece", "brier"].map((metric) => ({ id: `${metric}_nonnegative`, enabled: true, metric, check: { type: "range", min: 0 }, severity: "warning", message: `${metric} should be non-negative` })),
    { id: "primary_metric_present", enabled: true, check: { type: "not_null" }, severity: "warning", message: "Primary metric missing" },
];
exports.defaultInclusionPolicy = {
    id: "default_results",
    name: "Default results",
    includeStatuses: ["parsed", "validated", "warning", "manual_verified"],
    excludeTags: ["deleted", "excluded"],
    excludeIfValidationSeverityAtLeast: "critical",
};
exports.finalResultInclusionPolicy = {
    id: "final_results_only",
    name: "Final archived results only",
    includeStatuses: ["parsed", "validated", "warning", "manual_verified"],
    excludeTags: ["deleted", "excluded"],
    excludeIfValidationSeverityAtLeast: "critical",
    requireFinalEvidence: true,
};
exports.builtInResultSchemas = [
    {
        schemaVersion: 1,
        id: "medical_segmentation",
        name: "Medical segmentation",
        dimensions: commonDimensions(),
        metrics: [
            metricDef("DSC", "DSC", "number", true, 3, "segmentation", ["dice", "Dice", "mean_dice"], { min: 0, max: 1 }, true),
            metricDef("ASD", "ASD", "number", false, 2, "segmentation", [], { min: 0 }),
            metricDef("HD95", "HD95", "number", false, 2, "segmentation", ["hd95", "hausdorff95"], { min: 0 }),
            metricDef("IoU", "IoU", "number", true, 3, "segmentation", [], { min: 0, max: 1 }),
        ],
        validationRules: exports.defaultValidationRules,
        defaultLeaderboards: [{
                id: "medical_main",
                name: "Medical main",
                filter: { includeWarnings: true },
                groupBy: ["method", "dataset"],
                metrics: [{ key: "DSC", higherIsBetter: true, decimals: 3 }, { key: "ASD", higherIsBetter: false, decimals: 2 }, { key: "HD95", higherIsBetter: false, decimals: 2 }],
                aggregate: "mean_std",
                primarySortMetric: "DSC",
            }],
        defaultPaperTables: [{ id: "medical_main_table", title: "Medical segmentation", leaderboardId: "medical_main", rowDimension: "method", metrics: ["DSC", "ASD", "HD95"], boldBest: true, underlineSecondBest: true, showMeanStd: true, decimals: { DSC: 3, ASD: 2, HD95: 2 }, metricDisplayNames: {} }],
        display: { defaultGroupBy: ["method", "dataset"], defaultSortMetric: "DSC", pinnedMetrics: ["DSC", "ASD", "HD95"] },
    },
    {
        schemaVersion: 1,
        id: "classification",
        name: "Classification",
        dimensions: commonDimensions(),
        metrics: [
            metricDef("accuracy", "Accuracy", "number", true, 3, "classification", ["acc"], { min: 0, max: 1 }, true),
            metricDef("AUC", "AUC", "number", true, 3, "classification", ["auc", "AUROC", "roc_auc"], { min: 0, max: 1 }),
            metricDef("AUPRC", "AUPRC", "number", true, 3, "classification", ["auprc", "pr_auc"], { min: 0, max: 1 }),
            metricDef("F1", "F1", "number", true, 3, "classification", ["f1", "macro_f1", "micro_f1"], { min: 0, max: 1 }),
            metricDef("precision", "Precision", "number", true, 3, "classification", ["ppv"], { min: 0, max: 1 }),
            metricDef("recall", "Recall", "number", true, 3, "classification", ["sensitivity", "tpr"], { min: 0, max: 1 }),
            metricDef("specificity", "Specificity", "number", true, 3, "classification", ["tnr"], { min: 0, max: 1 }),
            metricDef("balanced_accuracy", "Balanced accuracy", "number", true, 3, "classification", ["bal_acc", "balanced_acc"], { min: 0, max: 1 }),
            metricDef("loss", "Loss", "number", false, 4, "loss", [], { min: 0 }),
        ],
        validationRules: exports.defaultValidationRules,
        defaultLeaderboards: [{
                id: "classification_main",
                name: "Classification main",
                filter: { includeWarnings: true },
                groupBy: ["method", "dataset"],
                metrics: [{ key: "AUC", higherIsBetter: true, decimals: 3 }, { key: "accuracy", higherIsBetter: true, decimals: 3 }, { key: "F1", higherIsBetter: true, decimals: 3 }, { key: "AUPRC", higherIsBetter: true, decimals: 3 }],
                aggregate: "mean_std",
                primarySortMetric: "AUC",
            }],
        defaultPaperTables: [{ id: "classification_main_table", title: "Classification", leaderboardId: "classification_main", rowDimension: "method", metrics: ["AUC", "accuracy", "F1", "AUPRC"], boldBest: true, underlineSecondBest: true, showMeanStd: true, decimals: { AUC: 3, accuracy: 3, F1: 3, AUPRC: 3 }, metricDisplayNames: {} }],
        display: { defaultGroupBy: ["method", "dataset"], defaultSortMetric: "AUC", pinnedMetrics: ["AUC", "accuracy", "F1", "AUPRC", "precision", "recall", "specificity"] },
    },
];
exports.builtInPaperTableTemplates = [
    paperTemplate("medical_segmentation_main_table", "Medical segmentation main table", ["method"], ["dataset"], ["DSC", "ASD", "HD95"]),
    paperTemplate("medical_segmentation_ablation_table", "Medical segmentation ablation table", ["method"], undefined, ["DSC", "ASD"]),
    paperTemplate("classification_main_table", "Classification main table", ["method"], ["dataset"], ["accuracy", "AUC", "F1"]),
    paperTemplate("cross_dataset_summary", "Cross dataset summary", ["method"], ["dataset"], ["DSC"]),
    paperTemplate("missing_modality_robustness_table", "Missing modality robustness", ["method"], ["missing_rate"], ["DSC", "ASD"]),
    paperTemplate("noise_robustness_table", "Noise robustness", ["method"], ["noise_level"], ["DSC", "ASD"]),
];
function selectResultPreset(fileName, presets = exports.builtInResultPresets) {
    return presets.find((item) => item.filePatterns.some((pattern) => globMatch(fileName, pattern))) || presets[0];
}
function previewResultParse(text, sourceFile, preset) {
    const rows = csvRows(text);
    const headers = rows[0] || [];
    const missingRequiredColumns = (preset.requiredColumns || []).filter((column) => !headers.includes(column));
    const records = parseResultFile(text, { path: sourceFile, type: sourceFile.endsWith(".json") ? "json" : "csv", endpoint: "local" }, preset);
    return {
        presetId: preset.id,
        format: preset.format,
        rows: Math.max(0, rows.length - 1),
        records: records.length,
        columns: headers,
        missingRequiredColumns,
        warnings: [
            ...(missingRequiredColumns.length ? [`missing required columns: ${missingRequiredColumns.join(", ")}`] : []),
            ...records.filter((record) => record.notes?.includes("inferred")).map((record) => `${record.resultId}: ${record.notes}`),
        ],
        sampleMetrics: records[0]?.metrics || {},
    };
}
function previewTextMetricParse(text, sourceFile, options = {}) {
    const customPattern = compileTextMetricPattern(options.metricRegex);
    const ruleId = customPattern ? "custom_regex" : /summary\.txt$/i.test(sourceFile) ? "summary_text_regex" : "console_regex";
    const samples = [];
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
        const pattern = new RegExp((customPattern || exports.defaultTextMetricPattern).source, "gi");
        for (const match of line.matchAll(pattern)) {
            const metric = normalizeTextMetricName(match.groups?.metric || "", options.metricAliases);
            const raw = Number(match.groups?.value);
            if (!metric || !Number.isFinite(raw))
                continue;
            const matchedText = line.slice(match.index || 0, (match.index || 0) + match[0].length);
            samples.push({
                metric,
                value: /%\s*$/.test(matchedText) ? raw / 100 : raw,
                line: index + 1,
                snippet: compactSnippet(line),
                higherIsBetter: !["loss", "log_loss", "cross_entropy", "ce_loss", "asd", "hd95", "mae", "mse", "rmse"].includes(metric.toLowerCase()),
            });
        }
    });
    return {
        ruleId,
        sourceFile,
        lines: lines.length,
        records: samples.length,
        metrics: unique(samples.map((item) => item.metric)),
        samples: samples.slice(0, 8),
        warnings: [
            ...(options.metricRegex && !customPattern ? ["自定义指标正则无效，已回退到默认正则。"] : []),
            ...(samples.length ? [] : ["未从文本中捕获指标；可配置自定义正则。"]),
        ],
        parsedAt: new Date().toISOString(),
    };
}
function parseResultFile(text, sourceFile, preset, parserConfig = {}) {
    if (preset.format === "json" || sourceFile.type === "json")
        return parseJsonResult(text, sourceFile, preset, parserConfig);
    const rows = csvRows(text);
    const headers = rows[0] || [];
    const data = rows.slice(1).map((cols) => Object.fromEntries(headers.map((header, index) => [header, cols[index] || ""])));
    const filtered = finalRows(applyFilters(data, preset), preset);
    return isLongFormat(headers, preset)
        ? parseLongRows(filtered, sourceFile, preset, parserConfig)
        : parseWideRows(filtered, headers, sourceFile, preset, parserConfig);
}
function upsertExperimentResults(existing, incoming) {
    const map = new Map(existing.map((item) => [item.resultId, item]));
    for (const record of incoming) {
        const previous = map.get(record.resultId);
        map.set(record.resultId, previous ? { ...previous, ...record, createdAt: previous.createdAt, updatedAt: new Date().toISOString() } : record);
    }
    return Array.from(map.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
function validateResultRecords(records, rules = exports.defaultValidationRules) {
    const issues = [];
    const seen = new Map();
    for (const record of records) {
        if (record.primaryMetric && !record.metrics[record.primaryMetric])
            issues.push(issue(record, "primary_metric", undefined, "warning", `Primary metric missing: ${record.primaryMetric}`));
        for (const [metric, value] of Object.entries(record.metrics)) {
            const key = `${record.experimentId}:${metric}:${value.dataset || ""}:${value.split || ""}:${value.fold || ""}:${value.seed || ""}`;
            const previous = seen.get(key);
            if (previous && previous.value !== value.value)
                issues.push(issue(record, "duplicate_conflict", metric, "warning", `Conflicting duplicate metric: ${metric}`, { previous, value }));
            seen.set(key, value);
            for (const rule of rules.filter((item) => item.enabled && (!item.metric || metricAlias(item.metric) === metricAlias(metric)))) {
                if (!dimensionMatches(record, rule.dimensionFilter))
                    continue;
                if (!checkMetric(value.value, rule.check))
                    issues.push(issue(record, rule.id, metric, rule.severity, rule.message, value));
            }
        }
    }
    return issues;
}
function buildResultLeaderboard(records, config, issues = []) {
    const issueIds = new Set(issues.filter((item) => !config.filter.includeWarnings && ["warning", "critical"].includes(item.severity)).map((item) => item.resultId));
    const filtered = records.filter((record) => {
        if (record.status === "excluded" || record.status === "parse_failed")
            return false;
        if (issueIds.has(record.resultId))
            return false;
        if (config.filter.suite?.length && !config.filter.suite.includes(record.suite))
            return false;
        if (config.filter.status?.length && !config.filter.status.includes(record.status))
            return false;
        if (config.filter.tags?.length && !config.filter.tags.some((tag) => record.tags?.includes(tag)))
            return false;
        if (config.filter.dataset?.length && !config.filter.dataset.includes(String(record.dimensions.dataset || "")))
            return false;
        if (config.filter.split?.length && !config.filter.split.includes(String(record.dimensions.split || "")))
            return false;
        return true;
    });
    const groups = new Map();
    for (const record of filtered) {
        const groupKey = config.groupBy.map((key) => String(record.dimensions[key] ?? record[key] ?? "")).join(" | ");
        groups.set(groupKey, [...(groups.get(groupKey) || []), record]);
    }
    return Array.from(groups.entries()).map(([groupKey, items]) => {
        const values = {};
        for (const metric of config.metrics) {
            const nums = items.map((item) => Number(item.metrics[metric.key]?.value)).filter(Number.isFinite);
            values[metric.key] = aggregate(nums, config.aggregate);
        }
        const primary = config.primarySortMetric || config.metrics[0]?.key;
        const primaryCfg = config.metrics.find((metric) => metric.key === primary);
        const best = primary ? [...items].filter((item) => Number.isFinite(Number(item.metrics[primary]?.value))).sort((a, b) => {
            const av = Number(a.metrics[primary]?.value);
            const bv = Number(b.metrics[primary]?.value);
            return primaryCfg?.higherIsBetter === false ? av - bv : bv - av;
        })[0] : undefined;
        return {
            groupKey,
            dimensions: Object.fromEntries(config.groupBy.map((key) => [key, items[0]?.dimensions[key] ?? ""])),
            count: items.length,
            values,
            bestResultId: best?.resultId,
        };
    }).sort((a, b) => sortLeaderboard(a, b, config));
}
function leaderboardToCsv(rows, config) {
    const headers = ["group", "count", ...config.metrics.map((metric) => metric.label || metric.key), "bestResultId"];
    const body = rows.map((row) => [row.groupKey, row.count, ...config.metrics.map((metric) => formatAggregate(row.values[metric.key], metric.decimals ?? 4)), row.bestResultId || ""]);
    return [headers, ...body].map((row) => row.map(csvEscape).join(",")).join("\n");
}
function leaderboardToMarkdownTable(rows, config) {
    const headers = ["Group", "N", ...config.metrics.map((metric) => metric.label || metric.key), "Best"];
    const sep = headers.map((_, index) => index < 2 ? "---" : "---:").join(" | ");
    const body = rows.map((row) => [row.groupKey, String(row.count), ...config.metrics.map((metric) => formatAggregate(row.values[metric.key], metric.decimals ?? 4)), row.bestResultId || ""].join(" | "));
    return [headers.join(" | "), sep, ...body].join("\n");
}
function exportPaperTable(rows, leaderboard, table, format = "markdown") {
    if (format === "csv")
        return leaderboardToCsv(rows, leaderboard);
    if (format === "markdown")
        return leaderboardToMarkdownTable(withBestFormatting(rows, leaderboard, table, false), leaderboard);
    const cols = ["Method", ...table.metrics.map((metric) => table.metricDisplayNames[metric] || metric)];
    const body = withBestFormatting(rows, leaderboard, table, true).map((row) => [
        displayName(String(row.dimensions[table.rowDimension] || row.groupKey), table.methodDisplayNames),
        ...table.metrics.map((metric) => formatAggregate(row.values[metric], table.decimals[metric] ?? 4)),
    ]);
    const line = format === "latex_booktabs" ? "\\toprule" : "\\hline";
    const mid = format === "latex_booktabs" ? "\\midrule" : "\\hline";
    const bottom = format === "latex_booktabs" ? "\\bottomrule" : "\\hline";
    return [
        `\\begin{tabular}{l${"r".repeat(table.metrics.length)}}`,
        line,
        `${cols.join(" & ")} \\\\`,
        mid,
        ...body.map((row) => `${row.join(" & ")} \\\\`),
        bottom,
        "\\end{tabular}",
    ].join("\n");
}
function readResultConfigJson(text, validate, lastKnownGood) {
    try {
        const parsed = JSON.parse(text);
        return validate(parsed) ? { ok: true, value: parsed } : { ok: false, value: lastKnownGood, error: "schema validation failed" };
    }
    catch (error) {
        return { ok: false, value: lastKnownGood, error: error instanceof Error ? error.message : String(error) };
    }
}
function normalizeMetricKey(metric, schema, extraRules = []) {
    const rules = [
        ...(schema?.metrics.flatMap((item) => (item.aliases || []).map((from) => ({ from, to: item.key, caseInsensitive: true, trim: true }))) || []),
        { from: "dice", to: "DSC", caseInsensitive: true, trim: true },
        { from: "mean_dice", to: "DSC", caseInsensitive: true, trim: true },
        { from: "hd95", to: "HD95", caseInsensitive: true, trim: true },
        { from: "hausdorff95", to: "HD95", caseInsensitive: true, trim: true },
        ...extraRules,
    ];
    for (const rule of rules) {
        const from = rule.trim ? rule.from.trim() : rule.from;
        const value = rule.trim ? metric.trim() : metric;
        const flags = rule.caseInsensitive ? "i" : "";
        if (rule.regex ? new RegExp(from, flags).test(value) : (rule.caseInsensitive ? from.toLowerCase() === value.toLowerCase() : from === value))
            return rule.to;
    }
    return metric.trim();
}
function detectMetricAliasConflicts(schema) {
    const aliases = new Map();
    for (const metric of schema.metrics) {
        for (const aliasValue of metric.aliases || []) {
            const key = aliasValue.trim().toLowerCase();
            aliases.set(key, aliases.get(key) || new Set());
            aliases.get(key).add(metric.key);
        }
    }
    return Array.from(aliases.entries()).filter(([, targets]) => targets.size > 1).map(([aliasValue, targets]) => ({ alias: aliasValue, targets: Array.from(targets) }));
}
function applyResultSchema(record, schema, context = {}) {
    const metrics = {};
    for (const [key, value] of Object.entries(record.metrics)) {
        const normalized = normalizeMetricKey(key, schema);
        const def = schema.metrics.find((item) => item.key === normalized);
        metrics[normalized] = { ...value, higherIsBetter: def?.higherIsBetter ?? value.higherIsBetter, unit: value.unit || def?.unit, sourceColumn: value.sourceColumn || key };
    }
    const dimensions = { ...record.dimensions };
    for (const dimension of schema.dimensions) {
        const value = extractDimension(context.row || {}, dimension, { ...context, record });
        if (value !== undefined)
            dimensions[dimension.key] = value;
    }
    const primary = schema.metrics.find((item) => item.primary || item.required)?.key || record.primaryMetric;
    return { ...record, schemaId: schema.id, metrics, dimensions, primaryMetric: primary, higherIsBetter: primary ? schema.metrics.find((item) => item.key === primary)?.higherIsBetter ?? record.higherIsBetter : record.higherIsBetter, updatedAt: new Date().toISOString() };
}
function extractDimension(row, config, context = {}) {
    const sources = config.sources?.length ? config.sources : config.source ? [config.source] : [];
    let raw = undefined;
    for (const source of sources) {
        raw = readDimensionSource(row, source, context);
        if (raw !== undefined && raw !== "")
            break;
    }
    if ((raw === undefined || raw === "") && config.defaultValue !== undefined)
        raw = config.defaultValue;
    if (raw === undefined || raw === "")
        return undefined;
    const aliasValue = config.aliases?.[String(raw)] || config.aliases?.[String(raw).toLowerCase()] || raw;
    return coerceDimension(aliasValue, config.type);
}
function createResultRevision(record, changes, reason, source = "manual_edit", author) {
    return { revisionId: `rev_${sha256(`${record.resultId}:${Date.now()}:${changes.length}`).slice(0, 12)}`, resultId: record.resultId, createdAt: new Date().toISOString(), author, reason, changes, source };
}
function applyResultRevision(record, revision) {
    let next = { ...record, metrics: { ...record.metrics }, dimensions: { ...record.dimensions }, tags: [...(record.tags || [])], revisions: [...(record.revisions || []), revision], manualOverrides: [...(record.manualOverrides || [])], updatedAt: revision.createdAt };
    for (const change of revision.changes) {
        next = setResultPath(next, change.path, change.after);
        if (revision.source === "manual_edit" && !next.manualOverrides.includes(change.path))
            next.manualOverrides.push(change.path);
    }
    return next;
}
function reparseResultRecords(existing, incoming, options = {}) {
    const map = new Map(existing.map((item) => [item.resultId, item]));
    for (const record of incoming) {
        const previous = map.get(record.resultId);
        if (!previous) {
            map.set(record.resultId, record);
            continue;
        }
        if (previous.locked && !options.force) {
            map.set(record.resultId, { ...previous, updatedAt: new Date().toISOString() });
            continue;
        }
        let merged = { ...previous, ...record, createdAt: previous.createdAt, revisions: previous.revisions, manualOverrides: previous.manualOverrides, locked: previous.locked };
        if (!options.force) {
            for (const path of previous.manualOverrides || [])
                merged = setResultPath(merged, path, getResultPath(previous, path));
        }
        map.set(record.resultId, { ...merged, updatedAt: new Date().toISOString() });
    }
    return Array.from(map.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
function explainInclusion(record, issues = [], policy = exports.defaultInclusionPolicy) {
    const reasons = [];
    if (!policy.includeStatuses.includes(record.status))
        reasons.push(`status ${record.status} not included`);
    if (record.status === "excluded" || record.status === "parse_failed")
        reasons.push(`status ${record.status}`);
    if (policy.excludeTags?.some((tag) => record.tags?.includes(tag)))
        reasons.push("excluded tag");
    if (policy.includeTags?.length && !policy.includeTags.some((tag) => record.tags?.includes(tag)))
        reasons.push("missing required tag");
    if (policy.requireMetrics?.some((metric) => !record.metrics[metric]))
        reasons.push("missing required metric");
    if (policy.requireDimensions?.some((dimension) => record.dimensions[dimension] === undefined))
        reasons.push("missing required dimension");
    if (policy.requireFinalEvidence && (String(record.finalEvidenceState || "").toLowerCase() !== "archived" || record.eligibleForFinalAnalysis === false))
        reasons.push("final evidence not archived");
    const minSeverity = policy.excludeIfValidationSeverityAtLeast;
    if (minSeverity) {
        const rank = { info: 0, warning: 1, critical: 2 };
        if (issues.some((issueItem) => issueItem.resultId === record.resultId && !issueItem.ignored && rank[issueItem.severity] >= rank[minSeverity]))
            reasons.push(`validation ${minSeverity} or higher`);
    }
    return { included: reasons.length === 0, reasons };
}
function filterByInclusionPolicy(records, issues = [], policy = exports.defaultInclusionPolicy) {
    return records.filter((record) => explainInclusion(record, issues, policy).included);
}
function aggregateMetricValues(values, method, options = {}) {
    if (!values.length)
        return {};
    const sorted = [...values].sort((a, b) => a - b);
    const mean = avg(values);
    const std = Math.sqrt(avg(values.map((value) => (value - mean) ** 2)));
    if (method === "raw")
        return { raw: values };
    if (method === "best")
        return { best: options.higherIsBetter === false ? sorted[0] : sorted[sorted.length - 1] };
    if (method === "last")
        return { best: values[values.length - 1] };
    if (method === "median_iqr")
        return { median: percentile(sorted, 0.5), raw: [percentile(sorted, 0.25), percentile(sorted, 0.75)] };
    if (method === "mean_ci95")
        return { mean, std: 1.96 * std / Math.sqrt(values.length) };
    if (method === "weighted_mean" && options.weights?.length === values.length) {
        const weightSum = options.weights.reduce((a, b) => a + b, 0);
        return { mean: weightSum ? values.reduce((sum, value, index) => sum + value * options.weights[index], 0) / weightSum : mean, std };
    }
    if (method === "relative_improvement" && Number.isFinite(options.baseline)) {
        const baseline = Number(options.baseline);
        return { mean: baseline === 0 ? NaN : ((mean - baseline) / Math.abs(baseline)) * 100, std };
    }
    if (method === "paired_diff" && Number.isFinite(options.baseline))
        return { mean: mean - Number(options.baseline), std };
    return { mean, std };
}
function buildAdvancedLeaderboard(records, config, issues = [], policy) {
    const filtered = policy ? filterByInclusionPolicy(records, issues, policy) : records;
    const base = buildResultLeaderboard(filtered, { ...config, aggregate: config.aggregate === "mean_ci95" ? "mean_std" : config.aggregate }, []);
    if (!config.aggregation || !["relative_improvement", "paired_diff", "weighted_mean", "mean_ci95"].includes(config.aggregation.method))
        return base;
    const baseline = findBaseline(records, config.aggregation.baselineFilter, config.metrics[0]?.key);
    return base.map((row) => {
        const items = filtered.filter((record) => config.groupBy.map((key) => String(record.dimensions[key] ?? record[key] ?? "")).join(" | ") === row.groupKey);
        const values = {};
        for (const metric of config.metrics) {
            const nums = items.map((item) => Number(item.metrics[metric.key]?.value)).filter(Number.isFinite);
            const weights = config.aggregation?.weightDimension ? items.map((item) => Number(item.dimensions[config.aggregation.weightDimension])).filter(Number.isFinite) : undefined;
            values[metric.key] = aggregateMetricValues(nums, config.aggregation.method, { higherIsBetter: metric.higherIsBetter, baseline, weights });
        }
        return { ...row, values };
    }).sort((a, b) => sortLeaderboard(a, b, config));
}
function renderPaperTableTemplate(records, schema, template, format = "markdown") {
    const leaderboard = {
        id: template.source.leaderboardId || `${template.id}_leaderboard`,
        name: template.name,
        filter: { includeWarnings: true },
        groupBy: template.layout.rows,
        metrics: template.layout.metrics.map((key) => ({ key, label: template.formatting.metricLabels[key] || schema.metrics.find((metric) => metric.key === key)?.label || key, higherIsBetter: schema.metrics.find((metric) => metric.key === key)?.higherIsBetter !== false, decimals: template.formatting.decimals[key] ?? schema.metrics.find((metric) => metric.key === key)?.decimals ?? 4 })),
        aggregate: template.formatting.valueFormat === "mean_ci" ? "mean_ci95" : template.formatting.valueFormat === "raw" ? "raw" : "mean_std",
        primarySortMetric: template.layout.metrics[0],
    };
    const rows = buildAdvancedLeaderboard(records, leaderboard, [], exports.finalResultInclusionPolicy);
    if (format === "json")
        return JSON.stringify({ template, rows }, null, 2);
    if (format === "csv")
        return leaderboardToCsv(rows, leaderboard);
    const table = { id: template.id, title: template.name, leaderboardId: leaderboard.id, rowDimension: template.layout.rows[0] || "method", metrics: template.layout.metrics, boldBest: template.formatting.boldBest, underlineSecondBest: template.formatting.underlineSecondBest, showMeanStd: template.formatting.valueFormat !== "raw", decimals: template.formatting.decimals, metricDisplayNames: template.formatting.metricLabels, methodDisplayNames: template.formatting.dimensionLabels };
    return exportPaperTable(rows, leaderboard, table, format === "latex_booktabs" ? "latex_booktabs" : format === "latex_tabular" ? "latex" : "markdown");
}
function buildResultDashboard(records, issues = [], schema) {
    const bySuite = new Map();
    for (const record of records)
        bySuite.set(record.suite, [...(bySuite.get(record.suite) || []), record]);
    const primary = schema?.display?.defaultSortMetric || schema?.metrics.find((item) => item.primary)?.key || records[0]?.primaryMetric || "DSC";
    return {
        totalExperiments: new Set(records.map((record) => record.experimentId)).size,
        parsedResults: records.filter((record) => ["parsed", "validated", "warning", "manual_verified"].includes(record.status)).length,
        parseFailed: records.filter((record) => record.status === "parse_failed").length,
        validationWarnings: issues.filter((issue) => issue.severity === "warning" && !issue.ignored).length,
        paperCandidates: records.filter((record) => record.paperCandidate || record.tags?.includes("paper-candidate")).length,
        bestBySuite: Array.from(bySuite.entries()).map(([suite, items]) => {
            const def = schema?.metrics.find((metric) => metric.key === primary);
            const best = [...items].filter((record) => Number.isFinite(Number(record.metrics[primary]?.value))).sort((a, b) => def?.higherIsBetter === false ? Number(a.metrics[primary].value) - Number(b.metrics[primary].value) : Number(b.metrics[primary].value) - Number(a.metrics[primary].value))[0];
            return best ? { suite, metric: primary, resultId: best.resultId, value: Number(best.metrics[primary].value) } : { suite, metric: primary, resultId: "", value: NaN };
        }),
        coverage: coverageSummary(records, schema),
    };
}
function filterResultsByDsl(records, query, issues = []) {
    const orParts = query.split(/\s+OR\s+/i).map((part) => part.trim()).filter(Boolean);
    if (!orParts.length)
        return records;
    return records.filter((record) => orParts.some((part) => part.split(/\s+AND\s+|\s+/i).filter(Boolean).every((token) => matchDslToken(record, token, issues))));
}
function exportResultBundle(input, options = {}) {
    const records = options.includeValues === false ? input.records?.map((record) => ({ ...record, metrics: {} })) : input.records;
    return JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), ...input, records }, null, 2);
}
function importResultBundle(existing, incoming, strategy = "merge") {
    if (strategy === "replace")
        return [...incoming];
    const keyOf = (item) => item.id || item.resultId || JSON.stringify(item);
    const map = new Map(existing.map((item) => [keyOf(item), item]));
    for (const item of incoming) {
        const key = keyOf(item);
        if (strategy === "skip" && map.has(key))
            continue;
        map.set(key, { ...map.get(key), ...item });
    }
    return Array.from(map.values());
}
function checkResultConsistency(input) {
    const issues = [];
    const seen = new Set();
    const schemaIds = new Set((input.schemas || []).map((item) => item.id));
    const presetIds = new Set((input.presets || []).map((item) => item.id));
    const metricKeys = new Set((input.schemas || []).flatMap((schema) => schema.metrics.map((metric) => metric.key)));
    for (const record of input.records) {
        if (seen.has(record.resultId))
            issues.push(consistency("duplicate_result", "critical", "Duplicate resultId", "Merge or rename duplicate result", record.resultId));
        seen.add(record.resultId);
        if (input.experimentIds && !input.experimentIds.includes(record.experimentId))
            issues.push(consistency("missing_experiment", "warning", "Experiment not found", "Check registry/runKey mapping", record.resultId));
        if (record.schemaId && input.schemas && !schemaIds.has(record.schemaId))
            issues.push(consistency("missing_schema", "warning", "Result schema not found", "Import schema or change schemaId", record.resultId));
        if (record.parserPresetId && input.presets && !presetIds.has(record.parserPresetId))
            issues.push(consistency("missing_preset", "warning", "Parser preset not found", "Import preset or reparse with existing preset", record.resultId));
        for (const metric of Object.keys(record.metrics)) {
            if (metricKeys.size && !metricKeys.has(metric))
                issues.push(consistency("unknown_metric", "info", `Metric not in schema: ${metric}`, "Add metric definition or alias", record.resultId));
        }
    }
    for (const leaderboard of input.leaderboards || []) {
        for (const metric of leaderboard.metrics)
            if (metricKeys.size && !metricKeys.has(metric.key))
                issues.push(consistency("leaderboard_metric", "warning", `Leaderboard metric not in schema: ${metric.key}`, "Update leaderboard config", undefined, leaderboard.id));
    }
    for (const table of input.paperTables || []) {
        for (const metric of table.metrics)
            if (metricKeys.size && !metricKeys.has(metric))
                issues.push(consistency("paper_metric", "warning", `Paper table metric not in schema: ${metric}`, "Update paper table config", undefined, table.id));
    }
    return issues;
}
function preset(id, name, format, metricDirections, metricColumns) {
    return {
        id,
        name,
        format,
        filePatterns: ["results*.csv", "metrics*.csv", "*.metrics.csv", "*.json"],
        columnMapping: {
            experimentId: "experiment_id",
            attemptId: "attempt_id",
            suite: "suite",
            runKey: "run_key",
            dataset: "dataset",
            split: "split",
            fold: "fold",
            seed: "seed",
            metric: "metric",
            value: "value",
            epoch: "epoch",
            step: "step",
            timestamp: "timestamp",
        },
        metricColumns,
        metricAliases: { Dice: "DSC", dice: "DSC" },
        metricDirections,
        requiredColumns: format === "long_csv" ? ["metric", "value"] : [],
        finalRowSelector: { type: "step_equals", column: "step", value: "final" },
        groupByDefaults: ["suite", "dataset", "method", "seed", "fold"],
        primaryMetric: metricColumns[0],
    };
}
function parseLongRows(rows, sourceFile, preset, parserConfig) {
    const map = new Map();
    for (const row of rows) {
        const m = { ...preset.columnMapping, ...parserConfig.columnMapping };
        const metric = alias(row[m.metric || "metric"] || "", preset);
        const value = parseValue(row[m.value || "value"]);
        const ids = idsFromRow(row, m, sourceFile.path);
        const record = map.get(ids.resultId) || baseRecord(ids, sourceFile, preset, parserConfig, row, m);
        record.metrics[metric] = metricValue(value, metric, row, m, sourceFile.path, preset);
        record.dimensions = { ...record.dimensions, ...dimensionsFromRow(row, parserConfig.dimensions || [], sourceFile.path), ...standardDimensions(row, m) };
        map.set(ids.resultId, record);
    }
    return Array.from(map.values());
}
function parseWideRows(rows, headers, sourceFile, preset, parserConfig) {
    const m = { ...preset.columnMapping, ...parserConfig.columnMapping };
    const dimensionColumns = new Set(Object.values(m).filter(Boolean));
    const metricColumns = parserConfig.metricColumns?.length ? parserConfig.metricColumns : preset.metricColumns?.length ? preset.metricColumns : headers.filter((h) => !dimensionColumns.has(h) && Number.isFinite(Number(rows.find((row) => row[h])?.[h])));
    return rows.map((row) => {
        const ids = idsFromRow(row, m, sourceFile.path);
        const record = baseRecord(ids, sourceFile, preset, parserConfig, row, m);
        for (const column of metricColumns) {
            const metric = alias(column, preset);
            record.metrics[metric] = metricValue(parseValue(row[column]), metric, row, { ...m, value: column }, sourceFile.path, preset);
        }
        record.dimensions = { ...record.dimensions, ...dimensionsFromRow(row, parserConfig.dimensions || [], sourceFile.path), ...standardDimensions(row, m) };
        return record;
    });
}
function parseJsonResult(text, sourceFile, preset, parserConfig) {
    const parsed = JSON.parse(text);
    const rows = Array.isArray(parsed) ? parsed : [parsed];
    return rows.map((row) => {
        const m = { ...preset.columnMapping, ...parserConfig.columnMapping };
        const ids = idsFromRow(row, m, sourceFile.path);
        const record = baseRecord(ids, sourceFile, preset, parserConfig, row, m);
        for (const [metric, raw] of Object.entries(row.metrics || row)) {
            const value = parseValue(raw);
            if (typeof value === "number")
                record.metrics[alias(metric, preset)] = metricValue(value, alias(metric, preset), row, m, sourceFile.path, preset);
        }
        return record;
    });
}
function baseRecord(ids, sourceFile, preset, parserConfig, row, m) {
    const now = new Date().toISOString();
    return {
        schemaVersion: 1,
        resultId: ids.resultId,
        experimentId: ids.experimentId,
        attemptId: ids.attemptId,
        runKey: ids.runKey,
        suite: ids.suite,
        experimentName: ids.experimentName,
        status: "parsed",
        sourceFiles: [{ ...sourceFile, sha256: sourceFile.sha256 || sha256(sourceFile.path) }],
        parserPresetId: preset.id,
        parserConfig,
        metrics: {},
        dimensions: standardDimensions(row, m),
        primaryMetric: preset.primaryMetric,
        higherIsBetter: preset.primaryMetric ? directionFor(preset.primaryMetric, preset) !== "lower" : true,
        parsedAt: now,
        createdAt: now,
        updatedAt: now,
        provenance: {},
        notes: ids.inferred ? "experiment_id inferred from path/runKey" : undefined,
    };
}
function idsFromRow(row, m, sourcePath) {
    const runKey = String(row[m.runKey || "run_key"] || row.runKey || inferRunKey(sourcePath));
    const experimentId = String(row[m.experimentId || "experiment_id"] || row.experimentId || runKey);
    const attemptId = String(row[m.attemptId || "attempt_id"] || row.attemptId || "attempt-1");
    const suite = String(row[m.suite || "suite"] || inferSuite(sourcePath));
    const experimentName = String(row.experiment_name || row.experimentName || runKey);
    return { resultId: `${experimentId}:${attemptId}:${runKey}`, experimentId, attemptId, runKey, suite, experimentName, inferred: !row[m.experimentId || "experiment_id"] };
}
function metricValue(value, metric, row, m, sourceFile, preset) {
    return {
        value,
        unit: row.unit || undefined,
        higherIsBetter: directionFor(metric, preset) !== "lower",
        sourceColumn: m.value,
        sourceFile,
        split: row[m.split || "split"] || undefined,
        dataset: row[m.dataset || "dataset"] || undefined,
        fold: row[m.fold || "fold"] || undefined,
        seed: row[m.seed || "seed"] || undefined,
    };
}
function standardDimensions(row, m) {
    const out = {};
    for (const key of ["suite", "dataset", "split", "fold", "seed"]) {
        const value = row[m[key] || key];
        if (value !== undefined && value !== "")
            out[key] = parseDimensionValue(value);
    }
    return out;
}
function dimensionsFromRow(row, configs, sourcePath) {
    const out = {};
    for (const config of configs) {
        const value = extractDimension(row, config, { sourcePath });
        if (value !== undefined)
            out[config.key] = value;
    }
    return out;
}
function checkMetric(value, check) {
    if (check.type === "not_null")
        return value !== null && value !== undefined && value !== "";
    if (check.type === "is_finite_number")
        return Number.isFinite(Number(value));
    if (check.type === "range") {
        const n = Number(value);
        if (!Number.isFinite(n))
            return false;
        if (check.min !== undefined && n < check.min)
            return false;
        if (check.max !== undefined && n > check.max)
            return false;
        return true;
    }
    return true;
}
function issue(record, id, metric, severity, message, evidence) {
    return { id: `${record.resultId}:${id}:${metric || ""}`, resultId: record.resultId, metric, severity, message, evidence };
}
function dimensionMatches(record, filter) {
    return !filter || Object.entries(filter).every(([key, value]) => record.dimensions[key] === value);
}
function aggregate(values, mode) {
    if (!values.length)
        return {};
    const sorted = [...values].sort((a, b) => a - b);
    const mean = avg(values);
    const std = Math.sqrt(avg(values.map((value) => (value - mean) ** 2)));
    if (mode === "best")
        return { best: sorted[sorted.length - 1] };
    if (mode === "last")
        return { best: values[values.length - 1] };
    if (mode === "mean_ci95" || mode === "mean_ci")
        return { mean, std: 1.96 * std / Math.sqrt(values.length) };
    if (mode === "median_iqr")
        return { median: sorted[Math.floor(sorted.length / 2)] };
    if (mode === "raw")
        return { raw: values };
    return { mean, std };
}
function sortLeaderboard(a, b, config) {
    const metric = config.primarySortMetric || config.metrics[0]?.key;
    if (!metric)
        return a.groupKey.localeCompare(b.groupKey);
    const direction = config.metrics.find((item) => item.key === metric)?.higherIsBetter === false ? 1 : -1;
    return direction * ((a.values[metric]?.mean ?? a.values[metric]?.best ?? -Infinity) - (b.values[metric]?.mean ?? b.values[metric]?.best ?? -Infinity));
}
function withBestFormatting(rows, leaderboard, table, latex) {
    if (!table.boldBest)
        return rows;
    const copy = rows.map((row) => ({ ...row, values: { ...row.values } }));
    for (const metric of table.metrics) {
        const cfg = leaderboard.metrics.find((item) => item.key === metric);
        const scored = copy.map((row) => ({ row, value: row.values[metric]?.mean ?? row.values[metric]?.best })).filter((item) => Number.isFinite(item.value)).sort((a, b) => cfg?.higherIsBetter === false ? Number(a.value) - Number(b.value) : Number(b.value) - Number(a.value));
        if (scored[0])
            scored[0].row.values[metric].decorator = latex ? "latex_bold" : "bold";
    }
    return copy;
}
function formatAggregate(value, decimals = 4) {
    if (!value)
        return "-";
    const fmt = (n) => Number.isFinite(n) ? Number(n).toFixed(decimals).replace(/0+$/, "").replace(/\.$/, "") : "-";
    const body = value.mean !== undefined ? `${fmt(value.mean)} ± ${fmt(value.std)}` : value.best !== undefined ? fmt(value.best) : value.median !== undefined ? fmt(value.median) : value.raw?.join(";") || "-";
    const decorator = value.decorator;
    if (decorator === "latex_bold")
        return `\\textbf{${body}}`;
    if (decorator === "bold")
        return `**${body}**`;
    return body;
}
function applyFilters(rows, preset) {
    return rows.filter((row) => (preset.filters || []).every((filter) => {
        const value = row[filter.column] || "";
        if (filter.op === "==")
            return value === filter.value;
        if (filter.op === "!=")
            return value !== filter.value;
        if (filter.op === "contains")
            return value.includes(String(filter.value));
        if (filter.op === "in")
            return Array.isArray(filter.value) && filter.value.includes(value);
        if (filter.op === "not_in")
            return Array.isArray(filter.value) && !filter.value.includes(value);
        return true;
    }));
}
function finalRows(rows, preset) {
    const selector = preset.finalRowSelector;
    if (!selector || !rows.length)
        return rows;
    if (selector.type === "step_equals" && selector.column && rows.some((row) => row[selector.column] === String(selector.value)))
        return rows.filter((row) => row[selector.column] === String(selector.value));
    if (selector.type === "max_epoch" || selector.type === "last_epoch") {
        const column = selector.column || "epoch";
        const max = Math.max(...rows.map((row) => Number(row[column])).filter(Number.isFinite));
        if (Number.isFinite(max))
            return rows.filter((row) => Number(row[column]) === max);
    }
    if (selector.type === "column_filter" && selector.column)
        return rows.filter((row) => row[selector.column] === String(selector.value));
    return rows;
}
function isLongFormat(headers, preset) {
    return preset.format === "long_csv" || (headers.includes(preset.columnMapping.metric || "metric") && headers.includes(preset.columnMapping.value || "value"));
}
function csvRows(text) {
    return text.trim().split(/\r?\n/).filter(Boolean).map(parseCsvLine);
}
function parseCsvLine(line) {
    const out = [];
    let cur = "";
    let quote = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"' && line[i + 1] === '"') {
            cur += '"';
            i++;
        }
        else if (ch === '"')
            quote = !quote;
        else if (ch === "," && !quote) {
            out.push(cur.trim());
            cur = "";
        }
        else
            cur += ch;
    }
    out.push(cur.trim());
    return out;
}
function parseValue(value) {
    if (value === "" || value === undefined)
        return null;
    if (value === "true")
        return true;
    if (value === "false")
        return false;
    const n = Number(value);
    return Number.isFinite(n) ? n : String(value);
}
function compileTextMetricPattern(pattern) {
    if (!pattern?.trim())
        return undefined;
    try {
        const compiled = new RegExp(pattern, "gi");
        const groupNames = new Set(Array.from(pattern.matchAll(/\?<([A-Za-z0-9_]+)>/g)).map((match) => match[1]));
        return groupNames.has("metric") && groupNames.has("value") ? compiled : undefined;
    }
    catch {
        return undefined;
    }
}
function normalizeTextMetricName(metric, aliases = {}) {
    const value = metric.trim();
    const lower = value.toLowerCase();
    const custom = aliases[value] || Object.entries(aliases).find(([key]) => key.toLowerCase() === lower)?.[1];
    if (custom)
        return custom;
    if (lower === "acc")
        return "accuracy";
    if (lower === "dice")
        return "DSC";
    if (lower === "dsc")
        return "DSC";
    if (lower === "auroc" || lower === "roc_auc")
        return "AUC";
    return value;
}
function compactSnippet(line) {
    const text = line.trim().replace(/\s+/g, " ");
    return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}
function unique(values) {
    return Array.from(new Set(values.filter(Boolean)));
}
function parseDimensionValue(value) {
    return coerceDimension(value, "string");
}
function coerceDimension(value, type) {
    if (type === "number")
        return Number(value);
    if (type === "boolean")
        return value === true || String(value).toLowerCase() === "true";
    return String(value);
}
function alias(metric, preset) {
    const direct = preset.metricAliases?.[metric];
    if (direct)
        return direct;
    const lower = metric.toLowerCase();
    const ci = Object.entries(preset.metricAliases || {}).find(([key]) => key.toLowerCase() === lower);
    if (ci)
        return ci[1];
    if (lower === "dsc" || lower === "dice")
        return "DSC";
    if (lower === "hd95")
        return "HD95";
    if (lower === "asd")
        return "ASD";
    if (lower === "auroc" || lower === "roc_auc")
        return "AUC";
    return metric;
}
function metricAlias(metric) {
    return metric.toLowerCase() === "dice" ? "dsc" : metric.toLowerCase();
}
function directionFor(metric, preset) {
    return preset.metricDirections?.[metric] || (exports.classificationMetricDirections[metric] || exports.segmentationMetricDirections[metric] || "higher");
}
function inferRunKey(sourcePath) {
    return sourcePath.replace(/\\/g, "/").split("/").slice(-3).join("/").replace(/\.[^.]+$/, "");
}
function inferSuite(sourcePath) {
    return sourcePath.replace(/\\/g, "/").split("/").slice(-4, -3)[0] || "unknown";
}
function sha256(text) {
    return (0, crypto_1.createHash)("sha256").update(text).digest("hex");
}
function commonDimensions() {
    return [
        { key: "method", label: "Method", type: "category", sources: [{ type: "csv_column", column: "method" }, { type: "regex_from_path", pattern: "(baseline|ours|fusion|ablation)", group: 1 }], defaultValue: "unknown" },
        { key: "dataset", label: "Dataset", type: "category", sources: [{ type: "csv_column", column: "dataset" }, { type: "experiment_field", field: "dimensions.dataset" }], aliases: { vindr: "VinDr", PAD: "PAD-UFES", cxr: "VinDr-CXR" } },
        { key: "split", label: "Split", type: "category", sources: [{ type: "csv_column", column: "split" }], defaultValue: "test" },
        { key: "fold", label: "Fold", type: "string", sources: [{ type: "csv_column", column: "fold" }] },
        { key: "seed", label: "Seed", type: "string", sources: [{ type: "csv_column", column: "seed" }] },
    ];
}
function metricDef(key, label, type, higherIsBetter, decimals, category, aliases = [], validRange, primary = false) {
    return { key, label, type, higherIsBetter, decimals, category, aliases, validRange, primary };
}
function paperTemplate(id, name, rows, columns, metrics) {
    return {
        id,
        name,
        source: {},
        layout: { rows, columns, metrics },
        formatting: { decimals: Object.fromEntries(metrics.map((metric) => [metric, metric === "DSC" || metric === "accuracy" || metric === "AUC" ? 3 : 2])), metricLabels: {}, dimensionLabels: {}, valueFormat: "mean_std", boldBest: true, underlineSecondBest: true, missingValue: "-" },
        export: { formats: ["markdown", "csv", "latex_booktabs", "json"], filenamePattern: `${id}_{date}` },
    };
}
function readDimensionSource(row, source, context) {
    if (source.type === "csv_column")
        return row[source.column];
    if (source.type === "plan_variable")
        return context.planVariables?.[source.name];
    if (source.type === "experiment_field")
        return context.record ? getResultPath(context.record, source.field) : undefined;
    if (source.type === "config_path")
        return getUnknownPath(context.config, source.jsonPath);
    if (source.type === "regex_from_path") {
        const match = (context.sourcePath || "").match(new RegExp(source.pattern));
        if (!match)
            return undefined;
        if (typeof source.group === "number")
            return match[source.group];
        if (typeof source.group === "string")
            return match.groups?.[source.group];
        return match[1] || match[0];
    }
    if (source.type === "expression")
        return evalSmallExpression(source.expression, row, context.record);
    if (source.type === "manual")
        return undefined;
    return undefined;
}
function evalSmallExpression(expression, row, record) {
    const match = expression.match(/^([a-zA-Z0-9_.-]+)\s*\+\s*['"]([^'"]+)['"]$/);
    if (match)
        return `${getUnknownPath({ row, record }, match[1]) ?? ""}${match[2]}`;
    return getUnknownPath({ row, record }, expression);
}
function getUnknownPath(source, pathValue) {
    return pathValue.split(".").reduce((current, part) => current && typeof current === "object" ? current[part] : undefined, source);
}
function getResultPath(record, pathValue) {
    const normalized = pathValue.replace(/\[(.*?)\]/g, ".$1");
    return getUnknownPath(record, normalized);
}
function setResultPath(record, pathValue, value) {
    const next = { ...record, metrics: { ...record.metrics }, dimensions: { ...record.dimensions }, provenance: { ...record.provenance }, tags: record.tags ? [...record.tags] : undefined };
    const parts = pathValue.replace(/\[(.*?)\]/g, ".$1").split(".").filter(Boolean);
    let target = next;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        target[part] = Array.isArray(target[part]) ? [...target[part]] : { ...(target[part] || {}) };
        target = target[part];
    }
    target[parts[parts.length - 1]] = value;
    return next;
}
function findBaseline(records, filter, metric) {
    if (!filter || !metric)
        return undefined;
    const match = records.find((record) => Object.entries(filter).every(([key, value]) => (record.dimensions[key] ?? record[key]) === value));
    const value = match?.metrics[metric]?.value;
    return Number.isFinite(Number(value)) ? Number(value) : undefined;
}
function percentile(sorted, p) {
    if (!sorted.length)
        return NaN;
    const index = (sorted.length - 1) * p;
    const lo = Math.floor(index);
    const hi = Math.ceil(index);
    return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (index - lo);
}
function coverageSummary(records, schema) {
    const required = schema?.metrics.filter((metric) => metric.required || metric.primary).map((metric) => metric.key) || [];
    const dims = schema?.display?.defaultGroupBy || ["dataset", "method"];
    const out = [];
    for (const dimension of dims) {
        const groups = new Map();
        for (const record of records)
            groups.set(String(record.dimensions[dimension] || "unknown"), [...(groups.get(String(record.dimensions[dimension] || "unknown")) || []), record]);
        for (const [value, items] of groups) {
            out.push({ dimension, value, count: items.length, missingMetrics: required.filter((metric) => items.every((record) => !record.metrics[metric])) });
        }
    }
    return out;
}
function matchDslToken(record, token, issues) {
    const comparison = token.match(/^([a-zA-Z0-9_.-]+)(>=|<=|>|<|=|:)(.+)$/);
    if (!comparison)
        throw new Error(`Invalid result search token: ${token}`);
    const [, key, op, raw] = comparison;
    const expected = raw.replace(/^["']|["']$/g, "");
    if (key === "tag")
        return record.tags?.includes(expected) || false;
    if (key === "status")
        return compareValue(record.status, op, expected);
    if (key === "validation")
        return issues.some((issue) => issue.resultId === record.resultId && issue.severity === expected);
    const value = key.startsWith("metric.") ? record.metrics[key.slice("metric.".length)]?.value : key.startsWith("dimension.") ? record.dimensions[key.slice("dimension.".length)] : record.dimensions[key] ?? record[key];
    return compareValue(value, op, expected);
}
function compareValue(value, op, expected) {
    if ([">", "<", ">=", "<="].includes(op)) {
        const left = Number(value);
        const right = Number(expected);
        if (!Number.isFinite(left) || !Number.isFinite(right))
            return false;
        if (op === ">")
            return left > right;
        if (op === "<")
            return left < right;
        if (op === ">=")
            return left >= right;
        return left <= right;
    }
    return String(value ?? "") === expected;
}
function consistency(id, severity, message, suggestion, resultId, configId) {
    return { id: `${id}:${resultId || configId || ""}`, severity, resultId, configId, message, suggestion, autoFixAvailable: severity !== "critical" };
}
function globMatch(fileName, pattern) {
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    return new RegExp(`^${escaped}$`).test(fileName.split(/[\\/]/).pop() || fileName);
}
function avg(values) {
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : NaN;
}
function csvEscape(value) {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
function displayName(value, map) {
    return map?.[value] || value;
}
