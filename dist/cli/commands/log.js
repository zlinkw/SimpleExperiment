"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logCommand = logCommand;
exports.logShow = logShow;
exports.logTail = logTail;
const errors_1 = require("../errors");
const format_1 = require("../format");
const parse_1 = require("../parse");
const experiment_1 = require("./experiment");
async function logCommand(action, rest, flags) {
    if (action === "show")
        return logShow((0, parse_1.requirePositional)(rest, 0, "experiment id"), flags);
    if (action === "tail")
        return logTail((0, parse_1.requirePositional)(rest, 0, "experiment id"), flags);
    throw (0, errors_1.usageError)(`unknown log action: ${action || "(missing)"}`);
}
async function logShow(id, flags) {
    return emitLogs(id, Number.MAX_SAFE_INTEGER, flags);
}
async function logTail(id, flags) {
    return emitLogs(id, typeof flags.lines === "number" ? flags.lines : 50, flags);
}
async function emitLogs(id, lines, flags) {
    const records = await (0, experiment_1.logRecordsForExperiment)(id);
    if (!records)
        throw (0, errors_1.businessError)(`experiment not found: ${id}`);
    const view = records.slice(Math.max(0, records.length - lines));
    if (flags.json) {
        (0, format_1.writeJson)(view, flags.compactJson);
        return 0;
    }
    (0, format_1.writeText)(view.map((row) => [row.timestamp, row.level, row.message].filter(Boolean).join(" ")).join("\n") || "(no log)");
    return 0;
}
