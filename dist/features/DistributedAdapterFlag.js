"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDistributedResultsFlag = parseDistributedResultsFlag;
function parseDistributedResultsFlag(value) {
    if (value === true)
        return true;
    if (typeof value !== "string")
        return false;
    return value.split("#", 1)[0].trim().toLowerCase() === "true";
}
