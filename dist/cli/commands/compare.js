"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareCommand = compareCommand;
exports.compareEntry = compareEntry;
const errors_1 = require("../errors");
const format_1 = require("../format");
const parse_1 = require("../parse");
const result_1 = require("./result");
const metric_1 = require("./metric");
const Results_1 = require("../../features/Results");
const LOWER_IS_BETTER = /(?:^|_)(loss|error|mse|mae|perplexity)(?:_|$)/i;
async function compareCommand(rest, flags) {
    const leftId = (0, parse_1.requirePositional)(rest, 0, "first experiment id");
    const rightId = (0, parse_1.requirePositional)(rest, 1, "second experiment id");
    const rows = await (0, result_1.loadResults)(flags);
    const leftRow = (0, result_1.selectResult)(rows, leftId), rightRow = (0, result_1.selectResult)(rows, rightId);
    const left = leftRow ? (0, metric_1.numericMetrics)(leftRow) : {};
    const right = rightRow ? (0, metric_1.numericMetrics)(rightRow) : {};
    const difference = Object.create(null);
    const improvement = [];
    const regression = [];
    const reason = !leftRow && !rightRow
        ? "no results recorded for either experiment"
        : !leftRow
            ? `no results recorded for ${leftId}`
            : !rightRow
                ? `no results recorded for ${rightId}`
                : !Object.keys(left).length || !Object.keys(right).length
                    ? "no numeric metrics available for comparison"
                    : "";
    for (const key of Object.keys(left)) {
        if (!Object.hasOwn(right, key))
            continue;
        const delta = Math.round((right[key] - left[key]) * 1e12) / 1e12;
        difference[key] = { left: left[key], right: right[key], delta };
        const directions = [leftRow, rightRow].map(row => {
            const metric = row?.record.metrics?.[key];
            return metric?.higherIsBetter ?? (row?.record.primaryMetric === key ? row.record.higherIsBetter : undefined);
        }).filter((value) => typeof value === "boolean");
        if (new Set(directions).size > 1 || delta === 0)
            continue;
        const preset = Results_1.builtInResultPresets.flatMap(item => Object.entries(item.metricDirections || {}))
            .find(([name]) => name.toLowerCase() === key.toLowerCase())?.[1];
        const higher = directions[0] ?? (preset ? preset === "higher" : LOWER_IS_BETTER.test(key) ? false : undefined);
        if (higher === undefined)
            continue;
        const improved = higher ? delta > 0 : delta < 0;
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
