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
        throw new Error("项目输出契约检查实现不可用。");
    }
    runQualityGate(record, gate, contractReport, caseRecords = []) {
        const effGate = gate ?? this.resolveDefaultGate();
        const mod = tryRequire("../Quality");
        if (mod?.runQualityGate)
            return mod.runQualityGate(record, effGate, contractReport, caseRecords);
        throw new Error("质量门禁实现不可用，拒绝把未执行检查标记为通过。");
    }
    runLeakageCheck(rows, expectedCounts) {
        const mod = tryRequire("../Quality");
        if (mod?.runDataLeakageCheck)
            return mod.runDataLeakageCheck(rows, expectedCounts);
        throw new Error("数据泄漏检查实现不可用。");
    }
    runStatisticalAnalysis(plan, rows, methods, comparisonId = "comparison") {
        const mod = tryRequire("../Quality");
        if (mod?.runStatisticalAnalysis)
            return mod.runStatisticalAnalysis(plan, rows, methods, comparisonId);
        throw new Error("统计分析实现不可用。");
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
        throw new Error("默认项目输出契约不可用，请显式选择有效契约。");
    }
    resolveDefaultGate() {
        const mod = tryRequire("../Quality");
        const contract = this.resolveDefaultContract();
        const gates = contract["qualityGates"];
        if (Array.isArray(gates) && gates.length) {
            const found = gates.find((g) => g.id === this.opts.defaultGateId);
            return found ?? gates[0];
        }
        throw new Error(`默认质量门禁不可用${contract["id"] ? `（契约 ${String(contract["id"])}）` : ""}，请显式选择有效门禁。`);
    }
}
exports.DefaultQualityFactory = DefaultQualityFactory;
function createQualityFactory(opts) {
    return new DefaultQualityFactory(opts);
}
