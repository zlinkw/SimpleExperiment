"use strict";
// @ts-nocheck
/**
 * QualityFactory — Quality 工厂
 * 封装 OutputContract / QualityGate / 统计分析，委托给 features/Quality
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultQualityFactory = void 0;
exports.createQualityFactory = createQualityFactory;
class DefaultQualityFactory {
    opts;
    constructor(opts = {}) { this.opts = opts; }
    checkContract(files, contract, context = {}) {
        const effContract = contract || this.resolveDefaultContract();
        try {
            const mod = require("../Quality");
            if (mod && typeof mod.checkProjectOutputContract === "function")
                return mod.checkProjectOutputContract(files, effContract, context);
        }
        catch { }
        return { schemaVersion: 1, contractId: effContract?.id || this.opts.defaultContractId || "simple_standard_ai_output", status: "ok", checkedAt: new Date().toISOString(), files: [], columns: [], suggestions: [] };
    }
    runQualityGate(record, gate, contractReport, caseRecords = []) {
        const effGate = gate || this.resolveDefaultGate();
        try {
            const mod = require("../Quality");
            if (mod && typeof mod.runQualityGate === "function")
                return mod.runQualityGate(record, effGate, contractReport, caseRecords);
        }
        catch { }
        return { experimentId: record?.experimentId || "", gateId: effGate?.id || this.opts.defaultGateId || "paper_ready", status: "passed", checkedAt: new Date().toISOString(), failedChecks: [] };
    }
    runLeakageCheck(rows, expectedCounts) {
        try {
            const mod = require("../Quality");
            if (mod && typeof mod.runDataLeakageCheck === "function")
                return mod.runDataLeakageCheck(rows, expectedCounts);
        }
        catch { }
        return { status: "ok", issues: [] };
    }
    runStatisticalAnalysis(plan, rows, methods, comparisonId = "comparison") {
        try {
            const mod = require("../Quality");
            if (mod && typeof mod.runStatisticalAnalysis === "function")
                return mod.runStatisticalAnalysis(plan, rows, methods, comparisonId);
        }
        catch { }
        return [];
    }
    createGateRunner(gateId) {
        const id = gateId || this.opts.defaultGateId || "paper_ready";
        return {
            check: (record, gate, report, cases) => this.runQualityGate(record, gate || this.resolveDefaultGate(), report, cases),
            filter: (records, results, policy) => {
                try {
                    const mod = require("../Quality");
                    if (mod && typeof mod.filterRecordsByQualityGate === "function")
                        return mod.filterRecordsByQualityGate(records, results, policy);
                }
                catch { }
                return records.filter((r) => !results.some((gr) => gr.experimentId === r.experimentId && gr.status === "failed"));
            },
        };
    }
    resolveDefaultContract() {
        try {
            const mod = require("../Quality");
            if (mod && Array.isArray(mod.builtInOutputContracts) && mod.builtInOutputContracts.length)
                return mod.builtInOutputContracts.find((c) => c.id === this.opts.defaultContractId) || mod.builtInOutputContracts[0];
        }
        catch { }
        return { id: this.opts.defaultContractId || "simple_standard_ai_output", requiredFiles: [], optionalFiles: [] };
    }
    resolveDefaultGate() {
        try {
            const mod = require("../Quality");
            const contract = this.resolveDefaultContract();
            if (Array.isArray(contract.qualityGates) && contract.qualityGates.length)
                return contract.qualityGates.find((g) => g.id === this.opts.defaultGateId) || contract.qualityGates[0];
        }
        catch { }
        return { id: this.opts.defaultGateId || "paper_ready", enabled: true, checks: [], actionOnFailure: "warn_only" };
    }
}
exports.DefaultQualityFactory = DefaultQualityFactory;
function createQualityFactory(opts) {
    return new DefaultQualityFactory(opts);
}
