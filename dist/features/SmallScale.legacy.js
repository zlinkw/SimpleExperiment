"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultSmallScaleSettings = void 0;
exports.normalizeSmallScaleSettings = normalizeSmallScaleSettings;
exports.buildCompletenessMatrix = buildCompletenessMatrix;
exports.completenessMatrixToMarkdown = completenessMatrixToMarkdown;
exports.completenessMatrixToCsv = completenessMatrixToCsv;
exports.generateMissingOnlyRerunPlan = generateMissingOnlyRerunPlan;
const PlanBuilder_1 = require("./PlanBuilder");
exports.defaultSmallScaleSettings = {
    scaleMode: "small",
    maxConcurrentExperiments: 10,
    maxVisibleExperimentsWithoutPaging: 200,
    useFileBasedRegistryOnly: true,
    enableHeavyIndexing: false,
    enableExternalDatabase: false,
    autoRefreshResultsAfterRun: true,
};
function normalizeSmallScaleSettings(input = {}) {
    return {
        ...exports.defaultSmallScaleSettings,
        ...input,
        maxConcurrentExperiments: Math.min(input.maxConcurrentExperiments ?? exports.defaultSmallScaleSettings.maxConcurrentExperiments, 10),
        useFileBasedRegistryOnly: true,
        enableHeavyIndexing: false,
        enableExternalDatabase: false,
    };
}
function buildCompletenessMatrix(config, input) {
    const plans = (input.plans || []).filter((plan) => (!config.scope.planId || plan.planId === config.scope.planId) && (!config.scope.suite || plan.suite === config.scope.suite));
    const study = (input.studies || []).find((item) => item.studyId === config.scope.studyId);
    const planned = [
        ...plans.flatMap((plan) => plan.plannedExperiments.map((exp) => ({ ...dimsFromRun(exp.runKey), experimentId: exp.experimentKey, status: exp.status || "planned" }))),
        ...(study ? study.methods.flatMap((method) => study.datasets.flatMap((dataset) => study.splits.flatMap((split) => study.seeds.map((seed) => ({ method: method.methodId, dataset: dataset.name, split: split.name, seed, experimentId: `${study.studyId}:${method.methodId}:${dataset.name}:${split.name}:${seed}`, status: "planned" }))))) : []),
    ];
    const planKeys = new Map();
    for (const item of planned) {
        const key = keyFor(config.axes, item);
        const plannedItems = planKeys.get(key);
        if (plannedItems)
            plannedItems.push(item);
        else
            planKeys.set(key, [item]);
    }
    const resultKeys = new Map();
    for (const record of input.results || []) {
        if (config.scope.suite && record.suite !== config.scope.suite)
            continue;
        const key = keyFor(config.axes, { ...record.dimensions, ...dimsFromRun(record.runKey) });
        const records = resultKeys.get(key);
        if (records)
            records.push(record);
        else
            resultKeys.set(key, [record]);
    }
    const lifecyclesByExperiment = new Map();
    for (const [order, value] of (input.lifecycles || []).entries()) {
        const lifecycles = lifecyclesByExperiment.get(value.experimentId);
        if (lifecycles)
            lifecycles.push({ order, value });
        else
            lifecyclesByExperiment.set(value.experimentId, [{ order, value }]);
    }
    const allKeys = new Set([...planKeys.keys(), ...resultKeys.keys()]);
    return Array.from(allKeys).map((key) => {
        const plannedItems = planKeys.get(key) || [];
        const records = resultKeys.get(key) || [];
        const missingMetrics = Array.from(new Set(records.flatMap((record) => config.requiredMetrics.filter((metric) => !record.metrics[metric]))));
        const lifecycle = Array.from(new Set(plannedItems.map((item) => String(item.experimentId))))
            .flatMap((experimentId) => lifecyclesByExperiment.get(experimentId) || [])
            .sort((left, right) => left.order - right.order)
            .map((entry) => entry.value);
        const status = completenessStatus(plannedItems, records, lifecycle, missingMetrics);
        return { key: parseKey(key), status, experimentIds: Array.from(new Set([...plannedItems.map((item) => String(item.experimentId)), ...records.map((record) => record.experimentId)])), resultIds: records.map((record) => record.resultId), missingMetrics };
    }).sort((a, b) => JSON.stringify(a.key).localeCompare(JSON.stringify(b.key)));
}
function completenessMatrixToMarkdown(cells) {
    const headers = ["Key", "Status", "Experiments", "Results", "Missing"];
    const rows = cells.map((cell) => [JSON.stringify(cell.key), cell.status, cell.experimentIds.join(";"), cell.resultIds.join(";"), (cell.missingMetrics || []).join(";")]);
    return [headers.join(" | "), headers.map(() => "---").join(" | "), ...rows.map((row) => row.join(" | "))].join("\n");
}
function completenessMatrixToCsv(cells) {
    return [["key", "status", "experimentIds", "resultIds", "missingMetrics"], ...cells.map((cell) => [JSON.stringify(cell.key), cell.status, cell.experimentIds.join(";"), cell.resultIds.join(";"), (cell.missingMetrics || []).join(";")])].map((row) => row.map(csvEscape).join(",")).join("\n");
}
function generateMissingOnlyRerunPlan(cells, options) {
    const selected = cells.filter((cell) => shouldRerunCell(cell, options));
    const suite = `missing_rerun_${Date.now()}`;
    const yaml = [
        `suite: ${JSON.stringify(suite)}`,
        "mode: train_test",
        "runner:",
        "  result_path_policy: declared",
        "base_config: configs/base.yaml",
        `parent_plan_id: ${JSON.stringify(options.sourcePlanId || "")}`,
        `parent_study_id: ${JSON.stringify(options.sourceStudyId || "")}`,
        "cases:",
        ...selected.map((cell, index) => [
            `  - name: ${JSON.stringify(`rerun_${index}_${Object.values(cell.key).join("_")}`)}`,
            "    overrides:",
            ...Object.entries(cell.key).map(([key, value]) => `      ${key}: ${JSON.stringify(String(value))}`),
        ].join("\n")),
    ].join("\n") + "\n";
    const record = (0, PlanBuilder_1.importLegacyPlanYamlToRegistry)(`simple_cluster/plans/generated/${suite}.yaml`, yaml);
    record.source = { type: "cloned", generatedFrom: options.sourcePlanId || options.sourceStudyId };
    record.provenance.parentPlanId = options.sourcePlanId;
    record.provenance.parentRevisionId = options.completenessMatrixId;
    return record;
}
function completenessStatus(plannedItems, records, lifecycle, missingMetrics) {
    if (!plannedItems.length && !records.length)
        return "not_planned";
    if (records.some((record) => record.status === "excluded"))
        return "excluded";
    if (records.some((record) => record.status === "parse_failed"))
        return "parse_failed";
    if (records.length && missingMetrics.length)
        return "result_available";
    if (records.length)
        return "ready_for_analysis";
    if (lifecycle.some((item) => ["completed", "archived"].includes(String(item.status || item.state))))
        return "completed_no_result";
    if (lifecycle.some((item) => ["running"].includes(String(item.status || item.state))) || plannedItems.some((item) => item.status === "running"))
        return "running";
    if (plannedItems.some((item) => item.status === "queued"))
        return "queued";
    return "planned";
}
function shouldRerunCell(cell, options) {
    if (options.missingTypes.includes(cell.status))
        return true;
    if (options.missingTypes.includes("missing_primary_metric") && (cell.missingMetrics || []).length)
        return true;
    return false;
}
function dimsFromRun(runKey) {
    const text = runKey.toLowerCase();
    const out = {};
    for (const key of ["method", "dataset", "split", "fold", "seed", "missing_rate", "noise_level"]) {
        const match = text.match(new RegExp(`${key}[-_:]([^_:/]+)`));
        if (match)
            out[key] = match[1];
    }
    return out;
}
function keyFor(axes, values) {
    return axes.map((axis) => `${axis}=${String(values[axis] ?? "")}`).join("|");
}
function parseKey(key) {
    return Object.fromEntries(key.split("|").map((part) => {
        const [k, ...rest] = part.split("=");
        return [k, rest.join("=")];
    }));
}
function csvEscape(value) {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
