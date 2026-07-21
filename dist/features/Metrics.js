"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMetricsFile = parseMetricsFile;
exports.buildLeaderboard = buildLeaderboard;
exports.leaderboardToMarkdown = leaderboardToMarkdown;
function parseMetricsFile(text, sourceFile, runKey = sourceFile) {
    const parsedAt = new Date().toISOString();
    if (sourceFile.endsWith(".json")) {
        const json = JSON.parse(text);
        const metrics = numericEntries(json.metrics || json);
        return [{ experimentId: String(json.experimentId || runKey), runKey, metrics, sourceFile, parsedAt }];
    }
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2)
        return [];
    const headers = splitCsv(lines[0]);
    return lines.slice(1).map((line, index) => {
        const cols = splitCsv(line);
        const row = {};
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
        const mean = {};
        const std = {};
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
function numericEntries(value) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, Number(v)]).filter(([, v]) => Number.isFinite(v)));
}
function splitCsv(line = "") {
    return line.split(",").map((item) => item.trim());
}
function avg(values) {
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : NaN;
}
function fmt(value) {
    return Number.isFinite(value) ? value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "") : "";
}
