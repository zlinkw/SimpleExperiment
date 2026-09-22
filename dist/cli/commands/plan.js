"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.planCommand = planCommand;
exports.planList = planList;
exports.planValidate = planValidate;
exports.planMatrix = planMatrix;
const path = __importStar(require("path"));
const api_1 = require("../api");
const data_1 = require("../data");
const errors_1 = require("../errors");
const format_1 = require("../format");
const parse_1 = require("../parse");
const PlanBuilder_1 = require("../../features/PlanBuilder");
const PlanValidator_1 = require("../../features/PlanBuilder/PlanValidator");
async function planCommand(action, rest, flags) {
    if (action === "list")
        return planList(flags);
    if (action === "validate")
        return planValidate((0, parse_1.requirePositional)(rest, 0, "plan file"), flags);
    if (action === "matrix")
        return planMatrix((0, parse_1.requirePositional)(rest, 0, "plan file"), flags);
    throw (0, errors_1.usageError)(`unknown plan action: ${action || "(missing)"}`);
}
async function planList(flags) {
    const rows = await loadPlans();
    if (flags.json) {
        (0, format_1.writeJson)(rows, flags.compactJson);
        return 0;
    }
    (0, format_1.writeText)((0, format_1.table)(["name", "path", "status", "validation"], rows));
    return 0;
}
async function planValidate(fileArg, flags) {
    const file = resolveExisting(fileArg);
    const yaml = (0, data_1.readTextFile)(file);
    const contract = (0, PlanBuilder_1.validateDeepLearningPlanContract)(yaml);
    const validator = (0, PlanValidator_1.validatePlan)(yaml);
    const errors = [
        ...(contract.issues || []).map((issue) => String(issue.message || issue.field || issue.label || "")),
        ...(validator.errors || []).map((issue) => issue.message),
    ].filter(Boolean);
    const valid = Boolean(contract.ok) && validator.status !== "failed";
    const payload = valid ? { valid: true } : { valid: false, errors };
    (0, format_1.writeJson)(payload, flags.compactJson);
    return valid ? 0 : 3;
}
async function planMatrix(fileArg, flags) {
    const file = resolveExisting(fileArg);
    const yaml = (0, data_1.readTextFile)(file);
    const summary = (0, PlanBuilder_1.parsePlanSummary)(yaml);
    const result = (0, PlanBuilder_1.expandPlanMatrix)({
        variables: [
            ...(summary.cases.length ? [{ key: "case", mode: "grid", values: summary.cases }] : []),
            ...(summary.seeds.length ? [{ key: "seed", mode: "grid", values: summary.seeds }] : []),
        ],
        namingRule: { pattern: "{suite}_{case}", sanitize: true },
    }, [], summary.suite || "suite");
    const count = Array.isArray(result.experiments) ? result.experiments.length : 0;
    const payload = { count, suite: summary.suite, cases: summary.cases.length, seeds: summary.seeds.length, filteredCount: result.filteredCount || 0 };
    if (flags.json)
        (0, format_1.writeJson)(payload, flags.compactJson);
    else
        (0, format_1.writeText)((0, format_1.block)("Plan matrix", payload));
    return 0;
}
async function loadPlans() {
    const rows = [];
    const remote = await (0, api_1.optionalApi)("plans.list");
    const remotePlans = Array.isArray(remote?.plans) ? remote.plans : [];
    for (const item of remotePlans) {
        const record = asRecord(item);
        const file = String(record.planFile || record.file || record.path || "");
        rows.push({
            name: String(record.planName || record.name || record.suite || path.basename(file)),
            path: file,
            status: String(record.status || "unknown"),
            validation: String(record.validation || record.valid || ""),
        });
    }
    const registry = (0, data_1.readJsonFile)((0, data_1.resolveProjectPath)(data_1.PLAN_REGISTRY_REL), []);
    const registryRows = Array.isArray(registry) ? registry : asRecord(registry).plans;
    if (Array.isArray(registryRows)) {
        for (const item of registryRows) {
            const record = asRecord(item);
            const file = String(record.planFile || record.path || "");
            if (rows.some((row) => row.path === file))
                continue;
            rows.push({
                name: String(record.planName || record.name || path.basename(file)),
                path: file,
                status: String(record.status || "draft"),
                validation: "",
            });
        }
    }
    const files = (0, data_1.listFilesRecursive)((0, data_1.resolveProjectPath)(data_1.DEFAULT_PLAN_DIR), (name) => /\.ya?ml$/i.test(name));
    for (const file of files) {
        const rel = path.relative((0, data_1.projectRoot)(), file).replace(/\\/g, "/");
        if (rows.some((row) => row.path === rel || row.path === file))
            continue;
        const yaml = (0, data_1.readTextFile)(file);
        const contract = (0, PlanBuilder_1.validateDeepLearningPlanContract)(yaml);
        const imported = (0, PlanBuilder_1.importLegacyPlanYamlToRegistry)(rel, yaml, []);
        rows.push({
            name: imported.planName || imported.suite,
            path: rel,
            status: imported.status,
            validation: contract.ok ? "ok" : "failed",
        });
    }
    return rows;
}
function resolveExisting(fileArg) {
    const abs = path.isAbsolute(fileArg) ? fileArg : (0, data_1.resolveProjectPath)(fileArg);
    if (!(0, data_1.fileExists)(abs))
        throw (0, errors_1.businessError)(`plan file not found: ${fileArg}`);
    return abs;
}
function asRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
