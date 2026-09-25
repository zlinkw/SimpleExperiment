"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeDistributedProjectContract = normalizeDistributedProjectContract;
function normalizeDistributedProjectContract(raw = {}) {
    const relative = (value, fallback) => {
        const text = String(value || fallback).replace(/\\/g, "/").trim();
        if (!text || text.startsWith("/") || text.split("/").some((part) => !part || part === "." || part === "..") || /[\x00-\x1f]/.test(text))
            throw new Error(`分布式产物相对路径无效：${text}`);
        return text;
    };
    const list = (value) => Array.isArray(value) ? value.map(String) : [];
    const planPrefixes = (list(raw.planPrefixes).length ? list(raw.planPrefixes) : ["experiments/plans/comparison/"])
        .map((value) => `${relative(value.replace(/\/+$/, ""), "")}/`);
    const configPath = relative(raw.configPath, "job_config.yaml");
    const checkpointPath = relative(raw.checkpointPath, "best_model.pth");
    const resultRowsPath = relative(raw.resultRowsPath, "test_results/formal_result_rows.csv");
    const fourStatePath = relative(raw.fourStatePath, "test_results/four_state_metrics.csv");
    const fragmentPaths = [...new Set((list(raw.fragmentPaths).length
            ? list(raw.fragmentPaths) : [configPath, resultRowsPath, fourStatePath]).map((value) => relative(value, "")))];
    const requiredPaths = [...new Set([...(list(raw.requiredPaths).length ? list(raw.requiredPaths) : fragmentPaths),
            checkpointPath, ...fragmentPaths].map((value) => relative(value, "")))];
    const mergeModule = String(raw.mergeModule || "experiments.simple_adapter.distributed_results").trim();
    if (!/^[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+$/.test(mergeModule))
        throw new Error("分布式汇总模块名无效");
    return { planPrefixes, configPath, checkpointPath, resultRowsPath, fourStatePath,
        fragmentPaths, requiredPaths, mergeModule };
}
