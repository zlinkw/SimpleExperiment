"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMetricsFile = parseMetricsFile;
exports.buildLeaderboard = buildLeaderboard;
exports.leaderboardToMarkdown = leaderboardToMarkdown;
const ProjectResultTables_1 = require("../results/ProjectResultTables");
function parseMetricsFile(text, sourceFile, runKey = sourceFile) {
    const parsedAt = new Date().toISOString();
    if (/\.json$/i.test(sourceFile)) {
        const json = JSON.parse(text);
        const metrics = numericEntries(json.metrics || json, !json.metrics);
        return [{ experimentId: String(json.experimentId || runKey), runKey, metrics,
                ...(typeof json.primaryMetric === "string" ? { primaryMetric: json.primaryMetric } : {}),
                ...(typeof json.higherIsBetter === "boolean" ? { higherIsBetter: json.higherIsBetter } : {}), sourceFile, parsedAt }];
    }
    const lines = (0, ProjectResultTables_1.readCsvRows)(text.trim()).filter((row) => row.length > 1 || row[0].trim()).map((row) => row.map((cell) => cell.trim()));
    if (lines.length < 2)
        return [];
    const headers = lines[0];
    return lines.slice(1).map((cols, index) => {
        const row = Object.create(null);
        headers.forEach((h, i) => row[h] = cols[i] || "");
        return {
            experimentId: row.experimentId || row.runKey || `${runKey}-${index}`,
            runKey: row.runKey || runKey,
            metrics: numericEntries(row),
            sourceFile,
            parsedAt,
        };
    });
}
function buildLeaderboard(rows, groupBy, primaryMetric, higherIsBetter = true) {
    const groups = new Map();
    for (const row of rows)
        groups.set(groupBy(row), [...(groups.get(groupBy(row)) || []), row]);
    return Array.from(groups.entries()).map(([groupKey, items]) => {
        const keys = Array.from(new Set(items.flatMap((item) => Object.keys(item.metrics))));
        const mean = Object.create(null);
        const std = Object.create(null);
        for (const key of keys) {
            const values = items.map((item) => item.metrics[key]).filter((value) => Number.isFinite(value));
            mean[key] = avg(values);
            std[key] = Math.sqrt(avg(values.map((value) => (value - mean[key]) ** 2)));
        }
        const best = primaryMetric
            ? [...items].filter((item) => Number.isFinite(item.metrics[primaryMetric])).sort((a, b) => higherIsBetter ? b.metrics[primaryMetric] - a.metrics[primaryMetric] : a.metrics[primaryMetric] - b.metrics[primaryMetric])[0]
            : undefined;
        return { groupKey, count: items.length, mean, std, bestExperimentId: best?.experimentId };
    });
}
function leaderboardToMarkdown(rows, metrics) {
    const header = ["Group", "N", ...metrics, "Best"].join(" | ");
    const sep = ["---", "---", ...metrics.map(() => "---:"), "---"].join(" | ");
    const body = rows.map((row) => [row.groupKey, row.count, ...metrics.map((metric) => `${fmt(row.mean[metric])} +/- ${fmt(row.std[metric])}`), row.bestExperimentId || ""].join(" | "));
    return [header, sep, ...body].join("\n");
}
function numericEntries(value, excludeDimensions = true) {
    const dimensionNames = new Set(["experimentid", "runkey", "runid", "attemptid", "suite", "method", "dataset", "split", "fold", "seed", "case", "model", "tag", "epoch", "step"]);
    return Object.fromEntries(Object.entries(value).flatMap(([key, raw]) => {
        if (excludeDimensions && dimensionNames.has(key.replace(/_/g, "").toLowerCase()))
            return [];
        if (typeof raw === "number")
            return Number.isFinite(raw) ? [[key, raw]] : [];
        if (typeof raw !== "string" || !raw.trim())
            return [];
        const parsed = Number(raw);
        return Number.isFinite(parsed) ? [[key, parsed]] : [];
    }));
}
function avg(values) {
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : NaN;
}
function fmt(value) {
    return Number.isFinite(value) ? value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "") : "";
}
