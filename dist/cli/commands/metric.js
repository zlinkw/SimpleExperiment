"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricCommand = metricCommand;
exports.metricList = metricList;
exports.metricShow = metricShow;
exports.numericMetrics = numericMetrics;
exports.metricNumber = metricNumber;
const errors_1 = require("../errors");
const format_1 = require("../format");
const parse_1 = require("../parse");
const result_1 = require("./result");
async function metricCommand(action, rest, flags) {
    if (action === "list")
        return metricList(flags);
    if (action === "show")
        return metricShow((0, parse_1.requirePositional)(rest, 0, "experiment id"), flags);
    throw (0, errors_1.usageError)(`unknown metric action: ${action || "(missing)"}`);
}
async function metricList(flags) {
    const names = new Set();
    for (const row of await (0, result_1.loadResults)()) {
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
    const rows = (await (0, result_1.loadResults)()).filter((row) => matchesResult(row, id));
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
