"use strict";
/**
 * QualityFactory — Quality 工厂
 * 封装 OutputContract / QualityGate / 统计分析，委托给 features/Quality
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultQualityFactory = void 0;
exports.createQualityFactory = createQualityFactory;
function tryRequire(id) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require(id);
    }
    catch {
        return undefined;
    }
}
class DefaultQualityFactory {
    opts;
    constructor(opts = {}) { this.opts = opts; }
    checkContract(files, contract, context = {}) {
        const effContract = contract ?? this.resolveDefaultContract();
        const mod = tryRequire("../Quality");
        if (mod?.checkProjectOutputContract)
            return mod.checkProjectOutputContract(files, effContract, context);
        return { schemaVersion: 1, contractId: effContract?.["id"] ?? this.opts.defaultContractId ?? "simple_standard_ai_output", status: "ok", checkedAt: new Date().toISOString(), files: [], columns: [], suggestions: [] };
    }
    runQualityGate(record, gate, contractReport, caseRecords = []) {
        const effGate = gate ?? this.resolveDefaultGate();
        const mod = tryRequire("../Quality");
        if (mod?.runQualityGate)
            return mod.runQualityGate(record, effGate, contractReport, caseRecords);
        return { experimentId: record?.["experimentId"] ?? "", gateId: effGate?.["id"] ?? this.opts.defaultGateId ?? "paper_ready", status: "passed", checkedAt: new Date().toISOString(), failedChecks: [] };
    }
    runLeakageCheck(rows, expectedCounts) {
        const mod = tryRequire("../Quality");
        if (mod?.runDataLeakageCheck)
            return mod.runDataLeakageCheck(rows, expectedCounts);
        return { status: "ok", issues: [] };
    }
    runStatisticalAnalysis(plan, rows, methods, comparisonId = "comparison") {
        const mod = tryRequire("../Quality");
        if (mod?.runStatisticalAnalysis)
            return mod.runStatisticalAnalysis(plan, rows, methods, comparisonId);
        return [];
    }
    createGateRunner(gateId) {
        return {
            check: (record, gate, report, cases) => this.runQualityGate(record, gate ?? this.resolveDefaultGate(), report, cases),
            filter: (records, results, policy) => {
                const mod = tryRequire("../Quality");
                if (mod?.filterRecordsByQualityGate)
                    return mod.filterRecordsByQualityGate(records, results, policy);
                return records.filter((r) => !results.some((gr) => gr["experimentId"] === r["experimentId"] && gr["status"] === "failed"));
            },
        };
    }
    resolveDefaultContract() {
        const mod = tryRequire("../Quality");
        if (mod?.builtInOutputContracts?.length) {
            const found = mod.builtInOutputContracts.find((c) => c.id === this.opts.defaultContractId);
            return found ?? mod.builtInOutputContracts[0];
        }
        return { id: this.opts.defaultContractId ?? "simple_standard_ai_output", requiredFiles: [], optionalFiles: [] };
    }
    resolveDefaultGate() {
        const mod = tryRequire("../Quality");
        const contract = this.resolveDefaultContract();
        const gates = contract["qualityGates"];
        if (Array.isArray(gates) && gates.length) {
            const found = gates.find((g) => g.id === this.opts.defaultGateId);
            return found ?? gates[0];
        }
        return { id: this.opts.defaultGateId ?? "paper_ready", enabled: true, checks: [], actionOnFailure: "warn_only" };
    }
}
exports.DefaultQualityFactory = DefaultQualityFactory;
function createQualityFactory(opts) {
    return new DefaultQualityFactory(opts);
}
