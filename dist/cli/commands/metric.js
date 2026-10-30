"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricCommand = metricCommand;
exports.metricLeaderboard = metricLeaderboard;
exports.metricList = metricList;
exports.metricShow = metricShow;
exports.numericMetrics = numericMetrics;
exports.metricNumber = metricNumber;
const errors_1 = require("../errors");
const format_1 = require("../format");
const parse_1 = require("../parse");
const result_1 = require("./result");
const Metrics_1 = require("../../features/Metrics");
async function metricCommand(action, rest, flags) {
    if (action === "list")
        return metricList(flags);
    if (action === "show")
        return metricShow((0, parse_1.requirePositional)(rest, 0, "experiment id"), flags);
    if (action === "leaderboard")
        return metricLeaderboard(flags);
    throw (0, errors_1.usageError)(`unknown metric action: ${action || "(missing)"}`);
}
/** First-class local metrics leaderboard (replaces the revoked `simpleex metrics leaderboard`). */
function metricLeaderboard(flags) {
    if (!flags.file)
        throw (0, errors_1.usageError)("metric leaderboard needs --file <metrics file>");
    const fs = require("node:fs");
    if (!fs.existsSync(flags.file))
        throw (0, errors_1.businessError)(`metrics file not found: ${flags.file}`);
    const metrics = (0, Metrics_1.parseMetricsFile)(fs.readFileSync(flags.file, "utf8"), flags.file);
    if (!metrics.length)
        throw (0, errors_1.businessError)("metrics file parsed no rows");
    const board = (0, Metrics_1.buildLeaderboard)(metrics, (row) => row.runKey, flags.primary || undefined);
    if (flags.json)
        (0, format_1.writeJson)({ metrics: Object.keys(metrics[0]?.metrics || {}), board }, flags.compactJson);
    else
        (0, format_1.writeText)((0, Metrics_1.leaderboardToMarkdown)(board, Object.keys(metrics[0]?.metrics || {})));
    return 0;
}
async function metricList(flags) {
    const names = new Set();
    for (const row of await (0, result_1.loadResults)(flags)) {
        for (const key of Object.keys(numericMetrics(row)))
            names.add(key);
    }
    const payload = { metrics: Array.from(names).sort() };
    if (flags.json)
        (0, format_1.writeJson)(payload, flags.compactJson);
    else
        (0, format_1.writeText)(payload.metrics.join("\n") || "(no metrics)");
    return 0;
}
async function metricShow(id, flags) {
    const rows = (await (0, result_1.loadResults)(flags)).filter((row) => matchesResult(row, id));
    const metrics = {};
    for (const row of rows)
        Object.assign(metrics, numericMetrics(row));
    if (flags.json)
        (0, format_1.writeJson)(metrics, flags.compactJson);
    else
        (0, format_1.writeText)(Object.entries(metrics).map(([key, value]) => `${key}: ${String(value)}`).join("\n") || "(no metrics)");
    return 0;
}
function numericMetrics(row) {
    const out = {};
    for (const [key, value] of Object.entries(row.metrics || {})) {
        const numeric = metricNumber(value);
        if (numeric !== null)
            out[key] = numeric;
    }
    return out;
}
function metricNumber(value) {
    if (typeof value === "number" && Number.isFinite(value))
        return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value)))
        return Number(value);
    return null;
}
function matchesResult(row, id) {
    return row.id === id || row.experimentId === id || row.runKey === id;
}
