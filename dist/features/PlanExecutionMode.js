"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePlanExecutionMode = requirePlanExecutionMode;
exports.modeFromMatchingPlan = modeFromMatchingPlan;
const node_crypto_1 = require("node:crypto");
/** The validation result is authoritative. Never silently widen an unknown mode. */
function requirePlanExecutionMode(value) {
    if (value === "train" || value === "test" || value === "train_test")
        return value;
    throw new Error("Plan execution mode is unverified; validate this exact Plan revision before dispatch.");
}
/** Legacy queues may use a local PLAN only when its original content hash still matches. */
function modeFromMatchingPlan(revision, text, parsedMode) {
    if ((0, node_crypto_1.createHash)("sha256").update(text, "utf8").digest("hex") !== revision)
        return undefined;
    try {
        return requirePlanExecutionMode(parsedMode);
    }
    catch {
        return undefined;
    }
}
