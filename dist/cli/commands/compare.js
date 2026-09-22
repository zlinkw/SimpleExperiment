"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareCommand = compareCommand;
exports.compareEntry = compareEntry;
const errors_1 = require("../errors");
const format_1 = require("../format");
const parse_1 = require("../parse");
const result_1 = require("./result");
const metric_1 = require("./metric");
const LOWER_IS_BETTER = /(?:^|_)(loss|error|mse|mae|perplexity)(?:_|$)/i;
async function compareCommand(rest, flags) {
    const leftId = (0, parse_1.requirePositional)(rest, 0, "first experiment id");
    const rightId = (0, parse_1.requirePositional)(rest, 1, "second experiment id");
    const rows = await (0, result_1.loadResults)();
    const left = metricsFor(rows, leftId);
    const right = metricsFor(rows, rightId);
    const difference = {};
    const improvement = [];
    const regression = [];
    const reason = !Object.keys(left).length && !Object.keys(right).length
        ? "no results recorded for either experiment"
        : !Object.keys(left).length
            ? `no results recorded for ${leftId}`
            : !Object.keys(right).length
                ? `no results recorded for ${rightId}`
                : "";
    for (const key of Object.keys(left)) {
        if (!(key in right))
            continue;
        const delta = Math.round((right[key] - left[key]) * 1e12) / 1e12;
        difference[key] = { left: left[key], right: right[key], delta };
        const improved = LOWER_IS_BETTER.test(key) ? delta < 0 : delta > 0;
        if (delta === 0)
            continue;
        (improved ? improvement : regression).push(key);
    }
    const payload = { left: leftId, right: rightId, metric_difference: difference, improvement, regression, reason };
    if (flags.json)
        (0, format_1.writeJson)(payload, flags.compactJson);
    else
        (0, format_1.writeText)((0, format_1.block)("Compare", payload));
    return 0;
}
async function compareEntry(rest, flags) {
    if (!rest[0])
        throw (0, errors_1.usageError)("missing first experiment id");
    return compareCommand(rest, flags);
}
function metricsFor(rows, id) {
    const out = {};
    for (const row of rows) {
        if (row.id !== id && row.experimentId !== id && row.runKey !== id)
            continue;
        for (const [key, value] of Object.entries(row.metrics || {})) {
            const numeric = (0, metric_1.metricNumber)(value);
            if (numeric !== null)
                out[key] = numeric;
        }
    }
    return out;
}
