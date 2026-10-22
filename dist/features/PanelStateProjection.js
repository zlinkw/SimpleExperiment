"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PanelSectionRevisionTracker = exports.PANEL_SECTION_NAMES = void 0;
exports.normalizePanelSectionInterest = normalizePanelSectionInterest;
exports.samePanelSectionInterest = samePanelSectionInterest;
exports.panelInterestedSections = panelInterestedSections;
exports.projectWebviewPanelState = projectWebviewPanelState;
exports.PANEL_SECTION_NAMES = ["settings", "sync", "plans", "results", "gpu", "execution", "diagnostics"];
const PANEL_SECTION_SET = new Set(exports.PANEL_SECTION_NAMES);
const ACTIVE_TASK_STATUSES = new Set(["accepted", "submitted", "queued", "pending", "dispatching", "running", "testing", "progress", "in_progress", "operation_started", "started", "waiting_confirmation", "unknown"]);
function normalizePanelSectionInterest(message, documentGeneration) {
    const source = record(message);
    if (String(source.documentGeneration ?? "") !== String(documentGeneration))
        return undefined;
    const raw = record(source.interest || source);
    const mainSection = validSection(raw.mainSection) || "sync";
    const visibleSections = uniqueSections(raw.visibleSections);
    const expandedSections = uniqueSections(raw.expandedSections);
    const pinnedInspectorSection = validSection(raw.pinnedInspectorSection) || "";
    return {
        documentGeneration: String(documentGeneration),
        mainSection,
        visibleSections,
        expandedSections,
        pinnedInspectorSection,
    };
}
function samePanelSectionInterest(left, right) {
    if (!left || !right)
        return left === right;
    return left.documentGeneration === right.documentGeneration
        && left.mainSection === right.mainSection
        && left.pinnedInspectorSection === right.pinnedInspectorSection
        && sameStrings(left.visibleSections, right.visibleSections)
        && sameStrings(left.expandedSections, right.expandedSections);
}
function panelInterestedSections(interest) {
    return new Set([
        interest.mainSection,
        ...interest.visibleSections,
        ...interest.expandedSections,
        ...(interest.pinnedInspectorSection ? [interest.pinnedInspectorSection] : []),
    ]);
}
function projectWebviewPanelState(state, interest) {
    const projected = { ...state };
    const interested = panelInterestedSections(interest);
    const resultConfig = { ...(record(projected.resultOutputConfig)) };
    const fullTables = Array.isArray(resultConfig.tables) ? resultConfig.tables.length : 0;
    const fullCatalog = record(resultConfig.catalog);
    const fullDatasetCount = Array.isArray(fullCatalog.datasets) ? fullCatalog.datasets.length : 0;
    const fullTraceCount = Array.isArray(projected.experimentTraces) ? projected.experimentTraces.length : 0;
    const sectionPayloads = { ...record(projected.sectionPayloads) };
    if (interested.has("results")) {
        sectionPayloads.results = { status: "loaded", tables: fullTables, datasets: fullDatasetCount, traces: fullTraceCount };
    }
    else {
        delete resultConfig.catalog;
        delete resultConfig.tables;
        delete projected.experimentTraces;
        sectionPayloads.results = { status: "notLoaded", tables: null, datasets: null, traces: null };
    }
    projected.resultOutputConfig = resultConfig;
    const gpuHistory = projected.gpuHistory;
    if (interested.has("gpu")) {
        const gpuData = record(record(gpuHistory).data);
        sectionPayloads.gpu = {
            status: "loaded",
            series: Array.isArray(gpuData.series) ? gpuData.series.length : 0,
            points: Number(gpuData.totalPointCount) || 0,
        };
    }
    else {
        delete projected.gpuHistory;
        sectionPayloads.gpu = { status: "notLoaded", series: null, points: null };
    }
    if (interested.has("execution")) {
        sectionPayloads.execution = { status: "loaded" };
    }
    else {
        const planFile = selectedPlanFile(projected);
        const operations = filterRows(projected.operations, planFile);
        const schedulerStates = filterRows(projected.schedulerStates, planFile);
        const distributedPlans = array(projected.distributedPlans).filter((plan) => isActivePlan(plan) || samePlan(planFile, plan && plan.planFile));
        const deferredPlans = array(projected.deferredPlans).filter((plan) => isActiveStatus(plan && plan.status) || samePlan(planFile, plan && plan.planFile));
        const fileTransfers = filterRows(projected.fileTransfers, "");
        sectionPayloads.execution = {
            status: "notLoaded",
            operations: countRows(projected.operations),
            operationsRetained: countRows(operations),
            tasks: countRows(projected.schedulerStates),
            tasksRetained: countRows(schedulerStates),
        };
        projected.operations = operations;
        projected.schedulerStates = schedulerStates;
        projected.distributedPlans = distributedPlans;
        projected.deferredPlans = deferredPlans;
        projected.fileTransfers = fileTransfers;
    }
    projected.sectionPayloads = sectionPayloads;
    return projected;
}
const REVISION_SECTIONS = ["results", "gpu", "execution", "plans", "diagnostics", "sync", "settings"];
class PanelSectionRevisionTracker {
    revisions = Object.fromEntries(REVISION_SECTIONS.map((section) => [section, 0]));
    inputs = new Map();
    update(inputs) {
        for (const section of REVISION_SECTIONS) {
            const next = Array.isArray(inputs[section]) ? inputs[section] : [];
            const previous = this.inputs.get(section);
            const changed = !previous || previous.length !== next.length || next.some((value, index) => !Object.is(value, previous[index]));
            if (changed)
                this.revisions[section] = (this.revisions[section] || 0) + 1;
            this.inputs.set(section, [...next]);
        }
        return this.snapshot();
    }
    snapshot() {
        return { ...this.revisions };
    }
    reset() {
        this.revisions = Object.fromEntries(REVISION_SECTIONS.map((section) => [section, 0]));
        this.inputs.clear();
    }
}
exports.PanelSectionRevisionTracker = PanelSectionRevisionTracker;
function validSection(value) {
    const section = String(value || "");
    return PANEL_SECTION_SET.has(section) ? section : undefined;
}
function uniqueSections(value) {
    if (!Array.isArray(value))
        return [];
    return [...new Set(value.map(validSection).filter((item) => Boolean(item)))].slice(0, exports.PANEL_SECTION_NAMES.length);
}
function sameStrings(left, right) {
    return left.length === right.length && left.every((value, index) => value === right[index]);
}
function selectedPlanFile(state) {
    return String(state.planFileInput || record(state.selection).selectedPlanId || "");
}
function samePlan(selected, value) {
    const left = normalizePlan(selected);
    const right = normalizePlan(value);
    return Boolean(left && right && (left === right || left.endsWith("/" + right) || right.endsWith("/" + left)));
}
function normalizePlan(value) {
    return String(value || "").replaceAll("\\", "/").replace(/^\.\//, "").toLowerCase();
}
function isActiveStatus(value) {
    const status = String(value || "").toLowerCase();
    return ACTIVE_TASK_STATUSES.has(status) || status.includes("waiting");
}
function isActivePlan(value) {
    const plan = record(value);
    return array(plan.jobs).some((job) => isActiveStatus(record(job).status))
        || isActiveStatus(plan.status);
}
function retainRow(row, selectedPlan) {
    const item = record(row);
    return isActiveStatus(item.status || item.state) || samePlan(selectedPlan, item.planFile || item.plan);
}
function filterRows(value, selectedPlan) {
    if (Array.isArray(value))
        return value.filter((row) => retainRow(row, selectedPlan));
    const source = record(value);
    const rowKey = ["rows", "tasks", "experiments", "schedulerStates"].find((key) => Array.isArray(source[key]));
    if (rowKey)
        return { ...source, [rowKey]: source[rowKey].filter((row) => retainRow(row, selectedPlan)) };
    return Object.fromEntries(Object.entries(source).filter(([, row]) => retainRow(row, selectedPlan)));
}
function countRows(value) {
    if (Array.isArray(value))
        return value.length;
    if (value && typeof value === "object")
        return Object.keys(value).length;
    return 0;
}
function array(value) {
    return Array.isArray(value) ? value : [];
}
function record(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
